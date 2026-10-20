export type ThemeId =
  | 'light-lilac'
  | 'light-yellow'
  | 'ice-cream'
  | 'editorial'
  | 'minimal'
  | 'dashboard'
  | 'immersive'
  | 'magazine'
  | 'library'
  | 'glass'
  | 'organic'
  | 'professional';

export type LayoutParadigm =
  | 'floating-pill'    // Floating navigation
  | 'masthead'         // Editorial
  | 'minimal-rail'     // Minimal
  | 'left-sidebar'     // Dashboard
  | 'cinema-canvas'    // Immersive
  | 'bento-grid'       // Magazine
  | 'wooden-shelves'   // Library
  | 'vision-glass'     // Glass
  | 'organic-pebble'   // Organic
  | 'workstation';     // Professional

export interface DesignTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  concept: string;
  layoutParadigm: LayoutParadigm;
  mode: 'dark' | 'light';
  colors: {
    bg: string;
    surface: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    accentText: string;
    previewDots: string[];
  };
  typography: {
    headingFont: 'serif' | 'sans' | 'mono';
    bodyFont: 'serif' | 'sans' | 'mono';
    styleLabel: string;
  };
  cardRadius: string;
  shadowStyle: string;
}

export const LIGHT_LILAC_THEME: DesignTheme = {
  id: 'light-lilac',
  name: 'Altto Lilás Minimalista',
  subtitle: 'Fundo Branco & Lilás Claro',
  concept: 'Design minimalista e intuitivo com fundo 100% branco puro e toques serenos em lilás suave, criando um ambiente limpo e acolhedor para a leitura.',
  layoutParadigm: 'floating-pill',
  mode: 'light',
  colors: {
    bg: '#FFFFFF',          // Fundo 100% branco puro
    surface: '#FAF8FF',     // Superfície muito clara com leve toque lilás
    card: '#F5F2FE',        // Lilás bem clarinho (lavanda suave delicada)
    border: '#EDE9FE',      // Borda lilás bem suave e refinada (violet-100)
    text: '#1E1B4B',        // Texto escuro índigo profundo de alto contraste
    textMuted: '#6D6789',   // Texto secundário nítido e elegante com tom suave
    accent: '#8B5CF6',      // Lilás vibrante e sofisticado
    accentHover: '#7C3AED', // Hover lilás profundo
    accentText: '#FFFFFF',  // Texto de alto contraste sobre botões lilás
    previewDots: ['#FFFFFF', '#FAF8FF', '#EDE9FE', '#8B5CF6'],
  },
  typography: {
    headingFont: 'serif',
    bodyFont: 'sans',
    styleLabel: 'Branco & Lilás Suave',
  },
  cardRadius: 'rounded-2xl',
  shadowStyle: 'shadow-xs',
};

export const LIGHT_YELLOW_THEME: DesignTheme = LIGHT_LILAC_THEME;

export const DESIGN_THEMES: Record<ThemeId, DesignTheme> = {
  'light-lilac': LIGHT_LILAC_THEME,
  'light-yellow': LIGHT_LILAC_THEME,
  'ice-cream': { ...LIGHT_LILAC_THEME, id: 'ice-cream' },

  'editorial': {
    id: 'editorial',
    name: 'Altto Editorial',
    subtitle: 'Revistas & Impressos Nobres',
    concept: 'Inspirado em editoras e periódicos culturais. Masthead imponente, colunas assimétricas, tipografia serifada requintada e fichas de catálogo.',
    layoutParadigm: 'masthead',
    mode: 'light',
    colors: {
      bg: '#F9F8F5',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#E8E4DA',
      text: '#1C1917',
      textMuted: '#78716C',
      accent: '#991B1B',
      accentHover: '#7F1D1D',
      accentText: '#FFFFFF',
      previewDots: ['#F9F8F5', '#E8E4DA', '#991B1B', '#1C1917'],
    },
    typography: {
      headingFont: 'serif',
      bodyFont: 'serif',
      styleLabel: 'Serif Clássico & Masthead',
    },
    cardRadius: 'rounded-none border-t-2',
    shadowStyle: 'shadow-none',
  },

  'minimal': {
    id: 'minimal',
    name: 'Altto Minimal',
    subtitle: 'Dieter Rams & Swiss Style',
    concept: 'Pureza absoluta. Foco 100% no conteúdo, linhas de 1px com precisão milimétrica, numeração indexada, zero ornamentos desnecessários.',
    layoutParadigm: 'minimal-rail',
    mode: 'light',
    colors: {
      bg: '#FFFFFF',
      surface: '#FAFAFA',
      card: '#FFFFFF',
      border: '#E5E5E5',
      text: '#0A0A0A',
      textMuted: '#737373',
      accent: '#0A0A0A',
      accentHover: '#262626',
      accentText: '#FFFFFF',
      previewDots: ['#FFFFFF', '#E5E5E5', '#737373', '#0A0A0A'],
    },
    typography: {
      headingFont: 'mono',
      bodyFont: 'sans',
      styleLabel: 'Swiss Grid & Monospace',
    },
    cardRadius: 'rounded-none',
    shadowStyle: 'shadow-none',
  },

  'dashboard': {
    id: 'dashboard',
    name: 'Altto Dashboard',
    subtitle: 'Cockpit de Produtividade & Métricas',
    concept: 'Painel moderno com barra lateral (Sidebar) persistente, métricas em tempo real, visualização em tabela/kanban e densidade informacional.',
    layoutParadigm: 'left-sidebar',
    mode: 'dark',
    colors: {
      bg: '#0F1117',
      surface: '#161922',
      card: '#1B1F2B',
      border: '#272C3D',
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      accent: '#3B82F6',
      accentHover: '#2563EB',
      accentText: '#FFFFFF',
      previewDots: ['#0F1117', '#1B1F2B', '#3B82F6', '#F1F5F9'],
    },
    typography: {
      headingFont: 'sans',
      bodyFont: 'sans',
      styleLabel: 'SaaS Metric & Sidebar',
    },
    cardRadius: 'rounded-xl',
    shadowStyle: 'shadow-md',
  },

  'immersive': {
    id: 'immersive',
    name: 'Altto Immersive',
    subtitle: 'Cinema & Experiência Visual Pura',
    concept: 'Interface cinematográfica com capas gigantes, gradientes atmosféricos, carrosséis contínuos e leitor com zero distrações visuais.',
    layoutParadigm: 'cinema-canvas',
    mode: 'dark',
    colors: {
      bg: '#09090B',
      surface: '#121216',
      card: '#18181F',
      border: 'rgba(255, 255, 255, 0.08)',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      accent: '#E11D48',
      accentHover: '#BE123C',
      accentText: '#FFFFFF',
      previewDots: ['#09090B', '#18181F', '#E11D48', '#FAFAFA'],
    },
    typography: {
      headingFont: 'sans',
      bodyFont: 'sans',
      styleLabel: 'Full-bleed & Poster Art',
    },
    cardRadius: 'rounded-2xl',
    shadowStyle: 'shadow-2xl',
  },

  'magazine': {
    id: 'magazine',
    name: 'Altto Magazine',
    subtitle: 'Bento Grid & Curadoria Editorial',
    concept: 'Inspirado em bancas de revistas culturais. Grade assimétrica tipo bento box, resenhas em destaque e citações estilizadas.',
    layoutParadigm: 'bento-grid',
    mode: 'light',
    colors: {
      bg: '#F5F5F0',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#E2E2D8',
      text: '#171717',
      textMuted: '#525252',
      accent: '#D97706',
      accentHover: '#B45309',
      accentText: '#FFFFFF',
      previewDots: ['#F5F5F0', '#FFFFFF', '#D97706', '#171717'],
    },
    typography: {
      headingFont: 'serif',
      bodyFont: 'sans',
      styleLabel: 'Bento Grid & Pull Quotes',
    },
    cardRadius: 'rounded-3xl',
    shadowStyle: 'shadow-sm',
  },

  'library': {
    id: 'library',
    name: 'Altto Library',
    subtitle: 'Estantes Reais & Fichário Acadêmico',
    concept: 'Inspirado em bibliotecas contemporâneas de madeira nobre. Estantes com profundidade 3D, livros repousando sobre prateleiras e fichas catalográficas.',
    layoutParadigm: 'wooden-shelves',
    mode: 'dark',
    colors: {
      bg: '#141210',
      surface: '#1E1A16',
      card: '#27221C',
      border: '#3D352C',
      text: '#F5EDE4',
      textMuted: '#BFAFA0',
      accent: '#D4AF37',
      accentHover: '#E5C158',
      accentText: '#141210',
      previewDots: ['#141210', '#27221C', '#D4AF37', '#F5EDE4'],
    },
    typography: {
      headingFont: 'serif',
      bodyFont: 'serif',
      styleLabel: 'Prateleiras 3D & Fichário',
    },
    cardRadius: 'rounded-lg',
    shadowStyle: 'shadow-[0_12px_20px_rgba(0,0,0,0.6)]',
  },

  'glass': {
    id: 'glass',
    name: 'Altto Glass',
    subtitle: 'VisionOS & Refração Translúcida',
    concept: 'Alta tecnologia aeroespacial com camadas de vidro translúcido, desfoque profundo (backdrop-blur), bordas bioluminescentes e ilha flutuante.',
    layoutParadigm: 'vision-glass',
    mode: 'dark',
    colors: {
      bg: '#0A0C14',
      surface: 'rgba(255, 255, 255, 0.05)',
      card: 'rgba(255, 255, 255, 0.07)',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      accent: '#06B6D4',
      accentHover: '#0891B2',
      accentText: '#0A0C14',
      previewDots: ['#0A0C14', 'rgba(255,255,255,0.1)', '#06B6D4', '#F8FAFC'],
    },
    typography: {
      headingFont: 'sans',
      bodyFont: 'sans',
      styleLabel: 'Spatial Glass & Hologram',
    },
    cardRadius: 'rounded-2xl',
    shadowStyle: 'shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]',
  },

  'organic': {
    id: 'organic',
    name: 'Altto Organic',
    subtitle: 'Wabi-Sabi, Argila & Formas Vivas',
    concept: 'Formas biomórficas inspiradas em seixos de rio e cerâmica artesanal. Tons terrosos acolhedores, curvas assimétricas e leitura serena.',
    layoutParadigm: 'organic-pebble',
    mode: 'light',
    colors: {
      bg: '#F5F1EB',
      surface: '#EDE8E0',
      card: '#FCFAF6',
      border: '#DDD6CA',
      text: '#2C2723',
      textMuted: '#7D7368',
      accent: '#4D6B53',
      accentHover: '#3C5441',
      accentText: '#FFFFFF',
      previewDots: ['#F5F1EB', '#EDE8E0', '#4D6B53', '#2C2723'],
    },
    typography: {
      headingFont: 'sans',
      bodyFont: 'sans',
      styleLabel: 'Biomórfica & Tons Terrosos',
    },
    cardRadius: 'rounded-[32px_16px_28px_14px]',
    shadowStyle: 'shadow-[0_8px_20px_rgba(77,107,83,0.06)]',
  },

  'professional': {
    id: 'professional',
    name: 'Altto Professional',
    subtitle: 'Workstation & Gestão Técnica',
    concept: 'Aparência de software de engenharia documental. Barra superior de ferramentas Ribbon, alternador Tabela/Grid, painel de metadados e barra de status.',
    layoutParadigm: 'workstation',
    mode: 'light',
    colors: {
      bg: '#F1F3F5',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#D1D5DB',
      text: '#111827',
      textMuted: '#4B5563',
      accent: '#2563EB',
      accentHover: '#1D4ED8',
      accentText: '#FFFFFF',
      previewDots: ['#F1F3F5', '#FFFFFF', '#2563EB', '#111827'],
    },
    typography: {
      headingFont: 'sans',
      bodyFont: 'sans',
      styleLabel: 'Technical Ribbon & Data Grid',
    },
    cardRadius: 'rounded-md',
    shadowStyle: 'shadow-xs',
  },
};

const THEME_STORAGE_KEY = 'altto_app_design_theme';

export function getStoredThemeId(): ThemeId {
  if (typeof window === 'undefined') return 'light-lilac';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (saved === 'light-yellow') {
      return 'light-lilac';
    }
    if (saved && DESIGN_THEMES[saved]) {
      return saved;
    }
  } catch (e) {
    console.warn('Erro ao ler tema salvo:', e);
  }
  return 'light-lilac';
}

export function setStoredThemeId(themeId: ThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    window.dispatchEvent(new CustomEvent('altto_theme_changed', { detail: themeId }));
  } catch (e) {
    console.warn('Erro ao salvar tema:', e);
  }
}
