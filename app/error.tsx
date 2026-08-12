'use client';

import Link from 'next/link';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-slate-900 mb-2">500</h1>
        <h2 className="text-2xl font-semibold mb-4">Terjadi Kesalahan Server</h2>
        <p className="text-slate-600 mb-6">
          Maaf, terjadi masalah internal pada sistem. Silakan coba beberapa saat lagi.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition-colors"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
