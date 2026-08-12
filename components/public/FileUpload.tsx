/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileImage, AlertCircle, ImageUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
  hint?: string;
  maxSizeMB?: number;
  icon?: 'ktp' | 'selfie' | 'socmed';
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function FileUpload({
  label,
  onFileSelect,
  required,
  hint,
  maxSizeMB = 2,
  icon = 'ktp',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Format file harus JPG atau PNG');
      return;
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Ukuran file maksimal ${maxSizeMB}MB`);
      return;
    }
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    onFileSelect(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName('');
    setFileSize('');
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const iconMap = {
    ktp: 'ID Card / KTP',
    selfie: 'Foto Selfie',
    socmed: 'Screenshot Social Media',
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {preview ? (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="relative h-40 w-full bg-slate-100">
            <img
              src={preview}
              alt={label}
              className="h-full w-full object-cover"
              onError={() => {
                toast.error('Gagal membaca gambar');
                handleRemove();
              }}
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-rose-600"
              aria-label="Hapus file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileImage className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="truncate font-medium text-slate-600">{fileName}</span>
            </div>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {fileSize}
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-7 transition-all',
            dragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01]'
              : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30',
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
              dragging ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600',
            )}
          >
            <ImageUp className="h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">
              Klik atau seret {iconMap[icon]} ke sini
            </p>
            {hint && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                <AlertCircle className="h-3 w-3" /> {hint}
              </p>
            )}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
