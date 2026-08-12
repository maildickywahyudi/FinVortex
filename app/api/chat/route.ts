import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, messages, nasabahStats, userApiKey, userModel } = await req.json();

    const openRouterKey =
      (userApiKey && typeof userApiKey === 'string' && userApiKey.trim() !== '' ? userApiKey.trim() : null) ||
      process.env.OPENROUTER_API_KEY ||
      process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

    const geminiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const selectedModel = userModel || 'google/gemma-2-9b-it:free';

    // Construct system prompt with real-time stats
    const systemInstruction = `Anda adalah Gemma AI Assistant (Gemma 4 31B / Gemini LMS) untuk Sistem Management Pinjaman (LMS).
Data Real-time Sistem LMS Saat Ini:
- Total Pengajuan: ${nasabahStats?.total || 0}
- Approved (Disetujui): ${nasabahStats?.approved || 0}
- Lunas: ${nasabahStats?.lunas || 0}
- Pending: ${nasabahStats?.pending || 0}
- Rejected: ${nasabahStats?.rejected || 0}
- Total Dana Disalurkan: Rp ${(nasabahStats?.totalDanaDisalurkan || 0).toLocaleString('id-ID')}
- Total Keuntungan (Bunga Lunas): Rp ${(nasabahStats?.totalKeuntungan || 0).toLocaleString('id-ID')}

Tugas Anda: Jawab pertanyaan admin secara relevan, akurat sesuai data di atas, singkat, profesional, dan solutif dalam Bahasa Indonesia. Jika ditanya tentang nasabah Lunas atau Keuntungan, gunakan angka dari statistik real-time di atas.`;

    // 1. Try OpenRouter API if user provided an OpenRouter key OR env has OpenRouter key
    if (openRouterKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://ai.studio',
            'X-Title': 'LMS Loan System',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: 'system', content: systemInstruction },
              ...(messages || []),
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            return NextResponse.json({ content, provider: 'openrouter', model: selectedModel });
          }
        }
      } catch (err) {
        console.warn('OpenRouter API request error:', err);
      }
    }

    // 2. Try GoogleGenAI SDK if GEMINI_API_KEY is available as fallback
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemInstruction}\n\nPertanyaan Admin: ${prompt}`,
        });
        if (response && response.text) {
          return NextResponse.json({ content: response.text, provider: 'gemini' });
        }
      } catch (err) {
        console.warn('Google GenAI SDK error:', err);
      }
    }

    return NextResponse.json({ content: null, message: 'No active API key configured' });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
