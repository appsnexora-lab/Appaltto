'use client';

import React, { useState, useEffect } from 'react';
import {
  Library,
  Plus,
  BookOpen,
  Star,
  Clock,
  CheckCircle2,
  ListOrdered,
  Target,
  ArrowUp,
  ArrowDown,
  Trash2,
  Search,
  FileText,
  Sparkles,
  UploadCloud,
  Files,
  X,
  File,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Check,
  Image as ImageIcon,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Database,
  HardDrive,
  FileCheck,
  Zap,
  Sliders,
  Layers,
} from 'lucide-react';
import { Book, ReadingList, ReadingListItem, ReadingGoal, BookStatus, LibraryDiagnostic, ReconciledFileItem } from '@/types';
import {
  getBooks,
  ensureBookCover,
  ensureAllBookCovers,
  isValidCoverUrl,
  importBookFromFile,
  importMultipleBooks,
  updateBook,
  deleteBook,
  deleteMultipleBooks,
  getReadingLists,
  getReadingListItems,
  addBookToReadingList,
  removeBookFromReadingList,
  reorderReadingListItems,
  runLibraryDiagnostic,
  reconcileFilesWithLibrary,
  SafeBatchImportController,
  BatchImportProgress,
  BatchImportOptions,
  toggleReadingListItemPriority,
  getReadingGoal,
  saveReadingGoal,
  getAllReadingGoalsMap,
} from '@/lib/bookService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { dbPut } from '@/lib/indexedDB';
import { getReadingProgress, getAllReadingProgressMap } from '@/lib/readerService';
import { useTheme } from '@/context/ThemeContext';

interface LibraryViewProps {
  onOpenReader: (params: {
    contentType: 'book';
    contentId: string;
    title: string;
    subtitle?: string;
    bookData: Book;
  }) => void;
}

type LibraryFilter =
  | 'all'
  | 'in_progress'
  | 'not_started'
  | 'completed'
  | 'favorites'
  | 'reading_list';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenReader }) => {
  const { theme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [readingListItems, setReadingListItems] = useState<ReadingListItem[]>([]);
  const [readingList, setReadingList] = useState<ReadingList | null>(null);
  const [goalsMap, setGoalsMap] = useState<Record<string, ReadingGoal>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Multi-File Import & 500+ Mass Ingestion State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importTitle, setImportTitle] = useState<string>('');
  const [importAuthor, setImportAuthor] = useState<string>('');
  const [importDescription, setImportDescription] = useState<string>('');
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<BatchImportProgress | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importToast, setImportToast] = useState<string>('');
  const [importErrors, setImportErrors] = useState<{ fileName: string; error: string }[]>([]);

  // 500+ Intelligent Import Options
  const [extractOriginalCovers, setExtractOriginalCovers] = useState<boolean>(true);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [repairIncomplete, setRepairIncomplete] = useState<boolean>(true);
  const [batchAnalysis, setBatchAnalysis] = useState<{
    alreadyImported: number;
    canRepair: number;
    duplicateSelection: number;
    pending: number;
    invalid: number;
    totalBytes: number;
    pendingBytes: number;
  } | null>(null);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState<boolean>(false);
  const importControllerRef = React.useRef<SafeBatchImportController | null>(null);

  // Diagnostic and Safe Recovery State
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [diagnostic, setDiagnostic] = useState<LibraryDiagnostic | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState<boolean>(false);
  const [recoveryFiles, setRecoveryFiles] = useState<File[]>([]);
  const [reconciledItems, setReconciledItems] = useState<ReconciledFileItem[]>([]);
  const [reconciliationSummary, setReconciliationSummary] = useState<{
    alreadyImported: number;
    canRepair: number;
    pending: number;
    invalid: number;
  } | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
    percent: number;
    successCount: number;
    repairedCount: number;
    skippedCount: number;
    errorCount: number;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
    errors: { fileName: string; error: string }[];
  } | null>(null);
  const batchControllerRef = React.useRef<SafeBatchImportController | null>(null);

  // Goal Modal
  const [selectedBookForGoal, setSelectedBookForGoal] = useState<Book | null>(null);
  const [targetDays, setTargetDays] = useState<number>(30);
  const [displayLimit, setDisplayLimit] = useState<number>(48);

  // Multi-Select & Batch Delete State
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [bookToDeleteDirectly, setBookToDeleteDirectly] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Cover Restoration State
  const [isRestoringCovers, setIsRestoringCovers] = useState<boolean>(false);
  const requestedCoversRef = React.useRef<Set<string>>(new Set());

  const handleRequestCover = React.useCallback(async (book: Book) => {
    if (requestedCoversRef.current.has(book.id)) return;
    requestedCoversRef.current.add(book.id);
    try {
      const updated = await ensureBookCover(book);
      if (isValidCoverUrl(updated.coverUrl)) {
        setBooks((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, coverUrl: updated.coverUrl } : b))
        );
      }
    } catch (e) {
      console.warn('Erro ao restaurar capa individual:', book.title, e);
    }
  }, []);

  const handleRestoreAllCovers = async () => {
    setIsRestoringCovers(true);
    setImportToast('🔄 Restaurando capas originais dos livros...');
    try {
      let restoredCount = 0;
      const updatedList = await ensureAllBookCovers(books, 100, (fresh) => {
        restoredCount++;
        setBooks((prev) =>
          prev.map((b) => (b.id === fresh.id ? { ...b, coverUrl: fresh.coverUrl } : b))
        );
      });
      setBooks(updatedList);
      setImportToast(
        restoredCount > 0
          ? `✨ ${restoredCount} capa(s) original(is) restaurada(s) com sucesso!`
          : '✨ Todas as capas já estão atualizadas!'
      );
      setTimeout(() => setImportToast(''), 4000);
    } catch (err) {
      console.error('Erro ao restaurar capas:', err);
      setImportToast('Erro ao restaurar capas dos livros.');
      setTimeout(() => setImportToast(''), 4000);
    } finally {
      setIsRestoringCovers(false);
    }
  };

  const loadData = React.useCallback(async () => {
    try {
      const [bookList, gMap, pMap, lists] = await Promise.all([
        getBooks(),
        getAllReadingGoalsMap(),
        getAllReadingProgressMap(),
        getReadingLists(),
      ]);

      setBooks(bookList);
      setGoalsMap(gMap);
      setProgressMap(pMap);

      if (lists.length > 0) {
        setReadingList(lists[0]);
        const items = await getReadingListItems(lists[0].id);
        setReadingListItems(items);
      }

      // Progressively restore covers in the background with batched updates (Phase 3 optimization)
      const pendingCovers: Record<string, string> = {};
      let batchTimer: NodeJS.Timeout | null = null;
      ensureAllBookCovers(bookList, 30, (fresh) => {
        if (!fresh.coverUrl || !isValidCoverUrl(fresh.coverUrl)) return;
        pendingCovers[fresh.id] = fresh.coverUrl;
        if (!batchTimer) {
          batchTimer = setTimeout(() => {
            batchTimer = null;
            setBooks((prev) =>
              prev.map((b) => (pendingCovers[b.id] ? { ...b, coverUrl: pendingCovers[b.id] } : b))
            );
          }, 150);
        }
      });

      // Background diagnostic to detect any incomplete books
      runLibraryDiagnostic().then(diag => setDiagnostic(diag)).catch(() => {});
    } catch (err) {
      console.error('Erro ao carregar dados da biblioteca:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset pagination when search query or filter changes
  useEffect(() => {
    setDisplayLimit(48);
  }, [searchQuery, activeFilter]);

  // Pre-scan and deduplicate batch selection
  const triggerBatchAnalysis = async (filesList: File[]) => {
    if (filesList.length === 0) {
      setBatchAnalysis(null);
      return;
    }
    setIsAnalyzingBatch(true);
    try {
      const { summary } = await reconcileFilesWithLibrary(filesList);
      setBatchAnalysis(summary);
    } catch (err) {
      console.warn('Erro na análise de deduplicação prévia:', err);
    } finally {
      setIsAnalyzingBatch(false);
    }
  };

  // Add files to selection
  const handleFilesSelected = (selectedList: FileList | File[]) => {
    const validExtensions = ['.pdf', '.epub', '.mobi', '.cbz', '.cbr', '.txt'];
    const added: File[] = [];

    Array.from(selectedList).forEach(file => {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (validExtensions.includes(ext)) {
        added.push(file);
      }
    });

    if (added.length === 0) return;

    setImportFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}-${f.size}`));
      const newUnique = added.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
      const combined = [...prev, ...newUnique];
      if (combined.length === 1 && !importTitle) {
        setImportTitle(combined[0].name.replace(/\.[^/.]+$/, ''));
      }

      // Automatically trigger intelligent deduplication pre-scan
      if (combined.length > 1) {
        triggerBatchAnalysis(combined);
      } else {
        setBatchAnalysis(null);
      }

      return combined;
    });
  };

  const handleRemoveFile = (index: number) => {
    setImportFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 1) {
        triggerBatchAnalysis(next);
      } else {
        setBatchAnalysis(null);
      }
      return next;
    });
  };

  const handlePauseImport = () => {
    importControllerRef.current?.pause();
  };

  const handleResumeImport = () => {
    importControllerRef.current?.resume();
  };

  const handleCancelImport = () => {
    importControllerRef.current?.cancel();
  };

  // Import Book Files (Single or Multiple High-Scale Batch up to 500+ Books)
  const handleImportSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (importFiles.length === 0 || isImporting) return;

    setIsImporting(true);
    setImportErrors([]);
    const totalCount = importFiles.length;

    try {
      if (totalCount === 1) {
        setImportProgress({
          current: 1,
          total: 1,
          currentFileName: importFiles[0].name,
          currentAction: 'Importando e salvando arquivo...',
          percent: 50,
          successCount: 0,
          repairedCount: 0,
          skippedCount: 0,
          duplicateSelectionCount: 0,
          errorCount: 0,
          status: 'running',
          errors: [],
          recentBooks: [],
        });
        await importBookFromFile(importFiles[0], {
          title: importTitle || undefined,
          author: importAuthor || undefined,
          description: importDescription || undefined,
        });
        setImportProgress(prev => prev ? {
          ...prev,
          percent: 100,
          successCount: 1,
          status: 'completed',
          currentAction: 'Livro importado com sucesso!',
        } : null);
      } else {
        // High-scale batch import with 100% binary preservation, original covers and deduplication
        const { items } = await reconcileFilesWithLibrary(importFiles);

        const controller = new SafeBatchImportController((prog) => {
          setImportProgress(prog);
        });
        importControllerRef.current = controller;

        const result = await controller.process(items, {
          extractOriginalCovers,
          skipAlreadyImported: skipDuplicates,
          repairIncomplete,
        });

        if (result.errors.length > 0) {
          setImportErrors(result.errors);
        }
      }

      await loadData();

      const finalProg = importControllerRef.current?.getProgress();
      const successCount = finalProg ? (finalProg.successCount + finalProg.repairedCount) : 1;
      const skippedCount = finalProg ? (finalProg.skippedCount + finalProg.duplicateSelectionCount) : 0;

      let msg = totalCount === 1
        ? '✨ Livro importado com sucesso para a Biblioteca!'
        : `✨ ${successCount} livro(s) importado(s) com capas originais preservadas!`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} repetidos ignorados)`;
      }

      setImportToast(msg);
      setTimeout(() => setImportToast(''), 5000);
    } catch (err: any) {
      console.error('Erro na importação:', err);
      setImportToast('Erro ao importar arquivo(s). Verifique os formatos.');
      setTimeout(() => setImportToast(''), 4000);
    } finally {
      setIsImporting(false);
    }
  };

  // Run Diagnostic Scan
  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const diag = await runLibraryDiagnostic();
      setDiagnostic(diag);
    } catch (err) {
      console.error('Falha no diagnóstico:', err);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // Reconcile Re-selected Files (Etapa 2)
  const handleRecoveryFilesSelected = async (selectedList: FileList | File[]) => {
    const validExtensions = ['.pdf', '.epub', '.mobi', '.cbz', '.cbr', '.txt'];
    const added: File[] = [];

    Array.from(selectedList).forEach(file => {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (validExtensions.includes(ext)) {
        added.push(file);
      }
    });

    if (added.length === 0) return;
    setIsReconciling(true);
    setRecoveryFiles(added);
    try {
      const { items, summary } = await reconcileFilesWithLibrary(added);
      setReconciledItems(items);
      setReconciliationSummary(summary);
    } catch (err) {
      console.error('Erro ao reconciliar arquivos:', err);
      setImportToast('Erro ao analisar arquivos para recuperação.');
    } finally {
      setIsReconciling(false);
    }
  };

  // Start Safe Import & Recovery Pipeline (Etapa 3)
  const handleStartSafeRecovery = async () => {
    if (reconciledItems.length === 0) return;
    const controller = new SafeBatchImportController((p) => {
      setBatchProgress({ ...p });
    });
    batchControllerRef.current = controller;

    try {
      const result = await controller.process(reconciledItems);
      await loadData();
      await handleRunDiagnostic();
      setImportToast(`✨ Processamento concluído: ${result.successBooks.length} livro(s) salvos/reparados com sucesso!`);
      setTimeout(() => setImportToast(''), 4500);
    } catch (err: any) {
      console.error('Erro na fila segura de recuperação:', err);
      setImportToast('Processamento interrompido ou pausado.');
      setTimeout(() => setImportToast(''), 4000);
    }
  };

  const handlePauseRecovery = () => {
    batchControllerRef.current?.pause();
  };

  const handleResumeRecovery = () => {
    batchControllerRef.current?.resume();
  };

  const handleCancelRecovery = () => {
    batchControllerRef.current?.cancel();
  };
  const handleAddClassicBook = async (preset: 'peregrino' | 'imitacao') => {
    setIsImporting(true);
    const bookId = `classic-${preset}-${Date.now()}`;
    let book: Book;

    if (preset === 'peregrino') {
      book = {
        id: bookId,
        title: 'O Peregrino',
        author: 'John Bunyan',
        description:
          'A célebre alegoria cristã de Cristão em sua jornada desde a Cidade da Destruição até a Cidade Celestial.',
        format: 'txt',
        totalPages: 240,
        totalChapters: 10,
        textContent:
          'Caminhando pelo deserto deste mundo, cheguei a um lugar onde havia uma caverna; ali me deitei para dormir e, enquanto dormia, tive um sonho. Vi um homem vestido de farrapos, de pé em certo lugar, com as costas voltadas para a sua própria casa, um fardo pesado sobre os ombros e um livro nas mãos. Olhei, e vi-o abrir o livro e ler nele; e, enquanto lia, chorava e tremia; e, não podendo conter-se por mais tempo, deu um grito angustioso dizendo: "Que farei eu?"',
        status: 'not_started',
        isFavorite: true,
        addedAt: new Date().toISOString(),
      };
    } else {
      book = {
        id: bookId,
        title: 'A Imitação de Cristo',
        author: 'Tomás de Kempis',
        description:
          'Um dos maiores clássicos de devoção e disciplina espiritual de todos os tempos.',
        format: 'txt',
        totalPages: 180,
        totalChapters: 4,
        textContent:
          'Aquele que me segue não andará em trevas, diz o Senhor. Com estas palavras Cristo nos exorta a imitar Sua vida e Seus costumes, se queremos ser verdadeiramente iluminados e livres de toda cegueira do coração. Seja, pois, nosso principal estudo meditar sobre a vida de Jesus Cristo.',
        status: 'not_started',
        isFavorite: false,
        addedAt: new Date().toISOString(),
      };
    }

    await dbPut('books', book);
    setIsImporting(false);
    setShowImportModal(false);
    await loadData();
  };

  // Toggle Favorite
  const handleToggleFavorite = async (book: Book) => {
    const updated = { ...book, isFavorite: !book.isFavorite };
    await updateBook(updated);
    setBooks(prev => prev.map(b => (b.id === book.id ? updated : b)));
  };

  // Toggle Reading List
  const handleToggleReadingList = async (bookId: string) => {
    if (!readingList) return;
    const existing = readingListItems.find(i => i.bookId === bookId);
    if (existing) {
      await removeBookFromReadingList(existing.id);
    } else {
      await addBookToReadingList(readingList.id, bookId);
    }
    const updated = await getReadingListItems(readingList.id);
    setReadingListItems(updated);
  };

  // Reorder Reading List
  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...readingListItems];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setReadingListItems(newItems);
    await reorderReadingListItems(newItems);
  };

  // Save Goal
  const handleSaveGoal = async () => {
    if (!selectedBookForGoal) return;
    const g = await saveReadingGoal(
      selectedBookForGoal.id,
      targetDays,
      selectedBookForGoal.totalPages || 120
    );
    setGoalsMap(prev => ({ ...prev, [selectedBookForGoal.id]: g }));
    setSelectedBookForGoal(null);
  };

  // Selection and Batch Deletion Handlers
  const handleToggleSelectBook = (bookId: string) => {
    setSelectedBookIds(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
    setIsSelectionMode(true);
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredBooks.map(b => b.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedBookIds.includes(id));
    if (allSelected) {
      setSelectedBookIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedBookIds(Array.from(new Set([...selectedBookIds, ...filteredIds])));
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const targetIds = bookToDeleteDirectly
      ? [bookToDeleteDirectly.id]
      : selectedBookIds.filter(id => typeof id === 'string' && id.trim().length > 0);

    if (targetIds.length === 0) {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setBookToDeleteDirectly(null);
      return;
    }

    const count = targetIds.length;
    const targetIdSet = new Set(targetIds);

    // Optimistically update UI immediately so deleted cards unmount
    setBooks(prev => prev.filter(b => !targetIdSet.has(b.id)));
    setReadingListItems(prev => prev.filter(item => !targetIdSet.has(item.bookId)));
    setSelectedBookIds(prev => prev.filter(id => !targetIdSet.has(id)));
    targetIds.forEach(id => requestedCoversRef.current.delete(id));

    try {
      if (bookToDeleteDirectly) {
        await deleteBook(bookToDeleteDirectly.id);
        setImportToast(`✨ Livro "${bookToDeleteDirectly.title}" excluído com sucesso!`);
      } else {
        await deleteMultipleBooks(targetIds);
        setIsSelectionMode(false);
        setImportToast(`✨ ${count} livro(s) excluído(s) com sucesso da Biblioteca!`);
      }
      setShowDeleteModal(false);
      setBookToDeleteDirectly(null);
      await loadData();
      setTimeout(() => setImportToast(''), 4000);
    } catch (err) {
      console.error('Erro ao excluir livros:', err);
      await loadData();
      setShowDeleteModal(false);
      setBookToDeleteDirectly(null);
      setImportToast(count === 1 ? 'Erro ao excluir o livro.' : 'Erro ao excluir livro(s).');
      setTimeout(() => setImportToast(''), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Memoized reading list ID set for O(1) membership lookup (Phase 3 optimization)
  const readingListBookIdSet = React.useMemo(() => {
    return new Set(readingListItems.map(i => i.bookId));
  }, [readingListItems]);

  // Memoized filter and search with normalized lowercase query outside the loop
  const filteredBooks = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return books.filter(b => {
      if (query) {
        const titleMatch = b.title ? b.title.toLowerCase().includes(query) : false;
        const authorMatch = b.author ? b.author.toLowerCase().includes(query) : false;
        if (!titleMatch && !authorMatch) return false;
      }

      if (activeFilter === 'in_progress') return b.status === 'in_progress';
      if (activeFilter === 'not_started') return b.status === 'not_started';
      if (activeFilter === 'completed') return b.status === 'completed';
      if (activeFilter === 'favorites') return !!b.isFavorite;
      if (activeFilter === 'reading_list') {
        return readingListBookIdSet.has(b.id);
      }
      return true;
    });
  }, [books, searchQuery, activeFilter, readingListBookIdSet]);

  const allFilteredSelected = React.useMemo(() => {
    return filteredBooks.length > 0 && filteredBooks.every(b => selectedBookIds.includes(b.id));
  }, [filteredBooks, selectedBookIds]);

  return (
    <ErrorBoundary fallbackTitle="Biblioteca ALTTO Protegida">
      <div
        id="library-view-container"
        className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 min-h-screen transition-colors duration-300"
        style={{ color: theme.colors.text }}
      >
      {/* Top Header - Minimalist & Intuitive */}
      <div
        className="flex items-center justify-between border-b pb-4 flex-wrap gap-4"
        style={{ borderColor: theme.colors.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: `${theme.colors.accent}15`,
              borderColor: `${theme.colors.accent}30`,
              color: theme.colors.accent,
            }}
          >
            <Library className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>
                Biblioteca
              </h1>
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${theme.colors.accent}12`,
                  borderColor: `${theme.colors.accent}25`,
                  color: theme.colors.accent,
                }}
              >
                {books.length} {books.length === 1 ? 'livro' : 'livros'}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
              Sua coleção pessoal de clássicos, teologia e estudos cristãos (EPUB, PDF, CBZ, TXT)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {books.length > 0 && (
            <button
              id="btn-toggle-select-mode"
              type="button"
              onClick={() => {
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedBookIds([]);
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: isSelectionMode ? `${theme.colors.accent}20` : theme.colors.surface,
                borderColor: isSelectionMode ? theme.colors.accent : theme.colors.border,
                color: isSelectionMode ? theme.colors.accent : theme.colors.text,
              }}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectionMode ? 'Cancelar' : 'Selecionar'}</span>
            </button>
          )}

          {books.length > 0 && (
            <button
              id="btn-restore-covers"
              type="button"
              disabled={isRestoringCovers}
              onClick={handleRestoreAllCovers}
              title="Restaurar capas originais de todos os livros"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textMuted,
              }}
            >
              {isRestoringCovers ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: theme.colors.accent }} />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
              )}
              <span className="hidden sm:inline">{isRestoringCovers ? 'Restaurando...' : 'Capas'}</span>
            </button>
          )}

          <button
            id="btn-open-diagnostic-recovery"
            type="button"
            onClick={() => {
              setShowRecoveryModal(true);
              handleRunDiagnostic();
            }}
            title="Diagnóstico da Biblioteca e Recuperação Segura (348 Livros)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: diagnostic && diagnostic.incompleteBooks > 0 ? '#FEF2F2' : theme.colors.surface,
              borderColor: diagnostic && diagnostic.incompleteBooks > 0 ? '#FECACA' : theme.colors.border,
              color: diagnostic && diagnostic.incompleteBooks > 0 ? '#DC2626' : theme.colors.textMuted,
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: diagnostic && diagnostic.incompleteBooks > 0 ? '#DC2626' : theme.colors.accent }} />
            <span>
              {diagnostic && diagnostic.incompleteBooks > 0
                ? `Reparar (${diagnostic.incompleteBooks})`
                : 'Diagnóstico'}
            </span>
          </button>

          <button
            id="btn-import-book-top"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer hover:opacity-95 active:scale-95"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentText,
            }}
          >
            <UploadCloud className="w-4 h-4" />
            <span>+ Adicionar Livros</span>
          </button>
        </div>
      </div>

      {/* Alerta de Diagnóstico Minimalista em Lilás Suave */}
      {diagnostic && diagnostic.incompleteBooks > 0 && (
        <div
          className="p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: `${theme.colors.accent}40`,
            color: theme.colors.text,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${theme.colors.accent}20`,
                borderColor: `${theme.colors.accent}40`,
                color: theme.colors.accent,
              }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold" style={{ color: theme.colors.text }}>
                {diagnostic.incompleteBooks} livro(s) com importação pendente detectado(s)
              </h4>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: theme.colors.textMuted }}>
                Os metadados foram preservados. Selecione os arquivos para restaurar os livros sem duplicar os já concluídos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowRecoveryModal(true);
              handleRunDiagnostic();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-2xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentText,
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Restaurar e Retomar</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.colors.textMuted }} />
          <input
            type="text"
            placeholder="Buscar por título ou autor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs transition-colors focus:outline-none"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
          {[
            { id: 'all' as LibraryFilter, label: `Todos (${books.length})` },
            { id: 'in_progress' as LibraryFilter, label: 'Em andamento' },
            { id: 'favorites' as LibraryFilter, label: 'Favoritos' },
            { id: 'completed' as LibraryFilter, label: 'Concluídos' },
            { id: 'reading_list' as LibraryFilter, label: 'Quero Ler' },
          ].map(f => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                id={`filter-books-${f.id}`}
                onClick={() => setActiveFilter(f.id)}
                className="px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border cursor-pointer"
                style={{
                  backgroundColor: isActive ? theme.colors.accent : theme.colors.surface,
                  color: isActive ? theme.colors.accentText : theme.colors.textMuted,
                  borderColor: isActive ? theme.colors.accent : theme.colors.border,
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* Barra de Ações em Lote / Seleção Múltipla Minimalista */}
      {isSelectionMode && (
        <div
          className="p-3 sm:p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-in fade-in"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: `${theme.colors.accent}40`,
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border text-xs font-semibold transition-colors shadow-2xs cursor-pointer hover:bg-purple-50/50"
              style={{
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              {allFilteredSelected ? (
                <>
                  <CheckSquare className="w-4 h-4" style={{ color: theme.colors.accent }} />
                  <span>Desmarcar Todos</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" style={{ color: theme.colors.textMuted }} />
                  <span>Selecionar Todos ({filteredBooks.length})</span>
                </>
              )}
            </button>

            <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
              <strong className="font-bold" style={{ color: theme.colors.accent }}>{selectedBookIds.length}</strong> de {filteredBooks.length} livro(s) selecionado(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedBookIds.length === 0}
              onClick={() => {
                setBookToDeleteDirectly(null);
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Marcados ({selectedBookIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedBookIds([]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer hover:opacity-80"
              style={{ color: theme.colors.textMuted }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MINHA LISTA DE LEITURA REORDER SECTION */}
      {activeFilter === 'reading_list' && (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-amber-600" />
                <span>Quero Ler — Sequência Personalizada</span>
              </h2>
              <p className="text-xs text-slate-500">
                Você define a ordem de leitura. Use as setas para organizar sua prioridade.
              </p>
            </div>
          </div>

          {readingListItems.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Nenhum livro adicionado à sua lista ainda. Toque no ícone de lista em qualquer livro para adicioná-lo.
            </p>
          ) : (
            <div className="space-y-2">
              {readingListItems.map((item, idx) => {
                const book = books.find(b => b.id === item.bookId);
                if (!book) return null;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-bold text-xs text-amber-600 font-mono">
                        {idx + 1}.
                      </span>
                      {isValidCoverUrl(book.coverUrl) ? (
                        <div className="w-9 h-12 rounded overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 font-serif">{book.title}</h4>
                        <p className="text-[11px] text-slate-500">{book.author || 'Autor não informado'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Priority Star */}
                      <button
                        onClick={async () => {
                          await toggleReadingListItemPriority(item.id);
                          if (readingList) {
                            const updated = await getReadingListItems(readingList.id);
                            setReadingListItems(updated);
                          }
                        }}
                        className={`p-1.5 rounded-lg ${
                          item.isPriority ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Marcar prioridade"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Move Up */}
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveItem(idx, 'up')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                        title="Subir na fila"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        disabled={idx === readingListItems.length - 1}
                        onClick={() => handleMoveItem(idx, 'down')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-20"
                        title="Descer na fila"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Read Button */}
                      <button
                        onClick={() =>
                          onOpenReader({
                            contentType: 'book',
                            contentId: book.id,
                            title: book.title,
                            subtitle: book.author,
                            bookData: book,
                          })
                        }
                        className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold hover:bg-amber-400 ml-1 shadow-2xs"
                      >
                        Ler
                      </button>

                      {/* Remove */}
                      <button
                        onClick={async () => {
                          await removeBookFromReadingList(item.id);
                          if (readingList) {
                            const updated = await getReadingListItems(readingList.id);
                            setReadingListItems(updated);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                        title="Remover da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BOOKS GRID */}
      {filteredBooks.length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-4"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-2xs"
            style={{
              backgroundColor: `${theme.colors.accent}15`,
              color: theme.colors.accent,
            }}
          >
            <Library className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: theme.colors.text }}>Sua biblioteca está vazia</h3>
            <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed" style={{ color: theme.colors.textMuted }}>
              Importe seus livros cristãos favoritos (EPUB com capítulos reais, PDF, CBZ, TXT) ou adicione um clássico espiritual para começar.
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentText,
            }}
          >
            + IMPORTAR LIVROS (PDF / EPUB)
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-2.5 sm:gap-3">
            {filteredBooks.slice(0, displayLimit).map(b => {
              const inList = readingListItems.some(i => i.bookId === b.id);
              const isSelected = selectedBookIds.includes(b.id);
              const goal = goalsMap[b.id];

            // Calculate reading progress percentage
            const recordedProgress = progressMap[b.id] ?? b.progressPercent ?? 0;
            let progressPct = recordedProgress;
            if (b.status === 'completed') {
              progressPct = 100;
            } else if (progressPct === 0) {
              if (b.currentPage && b.totalPages && b.totalPages > 0) {
                progressPct = Math.min(100, Math.round((b.currentPage / b.totalPages) * 100));
              } else if (b.currentChapterIndex !== undefined && b.totalChapters && b.totalChapters > 0) {
                progressPct = Math.min(100, Math.round(((b.currentChapterIndex + 1) / b.totalChapters) * 100));
              }
            }

            return (
              <div
                key={b.id}
                id={`book-card-${b.id}`}
                onClick={isSelectionMode ? () => handleToggleSelectBook(b.id) : undefined}
                className={`group rounded-xl border transition-all p-2 sm:p-2.5 flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-rose-400 ring-2 ring-rose-500/80 bg-rose-50/25 shadow-md'
                    : 'hover:shadow-md'
                } ${isSelectionMode ? 'cursor-pointer select-none' : ''}`}
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: isSelected ? '#F43F5E' : theme.colors.border,
                }}
              >
                <div>
                  {/* CAPA REAL DO LIVRO (Proporção 3:4 Compacta) */}
                  <div
                    onClick={(e) => {
                      if (isSelectionMode) {
                        e.stopPropagation();
                        handleToggleSelectBook(b.id);
                        return;
                      }
                      onOpenReader({
                        contentType: 'book',
                        contentId: b.id,
                        title: b.title,
                        subtitle: b.author,
                        bookData: b,
                      });
                    }}
                    className="w-full aspect-[3/4] relative rounded-lg overflow-hidden border shadow-2xs cursor-pointer select-none group/cover"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    }}
                  >
                    {isValidCoverUrl(b.coverUrl) ? (
                      <img
                        src={b.coverUrl}
                        alt={`Capa de ${b.title}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-105"
                        loading="lazy"
                        onError={() => {
                          requestedCoversRef.current.delete(b.id);
                          handleRequestCover(b);
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center p-2 text-center relative"
                        style={{
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text,
                        }}
                      >
                        <CoverFetcher book={b} onRequestCover={handleRequestCover} />
                        <BookOpen className="w-6 h-6 mb-1" style={{ color: theme.colors.textMuted }} />
                        <span className="text-[11px] font-serif font-bold line-clamp-3 leading-tight" style={{ color: theme.colors.text }}>
                          {b.title}
                        </span>
                        {b.author && (
                          <span className="text-[9px] mt-0.5 line-clamp-1" style={{ color: theme.colors.textMuted }}>
                            {b.author}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Checkbox de Marcação / Seleção Múltipla */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelectBook(b.id);
                      }}
                      className={`absolute top-1.5 left-1.5 z-20 p-1 rounded-md backdrop-blur-xs transition-all shadow-2xs cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white ring-2 ring-white opacity-100 scale-105'
                          : isSelectionMode
                          ? 'bg-white/95 text-slate-500 hover:text-slate-800 border border-slate-300 opacity-100'
                          : 'bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-800 border border-slate-200'
                      }`}
                      title={isSelected ? 'Desmarcar este livro' : 'Marcar livro para selecionar'}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Badge Formato (posicionado no rodapé da capa) */}
                    <span
                      className="absolute bottom-1.5 left-1.5 text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.5 rounded shadow-2xs border leading-none z-10"
                      style={{
                        backgroundColor: `${theme.colors.surface}F0`,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                      }}
                    >
                      {b.format.toUpperCase()}
                    </span>

                    {/* Ações rápidas no topo da capa */}
                    <div
                      className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-md p-0.5 shadow-2xs border z-10"
                      style={{
                        backgroundColor: `${theme.colors.surface}F0`,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleFavorite(b);
                        }}
                        className={`p-0.5 rounded ${
                          b.isFavorite ? 'text-amber-500' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title="Favoritar"
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleReadingList(b.id);
                        }}
                        className="p-0.5 rounded"
                        style={{ color: inList ? theme.colors.accent : theme.colors.textMuted }}
                        title={inList ? 'Na lista Quero Ler' : 'Adicionar à lista'}
                      >
                        <ListOrdered className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Título e Autor */}
                  <h3
                    onClick={(e) => {
                      if (isSelectionMode) {
                        e.stopPropagation();
                        handleToggleSelectBook(b.id);
                        return;
                      }
                      onOpenReader({
                        contentType: 'book',
                        contentId: b.id,
                        title: b.title,
                        subtitle: b.author,
                        bookData: b,
                      });
                    }}
                    className="text-[11px] sm:text-xs font-bold font-serif mt-2 leading-snug line-clamp-2 cursor-pointer transition-colors"
                    style={{ color: theme.colors.text }}
                    title={b.title}
                  >
                    {b.title}
                  </h3>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: theme.colors.textMuted }} title={b.author || 'Autor não informado'}>
                    {b.author || 'Autor não informado'}
                  </p>

                  {/* Barra de Progresso Real Compacta */}
                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex items-center justify-between text-[9px] font-medium" style={{ color: theme.colors.textMuted }}>
                      <span>Progresso</span>
                      <span className="font-semibold" style={{ color: theme.colors.text }}>{progressPct}%</span>
                    </div>
                    <div
                      className="w-full h-1 rounded-full border overflow-hidden"
                      style={{
                        backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderColor: theme.colors.border,
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: theme.colors.accent,
                        }}
                      />
                    </div>
                  </div>

                  {/* Meta de Leitura Compacta */}
                  {goal && (
                    <div className="mt-1.5 p-1 rounded-md bg-amber-50 border border-amber-200 text-[9px] text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Target className="w-2.5 h-2.5 text-amber-600" />
                        <span>{goal.targetDays}d</span>
                      </div>
                      <span className="font-semibold text-amber-800 truncate">
                        ~{goal.dailyTargetPages} p/d
                      </span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div
                  className="pt-2 mt-2 border-t flex items-center gap-1"
                  style={{ borderColor: theme.colors.border }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBookForGoal(b);
                      if (goal) setTargetDays(goal.targetDays);
                    }}
                    className="p-1 rounded transition-colors shrink-0 hover:opacity-80"
                    style={{ color: theme.colors.textMuted }}
                    title={goal ? `Meta: ~${goal.dailyTargetPages} p/dia (${goal.targetDays} dias)` : 'Definir meta de leitura'}
                  >
                    <Target className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookToDeleteDirectly(b);
                      setShowDeleteModal(true);
                    }}
                    className="p-1 rounded transition-colors shrink-0 text-rose-500 hover:text-rose-600"
                    title="Excluir este livro"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <button
                    id={`btn-open-book-${b.id}`}
                    onClick={(e) => {
                      if (isSelectionMode) {
                        e.stopPropagation();
                        handleToggleSelectBook(b.id);
                        return;
                      }
                      onOpenReader({
                        contentType: 'book',
                        contentId: b.id,
                        title: b.title,
                        subtitle: b.author,
                        bookData: b,
                      });
                    }}
                    className="flex-1 py-1 px-1.5 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all shadow-2xs text-center truncate cursor-pointer hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: isSelected ? 'rgba(244, 63, 94, 0.2)' : theme.colors.accent,
                      color: isSelected ? '#F43F5E' : theme.colors.accentText,
                    }}
                  >
                    {isSelectionMode ? (isSelected ? 'Marcado ✓' : 'Marcar') : (progressPct > 0 ? 'Continuar' : 'Ler')}
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {/* Progressive Load / Pagination for Large Libraries (up to 1000 books) */}
          {filteredBooks.length > displayLimit && (
            <div className="flex flex-col items-center justify-center pt-3 pb-6 gap-2">
              <p className="text-xs text-slate-500 font-medium">
                Exibindo {Math.min(displayLimit, filteredBooks.length)} de {filteredBooks.length} livros
              </p>
              <button
                type="button"
                onClick={() => setDisplayLimit(prev => prev + 48)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-950 font-bold text-xs border border-slate-200 hover:border-amber-300 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Carregar mais (+48 livros)</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* IMPORT MULTI-BOOK & 500+ MASS INGESTION MODAL */}
      {showImportModal && (
        <div
          id="modal-import-book"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl bg-white border border-purple-100 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-purple-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100/70 text-purple-700 flex items-center justify-center shadow-2xs border border-purple-200/50 shrink-0">
                  <UploadCloud className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg font-serif text-slate-900 flex items-center gap-2">
                    <span>Importar Livros</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      500+ Livros
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Capas originais 100% preservadas • Deduplicação inteligente de repetidos • Zero travamento
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isImporting) {
                    setShowImportModal(false);
                    setImportFiles([]);
                    setBatchAnalysis(null);
                    setImportProgress(null);
                  }
                }}
                disabled={isImporting && importProgress?.status === 'running'}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Dropzone for Multi-file selection */}
              {!isImporting && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-violet-500 bg-purple-50 scale-[0.99]'
                      : 'border-purple-200 hover:border-violet-400 bg-[#FAF8FF] hover:bg-[#F5F2FE]'
                  }`}
                  onClick={() => {
                    document.getElementById('multi-file-input')?.click();
                  }}
                >
                  <input
                    id="multi-file-input"
                    type="file"
                    multiple
                    accept=".pdf,.epub,.mobi,.cbz,.cbr,.txt"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFilesSelected(e.target.files);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-1 shadow-2xs border border-purple-200/60">
                      <Zap className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      Clique ou arraste até 500+ livros simultaneamente
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md">
                      Suporte completo a PDF, EPUB, MOBI, CBZ e TXT. O ALTTO preserva 100% dos arquivos originais e extrai as capas reais.
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        PDF (Capa Pág. 1)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        EPUB (Capa Real Embutida)
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        CBZ
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        MOBI
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                        TXT
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deduplication & Pre-Scan Analysis Card */}
              {importFiles.length > 1 && !isImporting && (
                <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-purple-700">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Deduplicação Inteligente & Análise Prévia</span>
                    </span>
                    {isAnalyzingBatch ? (
                      <span className="flex items-center gap-1 text-[11px] text-purple-600 font-normal">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Examinando assinaturas...
                      </span>
                    ) : (
                      <span className="text-[11px] text-purple-700 font-semibold font-mono">
                        {importFiles.length} arquivos ({formatFileSize(importFiles.reduce((acc, f) => acc + f.size, 0))})
                      </span>
                    )}
                  </div>

                  {batchAnalysis && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-purple-200">
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">🟢 Novos Livros</span>
                        <strong className="text-base font-extrabold text-emerald-800">{batchAnalysis.pending}</strong>
                        <span className="text-[9px] text-slate-500 block">prontos para importar</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-purple-200">
                        <span className="text-[10px] text-purple-700 uppercase font-bold block">🟣 Já Existentes</span>
                        <strong className="text-base font-extrabold text-purple-900">{batchAnalysis.alreadyImported}</strong>
                        <span className="text-[9px] text-slate-500 block">ignorados (evita duplicar)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-purple-200">
                        <span className="text-[10px] text-blue-700 uppercase font-bold block">🔵 Recuperáveis</span>
                        <strong className="text-base font-extrabold text-blue-900">{batchAnalysis.canRepair}</strong>
                        <span className="text-[9px] text-slate-500 block">restauram arquivo</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-purple-200">
                        <span className="text-[10px] text-slate-600 uppercase font-bold block">⚪ Repetidos na Seleção</span>
                        <strong className="text-base font-extrabold text-slate-800">{batchAnalysis.duplicateSelection}</strong>
                        <span className="text-[9px] text-slate-500 block">descartados</span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 leading-snug">
                    💡 <strong>Como funciona a deduplicação inteligente:</strong> O ALTTO gera uma assinatura digital ultrarrápida do conteúdo (sem carregar os arquivos na memória RAM). Livros que já estão salvos não serão baixados nem duplicados, economizando armazenamento no seu celular.
                  </p>
                </div>
              )}

              {/* Options Checklist (Preservação 100%) */}
              {importFiles.length > 1 && !isImporting && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-purple-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    <span>Opções de Importação de Alta Escala</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-start gap-2 p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:border-purple-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={extractOriginalCovers}
                        onChange={(e) => setExtractOriginalCovers(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-[11px]">
                        <strong className="text-slate-900 block">Extrair Capas Originais</strong>
                        <span className="text-slate-500 text-[10px] block">
                          Extrai a capa real do EPUB e renderiza a 1ª página do PDF
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 p-2 rounded-xl bg-white border border-purple-100 cursor-pointer hover:border-purple-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-[11px]">
                        <strong className="text-slate-900 block">Evitar Livros Repetidos</strong>
                        <span className="text-slate-500 text-[10px] block">
                          Ignora automaticamente uploads de livros já existentes
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Selected Files Preview List */}
              {importFiles.length > 0 && !isImporting && (
                <div className="space-y-2 border border-purple-100 rounded-2xl p-3 bg-[#FAF8FF]/60">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-purple-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Files className="w-4 h-4 text-purple-600" />
                      {importFiles.length} {importFiles.length === 1 ? 'livro selecionado' : 'livros selecionados'}
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({formatFileSize(importFiles.reduce((acc, f) => acc + f.size, 0))})
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('multi-file-input')?.click()}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                      >
                        + Adicionar mais
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportFiles([]);
                          setBatchAnalysis(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-purple-50">
                    {importFiles.slice(0, 15).map((file, idx) => {
                      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                      const isPdf = ext === 'PDF';
                      const isEpub = ext === 'EPUB';

                      return (
                        <div
                          key={`${file.name}-${idx}`}
                          className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 border ${
                                isPdf
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : isEpub
                                  ? 'bg-purple-50 text-purple-700 border-purple-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {ext}
                            </span>
                            <span className="truncate text-slate-800 text-[11px] font-medium" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-purple-50 transition-colors shrink-0 cursor-pointer"
                            title="Remover arquivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {importFiles.length > 15 && (
                      <div className="pt-2 text-center text-xs text-purple-950 font-bold bg-purple-50 rounded-xl p-2 border border-purple-200">
                        ⚡ + outros {importFiles.length - 15} livros selecionados para processamento em fila segura
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Single File Customization (1 book only) */}
              {importFiles.length === 1 && !isImporting && (
                <div className="space-y-2 pt-1 border-t border-purple-100">
                  <div className="text-[11px] font-semibold text-slate-600">
                    Personalizar informações (opcional):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Título:
                      </label>
                      <input
                        type="text"
                        placeholder="Título do livro"
                        value={importTitle}
                        onChange={(e) => setImportTitle(e.target.value)}
                        className="w-full bg-[#FAF8FF] border border-purple-100 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Autor:
                      </label>
                      <input
                        type="text"
                        placeholder="Nome do autor"
                        value={importAuthor}
                        onChange={(e) => setImportAuthor(e.target.value)}
                        className="w-full bg-[#FAF8FF] border border-purple-100 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Interactive Ingestion Dashboard (500+ books with pause/resume/cancel and real covers) */}
              {isImporting && importProgress && (
                <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-purple-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-2">
                      {importProgress.status === 'paused' ? (
                        <Pause className="w-4 h-4 text-purple-700" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                      )}
                      <span>
                        Importando livro {importProgress.current} de {importProgress.total}
                      </span>
                      {importProgress.status === 'paused' && (
                        <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md">
                          PAUSADO
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-base font-extrabold text-purple-700">
                      {importProgress.percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-purple-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="bg-violet-600 h-3 rounded-full transition-all duration-200 shadow-xs"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>

                  {/* Action, Speed & ETA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600">
                    <span className="truncate max-w-sm font-medium" title={importProgress.currentAction}>
                      {importProgress.currentAction || `Processando: ${importProgress.currentFileName}`}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                      {importProgress.speedBooksPerSec && (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-200">
                          ⚡ {importProgress.speedBooksPerSec} livros/s
                        </span>
                      )}
                      {importProgress.estimatedRemainingSec !== undefined && (
                        <span className="text-purple-700 font-semibold">
                          Restam ~{importProgress.estimatedRemainingSec < 60 ? `${importProgress.estimatedRemainingSec}s` : `${Math.floor(importProgress.estimatedRemainingSec / 60)}m ${importProgress.estimatedRemainingSec % 60}s`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real-Time Live Preview Stream of Imported Books with Original Covers */}
                  {importProgress.recentBooks && importProgress.recentBooks.length > 0 && (
                    <div className="pt-2 border-t border-purple-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                        ✨ Capas Originais Extraídas em Tempo Real:
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {importProgress.recentBooks.map((rb, idx) => (
                          <div
                            key={`${rb.id}-${idx}`}
                            className="shrink-0 w-16 bg-white rounded-lg p-1 border border-purple-200 shadow-2xs flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
                          >
                            <div className="w-14 h-18 rounded bg-[#FAF8FF] overflow-hidden relative mb-1 border border-purple-100">
                              <img
                                src={rb.coverUrl}
                                alt={rb.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-800 truncate w-14 leading-tight">
                              {rb.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live Controls: Pause / Resume / Cancel */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-100">
                    {importProgress.status === 'running' && (
                      <button
                        type="button"
                        onClick={handlePauseImport}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </button>
                    )}
                    {importProgress.status === 'paused' && (
                      <button
                        type="button"
                        onClick={handleResumeImport}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Continuar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelImport}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Starter Classics Options if empty */}
              {!isImporting && importFiles.length === 0 && (
                <div className="p-3.5 rounded-2xl bg-[#FAF8FF] border border-purple-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Ou adicione um clássico da literatura com 1 toque:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddClassicBook('peregrino')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-purple-100 text-xs font-semibold text-slate-800 shadow-2xs transition-colors cursor-pointer"
                    >
                      📖 O Peregrino
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddClassicBook('imitacao')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-purple-100 text-xs font-semibold text-slate-800 shadow-2xs transition-colors cursor-pointer"
                    >
                      📖 Imitação de Cristo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-purple-100 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                {importFiles.length > 0 && !isImporting ? (
                  <span>
                    {importFiles.length} livro(s) selecionado(s) • Concorrência inteligente
                  </span>
                ) : (
                  <span>ALTTO Offline Library</span>
                )}
              </span>

              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFiles([]);
                    setBatchAnalysis(null);
                    setImportProgress(null);
                  }}
                  disabled={isImporting && importProgress?.status === 'running'}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-purple-50 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isImporting && importProgress?.status === 'completed' ? 'Fechar' : 'Cancelar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleImportSubmit()}
                  disabled={importFiles.length === 0 || (isImporting && importProgress?.status === 'running')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isImporting && importProgress?.status === 'running' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando ({importProgress?.current || 1}/{importProgress?.total || importFiles.length})...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>
                        {importFiles.length <= 1
                          ? 'Adicionar à Biblioteca'
                          : `Importar Todos (${importFiles.length} Livros)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* READING GOAL MODAL */}
      {selectedBookForGoal && (
        <div
          id="modal-reading-goal"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white border border-purple-100 rounded-3xl p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex justify-between items-center border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base font-serif text-slate-900">Meta de Leitura</h3>
              </div>
              <button
                onClick={() => setSelectedBookForGoal(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Defina o prazo para ler <strong>{selectedBookForGoal.title}</strong>. O ALTTO calculará sua meta diária de páginas:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[7, 14, 30, 60, 90, 120].map(days => (
                <button
                  key={days}
                  onClick={() => setTargetDays(days)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    targetDays === days
                      ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-2xs'
                      : 'bg-[#FAF8FF] border-purple-100 text-slate-600 hover:bg-[#F5F2FE]'
                  }`}
                >
                  {days} Dias
                </button>
              ))}
            </div>

            <div className="p-3 bg-[#FAF8FF] rounded-xl border border-purple-100 text-xs text-center text-purple-900 font-medium">
              Meta estimada: ~
              <strong className="text-purple-700 font-bold">
                {Math.max(1, Math.ceil((selectedBookForGoal.totalPages || 120) / targetDays))}
              </strong>{' '}
              páginas por dia.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookForGoal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div
          id="modal-confirm-delete"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white border border-purple-100 rounded-3xl p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center gap-3 border-b border-purple-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base font-serif text-slate-900">
                  {bookToDeleteDirectly
                    ? 'Excluir Livro'
                    : `Excluir ${selectedBookIds.length} Livro(s)`}
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação liberará espaço do armazenamento local.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                {bookToDeleteDirectly ? (
                  <>
                    Tem certeza de que deseja remover <strong>"{bookToDeleteDirectly.title}"</strong> da sua biblioteca?
                  </>
                ) : (
                  <>
                    Tem certeza de que deseja excluir os <strong>{selectedBookIds.length} livros selecionados</strong>?
                  </>
                )}
              </p>
              {!bookToDeleteDirectly && selectedBookIds.length > 0 && (
                <div className="max-h-36 overflow-y-auto bg-[#FAF8FF] border border-purple-100 rounded-xl p-2.5 space-y-1">
                  {books
                    .filter((b) => selectedBookIds.includes(b.id))
                    .slice(0, 10)
                    .map((b) => (
                      <div key={b.id} className="text-[11px] text-slate-700 truncate flex items-center gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{b.title}</span>
                      </div>
                    ))}
                  {selectedBookIds.length > 10 && (
                    <div className="text-[10px] text-slate-400 italic pt-1 text-center">
                      + outros {selectedBookIds.length - 10} livros
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-purple-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setBookToDeleteDirectly(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-purple-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {bookToDeleteDirectly
                        ? 'Sim, Excluir Livro'
                        : `Sim, Excluir (${selectedBookIds.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECOVERY & DIAGNOSTIC MODAL (348 LIVROS & PREVENÇÃO ANDROID) */}
      {showRecoveryModal && (
        <div
          id="modal-recovery-diagnostic"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-2xl bg-white border border-purple-100 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-purple-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs border border-purple-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg font-serif text-slate-900">
                    Recuperação & Diagnóstico da Biblioteca
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Proteção de dados, integridade do IndexedDB e importação resiliente para Android
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!batchProgress || batchProgress.status !== 'running') {
                    setShowRecoveryModal(false);
                    setReconciledItems([]);
                    setReconciliationSummary(null);
                  }
                }}
                disabled={batchProgress?.status === 'running'}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-purple-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Card de Diagnóstico do Armazenamento */}
              <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span>Diagnóstico de Integridade (IndexedDB)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRunDiagnostic}
                    disabled={isRunningDiagnostic}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiagnostic ? 'Escaneando...' : 'Atualizar Diagnóstico'}</span>
                  </button>
                </div>

                {diagnostic ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Cadastrado</span>
                      <strong className="text-base font-bold text-slate-900">{diagnostic.totalBooks}</strong>
                      <span className="text-[9px] text-slate-400 block">livros no banco</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Íntegros</span>
                      <strong className="text-base font-bold text-emerald-800">{diagnostic.healthyBooks}</strong>
                      <span className="text-[9px] text-emerald-600 block">com arquivo salvo</span>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-white border ${diagnostic.incompleteBooks > 0 ? 'border-purple-300 bg-purple-50/50' : 'border-purple-100'}`}>
                      <span className="text-[10px] text-purple-800 uppercase font-semibold block">Incompletos</span>
                      <strong className={`text-base font-bold ${diagnostic.incompleteBooks > 0 ? 'text-purple-800' : 'text-slate-800'}`}>
                        {diagnostic.incompleteBooks}
                      </strong>
                      <span className="text-[9px] text-purple-700 block">sem arquivo binário</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Arquivos Blobs</span>
                      <strong className="text-base font-bold text-slate-900">{diagnostic.totalBlobsCount}</strong>
                      <span className="text-[9px] text-slate-400 block">no armazenamento</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Carregando diagnóstico do armazenamento local...</span>
                  </div>
                )}

                {diagnostic && diagnostic.incompleteBooks > 0 && (
                  <div className="p-3 rounded-xl bg-purple-100/70 border border-purple-200 text-xs text-purple-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-purple-700" />
                      <span>{diagnostic.incompleteBooks} livro(s) com registro incompleto identificado(s):</span>
                    </p>
                    <div className="max-h-24 overflow-y-auto text-[11px] space-y-0.5 divide-y divide-purple-200/60 pt-1">
                      {diagnostic.corruptedDetails.map(item => (
                        <div key={item.id} className="pt-0.5 flex justify-between gap-2">
                          <span className="font-semibold truncate">• {item.title}</span>
                          <span className="text-[10px] text-purple-800 shrink-0 font-mono">Pendente de arquivo</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-purple-700 pt-1">
                      💡 <strong>Nenhum dado foi apagado.</strong> Ao selecionar os arquivos abaixo, o ALTTO restaurará o arquivo binário mantendo seus metadados.
                    </p>
                  </div>
                )}
              </div>

              {/* Seção de Reconciliação e Retomada dos 348 Arquivos */}
              <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-purple-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Reconciliar e Retomar Arquivos (PDFs e EPUBs)
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">
                      Selecione seus arquivos novamente. O ALTTO detectará os já salvos e importará apenas os faltantes sem duplicar.
                    </p>
                  </div>
                </div>

                {/* File picker button */}
                <input
                  id="recovery-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.epub,.mobi,.cbz,.cbr,.txt"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleRecoveryFilesSelected(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    disabled={isReconciling || batchProgress?.status === 'running'}
                    onClick={() => document.getElementById('recovery-file-input')?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-purple-200 hover:border-violet-400 active:scale-95 text-slate-900 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Files className="w-4 h-4 text-purple-700" />
                    <span>
                      {recoveryFiles.length > 0
                        ? `Arquivos Selecionados (${recoveryFiles.length}) • Trocar`
                        : 'Selecionar os Arquivos (ou faltantes)'}
                    </span>
                  </button>

                  <span className="text-[10px] text-slate-500">
                    O celular fechou o seletor na falha; selecione-os para continuar.
                  </span>
                </div>

                {/* Resumo da Reconciliação */}
                {isReconciling && (
                  <div className="p-3 text-center text-xs text-purple-900 flex items-center justify-center gap-2 bg-white rounded-xl border border-purple-100">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                    <span>Calculando assinaturas e comparando com a biblioteca existente...</span>
                  </div>
                )}

                {reconciliationSummary && !isReconciling && (
                  <div className="p-3.5 rounded-xl bg-white border border-purple-100 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                      Resultado da Análise Comparativa:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <span className="font-bold text-sm block">{reconciliationSummary.alreadyImported}</span>
                        <span>Já Salvos (não serão duplicados)</span>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-900 border border-purple-200">
                        <span className="font-bold text-sm block">{reconciliationSummary.canRepair}</span>
                        <span>Serão Reparados</span>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                        <span className="font-bold text-sm block">{reconciliationSummary.pending}</span>
                        <span>Novos para Importar</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={batchProgress?.status === 'running' || (reconciliationSummary.canRepair === 0 && reconciliationSummary.pending === 0)}
                        onClick={handleStartSafeRecovery}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          Iniciar Processamento Seguro (
                          {reconciliationSummary.canRepair + reconciliationSummary.pending} livros)
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fila de Execução com Barra de Progresso Segura */}
              {batchProgress && (
                <div className="p-4 rounded-2xl bg-[#FAF8FF] border border-purple-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      {batchProgress.status === 'running' && (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                      )}
                      <span>
                        {batchProgress.status === 'running'
                          ? `Processando livro ${batchProgress.current} de ${batchProgress.total}...`
                          : batchProgress.status === 'paused'
                          ? 'Fila pausada pelo usuário'
                          : batchProgress.status === 'completed'
                          ? 'Processamento 100% concluído!'
                          : 'Fila cancelada'}
                      </span>
                    </div>
                    <span className="font-mono text-purple-700">{batchProgress.percent}%</span>
                  </div>

                  <div className="w-full bg-purple-100 rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className="bg-violet-600 h-full rounded-full transition-all duration-200"
                      style={{ width: `${batchProgress.percent}%` }}
                    />
                  </div>

                  {batchProgress.currentFileName && (
                    <div className="text-[11px] text-slate-600 truncate">
                      Arquivo atual: <strong>{batchProgress.currentFileName}</strong>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-700 font-bold">✓ {batchProgress.successCount + batchProgress.repairedCount} salvos</span>
                      <span className="text-purple-700">⚡ {batchProgress.skippedCount} mantidos</span>
                      {batchProgress.errorCount > 0 && (
                        <span className="text-rose-700 font-bold">❌ {batchProgress.errorCount} erros</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {batchProgress.status === 'running' ? (
                        <button
                          type="button"
                          onClick={handlePauseRecovery}
                          className="px-3 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pausar</span>
                        </button>
                      ) : batchProgress.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={handleResumeRecovery}
                          className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Retomar</span>
                        </button>
                      ) : null}

                      {batchProgress.status === 'running' || batchProgress.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={handleCancelRecovery}
                          className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Lista de erros se houver */}
                  {batchProgress.errors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] space-y-1">
                      <span className="font-bold block">Falhas isoladas identificadas:</span>
                      <div className="max-h-20 overflow-y-auto space-y-0.5">
                        {batchProgress.errors.map((e, idx) => (
                          <div key={idx} className="truncate">
                            • <strong>{e.fileName}</strong>: {e.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-purple-100 shrink-0">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero sobrecarga de memória • Android Safe Pipeline</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRecoveryModal(false);
                  setReconciledItems([]);
                  setReconciliationSummary(null);
                }}
                disabled={batchProgress?.status === 'running'}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {importToast && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{importToast}</span>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

/**
 * Lightweight helper to trigger individual cover extraction on card mount
 */
function CoverFetcher({
  book,
  onRequestCover,
}: {
  book: Book;
  onRequestCover: (b: Book) => void;
}) {
  useEffect(() => {
    onRequestCover(book);
  }, [book.id, onRequestCover]);
  return null;
}
