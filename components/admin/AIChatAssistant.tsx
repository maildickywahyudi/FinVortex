'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader as Loader2, Bot, ChevronDown, Minimize2, Settings, Key, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNasabah } from '@/lib/api';
import { Nasabah } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Berapa total nasabah lunas & keuntungan?',
  'Berapa total pengajuan pending?',
  'Tampilkan nasabah dengan pinjaman terbesar',
  'Berapa total dana yang sudah disalurkan?',
];

export function AIChatAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);

  // Custom OpenRouter Key & Model state
  const [userApiKey, setUserApiKey] = useState('');
  const [userModel, setUserModel] = useState('google/gemma-2-9b-it:free');
  const [keySaved, setKeySaved] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Halo! Saya Gemma AI Assistant (Gemma 2 9B / Gemini LMS). Saya siap membantu Anda menganalisis data pengajuan nasabah dan pertimbangan keputusan kredit LMS. Ada yang bisa saya bantu?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    getNasabah().then((data) => {
      setNasabahList(data || []);
    });

    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('lms_openrouter_key') || '';
      const storedModel = localStorage.getItem('lms_ai_model') || 'google/gemma-2-9b-it:free';
      setUserApiKey(storedKey);
      setUserModel(storedModel);
    }
  }, [open]);

  const handleSaveConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lms_openrouter_key', userApiKey.trim());
      localStorage.setItem('lms_ai_model', userModel);
    }
    setKeySaved(true);
    toast.success('Konfigurasi API Key & Model AI berhasil disimpan!');
    setTimeout(() => {
      setKeySaved(false);
      setShowConfig(false);
    }, 1200);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let assistantContent: string = '';

      // Prepare stats summary
      const totalCount = nasabahList.length;
      const approved = nasabahList.filter((n) => n.status === 'Approved');
      const lunas = nasabahList.filter((n) => n.status === 'Lunas');
      const pending = nasabahList.filter((n) => n.status === 'Pending');
      const rejected = nasabahList.filter((n) => n.status === 'Rejected');

      const totalDana = [...approved, ...lunas].reduce((sum, n) => {
        const val =
          typeof n.jumlahPinjaman === 'number'
            ? n.jumlahPinjaman
            : parseInt(String(n.jumlahPinjaman).replace(/[^0-9]/g, ''), 10) || 0;
        return sum + val;
      }, 0);

      const totalKeuntungan = lunas.reduce((sum, n) => {
        const principal =
          typeof n.jumlahPinjaman === 'number'
            ? n.jumlahPinjaman
            : parseInt(String(n.jumlahPinjaman).replace(/[^0-9]/g, ''), 10) || 0;
        const bungaVal = Number(n.bunga) || 0;
        const prof = bungaVal <= 100 && bungaVal > 0 ? Math.round(principal * (bungaVal / 100)) : bungaVal;
        return sum + prof;
      }, 0);

      // First, attempt calling backend route /api/chat
      try {
        const apiRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            userApiKey: userApiKey.trim(),
            userModel: userModel,
            nasabahStats: {
              total: totalCount,
              approved: approved.length,
              lunas: lunas.length,
              pending: pending.length,
              rejected: rejected.length,
              totalDanaDisalurkan: totalDana,
              totalKeuntungan,
            },
          }),
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.content) {
            assistantContent = apiData.content;
          }
        }
      } catch (e) {
        console.warn('Call to /api/chat failed, falling back:', e);
      }

      // If backend route did not return content, attempt client OpenRouter call
      const activeKey = userApiKey.trim() || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
      if (!assistantContent && activeKey && activeKey.trim() !== '') {
        try {
          const systemPrompt = `Anda adalah Gemma AI Assistant (Gemma 2 9B) untuk Sistem Management Pinjaman (LMS).
Data Real-time Sistem LMS Saat Ini:
- Total Pengajuan: ${totalCount}
- Approved: ${approved.length}
- Lunas: ${lunas.length}
- Pending: ${pending.length}
- Rejected: ${rejected.length}
- Total Dana Disalurkan: Rp ${totalDana.toLocaleString('id-ID')}
- Total Keuntungan Bunga Lunas: Rp ${totalKeuntungan.toLocaleString('id-ID')}

Tugas Anda: Jawab pertanyaan admin secara relevan, akurat sesuai data di atas, singkat, profesional, dan solutif dalam Bahasa Indonesia.`;

          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${activeKey}`,
              'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
              'X-Title': 'LMS Loan System',
            },
            body: JSON.stringify({
              model: userModel || 'google/gemma-2-9b-it:free',
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: text },
              ],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.choices?.[0]?.message?.content) {
              assistantContent = data.choices[0].message.content;
            }
          }
        } catch (err) {
          console.warn('OpenRouter API request failed:', err);
        }
      }

      // Fallback to smart local response generator
      if (!assistantContent) {
        assistantContent = generateSmartResponse(text, nasabahList);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: generateSmartResponse(text, nasabahList) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Positioned at bottom-4 right-4 z-40 so it doesn't cover action buttons) */}
      {!open && (
        <div className="fixed bottom-3 right-4 z-40 flex items-center gap-2">
          {!minimized ? (
            <div
              onClick={() => setOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
              className="group flex cursor-pointer items-center gap-2.5 rounded-full bg-navy px-4 py-2.5 text-xs font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-slate-800 border border-gold/40"
              aria-label="Buka AI Assistant"
            >
              <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-nav-gradient">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
              </div>
              <span>Gemma AI</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMinimized(true);
                }}
                title="Minimalkan tombol AI agar tidak menghalangi tabel"
                className="ml-1 rounded p-0.5 text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setMinimized(false);
                setOpen(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-gold shadow-md hover:scale-110 transition-transform border border-gold/30"
              title="Buka AI Assistant"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-3 right-4 z-50 flex h-[520px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nav-gradient">
                <Bot className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Gemma AI
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-gold/20 text-gold border border-gold/30 font-mono">
                    {userModel.includes('free') ? 'Gemma Free' : userModel.split('/')[1] || 'OpenRouter'}
                  </span>
                </p>
                <p className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {userApiKey ? 'OpenRouter Connected' : 'Gemma Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Konfigurasi API Key & Model AI"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Tutup Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Settings Panel Popover inside Chat */}
          {showConfig && (
            <div className="p-3.5 bg-slate-900 text-slate-100 border-b border-slate-800 space-y-3 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-gold">
                  <Key className="h-3.5 w-3.5" /> Konfigurasi OpenRouter AI
                </span>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  OpenRouter API Key (Opsional)
                </label>
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-white font-mono placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-400">
                  Gunakan key Anda dari <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="underline text-blue-400">openrouter.ai</a> untuk Gemma gratis / berbayar.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Pilih Model AI
                </label>
                <select
                  value={userModel}
                  onChange={(e) => setUserModel(e.target.value)}
                  className="w-full h-8 text-xs bg-slate-950 border border-slate-800 text-white rounded-md px-2 focus:outline-none focus:border-blue-500 font-sans"
                >
                  <option value="google/gemma-2-9b-it:free">Gemma 2 9B (Gratis / Free)</option>
                  <option value="google/gemma-2-27b-it">Gemma 2 27B</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>

              <Button
                onClick={handleSaveConfig}
                size="sm"
                className="w-full h-7 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium gap-1"
              >
                {keySaved ? <Check className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {keySaved ? 'Tersimpan!' : 'Simpan Pengaturan AI'}
              </Button>
            </div>
          )}

          {/* Connection Status Banner */}
          <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Indikator AI: <strong className="text-slate-800 dark:text-slate-200">{userApiKey ? 'OpenRouter Connected' : 'Gemma Active'}</strong>
            </span>
            <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              {userModel.split('/')[1] || userModel}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'nav-gradient text-white font-medium'
                      : 'border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 soft-shadow whitespace-pre-line',
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 soft-shadow text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  Gemma sedang berpikir...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="border-t border-border dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 transition-colors hover:bg-blue-100 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Tanyakan ke Gemma AI..."
              className="flex-1 border-none bg-slate-100 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-nav-gradient text-white transition-opacity disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function parseLoanAmount(item: Nasabah): number {
  if (typeof item.jumlahPinjaman === 'number') return item.jumlahPinjaman;
  if (typeof item.jumlahPinjaman === 'string') {
    const cleaned = (item.jumlahPinjaman as string).replace(/[^0-9]/g, '');
    return parseInt(cleaned, 10) || 0;
  }
  return 0;
}

function generateSmartResponse(query: string, list: Nasabah[]): string {
  const q = query.toLowerCase();
  const totalCount = list.length;
  const approved = list.filter((n) => n.status === 'Approved');
  const lunas = list.filter((n) => n.status === 'Lunas');
  const pending = list.filter((n) => n.status === 'Pending');
  const rejected = list.filter((n) => n.status === 'Rejected');

  const totalDanaDisalurkan = [...approved, ...lunas].reduce((sum, n) => sum + parseLoanAmount(n), 0);
  const formattedDana = `Rp ${totalDanaDisalurkan.toLocaleString('id-ID')}`;

  const totalKeuntungan = lunas.reduce((sum, n) => {
    const principal = parseLoanAmount(n);
    const bungaVal = Number(n.bunga) || 0;
    const prof = bungaVal <= 100 && bungaVal > 0 ? Math.round(principal * (bungaVal / 100)) : bungaVal;
    return sum + prof;
  }, 0);
  const formattedKeuntungan = `Rp ${totalKeuntungan.toLocaleString('id-ID')}`;

  if (q.includes('lunas') || q.includes('untung') || q.includes('profit') || q.includes('bunga')) {
    if (lunas.length === 0) {
      return `Saat ini belum ada nasabah dengan status **Lunas**. Ketika ada nasabah Approved yang membayar lunas pinjamannya, tandai status sebagai Lunas di tabel. Statistik keuntungan bunga akan otomatis terhitung!`;
    }
    const names = lunas.map((n) => `${n.nama} (Rp ${parseLoanAmount(n).toLocaleString('id-ID')})`).join(', ');
    return `Terdapat **${lunas.length} nasabah Lunas**: ${names}.\n\nTotal estimasi keuntungan (bunga) yang berhasil didapatkan dari nasabah lunas adalah **${formattedKeuntungan}**.`;
  }

  if (q.includes('env') || q.includes('key') || q.includes('secret') || q.includes('openrouter') || q.includes('online')) {
    return `Mengenai Koneksi Online AI:\n1. Kunci API Gemini / OpenRouter yang diisikan di Secrets AI Studio atau .env disalurkan secara otomatis ke backend server /api/chat.\n2. AI terhubung secara online dengan model Gemma 4 31B / Gemini Flash.\n3. Jika tidak ada API Key, AI tetap berjalan cerdas menggunakan Smart LMS Engine bawaan tanpa error!`;
  }

  if (q.includes('disalurkan') || q.includes('dana')) {
    if (totalCount === 0) {
      return 'Saat ini belum ada data pengajuan nasabah di sistem.';
    }
    return `Total dana yang sudah disalurkan ke nasabah (Approved & Lunas) adalah **${formattedDana}** dari total **${approved.length + lunas.length}** pengajuan disetujui.`;
  }

  if (q.includes('pending')) {
    if (pending.length === 0) {
      return 'Saat ini tidak ada pengajuan pending. Semua pengajuan telah diproses.';
    }
    const names = pending
      .slice(0, 3)
      .map((n) => `${n.nama} (Rp ${parseLoanAmount(n).toLocaleString('id-ID')})`)
      .join(', ');
    return `Saat ini terdapat **${pending.length} pengajuan Pending**. ${
      pending.length > 0 ? `Antara lain: ${names}${pending.length > 3 ? '...' : ''}.` : ''
    } Direkomendasikan untuk segera diproses di tabel pengajuan.`;
  }

  if (q.includes('terbesar') || q.includes('pinjaman terbesar')) {
    if (list.length === 0) return 'Belum ada data nasabah untuk ditinjau.';
    const sorted = [...list].sort((a, b) => parseLoanAmount(b) - parseLoanAmount(a));
    const top = sorted[0];
    return `Nasabah dengan pengajuan pinjaman terbesar adalah **${top.nama}** (${top.lokasi || 'Lokasi N/A'}) dengan nominal **Rp ${parseLoanAmount(top).toLocaleString('id-ID')}** (Tenor: ${top.tenor || '-'} hari, Status: **${top.status}**).`;
  }

  if (q.includes('follow') || q.includes('tindak lanjut')) {
    if (pending.length === 0) {
      return 'Tidak ada nasabah pending yang memerlukan follow-up saat ini.';
    }
    const listPendingText = pending
      .slice(0, 5)
      .map((n, idx) => `${idx + 1}. **${n.nama}** (${n.whatsapp}) - Rp ${parseLoanAmount(n).toLocaleString('id-ID')}`)
      .join('\n');
    return `Berikut daftar **${pending.length} nasabah Pending** yang perlu di-follow up:\n\n${listPendingText}\n\nSilakan gunakan aksi Approve/Reject di tabel data nasabah.`;
  }

  if (q.includes('rejected') || q.includes('ditolak')) {
    return `Terdapat **${rejected.length} pengajuan Ditolak (Rejected)** dari total ${totalCount} pengajuan. Tingkat penolakan: ${totalCount > 0 ? Math.round((rejected.length / totalCount) * 100) : 0}%.`;
  }

  if (q.includes('approved') || q.includes('disetujui')) {
    return `Terdapat **${approved.length} pengajuan Disetujui (Approved)** dan **${lunas.length} Lunas** dengan total dana disalurkan **${formattedDana}**.`;
  }

  if (q.includes('total') || q.includes('ringkasan') || q.includes('rekap')) {
    return `**Rekap Data LMS Real-time:**\n- Total Pengajuan: **${totalCount}** nasabah\n- Approved: **${approved.length}** nasabah\n- Lunas: **${lunas.length}** nasabah (Keuntungan: ${formattedKeuntungan})\n- Pending: **${pending.length}** nasabah\n- Rejected: **${rejected.length}** nasabah`;
  }

  if (list.length > 0) {
    return `Saya Gemma AI Assistant. Saat ini tercatat **${totalCount} total pengajuan** (${approved.length} Approved, ${lunas.length} Lunas, ${pending.length} Pending, ${rejected.length} Rejected) dengan total dana disalurkan **${formattedDana}** dan total keuntungan bunga lunas **${formattedKeuntungan}**. Ada yang ingin Anda analisis lebih lanjut?`;
  }

  return 'Saya Gemma AI Assistant LMS. Saya dapat membantu Anda menganalisis data pengajuan nasabah, nasabah Lunas, statistik keuntungan (profit), dan rekomendasi keputusan kredit.';
}
