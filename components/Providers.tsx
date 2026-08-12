'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from 'sonner';
import { ReactNode, useState, useEffect } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        {mounted && (
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  'rounded-xl border border-border bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 shadow-lg',
              },
            }}
          />
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}
