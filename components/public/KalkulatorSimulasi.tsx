'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Calendar, DollarSign, Percent, ArrowRight, ShieldCheck, CheckCircle2, FileText, Info } from 'lucide-react';
import { formatRupiah, addDays, formatDate } from '@/lib/utils';
import { getConfig } from '@/lib/api';
import type { AppConfig } from '@/types';

interface KalkulatorSimulasiProps {
  onUseSimulation?: (amount: number, tenor: number) => void;
}

export function KalkulatorSimulasi({ onUseSimulation }: KalkulatorSimulasiProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [amount, setAmount] = useState<number>(1000000);
  const [tenor, setTenor] = useState<number>(30); // days
  const [interestPercent, setInterestPercent] = useState<number>(5); // 5%

  useEffect(() => {
    const loadConf = () => getConfig().then(setConfig);
    loadConf();
    window.addEventListener('lms_config_updated', loadConf);
    return () => window.removeEventListener('lms_config_updated', loadConf);
  }, []);

  const isCicilanEnabled = config?.enableCicilan ?? false;

  const presetAmounts = [200000, 500000, 1000000, 2000000, 5000000, 10000000];
  const presetTenors = [
    { label: '7 Hari', value: 7 },
    { label: '14 Hari', value: 14 },
    { label: '30 Hari', value: 30 },
    { label: '60 Hari', value: 60 },
    { label: '90 Hari', value: 90 },
  ];

  // Calculation formulas
  const interestAmount = Math.round(amount * (interestPercent / 100));
  const totalRepayment = amount + interestAmount;
  const dueDate = addDays(new Date().toISOString(), tenor);

  // Estimasi angsuran (misal dibayar mingguan jika tenor > 14 hari)
  const isWeekly = tenor >= 14;
  const numInstallments = isWeekly ? Math.ceil(tenor / 7) : 1;
  const installmentPerPeriod = Math.round(totalRepayment / numInstallments);

  // Schedule breakdown generator
  const getSchedule = () => {
    const schedule = [];
    const now = new Date();
    const periodDays = isWeekly ? 7 : tenor;

    for (let i = 1; i <= numInstallments; i++) {
      const itemDate = new Date(now);
      itemDate.setDate(now.getDate() + (i * periodDays));
      const amountPerInst = i === numInstallments 
        ? totalRepayment - (installmentPerPeriod * (numInstallments - 1))
        : installmentPerPeriod;

      schedule.push({
        installmentNo: i,
        date: formatDate(itemDate.toISOString()),
        pokok: Math.round(amount / numInstallments),
        bunga: Math.round(interestAmount / numInstallments),
        total: amountPerInst,
      });
    }
    return schedule;
  };

  const schedule = getSchedule();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-blue-100 bg-white shadow-xl shadow-blue-900/5">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <Calculator className="h-4 w-4" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Simulasi & Kalkulator Pinjaman Interaktif
                </CardTitle>
              </div>
              <CardDescription className="mt-1 text-xs text-slate-500">
                Hitung estimasi angsuran, total pengembalian, dan tanggal jatuh tempo secara cepat & akurat (100% Gratis).
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold gap-1 text-xs py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Bebas Biaya Tersembunyi
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Form Column */}
            <div className="space-y-5">
              {/* Jumlah Pinjaman Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Jumlah Pinjaman (Rp)</Label>
                  <span className="text-xs font-bold text-blue-700">{formatRupiah(amount)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(100000, Number(e.target.value) || 0))}
                    className="pl-9 font-semibold text-slate-800"
                    step={100000}
                    min={100000}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all ${
                        amount === preset
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {formatRupiah(preset).replace(',00', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jangka Waktu (Tenor) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Jangka Waktu (Tenor)</Label>
                  <span className="text-xs font-bold text-blue-700">{tenor} Hari</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presetTenors.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTenor(t.value)}
                      className={`flex-1 min-w-[70px] text-xs font-bold py-2 px-3 rounded-lg border transition-all text-center ${
                        tenor === t.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suku Bunga Estimasi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Estimasi Suku Bunga (%)</Label>
                  <span className="text-xs font-bold text-amber-600">{interestPercent}% / Periode</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={interestPercent}
                    onChange={(e) => setInterestPercent(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200 min-w-[45px] text-center">
                    {interestPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Simulation Result Card Column */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-slate-50 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Hasil Estimasi Simulasi</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none text-[10px]">
                    Sistem Otomatis
                  </Badge>
                </div>

                <div className="space-y-2 border-b border-slate-200/80 pb-3">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Pokok Pinjaman:</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Estimasi Bunga ({interestPercent}%):</span>
                    <span className="font-semibold text-amber-700">+{formatRupiah(interestAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Estimasi Tanggal Jatuh Tempo:</span>
                    <span className="font-semibold text-slate-800">{formatDate(dueDate)}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-xs space-y-1 text-center">
                  <span className="text-xs text-slate-500 font-medium">Total Pengembalian Pinjaman</span>
                  <p className="text-2xl font-extrabold text-blue-700">{formatRupiah(totalRepayment)}</p>
                  {isCicilanEnabled && (
                    <p className="text-[11px] text-slate-500">
                      Estimasi {numInstallments}x cicilan @ <strong className="text-slate-800">{formatRupiah(installmentPerPeriod)}</strong> / {isWeekly ? 'minggu' : 'periode'}
                    </p>
                  )}
                </div>
              </div>

              {onUseSimulation && (
                <Button
                  onClick={() => onUseSimulation(amount, tenor)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 py-5 rounded-xl shadow-md transition-all"
                >
                  Gunakan Simulasi Ini di Form Pengajuan
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Schedule Breakdown Table */}
          {isCicilanEnabled ? (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Simulasi Jadwal Pembayaran Cicilan ({numInstallments} Angsuran)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Sistem Angsuran Flat Rate
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 font-semibold">Angsuran Ke-</th>
                      <th className="p-2.5 font-semibold">Estimasi Tanggal</th>
                      <th className="p-2.5 font-semibold">Pokok</th>
                      <th className="p-2.5 font-semibold">Bunga</th>
                      <th className="p-2.5 font-semibold text-right">Total Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {schedule.map((row) => (
                      <tr key={row.installmentNo} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-bold text-blue-700">#{row.installmentNo}</td>
                        <td className="p-2.5">{row.date}</td>
                        <td className="p-2.5">{formatRupiah(row.pokok)}</td>
                        <td className="p-2.5 text-amber-700">{formatRupiah(row.bunga)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatRupiah(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1 italic">
                <Info className="h-3 w-3 shrink-0 text-blue-500" />
                Simulasi di atas bersifat estimasi awal. Besaran bunga resmi & tanggal pasti akan dikonfirmasi saat pengajuan disetujui.
              </p>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              Rincian jadwal cicilan saat ini dinonaktifkan oleh administrator.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
