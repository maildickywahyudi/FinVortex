'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-xl border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 transition-colors"
      title={theme === 'dark' ? 'Ganti ke Mode Terang (Light)' : 'Ganti ke Mode Gelap (Dark)'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-90" />
      ) : (
        <Moon className="h-4 w-4 text-blue-300 animate-in spin-in-90" />
      )}
      <span className="sr-only">Toggle Dark Mode</span>
    </Button>
  );
}
