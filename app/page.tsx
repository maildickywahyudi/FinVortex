'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Shield, Zap, Lock, Clock, FilePlus, SearchCheck, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConfig } from '@/lib/api';
import type { AppConfig } from '@/types';

const FormPengajuan = dynamic(() => import('@/components/public/FormPengajuan').then((m) => m.FormPengajuan), {
  ssr: false,
  loading: () => <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>,
});
const CekStatusPengajuan = dynamic(() => import('@/components/public/CekStatusPengajuan').then((m) => m.CekStatusPengajuan), {
  ssr: false,
  loading: () => <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>,
});
const KalkulatorSimulasi = dynamic(() => import('@/components/public/KalkulatorSimulasi').then((m) => m.KalkulatorSimulasi), {
  ssr: false,
  loading: () => <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>,
});

export default function PublicPage() {
  const [activeTab, setActiveTab] = useState<'form' | 'status' | 'simulasi'>('form');
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    if (hadDark) html.classList.remove('dark');
    return () => {
      if (hadDark) html.classList.add('dark');
    };
  }, []);

  useEffect(() => {
    const loadConf = () => {
      getConfig().then((c) => {
        setConfig(c);
        if (!c.enableCicilan && activeTab === 'simulasi') {
          setActiveTab('form');
        }
      });
    };
    loadConf();
    window.addEventListener('lms_config_updated', loadConf);
    return () => window.removeEventListener('lms_config_updated', loadConf);
  }, [activeTab]);

  const handleUseSimulation = (amount: number, tenor: number) => {
    setActiveTab('form');
  };

  const showCicilanTab = config?.enableCicilan ?? false;

  const trustBadges = useMemo(
    () => [
      { icon: Shield, label: '100% Aman' },
      { icon: Zap, label: 'Proses Cepat' },
      { icon: Lock, label: 'Data Terenkripsi' },
      { icon: Clock, label: '24 Jam Approval' },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50 grid-pattern" style={{ colorScheme: 'light' }}>
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-nav-gradient text-white">
              <span className="font-bold">L</span>
            </div>
            <div>
              <span className="font-bold text-slate-800">LMS</span>
              <span className="ml-1 text-xs font-medium text-gold">Loan System</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {showCicilanTab && (
              <button
                onClick={() => setActiveTab('simulasi')}
                className={cn(
                  'hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                  activeTab === 'simulasi'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-slate-600 hover:bg-slate-100 border-slate-200'
                )}
              >
                <Calculator className="h-3.5 w-3.5 text-blue-600" />
                Simulasi Cicilan
              </button>
            )}
            <button
              onClick={() => setActiveTab('status')}
              className={cn(
                'hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                activeTab === 'status'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 border-slate-200'
              )}
            >
              <SearchCheck className="h-3.5 w-3.5 text-blue-600" />
              Cek Status
            </button>
            <Link
              href="/admin/login"
              className="rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10 pb-8">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
            <Zap className="h-3.5 w-3.5" /> Proses Cepat & Aman 1x24 Jam
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-800 sm:text-4xl md:text-5xl">
            <span className="block">Layanan Pinjaman Online</span>
            <span className="mt-2 block bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              {activeTab === 'form'
                ? 'Secepat Kilat & Terpercaya'
                : activeTab === 'simulasi'
                ? 'Hitung Simulasi Angsuran & Cicilan'
                : 'Lacak Status LN Number Anda'}
            </span>
          </h1>
          <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-xs sm:text-base leading-relaxed text-slate-600">
            {activeTab === 'form'
              ? 'Isi formulir di bawah ini dengan data yang valid. Tim kami akan memverifikasi dan menghubungi Anda dalam 1x24 jam.'
              : activeTab === 'simulasi'
              ? 'Gunakan kalkulator simulasi interaktif untuk menghitung angsuran, total pengembalian, dan jadwal cicilan sebelum mengajukan.'
              : 'Masukkan nomor ID Pengajuan (LN Number) Anda untuk mengetahui progres verifikasi, persetujuan, atau alasan penolakan.'}
          </p>

          {/* Navigation Tabs Switcher */}
          <div className="mt-6 sm:mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/60 shadow-inner flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveTab('form')}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200',
                activeTab === 'form'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FilePlus className="h-4 w-4" /> Form Pengajuan
            </button>
            {showCicilanTab && (
              <button
                onClick={() => setActiveTab('simulasi')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200',
                  activeTab === 'simulasi'
                    ? 'bg-white text-blue-700 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Calculator className="h-4 w-4" /> Simulasi Cicilan
              </button>
            )}
            <button
              onClick={() => setActiveTab('status')}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200',
                activeTab === 'status'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <SearchCheck className="h-4 w-4" /> Cek Status
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
          {trustBadges.map((item) => (
            <div
              key={item.label}
              className="glass flex flex-col items-center gap-1.5 rounded-xl border border-border/50 p-3 soft-shadow text-center"
            >
              <item.icon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-600">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="glass rounded-2xl border border-border/50 p-4 sm:p-8 premium-shadow">
          {activeTab === 'form' ? (
            <FormPengajuan />
          ) : activeTab === 'simulasi' ? (
            <KalkulatorSimulasi onUseSimulation={handleUseSimulation} />
          ) : (
            <CekStatusPengajuan />
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} LMS — Loan Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
