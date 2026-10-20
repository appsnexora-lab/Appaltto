'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  MessageSquare,
  Bookmark,
  Highlighter,
  Download,
  Upload,
  Calendar,
  Search,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Smartphone,
  Cloud,
  FileJson,
  Camera,
  Check,
  Heart,
  Edit3,
  Flame,
  Award,
} from 'lucide-react';
import { BibleReflection, Bookmark as BookmarkType, Highlight, Annotation } from '@/types';
import { getAllBibleReflections } from '@/lib/bibleService';
import { getBookmarks, getHighlights, getAnnotations, deleteBookmark, deleteHighlight, deleteAnnotation } from '@/lib/readerService';
import { exportAllDataAsJSON, importDataFromJSON } from '@/lib/indexedDB';
import {
  getUserProfile,
  DEFAULT_USER_PROFILE,
  saveUserProfile,
  processAvatarImage,
  AVATAR_PRESETS,
  UserProfile,
} from '@/lib/userService';
import { useTheme } from '@/context/ThemeContext';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

export const ProfileView: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'diary' | 'bookmarks' | 'highlights' | 'backup'>(
    'profile'
  );

  // User Profile Form State
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [nameInput, setNameInput] = useState<string>(DEFAULT_USER_PROFILE.name);
  const [verseInput, setVerseInput] = useState<string>(DEFAULT_USER_PROFILE.favoriteVerse || '');
  const [bioInput, setBioInput] = useState<string>(DEFAULT_USER_PROFILE.bio || '');
  const [avatarPreview, setAvatarPreview] = useState<string>(DEFAULT_USER_PROFILE.avatarUrl || '');
  const [selectedPreset, setSelectedPreset] = useState<string>(DEFAULT_USER_PROFILE.avatarPreset || 'gold');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reflections, setReflections] = useState<BibleReflection[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadData = async () => {
    const p = getUserProfile();
    setProfile(p);
    setNameInput(p.name);
    setVerseInput(p.favoriteVerse || '');
    setBioInput(p.bio || '');
    setAvatarPreview(p.avatarUrl || '');
    setSelectedPreset(p.avatarPreset || 'gold');

    const r = await getAllBibleReflections();
    setReflections(r);
    const b = await getBookmarks();
    setBookmarks(b);
    const h = await getHighlights();
    setHighlights(h);
    const a = await getAnnotations();
    setAnnotations(a);
  };

  useEffect(() => {
    let isCancelled = false;
    async function fetchData() {
      const p = getUserProfile();
      if (!isCancelled) {
        setProfile(p);
        setNameInput(p.name);
        setVerseInput(p.favoriteVerse || '');
        setBioInput(p.bio || '');
        setAvatarPreview(p.avatarUrl || '');
        setSelectedPreset(p.avatarPreset || 'gold');
      }

      const r = await getAllBibleReflections();
      if (isCancelled) return;
      setReflections(r);

      const b = await getBookmarks();
      if (isCancelled) return;
      setBookmarks(b);

      const h = await getHighlights();
      if (isCancelled) return;
      setHighlights(h);

      const a = await getAnnotations();
      if (!isCancelled) setAnnotations(a);
    }
    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Avatar Image Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await processAvatarImage(file);
      setAvatarPreview(base64);
      showToast('📸 Foto carregada! Clique em "Salvar Alterações" para confirmar.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao processar imagem.');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Foto removida. Será utilizado o monograma clássico.');
  };

  // Save Profile Handler
  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    const updated = saveUserProfile({
      name: nameInput.trim() || 'Anderson',
      avatarUrl: avatarPreview,
      avatarPreset: selectedPreset,
      favoriteVerse: verseInput.trim(),
      bio: bioInput.trim(),
    });
    setProfile(updated);
    setTimeout(() => {
      setIsSavingProfile(false);
      showToast(`✨ Perfil de ${updated.name} salvo com sucesso!`);
    }, 400);
  };

  // Export Full JSON Backup (Requirement 47)
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const jsonStr = await exportAllDataAsJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ALTTO-Backup-Cristao-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup completo baixado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import Full JSON Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importDataFromJSON(text);
      await loadData();
      showToast('Backup restaurado com sucesso! Todos os dados foram atualizados.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao importar backup. Verifique se o arquivo JSON é válido.');
    }
  };

  const filteredReflections = reflections.filter(r =>
    r.text.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.bookName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.date.includes(searchFilter)
  );

  return (
    <div
      id="profile-view-container"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 min-h-screen transition-colors duration-300"
      style={{ color: theme.colors.text }}
    >
      {/* Top Header */}
      <div
        className="flex items-center justify-between border-b pb-3 flex-wrap gap-2"
        style={{ borderColor: theme.colors.border }}
      >
        <div>
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: theme.colors.accent }}
          >
            Meu Espaço Espiritual
          </span>
          <h1 className="text-2xl font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>Histórico Espiritual & Perfil</h1>
          <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
            Suas reflexões com Deus, marcadores, trechos destacados e backup seguro.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sub tabs */}
      <div
        className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto text-xs"
        style={{ borderColor: theme.colors.border }}
      >
        <button
          id="profile-tab-btn-me"
          onClick={() => setActiveTab('profile')}
          className="px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: activeTab === 'profile' ? theme.colors.surface : 'transparent',
            color: activeTab === 'profile' ? theme.colors.accent : theme.colors.textMuted,
            borderColor: activeTab === 'profile' ? theme.colors.border : 'transparent',
            borderWidth: '1px',
          }}
        >
          <User className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
          <span>Meu Perfil</span>
        </button>
        <button
          id="profile-tab-btn-diary"
          onClick={() => setActiveTab('diary')}
          className="px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border"
          style={{
            backgroundColor: activeTab === 'diary' ? theme.colors.surface : 'transparent',
            color: activeTab === 'diary' ? theme.colors.accent : theme.colors.textMuted,
            borderColor: activeTab === 'diary' ? theme.colors.border : 'transparent',
          }}
        >
          <MessageSquare className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
          <span>Diário Espiritual ({reflections.length})</span>
        </button>
        <button
          id="profile-tab-btn-bookmarks"
          onClick={() => setActiveTab('bookmarks')}
          className="px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border"
          style={{
            backgroundColor: activeTab === 'bookmarks' ? theme.colors.surface : 'transparent',
            color: activeTab === 'bookmarks' ? theme.colors.accent : theme.colors.textMuted,
            borderColor: activeTab === 'bookmarks' ? theme.colors.border : 'transparent',
          }}
        >
          <Bookmark className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
          <span>Marcadores ({bookmarks.length})</span>
        </button>
        <button
          id="profile-tab-btn-highlights"
          onClick={() => setActiveTab('highlights')}
          className="px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border"
          style={{
            backgroundColor: activeTab === 'highlights' ? theme.colors.surface : 'transparent',
            color: activeTab === 'highlights' ? theme.colors.accent : theme.colors.textMuted,
            borderColor: activeTab === 'highlights' ? theme.colors.border : 'transparent',
          }}
        >
          <Highlighter className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
          <span>Destaques & Anotações ({highlights.length + annotations.length})</span>
        </button>
        <button
          id="profile-tab-btn-backup"
          onClick={() => setActiveTab('backup')}
          className="px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border"
          style={{
            backgroundColor: activeTab === 'backup' ? theme.colors.surface : 'transparent',
            color: activeTab === 'backup' ? theme.colors.accent : theme.colors.textMuted,
            borderColor: activeTab === 'backup' ? theme.colors.border : 'transparent',
          }}
        >
          <Cloud className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
          <span>Backup & Offline</span>
        </button>
      </div>

      {/* SECTION 0: MEU PERFIL DO USUÁRIO */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Minimalist Soft Lilac Hero Profile Card */}
          <div
            className="p-6 rounded-3xl border shadow-xs relative overflow-hidden"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-30"
              style={{ backgroundColor: `${theme.colors.accent}20` }}
            />
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              {/* Avatar with Camera upload button */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white border-3 shadow-md flex items-center justify-center relative ring-4 ring-violet-200/70"
                    style={{ borderColor: '#FFFFFF' }}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={nameInput || 'Usuário'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-serif font-bold"
                        style={{
                          backgroundColor: `${theme.colors.accent}15`,
                          color: theme.colors.accent,
                        }}
                      >
                        {(nameInput.trim() || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload-input"
                    className="absolute -bottom-1 -right-1 p-2.5 rounded-full text-white shadow-md cursor-pointer border-2 border-white hover:scale-110 transition-transform"
                    style={{ backgroundColor: theme.colors.accent }}
                    title="Carregar foto do seu dispositivo"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="avatar-upload-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="text-[11px] font-medium text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    Remover foto
                  </button>
                )}
              </div>

              {/* Dynamic Live Greeting & Bio Preview */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: theme.colors.accent }}>
                    Pré-visualização no Início
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight" style={{ color: theme.colors.text }}>
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting =
                      hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
                    return `${greeting}, ${nameInput.trim() || 'Anderson'}!`;
                  })()}
                </h2>
                <p className="text-xs sm:text-sm italic font-serif max-w-lg" style={{ color: theme.colors.textMuted }}>
                  &ldquo;{verseInput.trim() || 'O Senhor é o meu pastor; nada me faltará. (Salmo 23:1)'}&rdquo;
                </p>
                {bioInput && (
                  <p className="text-xs max-w-lg" style={{ color: theme.colors.textMuted }}>
                    {bioInput}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form to Edit Profile */}
          <div
            className="p-6 rounded-3xl bg-white border shadow-xs space-y-5"
            style={{ borderColor: theme.colors.border }}
          >
            <div
              className="flex items-center gap-2 border-b pb-3"
              style={{ borderColor: theme.colors.border }}
            >
              <Edit3 className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <h3 className="text-sm font-bold font-serif" style={{ color: theme.colors.text }}>
                Personalizar Meu Nome & Perfil
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name Input */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold flex items-center justify-between" style={{ color: theme.colors.text }}>
                  <span>Seu Nome ou Como deseja ser chamado:</span>
                  <span className="text-[10px] font-semibold" style={{ color: theme.colors.accent }}>
                    Usado nas saudações do Início
                  </span>
                </label>
                <input
                  id="user-profile-name-input"
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Ex: Anderson, Maria, José, etc."
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8FF] border text-sm font-medium transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                />
                <p className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                  Toda vez que você abrir o app, ele irá cumprimentá-lo com &ldquo;Bom dia, {nameInput.trim() || 'Anderson'}&rdquo;, &ldquo;Boa tarde, {nameInput.trim() || 'Anderson'}&rdquo; ou &ldquo;Boa noite, {nameInput.trim() || 'Anderson'}&rdquo;.
                </p>
              </div>

              {/* Favorite Verse / Motto */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold" style={{ color: theme.colors.text }}>
                  Versículo ou Lema Espiritual Favorito:
                </label>
                <input
                  id="user-profile-verse-input"
                  type="text"
                  value={verseInput}
                  onChange={e => setVerseInput(e.target.value)}
                  placeholder="Ex: O Senhor é o meu pastor; nada me faltará. (Salmo 23:1)"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8FF] border text-xs transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold" style={{ color: theme.colors.text }}>
                  Sobre minha caminhada com Deus (Opcional):
                </label>
                <textarea
                  id="user-profile-bio-input"
                  rows={2}
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  placeholder="Ex: Dedicado a ler a Bíblia todos os dias pela manhã, tarde e noite."
                  className="w-full px-4 py-2 rounded-2xl bg-[#FAF8FF] border text-xs transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                  style={{
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                />
              </div>

              {/* Presets if no photo */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold" style={{ color: theme.colors.text }}>
                  Estilo de Cor do Monograma (caso não use foto):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {AVATAR_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                        selectedPreset === preset.id
                          ? 'border-violet-500 bg-violet-50/70 shadow-2xs ring-1 ring-violet-500'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg ${preset.bg} ${preset.text} font-bold text-[10px] flex items-center justify-center border ${preset.border}`}>
                        {(nameInput.trim() || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] truncate" style={{ color: theme.colors.text }}>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div
              className="flex items-center justify-end gap-3 pt-3 border-t"
              style={{ borderColor: theme.colors.border }}
            >
              <button
                id="btn-save-user-profile"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-xs hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: theme.colors.accent }}
              >
                {isSavingProfile ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvar Alterações no Perfil</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instalação do Aplicativo no Celular - Exclusivo do Perfil */}
          <div className="space-y-2.5" id="profile-pwa-install-section">
            <div className="flex items-center gap-2 px-1">
              <Smartphone className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <h3 className="text-xs font-bold uppercase tracking-wider font-sans" style={{ color: theme.colors.textMuted }}>
                Instalar Altto no Celular
              </h3>
            </div>
            <PwaInstallPrompt />
          </div>

          {/* Spiritual Milestones & Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className="p-4 rounded-2xl bg-white border text-center space-y-1 shadow-2xs"
              style={{ borderColor: theme.colors.border }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
              >
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold font-serif block" style={{ color: theme.colors.text }}>
                {profile.streakDays || 1}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                Dias de Foco
              </span>
            </div>

            <div
              className="p-4 rounded-2xl bg-white border text-center space-y-1 shadow-2xs"
              style={{ borderColor: theme.colors.border }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold font-serif block" style={{ color: theme.colors.text }}>
                {reflections.length}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                Reflexões com Deus
              </span>
            </div>

            <div
              className="p-4 rounded-2xl bg-white border text-center space-y-1 shadow-2xs"
              style={{ borderColor: theme.colors.border }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
              >
                <Bookmark className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold font-serif block" style={{ color: theme.colors.text }}>
                {bookmarks.length}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                Marcadores
              </span>
            </div>

            <div
              className="p-4 rounded-2xl bg-white border text-center space-y-1 shadow-2xs"
              style={{ borderColor: theme.colors.border }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
              >
                <Highlighter className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold font-serif block" style={{ color: theme.colors.text }}>
                {highlights.length + annotations.length}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.colors.textMuted }}>
                Trechos Salvos
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: DIÁRIO ESPIRITUAL */}
      {activeTab === 'diary' && (
        <div className="space-y-4">
          {/* Search in spiritual reflections */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar em reflexões antigas..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full bg-[#FAF8FF] border rounded-xl pl-9 pr-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-300"
              style={{ borderColor: theme.colors.border, color: theme.colors.text }}
            />
          </div>

          {filteredReflections.length === 0 ? (
            <div
              className="p-8 rounded-2xl bg-white border text-center space-y-2 shadow-2xs"
              style={{ borderColor: theme.colors.border }}
            >
              <MessageSquare className="w-8 h-8 mx-auto" style={{ color: theme.colors.accent }} />
              <h3 className="text-sm font-bold" style={{ color: theme.colors.text }}>
                Nenhuma reflexão espiritual encontrada.
              </h3>
              <p className="text-xs max-w-sm mx-auto" style={{ color: theme.colors.textMuted }}>
                Após ler seus capítulos na aba Bíblia, registre no campo &ldquo;O que Deus falou ao meu coração&rdquo; para construir seu memorial de fé.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReflections.map(r => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-white border space-y-3 shadow-2xs"
                  style={{ borderColor: theme.colors.border }}
                >
                  <div
                    className="flex items-center justify-between border-b pb-2"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-serif" style={{ color: theme.colors.accent }}>
                        {r.bookName} {r.chapterNumber}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold border"
                        style={{
                          backgroundColor: `${theme.colors.accent}15`,
                          color: theme.colors.accent,
                          borderColor: `${theme.colors.accent}30`,
                        }}
                      >
                        {r.period === 'morning'
                          ? '🌅 Manhã'
                          : r.period === 'afternoon'
                          ? '☀️ Tarde'
                          : '🌙 Noite'}
                      </span>
                    </div>
                    <span className="text-xs flex items-center gap-1 font-medium" style={{ color: theme.colors.textMuted }}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {r.date}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed italic p-3.5 rounded-xl border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    &ldquo;{r.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MARCADORES */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-3">
          {bookmarks.length === 0 ? (
            <div
              className="p-8 rounded-2xl bg-white border text-center text-xs shadow-2xs"
              style={{ borderColor: theme.colors.border, color: theme.colors.textMuted }}
            >
              Nenhum marcador salvo ainda. Toque no ícone de marcador durante a leitura para salvar sua posição.
            </div>
          ) : (
            bookmarks.map(b => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-white border flex items-center justify-between shadow-2xs"
                style={{ borderColor: theme.colors.border }}
              >
                <div>
                  <h4 className="text-xs font-bold font-serif" style={{ color: theme.colors.text }}>{b.title}</h4>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: theme.colors.accent }}>{b.location}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: theme.colors.textMuted }}>
                    {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await deleteBookmark(b.id);
                    await loadData();
                    showToast('Marcador removido');
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 3: DESTAQUES & ANOTAÇÕES */}
      {activeTab === 'highlights' && (
        <div className="space-y-3">
          {highlights.length === 0 && annotations.length === 0 ? (
            <div
              className="p-8 rounded-2xl bg-white border text-center text-xs shadow-2xs"
              style={{ borderColor: theme.colors.border, color: theme.colors.textMuted }}
            >
              Nenhum destaque ou anotação registrado. Selecione qualquer texto no leitor para destacar ou adicionar notas espirituais.
            </div>
          ) : (
            <>
              {highlights.map(h => (
                <div
                  key={h.id}
                  className="p-4 rounded-xl bg-white border space-y-2 shadow-2xs"
                  style={{ borderColor: theme.colors.border }}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold" style={{ color: theme.colors.accent }}>{h.location}</span>
                    <button
                      onClick={async () => {
                        await deleteHighlight(h.id);
                        await loadData();
                        showToast('Destaque removido');
                      }}
                      className="text-slate-400 hover:text-rose-600 rounded-lg p-1 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    className={`p-3 rounded-lg text-xs italic ${
                      h.color === 'emerald'
                        ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500'
                        : h.color === 'sky'
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-500'
                        : h.color === 'rose'
                        ? 'bg-rose-50 text-rose-900 border-l-2 border-rose-500'
                        : 'bg-violet-50 text-violet-900 border-l-2 border-violet-500'
                    }`}
                  >
                    &ldquo;{h.text}&rdquo;
                  </div>
                  {h.note && <p className="text-xs font-medium" style={{ color: theme.colors.text }}>Nota: {h.note}</p>}
                </div>
              ))}

              {annotations.map(a => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl bg-white border space-y-2 shadow-2xs"
                  style={{ borderColor: theme.colors.border }}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold" style={{ color: theme.colors.text }}>{a.title || a.location}</span>
                    <button
                      onClick={async () => {
                        await deleteAnnotation(a.id);
                        await loadData();
                        showToast('Anotação removida');
                      }}
                      className="text-slate-400 hover:text-rose-600 rounded-lg p-1 hover:bg-rose-50 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p
                    className="text-xs p-3 rounded-lg border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    {a.text}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* SECTION 4: BACKUP & OFFLINE */}
      {activeTab === 'backup' && (
        <div
          className="p-6 rounded-2xl bg-white border space-y-6 shadow-2xs"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
            <div>
              <h3 className="text-base font-bold font-serif" style={{ color: theme.colors.text }}>
                Soberania dos Dados & Modo Offline
              </h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.colors.textMuted }}>
                O ALTTO funciona de forma 100% offline. Todos os seus dados, leituras, reflexões, Bíblias e livros são gravados de forma persistente no seu dispositivo (IndexedDB).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Export */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" style={{ color: theme.colors.accent }} />
                <h4 className="text-xs font-bold uppercase" style={{ color: theme.colors.text }}>Exportar Backup Completo</h4>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                Gera um arquivo .json seguro com todas as suas leituras, reflexões, marcadores e configurações.
              </p>
              <button
                disabled={isExporting}
                onClick={handleExportBackup}
                className="w-full py-2.5 rounded-xl text-white font-bold text-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <FileJson className="w-4 h-4" />
                <span>{isExporting ? 'Exportando...' : 'Baixar Arquivo JSON'}</span>
              </button>
            </div>

            {/* Import */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" style={{ color: theme.colors.accent }} />
                <h4 className="text-xs font-bold uppercase" style={{ color: theme.colors.text }}>Restaurar Backup</h4>
              </div>
              <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                Restaure seus dados ao trocar de aparelho ou recuperar um ponto anterior.
              </p>
              <label
                className="w-full py-2.5 rounded-xl border font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }}
              >
                <Upload className="w-4 h-4" />
                <span>Selecionar Arquivo JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Atalho na Tela Inicial & Instalação PWA */}
          <div className="pt-2">
            <PwaInstallPrompt />
          </div>

          <div
            className="pt-2 border-t flex items-center justify-between text-xs"
            style={{ borderColor: theme.colors.border, color: theme.colors.textMuted }}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <span>Armazenamento local ativo (IndexedDB + PWA)</span>
            </span>
            <span className="text-emerald-700 font-bold">✓ Pronto para uso offline</span>
          </div>
        </div>
      )}
    </div>
  );
};
