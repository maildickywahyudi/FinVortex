import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Image base64 is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is missing." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Remove base64 data URI header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const modelsToTry = ["gemini-2.5-flash", "gemini-3.5-flash"];
    let responseText = "";

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || "image/jpeg",
                },
              },
              {
                text: `Anda adalah pakar OCR verifikasi e-KTP Indonesia berbasis Vision AI yang sangat akurat.
Tugas Anda adalah membaca foto e-KTP ini dan mengekstrak 3 bidang utama:

1. nik: 16 digit angka NIK KTP (berada di bagian atas e-KTP, tepat di samping/bawah kata 'NIK').
   - HANYA 16 digit angka murni tanpa spasi atau karakter lain.

2. nama: NAMA LENGKAP pemilik KTP.
   - Tertera di baris "Nama" (biasanya tepat di bawah NIK).
   - Ambil NAMA LENGKAP secara UTUH dalam HURUF KAPITAL (contoh: "BUDI SANTOSO", "SITI AMINAH", "AHMAD DANI SUBAGJA").
   - PENTING: Jangan melewatkan kata dalam nama. Jangan memotong nama belakang.
   - Hapus tulisan "Nama", "Nama :", "NIK", "Gol. Darah", "PROVINSI", "KOTA", "KABUPATEN" dari isi nama.
   - Jika terdapat titik, koma, atau petik (misal gelar/nama), pertahankan.

3. tanggalLahir: Tanggal lahir pemilik KTP dalam format ISO YYYY-MM-DD.
   - Tertera di baris "Tempat/Tgl Lahir" (misal: "JAKARTA, 17-08-1995" atau "17 AGUSTUS 1995" atau "05/12/1990").
   - Ekstrak tanggalnya dan format ke YYYY-MM-DD (contoh: "1995-08-17").

Jika ada bidang yang tidak terlihat atau buram, berikan string kosong "".`,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nik: { type: Type.STRING, description: "16 digit NIK KTP" },
                nama: { type: Type.STRING, description: "Nama lengkap di KTP dalam huruf kapital" },
                tanggalLahir: { type: Type.STRING, description: "Tanggal lahir format YYYY-MM-DD" },
              },
              required: ["nik", "nama", "tanggalLahir"],
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} OCR attempt failed, trying next:`, err);
      }
    }

    const data = JSON.parse(responseText || "{}");

    let cleanNama = data.nama ? String(data.nama).trim() : "";
    cleanNama = cleanNama
      .replace(/^(nama|nama\s*lengkap|name)\s*[:\-\s]*/i, "")
      .replace(/^[:\-\s]+/, "")
      .replace(/[:\-\s]+$/, "")
      .trim()
      .toUpperCase();

    let cleanNik = data.nik ? String(data.nik).replace(/\D/g, "").slice(0, 16) : "";
    let cleanTgl = data.tanggalLahir ? String(data.tanggalLahir).trim() : "";

    return NextResponse.json({
      success: true,
      data: {
        nik: cleanNik,
        nama: cleanNama,
        tanggalLahir: cleanTgl,
      },
    });
  } catch (error: any) {
    console.error("Error processing KTP OCR with Gemini:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses gambar KTP" },
      { status: 500 }
    );
  }
}
