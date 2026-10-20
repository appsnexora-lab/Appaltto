'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookMarked,
  BookOpen,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Edit3,
  Target,
  ArrowRight,
  Library,
  Trash2,
  Check,
  Search,
} from 'lucide-react';
import { Book } from '@/types';
import { getBooks } from '@/lib/bookService';
import { dbPut } from '@/lib/indexedDB';
import { getReadingProgress } from '@/lib/readerService';
import { useTheme } from '@/context/ThemeContext';

interface DevotionalViewProps {
  onOpenReader: (params: {
    contentType: 'book' | 'devotional';
    contentId: string;
    title: string;
    subtitle?: string;
    bookData?: Book;
    initialChapterOrDay?: number;
    devotionalDays?: any[];
  }) => void;
  selectedDateStr?: string;
  onDateChange?: (date: string) => void;
}

interface DevotionalReflectionItem {
  id: string;
  date: string;
  bookId: string;
  bookTitle: string;
  text: string;
  createdAt: string;
}

export const DevotionalView: React.FC<DevotionalViewProps> = ({
  onOpenReader,
  selectedDateStr,
  onDateChange,
}) => {
  const { theme } = useTheme();
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDate = selectedDateStr || todayStr;

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Completed dates for daily habit tracking
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [showBookPickerModal, setShowBookPickerModal] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [reflectionText, setReflectionText] = useState<string>('');
  const [reflections, setReflections] = useState<DevotionalReflectionItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load books & preferences
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const allBooks = await getBooks();
        if (isCancelled) return;
        setBooks(allBooks);

        // Load saved devotional book id from localStorage
        const savedBookId = localStorage.getItem('altto_devotional_book_id');
        let currentBook: Book | null = null;
        if (savedBookId) {
          currentBook = allBooks.find(b => b.id === savedBookId) || null;
        }

        // If no book saved yet, check if there's any book in library (or default to first book)
        if (!currentBook && allBooks.length > 0) {
          currentBook = allBooks[0];
          localStorage.setItem('altto_devotional_book_id', currentBook.id);
        }

        if (isCancelled) return;

        setSelectedBook(currentBook);
        setSelectedBookId(currentBook ? currentBook.id : null);

        if (currentBook) {
          const prog = await getReadingProgress(currentBook.id);
          if (!isCancelled) {
            setProgressPct(prog ? prog.percentage : (currentBook.progressPercent || 0));
          }
        }

        // Load completed dates
        const savedCompleted = localStorage.getItem('altto_devotional_completed_dates');
        if (savedCompleted) {
          try {
            if (!isCancelled) setCompletedDates(JSON.parse(savedCompleted));
          } catch {
            if (!isCancelled) setCompletedDates([]);
          }
        }

        // Load reflections
        const savedReflections = localStorage.getItem('altto_devotional_reflections');
        if (savedReflections) {
          try {
            const list: DevotionalReflectionItem[] = JSON.parse(savedReflections);
            if (!isCancelled) {
              setReflections(list);
              const todayRef = list.find(r => r.date === activeDate);
              setReflectionText(todayRef ? todayRef.text : '');
            }
          } catch {
            if (!isCancelled) setReflections([]);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do devocional:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeDate, refreshTrigger]);

  // Select a book from library
  const handleSelectBook = async (book: Book) => {
    setSelectedBook(book);
    setSelectedBookId(book.id);
    localStorage.setItem('altto_devotional_book_id', book.id);
    window.dispatchEvent(new Event('altto_devotional_book_updated'));
    setShowBookPickerModal(false);
    const prog = await getReadingProgress(book.id);
    setProgressPct(prog ? prog.percentage : (book.progressPercent || 0));
    setToastMessage(`📖 "${book.title}" definido como seu livro devocional diário!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Toggle today reading completion
  const handleToggleTodayCompleted = () => {
    const isCompleted = completedDates.includes(activeDate);
    let updated: string[];
    if (isCompleted) {
      updated = completedDates.filter(d => d !== activeDate);
    } else {
      updated = [...completedDates, activeDate];
    }
    setCompletedDates(updated);
    localStorage.setItem('altto_devotional_completed_dates', JSON.stringify(updated));

    if (!isCompleted) {
      setToastMessage('✨ Leitura devocional de hoje concluída! Parabéns pela disciplina espiritual.');
    } else {
      setToastMessage('Leitura marcada como pendente.');
    }
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Save Reflection
  const handleSaveReflection = () => {
    if (!reflectionText.trim()) return;

    const existingIdx = reflections.findIndex(r => r.date === activeDate);
    let updated: DevotionalReflectionItem[];
    const item: DevotionalReflectionItem = {
      id: `ref-${activeDate}-${Date.now()}`,
      date: activeDate,
      bookId: selectedBook?.id || 'devotional',
      bookTitle: selectedBook?.title || 'Livro Devocional',
      text: reflectionText.trim(),
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updated = [...reflections];
      updated[existingIdx] = item;
    } else {
      updated = [item, ...reflections];
    }

    setReflections(updated);
    localStorage.setItem('altto_devotional_reflections', JSON.stringify(updated));

    // Also mark as read for today
    if (!completedDates.includes(activeDate)) {
      const newDates = [...completedDates, activeDate];
      setCompletedDates(newDates);
      localStorage.setItem('altto_devotional_completed_dates', JSON.stringify(newDates));
    }

    setToastMessage('✨ Reflexão salva com sucesso!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Quick Seed Classic Literature if library empty
  const handleAddClassicDevotional = async (preset: 'imitacao' | 'peregrino') => {
    const bookId = `classic-${preset}-${Date.now()}`;
    let book: Book;
    if (preset === 'imitacao') {
      book = {
        id: bookId,
        title: 'A Imitação de Cristo',
        author: 'Tomás de Kempis',
        description: 'Um dos maiores clássicos de devoção e disciplina espiritual de todos os tempos.',
        format: 'txt',
        totalPages: 180,
        totalChapters: 4,
        textContent:
          'Aquele que me segue não andará em trevas, diz o Senhor. Com estas palavras Cristo nos exorta a imitar Sua vida e Seus costumes, se queremos ser verdadeiramente iluminados e livres de toda cegueira do coração. Seja, pois, nosso principal estudo meditar sobre a vida de Jesus Cristo.',
        status: 'in_progress',
        isFavorite: true,
        addedAt: new Date().toISOString(),
      };
    } else {
      book = {
        id: bookId,
        title: 'O Peregrino',
        author: 'John Bunyan',
        description: 'A célebre alegoria cristã de Cristão em sua jornada desde a Cidade da Destruição até a Cidade Celestial.',
        format: 'txt',
        totalPages: 240,
        totalChapters: 10,
        textContent:
          'Caminhando pelo deserto deste mundo, cheguei a um lugar onde havia uma caverna; ali me deitei para dormir e, enquanto dormia, tive um sonho. Vi um homem vestido de farrapos, de pé em certo lugar, com as costas voltadas para a sua própria casa, um fardo pesado sobre os ombros e um livro nas mãos.',
        status: 'in_progress',
        isFavorite: true,
        addedAt: new Date().toISOString(),
      };
    }
    await dbPut('books', book);
    await handleSelectBook(book);
    setRefreshTrigger(n => n + 1);
  };

  // Calculate reading streak
  const calculateStreak = (): number => {
    let streak = 0;
    const checkDate = new Date();
    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (completedDates.includes(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is not completed yet, check if yesterday was completed
        if (streak === 0 && dStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          if (completedDates.includes(yesterdayStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const isReadToday = completedDates.includes(activeDate);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Carregando seu livro devocional...</span>
      </div>
    );
  }

  return (
    <div
      id="devotional-view-container"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 min-h-screen transition-colors duration-300"
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
            <BookMarked className="w-4 h-4" />
            Devocional Diário
          </span>
          <h1 className="text-2xl font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>
            Meu Momento com Deus
          </h1>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
            Leia seu livro devocional escolhido da biblioteca todos os dias e registre suas reflexões espirituais.
          </p>
        </div>
        <button
          onClick={() => setShowBookPickerModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-2xs transition-all cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        >
          <Library className="w-4 h-4" style={{ color: theme.colors.accent }} />
          <span>{selectedBook ? 'Trocar Livro Devocional' : 'Escolher Livro'}</span>
        </button>
      </div>

      {/* Hero: Meu Livro Devocional Selecionado */}
      {selectedBook ? (
        <div
          className="border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 transition-colors"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <div
            className="flex items-center justify-between text-xs font-bold border-b pb-3"
            style={{ borderColor: theme.colors.border }}
          >
            <span
              className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]"
              style={{ color: theme.colors.accent }}
            >
              <Sparkles className="w-4 h-4" />
              Livro Devocional Selecionado da Biblioteca
            </span>
            <span
              className="px-2 py-0.5 rounded-full font-mono text-[10px] border"
              style={{
                backgroundColor: `${theme.colors.accent}15`,
                color: theme.colors.accent,
                borderColor: `${theme.colors.accent}30`,
              }}
            >
              {selectedBook.format.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Capa do Livro (Proporção 3:4) */}
            <div
              onClick={() =>
                onOpenReader({
                  contentType: 'book',
                  contentId: selectedBook.id,
                  title: selectedBook.title,
                  subtitle: selectedBook.author,
                  bookData: selectedBook,
                })
              }
              className="w-28 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md shrink-0 cursor-pointer group hover:scale-[1.02] transition-transform"
            >
              {selectedBook.coverUrl ? (
                <img
                  src={selectedBook.coverUrl}
                  alt={selectedBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-100 text-slate-400">
                  <BookOpen className="w-8 h-8 mb-1 text-slate-400" />
                  <span className="text-[10px] font-serif font-bold text-slate-700 line-clamp-2">
                    {selectedBook.title}
                  </span>
                </div>
              )}
            </div>

            {/* Detalhes do Livro e Ação */}
            <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif text-slate-900 leading-snug">
                  {selectedBook.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedBook.author || 'Autor não informado'}
                </p>
                {selectedBook.description && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {selectedBook.description}
                  </p>
                )}
              </div>

              {/* Barra de Progresso Real */}
              <div className="space-y-1 max-w-md">
                <div className="flex justify-between text-[11px] font-semibold" style={{ color: theme.colors.textMuted }}>
                  <span>Progresso Geral de Leitura</span>
                  <span className="font-bold" style={{ color: theme.colors.text }}>{progressPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%`, backgroundColor: theme.colors.accent }}
                  />
                </div>
                <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                  {selectedBook.totalPages ? `${selectedBook.totalPages} páginas no total` : 'Leitura contínua'}
                </span>
              </div>

              {/* Botões de Ação */}
              <div className="pt-1 flex flex-wrap gap-2.5 items-center justify-center sm:justify-start">
                <button
                  id="btn-open-devotional-book"
                  onClick={() =>
                    onOpenReader({
                      contentType: 'book',
                      contentId: selectedBook.id,
                      title: selectedBook.title,
                      subtitle: selectedBook.author,
                      bookData: selectedBook,
                    })
                  }
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-opacity shadow-xs flex items-center gap-2 cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: theme.colors.accent }}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Continuar Leitura Devocional de Hoje</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowBookPickerModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold border transition-colors cursor-pointer"
                  style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                >
                  Trocar Livro
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Nenhum livro devocional selecionado */
        <div
          className="p-8 rounded-2xl bg-white border text-center space-y-4 shadow-2xs"
          style={{ borderColor: theme.colors.border }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-2xs"
            style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
          >
            <BookMarked className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: theme.colors.text }}>Nenhum livro devocional definido</h3>
            <p className="text-xs mt-1 max-w-md mx-auto leading-relaxed" style={{ color: theme.colors.textMuted }}>
              Escolha um livro da sua biblioteca (ou adicione um clássico devocional) para acompanhar sua leitura espiritual todos os dias.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setShowBookPickerModal(true)}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-opacity shadow-xs cursor-pointer hover:opacity-90"
              style={{ backgroundColor: theme.colors.accent }}
            >
              Escolher Livro da Biblioteca
            </button>
            <button
              onClick={() => handleAddClassicDevotional('imitacao')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 font-semibold text-xs border transition-colors cursor-pointer"
              style={{ borderColor: theme.colors.border, color: theme.colors.text }}
            >
              + Adicionar Imitação de Cristo
            </button>
          </div>
        </div>
      )}

      {/* Seção: Todos os Livros da Biblioteca para Escolha do Devocional Diário */}
      <div
        id="devotional-library-books-section"
        className="p-4 sm:p-6 rounded-2xl border shadow-xs space-y-4 transition-colors"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3"
          style={{ borderColor: theme.colors.border }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${theme.colors.accent}15`,
                  color: theme.colors.accent,
                }}
              >
                Biblioteca Devocional
              </span>
              <span className="text-[10px] font-semibold" style={{ color: theme.colors.textMuted }}>
                {books.length} {books.length === 1 ? 'livro na biblioteca' : 'livros na biblioteca'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold font-serif tracking-tight mt-1" style={{ color: theme.colors.text }}>
              Escolha seu Livro Devocional Diário
            </h2>
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>
              Toque em qualquer livro para defini-lo como o seu livro devocional. Sua capa aparecerá em destaque no menu inicial.
            </p>
          </div>

          {books.length > 3 && (
            <div className="relative w-full sm:w-56 shrink-0">
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Buscar livro..."
                className="w-full text-xs px-3 py-1.5 pl-8 rounded-xl border focus:outline-none transition-colors"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" style={{ color: theme.colors.textMuted }} />
            </div>
          )}
        </div>

        {/* Lista/Grade de Livros */}
        {books.length === 0 ? (
          <div className="p-6 text-center text-slate-500 space-y-3">
            <p className="text-xs">Sua biblioteca ainda não tem livros cadastrados.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleAddClassicDevotional('imitacao')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.accentText,
                }}
              >
                + Adicionar Imitação de Cristo
              </button>
              <button
                onClick={() => handleAddClassicDevotional('peregrino')}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
              >
                + Adicionar O Peregrino
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {books
              .filter(b => {
                if (!searchFilter.trim()) return true;
                const q = searchFilter.toLowerCase();
                return (
                  b.title.toLowerCase().includes(q) ||
                  (b.author && b.author.toLowerCase().includes(q))
                );
              })
              .map(b => {
                const isCurrent = selectedBook?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBook(b)}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group active:scale-[0.99] ${
                      isCurrent
                        ? 'ring-2 ring-violet-500 shadow-xs'
                        : 'hover:shadow-sm hover:border-violet-300'
                    }`}
                    style={{
                      backgroundColor: isCurrent ? `${theme.colors.accent}12` : theme.colors.surface,
                      borderColor: isCurrent ? theme.colors.accent : theme.colors.border,
                    }}
                  >
                    <div className="flex gap-3 items-start">
                      {/* Capa do Livro (Proporção 3:4) */}
                      <div
                        className="w-16 sm:w-18 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border shadow-2xs relative group-hover:scale-[1.03] transition-transform"
                        style={{
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        }}
                      >
                        {b.coverUrl ? (
                          <img
                            src={b.coverUrl}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-slate-50">
                            <BookOpen className="w-5 h-5 text-slate-400 mb-0.5" />
                            <span className="text-[8px] font-bold line-clamp-2 text-slate-700">
                              {b.title}
                            </span>
                          </div>
                        )}
                        {isCurrent && (
                          <div
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-xs"
                            style={{
                              backgroundColor: theme.colors.accent,
                              color: theme.colors.accentText,
                            }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span
                            className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${theme.colors.accent}20`,
                              color: theme.colors.accent,
                            }}
                          >
                            {b.format.toUpperCase()}
                          </span>
                          {isCurrent && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: theme.colors.accent,
                                color: theme.colors.accentText,
                              }}
                            >
                              Devocional Ativo
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm font-serif line-clamp-2 leading-snug" style={{ color: theme.colors.text }}>
                          {b.title}
                        </h3>
                        <p className="text-[11px] truncate mt-0.5 font-medium" style={{ color: theme.colors.textMuted }}>
                          {b.author || 'Autor não informado'}
                        </p>
                        {b.totalPages && (
                          <p className="text-[10px] mt-1 text-slate-400">
                            {b.totalPages} páginas
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div
                      className="mt-3 pt-2.5 border-t flex items-center justify-between"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: isCurrent ? theme.colors.accent : theme.colors.textMuted }}
                      >
                        {isCurrent ? '✓ Seu Devocional Diário' : 'Toque para escolher'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBook(b);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'shadow-xs'
                            : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: isCurrent ? theme.colors.accent : `${theme.colors.accent}20`,
                          color: isCurrent ? theme.colors.accentText : theme.colors.accent,
                        }}
                      >
                        {isCurrent ? 'Selecionado' : 'Escolher'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Tracker de Leitura Diária & Hábitos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card: Leitura de Hoje */}
        <div
          className="p-4 rounded-2xl border shadow-2xs flex flex-col justify-between space-y-2 transition-colors"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: theme.colors.textMuted }}>
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: theme.colors.text }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
              Leitura de Hoje
            </span>
            <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>{activeDate}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span
              className="text-xs font-bold"
              style={{ color: isReadToday ? '#10B981' : theme.colors.accent }}
            >
              {isReadToday ? '✓ Concluída hoje' : 'Pendente para hoje'}
            </span>
            <button
              id="btn-toggle-devotional-today"
              onClick={handleToggleTodayCompleted}
              className="p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: isReadToday ? 'rgba(16, 185, 129, 0.15)' : theme.colors.surface,
                borderColor: isReadToday ? 'rgba(16, 185, 129, 0.4)' : theme.colors.border,
                color: isReadToday ? '#10B981' : theme.colors.text,
              }}
            >
              {isReadToday ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Check className="w-4 h-4 opacity-40" />}
              <span>{isReadToday ? 'Concluído' : 'Marcar lido'}</span>
            </button>
          </div>
        </div>

        {/* Card: Sequência de Dias (Streak) */}
        <div
          className="p-4 rounded-2xl border shadow-2xs flex flex-col justify-between space-y-2 transition-colors"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: theme.colors.textMuted }}>
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: theme.colors.text }}>
              <Flame className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
              Constância Diária
            </span>
            <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Hábito</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xl font-bold font-serif" style={{ color: theme.colors.text }}>{streak}</span>
            <span className="text-xs leading-tight" style={{ color: theme.colors.textMuted }}>
              {streak === 1 ? 'dia consecutivo lendo' : 'dias consecutivos lendo'}
            </span>
          </div>
        </div>

        {/* Card: Meta Diária Sugerida */}
        <div
          className="p-4 rounded-2xl border shadow-2xs flex flex-col justify-between space-y-2 transition-colors"
          style={{
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: theme.colors.textMuted }}>
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: theme.colors.text }}>
              <Target className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
              Ritmo de Leitura
            </span>
            <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>Meta</span>
          </div>
          <p className="text-xs font-medium leading-tight pt-1" style={{ color: theme.colors.textMuted }}>
            Recomendado: <strong style={{ color: theme.colors.text }}>1 capítulo ou 5 a 10 páginas</strong> por dia no seu devocional.
          </p>
        </div>
      </div>

      {/* Diário de Reflexão & Oração */}
      <div
        className="border rounded-2xl p-5 shadow-2xs space-y-3 transition-colors"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <div
          className="flex items-center justify-between border-b pb-2.5"
          style={{ borderColor: theme.colors.border }}
        >
          <h3 className="font-bold text-sm font-serif flex items-center gap-2" style={{ color: theme.colors.text }}>
            <Edit3 className="w-4 h-4" style={{ color: theme.colors.accent }} />
            <span>Reflexão & Oração do Dia</span>
          </h3>
          <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>{activeDate}</span>
        </div>
        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
          O que Deus ministrou ao seu coração através da leitura do livro devocional hoje?
        </p>
        <textarea
          id="input-devotional-reflection"
          rows={3}
          value={reflectionText}
          onChange={e => setReflectionText(e.target.value)}
          placeholder="Escreva aqui seus aprendizados, orações ou versículos marcantes..."
          className="w-full border rounded-xl p-3 text-xs focus:outline-none leading-relaxed resize-y transition-colors"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }}
        />
        <div className="flex justify-end">
          <button
            onClick={handleSaveReflection}
            disabled={!reflectionText.trim()}
            className="px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-40 transition-all shadow-2xs cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentText,
            }}
          >
            Salvar Reflexão de Hoje
          </button>
        </div>

        {reflections.length > 0 && (
          <div className="pt-3 border-t space-y-2" style={{ borderColor: theme.colors.border }}>
            <span
              className="text-[11px] font-bold uppercase tracking-wider block"
              style={{ color: theme.colors.textMuted }}
            >
              Suas reflexões registradas ({reflections.length}):
            </span>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {reflections.map(ref => (
                <div
                  key={ref.id}
                  className="p-3 rounded-xl border text-xs space-y-1"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <div className="flex justify-between text-[10px] font-medium" style={{ color: theme.colors.textMuted }}>
                    <span className="font-bold" style={{ color: theme.colors.text }}>{ref.bookTitle}</span>
                    <span>{ref.date}</span>
                  </div>
                  <p className="leading-relaxed italic" style={{ color: theme.colors.text }}>
                    &ldquo;{ref.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal para Escolher Livro da Biblioteca */}
      {showBookPickerModal && (
        <div
          id="modal-pick-devotional-book"
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
                    Escolher Livro Devocional
                  </h3>
                  <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                    Selecione um livro da sua biblioteca para sua leitura diária
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBookPickerModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lista de Livros Disponíveis na Biblioteca */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {books.length === 0 ? (
                <div className="p-6 text-center space-y-3" style={{ color: theme.colors.textMuted }}>
                  <p className="text-xs">Sua biblioteca ainda não tem livros cadastrados.</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAddClassicDevotional('imitacao')}
                      className="px-3 py-2 rounded-xl text-white font-bold text-xs transition-opacity hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: theme.colors.accent }}
                    >
                      + Adicionar Imitação de Cristo (Tomás de Kempis)
                    </button>
                    <button
                      onClick={() => handleAddClassicDevotional('peregrino')}
                      className="px-3 py-2 rounded-xl bg-slate-100 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                      style={{ color: theme.colors.text }}
                    >
                      + Adicionar O Peregrino (John Bunyan)
                    </button>
                  </div>
                </div>
              ) : (
                books.map(b => {
                  const isCurrent = selectedBook?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBook(b)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-violet-500 bg-violet-50/60 shadow-2xs ring-1 ring-violet-500'
                          : 'border-slate-200 hover:border-violet-300 hover:bg-[#FAF8FF]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {b.coverUrl ? (
                            <img src={b.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                              {b.format.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate font-serif" style={{ color: theme.colors.text }}>
                            {b.title}
                          </h4>
                          <p className="text-[11px] truncate" style={{ color: theme.colors.textMuted }}>
                            {b.author || 'Autor não informado'}
                          </p>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mt-1 inline-block">
                            {b.format.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                          isCurrent
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        style={{
                          backgroundColor: isCurrent ? theme.colors.accent : undefined,
                        }}
                      >
                        {isCurrent ? 'Selecionado' : 'Escolher'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 shrink-0 text-xs">
              <button
                onClick={() => handleAddClassicDevotional('imitacao')}
                className="text-[11px] hover:underline font-semibold cursor-pointer"
                style={{ color: theme.colors.accent }}
              >
                + Adicionar Imitação de Cristo
              </button>
              <button
                onClick={() => setShowBookPickerModal(false)}
                className="px-4 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
