'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getNasabah } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { BellRing, ExternalLink } from 'lucide-react';

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

export function NewApplicationToastNotifier() {
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const checkNewApplications = async () => {
      try {
        const list = await getNasabah();
        if (!list || list.length === 0) return;

        // On first run, initialize known IDs set without toasting
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(list.map((n) => n.id));
          return;
        }

        // Check for new pending applications
        const newItems = list.filter((n) => !knownIdsRef.current!.has(n.id));

        if (newItems.length > 0) {
          newItems.forEach((item) => {
            knownIdsRef.current!.add(item.id);

            playNotificationChime();

            toast.info(`📥 Pengajuan Pinjaman Baru!`, {
              description: `${item.nama} - ${formatRupiah(item.jumlahPinjaman)} (${item.tenor} Hari)`,
              duration: 8000,
              icon: <BellRing className="h-5 w-5 text-blue-500 animate-bounce" />,
              action: {
                label: 'Lihat Detail',
                onClick: () => {
                  if (typeof window !== 'undefined') {
                    window.location.href = `/admin/table?highlight=${item.id}`;
                  }
                },
              },
            });
          });
        }
      } catch (err) {
        console.error('Notifier check error:', err);
      }
    };

    // Initial sync
    checkNewApplications();

    // Listen to custom LMS events and window storage events
    const handleUpdate = () => checkNewApplications();
    window.addEventListener('lms_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Poll every 10 seconds for real-time background spreadsheet sync
    const interval = setInterval(checkNewApplications, 10000);

    return () => {
      window.removeEventListener('lms_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  return null;
}
