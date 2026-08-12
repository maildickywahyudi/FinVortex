'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { X, Plus, Check, Loader as Loader2, Save, Tag, Settings as SettingsIcon, FileText, KeyRound, Shield, ShieldCheck, UserPlus, Trash2, Eye, EyeOff, UserCheck, Lock, UserCog, Pencil, Database, Globe, ExternalLink, RefreshCw, CircleCheck as CheckCircle2, Bot, Sparkles, Zap, Key } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getConfig,
  updateConfig,
  getAdminUsers,
  updateAdminPassword,
  updateAdminUser,
  addAdminUser,
  deleteAdminUser,
  getEffectiveAppsScriptUrl,
  saveEffectiveAppsScriptUrl,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatRupiah, cn } from '@/lib/utils';
import type { AppConfig, ConfigItem, AdminUser } from '@/types';

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Admin users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);

  // Form states for profile update (email, nama & role)
  const [editEmail, setEditEmail] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editRole, setEditRole] = useState<'Admin' | 'Super Admin'>('Admin');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Form states for password update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Form states for adding admin
  const [addNama, setAddNama] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'Admin' | 'Super Admin'>('Admin');
  const [addPass, setAddPass] = useState('');
  const [addPassConfirm, setAddPassConfirm] = useState('');
  const [showAddPass, setShowAddPass] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Google Spreadsheet / Apps Script state
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // AI OpenRouter configuration state
  const [aiApiKeyInput, setAiApiKeyInput] = useState('');
  const [aiModelInput, setAiModelInput] = useState('google/gemma-2-9b-it:free');

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  useEffect(() => {
    getConfig().then(setConfig);
    setAdminUsers(getAdminUsers());
    setAppsScriptUrlInput(getEffectiveAppsScriptUrl());

    if (typeof window !== 'undefined') {
      setAiApiKeyInput(localStorage.getItem('lms_openrouter_key') || '');
      setAiModelInput(localStorage.getItem('lms_ai_model') || 'google/gemma-2-9b-it:free');
    }

    const handleAdminsUpdated = () => {
      setAdminUsers(getAdminUsers());
    };
    window.addEventListener('lms_admins_updated', handleAdminsUpdated);
    return () => {
      window.removeEventListener('lms_admins_updated', handleAdminsUpdated);
    };
  }, []);

  const handleSaveAiConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lms_openrouter_key', aiApiKeyInput.trim());
      localStorage.setItem('lms_ai_model', aiModelInput);
      window.dispatchEvent(new Event('lms_config_updated'));
    }
    toast.success('Pengaturan OpenRouter & Model AI berhasil disimpan!');
  };

  const handleSaveAppsScriptUrl = () => {
    saveEffectiveAppsScriptUrl(appsScriptUrlInput.trim());
    toast.success('URL Google Spreadsheet / Apps Script berhasil diperbarui');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lms_data_updated'));
    }
  };

  const handleTestConnection = async () => {
    const url = appsScriptUrlInput.trim();
    if (!url) {
      toast.error('Masukkan URL Deployment Google Apps Script terlebih dahulu');
      return;
    }
    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'mySecretKey123';
      const res = await fetch(`${url}?action=getNasabah&apiKey=${encodeURIComponent(apiKey)}`);
      if (res.ok) {
        setConnectionStatus('success');
        toast.success('Koneksi ke Google Spreadsheet berhasil! Data terintegrasi secara real-time.');
      } else {
        setConnectionStatus('failed');
        toast.error(`Koneksi gagal (HTTP status ${res.status}). Periksa izin deployment Web App Google Apps Script Anda.`);
      }
    } catch (err) {
      setConnectionStatus('failed');
      toast.error('Gagal terhubung ke URL Google Apps Script. Pastikan Web App dideploy dengan akses "Anyone".');
    } finally {
      setTestingConnection(false);
    }
  };

  if (!config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateConfig(config);
      setSaving(false);
      setSaved(true);
      toast.success('Konfigurasi berhasil disimpan');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaving(false);
      toast.error('Gagal menyimpan konfigurasi');
    }
  };

  const toggleActive = (category: 'tenor' | 'jumlahPinjaman' | 'bunga', index: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [category]: [...prev[category]] };
      updated[category][index] = {
        ...updated[category][index],
        active: !updated[category][index].active,
      };
      return updated;
    });
  };

  const openEditAdminModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditEmail(admin.email || '');
    setEditNama(admin.nama || '');
    setEditRole(admin.role || 'Admin');
    setEditPassword('');
    setShowEditPass(false);
    setShowEditAdminModal(true);
  };

  const handleUpdateAdminProfile = async () => {
    if (!selectedAdmin) return;
    if (!editEmail.trim() || !editEmail.includes('@')) {
      toast.error('Email admin wajib diisi dengan format valid');
      return;
    }
    if (!editNama.trim()) {
      toast.error('Nama lengkap tidak boleh kosong');
      return;
    }
    if (editPassword && editPassword.length < 4) {
      toast.error('Password minimal 4 karakter jika diisi');
      return;
    }

    setUpdatingProfile(true);
    try {
      const updatedList = await updateAdminUser(selectedAdmin.email, {
        newEmail: editEmail.trim().toLowerCase(),
        nama: editNama.trim(),
        role: editRole,
        password: editPassword.trim() || undefined,
      });
      setAdminUsers(updatedList);
      toast.success(`Akun ${editEmail.trim().toLowerCase()} (${editNama.trim()}) berhasil diperbarui & tersinkronisasi!`);
      setShowEditAdminModal(false);
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memperbarui profil admin');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const openPasswordModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPass(false);
    setShowConfirmPass(false);
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async () => {
    if (!selectedAdmin) return;
    if (!newPassword || newPassword.length < 4) {
      toast.error('Password minimal 4 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setUpdatingPassword(true);
    try {
      const success = await updateAdminPassword(selectedAdmin.email, newPassword);
      if (success) {
        toast.success(`Password untuk ${selectedAdmin.email} berhasil diperbarui!`);
        setShowPasswordModal(false);
        setAdminUsers(getAdminUsers());
      } else {
        toast.error('Gagal memperbarui password');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan saat memperbarui password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!addNama.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    if (!addEmail.trim() || !addEmail.includes('@')) {
      toast.error('Masukkan email admin yang valid');
      return;
    }
    if (!addPass || addPass.length < 4) {
      toast.error('Password minimal 4 karakter');
      return;
    }
    if (addPass !== addPassConfirm) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setAddingAdmin(true);
    try {
      const updated = await addAdminUser({
        nama: addNama.trim(),
        email: addEmail.trim().toLowerCase(),
        role: addRole,
        password: addPass,
      });
      setAdminUsers(updated);
      toast.success(`Akun admin ${addEmail} berhasil ditambahkan!`);
      setShowAddAdminModal(false);
      setAddNama('');
      setAddEmail('');
      setAddRole('Admin');
      setAddPass('');
      setAddPassConfirm('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan admin baru');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    if (email.toLowerCase() === currentUser?.email.toLowerCase()) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus akun admin ${email}?`)) {
      const updated = await deleteAdminUser(email);
      setAdminUsers(updated);
      toast.success(`Akun admin ${email} berhasil dihapus`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Konfigurasi sistem pinjaman & akses admin</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="nav-gradient text-white hover:opacity-90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : saved ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <TabsList className="inline-flex h-auto p-1.5 min-w-full sm:min-w-0 sm:w-auto bg-slate-100/80 dark:bg-slate-800/80 gap-1 rounded-xl">
            <TabsTrigger value="general" className="whitespace-nowrap px-3.5 py-2 text-xs font-medium dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
              <FileText className="mr-1.5 h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="pinjaman" className="whitespace-nowrap px-3.5 py-2 text-xs font-medium dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
              <Tag className="mr-1.5 h-3.5 w-3.5" /> Pinjaman & Tenor
            </TabsTrigger>
            <TabsTrigger value="admin-users" className="whitespace-nowrap px-3.5 py-2 text-xs font-medium dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Akun & Password
            </TabsTrigger>
            <TabsTrigger value="google-sheets" className="whitespace-nowrap px-3.5 py-2 text-xs font-medium dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
              <Database className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Spreadsheet
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="whitespace-nowrap px-3.5 py-2 text-xs font-medium dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white dark:text-slate-300">
              <Bot className="mr-1.5 h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> AI & Key
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Tab */}
        <TabsContent value="general">
          <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-6 soft-shadow space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-slate-800 dark:text-white">General Settings</h3>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              <div>
                <Label htmlFor="prefix" className="dark:text-slate-200">Prefix ID Pengajuan</Label>
                <Input
                  id="prefix"
                  value={config.prefix}
                  onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                  className="mt-1.5 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="LN"
                />
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Format: {config.prefix}-YYYYMMDD-XXXX
                </p>
              </div>
            </div>

            {/* Fitur Cicilan Toggle Card */}
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/30 p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Status Fitur Cicilan & Kalkulator Simulasi</span>
                    <Badge className={config.enableCicilan ? "bg-emerald-600 text-white font-semibold" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"}>
                      {config.enableCicilan ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ubah status ini untuk mengaktifkan atau menonaktifkan rincian <strong>Estimasi Cicilan</strong> pada ringkasan pengajuan nasabah serta tab <strong>Kalkulator Simulasi Cicilan</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, enableCicilan: !config.enableCicilan })}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.enableCicilan ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Fitur Cicilan"
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white dark:bg-slate-200 shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.enableCicilan ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Fitur Share Lokasi di Rumah Toggle Card */}
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/30 p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Fitur Share Lokasi di Rumah (GPS Nasabah)</span>
                    <Badge className={config.enableShareLokasi !== false ? "bg-emerald-600 text-white font-semibold" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"}>
                      {config.enableShareLokasi !== false ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ubah status ini untuk mengaktifkan atau menonaktifkan tombol <strong>Share Lokasi di Rumah</strong> pada formulir pengajuan nasabah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, enableShareLokasi: config.enableShareLokasi === false ? true : false })}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.enableShareLokasi !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Fitur Share Lokasi"
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white dark:bg-slate-200 shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.enableShareLokasi !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Pinjaman & Tenor Tab */}
        <TabsContent value="pinjaman" className="space-y-4">
          {/* Tenor */}
          <TagInputSection
            title="Tenor (hari)"
            hint="Ketik angka dan tekan Enter untuk menambahkan"
            items={config.tenor}
            formatValue={(v) => `${v} hari`}
            onAdd={(value) => {
              setConfig({
                ...config,
                tenor: [...config.tenor, { label: `${value} Hari`, value, active: true }],
              });
            }}
            onRemove={(index) => {
              setConfig({
                ...config,
                tenor: config.tenor.filter((_, i) => i !== index),
              });
            }}
            onToggle={(index) => toggleActive('tenor', index)}
          />

          {/* Jumlah Pinjaman */}
          <TagInputSection
            title="Jumlah Pinjaman (Rupiah)"
            hint="Ketik nominal dan tekan Enter untuk menambahkan"
            items={config.jumlahPinjaman}
            formatValue={(v) => formatRupiah(v)}
            onAdd={(value) => {
              setConfig({
                ...config,
                jumlahPinjaman: [
                  ...config.jumlahPinjaman,
                  { label: formatRupiah(value), value, active: true },
                ],
              });
            }}
            onRemove={(index) => {
              setConfig({
                ...config,
                jumlahPinjaman: config.jumlahPinjaman.filter((_, i) => i !== index),
              });
            }}
            onToggle={(index) => toggleActive('jumlahPinjaman', index)}
          />

          {/* Bunga */}
          <TagInputSection
            title="Bunga (nominal atau persen)"
            hint="Ketik nominal (contoh: 30000) atau persen (contoh: 5) lalu tekan Enter"
            items={config.bunga}
            formatValue={(v) => (v < 100 ? `${v}%` : formatRupiah(v))}
            onAdd={(value) => {
              const label = value < 100 ? `${value}%` : formatRupiah(value);
              setConfig({
                ...config,
                bunga: [...config.bunga, { label, value, active: true }],
              });
            }}
            onRemove={(index) => {
              setConfig({
                ...config,
                bunga: config.bunga.filter((_, i) => i !== index),
              });
            }}
            onToggle={(index) => toggleActive('bunga', index)}
          />
        </TabsContent>

        {/* Akun & Password Admin Tab */}
        <TabsContent value="admin-users" className="space-y-4">
          <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-6 soft-shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-slate-800 dark:text-white">Manajemen Password & Akun Admin</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Kelola password, kredensial login, dan hak akses pengguna administrator.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isSuperAdmin ? (
                  <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1.5 py-1 px-3">
                    <ShieldCheck className="h-3.5 w-3.5" /> Super Admin Access
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-3 dark:bg-slate-800 dark:text-slate-300">
                    <Shield className="h-3.5 w-3.5" /> Admin Access
                  </Badge>
                )}

                {isSuperAdmin && (
                  <Button
                    onClick={() => setShowAddAdminModal(true)}
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" /> Tambah Admin
                  </Button>
                )}
              </div>
            </div>

            {/* Admin Users Table */}
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Email / Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Password</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminUsers.map((admin, idx) => {
                    const isSelf = admin.email.toLowerCase() === currentUser?.email.toLowerCase();
                    const canEdit = isSuperAdmin || isSelf;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            {admin.nama}
                            {isSelf && (
                              <span className="rounded bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                Akun Anda
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {admin.email}
                        </td>
                        <td className="px-4 py-3.5">
                          {admin.role === 'Super Admin' ? (
                            <Badge className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100">
                              Super Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600 dark:text-slate-300 dark:border-slate-700">
                              Admin
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                          ••••••••
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditAdminModal(admin)}
                                  className="h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300"
                                >
                                  <UserCog className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  Edit Nama & Role
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPasswordModal(admin)}
                                  className="h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-300"
                                >
                                  <KeyRound className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  Ubah Password
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">Khusus Super Admin</span>
                            )}

                            {isSuperAdmin && !isSelf && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAdmin(admin.email)}
                                className="h-8 px-2 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600"
                                title="Hapus Admin"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Google Spreadsheet Integration Tab */}
        <TabsContent value="google-sheets" className="space-y-4">
          <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-6 soft-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">Integrasi Google Spreadsheet / Apps Script</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hubungkan aplikasi LMS secara langsung dengan Google Sheets Anda secara real-time
                  </p>
                </div>
              </div>

              {appsScriptUrlInput.trim() ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Terhubung ke Google Spreadsheet
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Mode Penyimpanan Lokal (Offline)
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="apps-script-url" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  URL Web App Google Apps Script
                </Label>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <Input
                      id="apps-script-url"
                      value={appsScriptUrlInput}
                      onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="pl-9 font-mono text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  <Button
                    onClick={handleTestConnection}
                    disabled={testingConnection || !appsScriptUrlInput.trim()}
                    variant="outline"
                    className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5"
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    )}
                    Uji Koneksi
                  </Button>
                  <Button
                    onClick={handleSaveAppsScriptUrl}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    Simpan URL
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Semua pengajuan nasabah, status persetujuan, dan perubahan akun admin akan disinkronkan secara langsung ke spreadsheet ini.
                </p>
              </div>

              {connectionStatus === 'success' && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Status: Terhubung & Aktif</p>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Koneksi API Google Apps Script berhasil diverifikasi. Data pengajuan baru & permohonan pinjaman akan tersimpan langsung di Google Spreadsheet.
                    </p>
                  </div>
                </div>
              )}

              {/* Panduan Integrasi */}
              <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-5 space-y-3">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Panduan Menghubungkan Google Spreadsheet:
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                  <li>
                    Buka Google Spreadsheet milik Anda di browser.
                  </li>
                  <li>
                    Klik menu <strong className="text-slate-800 dark:text-slate-100">Extensions / Ekstensi &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Paste kode Google Apps Script Backend LMS yang menangani fungsi <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">doGet</code> dan <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">doPost</code>.
                  </li>
                  <li>
                    Klik tombol <strong className="text-slate-800 dark:text-slate-100">Deploy &gt; New deployment</strong>.
                  </li>
                  <li>
                    Pilih tipe <strong className="text-slate-800 dark:text-slate-100">Web App</strong>, atur <i>Execute as: Me</i> dan <i>Who has access: <strong>Anyone</strong></i>.
                  </li>
                  <li>
                    Copy URL Web App hasil deployment (berakhiran <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">/exec</code>) dan paste di kolom input di atas.
                  </li>
                </ol>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* AI & OpenRouter Tab */}
        <TabsContent value="ai-config">
          <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-6 soft-shadow space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Konfigurasi AI Assistant (Gemma & OpenRouter)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Atur API Key OpenRouter dan pilihan model AI untuk asisten analitik LMS</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  {aiApiKeyInput ? 'OpenRouter Connected' : 'Gemma Active (Default)'}
                </div>
              </div>
            </div>

            <div className="space-y-5 max-w-2xl">
              <div>
                <Label htmlFor="openrouter-api-key" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  OpenRouter API Key (Opsional / Gratis)
                </Label>
                <div className="mt-2 relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="openrouter-api-key"
                    type="password"
                    value={aiApiKeyInput}
                    onChange={(e) => setAiApiKeyInput(e.target.value)}
                    placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
                    className="pl-10 font-mono text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Untuk menggunakan AI secara gratis via OpenRouter, daftar & ambil API key gratis di{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-semibold underline">
                    openrouter.ai/keys
                  </a>. Jika dikosongkan, sistem akan menggunakan API key default server / fallback engine.
                </p>
              </div>

              <div>
                <Label htmlFor="ai-model-select" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Pilihan Model AI
                </Label>
                <div className="mt-2">
                  <select
                    id="ai-model-select"
                    value={aiModelInput}
                    onChange={(e) => setAiModelInput(e.target.value)}
                    className="w-full h-11 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  >
                    <option value="google/gemma-2-9b-it:free">Google Gemma 2 9B (Gratis / Free Tier)</option>
                    <option value="google/gemma-2-27b-it">Google Gemma 2 27B (Performa Tinggi)</option>
                    <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (Kredit OpenRouter)</option>
                    <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                  </select>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Pilih <strong className="text-slate-800 dark:text-slate-200">Gemma 2 9B Free</strong> untuk penggunaan 100% gratis tanpa biaya.
                </p>
              </div>

              <div className="pt-3">
                <Button
                  onClick={handleSaveAiConfig}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium gap-2 px-6 rounded-xl shadow-md"
                >
                  <Save className="h-4 w-4" /> Simpan Pengaturan AI
                </Button>
              </div>
            </div>

            {/* Answers & Instructions for User */}
            <div className="mt-6 rounded-2xl border border-purple-100 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" /> FAQ & Panduan Konfigurasi OpenRouter:
              </h4>
              <div className="space-y-2 text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                <p>
                  <strong>1. Apakah harus setting di OpenRouter juga untuk AI Gemma?</strong><br />
                  <span className="text-slate-600 dark:text-slate-400">
                    Tidak ada setting khusus di dashboard OpenRouter. Cukup buat akun gratis di openrouter.ai, lalu buat 1 buah API Key baru. Salin key tersebut dan tempel pada kolom di atas. Model Gemma 2 9B (Free) sudah aktif secara otomatis tanpa perlu menambah deposit.
                  </span>
                </p>
                <p>
                  <strong>2. Apakah harus setting di OpenRouter jika ingin pakai AI Berbayar (GPT-4o / Claude)?</strong><br />
                  <span className="text-slate-600 dark:text-slate-400">
                    Ya. Jika ingin menggunakan model berbayar seperti GPT-4o atau Claude 3.5, Anda perlu mengisi saldo credit (mulai dari $5) pada menu <i>Credits</i> di OpenRouter. Setelah saldo terisi, cukup ganti pilihan model di dropdown atas menjadi GPT-4o atau Claude.
                  </span>
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Change Password */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Ubah Password Admin
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Akses akun: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedAdmin?.email}</span> ({selectedAdmin?.nama})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-pass" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Password Baru
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-pass"
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-pass" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Konfirmasi Password Baru
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-pass"
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className="pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)} className="dark:border-slate-700 dark:text-slate-200">
              Batal
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {updatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Password Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Add Admin User */}
      <Dialog open={showAddAdminModal} onOpenChange={setShowAddAdminModal}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Tambah Akun Admin Baru
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Buat kredensial administrator baru untuk mengelola aplikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="add-nama" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nama Lengkap
              </Label>
              <Input
                id="add-nama"
                value={addNama}
                onChange={(e) => setAddNama(e.target.value)}
                placeholder="Contoh: Rina Wijaya"
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="add-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email / Username Admin
              </Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="Contoh: rina@lms.id"
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="add-role" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Role Akses
              </Label>
              <Select
                value={addRole}
                onValueChange={(val: 'Admin' | 'Super Admin') => setAddRole(val)}
              >
                <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectItem value="Admin">Admin (Kelola Pengajuan & Export)</SelectItem>
                  <SelectItem value="Super Admin">Super Admin (Akses Penuh & Pengaturan)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="add-pass" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="add-pass"
                  type={showAddPass ? 'text' : 'password'}
                  value={addPass}
                  onChange={(e) => setAddPass(e.target.value)}
                  placeholder="Password admin..."
                  className="pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPass(!showAddPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showAddPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="add-pass-confirm" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Konfirmasi Password
              </Label>
              <Input
                id="add-pass-confirm"
                type="password"
                value={addPassConfirm}
                onChange={(e) => setAddPassConfirm(e.target.value)}
                placeholder="Ulangi password..."
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddAdminModal(false)} className="dark:border-slate-700 dark:text-slate-200">
              Batal
            </Button>
            <Button
              onClick={handleAddAdmin}
              disabled={addingAdmin}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {addingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Akun Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Profile Admin */}
      <Dialog open={showEditAdminModal} onOpenChange={setShowEditAdminModal}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
              <UserCog className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Edit Nama & Profil Admin
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Ubah nama lengkap, role, atau password untuk akun <strong className="text-slate-700 dark:text-slate-200">{selectedAdmin?.email}</strong>. Data akan langsung terintegrasi dengan Google Spreadsheet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email / ID Akun Admin <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email.admin@domain.com"
                className="mt-1 font-mono text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="edit-nama" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nama Lengkap Admin <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-nama"
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                placeholder="Masukkan nama lengkap admin..."
                className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            {isSuperAdmin && (
              <div>
                <Label htmlFor="edit-role" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Role Akses
                </Label>
                <Select value={editRole} onValueChange={(val) => setEditRole(val as 'Admin' | 'Super Admin')}>
                  <SelectTrigger id="edit-role" className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="edit-pass" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Password Baru (Opsional)
              </Label>
              <div className="relative mt-1">
                <Input
                  id="edit-pass"
                  type={showEditPass ? 'text' : 'password'}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  className="pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPass(!showEditPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showEditPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEditAdminModal(false)} className="dark:border-slate-700 dark:text-slate-200">
              Batal
            </Button>
            <Button
              onClick={handleUpdateAdminProfile}
              disabled={updatingProfile}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {updatingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan & Sinkronkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TagInputSectionProps {
  title: string;
  hint: string;
  items: ConfigItem[];
  formatValue: (v: number) => string;
  onAdd: (value: number) => void;
  onRemove: (index: number) => void;
  onToggle: (index: number) => void;
}

function TagInputSection({ title, hint, items, formatValue, onAdd, onRemove, onToggle }: TagInputSectionProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && input.trim()) {
      e.preventDefault();
      const num = parseInt(input.trim().replace(/[^0-9]/g, ''));
      if (!isNaN(num) && num > 0) {
        if (!items.some((item) => item.value === num)) {
          onAdd(num);
        }
        setInput('');
      }
    }
  };

  return (
    <Card className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-6 soft-shadow">
      <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>

      {/* Tag Input */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
          >
            {formatValue(item.value)}
            <button
              onClick={() => onRemove(index)}
              className="rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900"
              aria-label="Hapus"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ketik angka..."
          className="min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
        />
      </div>

      {/* Selectable Badges */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Badge yang aktif (muncul di form publik):
        </p>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada badge. Ketik angka di atas untuk menambahkan.</p>
          ) : (
            items.map((item, index) => (
              <button
                key={index}
                onClick={() => onToggle(index)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all',
                  item.active
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 line-through',
                )}
              >
                {item.active && <Check className="h-3 w-3" />}
                {formatValue(item.value)}
              </button>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
