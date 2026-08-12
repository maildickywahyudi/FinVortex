import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { PwaRegister } from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'KSP Pinjaman Online — System & Form Pengajuan',
  description:
    'Sistem manajemen pinjaman nasabah profesional dengan pengajuan online, dashboard admin, dan analitik lengkap.',
  manifest: '/manifest.json',
  themeColor: '#1e3a8a',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KSP Mobile',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900" suppressHydrationWarning>
        <Providers>
          {children}
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}

