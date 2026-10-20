'use client';

import React, { useState, useEffect } from 'react';
import { Home, BookOpen, BookMarked, Library, User, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { getUserProfile, DEFAULT_USER_PROFILE, UserProfile } from '@/lib/userService';
import { useTheme } from '@/context/ThemeContext';

export type ActiveTab = 'home' | 'bible' | 'devotional' | 'library' | 'profile';

interface NavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOffline?: boolean;
}

export const TopBar: React.FC<{
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOffline?: boolean;
}> = ({ activeTab, onTabChange, isOffline }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const { theme } = useTheme();

  useEffect(() => {
    setProfile(getUserProfile());
    const handleUpdate = () => {
      setProfile(getUserProfile());
    };
    window.addEventListener('altto_profile_updated', handleUpdate);
    return () => window.removeEventListener('altto_profile_updated', handleUpdate);
  }, []);

  const userInitial = (profile.name || 'A').charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 w-full px-4 py-2.5 sm:px-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-colors duration-300 border-b"
      style={{
        backgroundColor: theme.mode === 'dark' ? `${theme.colors.bg}FA` : `${theme.colors.bg}F0`,
        borderColor: theme.colors.border,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div
          id="altto-logo-brand"
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
          onClick={() => onTabChange('home')}
        >
          <div className="w-9 h-9 rounded-2xl overflow-hidden shadow-2xs border border-[#EDE9FE] group-hover:scale-105 transition-all bg-white p-0.5 shrink-0 flex items-center justify-center">
            <img src="/icons/icon-192.png" alt="Altto" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight font-serif" style={{ color: theme.colors.text }}>
              Altto
            </h1>
            <p className="text-[10px] font-medium tracking-wide" style={{ color: theme.colors.textMuted }}>
              Leitura Cristã
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 p-1 rounded-2xl border transition-colors"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <button
            id="nav-desktop-home"
            onClick={() => onTabChange('home')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'home'
                ? 'font-bold shadow-2xs'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'home' ? (theme.mode === 'dark' ? '#1F2433' : '#FFFFFF') : 'transparent',
              color: activeTab === 'home' ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>
          <button
            id="nav-desktop-bible"
            onClick={() => onTabChange('bible')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bible'
                ? 'font-bold shadow-2xs'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'bible' ? (theme.mode === 'dark' ? '#1F2433' : '#FFFFFF') : 'transparent',
              color: activeTab === 'bible' ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bíblia</span>
          </button>
          <button
            id="nav-desktop-devotional"
            onClick={() => onTabChange('devotional')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'devotional'
                ? 'font-bold shadow-2xs'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'devotional' ? (theme.mode === 'dark' ? '#1F2433' : '#FFFFFF') : 'transparent',
              color: activeTab === 'devotional' ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Devocional</span>
          </button>
          <button
            id="nav-desktop-library"
            onClick={() => onTabChange('library')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'library'
                ? 'font-bold shadow-2xs'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'library' ? (theme.mode === 'dark' ? '#1F2433' : '#FFFFFF') : 'transparent',
              color: activeTab === 'library' ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Biblioteca</span>
          </button>
          <button
            id="nav-desktop-profile"
            onClick={() => onTabChange('profile')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'font-bold shadow-2xs'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'profile' ? (theme.mode === 'dark' ? '#1F2433' : '#FFFFFF') : 'transparent',
              color: activeTab === 'profile' ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perfil</span>
          </button>
        </nav>

        {/* Right Actions: Status (only if offline) & Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {isOffline && (
            <div
              id="status-badge-offline"
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-xl border font-medium bg-amber-50 text-amber-700 border-amber-200"
              title="Modo Offline: Dados salvos localmente"
            >
              <WifiOff className="w-3 h-3 text-amber-600" />
              <span>Offline</span>
            </div>
          )}

          {/* User Profile Pill button - Clean & Sophisticated */}
          <button
            id="btn-topbar-profile"
            onClick={() => onTabChange('profile')}
            className="flex items-center gap-2 p-1 pl-2.5 rounded-full border shadow-2xs transition-all cursor-pointer group hover:opacity-95"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
            title="Abrir Meu Perfil"
          >
            <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline" style={{ color: theme.colors.text }}>
              {profile.name || 'Meu Perfil'}
            </span>
            <div
              className="w-9 h-9 rounded-full border overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs"
              style={{
                backgroundColor: `${theme.colors.accent}15`,
                borderColor: `${theme.colors.accent}30`,
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name || 'Foto do Perfil'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold font-serif" style={{ color: theme.colors.accent }}>
                  {userInitial}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export const BottomNav: React.FC<NavProps> = ({ activeTab, onTabChange }) => {
  const { theme } = useTheme();

  const navItems = [
    { id: 'home' as const, label: 'Início', icon: Home, testId: 'tab-btn-home' },
    { id: 'bible' as const, label: 'Bíblia', icon: BookOpen, testId: 'tab-btn-bible' },
    { id: 'devotional' as const, label: 'Devocional', icon: BookMarked, testId: 'tab-btn-devotional' },
    { id: 'library' as const, label: 'Biblioteca', icon: Library, testId: 'tab-btn-library' },
    { id: 'profile' as const, label: 'Perfil', icon: User, testId: 'tab-btn-profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 px-3 py-2 pb-safe pointer-events-none transition-colors duration-300">
      <div
        className="max-w-md sm:max-w-lg mx-auto rounded-2xl border shadow-[0_4px_24px_rgba(139,92,246,0.07),0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur-md px-1.5 py-1 grid grid-cols-5 gap-1 pointer-events-auto"
        style={{
          backgroundColor: theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.97)',
          borderColor: theme.colors.border,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={item.testId}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 group relative"
              style={{
                color: isActive ? theme.colors.accent : theme.colors.textMuted,
              }}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'scale-105' : 'group-hover:opacity-100 opacity-75'
                }`}
                style={{
                  backgroundColor: isActive ? `${theme.colors.accent}14` : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

