import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Essence Financeiro — Gestão Financeira & Cobranças',
  description: 'Módulo financeiro e de cobranças integrado ao ecossistema Essence CRM.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-50 antialiased text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
