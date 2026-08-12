'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarClock } from 'lucide-react';
import type { Nasabah } from '@/types';
import { formatRupiah, toISODate } from '@/lib/utils';
import 'react-day-picker/dist/style.css';
import './calendar-theme.css';

interface CalendarReminderProps {
  data: Nasabah[];
}

export function CalendarReminder({ data }: CalendarReminderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const approvedItems = data.filter((d) => d.status === 'Approved' && d.tanggalJatuhTempo);
  const dateMap: Record<string, Nasabah[]> = {};
  approvedItems.forEach((n) => {
    const key = toISODate(new Date(n.tanggalJatuhTempo!));
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push(n);
  });

  const dueDates = Object.keys(dateMap).map((d) => new Date(d));

  const modifiers = {
    due: dueDates,
  };

  const modifiersClassNames = {
    due: 'rdp-day-due',
  };

  if (!mounted) {
    return (
      <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-5 soft-shadow h-[380px] flex items-center justify-center">
        <span className="text-xs text-slate-400 dark:text-slate-500">Memuat kalender...</span>
      </Card>
    );
  }

  return (
    <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-5 soft-shadow">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-full bg-rose-100 dark:bg-rose-950 p-2">
          <CalendarClock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Kalender Jatuh Tempo</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal jatuh tempo pinjaman Approved</p>
        </div>
      </div>
      <TooltipProvider>
        <div className="flex justify-center overflow-x-auto w-full py-1">
          <DayPicker
            mode="single"
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            showOutsideDays
            classNames={{
              caption: 'rdp-caption',
              caption_label: 'rdp-caption-label',
              head_cell: 'rdp-head-cell',
              cell: 'rdp-cell',
              day: 'rdp-day',
              day_today: 'rdp-day-today',
              nav_button: 'rdp-nav-button',
              month: 'rdp-month',
            }}
            components={{
              DayContent: (props) => {
                const dateKey = toISODate(props.date);
                const items = dateMap[dateKey];
                if (items && items.length > 0) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="relative inline-flex items-center justify-center">
                          {props.date.getDate()}
                          <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-rose-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold">{items.length} pinjaman jatuh tempo</p>
                          {items.slice(0, 3).map((n) => (
                            <p key={n.id} className="text-xs text-slate-500 dark:text-slate-400">
                              {n.nama} — {formatRupiah(n.jumlahPinjaman)}
                            </p>
                          ))}
                          {items.length > 3 && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">+{items.length - 3} lainnya</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return <span>{props.date.getDate()}</span>;
              },
            }}
          />
        </div>
      </TooltipProvider>
    </Card>
  );
}
