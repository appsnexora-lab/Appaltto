'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Clock,
  BookOpen,
  BookMarked,
  Library,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Lock,
  Calendar,
  Check,
  User,
  Play,
  Flame,
  Plus,
  Compass,
  Bookmark,
  Layers,
  Camera,
  Quote,
} from 'lucide-react';
import { Book, Bible } from '@/types';
import { getBooks } from '@/lib/bookService';
import { getReadingProgress, getLastReadBookId, getAllReadingProgressMap, recordActiveReading } from '@/lib/readerService';
import { getDailyVerse } from '@/lib/dailyVerses';
import {
  getBibleBookAndChapter,
  formatChapterRange,
  getChaptersForDate,
  checkIsDateLocked,
  isBibleBook,
} from '@/lib/bibleData';
import { getBibles } from '@/lib/bibleService';
import { getUserProfile, DEFAULT_USER_PROFILE, UserProfile } from '@/lib/userService';
import { useTheme } from '@/context/ThemeContext';
import { ActiveTab } from '@/components/Navbar';

interface HomeViewProps {
  onNavigateTab: (tab: ActiveTab, params?: any) => void;
  onOpenReader: (params: any) => void;
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

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateTab,
  onOpenReader,
  selectedDateStr,
  onDateChange,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDate = selectedDateStr || todayStr;
  const { theme } = useTheme();

  // Safe SSR and client hydration defaults
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [greeting, setGreeting] = useState<string>('A Paz do Senhor, Anderson');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [inProgressBooks, setInProgressBooks] = useState<Book[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Devotional Book state from library
  const [devotionalBook, setDevotionalBook] = useState<Book | null>(null);
  const [devProgressPct, setDevProgressPct] = useState<number>(0);
  const [isDevReadToday, setIsDevReadToday] = useState<boolean>(false);

  // Bible state from library & plan
  const [bibleBook, setBibleBook] = useState<Book | null>(null);
  const [officialBible, setOfficialBible] = useState<Bible | null>(null);
  const [useOfficialAlmeida, setUseOfficialAlmeida] = useState<boolean>(false);
  const [planConfig, setPlanConfig] = useState<BiblePlanConfig>({
    morningCount: 1,
    afternoonCount: 1,
    nightCount: 1,
  });
  const [planStartDate, setPlanStartDate] = useState<string>(todayStr);
  const [planStartChapter, setPlanStartChapter] = useState<number>(1);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus>({
    morning: false,
    afternoon: false,
    night: false,
  });

  // Profile and period status synchronization
  useEffect(() => {
    const p = getUserProfile();
    setUserProfile(p);

    const updateGreetingWithTime = (profileData: UserProfile) => {
      const hour = new Date().getHours();
      const timeGreeting =
        hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
      setGreeting(`${timeGreeting}, ${profileData.name || 'Anderson'}`);
    };

    updateGreetingWithTime(p);

    const handleProfileSync = () => {
      const updatedProfile = getUserProfile();
      setUserProfile(updatedProfile);
      updateGreetingWithTime(updatedProfile);
    };

    const handleStatusSync = () => {
      const savedStatus = localStorage.getItem(`altto_bible_status_${activeDate}`);
      if (savedStatus) {
        try {
          setPeriodStatus(JSON.parse(savedStatus));
        } catch {}
      }
    };

    const handleDevotionalSync = async () => {
      const allBooks = await getBooks();
      const savedDevId = localStorage.getItem('altto_devotional_book_id');
      let devTarget: Book | null = null;
      if (savedDevId) {
        devTarget = allBooks.find(b => b.id === savedDevId) || null;
      }
      if (!devTarget && allBooks.length > 0) {
        devTarget = allBooks[0];
      }
      setDevotionalBook(devTarget);
      if (devTarget) {
        const prog = await getReadingProgress(devTarget.id);
        setDevProgressPct(prog ? prog.percentage : devTarget.progressPercent || 0);
      }
    };

    window.addEventListener('altto_profile_updated', handleProfileSync);
    window.addEventListener('altto_bible_status_updated', handleStatusSync);
    window.addEventListener('altto_devotional_book_updated', handleDevotionalSync);
    return () => {
      window.removeEventListener('altto_profile_updated', handleProfileSync);
      window.removeEventListener('altto_bible_status_updated', handleStatusSync);
      window.removeEventListener('altto_devotional_book_updated', handleDevotionalSync);
    };
  }, [activeDate]);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      // Parallel execution of independent startup queries (Phase 2 - Eliminate startup delay)
      const [allBooks, progressMap, lastReadId, bibles] = await Promise.all([
        getBooks(),
        getAllReadingProgressMap(),
        getLastReadBookId(),
        getBibles(),
      ]);
      if (isCancelled) return;

      // Attach actual reading progress percentage
      const booksWithProgress = allBooks.map(b => ({
        ...b,
        progressPercent: progressMap[b.id] !== undefined ? progressMap[b.id] : (b.progressPercent || 0)
      }));

      // Find the currently active book that the user is actually reading
      let candidates = booksWithProgress.filter(b => b.status === 'in_progress' || b.totalPages || (progressMap[b.id] && progressMap[b.id] > 0));
      if (candidates.length === 0 && booksWithProgress.length > 0) {
        candidates = [...booksWithProgress];
      }

      if (lastReadId) {
        const activeBook = candidates.find(b => b.id === lastReadId) || booksWithProgress.find(b => b.id === lastReadId);
        if (activeBook) {
          const others = candidates.filter(b => b.id !== activeBook.id);
          candidates = [activeBook, ...others];
        }
      }
      setInProgressBooks(candidates);

      // 1. Devotional book from library (instant progress from progressMap)
      const savedDevId = localStorage.getItem('altto_devotional_book_id');
      let devTarget: Book | null = null;
      if (savedDevId) {
        devTarget = allBooks.find(b => b.id === savedDevId) || null;
      }
      if (!devTarget && allBooks.length > 0) {
        devTarget = allBooks[0];
      }
      setDevotionalBook(devTarget);
      if (devTarget) {
        const pct = progressMap[devTarget.id] !== undefined ? progressMap[devTarget.id] : (devTarget.progressPercent || 0);
        if (!isCancelled) {
          setDevProgressPct(pct);
        }
      }

      const completedDatesStr = localStorage.getItem('altto_devotional_completed_dates');
      if (completedDatesStr) {
        try {
          const arr: string[] = JSON.parse(completedDatesStr);
          if (!isCancelled) setIsDevReadToday(arr.includes(activeDate));
        } catch {}
      } else {
        if (!isCancelled) setIsDevReadToday(false);
      }

      // 2. Bible book from library
      if (!isCancelled && bibles.length > 0) {
        setOfficialBible(bibles[0]);
      }
      const isAlmeida = localStorage.getItem('altto_use_official_almeida') === 'true';
      const savedBibleBookId = localStorage.getItem('altto_selected_bible_book_id');
      const libraryBibleBooks = allBooks.filter(isBibleBook);

      if (isAlmeida) {
        setUseOfficialAlmeida(true);
        setBibleBook(null);
      } else if (savedBibleBookId) {
        const found = libraryBibleBooks.find(b => b.id === savedBibleBookId);
        if (found) {
          setBibleBook(found);
          setUseOfficialAlmeida(false);
        } else if (libraryBibleBooks.length > 0) {
          setBibleBook(libraryBibleBooks[0]);
          setUseOfficialAlmeida(false);
        } else {
          setUseOfficialAlmeida(true);
          setBibleBook(null);
        }
      } else if (libraryBibleBooks.length > 0) {
        setBibleBook(libraryBibleBooks[0]);
        setUseOfficialAlmeida(false);
      } else {
        setUseOfficialAlmeida(true);
        setBibleBook(null);
      }

      // 3. Bible plan config (Morning, Afternoon, Night chapters)
      const savedPlan = localStorage.getItem('altto_bible_plan_config');
      if (savedPlan) {
        try {
          setPlanConfig(JSON.parse(savedPlan));
        } catch {}
      }

      // 4. Plan start date & start chapter
      const savedStartDate = localStorage.getItem('altto_bible_plan_start_date');
      if (savedStartDate) {
        setPlanStartDate(savedStartDate);
      } else {
        localStorage.setItem('altto_bible_plan_start_date', todayStr);
        setPlanStartDate(todayStr);
      }

      const savedStartChapter = localStorage.getItem('altto_bible_plan_start_chapter');
      if (savedStartChapter) {
        const ch = parseInt(savedStartChapter, 10);
        if (!isNaN(ch) && ch >= 1 && ch <= 1189) {
          setPlanStartChapter(ch);
        }
      }

      // 5. Period status for active date
      const savedStatus = localStorage.getItem(`altto_bible_status_${activeDate}`);
      if (savedStatus) {
        try {
          setPeriodStatus(JSON.parse(savedStatus));
        } catch {}
      } else {
        setPeriodStatus({ morning: false, afternoon: false, night: false });
      }
    }

    loadData();

    const handleReadingSync = () => {
      if (!isCancelled) {
        loadData();
      }
    };
    window.addEventListener('altto_reading_updated', handleReadingSync);

    return () => {
      isCancelled = true;
      window.removeEventListener('altto_reading_updated', handleReadingSync);
    };
  }, [activeDate, todayStr]);

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
    afternoonStart,
    afternoonCount,
    nightStart,
    nightCount,
    totalDaily,
  } = chaptersPlan;

  const totalTodayChapters = totalDaily;
  const isDateLocked = checkIsDateLocked(activeDate, todayStr);

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

  // Sequential turn locks within active date
  const isMorningLocked = isDateLocked;
  const isAfternoonLocked = isDateLocked || !periodStatus.morning;
  const isNightLocked = isDateLocked || !periodStatus.afternoon;

  // Count finished periods today for progress stepper
  const completedPeriodsCount =
    (periodStatus.morning ? 1 : 0) +
    (periodStatus.afternoon ? 1 : 0) +
    (periodStatus.night ? 1 : 0);

  const handleTogglePeriod = (period: 'morning' | 'afternoon' | 'night', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isDateLocked) {
      showToast(`⚠️ Bloqueado: Conclua as leituras de hoje (${todayStr}) primeiro.`);
      return;
    }
    if (period === 'afternoon' && !periodStatus.morning) {
      showToast('⚠️ Bloqueado: Conclua a leitura da Manhã primeiro para liberar a Tarde.');
      return;
    }
    if (period === 'night' && !periodStatus.afternoon) {
      showToast('⚠️ Bloqueado: Conclua a leitura da Tarde primeiro para liberar a Noite.');
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
          showToast('✨ Manhã concluída! Turno da Tarde liberado para leitura.');
        } else if (period === 'afternoon') {
          showToast('✨ Tarde concluída! Turno da Noite liberado para leitura.');
        } else if (period === 'night') {
          showToast('🎉 Glória a Deus! Você concluiu todas as leituras bíblicas de hoje!');
        }
      }
      return updated;
    });
  };

  // Handler to open Bible period reader
  const handleOpenBiblePeriod = (
    startGlobal: number,
    count: number,
    period: 'morning' | 'afternoon' | 'night',
    periodLabel: string
  ) => {
    if (isDateLocked) {
      showToast(`⚠️ Bloqueado: Conclua as leituras de hoje (${todayStr}) primeiro.`);
      onNavigateTab('bible');
      return;
    }
    if (period === 'afternoon' && isAfternoonLocked) {
      showToast('⚠️ Bloqueado: Conclua a leitura da Manhã primeiro para liberar a Tarde.');
      return;
    }
    if (period === 'night' && isNightLocked) {
      showToast('⚠️ Bloqueado: Conclua a leitura da Tarde primeiro para liberar a Noite.');
      return;
    }

    const chapterInfo = getBibleBookAndChapter(startGlobal);

    if (useOfficialAlmeida || !bibleBook) {
      onOpenReader({
        contentType: 'bible',
        contentId: officialBible?.id || 'official-almeida',
        title: `Bíblia Sagrada — ${periodLabel}`,
        subtitle: formatChapterRange(startGlobal, count),
        bookName: chapterInfo.bookName,
        chapterNumber: chapterInfo.chapter,
        bibleBooks: officialBible?.books,
        period,
        isReadAlready: periodStatus[period],
      });
    } else {
      onOpenReader({
        contentType: 'book',
        contentId: bibleBook.id,
        title: `${bibleBook.title} — ${periodLabel}`,
        subtitle: formatChapterRange(startGlobal, count),
        bookData: bibleBook,
        period,
        isReadAlready: periodStatus[period],
      });
    }
  };

  const handleToggleTodayDevotional = () => {
    setIsDevReadToday(prev => {
      const next = !prev;
      const completedDatesStr = localStorage.getItem('altto_devotional_completed_dates');
      let completedDates: string[] = completedDatesStr ? JSON.parse(completedDatesStr) : [];
      if (next) {
        if (!completedDates.includes(activeDate)) {
          completedDates.push(activeDate);
        }
        showToast('✨ Leitura devocional marcada como concluída hoje!');
      } else {
        completedDates = completedDates.filter(d => d !== activeDate);
        showToast('Leitura devocional desmarcada.');
      }
      localStorage.setItem('altto_devotional_completed_dates', JSON.stringify(completedDates));
      window.dispatchEvent(new Event('altto_devotional_completed'));
      return next;
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dayOfWeek = WEEKDAYS[date.getDay()];
      const monthName = MONTHS[date.getMonth()];
      const formatted = `${dayOfWeek}, ${d} de ${monthName}`;
      return dateStr === todayStr ? `Hoje, ${formatted}` : formatted;
    } catch {
      return dateStr;
    }
  };

  const userInitial = (userProfile.name || 'A').charAt(0).toUpperCase();
  const dailyVerse = getDailyVerse(activeDate);

  return (
    <div
      id="home-view-container"
      className="max-w-xl sm:max-w-2xl md:max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 min-h-screen transition-colors duration-300"
      style={{ color: theme.colors.text }}
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className="p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] animate-in fade-in sticky top-16 z-20 backdrop-blur-md"
          style={{
            backgroundColor: `${theme.colors.surface}F2`,
            borderColor: theme.colors.accent,
            color: theme.colors.text,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.colors.accent}20` }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
            </div>
            <span className="leading-snug">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage('')}
            className="text-[11px] font-bold px-2 py-1 rounded-lg hover:opacity-80 cursor-pointer"
            style={{ color: theme.colors.accent }}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Hero Greeting & Floating Mobile Header Card */}
      <div
        className="p-4 sm:p-5 rounded-3xl border shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 transition-all"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Prominent User Profile Avatar - Large & High Visibility */}
            <div
              id="hero-profile-avatar"
              onClick={() => onNavigateTab('profile')}
              className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-lg shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 group ring-4 ring-violet-200/80 border-3 border-white"
              style={{
                backgroundColor: `${theme.colors.accent}15`,
              }}
              title="Toque para ver ou alterar foto do perfil"
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name || 'Foto do Perfil'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center font-bold text-3xl sm:text-4xl font-serif select-none"
                  style={{
                    backgroundColor: `${theme.colors.accent}18`,
                    color: theme.colors.accent,
                  }}
                >
                  <span>{userInitial}</span>
                  <span className="text-[9px] font-sans font-medium tracking-tight opacity-75 mt-0.5 hidden sm:block">Foto</span>
                </div>
              )}

              {/* Discrete camera/user badge indicator */}
              <div
                className="absolute bottom-1 right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white group-hover:scale-110 transition-transform"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: '#FFFFFF',
                }}
                title="Alterar foto"
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-sans">
                <span className="font-semibold tracking-wider uppercase text-[10px]" style={{ color: theme.colors.accent }}>
                  Jornada com Deus
                </span>
                {activeDate === todayStr && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-[11px] font-medium text-emerald-600">
                      Hoje
                    </span>
                  </>
                )}
              </div>
              <h1
                suppressHydrationWarning
                className="text-xl sm:text-2xl font-bold font-serif tracking-tight mt-0.5 leading-snug break-words"
                style={{ color: theme.colors.text }}
              >
                {greeting}
              </h1>
              <p className="text-xs truncate hidden sm:block mt-0.5" style={{ color: theme.colors.textMuted }}>
                Que a paz do Senhor guarde o seu coração na leitura de hoje
              </p>
            </div>
          </div>

          {/* Streak indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shadow-2xs shrink-0"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            <div
              className="w-5 h-5 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.colors.accent}15` }}
            >
              <Flame className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
            </div>
            <span className="text-[11px] font-semibold" style={{ color: theme.colors.accent }}>
              {userProfile.streakDays || 1} {userProfile.streakDays === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>

        {/* Date Navigator Bar */}
        <div
          className="flex items-center justify-between p-1.5 rounded-2xl border shadow-2xs"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <button
            id="btn-date-prev"
            type="button"
            onClick={() => handleNavigateDate(-1)}
            className="p-2 rounded-xl hover:opacity-75 transition-colors cursor-pointer active:scale-95"
            title="Dia anterior"
            style={{ color: theme.colors.text }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            suppressHydrationWarning
            className="flex items-center gap-2 px-3 text-xs sm:text-sm font-semibold capitalize select-none"
            style={{ color: theme.colors.text }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${theme.colors.accent}12` }}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
            </div>
            <span>{formatDateDisplay(activeDate)}</span>
          </div>

          <div className="flex items-center gap-1">
            {activeDate !== todayStr && (
              <button
                type="button"
                onClick={() => onDateChange && onDateChange(todayStr)}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.accentText,
                }}
              >
                Hoje
              </button>
            )}
            <button
              id="btn-date-next"
              type="button"
              onClick={() => handleNavigateDate(1)}
              className="p-2 rounded-xl hover:opacity-75 transition-colors cursor-pointer active:scale-95"
              title="Próximo dia"
              style={{ color: theme.colors.text }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Versículo Bíblico do Dia - Atualizado e Novo a Cada Dia */}
        <div
          id="home-daily-verse-banner"
          className="p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 transition-colors shadow-2xs"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <div
            className="w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: `${theme.colors.accent}12` }}
          >
            <Quote className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-sans" style={{ color: theme.colors.accent }}>
                Versículo de Hoje
              </span>
              <span className="text-[11px] font-medium font-serif" style={{ color: theme.colors.textMuted }}>
                {dailyVerse.reference}
              </span>
            </div>
            <p
              suppressHydrationWarning
              className="text-xs sm:text-[13px] italic leading-relaxed font-serif"
              style={{ color: theme.colors.text }}
            >
              &ldquo;{dailyVerse.text}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* PLANO BÍBLICO DIÁRIO - CARDS FLUTUANTES FLUIDOS E INTUITIVOS */}
      <div className="space-y-3.5" id="home-bible-plan-section">
        {/* Section Header with Daily Progress Stepper */}
        <div
          className="p-4 rounded-3xl border shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: `${theme.colors.accent}20`,
                  color: theme.colors.accent,
                }}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>
                  Plano Bíblico Diário
                </h2>
                <span className="text-[11px] font-medium" style={{ color: theme.colors.textMuted }}>
                  {totalTodayChapters} {totalTodayChapters === 1 ? 'capítulo' : 'capítulos'} hoje ({completedPeriodsCount}/3 concluídos)
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('bible')}
              className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer px-2.5 py-1.5 rounded-xl transition-all"
              style={{ color: theme.colors.accent }}
            >
              <span>Ver Bíblia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper progress indicator */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="space-y-1">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: periodStatus.morning ? '#10B981' : `${theme.colors.accent}30`,
                }}
              />
              <span className="text-[10px] font-semibold block text-center truncate" style={{ color: periodStatus.morning ? '#10B981' : theme.colors.textMuted }}>
                1. Manhã
              </span>
            </div>
            <div className="space-y-1">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: periodStatus.afternoon ? '#10B981' : `${theme.colors.accent}30`,
                }}
              />
              <span className="text-[10px] font-semibold block text-center truncate" style={{ color: periodStatus.afternoon ? '#10B981' : theme.colors.textMuted }}>
                2. Tarde
              </span>
            </div>
            <div className="space-y-1">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: periodStatus.night ? '#10B981' : `${theme.colors.accent}30`,
                }}
              />
              <span className="text-[10px] font-semibold block text-center truncate" style={{ color: periodStatus.night ? '#10B981' : theme.colors.textMuted }}>
                3. Noite
              </span>
            </div>
          </div>
        </div>

        {/* 3 Floating Period Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* CARD FLUTUANTE 1: MANHÃ */}
          <div
            id="period-card-morning"
            className="p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden group"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: periodStatus.morning ? '#10B981' : theme.colors.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: `${theme.colors.accent}18`, color: theme.colors.accent }}
                  >
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      Manhã
                    </h3>
                    <span className="text-[10px] font-medium" style={{ color: theme.colors.accent }}>Turno 1</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleTogglePeriod('morning', e)}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    periodStatus.morning
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                      : 'border-slate-300 dark:border-slate-700 text-slate-300 hover:text-slate-500 hover:border-slate-400'
                  }`}
                  title={periodStatus.morning ? 'Marcado como lido' : 'Marcar como concluído'}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              <div
                className="mt-3 p-3 rounded-2xl border"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                <span className="text-[9px] uppercase font-bold tracking-wider block" style={{ color: theme.colors.textMuted }}>
                  Passagem Bíblica:
                </span>
                <p className="text-base font-bold font-serif tracking-tight mt-0.5 truncate" style={{ color: theme.colors.text }}>
                  {formatChapterRange(morningStart, morningCount)}
                </p>
                <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                  {morningCount} {morningCount === 1 ? 'capítulo' : 'capítulos'}
                </span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.colors.border }}>
              <span
                className="text-[11px] font-bold flex items-center gap-1"
                style={{ color: periodStatus.morning ? '#10B981' : theme.colors.textMuted }}
              >
                {periodStatus.morning ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Concluído</span>
                  </>
                ) : (
                  <span>Pendente</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => handleOpenBiblePeriod(morningStart, morningCount, 'morning', 'Manhã')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.accentText,
                }}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{periodStatus.morning ? 'Relendo' : 'Ler Agora'}</span>
              </button>
            </div>
          </div>

          {/* CARD FLUTUANTE 2: TARDE */}
          <div
            id="period-card-afternoon"
            className={`p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden group ${
              isAfternoonLocked ? 'opacity-85' : ''
            }`}
            style={{
              backgroundColor: theme.colors.card,
              borderColor: periodStatus.afternoon ? '#10B981' : theme.colors.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs bg-orange-100 text-orange-700">
                    <Sunset className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      Tarde
                    </h3>
                    <span className="text-[10px] font-medium text-orange-700">Turno 2</span>
                  </div>
                </div>

                {isAfternoonLocked ? (
                  <div
                    className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center bg-slate-50"
                    title="Bloqueado: conclua a Manhã primeiro"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleTogglePeriod('afternoon', e)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      periodStatus.afternoon
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-300 hover:text-slate-500 hover:border-slate-400'
                    }`}
                    title={periodStatus.afternoon ? 'Marcado como lido' : 'Marcar como concluído'}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
              </div>

              <div className="mt-3 p-3 rounded-2xl bg-orange-50/50 border border-orange-100/60">
                <span className="text-[9px] uppercase font-bold tracking-wider text-orange-800/80 block">
                  Passagem Bíblica:
                </span>
                <p className="text-base font-bold font-serif tracking-tight mt-0.5 truncate" style={{ color: theme.colors.text }}>
                  {formatChapterRange(afternoonStart, afternoonCount)}
                </p>
                <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                  {afternoonCount} {afternoonCount === 1 ? 'capítulo' : 'capítulos'}
                </span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.colors.border }}>
              <span
                className="text-[11px] font-bold flex items-center gap-1"
                style={{ color: periodStatus.afternoon ? '#10B981' : theme.colors.textMuted }}
              >
                {periodStatus.afternoon ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Concluído</span>
                  </>
                ) : isAfternoonLocked ? (
                  <span className="text-slate-400">🔒 Bloqueado</span>
                ) : (
                  <span>Liberado</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => handleOpenBiblePeriod(afternoonStart, afternoonCount, 'afternoon', 'Tarde')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.accentText,
                }}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{periodStatus.afternoon ? 'Relendo' : 'Ler Agora'}</span>
              </button>
            </div>
          </div>

          {/* CARD FLUTUANTE 3: NOITE */}
          <div
            id="period-card-night"
            className={`p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden group ${
              isNightLocked ? 'opacity-85' : ''
            }`}
            style={{
              backgroundColor: theme.colors.card,
              borderColor: periodStatus.night ? '#10B981' : theme.colors.border,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs bg-indigo-100 text-indigo-700">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      Noite
                    </h3>
                    <span className="text-[10px] font-medium text-indigo-600">Turno 3</span>
                  </div>
                </div>

                {isNightLocked ? (
                  <div
                    className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center bg-slate-50"
                    title="Bloqueado: conclua a Tarde primeiro"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleTogglePeriod('night', e)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      periodStatus.night
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-300 hover:text-slate-500 hover:border-slate-400'
                    }`}
                    title={periodStatus.night ? 'Marcado como lido' : 'Marcar como concluído'}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                )}
              </div>

              <div className="mt-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/60">
                <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-800/80 block">
                  Passagem Bíblica:
                </span>
                <p className="text-base font-bold font-serif tracking-tight mt-0.5 truncate" style={{ color: theme.colors.text }}>
                  {formatChapterRange(nightStart, nightCount)}
                </p>
                <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                  {nightCount} {nightCount === 1 ? 'capítulo' : 'capítulos'}
                </span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: theme.colors.border }}>
              <span
                className="text-[11px] font-bold flex items-center gap-1"
                style={{ color: periodStatus.night ? '#10B981' : theme.colors.textMuted }}
              >
                {periodStatus.night ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Concluído</span>
                  </>
                ) : isNightLocked ? (
                  <span className="text-slate-400">🔒 Bloqueado</span>
                ) : (
                  <span>Liberado</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => handleOpenBiblePeriod(nightStart, nightCount, 'night', 'Noite')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.accentText,
                }}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{periodStatus.night ? 'Relendo' : 'Ler Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO CONTINUAR LENDO - CARDS FLUTUANTES MOBILE-FIRST */}
      <div className="space-y-3.5" id="home-continue-reading-section">
        {/* Header da Seção */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: `${theme.colors.accent}20`,
                color: theme.colors.accent,
              }}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>
                Continuar Lendo
              </h2>
              <span className="text-[11px] font-medium" style={{ color: theme.colors.textMuted }}>
                {inProgressBooks.length > 0
                  ? `${inProgressBooks.length} ${inProgressBooks.length === 1 ? 'livro em andamento' : 'livros na sua estante'}`
                  : 'Sua estante cristã'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('library')}
            className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer px-2 py-1 rounded-xl transition-all"
            style={{ color: theme.colors.accent }}
          >
            <span>Ver Biblioteca</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {inProgressBooks.length > 0 ? (
          <div className="space-y-3.5">
            {/* CARD FLUTUANTE PRINCIPAL EM DESTAQUE ("LENDO AGORA") */}
            {inProgressBooks[0] && (
              <div
                id="floating-continue-reading-card"
                onClick={() => {
                  recordActiveReading(inProgressBooks[0].id);
                  onOpenReader({
                    contentType: 'book',
                    contentId: inProgressBooks[0].id,
                    title: inProgressBooks[0].title,
                    subtitle: inProgressBooks[0].author,
                    bookData: inProgressBooks[0],
                  });
                }}
                className="p-4 sm:p-5 rounded-3xl border transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start cursor-pointer group active:scale-[0.99] relative overflow-hidden"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                {/* Capa em Proporção 3:4 com Elevação Flutuante */}
                <div
                  className="w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 border shadow-[0_4px_14px_rgba(0,0,0,0.08)] relative group-hover:scale-[1.03] transition-transform duration-200"
                  style={{
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  }}
                >
                  {inProgressBooks[0].coverUrl ? (
                    <img
                      src={inProgressBooks[0].coverUrl}
                      alt={inProgressBooks[0].title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-2 text-center"
                      style={{ backgroundColor: `${theme.colors.accent}12` }}
                    >
                      <BookOpen className="w-7 h-7 mb-1" style={{ color: `${theme.colors.accent}90` }} />
                      <span className="text-[9px] font-bold line-clamp-2" style={{ color: theme.colors.text }}>
                        {inProgressBooks[0].title}
                      </span>
                    </div>
                  )}
                  {inProgressBooks[0].format && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-black/65 text-white font-mono text-[8px] font-bold tracking-wider backdrop-blur-xs">
                      {inProgressBooks[0].format.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Conteúdo do Card Flutuante */}
                <div className="flex-1 w-full flex flex-col justify-between space-y-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-sans">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.colors.accent }} />
                      <span
                        className="font-semibold uppercase tracking-wider text-[10px]"
                        style={{ color: theme.colors.accent }}
                      >
                        Lendo Agora
                      </span>
                    </div>

                    <h3
                      className="text-base sm:text-lg font-bold font-serif line-clamp-1 leading-snug group-hover:opacity-80 transition-opacity"
                      style={{ color: theme.colors.text }}
                    >
                      {inProgressBooks[0].title}
                    </h3>
                    <p className="text-xs truncate font-medium mt-0.5" style={{ color: theme.colors.textMuted }}>
                      {inProgressBooks[0].author || 'Autor da Biblioteca'}
                    </p>
                  </div>

                  {/* Barra de Progresso Real com Estilo Refinado */}
                  <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-[11px] font-semibold" style={{ color: theme.colors.textMuted }}>
                      <span>Progresso da Leitura</span>
                      <span className="font-bold text-xs" style={{ color: theme.colors.text }}>
                        {inProgressBooks[0].progressPercent || 0}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200/70 p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${inProgressBooks[0].progressPercent || 0}%`,
                          backgroundColor: theme.colors.accent,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px]" style={{ color: theme.colors.textMuted }}>
                      <span>
                        {inProgressBooks[0].totalPages
                          ? `${inProgressBooks[0].totalPages} páginas`
                          : 'Leitura contínua'}
                      </span>
                      <span className="font-semibold" style={{ color: theme.colors.accent }}>Toque no card para abrir</span>
                    </div>
                  </div>

                  {/* Botão de Ação Flutuante Mobile-First (Toque Amplo >= 44px) */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        recordActiveReading(inProgressBooks[0].id);
                        onOpenReader({
                          contentType: 'book',
                          contentId: inProgressBooks[0].id,
                          title: inProgressBooks[0].title,
                          subtitle: inProgressBooks[0].author,
                          bookData: inProgressBooks[0],
                        });
                      }}
                      className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all active:scale-95 cursor-pointer hover:opacity-90"
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.colors.accentText,
                      }}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Continuar Leitura</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CARROSSEL HORIZONTAL DE CARDS FLUTUANTES (OUTROS LIVROS NA FILA) */}
            {inProgressBooks.length > 1 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider block px-1" style={{ color: theme.colors.textMuted }}>
                  Outros Livros na sua Fila ({inProgressBooks.length - 1}):
                </span>

                <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory touch-pan-x -mx-1 px-1">
                  {inProgressBooks.slice(1).map((book) => (
                    <div
                      key={book.id}
                      onClick={() => {
                        recordActiveReading(book.id);
                        onOpenReader({
                          contentType: 'book',
                          contentId: book.id,
                          title: book.title,
                          subtitle: book.author,
                          bookData: book,
                        });
                      }}
                      className="w-38 sm:w-44 shrink-0 snap-start p-3 rounded-3xl border transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <div>
                        <div
                          className="w-full aspect-[3/4] rounded-2xl overflow-hidden border shadow-xs mb-2.5 relative group-hover:scale-[1.02] transition-transform"
                          style={{
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          }}
                        >
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center p-2 text-center"
                              style={{ backgroundColor: `${theme.colors.accent}12` }}
                            >
                              <BookOpen className="w-6 h-6 mb-1 text-slate-400" />
                              <span className="text-[9px] font-bold line-clamp-2" style={{ color: theme.colors.text }}>
                                {book.title}
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-white font-mono text-[7px] font-bold backdrop-blur-xs">
                            {book.format.toUpperCase()}
                          </div>
                        </div>

                        <h4 className="text-xs font-bold line-clamp-1 font-serif group-hover:opacity-80 transition-opacity" style={{ color: theme.colors.text }}>
                          {book.title}
                        </h4>
                        <p className="text-[10px] truncate mt-0.5" style={{ color: theme.colors.textMuted }}>
                          {book.author || 'Autor não informado'}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-semibold" style={{ borderColor: theme.colors.border }}>
                        <span style={{ color: theme.colors.accent }}>{book.progressPercent || 0}% lido</span>
                        <span className="flex items-center gap-0.5 font-bold" style={{ color: theme.colors.accent }}>
                          <span>Ler</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Card Flutuante de Atalho para Biblioteca */}
                  <div
                    onClick={() => onNavigateTab('library')}
                    className="w-32 sm:w-36 shrink-0 snap-start p-4 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:opacity-90 transition-all active:scale-95 group"
                    style={{
                      borderColor: `${theme.colors.accent}60`,
                      backgroundColor: `${theme.colors.surface}80`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 shadow-2xs group-hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: `${theme.colors.accent}20`,
                        color: theme.colors.accent,
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-serif" style={{ color: theme.colors.text }}>
                      Novo Livro
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Abrir Biblioteca</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State com Card Flutuante Elegante */
          <div
            className="p-6 rounded-3xl border text-center space-y-3.5 transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-xs"
              style={{
                backgroundColor: `${theme.colors.accent}20`,
                color: theme.colors.accent,
              }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif" style={{ color: theme.colors.text }}>
                Nenhum livro em andamento no momento
              </h3>
              <p className="text-xs mt-1 max-w-sm mx-auto leading-relaxed" style={{ color: theme.colors.textMuted }}>
                Explore sua biblioteca cristã para iniciar a leitura de novos livros, devocionais ou estudos bíblicos em EPUB ou PDF.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('library')}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer hover:opacity-90 active:scale-95 inline-flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.accent,
                color: theme.colors.accentText,
              }}
            >
              <Library className="w-4 h-4" />
              <span>Explorar Biblioteca Cristã</span>
            </button>
          </div>
        )}
      </div>

      {/* DEVOCIONAL DIÁRIO ESCOLHIDO - CARD FLUTUANTE */}
      <div
        id="home-devotional-chosen-card"
        className="p-4 sm:p-5 rounded-3xl border transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-3.5 relative overflow-hidden"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }}
      >
        <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: theme.colors.border }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shadow-2xs"
              style={{
                backgroundColor: `${theme.colors.accent}20`,
                color: theme.colors.accent,
              }}
            >
              <BookMarked className="w-3.5 h-3.5" />
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${theme.colors.accent}15`,
                color: theme.colors.accent,
              }}
            >
              Devocional Diário Escolhido
            </span>

            {isDevReadToday ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Lido Hoje
              </span>
            ) : (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                  borderColor: `${theme.colors.accent}30`,
                }}
              >
                Pendente Hoje
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('devotional')}
            className="text-[11px] font-bold hover:underline cursor-pointer flex items-center gap-1"
            style={{ color: theme.colors.accent }}
          >
            <span>Trocar Livro</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Capa do Livro Devocional (Proporção 3:4) */}
          <div
            onClick={() => {
              if (devotionalBook) {
                onOpenReader({
                  contentType: 'book',
                  contentId: devotionalBook.id,
                  title: devotionalBook.title,
                  subtitle: devotionalBook.author,
                  bookData: devotionalBook,
                });
              } else {
                onNavigateTab('devotional');
              }
            }}
            className="w-20 sm:w-24 aspect-[3/4] rounded-2xl overflow-hidden border shadow-[0_4px_12px_rgba(0,0,0,0.06)] shrink-0 cursor-pointer group hover:scale-[1.03] transition-transform relative"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            {devotionalBook?.coverUrl ? (
              <img
                src={devotionalBook.coverUrl}
                alt={devotionalBook.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-2 text-center"
                style={{ backgroundColor: `${theme.colors.accent}15` }}
              >
                <BookMarked className="w-6 h-6 mb-1" style={{ color: theme.colors.accent }} />
                <span className="text-[9px] font-bold font-serif line-clamp-2" style={{ color: theme.colors.text }}>
                  {devotionalBook?.title || 'Devocional'}
                </span>
              </div>
            )}
            {devotionalBook?.format && (
              <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/60 text-white font-mono text-[7px] font-bold">
                {devotionalBook.format.toUpperCase()}
              </div>
            )}
          </div>

          {/* Detalhes do Livro Devocional */}
          <div className="flex-1 w-full space-y-2.5 text-center sm:text-left min-w-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-serif tracking-tight line-clamp-1 leading-snug" style={{ color: theme.colors.text }}>
                {devotionalBook ? devotionalBook.title : '365 Dias com Deus — Jornada Diária'}
              </h3>
              <p className="text-xs truncate font-medium mt-0.5" style={{ color: theme.colors.textMuted }}>
                {devotionalBook?.author || 'Livro da sua Biblioteca Cristã'}
              </p>
            </div>

            {/* Barra de Progresso Real do Livro Devocional */}
            <div className="space-y-1.5 w-full max-w-md">
              <div className="flex justify-between text-[11px] font-semibold" style={{ color: theme.colors.textMuted }}>
                <span>Progresso Devocional</span>
                <span className="font-bold text-xs" style={{ color: theme.colors.text }}>
                  {devProgressPct}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200/70 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${devProgressPct}%`,
                    backgroundColor: theme.colors.accent,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                {devotionalBook?.totalPages ? `${devotionalBook.totalPages} páginas no total` : 'Leitura contínua'}
              </span>
            </div>

            {/* Botões de Ação Táteis Mobile-First (>= 44px) */}
            <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => {
                  if (devotionalBook) {
                    onOpenReader({
                      contentType: 'book',
                      contentId: devotionalBook.id,
                      title: devotionalBook.title,
                      subtitle: devotionalBook.author,
                      bookData: devotionalBook,
                    });
                  } else {
                    onNavigateTab('devotional');
                  }
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.accentText,
                }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Continuar Devocional</span>
              </button>

              <button
                type="button"
                onClick={handleToggleTodayDevotional}
                className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isDevReadToday
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isDevReadToday ? '#10B981' : theme.colors.surface,
                  borderColor: isDevReadToday ? '#10B981' : theme.colors.border,
                  color: isDevReadToday ? '#FFFFFF' : theme.colors.text,
                }}
              >
                {isDevReadToday ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4 opacity-50" />}
                <span>{isDevReadToday ? 'Concluído' : 'Marcar Lido Hoje'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
