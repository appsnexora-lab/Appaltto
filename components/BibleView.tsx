'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Clock,
  Sparkles,
  Library,
  Plus,
  Minus,
  ArrowRight,
  Check,
  Calendar,
  Flame,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Compass,
  Upload,
  Lock,
} from 'lucide-react';
import { Book, Bible } from '@/types';
import { getBooks, importBookFromFile } from '@/lib/bookService';
import { getBibles, importOfficialAlmeidaBible } from '@/lib/bibleService';
import {
  BIBLE_BOOKS_CATALOG,
  getBibleBookAndChapter,
  formatChapterRange,
  getGlobalChapterFromBook,
  getChaptersForDate,
  checkIsDateLocked,
  isBibleBook,
  registerBibleBookId,
} from '@/lib/bibleData';
import { useTheme } from '@/context/ThemeContext';

interface BibleViewProps {
  onOpenReader: (params: {
    contentType: 'book' | 'bible';
    contentId: string;
    title: string;
    subtitle?: string;
    bookData?: Book;
    bookName?: string;
    chapterNumber?: number;
    bibleBooks?: any[];
    period?: 'morning' | 'afternoon' | 'night' | string;
    isReadAlready?: boolean;
    initialChapterOrDay?: number;
  }) => void;
  selectedDateStr?: string;
  onDateChange?: (date: string) => void;
}

interface BiblePlanConfig {
  morningCount: number;
  afternoonCount: number;
  nightCount: number;
}

interface PeriodStatus {
  morning: boolean;
  afternoon: boolean;
  night: boolean;
}

export const BibleView: React.FC<BibleViewProps> = ({
  onOpenReader,
  selectedDateStr,
  onDateChange,
}) => {
  const { theme } = useTheme();
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDate = selectedDateStr || todayStr;

  // Books from library & Bibles
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [officialBibles, setOfficialBibles] = useState<Bible[]>([]);
  const [selectedBibleBook, setSelectedBibleBook] = useState<Book | null>(null);
  const [selectedOfficialBible, setSelectedOfficialBible] = useState<Bible | null>(null);
  const [useOfficialAlmeida, setUseOfficialAlmeida] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Chapter configuration per period (Default: 3 chapters = 1 morning, 1 afternoon, 1 night)
  const [planConfig, setPlanConfig] = useState<BiblePlanConfig>({
    morningCount: 1,
    afternoonCount: 1,
    nightCount: 1,
  });

  // Reference start date and starting global chapter for continuous progression across calendar days
  const [planStartDate, setPlanStartDate] = useState<string>(todayStr);
  const [planStartChapter, setPlanStartChapter] = useState<number>(1);

  // Completed status for active date
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>({
    morning: false,
    afternoon: false,
    night: false,
  });

  // Modal to pick Bible from library
  const [showBiblePickerModal, setShowBiblePickerModal] = useState<boolean>(false);
  const [showIdentifyBible, setShowIdentifyBible] = useState<boolean>(false);
  const [isImportingBible, setIsImportingBible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modal to jump to specific Bible book and chapter
  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [jumpBookId, setJumpBookId] = useState<string>('GEN');
  const [jumpChapter, setJumpChapter] = useState<number>(1);

  // Daily reflections / notes per period
  const [morningNote, setMorningNote] = useState<string>('');
  const [afternoonNote, setAfternoonNote] = useState<string>('');
  const [nightNote, setNightNote] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load library books & settings
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const [books, bibles] = await Promise.all([getBooks(), getBibles()]);
        if (isCancelled) return;
        setLibraryBooks(books);

        if (bibles.length === 0) {
          try {
            const imported = await importOfficialAlmeidaBible();
            if (!isCancelled) setOfficialBibles([imported]);
          } catch {
            if (!isCancelled) setOfficialBibles([]);
          }
        } else {
          setOfficialBibles(bibles);
        }

        // Load config (Morning, Afternoon, Night chapters)
        const savedConfig = localStorage.getItem('altto_bible_plan_config');
        if (savedConfig) {
          try {
            if (!isCancelled) setPlanConfig(JSON.parse(savedConfig));
          } catch {
            if (!isCancelled) setPlanConfig({ morningCount: 1, afternoonCount: 1, nightCount: 1 });
          }
        }

        // Load reference start date and starting chapter
        const savedStartDate = localStorage.getItem('altto_bible_plan_start_date');
        if (savedStartDate) {
          if (!isCancelled) setPlanStartDate(savedStartDate);
        } else {
          localStorage.setItem('altto_bible_plan_start_date', todayStr);
          if (!isCancelled) setPlanStartDate(todayStr);
        }

        const savedStartChapter = localStorage.getItem('altto_bible_plan_start_chapter');
        if (savedStartChapter) {
          const ch = parseInt(savedStartChapter, 10);
          if (!isNaN(ch) && ch >= 1 && ch <= 1189) {
            if (!isCancelled) setPlanStartChapter(ch);
          }
        } else {
          const oldChapter = localStorage.getItem('altto_bible_current_chapter');
          const ch = oldChapter ? parseInt(oldChapter, 10) : 1;
          const validCh = !isNaN(ch) && ch >= 1 && ch <= 1189 ? ch : 1;
          localStorage.setItem('altto_bible_plan_start_chapter', validCh.toString());
          if (!isCancelled) setPlanStartChapter(validCh);
        }

        // Load selected Bible from library
        const savedBibleBookId = localStorage.getItem('altto_selected_bible_book_id');
        const isAlmeida = localStorage.getItem('altto_use_official_almeida') === 'true';

        // Filter library books: ONLY Bibles should be eligible for the Bible reading plan
        const libraryBibleBooks = books.filter(isBibleBook);

        if (isCancelled) return;

        if (isAlmeida) {
          setUseOfficialAlmeida(true);
          setSelectedBibleBook(null);
          if (bibles.length > 0) {
            setSelectedOfficialBible(bibles[0]);
          }
        } else if (savedBibleBookId) {
          const found = libraryBibleBooks.find(b => b.id === savedBibleBookId);
          if (found) {
            setSelectedBibleBook(found);
            setUseOfficialAlmeida(false);
          } else if (libraryBibleBooks.length > 0) {
            setSelectedBibleBook(libraryBibleBooks[0]);
            setUseOfficialAlmeida(false);
            localStorage.setItem('altto_selected_bible_book_id', libraryBibleBooks[0].id);
          } else {
            // No valid Bible in library, fallback to official Almeida
            setUseOfficialAlmeida(true);
            setSelectedBibleBook(null);
            localStorage.setItem('altto_use_official_almeida', 'true');
          }
        } else if (libraryBibleBooks.length > 0) {
          setSelectedBibleBook(libraryBibleBooks[0]);
          setUseOfficialAlmeida(false);
          localStorage.setItem('altto_selected_bible_book_id', libraryBibleBooks[0].id);
        } else {
          setUseOfficialAlmeida(true);
          setSelectedBibleBook(null);
          localStorage.setItem('altto_use_official_almeida', 'true');
        }

        // Load period status for active date
        const savedStatus = localStorage.getItem(`altto_bible_status_${activeDate}`);
        if (savedStatus) {
          try {
            if (!isCancelled) setPeriodStatus(JSON.parse(savedStatus));
          } catch {
            if (!isCancelled) setPeriodStatus({ morning: false, afternoon: false, night: false });
          }
        } else {
          if (!isCancelled) setPeriodStatus({ morning: false, afternoon: false, night: false });
        }

        // Load notes
        const savedNotes = localStorage.getItem(`altto_bible_notes_${activeDate}`);
        if (savedNotes) {
          try {
            const parsed = JSON.parse(savedNotes);
            if (!isCancelled) {
              setMorningNote(parsed.morning || '');
              setAfternoonNote(parsed.afternoon || '');
              setNightNote(parsed.night || '');
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Erro ao carregar dados da Bíblia:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeDate, refreshTrigger, todayStr]);

  // Save config
  const updatePeriodCount = (period: 'morning' | 'afternoon' | 'night', delta: number) => {
    setPlanConfig(prev => {
      const current = prev[`${period}Count`];
      const nextVal = Math.max(1, Math.min(20, current + delta));
      const updated = { ...prev, [`${period}Count`]: nextVal };
      localStorage.setItem('altto_bible_plan_config', JSON.stringify(updated));
      return updated;
    });
    setToastMessage(`✨ Quantidade de capítulos da ${period === 'morning' ? 'Manhã' : period === 'afternoon' ? 'Tarde' : 'Noite'} atualizada!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Check if activeDate is locked (future date with incomplete prior reading)
  const isDateLocked = checkIsDateLocked(activeDate, todayStr);

  // Sequential turn locks within the active date
  const isMorningLocked = isDateLocked;
  const isAfternoonLocked = isDateLocked || !periodStatus.morning;
  const isNightLocked = isDateLocked || !periodStatus.afternoon;

  // Sync when status updates externally (e.g. from ReaderModal)
  useEffect(() => {
    const handleStatusSync = () => {
      const savedStatus = localStorage.getItem(`altto_bible_status_${activeDate}`);
      if (savedStatus) {
        try {
          setPeriodStatus(JSON.parse(savedStatus));
        } catch {}
      }
    };
    window.addEventListener('altto_bible_status_updated', handleStatusSync);
    return () => window.removeEventListener('altto_bible_status_updated', handleStatusSync);
  }, [activeDate]);

  // Toggle period completed with sequential discipline
  const handleTogglePeriod = (period: 'morning' | 'afternoon' | 'night') => {
    if (isDateLocked) {
      setToastMessage(`⚠️ Bloqueado: Conclua as leituras de hoje (${todayStr}) primeiro.`);
      setTimeout(() => setToastMessage(''), 3500);
      return;
    }
    if (period === 'afternoon' && !periodStatus.morning) {
      setToastMessage('⚠️ Bloqueado: Conclua a leitura da Manhã primeiro para liberar a Tarde.');
      setTimeout(() => setToastMessage(''), 3500);
      return;
    }
    if (period === 'night' && !periodStatus.afternoon) {
      setToastMessage('⚠️ Bloqueado: Conclua a leitura da Tarde primeiro para liberar a Noite.');
      setTimeout(() => setToastMessage(''), 3500);
      return;
    }

    setPeriodStatus(prev => {
      const willBeDone = !prev[period];
      const updated = { ...prev, [period]: willBeDone };

      // Cascade uncheck if user unmarks an earlier period
      if (period === 'morning' && !willBeDone) {
        updated.afternoon = false;
        updated.night = false;
      } else if (period === 'afternoon' && !willBeDone) {
        updated.night = false;
      }

      localStorage.setItem(`altto_bible_status_${activeDate}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('altto_bible_status_updated'));

      if (willBeDone) {
        if (period === 'morning') {
          setToastMessage('✨ Manhã concluída! Turno da Tarde liberado para leitura.');
        } else if (period === 'afternoon') {
          setToastMessage('✨ Tarde concluída! Turno da Noite liberado para leitura.');
        } else if (period === 'night') {
          setToastMessage('🎉 Glória a Deus! Você concluiu todas as leituras de hoje! Amanhã desbloqueado.');
        }
        setTimeout(() => setToastMessage(''), 4000);
      }
      return updated;
    });
  };

  // Select a Bible from library
  const handleSelectLibraryBible = (book: Book) => {
    registerBibleBookId(book.id);
    setSelectedBibleBook(book);
    setUseOfficialAlmeida(false);
    localStorage.setItem('altto_selected_bible_book_id', book.id);
    localStorage.setItem('altto_use_official_almeida', 'false');
    setShowBiblePickerModal(false);
    setToastMessage(`📖 "${book.title}" definida como sua Bíblia da Biblioteca!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Identify any library book explicitly as a Bible and select it
  const handleMarkBookAsBible = (book: Book) => {
    registerBibleBookId(book.id);
    book.isBible = true;
    setRefreshTrigger(n => n + 1);
    handleSelectLibraryBible(book);
    setShowIdentifyBible(false);
    setToastMessage(`📖 "${book.title}" identificada e definida como sua Bíblia!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Select Almeida Official Bible
  const handleSelectAlmeidaBible = () => {
    setUseOfficialAlmeida(true);
    setSelectedBibleBook(null);
    localStorage.setItem('altto_use_official_almeida', 'true');
    setShowBiblePickerModal(false);
    setToastMessage('📖 Bíblia João Ferreira de Almeida selecionada!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Continuous chapter calculation for activeDate
  const chaptersPlan = getChaptersForDate({
    activeDate,
    planStartDate,
    planStartChapter,
    morningCount: planConfig.morningCount,
    afternoonCount: planConfig.afternoonCount,
    nightCount: planConfig.nightCount,
  });

  const {
    morningStart,
    morningCount,
    morningEnd,
    afternoonStart,
    afternoonCount,
    afternoonEnd,
    nightStart,
    nightCount,
    nightEnd,
    dayStartChapter,
    totalDaily,
  } = chaptersPlan;

  // Date Navigation handlers
  const handleNavigateDate = (offsetDays: number) => {
    const [y, m, d] = activeDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + offsetDays);
    const ny = dateObj.getFullYear();
    const nm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const nd = dateObj.getDate().toString().padStart(2, '0');
    const newDateStr = `${ny}-${nm}-${nd}`;
    if (onDateChange) {
      onDateChange(newDateStr);
    }
  };

  const handleGoToToday = () => {
    if (onDateChange) {
      onDateChange(todayStr);
    }
  };

  // Open Reader for period
  const handleOpenPeriodReader = (
    startGlobal: number,
    count: number,
    period: 'morning' | 'afternoon' | 'night',
    periodLabel: string
  ) => {
    if (isDateLocked) {
      setToastMessage(`⚠️ Bloqueado: Conclua as leituras de hoje (${todayStr}) primeiro.`);
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }
    if (period === 'afternoon' && !periodStatus.morning) {
      setToastMessage('⚠️ Bloqueado: Conclua a leitura da Manhã primeiro para liberar a Tarde.');
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }
    if (period === 'night' && !periodStatus.afternoon) {
      setToastMessage('⚠️ Bloqueado: Conclua a leitura da Tarde primeiro para liberar a Noite.');
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }

    const chapterInfo = getBibleBookAndChapter(startGlobal);

    if (useOfficialAlmeida || !selectedBibleBook) {
      const bibleToUse = officialBibles[0];
      onOpenReader({
        contentType: 'bible',
        contentId: bibleToUse ? bibleToUse.id : 'official-almeida',
        title: `Bíblia Sagrada — ${periodLabel}`,
        subtitle: formatChapterRange(startGlobal, count),
        bookName: chapterInfo.bookName,
        chapterNumber: chapterInfo.chapter,
        bibleBooks: bibleToUse?.books,
        period,
      });
    } else {
      onOpenReader({
        contentType: 'book',
        contentId: selectedBibleBook.id,
        title: `${selectedBibleBook.title} — ${periodLabel}`,
        subtitle: formatChapterRange(startGlobal, count),
        bookData: selectedBibleBook,
        period,
      });
    }
  };

  // Advance to next day
  const handleAdvanceNextDay = () => {
    handleNavigateDate(1);
    setToastMessage(`✨ Avançado para o dia seguinte!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Confirm jump from modal
  const handleConfirmJump = () => {
    const targetGlobal = getGlobalChapterFromBook(jumpBookId, jumpChapter);
    setPlanStartChapter(targetGlobal);
    setPlanStartDate(activeDate);
    localStorage.setItem('altto_bible_plan_start_chapter', targetGlobal.toString());
    localStorage.setItem('altto_bible_plan_start_date', activeDate);
    setShowJumpModal(false);
    const info = getBibleBookAndChapter(targetGlobal);
    setToastMessage(`✨ Plano iniciado em ${info.bookName} ${info.chapter} a partir de ${activeDate}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Direct import Bible from file input
  const handleDirectImportBible = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImportingBible(true);
      const newBook = await importBookFromFile(file, { isBible: true });
      registerBibleBookId(newBook.id);
      newBook.isBible = true;
      setRefreshTrigger(n => n + 1);
      handleSelectLibraryBible(newBook);
      setShowBiblePickerModal(false);
      setToastMessage(`📖 Bíblia "${newBook.title}" importada e definida como sua Bíblia!`);
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      console.error(err);
      setToastMessage('Erro ao importar arquivo da Bíblia');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setIsImportingBible(false);
    }
  };

  // Save notes
  const handleSaveNotes = () => {
    const notes = { morning: morningNote, afternoon: afternoonNote, night: nightNote };
    localStorage.setItem(`altto_bible_notes_${activeDate}`, JSON.stringify(notes));
    setToastMessage('✨ Anotações da Bíblia salvas com sucesso!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const completedCount =
    (periodStatus.morning ? 1 : 0) +
    (periodStatus.afternoon ? 1 : 0) +
    (periodStatus.night ? 1 : 0);

  const isAllCompletedToday = completedCount === 3;
  const currentGlobalChapter = morningStart;
  const totalToday = totalDaily;
  const currentInfo = getBibleBookAndChapter(currentGlobalChapter);
  const bibleProgressPercent = Math.min(100, Math.round((currentGlobalChapter / 1189) * 100));

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Carregando plano bíblico diário...</span>
      </div>
    );
  }

  return (
    <div
      id="bible-view-container"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 transition-colors duration-300"
      style={{ color: theme.colors.text }}
    >
      {/* Top Header */}
      <div
        className="flex items-center justify-between border-b pb-4 flex-wrap gap-3"
        style={{ borderColor: theme.colors.border }}
      >
        <div>
          <span
            className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: theme.colors.accent }}
          >
            <BookOpen className="w-4 h-4" />
            Plano Bíblico Diário (Manhã • Tarde • Noite)
          </span>
          <h1 className="text-2xl font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>
            Leitura da Bíblia
          </h1>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
            Leia sua Bíblia adicionada da biblioteca dividida em 3 momentos sagrados do seu dia com continuidade cronológica.
          </p>
        </div>
        <button
          onClick={() => setShowBiblePickerModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-2xs transition-all cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          <Library className="w-4 h-4" style={{ color: theme.colors.accent }} />
          <span>Trocar Bíblia da Biblioteca</span>
        </button>
      </div>

      {/* Barra de Seleção e Navegação de Data */}
      <div
        className="border rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => handleNavigateDate(-1)}
            className="p-2 rounded-xl border transition-colors cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: theme.colors.accent }} />
            <input
              type="date"
              value={activeDate}
              onChange={e => onDateChange && onDateChange(e.target.value)}
              className="border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            />
          </div>
          <button
            onClick={() => handleNavigateDate(1)}
            className="p-2 rounded-xl border transition-colors cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {activeDate === todayStr ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Hoje ({activeDate})
            </span>
          ) : activeDate > todayStr ? (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isDateLocked
                ? 'bg-violet-500/15 text-violet-600 border-violet-500/30'
                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
            }`}>
              {isDateLocked ? <Lock className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isDateLocked ? 'Dia Futuro (Bloqueado)' : 'Dia Futuro (Desbloqueado)'}
            </span>
          ) : (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textMuted,
              }}
            >
              Dia Passado ({activeDate})
            </span>
          )}

          {activeDate !== todayStr && (
            <button
              onClick={handleGoToToday}
              className="px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
              style={{
                backgroundColor: `${theme.colors.accent}20`,
                borderColor: `${theme.colors.accent}40`,
                color: theme.colors.accent,
              }}
            >
              Voltar para Hoje
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Leituras Futuras Bloqueadas */}
      {isDateLocked && (
        <div
          className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs border"
          style={{
            backgroundColor: `${theme.colors.accent}12`,
            borderColor: `${theme.colors.accent}40`,
            color: theme.colors.text,
          }}
        >
          <div className="flex items-start gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${theme.colors.accent}25`,
                color: theme.colors.accent,
              }}
            >
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: theme.colors.text }}>Leituras deste dia bloqueadas</span>
              <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                Você pode visualizar os capítulos programados abaixo, mas a leitura e conclusão estão bloqueadas até que conclua as leituras de hoje ({todayStr}).
              </span>
            </div>
          </div>
          <button
            onClick={handleGoToToday}
            className="px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5 transition-colors hover:opacity-90"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <span>Ir para Hoje</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Card da Bíblia Ativa da Biblioteca */}
      <div
        className="border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-colors"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div
          className="flex items-center justify-between text-xs font-bold border-b pb-2.5"
          style={{
            borderColor: theme.colors.border,
            color: theme.colors.accent,
          }}
        >
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Sparkles className="w-4 h-4" />
            Bíblia Selecionada para Leitura
          </span>
          <span
            className="px-2 py-0.5 rounded-full font-mono text-[10px] border"
            style={{
              backgroundColor: `${theme.colors.accent}15`,
              color: theme.colors.accent,
              borderColor: `${theme.colors.accent}30`,
            }}
          >
            {useOfficialAlmeida || !selectedBibleBook ? 'TEXTO DIGITAL' : selectedBibleBook.format.toUpperCase()}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Capa / Ícone */}
          <div
            onClick={() => handleOpenPeriodReader(morningStart, planConfig.morningCount, 'morning', 'Manhã')}
            className="w-20 sm:w-24 aspect-[3/4] rounded-lg overflow-hidden border shadow-sm shrink-0 cursor-pointer group hover:scale-[1.02] transition-transform"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            {selectedBibleBook?.coverUrl ? (
              <img
                src={selectedBibleBook.coverUrl}
                alt={selectedBibleBook.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-2 text-center"
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.accent,
                }}
              >
                <BookOpen className="w-6 h-6 mb-1" />
                <span className="text-[9px] font-serif font-bold line-clamp-2" style={{ color: theme.colors.text }}>
                  {useOfficialAlmeida || !selectedBibleBook ? 'Bíblia Almeida' : selectedBibleBook.title}
                </span>
              </div>
            )}
          </div>

          {/* Informações da Bíblia */}
          <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif leading-snug" style={{ color: theme.colors.text }}>
                {useOfficialAlmeida || !selectedBibleBook
                  ? 'Bíblia Sagrada — João Ferreira de Almeida'
                  : selectedBibleBook.title}
              </h2>
              <p className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                {useOfficialAlmeida || !selectedBibleBook
                  ? 'Tradução oficial em português com 66 livros'
                  : selectedBibleBook.author || 'Bíblia importada da biblioteca'}
              </p>
            </div>

            {/* Progresso Geral na Bíblia (1 a 1189) */}
            <div className="space-y-1 max-w-md">
              <div className="flex justify-between text-[11px] font-semibold" style={{ color: theme.colors.textMuted }}>
                <span>Posição Atual: <strong style={{ color: theme.colors.text }}>{currentInfo.bookName} {currentInfo.chapter}</strong></span>
                <span className="font-bold" style={{ color: theme.colors.accent }}>{currentGlobalChapter} de 1.189 caps ({bibleProgressPercent}%)</span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${bibleProgressPercent}%`,
                    backgroundColor: theme.colors.accent,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center justify-center sm:justify-start pt-1">
              <button
                onClick={() => setShowBiblePickerModal(true)}
                className="text-[11px] font-semibold underline cursor-pointer hover:opacity-80"
                style={{ color: theme.colors.accent }}
              >
                Escolher outra Bíblia da Biblioteca
              </button>
              <span style={{ color: theme.colors.border }}>•</span>
              <button
                onClick={() => {
                  const info = getBibleBookAndChapter(currentGlobalChapter);
                  setJumpBookId(info.bookId);
                  setJumpChapter(info.chapter);
                  setShowJumpModal(true);
                }}
                className="text-[11px] font-semibold underline cursor-pointer flex items-center gap-1 hover:opacity-80"
                style={{ color: theme.colors.accent }}
              >
                <Compass className="w-3 h-3" />
                <span>Alterar Livro / Capítulo Inicial</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controle de Capítulos por Período: 3 Capítulos/dia por padrão, com ajuste livre */}
      <div
        className="border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 transition-colors"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div
          className="flex items-center justify-between border-b pb-2.5 flex-wrap gap-2"
          style={{ borderColor: theme.colors.border }}
        >
          <div>
            <h3 className="font-bold text-sm font-serif" style={{ color: theme.colors.text }}>
              Meta Diária de Capítulos
            </h3>
            <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
              Padrão de <strong>3 capítulos por dia</strong> (1 Manhã + 1 Tarde + 1 Noite). Aumente ou diminua livremente:
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full font-bold text-xs border"
            style={{
              backgroundColor: `${theme.colors.accent}15`,
              color: theme.colors.accent,
              borderColor: `${theme.colors.accent}30`,
            }}
          >
            Total hoje: {totalToday} {totalToday === 1 ? 'capítulo' : 'capítulos'}
          </div>
        </div>

        {/* 3 Steppers: Manhã, Tarde e Noite */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Manhã */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block leading-tight" style={{ color: theme.colors.text }}>Manhã</span>
                <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Capítulos</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updatePeriodCount('morning', -1)}
                disabled={planConfig.morningCount <= 1}
                className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-2xs hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                title="Diminuir capítulos"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm font-mono" style={{ color: theme.colors.text }}>
                {planConfig.morningCount}
              </span>
              <button
                onClick={() => updatePeriodCount('morning', 1)}
                className="w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer shadow-2xs hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                title="Aumentar capítulos da manhã"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tarde */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                <Sunset className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block leading-tight" style={{ color: theme.colors.text }}>Tarde</span>
                <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Capítulos</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updatePeriodCount('afternoon', -1)}
                disabled={planConfig.afternoonCount <= 1}
                className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-2xs hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                title="Diminuir capítulos"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm font-mono" style={{ color: theme.colors.text }}>
                {planConfig.afternoonCount}
              </span>
              <button
                onClick={() => updatePeriodCount('afternoon', 1)}
                className="w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer shadow-2xs hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                title="Aumentar capítulos da tarde"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Noite */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block leading-tight" style={{ color: theme.colors.text }}>Noite</span>
                <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Capítulos</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updatePeriodCount('night', -1)}
                disabled={planConfig.nightCount <= 1}
                className="w-7 h-7 rounded-lg border flex items-center justify-center disabled:opacity-30 cursor-pointer shadow-2xs hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                title="Diminuir capítulos"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm font-mono" style={{ color: theme.colors.text }}>
                {planConfig.nightCount}
              </span>
              <button
                onClick={() => updatePeriodCount('night', 1)}
                className="w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer shadow-2xs hover:opacity-80"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
                title="Aumentar capítulos da noite"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Os 3 Momentos de Leitura do Dia */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm font-serif flex items-center gap-2" style={{ color: theme.colors.text }}>
              <Clock className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <span>{activeDate === todayStr ? 'Suas Leituras de Hoje' : `Leituras Programadas (${activeDate})`}</span>
            </h3>
            {isDateLocked && (
              <span
                className="px-2 py-0.5 rounded-full font-bold text-[10px] border flex items-center gap-1"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                  borderColor: `${theme.colors.accent}30`,
                }}
              >
                <Lock className="w-3 h-3" />
                Bloqueado
              </span>
            )}
          </div>
          <span className="text-xs font-semibold" style={{ color: theme.colors.textMuted }}>
            {completedCount} de 3 períodos lidos ({Math.round((completedCount / 3) * 100)}%)
          </span>
        </div>

        {/* 1. MANHÃ */}
        <div
          className="p-4 rounded-2xl border transition-all"
          style={{
            backgroundColor: periodStatus.morning
              ? (theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
              : theme.colors.card,
            borderColor: periodStatus.morning
              ? (theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0')
              : theme.colors.border,
            opacity: isMorningLocked ? 0.75 : 1,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                {isMorningLocked ? <Lock className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.colors.accent }}
                  >
                    Leitura da Manhã
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {planConfig.morningCount} {planConfig.morningCount === 1 ? 'capítulo' : 'capítulos'}
                  </span>
                  {isMorningLocked && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold border"
                      style={{
                        backgroundColor: `${theme.colors.accent}15`,
                        color: theme.colors.accent,
                        borderColor: `${theme.colors.accent}30`,
                      }}
                    >
                      🔒 Bloqueado
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold font-serif mt-0.5" style={{ color: theme.colors.text }}>
                  {formatChapterRange(morningStart, planConfig.morningCount)}
                </h4>
                <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                  Capítulos {morningStart} a {morningEnd} da Bíblia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                id="btn-read-morning"
                onClick={() => handleOpenPeriodReader(morningStart, planConfig.morningCount, 'morning', 'Manhã')}
                className="px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: isMorningLocked
                    ? (theme.mode === 'dark' ? '#1E2433' : '#F1F5F9')
                    : theme.colors.accent,
                  color: isMorningLocked ? theme.colors.textMuted : theme.colors.accentText,
                }}
              >
                {isMorningLocked ? <Lock className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                <span>{isMorningLocked ? 'Bloqueado' : 'Ler na Bíblia'}</span>
              </button>
              <button
                id="btn-check-morning"
                onClick={() => handleTogglePeriod('morning')}
                className="p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: periodStatus.morning ? '#059669' : theme.colors.surface,
                  borderColor: periodStatus.morning ? '#059669' : theme.colors.border,
                  color: periodStatus.morning ? '#FFFFFF' : theme.colors.text,
                }}
                title={
                  isMorningLocked
                    ? 'Bloqueado: Conclua as leituras de hoje primeiro'
                    : periodStatus.morning
                    ? 'Marcado como lido'
                    : 'Marcar como lido'
                }
              >
                {isMorningLocked ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {periodStatus.morning ? 'Lido' : isMorningLocked ? 'Bloqueado' : 'Concluir'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. TARDE */}
        <div
          className="p-4 rounded-2xl border transition-all"
          style={{
            backgroundColor: periodStatus.afternoon
              ? (theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
              : theme.colors.card,
            borderColor: periodStatus.afternoon
              ? (theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0')
              : theme.colors.border,
            opacity: isAfternoonLocked ? 0.75 : 1,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                {isAfternoonLocked ? <Lock className="w-5 h-5" /> : <Sunset className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.colors.accent }}
                  >
                    Leitura da Tarde
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {planConfig.afternoonCount} {planConfig.afternoonCount === 1 ? 'capítulo' : 'capítulos'}
                  </span>
                  {isAfternoonLocked && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold border"
                      style={{
                        backgroundColor: `${theme.colors.accent}15`,
                        color: theme.colors.accent,
                        borderColor: `${theme.colors.accent}30`,
                      }}
                    >
                      {isDateLocked ? '🔒 Bloqueado' : '⏳ Conclua a Manhã'}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold font-serif mt-0.5" style={{ color: theme.colors.text }}>
                  {formatChapterRange(afternoonStart, planConfig.afternoonCount)}
                </h4>
                <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                  Capítulos {afternoonStart} a {afternoonEnd} da Bíblia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                id="btn-read-afternoon"
                onClick={() => handleOpenPeriodReader(afternoonStart, planConfig.afternoonCount, 'afternoon', 'Tarde')}
                className="px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: isAfternoonLocked
                    ? (theme.mode === 'dark' ? '#1E2433' : '#F1F5F9')
                    : theme.colors.accent,
                  color: isAfternoonLocked ? theme.colors.textMuted : theme.colors.accentText,
                }}
              >
                {isAfternoonLocked ? <Lock className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                <span>{isAfternoonLocked ? 'Bloqueado' : 'Ler na Bíblia'}</span>
              </button>
              <button
                id="btn-check-afternoon"
                onClick={() => handleTogglePeriod('afternoon')}
                className="p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: periodStatus.afternoon ? '#059669' : theme.colors.surface,
                  borderColor: periodStatus.afternoon ? '#059669' : theme.colors.border,
                  color: periodStatus.afternoon ? '#FFFFFF' : theme.colors.text,
                }}
                title={
                  isAfternoonLocked
                    ? 'Bloqueado: Conclua a leitura da Manhã primeiro'
                    : periodStatus.afternoon
                    ? 'Marcado como lido'
                    : 'Marcar como lido'
                }
              >
                {isAfternoonLocked ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {periodStatus.afternoon ? 'Lido' : isAfternoonLocked ? 'Bloqueado' : 'Concluir'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. NOITE */}
        <div
          className="p-4 rounded-2xl border transition-all"
          style={{
            backgroundColor: periodStatus.night
              ? (theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
              : theme.colors.card,
            borderColor: periodStatus.night
              ? (theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0')
              : theme.colors.border,
            opacity: isNightLocked ? 0.75 : 1,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                {isNightLocked ? <Lock className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: theme.colors.accent }}
                  >
                    Leitura da Noite
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {planConfig.nightCount} {planConfig.nightCount === 1 ? 'capítulo' : 'capítulos'}
                  </span>
                  {isNightLocked && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-bold border"
                      style={{
                        backgroundColor: `${theme.colors.accent}15`,
                        color: theme.colors.accent,
                        borderColor: `${theme.colors.accent}30`,
                      }}
                    >
                      {isDateLocked ? '🔒 Bloqueado' : '⏳ Conclua a Tarde'}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold font-serif mt-0.5" style={{ color: theme.colors.text }}>
                  {formatChapterRange(nightStart, planConfig.nightCount)}
                </h4>
                <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                  Capítulos {nightStart} a {nightEnd} da Bíblia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                id="btn-read-night"
                onClick={() => handleOpenPeriodReader(nightStart, planConfig.nightCount, 'night', 'Noite')}
                className="px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: isNightLocked
                    ? (theme.mode === 'dark' ? '#1E2433' : '#F1F5F9')
                    : theme.colors.accent,
                  color: isNightLocked ? theme.colors.textMuted : theme.colors.accentText,
                }}
              >
                {isNightLocked ? <Lock className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                <span>{isNightLocked ? 'Bloqueado' : 'Ler na Bíblia'}</span>
              </button>
              <button
                id="btn-check-night"
                onClick={() => handleTogglePeriod('night')}
                className="p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: periodStatus.night ? '#059669' : theme.colors.surface,
                  borderColor: periodStatus.night ? '#059669' : theme.colors.border,
                  color: periodStatus.night ? '#FFFFFF' : theme.colors.text,
                }}
                title={
                  isNightLocked
                    ? 'Bloqueado: Conclua a leitura da Tarde primeiro'
                    : periodStatus.night
                    ? 'Marcado como lido'
                    : 'Marcar como lido'
                }
              >
                {isNightLocked ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {periodStatus.night ? 'Lido' : isNightLocked ? 'Bloqueado' : 'Concluir'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card de Conclusão e Avançar Dia */}
      <div
        className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-colors"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div>
          <span className="text-xs font-bold" style={{ color: theme.colors.text }}>
            {isAllCompletedToday
              ? '🎉 Parabéns! Você concluiu todos os capítulos de hoje!'
              : `${completedCount} de 3 períodos lidos hoje`}
          </span>
          <p className="text-[11px] mt-0.5" style={{ color: theme.colors.textMuted }}>
            Ao avançar, os capítulos de Manhã, Tarde e Noite passarão automaticamente para os próximos {totalToday} capítulos da Bíblia.
          </p>
        </div>
        <button
          onClick={handleAdvanceNextDay}
          className="px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: theme.colors.accent,
            color: theme.colors.accentText,
          }}
        >
          <span>Avançar para Próximo Dia</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Seção Opcional de Anotações do Dia */}
      <div
        className="border rounded-2xl p-4 bg-white space-y-3 shadow-2xs"
        style={{ borderColor: theme.colors.border }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-80"
            style={{ color: theme.colors.text }}
          >
            <Edit3 className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
            <span>{showNotes ? 'Ocultar Anotações Bíblicas' : 'Escrever Anotações das Leituras de Hoje'}</span>
          </button>
          {showNotes && (
            <button
              onClick={handleSaveNotes}
              className="text-xs font-bold hover:underline cursor-pointer"
              style={{ color: theme.colors.accent }}
            >
              Salvar Anotações
            </button>
          )}
        </div>

        {showNotes && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.colors.textMuted }}>
                Anotação da Manhã:
              </label>
              <textarea
                rows={2}
                value={morningNote}
                onChange={e => setMorningNote(e.target.value)}
                placeholder="Versículo ou pensamento da manhã..."
                className="w-full bg-[#FAF8FF] border rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.colors.textMuted }}>
                Anotação da Tarde:
              </label>
              <textarea
                rows={2}
                value={afternoonNote}
                onChange={e => setAfternoonNote(e.target.value)}
                placeholder="Versículo ou pensamento da tarde..."
                className="w-full bg-[#FAF8FF] border rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.colors.textMuted }}>
                Anotação da Noite:
              </label>
              <textarea
                rows={2}
                value={nightNote}
                onChange={e => setNightNote(e.target.value)}
                placeholder="Versículo ou pensamento da noite..."
                className="w-full bg-[#FAF8FF] border rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal para Trocar Bíblia da Biblioteca */}
      {showBiblePickerModal && (
        <div
          id="modal-pick-bible-book"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-lg bg-white border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            style={{ borderColor: theme.colors.border }}
          >
            <div
              className="flex justify-between items-center border-b pb-3 shrink-0"
              style={{ borderColor: theme.colors.border }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
                >
                  <Library className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif" style={{ color: theme.colors.text }}>
                    Bíblia da Sua Biblioteca
                  </h3>
                  <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                    Escolha a Bíblia que você importou ou a tradução oficial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBiblePickerModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Importar Nova Bíblia diretamente */}
            <div
              className="p-3.5 rounded-xl border flex items-center justify-between gap-3 shrink-0"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <div className="min-w-0">
                <span className="text-xs font-bold block" style={{ color: theme.colors.text }}>Tem um PDF ou EPUB da Bíblia?</span>
                <span className="text-[11px]" style={{ color: theme.colors.textMuted }}>Importe seu arquivo para ler no plano diário</span>
              </div>
              <label
                className="px-3.5 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0 hover:opacity-90"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isImportingBible ? 'Importando...' : '+ Importar Bíblia'}</span>
                <input
                  type="file"
                  accept=".pdf,.epub,.txt,.cbz,.mobi"
                  disabled={isImportingBible}
                  className="hidden"
                  onChange={handleDirectImportBible}
                />
              </label>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {/* Opção Tradução Oficial Almeida */}
              <div
                onClick={handleSelectAlmeidaBible}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  useOfficialAlmeida
                    ? 'border-violet-500 bg-violet-50/50 shadow-2xs ring-1 ring-violet-500'
                    : 'border-slate-200 hover:border-violet-300 hover:bg-[#FAF8FF]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-14 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold font-serif" style={{ color: theme.colors.text }}>
                      Bíblia Sagrada — João Ferreira de Almeida
                    </h4>
                    <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                      Tradução clássica completa (66 livros)
                    </p>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 inline-block"
                      style={{
                        backgroundColor: `${theme.colors.accent}15`,
                        color: theme.colors.accent,
                      }}
                    >
                      TEXTO DIGITAL COMPLETO
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                    useOfficialAlmeida
                      ? 'text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                  style={{
                    backgroundColor: useOfficialAlmeida ? theme.colors.accent : undefined,
                  }}
                >
                  {useOfficialAlmeida ? 'Selecionada' : 'Escolher'}
                </button>
              </div>

              {/* Seção Bíblias da Biblioteca (apenas livros reconhecidos como Bíblia) */}
              {(() => {
                const libraryBibleBooks = libraryBooks.filter(isBibleBook);
                const nonBibleBooks = libraryBooks.filter(b => !isBibleBook(b));

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Bíblias da Sua Biblioteca ({libraryBibleBooks.length})
                      </span>
                      {libraryBibleBooks.length > 0 && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                          Apenas Bíblias
                        </span>
                      )}
                    </div>

                    {libraryBibleBooks.length === 0 ? (
                      <div
                        className="p-4 rounded-xl border border-dashed text-center space-y-2"
                        style={{
                          borderColor: `${theme.colors.accent}40`,
                          backgroundColor: `${theme.colors.accent}08`,
                        }}
                      >
                        <div
                          className="w-9 h-9 mx-auto rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
                        >
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold" style={{ color: theme.colors.text }}>
                          Nenhuma Bíblia adicionada na Biblioteca ainda
                        </h4>
                        <p className="text-[11px] max-w-sm mx-auto leading-relaxed" style={{ color: theme.colors.textMuted }}>
                          Apenas Bíblias em PDF ou EPUB aparecem nesta lista para serem selecionadas nos planos diários. Você pode importar sua Bíblia preferida (NVI, ACF, NAA, King James, Bíblia de Estudo, etc.) no botão acima <strong>+ Importar Bíblia</strong>.
                        </p>
                      </div>
                    ) : (
                      libraryBibleBooks.map(b => {
                        const isCurrent = !useOfficialAlmeida && selectedBibleBook?.id === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleSelectLibraryBible(b)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isCurrent
                                ? 'border-violet-500 bg-violet-50/60 shadow-2xs ring-1 ring-violet-500'
                                : 'border-slate-200 hover:border-violet-300 hover:bg-[#FAF8FF]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                                {b.coverUrl ? (
                                  <img src={b.coverUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    {b.format.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold truncate font-serif" style={{ color: theme.colors.text }}>
                                    {b.title}
                                  </h4>
                                  <span
                                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: `${theme.colors.accent}15`,
                                      color: theme.colors.accent,
                                    }}
                                  >
                                    BÍBLIA
                                  </span>
                                </div>
                                <p className="text-[11px] truncate" style={{ color: theme.colors.textMuted }}>
                                  {b.author || 'Bíblia da biblioteca'}
                                </p>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mt-1 inline-block">
                                  {b.format.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                                isCurrent
                                  ? 'text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                              style={{
                                backgroundColor: isCurrent ? theme.colors.accent : undefined,
                              }}
                            >
                              {isCurrent ? '✓ Selecionada' : 'Escolher'}
                            </button>
                          </div>
                        );
                      })
                    )}

                    {/* Opção discreta para identificar outro livro da biblioteca caso o usuário queira */}
                    {nonBibleBooks.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowIdentifyBible(!showIdentifyBible)}
                          className="text-[11px] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                          style={{ color: theme.colors.accent }}
                        >
                          <span>{showIdentifyBible ? 'Ocultar outros livros' : 'Algum livro da biblioteca é uma Bíblia e não apareceu acima?'}</span>
                        </button>

                        {showIdentifyBible && (
                          <div className="mt-2 p-2.5 bg-[#FAF8FF] rounded-xl border border-slate-200 space-y-1.5 animate-in fade-in">
                            <span className="text-[10px] text-slate-600 block">
                              Selecione o livro para identificá-lo como Bíblia nos planos de leitura:
                            </span>
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {nonBibleBooks.map(nb => (
                                <div
                                  key={nb.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs hover:border-violet-400"
                                >
                                  <span className="truncate pr-2 text-slate-800 font-medium">{nb.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkBookAsBible(nb)}
                                    className="px-2 py-1 rounded text-white font-bold text-[10px] shrink-0 cursor-pointer"
                                    style={{ backgroundColor: theme.colors.accent }}
                                  >
                                    Definir como Bíblia
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowBiblePickerModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Alterar Livro / Capítulo Inicial da Leitura */}
      {showJumpModal && (
        <div
          id="modal-jump-bible-chapter"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-md bg-white border rounded-2xl p-5 shadow-2xl space-y-4"
            style={{ borderColor: theme.colors.border }}
          >
            <div
              className="flex justify-between items-center border-b pb-3"
              style={{ borderColor: theme.colors.border }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
                >
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif" style={{ color: theme.colors.text }}>
                    Alterar Posição Inicial
                  </h3>
                  <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                    Defina onde você deseja iniciar sua leitura diária
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJumpModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: theme.colors.text }}>
                  Livro da Bíblia:
                </label>
                <select
                  value={jumpBookId}
                  onChange={e => {
                    setJumpBookId(e.target.value);
                    setJumpChapter(1);
                  }}
                  className="w-full bg-[#FAF8FF] border rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                  style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                >
                  <optgroup label="Antigo Testamento">
                    {BIBLE_BOOKS_CATALOG.filter(b => b.testament === 'old').map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.chaptersCount} caps)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Novo Testamento">
                    {BIBLE_BOOKS_CATALOG.filter(b => b.testament === 'new').map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.chaptersCount} caps)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                {(() => {
                  const selectedBookInfo =
                    BIBLE_BOOKS_CATALOG.find(b => b.id === jumpBookId) || BIBLE_BOOKS_CATALOG[0];
                  return (
                    <div>
                      <label className="text-xs font-bold block mb-1" style={{ color: theme.colors.text }}>
                        Capítulo (1 a {selectedBookInfo.chaptersCount}):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedBookInfo.chaptersCount}
                        value={jumpChapter}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setJumpChapter(Math.max(1, Math.min(selectedBookInfo.chaptersCount, val)));
                          }
                        }}
                        className="w-full bg-[#FAF8FF] border rounded-xl p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                        style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                      />
                    </div>
                  );
                })()}
              </div>

              <div
                className="p-3 rounded-xl border text-xs space-y-1"
                style={{
                  backgroundColor: `${theme.colors.accent}10`,
                  borderColor: `${theme.colors.accent}30`,
                }}
              >
                <p className="font-semibold" style={{ color: theme.colors.text }}>
                  A partir desta alteração:
                </p>
                <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                  Os períodos de Manhã, Tarde e Noite começarão a partir do capítulo escolhido e avançarão conforme você concluir as leituras.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowJumpModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmJump}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: theme.colors.accent }}
              >
                Definir Posição Inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
