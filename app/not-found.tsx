import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Halaman Tidak Ditemukan</h2>
        <p className="text-slate-600 mb-6">
          Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
