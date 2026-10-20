import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#F8F5FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'Altto — Leitor de Livros',
  description: 'Aplicativo editorial de leitura cristã com áreas exclusivas para Bíblia Sagrada, Devocional diário e Biblioteca digital.',
  applicationName: 'Altto',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Altto',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  openGraph: {
    title: 'Altto — Leitor de Livros',
    description: 'Aplicativo editorial de leitura cristã com áreas exclusivas para Bíblia Sagrada, Devocional diário e Biblioteca digital.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Altto — Leitor de Livros',
    description: 'Aplicativo editorial de leitura cristã com áreas exclusivas para Bíblia Sagrada, Devocional diário e Biblioteca digital.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className="h-full bg-white">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Altto" />
      </head>
      <body suppressHydrationWarning className="h-full bg-white text-slate-900 antialiased selection:bg-violet-500/20 selection:text-violet-950">
        {children}
      </body>
    </html>
  );
}
