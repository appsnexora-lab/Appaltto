'use client';

import React, { useState, useEffect } from 'react';
import { TopBar, BottomNav, ActiveTab } from '@/components/Navbar';
import { HomeView } from '@/components/HomeView';
import { BibleView } from '@/components/BibleView';
import { DevotionalView } from '@/components/DevotionalView';
import { LibraryView } from '@/components/LibraryView';
import { ProfileView } from '@/components/ProfileView';
import { ReaderModal } from '@/components/ReaderModal';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { getBibles, importOfficialAlmeidaBible, saveBibleReading } from '@/lib/bibleService';
import { getDevotionals, importOfficialDevotional, saveDevotionalReading } from '@/lib/devotionalService';
import { recordActiveReading } from '@/lib/readerService';
import { performFullCloudSync } from '@/lib/firebaseSync';
import { ContentType, DevotionalDay, Book } from '@/types';

interface ReaderState {
  isOpen: boolean;
  contentType: ContentType;
  contentId: string;
  title: string;
  subtitle?: string;
  bookName?: string;
  chapterNumber?: number;
  initialChapterOrDay?: number;
  bibleBooks?: any[];
  devotionalDays?: DevotionalDay[];
  bookData?: Book;
  isReadAlready?: boolean;
  period?: 'morning' | 'afternoon' | 'night';
}

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AlttoApp() {
  return (
    <ThemeProvider>
      <ErrorBoundary fallbackTitle="Visualização ALTTO Protegida">
        <AlttoAppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

function AlttoAppContent() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [readerState, setReaderState] = useState<ReaderState>({
    isOpen: false,
    contentType: 'bible',
    contentId: '',
    title: '',
  });

  // Offline detection
  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    const timer = setTimeout(updateOnlineStatus, 0);

    // Initial setup: ensure at least one real Bible & Devotional exists concurrently
    async function initStarterData() {
      try {
        const [bibles, devs] = await Promise.all([getBibles(), getDevotionals()]);
        const tasks: Promise<any>[] = [];
        if (bibles.length === 0) {
          tasks.push(importOfficialAlmeidaBible());
        }
        if (devs.length === 0) {
          tasks.push(importOfficialDevotional('365 Dias com Deus — Jornada Diária', 365));
        }
        if (tasks.length > 0) {
          await Promise.all(tasks);
        }
        // Background two-way cloud synchronization (non-blocking)
        performFullCloudSync().catch((e) => console.debug('Sync background:', e));
      } catch (err) {
        console.warn('Init error:', err);
      }
    }
    initStarterData();

    // Register PWA Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.debug('ServiceWorker:', err);
        });
      });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleOpenReader = (params: any) => {
    if (params.contentType === 'book' && params.contentId) {
      recordActiveReading(params.contentId);
    }

    setReaderState({
      isOpen: true,
      contentType: params.contentType,
      contentId: params.contentId,
      title: params.title,
      subtitle: params.subtitle,
      bookName: params.bookName || 'Gênesis',
      chapterNumber: params.chapterNumber || params.initialChapterOrDay || 1,
      initialChapterOrDay: params.initialChapterOrDay || params.chapterNumber || 1,
      bibleBooks: params.bibleBooks,
      devotionalDays: params.devotionalDays,
      bookData: params.bookData,
      isReadAlready: params.isReadAlready || false,
      period: params.period,
    });
  };

  const handleMarkAsReadFromReader = async (details: {
    bookName?: string;
    chapterNumber?: number;
    dayNumber?: number;
  }) => {
    if (readerState.contentType === 'bible') {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      const hour = now.getHours();
      const fallbackPeriod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night';
      const actualPeriod = readerState.period || fallbackPeriod;

      await saveBibleReading({
        id: `reading-${selectedDateStr}-${actualPeriod}-${Date.now()}`,
        bibleId: readerState.contentId,
        bookName: details.bookName || readerState.bookName || 'Gênesis',
        chapterNumber: details.chapterNumber || readerState.chapterNumber || 1,
        period: actualPeriod,
        date: selectedDateStr,
        time: timeStr,
        userId: 'local-user',
        status: 'completed',
        completedAt: now.toISOString(),
      });

      // Synchronize period status in localStorage for automatic unlocking of next period
      try {
        const statusKey = `altto_bible_status_${selectedDateStr}`;
        const saved = localStorage.getItem(statusKey);
        let statusObj = { morning: false, afternoon: false, night: false };
        if (saved) {
          try { statusObj = JSON.parse(saved); } catch {}
        }
        statusObj[actualPeriod] = true;
        localStorage.setItem(statusKey, JSON.stringify(statusObj));
        window.dispatchEvent(new Event('altto_bible_status_updated'));
      } catch (err) {
        console.warn('Status sync error:', err);
      }

      setReaderState(prev => ({ ...prev, isReadAlready: true }));
    } else if (readerState.contentType === 'devotional') {
      const day = details.dayNumber || readerState.initialChapterOrDay || 1;
      await saveDevotionalReading({
        id: `dev-read-${readerState.contentId}-day-${day}`,
        devotionalId: readerState.contentId,
        dayNumber: day,
        date: selectedDateStr,
        status: 'completed',
        completedAt: new Date().toISOString(),
        userId: 'local-user',
      });
      setReaderState(prev => ({ ...prev, isReadAlready: true }));
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased pb-28 transition-colors duration-300"
      style={{
        backgroundColor: theme.colors.bg,
        color: theme.colors.text,
      }}
    >
      {/* Top Bar Navigation */}
      <TopBar
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        isOffline={isOffline}
      />

      {/* Main Views with Strict Domain Separation */}
      <main className="flex-1 w-full animate-in fade-in duration-200">
        {activeTab === 'home' && (
          <HomeView
            onNavigateTab={(tab, params) => {
              setActiveTab(tab);
            }}
            onOpenReader={handleOpenReader}
            selectedDateStr={selectedDateStr}
            onDateChange={setSelectedDateStr}
          />
        )}
        {activeTab === 'bible' && (
          <BibleView
            onOpenReader={handleOpenReader}
            selectedDateStr={selectedDateStr}
            onDateChange={setSelectedDateStr}
          />
        )}
        {activeTab === 'devotional' && (
          <DevotionalView
            onOpenReader={handleOpenReader}
            selectedDateStr={selectedDateStr}
            onDateChange={setSelectedDateStr}
          />
        )}
        {activeTab === 'library' && (
          <LibraryView onOpenReader={handleOpenReader} />
        )}
        {activeTab === 'profile' && <ProfileView />}
      </main>

      {/* Central Shared Professional Reader Modal */}
      {readerState.isOpen && (
        <ReaderModal
          contentType={readerState.contentType}
          contentId={readerState.contentId}
          title={readerState.title}
          subtitle={readerState.subtitle}
          initialChapterOrDay={readerState.initialChapterOrDay}
          initialBookName={readerState.bookName}
          bibleBooks={readerState.bibleBooks}
          devotionalDays={readerState.devotionalDays}
          bookData={readerState.bookData}
          onClose={() => setReaderState(prev => ({ ...prev, isOpen: false }))}
          onMarkAsRead={handleMarkAsReadFromReader}
          isReadAlready={readerState.isReadAlready}
        />
      )}

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        isOffline={isOffline}
      />
    </div>
  );
}
