/**
 * EpubBook.ts
 * Manages the loaded EPUB book instance, resource resolution, and object URL lifecycle.
 */

import JSZip from 'jszip';
import {
  EpubMetadata,
  EpubManifestItem,
  EpubSpineItem,
  EpubTocItem,
} from './EpubTypes';
import { EpubParser, ParsedEpubPackage } from './EpubParser';

export class EpubBook {
  public zip: JSZip;
  public metadata: EpubMetadata;
  public manifest: Map<string, EpubManifestItem>;
  public manifestByFullPath: Map<string, EpubManifestItem>;
  public spineItems: EpubSpineItem[];
  public tocItems: EpubTocItem[];
  public baseDir: string;
  public opfPath: string;
  public coverItem?: EpubManifestItem;
  private objectUrls: Set<string> = new Set();
  private blobCache: Map<string, Blob> = new Map();
  private dataUrlCache: Map<string, string> = new Map();

  constructor(zip: JSZip, parsed: ParsedEpubPackage) {
    this.zip = zip;
    this.metadata = parsed.metadata;
    this.manifest = parsed.manifest;
    this.manifestByFullPath = parsed.manifestByFullPath;
    this.spineItems = parsed.spineItems;
    this.tocItems = parsed.tocItems;
    this.baseDir = parsed.baseDir;
    this.opfPath = parsed.opfPath;
    this.coverItem = parsed.coverItem;
  }

  /**
   * Static factory: opens and parses an EPUB file from an ArrayBuffer.
   */
  public static async open(buffer: ArrayBuffer): Promise<EpubBook> {
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('EPUB inválido: buffer vazio ou não inicializado.');
    }

    const zip = await JSZip.loadAsync(buffer);
    const parser = new EpubParser(zip);
    const parsed = await parser.parse();
    const book = new EpubBook(zip, parsed);

    // Pre-extract cover data URL if available
    try {
      const coverUrl = await book.getCoverDataUrl();
      if (coverUrl) {
        book.metadata.coverDataUrl = coverUrl;
      }
    } catch (err) {
      console.warn('Não foi possível extrair capa do EPUB:', err);
    }

    return book;
  }

  /**
   * Resolves a relative path against a base file path.
   */
  public resolvePath(basePath: string, relativePath: string): string {
    if (!relativePath) return basePath;
    if (relativePath.startsWith('/')) return relativePath.substring(1);

    const cleanRelative = relativePath.split('#')[0].split('?')[0];
    const stack = basePath.split('/').filter(Boolean);

    // Remove filename from base path
    if (stack.length > 0 && !basePath.endsWith('/')) {
      stack.pop();
    }

    const parts = cleanRelative.split('/').filter(Boolean);
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }

    return stack.join('/');
  }

  /**
   * Retrieves a file as a Blob with cached reuse.
   */
  public async getFileBlob(fullPath: string, mimeType?: string): Promise<Blob | null> {
    const clean = fullPath.replace(/^\/+/, '').trim();
    if (this.blobCache.has(clean)) {
      return this.blobCache.get(clean)!;
    }

    let file = this.zip.files[clean];
    if (!file) {
      const match = Object.keys(this.zip.files).find((k) => k.toLowerCase() === clean.toLowerCase());
      if (match) file = this.zip.files[match];
    }
    if (!file || file.dir) return null;

    const detectedMime = mimeType || this.getMimeTypeForPath(clean);
    const arrayBuffer = await file.async('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: detectedMime });
    this.blobCache.set(clean, blob);
    return blob;
  }

  /**
   * Retrieves a file as a Data URL (safe for SVG / images).
   */
  /**
   * Retrieves a file as a Data URL (safe for SVG / images).
   */
  public async getFileDataUrl(fullPath: string, mediaTypeOverride?: string): Promise<string | null> {
    if (!fullPath) return null;
    let clean = fullPath.split('#')[0].split('?')[0].replace(/\\/g, '/').replace(/^\.?\/+/, '').trim();
    if (this.dataUrlCache.has(clean)) {
      return this.dataUrlCache.get(clean)!;
    }

    let file = this.zip.files[clean];
    if (!file) {
      // 1. Try URI decoded path
      try {
        const decoded = decodeURIComponent(clean);
        file = this.zip.files[decoded];
      } catch {}
    }
    if (!file) {
      // 2. Case-insensitive search
      const cleanLower = clean.toLowerCase();
      const match = Object.keys(this.zip.files).find((k) => k.toLowerCase() === cleanLower);
      if (match) file = this.zip.files[match];
    }
    if (!file) {
      // 3. Fallback: match by filename only (in case base directory in manifest slightly differed from zip internal layout)
      const filename = clean.split('/').pop()?.toLowerCase();
      if (filename) {
        const match = Object.keys(this.zip.files).find((k) => {
          const kLower = k.toLowerCase();
          return kLower.endsWith('/' + filename) || kLower === filename;
        });
        if (match) file = this.zip.files[match];
      }
    }
    if (!file || file.dir) return null;

    const mime = mediaTypeOverride && mediaTypeOverride.startsWith('image/')
      ? mediaTypeOverride
      : this.getMimeTypeForPath(file.name || clean);
    const base64 = await file.async('base64');
    const dataUrl = `data:${mime};base64,${base64}`;
    this.dataUrlCache.set(clean, dataUrl);
    return dataUrl;
  }

  /**
   * Retrieves a file as raw text.
   */
  public async getFileText(fullPath: string): Promise<string | null> {
    if (!fullPath) return null;
    const clean = fullPath.split('#')[0].split('?')[0].replace(/\\/g, '/').replace(/^\.?\/+/, '').trim();
    let file = this.zip.files[clean];
    if (!file) {
      try {
        const decoded = decodeURIComponent(clean);
        file = this.zip.files[decoded];
      } catch {}
    }
    if (!file) {
      const cleanLower = clean.toLowerCase();
      const match = Object.keys(this.zip.files).find((k) => k.toLowerCase() === cleanLower);
      if (match) file = this.zip.files[match];
    }
    if (!file || file.dir) return null;
    return await file.async('text');
  }

  /**
   * Extracts cover as Blob.
   */
  public async getCoverBlob(): Promise<Blob | null> {
    if (this.coverItem) {
      return await this.getFileBlob(this.coverItem.fullPath, this.coverItem.mediaType);
    }
    return null;
  }

  /**
   * Extracts cover as Data URL. Guarantees a real, valid image data URL.
   */
  public async getCoverDataUrl(): Promise<string | null> {
    const isImageMime = (mime?: string) =>
      Boolean(mime && (mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(mime)));

    // 1. If coverItem is already known:
    if (this.coverItem) {
      if (isImageMime(this.coverItem.mediaType) || /\.(jpe?g|png|webp|gif|svg)$/i.test(this.coverItem.fullPath)) {
        const dataUrl = await this.getFileDataUrl(this.coverItem.fullPath, this.coverItem.mediaType);
        if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
      }

      // If coverItem is an XHTML/HTML document (e.g. cover.xhtml, titlepage.xhtml), extract the image inside it
      if (
        this.coverItem.mediaType.includes('html') ||
        this.coverItem.mediaType.includes('xhtml') ||
        /\.x?html?$/i.test(this.coverItem.fullPath)
      ) {
        try {
          const html = await this.getFileText(this.coverItem.fullPath);
          if (html && typeof DOMParser !== 'undefined') {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const img = doc.querySelector('img[src]');
            const svgImg = doc.querySelector('image[*|href], image[href]');
            const rawSrc =
              img?.getAttribute('src') ||
              svgImg?.getAttribute('xlink:href') ||
              svgImg?.getAttribute('href') ||
              svgImg?.getAttribute('src');

            if (rawSrc) {
              const cleanSrc = rawSrc.split('#')[0].split('?')[0];
              const dir = this.coverItem.fullPath.includes('/')
                ? this.coverItem.fullPath.substring(0, this.coverItem.fullPath.lastIndexOf('/') + 1)
                : '';
              const resolved = this.resolvePath(dir, cleanSrc);
              const dataUrl = await this.getFileDataUrl(resolved);
              if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
            }
          }
        } catch (e) {
          console.warn('Erro ao inspecionar capa HTML do EPUB:', e);
        }
      }
    }

    // 2. High-priority search in manifest items: look for cover / capa in id or href
    const coverRegex = /(cover|capa|portada|front_cover|jacket)/i;
    for (const item of Array.from(this.manifest.values())) {
      if (
        (item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(item.fullPath)) &&
        (coverRegex.test(item.id) || coverRegex.test(item.href))
      ) {
        const dataUrl = await this.getFileDataUrl(item.fullPath, item.mediaType);
        if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
      }
    }

    // 3. Search in manifest for any raster image
    for (const item of Array.from(this.manifest.values())) {
      if (item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(item.fullPath)) {
        if (!/(bullet|icon|arrow|nav|button|pixel)/i.test(item.href)) {
          const dataUrl = await this.getFileDataUrl(item.fullPath, item.mediaType);
          if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
        }
      }
    }

    // 4. Fallback directly to zip files: prioritize filenames with cover/capa/front
    const zipKeys = Object.keys(this.zip.files).filter(
      (fn) => /\.(jpe?g|png|webp)$/i.test(fn) && !this.zip.files[fn].dir
    );
    if (zipKeys.length > 0) {
      const sorted = zipKeys.sort((a, b) => {
        const aHas = /(cover|capa|front|portada)/i.test(a) ? 0 : 1;
        const bHas = /(cover|capa|front|portada)/i.test(b) ? 0 : 1;
        return aHas - bHas;
      });
      for (const fn of sorted) {
        const dataUrl = await this.getFileDataUrl(fn);
        if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
      }
    }

    return null;
  }

  /**
   * Maps file extensions to MIME types.
   */
  private getMimeTypeForPath(p: string): string {
    const ext = p.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      case 'xhtml':
      case 'html':
      case 'htm':
        return 'application/xhtml+xml';
      case 'css':
        return 'text/css';
      case 'ncx':
        return 'application/x-dtbncx+xml';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Revokes all generated URLs and releases cache memory.
   */
  public cleanup(): void {
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
    this.blobCache.clear();
    this.dataUrlCache.clear();
  }
}
