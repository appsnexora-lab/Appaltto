import { Book, ReadingList, ReadingListItem, ReadingGoal, BookFormat } from '@/types';
import { dbGetAll, dbGet, dbPut, dbDelete, dbDeleteBatch, saveBlob, getBlob } from './indexedDB';
import JSZip from 'jszip';
import { PdfDocumentModel } from './pdf/PdfDocument';
import { EpubBook } from './epub/EpubBook';
import { isBibleBook, registerBibleBookId } from './bibleData';

export async function getBooks(): Promise<Book[]> {
  return await dbGetAll('books');
}

export async function getBookById(id: string): Promise<Book | undefined> {
  return await dbGet('books', id);
}

export async function updateBook(book: Book): Promise<void> {
  await dbPut('books', book);
  import('./firebaseSync').then(({ syncBookMetadataToCloud }) => {
    syncBookMetadataToCloud(book).catch(() => {});
  }).catch(() => {});
}

/**
 * Validates if a cover URL is a real, renderable image.
 * Rejects empty values, HTML/XHTML, text or octet-stream data URLs.
 */
export function isValidCoverUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  if (
    trimmed.startsWith('data:application/xhtml') ||
    trimmed.startsWith('data:text/html') ||
    trimmed.startsWith('data:text/xml') ||
    trimmed.startsWith('data:application/octet-stream')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  );
}

import { generateOriginalBookCover } from './bookCoverGenerator';
import { generateAllClassicPdfBooks } from './pdf/samplePdfGenerator';

/**
 * Ensures a book has a real cover extracted and persisted.
 * If missing or invalid, extracts it from the stored binary in IndexedDB.
 * If extraction fails or binary is unavailable, generates an authentic classical original cover.
 */
export async function ensureBookCover(book: Book): Promise<Book> {
  if (isValidCoverUrl(book.coverUrl)) {
    return book;
  }
  // Check if book still exists in DB before restoring or generating cover
  const currentInDb = await dbGet('books', book.id);
  if (!currentInDb) {
    return book;
  }
  try {
    const blobItem = await getBlob(book.fileBlobKey || book.id);
    if (!blobItem || !blobItem.data) {
      // Generate authentic original book cover
      const generated = generateOriginalBookCover(book.title, book.author, book.format);
      book.coverUrl = generated;
      book.coverType = 'image/jpeg';
      book.coverSource = 'generated';
      book.coverGeneratedAt = new Date().toISOString();
      // Double check before persisting
      const stillInDb = await dbGet('books', book.id);
      if (stillInDb) {
        await dbPut('books', book);
      }
      return book;
    }

    let arrayBuffer: ArrayBuffer;
    if (blobItem.data instanceof ArrayBuffer) {
      arrayBuffer = blobItem.data.slice(0);
    } else if (typeof Blob !== 'undefined' && blobItem.data instanceof Blob) {
      arrayBuffer = await blobItem.data.arrayBuffer();
    } else if (typeof blobItem.data === 'string') {
      const bin = atob(blobItem.data);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      arrayBuffer = u8.buffer;
    } else {
      const generated = generateOriginalBookCover(book.title, book.author, book.format);
      book.coverUrl = generated;
      book.coverType = 'image/jpeg';
      book.coverSource = 'generated';
      book.coverGeneratedAt = new Date().toISOString();
      const stillInDb = await dbGet('books', book.id);
      if (stillInDb) {
        await dbPut('books', book);
      }
      return book;
    }

    let extractedCover: string | null = null;
    let coverType = 'image/jpeg';
    let coverSource: Book['coverSource'] = 'fallback';

    if (book.format === 'epub') {
      let epubBook: EpubBook | null = null;
      try {
        epubBook = await EpubBook.open(arrayBuffer.slice(0));
        extractedCover = await epubBook.getCoverDataUrl();
        coverType = epubBook.metadata.coverType || 'image/jpeg';
        coverSource = (epubBook.metadata.coverSource as Book['coverSource']) || 'metadata';
      } catch (e) {
        console.warn('EPUB cover extraction failed, falling back to generator:', e);
      } finally {
        epubBook?.cleanup();
      }
    } else if (book.format === 'pdf') {
      const pdfDoc = new PdfDocumentModel();
      try {
        await pdfDoc.load(arrayBuffer.slice(0));
        extractedCover = await pdfDoc.renderPageToDataUrl(1, 380);
        coverType = 'image/jpeg';
        coverSource = 'first-page';
      } catch (e) {
        console.warn('PDF cover extraction failed, falling back to generator:', e);
      } finally {
        pdfDoc.cleanup();
      }
    } else if (book.format === 'cbz') {
      try {
        const zip = await JSZip.loadAsync(arrayBuffer.slice(0));
        const imageFiles = Object.keys(zip.files).filter(fn =>
          /\.(jpe?g|png|webp|gif)$/i.test(fn) && !zip.files[fn].dir
        ).sort();
        if (imageFiles.length > 0) {
          const fn = imageFiles[0];
          const b64 = await zip.files[fn].async('base64');
          const ext = fn.split('.').pop()?.toLowerCase();
          coverType = ext === 'png' ? 'image/png' : 'image/jpeg';
          extractedCover = `data:${coverType};base64,${b64}`;
          coverSource = 'cbz-page';
        }
      } catch (e) {
        console.warn('CBZ cover extraction failed:', e);
      }
    }

    // If extraction returned nothing or invalid, generate an authentic classical original cover
    if (!extractedCover || !isValidCoverUrl(extractedCover)) {
      extractedCover = generateOriginalBookCover(book.title, book.author, book.format);
      coverType = 'image/jpeg';
      coverSource = 'generated';
    }

    book.coverUrl = extractedCover;
    book.coverType = coverType;
    book.coverSource = coverSource;
    book.coverGeneratedAt = new Date().toISOString();
    const stillInDb = await dbGet('books', book.id);
    if (stillInDb) {
      await dbPut('books', book);
    }
  } catch (err) {
    console.warn('Falha ao restaurar capa do livro, gerando alternativa:', book.title, err);
    try {
      const fallback = generateOriginalBookCover(book.title, book.author, book.format);
      book.coverUrl = fallback;
      book.coverType = 'image/jpeg';
      book.coverSource = 'generated';
      book.coverGeneratedAt = new Date().toISOString();
      const stillInDb = await dbGet('books', book.id);
      if (stillInDb) {
        await dbPut('books', book);
      }
    } catch {
      // ignore
    }
  }
  return book;
}

export async function ensureAllBookCovers(
  books: Book[],
  maxBatch: number = 40,
  onBookUpdated?: (updatedBook: Book) => void
): Promise<Book[]> {
  const updated = [...books];
  let processed = 0;
  for (let i = 0; i < updated.length && processed < maxBatch; i++) {
    if (!isValidCoverUrl(updated[i].coverUrl)) {
      try {
        const fresh = await ensureBookCover(updated[i]);
        if (isValidCoverUrl(fresh.coverUrl)) {
          updated[i] = fresh;
          onBookUpdated?.(fresh);
          processed++;
        }
        await new Promise(r => setTimeout(r, 20));
      } catch (err) {
        console.warn('Erro ao restaurar capa do livro:', updated[i].title, err);
      }
    }
  }
  return updated;
}

/**
 * Restores the complete suite of classic Christian PDF books with original covers,
 * multi-page valid PDF binaries in IndexedDB blobs, and rich metadata.
 */
export async function restoreClassicPdfLibrary(): Promise<Book[]> {
  const classicBooksData = generateAllClassicPdfBooks();
  for (const item of classicBooksData) {
    await saveBlob(item.book.id, item.pdfBytes, 'application/pdf');
    await dbPut('books', item.book);
  }
  return await getBooks();
}

export async function deleteBook(id: string): Promise<void> {
  if (!id) return;
  await deleteMultipleBooks([id]);
}

export async function deleteMultipleBooks(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const validIds = ids.filter(id => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) return;
  const idSet = new Set(validIds);

  // 1. Fetch books to find any custom fileBlobKeys
  let booksToDelete: Book[] = [];
  try {
    const allBooks = await dbGetAll('books');
    booksToDelete = allBooks.filter(b => b && b.id && idSet.has(b.id));
  } catch (err) {
    console.warn('Erro ao carregar lista de livros para exclusão:', err);
  }

  // 2. Fetch reading list items to delete
  let listItemsToDelete: ReadingListItem[] = [];
  try {
    const allListItems = await dbGetAll('reading_list_items');
    listItemsToDelete = allListItems.filter(item => item && item.bookId && idSet.has(item.bookId));
  } catch (err) {
    console.warn('Erro ao carregar reading_list_items para exclusão:', err);
  }

  // 3. Fetch goals to delete
  let goalsToDelete: ReadingGoal[] = [];
  try {
    const allGoals = await dbGetAll('reading_goals');
    goalsToDelete = allGoals.filter(goal => goal && goal.bookId && idSet.has(goal.bookId));
  } catch (err) {
    console.warn('Erro ao carregar reading_goals para exclusão:', err);
  }

  // 4. Fetch reading_progress to delete
  let progressToDelete: { id: string }[] = [];
  try {
    const allProgress = await dbGetAll('reading_progress');
    progressToDelete = allProgress.filter(p => p && p.contentId && idSet.has(p.contentId));
  } catch (err) {
    console.warn('Erro ao carregar reading_progress para exclusão:', err);
  }

  // 5. Fetch bookmarks, highlights, annotations to delete
  let bookmarksToDelete: { id: string }[] = [];
  let highlightsToDelete: { id: string }[] = [];
  let annotationsToDelete: { id: string }[] = [];
  try {
    const [allBm, allHl, allAnn] = await Promise.all([
      dbGetAll('bookmarks'),
      dbGetAll('highlights'),
      dbGetAll('annotations'),
    ]);
    bookmarksToDelete = allBm.filter(b => b && b.contentId && idSet.has(b.contentId));
    highlightsToDelete = allHl.filter(h => h && h.contentId && idSet.has(h.contentId));
    annotationsToDelete = allAnn.filter(a => a && a.contentId && idSet.has(a.contentId));
  } catch (err) {
    console.warn('Erro ao carregar marcações dos livros:', err);
  }

  // 6. Build batch operations list
  type ValidStore = 'books' | 'blobs' | 'reading_progress' | 'reading_list_items' | 'reading_goals' | 'bookmarks' | 'highlights' | 'annotations';
  const operations: { storeName: ValidStore; key: IDBValidKey }[] = [];

  for (const id of validIds) {
    operations.push({ storeName: 'books', key: id });
    operations.push({ storeName: 'blobs', key: id });
    operations.push({ storeName: 'reading_progress', key: `prog-${id}` });
    operations.push({ storeName: 'reading_progress', key: id });
  }

  // Add custom fileBlobKey deletions if distinct from id
  for (const b of booksToDelete) {
    if (b.fileBlobKey && b.fileBlobKey !== b.id) {
      operations.push({ storeName: 'blobs', key: b.fileBlobKey });
    }
  }

  for (const item of listItemsToDelete) {
    if (item.id) operations.push({ storeName: 'reading_list_items', key: item.id });
  }

  for (const goal of goalsToDelete) {
    if (goal.id) operations.push({ storeName: 'reading_goals', key: goal.id });
  }

  for (const p of progressToDelete) {
    if (p.id) operations.push({ storeName: 'reading_progress', key: p.id });
  }

  for (const b of bookmarksToDelete) {
    if (b.id) operations.push({ storeName: 'bookmarks', key: b.id });
  }

  for (const h of highlightsToDelete) {
    if (h.id) operations.push({ storeName: 'highlights', key: h.id });
  }

  for (const a of annotationsToDelete) {
    if (a.id) operations.push({ storeName: 'annotations', key: a.id });
  }

  // 7. Execute batch delete with full atomicity and fallback
  await dbDeleteBatch(operations);
}

export async function importBookFromFile(
  file: File,
  overrides?: { title?: string; author?: string; coverUrl?: string; description?: string; isBible?: boolean },
  options?: { isBatch?: boolean; batchIndex?: number; batchTotal?: number }
): Promise<Book> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
  let format: BookFormat = 'txt';
  if (['pdf', 'epub', 'mobi', 'cbz', 'cbr', 'txt'].includes(ext)) {
    format = ext as BookFormat;
  }

  const bookId = `book-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let detectedTitle = fileName.replace(/\.[^/.]+$/, '');
  let detectedAuthor = 'Autor Desconhecido';
  let detectedDescription = '';
  let totalPages = 10;
  let totalChapters = 1;
  let chapters: { id: string; title: string; content: string }[] = [];
  let images: string[] = [];
  let textContent = '';
  let coverUrl = overrides?.coverUrl || '';
  let coverType = 'image/jpeg';
  let coverSource: Book['coverSource'] = 'fallback';

  // Save the raw file directly as Blob into IndexedDB (zero JS heap memory consumption)
  await saveBlob(bookId, file, file.type || 'application/octet-stream', fileName);

  // Parsing by format
  if (format === 'txt') {
    try {
      // Read only a modest slice for metadata preview to avoid loading 100MB text into memory
      const previewSlice = file.slice(0, 32768);
      const dec = new TextDecoder('utf-8');
      const previewText = dec.decode(await previewSlice.arrayBuffer());
      const paragraphs = previewText.split(/\n\n+/);
      totalPages = Math.max(1, Math.round(file.size / 2000));
      textContent = previewText.slice(0, 1000);
      chapters = [
        { id: 'ch-1', title: 'Início', content: previewText.slice(0, 2000) }
      ];
    } catch {
      totalPages = Math.max(1, Math.round(file.size / 2000));
    }
  } else if (format === 'epub' || format === 'cbz') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (format === 'cbz') {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const imageFileNames = Object.keys(zip.files).filter(fn =>
          /\.(jpe?g|png|webp|gif)$/i.test(fn) && !zip.files[fn].dir
        ).sort();
        totalPages = imageFileNames.length || 10;
        // Extract only first page as cover to keep memory low
        if (imageFileNames.length > 0 && !coverUrl) {
          const fn = imageFileNames[0];
          const imgBase64 = await zip.files[fn].async('base64');
          const extName = fn.split('.').pop()?.toLowerCase();
          const mime = extName === 'png' ? 'image/png' : 'image/jpeg';
          coverUrl = `data:${mime};base64,${imgBase64}`;
          coverType = mime;
          coverSource = 'cbz-page';
        }
      } else if (format === 'epub') {
        try {
          const epubBook = await EpubBook.open(arrayBuffer);
          if (epubBook.metadata.title && (!overrides?.title || overrides.title === fileName)) {
            detectedTitle = epubBook.metadata.title;
          }
          if (epubBook.metadata.creator && !overrides?.author) {
            detectedAuthor = epubBook.metadata.creator;
          }
          if (epubBook.metadata.description && !overrides?.description) {
            detectedDescription = epubBook.metadata.description;
          }
          if (epubBook.metadata.coverDataUrl && !coverUrl) {
            coverUrl = epubBook.metadata.coverDataUrl;
            coverType = epubBook.metadata.coverType || 'image/jpeg';
            coverSource = (epubBook.metadata.coverSource as Book['coverSource']) || 'metadata';
          }
          totalChapters = epubBook.spineItems.length || 1;
          totalPages = Math.max(1, totalChapters * 12);
          chapters = epubBook.spineItems.map((sp, idx) => ({
            id: sp.id || `ch-${idx + 1}`,
            title: `Capítulo ${idx + 1}`,
            content: `Capítulo ${idx + 1} (${sp.href}).`,
          }));
          epubBook.cleanup();
        } catch (epubErr) {
          console.warn('Erro na interpretação do EPUB:', epubErr);
          totalChapters = 1;
          totalPages = Math.max(1, Math.round(file.size / 30000));
        }
      }
    } catch (err) {
      console.warn('Erro ao processar arquivo comprimido:', err);
    }
  } else if (format === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = new PdfDocumentModel();
      try {
        const meta = await pdfDoc.load(arrayBuffer);
        totalPages = meta.totalPages || Math.max(1, Math.round(file.size / 80000));
        if (meta.title && meta.title.trim() && (!overrides?.title || overrides.title === fileName)) {
          detectedTitle = meta.title.trim();
        }
        if (meta.author && meta.author.trim() && !overrides?.author) {
          detectedAuthor = meta.author.trim();
        }
        // In single imports or early batch books (up to 35 books), extract real PDF cover immediately
        const shouldExtractPdfCover =
          !options?.isBatch ||
          (options?.batchIndex !== undefined && options.batchIndex < 35) ||
          (options?.batchTotal !== undefined && options.batchTotal <= 35);
        if (shouldExtractPdfCover && !coverUrl) {
          try {
            const pdfCoverUrl = await pdfDoc.renderPageToDataUrl(1, 380);
            if (pdfCoverUrl && isValidCoverUrl(pdfCoverUrl)) {
              coverUrl = pdfCoverUrl;
              coverType = 'image/jpeg';
              coverSource = 'first-page';
            }
          } catch (covErr) {
            console.warn('Miniatura de capa PDF não gerada no momento:', covErr);
          }
        }
      } finally {
        pdfDoc.cleanup();
      }
    } catch (err) {
      console.warn('Pré-processamento de metadados do PDF:', err);
      totalPages = Math.max(1, Math.round(file.size / 80000));
    }
    textContent = 'Documento PDF com páginas reais e leitura offline.';
  }

  // Ensure every imported book has an authentic cover
  if (!coverUrl || !isValidCoverUrl(coverUrl)) {
    coverUrl = generateOriginalBookCover(overrides?.title || detectedTitle, overrides?.author || detectedAuthor, format);
    coverType = 'image/jpeg';
    coverSource = 'generated';
  }

  const finalTitle = overrides?.title || detectedTitle;
  const finalAuthor = overrides?.author || detectedAuthor;
  const finalDescription = overrides?.description || detectedDescription;

  const candidateBook = {
    id: bookId,
    title: finalTitle,
    author: finalAuthor,
    description: finalDescription,
    isBible: overrides?.isBible,
  } as Book;

  const detectedIsBible = overrides?.isBible !== undefined ? Boolean(overrides.isBible) : isBibleBook(candidateBook);
  if (detectedIsBible) {
    registerBibleBookId(bookId);
  }

  const book: Book = {
    id: bookId,
    title: finalTitle,
    author: finalAuthor,
    coverUrl: coverUrl,
    coverType,
    coverSource,
    coverGeneratedAt: new Date().toISOString(),
    description: finalDescription || 'Livro pessoal importado para a Biblioteca do ALTTO.',
    format,
    totalPages,
    totalChapters: chapters.length || totalChapters,
    fileBlobKey: bookId,
    textContent,
    chapters,
    images,
    status: 'not_started',
    isFavorite: false,
    isBible: detectedIsBible,
    addedAt: new Date().toISOString(),
  };

  await dbPut('books', book);
  return book;
}

export interface MultiImportProgress {
  current: number;
  total: number;
  currentFileName: string;
  percent: number;
  successCount: number;
  errorCount: number;
}

export type {
  BatchImportOptions,
  BatchImportProgress,
} from './bookImportEngine';

export {
  runLibraryDiagnostic,
  reconcileFilesWithLibrary,
  SafeBatchImportController,
  computeFileSignature,
} from './bookImportEngine';
import { reconcileFilesWithLibrary, SafeBatchImportController, BatchImportOptions } from './bookImportEngine';

export async function importMultipleBooks(
  files: File[],
  onProgress?: (progress: MultiImportProgress) => void,
  options?: BatchImportOptions
): Promise<{ success: Book[]; errors: { fileName: string; error: string }[] }> {
  const { items } = await reconcileFilesWithLibrary(files);
  const controller = new SafeBatchImportController((p) => {
    onProgress?.({
      current: p.current,
      total: p.total,
      currentFileName: p.currentFileName,
      percent: p.percent,
      successCount: p.successCount + p.repairedCount,
      errorCount: p.errorCount,
    });
  });

  const result = await controller.process(items, options);
  return {
    success: result.successBooks,
    errors: result.errors,
  };
}

// Reading Lists
export async function getReadingLists(): Promise<ReadingList[]> {
  const lists = await dbGetAll('reading_lists');
  if (lists.length === 0) {
    // Initialize default "Quero Ler" list
    const defaultList: ReadingList = {
      id: 'default-reading-list',
      name: 'Quero Ler',
      description: 'Minha lista de leitura prioritária',
      createdAt: new Date().toISOString(),
    };
    await dbPut('reading_lists', defaultList);
    return [defaultList];
  }
  return lists;
}

export async function getReadingListItems(listId: string): Promise<ReadingListItem[]> {
  const all = await dbGetAll('reading_list_items');
  return all.filter(i => i.listId === listId).sort((a, b) => a.order - b.order);
}

export async function addBookToReadingList(listId: string, bookId: string, isPriority: boolean = false): Promise<void> {
  const existing = await getReadingListItems(listId);
  const alreadyThere = existing.find(i => i.bookId === bookId);
  if (alreadyThere) return;

  const newItem: ReadingListItem = {
    id: `rli-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    listId,
    bookId,
    order: existing.length + 1,
    isPriority,
    addedAt: new Date().toISOString(),
  };
  await dbPut('reading_list_items', newItem);
}

export async function removeBookFromReadingList(itemId: string): Promise<void> {
  await dbDelete('reading_list_items', itemId);
}

export async function reorderReadingListItems(items: ReadingListItem[]): Promise<void> {
  for (let idx = 0; idx < items.length; idx++) {
    const updated = { ...items[idx], order: idx + 1 };
    await dbPut('reading_list_items', updated);
  }
}

export async function toggleReadingListItemPriority(itemId: string): Promise<void> {
  const item = await dbGet('reading_list_items', itemId);
  if (item) {
    item.isPriority = !item.isPriority;
    await dbPut('reading_list_items', item);
  }
}

// Reading Goals (Metas de Leitura)
export async function getReadingGoal(bookId: string): Promise<ReadingGoal | undefined> {
  const goals = await dbGetAll('reading_goals');
  return goals.find(g => g.bookId === bookId);
}

export async function getAllReadingGoalsMap(): Promise<Record<string, ReadingGoal>> {
  const goals = await dbGetAll('reading_goals');
  const map: Record<string, ReadingGoal> = {};
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    if (g.bookId) {
      map[g.bookId] = g;
    }
  }
  return map;
}

export async function saveReadingGoal(bookId: string, targetDays: number, totalPages: number = 100): Promise<ReadingGoal> {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + targetDays);
  const dailyTargetPages = Math.max(1, Math.ceil(totalPages / targetDays));

  const goal: ReadingGoal = {
    id: `goal-${bookId}`,
    bookId,
    targetDays,
    targetDate: targetDate.toISOString().split('T')[0],
    dailyTargetPages,
    createdAt: new Date().toISOString(),
  };
  await dbPut('reading_goals', goal);
  return goal;
}
