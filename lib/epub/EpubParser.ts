/**
 * EpubParser.ts
 * Parses EPUB 2 and EPUB 3 containers, OPF packages, NCX/NAV tables of contents,
 * metadata, and spine collections.
 */

import JSZip from 'jszip';
import {
  EpubMetadata,
  EpubManifestItem,
  EpubSpineItem,
  EpubTocItem,
} from './EpubTypes';

export interface ParsedEpubPackage {
  opfPath: string;
  baseDir: string;
  metadata: EpubMetadata;
  manifest: Map<string, EpubManifestItem>;
  manifestByFullPath: Map<string, EpubManifestItem>;
  spineItems: EpubSpineItem[];
  tocItems: EpubTocItem[];
  coverItem?: EpubManifestItem;
}

export class EpubParser {
  private zip: JSZip;
  private domParser: DOMParser;

  constructor(zip: JSZip) {
    this.zip = zip;
    this.domParser = new DOMParser();
  }

  /**
   * Main entry point: parses the entire EPUB package.
   */
  public async parse(): Promise<ParsedEpubPackage> {
    // 1. Find OPF package document via META-INF/container.xml
    const opfPath = await this.locateOpfPath();
    const baseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // 2. Read and parse OPF XML
    // 2. Read and parse OPF XML with resilient error recovery
    const opfContent = await this.readZipFileText(opfPath);
    if (!opfContent) {
      throw new Error(`OPF package file not found in EPUB: ${opfPath}`);
    }

    let opfDoc: Document;
    try {
      opfDoc = this.domParser.parseFromString(opfContent, 'application/xml');
      const parserError = opfDoc.querySelector('parsererror');
      if (parserError) {
        // Fallback: sanitize entities commonly present in OPF files
        const sanitized = opfContent
          .replace(/&nbsp;/g, '&#160;')
          .replace(/&copy;/g, '&#169;')
          .replace(/&mdash;/g, '&#8212;')
          .replace(/&ndash;/g, '&#8211;')
          .replace(/&hellip;/g, '&#8230;')
          .replace(/&reg;/g, '&#174;')
          .replace(/&trade;/g, '&#8482;')
          .replace(/&([a-zA-Z0-9#]+);/g, (match, entity) => {
            if (/^(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+)$/.test(entity)) return match;
            return `&#160;`;
          });
        opfDoc = this.domParser.parseFromString(sanitized, 'application/xml');
      }
    } catch {
      // Forgiving HTML parser fallback
      opfDoc = this.domParser.parseFromString(opfContent, 'text/html');
    }

    if (opfDoc.querySelector('parsererror')) {
      opfDoc = this.domParser.parseFromString(opfContent, 'text/html');
    }

    const allElements = Array.from(opfDoc.getElementsByTagName('*'));
    const packageEl =
      allElements.find((e) => e.localName?.toLowerCase() === 'package') ||
      opfDoc.querySelector('package');
    const epubVersion = packageEl?.getAttribute('version') || '2.0';

    // 3. Extract Metadata
    const metadata = this.parseMetadata(opfDoc, epubVersion);

    // 4. Extract Manifest items
    const { manifest, manifestByFullPath } = this.parseManifest(opfDoc, baseDir);

    // 5. Extract Spine (ordered reading items)
    const spineItems = this.parseSpine(opfDoc, manifest);

    // 6. Find Cover Image
    const coverItem = await this.findCoverItem(opfDoc, metadata, manifest, baseDir, spineItems);
    if (coverItem) {
      metadata.coverHref = coverItem.fullPath;
    }

    // 7. Extract Table of Contents (EPUB 3 NAV or EPUB 2 NCX)
    const tocItems = await this.parseTableOfContents(opfDoc, manifest, baseDir, spineItems);

    return {
      opfPath,
      baseDir,
      metadata,
      manifest,
      manifestByFullPath,
      spineItems,
      tocItems,
      coverItem,
    };
  }

  /**
   * Reads META-INF/container.xml to locate the OPF rootfile path.
   */
  private async locateOpfPath(): Promise<string> {
    const containerXml = await this.readZipFileText('META-INF/container.xml');
    if (!containerXml) {
      // Fallback: look for any .opf file in the zip
      const anyOpf = Object.keys(this.zip.files).find((fn) => fn.toLowerCase().endsWith('.opf'));
      if (anyOpf) return anyOpf;
      throw new Error('EPUB inválido: arquivo META-INF/container.xml não encontrado.');
    }

    let doc = this.domParser.parseFromString(containerXml, 'application/xml');
    if (doc.querySelector('parsererror')) {
      doc = this.domParser.parseFromString(containerXml, 'text/html');
    }
    const all = Array.from(doc.getElementsByTagName('*'));
    const rootfile =
      all.find((e) => e.localName?.toLowerCase() === 'rootfile') || doc.querySelector('rootfile');
    const fullPath = rootfile?.getAttribute('full-path');
    if (!fullPath) {
      const anyOpf = Object.keys(this.zip.files).find((fn) => fn.toLowerCase().endsWith('.opf'));
      if (anyOpf) return anyOpf;
      throw new Error('EPUB inválido: elemento rootfile não especifica full-path.');
    }
    return this.cleanPath(fullPath);
  }

  /**
   * Extracts metadata fields from OPF <metadata>.
   */
  private parseMetadata(opfDoc: Document, epubVersion: string): EpubMetadata {
    const all = Array.from(opfDoc.getElementsByTagName('*'));
    const metadataEl =
      all.find((e) => e.localName?.toLowerCase() === 'metadata') ||
      opfDoc.querySelector('metadata');

    const getFirstText = (...tags: string[]): string => {
      if (!metadataEl) return '';
      const metaChildren = Array.from(metadataEl.getElementsByTagName('*'));
      for (const tag of tags) {
        const cleanTag = tag.replace(/^.*\\:/, '').toLowerCase();
        const el = metaChildren.find((e) => e.localName?.toLowerCase() === cleanTag);
        if (el && el.textContent) {
          const val = el.textContent.trim();
          if (val) return val;
        }
      }
      return '';
    };

    const title = getFirstText('dc\\:title', 'title') || 'Documento EPUB';
    const creator = getFirstText('dc\\:creator', 'creator') || 'Autor Desconhecido';
    const publisher = getFirstText('dc\\:publisher', 'publisher');
    const language = getFirstText('dc\\:language', 'language') || 'pt';
    const description = getFirstText('dc\\:description', 'description');
    const rights = getFirstText('dc\\:rights', 'rights');
    const publicationDate = getFirstText('dc\\:date', 'date');

    return {
      title,
      creator,
      publisher,
      language,
      description,
      rights,
      publicationDate,
      epubVersion,
    };
  }

  /**
   * Parses the <manifest> element into maps of id and fullPath.
   */
  private parseManifest(
    opfDoc: Document,
    baseDir: string
  ): {
    manifest: Map<string, EpubManifestItem>;
    manifestByFullPath: Map<string, EpubManifestItem>;
  } {
    const manifest = new Map<string, EpubManifestItem>();
    const manifestByFullPath = new Map<string, EpubManifestItem>();
    
    // Namespace-agnostic element match
    const all = Array.from(opfDoc.getElementsByTagName('*'));
    const itemElements = all.filter((el) => el.localName?.toLowerCase() === 'item');

    for (const el of itemElements) {
      const id = el.getAttribute('id');
      const href = el.getAttribute('href');
      const mediaType = el.getAttribute('media-type') || 'application/octet-stream';
      const properties = el.getAttribute('properties') || undefined;

      if (id && href) {
        const cleanHref = href.split('#')[0].split('?')[0];
        let fullPath = this.resolvePath(baseDir, cleanHref);
        try {
          const decoded = decodeURIComponent(fullPath);
          if (this.zip.files[decoded]) {
            fullPath = decoded;
          }
        } catch {}

        const item: EpubManifestItem = {
          id,
          href,
          fullPath,
          mediaType,
          properties,
        };
        manifest.set(id, item);
        manifestByFullPath.set(fullPath, item);
      }
    }

    return { manifest, manifestByFullPath };
  }

  /**
   * Parses the <spine> element to obtain linear reading order.
   */
  private parseSpine(opfDoc: Document, manifest: Map<string, EpubManifestItem>): EpubSpineItem[] {
    const spineItems: EpubSpineItem[] = [];
    const all = Array.from(opfDoc.getElementsByTagName('*'));
    const itemrefs = all.filter((el) => el.localName?.toLowerCase() === 'itemref');
    let index = 0;

    for (const ref of itemrefs) {
      const idref = ref.getAttribute('idref');
      const linear = ref.getAttribute('linear') !== 'no';
      if (idref && manifest.has(idref)) {
        const item = manifest.get(idref)!;
        spineItems.push({
          id: `spine-${index}`,
          idref,
          href: item.href,
          fullPath: item.fullPath,
          index,
          linear,
        });
        index++;
      }
    }

    return spineItems;
  }

  /**
   * Detects the cover image item with strict priority:
   * 1. Metadata cover (<meta name="cover" content="..."> or <meta property="cover-image">)
   * 2. Item identified as cover-image (properties="cover-image")
   * 3. Manifest properties or id/href related to cover/capa, including cover XHTML in spine[0..1]
   * 4. Smart fallback to the first relevant image of the EPUB.
   * 5. Raw inspection of image files in zip.
   */
  private async findCoverItem(
    opfDoc: Document,
    metadata: EpubMetadata,
    manifest: Map<string, EpubManifestItem>,
    baseDir: string,
    spineItems: EpubSpineItem[]
  ): Promise<EpubManifestItem | undefined> {
    const allElements = Array.from(opfDoc.getElementsByTagName('*'));
    const metaTags = allElements.filter((el) => el.localName?.toLowerCase() === 'meta');

    // Helper: inspect an XHTML/HTML document for an embedded <img> or SVG <image>
    const extractImageFromHtml = async (htmlPath: string): Promise<EpubManifestItem | undefined> => {
      try {
        const html = await this.readZipFileText(htmlPath);
        if (!html) return undefined;
        const doc = this.domParser.parseFromString(html, 'text/html');
        const img = doc.querySelector('img[src]');
        const svgImg = doc.querySelector('image[*|href], image[href]');
        const rawSrc =
          img?.getAttribute('src') ||
          svgImg?.getAttribute('xlink:href') ||
          svgImg?.getAttribute('href') ||
          svgImg?.getAttribute('src');

        if (rawSrc) {
          const cleanSrc = rawSrc.split('#')[0].split('?')[0];
          const dir = htmlPath.includes('/') ? htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1) : '';
          const resolvedPath = this.resolvePath(dir, cleanSrc);

          // Find in manifest
          const matched = Array.from(manifest.values()).find(
            (m) =>
              m.fullPath === resolvedPath ||
              m.fullPath.toLowerCase() === resolvedPath.toLowerCase() ||
              m.href.endsWith(cleanSrc)
          );
          if (matched && (matched.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(matched.fullPath))) {
            return matched;
          }

          // Direct zip search
          const zipKeys = Object.keys(this.zip.files);
          const zipMatch = zipKeys.find(
            (k) =>
              k.toLowerCase() === resolvedPath.toLowerCase() ||
              k.toLowerCase().endsWith('/' + cleanSrc.toLowerCase())
          );
          if (zipMatch) {
            const ext = zipMatch.split('.').pop()?.toLowerCase();
            const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            return {
              id: 'extracted-cover-image',
              href: zipMatch,
              fullPath: zipMatch,
              mediaType: mime,
            };
          }
        }
      } catch (err) {
        console.warn('Falha ao extrair imagem do HTML de capa:', err);
      }
      return undefined;
    };

    // Priority 1: Metadata cover tag (<meta name="cover" content="..."/> or <meta property="cover-image">)
    for (const meta of metaTags) {
      const name = meta.getAttribute('name')?.toLowerCase();
      const prop = meta.getAttribute('property')?.toLowerCase();
      if (name === 'cover' || prop === 'cover-image' || prop === 'cover') {
        const coverRef = meta.getAttribute('content') || meta.getAttribute('value') || meta.getAttribute('id');
        if (coverRef) {
          // Check manifest by ID
          if (manifest.has(coverRef)) {
            const item = manifest.get(coverRef)!;
            if (item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(item.fullPath)) {
              metadata.coverSource = 'metadata';
              return item;
            }
            // If item is HTML/XHTML page, inspect inside it
            if (item.mediaType.includes('html') || item.mediaType.includes('xhtml') || /\.x?html?$/i.test(item.fullPath)) {
              const fromHtml = await extractImageFromHtml(item.fullPath);
              if (fromHtml) {
                metadata.coverSource = 'metadata';
                return fromHtml;
              }
            }
          }

          // Match by exact or partial href or id
          for (const item of Array.from(manifest.values())) {
            if (
              item.id.toLowerCase() === coverRef.toLowerCase() ||
              item.href === coverRef ||
              item.fullPath.endsWith(coverRef) ||
              item.fullPath.toLowerCase().endsWith(coverRef.toLowerCase())
            ) {
              if (item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(item.fullPath)) {
                metadata.coverSource = 'metadata';
                return item;
              }
              if (item.mediaType.includes('html') || item.mediaType.includes('xhtml') || /\.x?html?$/i.test(item.fullPath)) {
                const fromHtml = await extractImageFromHtml(item.fullPath);
                if (fromHtml) {
                  metadata.coverSource = 'metadata';
                  return fromHtml;
                }
              }
            }
          }
        }
      }
    }

    // Priority 2: EPUB 3 manifest item with properties="cover-image"
    for (const item of Array.from(manifest.values())) {
      if (item.properties && item.properties.toLowerCase().includes('cover-image')) {
        if (item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(item.fullPath)) {
          metadata.coverSource = 'cover-item';
          return item;
        }
      }
    }

    // Priority 3: Manifest image items where id or href clearly specifies cover / capa
    const coverRegex = /(cover|capa|portada|front_cover|jacket)/i;
    for (const item of Array.from(manifest.values())) {
      const isImg = item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(item.fullPath);
      if (isImg && (coverRegex.test(item.id) || coverRegex.test(item.href))) {
        metadata.coverSource = 'manifest';
        return item;
      }
    }

    // Priority 3.1: Check the first two spine items (commonly titlepage.xhtml, cover.xhtml)
    for (let sIdx = 0; sIdx < Math.min(2, spineItems.length); sIdx++) {
      const spine = spineItems[sIdx];
      const fromSpineHtml = await extractImageFromHtml(spine.fullPath);
      if (fromSpineHtml) {
        metadata.coverSource = 'manifest';
        return fromSpineHtml;
      }
    }

    // Priority 4: Smart fallback to the first relevant raster image of the EPUB
    const allImages = Array.from(manifest.values()).filter(
      (item) => item.mediaType.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(item.fullPath)
    );
    if (allImages.length > 0) {
      // Exclude obvious small icons, bullets, or logos if possible
      const candidate = allImages.find((img) => !/(bullet|icon|arrow|nav|button|pixel)/i.test(img.href)) || allImages[0];
      if (candidate) {
        metadata.coverSource = 'first-image';
        return candidate;
      }
    }

    // Priority 5: Fallback directly to zip files if manifest lacked image tags
    const zipImageKeys = Object.keys(this.zip.files).filter(
      (fn) => /\.(jpe?g|png|webp)$/i.test(fn) && !this.zip.files[fn].dir
    );
    if (zipImageKeys.length > 0) {
      const sorted = zipImageKeys.sort((a, b) => {
        const aHas = /(cover|capa|front|portada)/i.test(a) ? 0 : 1;
        const bHas = /(cover|capa|front|portada)/i.test(b) ? 0 : 1;
        return aHas - bHas;
      });
      const chosenPath = sorted[0];
      const ext = chosenPath.split('.').pop()?.toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const syntheticItem: EpubManifestItem = {
        id: 'fallback-cover',
        href: chosenPath,
        fullPath: chosenPath,
        mediaType: mime,
      };
      metadata.coverSource = 'first-image';
      return syntheticItem;
    }

    return undefined;
  }

  /**
   * Parses Table of Contents from either EPUB 3 Navigation Document or EPUB 2 NCX file.
   */
  private async parseTableOfContents(
    opfDoc: Document,
    manifest: Map<string, EpubManifestItem>,
    baseDir: string,
    spineItems: EpubSpineItem[]
  ): Promise<EpubTocItem[]> {
    // 1. Try EPUB 3 Navigation Document (item with properties="nav")
    for (const item of Array.from(manifest.values())) {
      if (item.properties && item.properties.includes('nav')) {
        try {
          const navContent = await this.readZipFileText(item.fullPath);
          if (navContent) {
            const navDir = item.fullPath.includes('/')
              ? item.fullPath.substring(0, item.fullPath.lastIndexOf('/') + 1)
              : '';
            const toc = this.parseEpub3Nav(navContent, navDir, spineItems);
            if (toc.length > 0) return toc;
          }
        } catch (err) {
          console.warn('Erro ao processar NAV EPUB 3, tentando NCX:', err);
        }
      }
    }

    // 2. Try EPUB 2 NCX file (spine toc="..." attribute or media-type="application/x-dtbncx+xml")
    const spineEl = opfDoc.querySelector('spine');
    const tocId = spineEl?.getAttribute('toc');
    let ncxItem: EpubManifestItem | undefined;
    if (tocId && manifest.has(tocId)) {
      ncxItem = manifest.get(tocId);
    } else {
      for (const item of Array.from(manifest.values())) {
        if (
          item.mediaType === 'application/x-dtbncx+xml' ||
          item.fullPath.toLowerCase().endsWith('.ncx')
        ) {
          ncxItem = item;
          break;
        }
      }
    }

    if (ncxItem) {
      try {
        const ncxContent = await this.readZipFileText(ncxItem.fullPath);
        if (ncxContent) {
          const ncxDir = ncxItem.fullPath.includes('/')
            ? ncxItem.fullPath.substring(0, ncxItem.fullPath.lastIndexOf('/') + 1)
            : '';
          const toc = this.parseEpub2Ncx(ncxContent, ncxDir, spineItems);
          if (toc.length > 0) return toc;
        }
      } catch (err) {
        console.warn('Erro ao processar NCX EPUB 2:', err);
      }
    }

    // 3. Fallback: generate TOC from Spine items
    return spineItems.map((item, idx) => ({
      id: `toc-auto-${idx}`,
      label: `Capítulo ${idx + 1}`,
      href: item.href,
      fullPath: item.fullPath,
      chapterIndex: idx,
      subitems: [],
      level: 1,
    }));
  }

  /**
   * Parses EPUB 3 Navigation Document (XHTML with <nav epub:type="toc">).
   */
  private parseEpub3Nav(navHtml: string, navDir: string, spineItems: EpubSpineItem[]): EpubTocItem[] {
    const doc = this.domParser.parseFromString(navHtml, 'text/html');
    // Find <nav epub:type="toc"> or fallback to first <nav>
    let navEl =
      doc.querySelector('nav[*|type="toc"]') ||
      doc.querySelector('nav[type="toc"]') ||
      doc.querySelector('nav#toc') ||
      doc.querySelector('nav');
    if (!navEl) return [];

    const ol = navEl.querySelector('ol');
    if (!ol) return [];

    const parseList = (olElement: Element, level: number = 1): EpubTocItem[] => {
      const items: EpubTocItem[] = [];
      const liElements = Array.from(olElement.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      );

      for (const li of liElements) {
        const a = li.querySelector('a, span');
        const text = a?.textContent?.trim() || 'Seção';
        const rawHref = a?.getAttribute('href') || '';
        const [filePath, anchor] = rawHref.split('#');
        const fullPath = filePath ? this.resolvePath(navDir, filePath) : '';

        // Match spine item
        const chapterIdx = spineItems.findIndex(
          (sp) => sp.fullPath === fullPath || sp.fullPath.endsWith(filePath)
        );

        let subitems: EpubTocItem[] = [];
        const childOl = li.querySelector('ol');
        if (childOl) {
          subitems = parseList(childOl, level + 1);
        }

        items.push({
          id: `nav-${Math.random().toString(36).substring(2, 8)}`,
          label: text,
          href: rawHref,
          fullPath: fullPath || (chapterIdx >= 0 ? spineItems[chapterIdx].fullPath : ''),
          anchor,
          chapterIndex: chapterIdx >= 0 ? chapterIdx : 0,
          subitems,
          level,
        });
      }
      return items;
    };

    return parseList(ol, 1);
  }

  /**
   * Parses EPUB 2 NCX XML (<navMap> with recursive <navPoint> elements).
   */
  private parseEpub2Ncx(ncxXml: string, ncxDir: string, spineItems: EpubSpineItem[]): EpubTocItem[] {
    const doc = this.domParser.parseFromString(ncxXml, 'application/xml');
    const navMap = doc.querySelector('navMap');
    if (!navMap) return [];

    const parseNavPoints = (parentElement: Element, level: number = 1): EpubTocItem[] => {
      const items: EpubTocItem[] = [];
      // Select direct child navPoints
      const navPoints = Array.from(parentElement.children).filter(
        (c) => c.localName.toLowerCase() === 'navpoint'
      );

      for (const np of navPoints) {
        const id = np.getAttribute('id') || `ncx-${Math.random().toString(36).substring(2, 7)}`;
        const textEl = np.querySelector('navLabel > text');
        const label = textEl?.textContent?.trim() || 'Capítulo';
        const contentEl = np.querySelector('content');
        const rawSrc = contentEl?.getAttribute('src') || '';
        const [filePath, anchor] = rawSrc.split('#');
        const fullPath = filePath ? this.resolvePath(ncxDir, filePath) : '';

        // Match spine index
        const chapterIdx = spineItems.findIndex(
          (sp) => sp.fullPath === fullPath || sp.fullPath.endsWith(filePath)
        );

        const subitems = parseNavPoints(np, level + 1);

        items.push({
          id,
          label,
          href: rawSrc,
          fullPath: fullPath || (chapterIdx >= 0 ? spineItems[chapterIdx].fullPath : ''),
          anchor,
          chapterIndex: chapterIdx >= 0 ? chapterIdx : 0,
          subitems,
          level,
        });
      }
      return items;
    };

    return parseNavPoints(navMap, 1);
  }

  // --- Path & ZIP Utilities ---

  public resolvePath(basePath: string, relativePath: string): string {
    if (!relativePath) return basePath;
    if (relativePath.startsWith('/')) return relativePath.substring(1);
    // Remove query strings or anchors for path lookup
    const cleanRelative = relativePath.split('#')[0].split('?')[0];

    // If basePath has a filename with an extension (e.g. "content.opf", "cover.xhtml"), strip the filename to get the directory
    let baseDir = basePath;
    if (/\.[a-zA-Z0-9]+$/.test(baseDir)) {
      const lastSlash = baseDir.lastIndexOf('/');
      baseDir = lastSlash >= 0 ? baseDir.substring(0, lastSlash + 1) : '';
    }

    const stack = baseDir.split('/').filter(Boolean);
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

  private cleanPath(p: string): string {
    return p.replace(/^\/+/, '').trim();
  }

  private async readZipFileText(path: string): Promise<string | null> {
    const clean = this.cleanPath(path);
    // Direct lookup
    let file = this.zip.files[clean];
    if (!file) {
      // Case-insensitive lookup fallback
      const matchKey = Object.keys(this.zip.files).find(
        (k) => k.toLowerCase() === clean.toLowerCase()
      );
      if (matchKey) file = this.zip.files[matchKey];
    }
    if (!file || file.dir) return null;
    return await file.async('text');
  }
}
