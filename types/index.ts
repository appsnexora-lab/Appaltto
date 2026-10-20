export type PeriodType = 'morning' | 'afternoon' | 'night';
export type ContentType = 'bible' | 'devotional' | 'book';
export type ReaderTheme = 'light' | 'cream' | 'sepia' | 'gray' | 'dark' | 'oled';
export type BookFormat = 'pdf' | 'epub' | 'mobi' | 'cbz' | 'cbr' | 'txt';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string;
  lastSyncAt?: string;
}

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleChapter {
  number: number;
  title?: string;
  verses: BibleVerse[];
}

export interface BibleBook {
  id: string;
  name: string;
  testament: 'old' | 'new';
  chaptersCount: number;
  chapters?: BibleChapter[];
}

export interface Bible {
  id: string;
  name: string;
  version: string;
  authorOrEditor?: string;
  coverUrl?: string;
  books: BibleBook[];
  importedAt: string;
  lastReadBook?: string;
  lastReadChapter?: number;
  lastReadAt?: string;
  totalChaptersRead?: number;
}

export interface BibleReading {
  id: string;
  bibleId: string;
  bookName: string;
  chapterNumber: number;
  period: PeriodType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  userId: string;
  status: 'completed' | 'pending';
  completedAt?: string;
  spiritualNote?: string;
  isRecovered?: boolean;
}

export interface BibleReflection {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  period: PeriodType;
  bibleId: string;
  bibleName?: string;
  bookName: string;
  chapterNumber: number;
  text: string; // "O que Deus falou ao meu coração"
  createdAt: string;
}

export interface DevotionalDay {
  dayNumber: number;
  title: string;
  dateStr?: string; // Optional fixed date like "13 de setembro"
  scriptureRef?: string;
  content: string;
  reflectionPrompt?: string;
}

export interface Devotional {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  totalDays: number;
  startDate: string; // YYYY-MM-DD starting date chosen by user or book
  importedAt: string;
  days: DevotionalDay[];
  currentDay: number;
  lastReadAt?: string;
}

export interface DevotionalReading {
  id: string;
  devotionalId: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'pending' | 'locked';
  completedAt?: string;
  userId: string;
  isRecovered?: boolean;
}

export type BookStatus = 'not_started' | 'in_progress' | 'completed';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string; // Persistent Data URL or stored image URL
  coverType?: string; // e.g. 'image/jpeg' | 'image/png' | 'image/webp'
  coverSource?: 'metadata' | 'cover-item' | 'manifest' | 'first-image' | 'first-page' | 'cbz-page' | 'fallback' | 'generated';
  coverGeneratedAt?: string;
  description?: string;
  format: BookFormat;
  currentPage?: number;
  totalPages?: number;
  fileSize?: number;
  currentChapterIndex?: number;
  totalChapters?: number;
  progressPercent?: number;
  fileBlobKey?: string; // Key in IndexedDB
  textContent?: string; // For text/markdown books
  chapters?: { id: string; title: string; content: string }[];
  images?: string[]; // Data URLs or object URLs for comics (CBZ)
  status: BookStatus;
  isFavorite: boolean;
  isBible?: boolean;
  fileHash?: string; // Stable signature hash (size + first 64KB + last 64KB)
  originalFileName?: string;
  importStatus?: 'completed' | 'incomplete';
  addedAt: string;
  lastReadAt?: string;
}

export interface LibraryDiagnostic {
  totalBooks: number;
  healthyBooks: number;
  incompleteBooks: number;
  orphanedBlobsCount: number;
  totalBlobsCount: number;
  formatCounts: Record<string, number>;
  corruptedDetails: { id: string; title: string; reason: string }[];
  scannedAt: string;
}

export interface ReconciledFileItem {
  file: File;
  fileName: string;
  fileSize: number;
  format: BookFormat;
  hash: string;
  status: 'already_imported' | 'can_repair' | 'pending_import' | 'duplicate_selection' | 'invalid';
  existingBook?: Book;
  repairReason?: string;
  detectedTitle?: string;
  detectedAuthor?: string;
}

export interface ReadingProgress {
  id: string;
  contentId: string;
  contentType: ContentType;
  currentPage: number;
  currentChapter?: string | number;
  percentage: number;
  scrollOffset?: number;
  zoomLevel?: number;
  lastReadAt: string;
}

export interface ReadingList {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ReadingListItem {
  id: string;
  listId: string;
  bookId: string;
  order: number;
  isPriority: boolean;
  addedAt: string;
}

export interface ReadingGoal {
  id: string;
  bookId: string;
  targetDays: number;
  targetDate: string; // YYYY-MM-DD
  dailyTargetPages?: number;
  dailyTargetChapters?: number;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  title: string;
  location: string; // e.g. "Gênesis 1", "Página 42", "Dia 15"
  scrollOffset?: number;
  createdAt: string;
}

export interface Highlight {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  text: string;
  color: 'gold' | 'emerald' | 'sky' | 'rose';
  location: string;
  note?: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  title?: string;
  text: string;
  location: string;
  createdAt: string;
}

export interface DailyVerse {
  id: string;
  verse: string;
  reference: string;
  date: string;
}

export interface ReadingSession {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  pagesRead?: number;
}
