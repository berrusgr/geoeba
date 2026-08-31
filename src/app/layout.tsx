import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/state/ThemeContext';
import { CurriculumProvider } from '@/state/CurriculumContext';
import { WorkspaceProvider } from '@/state/WorkspaceContext';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'GeoEBA - Etkileşimli Matematik ve Geometri Platformu',
  description:
    'İlkokul, ortaokul ve lise düzeyinde etkileşimli matematik, geometri ve 3D simülasyon platformu.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-[#faf8f5] dark:bg-[#121316] text-foreground antialiased selection:bg-primary/20">
        <ThemeProvider>
          <CurriculumProvider>
            <WorkspaceProvider>
              <div className="flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#121316]">
                <Header />
                <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#faf8f5] dark:bg-[#121316] relative">{children}</main>
              </div>
            </WorkspaceProvider>
          </CurriculumProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
