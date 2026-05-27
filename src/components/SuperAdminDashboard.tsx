/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, 
  UserPlus, 
  Ban, 
  CheckCircle2, 
  ShieldCheck, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar, 
  User, 
  AlertTriangle 
} from 'lucide-react';
import { laundryService } from '../firebase';
import { Laundry, UserProfile } from '../types';

export default function SuperAdminDashboard() {
  const [laundries, setLaundries] = React.useState<Laundry[]>([]);
  const [owners, setOwners] = React.useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = React.useState<'pending' | 'active'>('pending');
  
  // Create Laundry Request Form States
  const [laundryName, setLaundryName] = React.useState('');
  const [ownerName, setOwnerName] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [formSuccess, setFormSuccess] = React.useState('');
  const [deletingLaundry, setDeletingLaundry] = React.useState<{ id: string; name: string } | null>(null);

  const loadData = () => {
    const list = laundryService.getLaundries();
    setLaundries(list);
    const allUsers = laundryService.getAllUsers();
    setOwners(allUsers);
  };

  React.useEffect(() => {
    loadData();
    const unsubscribe = laundryService.subscribeToChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Automatically focus pending tab if pending items exist, otherwise active
  React.useEffect(() => {
    const pendingCount = laundries.filter(l => !l.isActive).length;
    if (pendingCount > 0) {
      setActiveTab('pending');
    } else {
      setActiveTab('active');
    }
  }, [laundries.length]);

  const handleToggleStatus = async (laundryId: string, currentStatus: boolean) => {
    const targetStatus = !currentStatus;
    await laundryService.updateLaundryStatus(laundryId, targetStatus);
    loadData();
  };

  const handleDeleteLaundry = (laundryId: string, name: string) => {
    setDeletingLaundry({ id: laundryId, name });
  };

  const confirmDeleteLaundry = async () => {
    if (!deletingLaundry) return;
    try {
      await laundryService.deleteLaundry(deletingLaundry.id);
    } catch (err: any) {
      console.error("Gagal menghapus laundry:", err);
      // Even if Firebase fails (like offline or permission), we still set deleting to null and load data because local caching clears it
      alert(`Gagal menghapus atau menolak kemitraan secara menyeluruh dari server Firebase:\n${err.message || err}\n\nNamun, data lokal Anda telah dimutakhirkan.`);
    } finally {
      setDeletingLaundry(null);
      loadData();
    }
  };

  const handleCreateLaundry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laundryName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      alert('Harap lengkapi semua isian form.');
      return;
    }

    const { owner, laundry } = laundryService.createLaundryBySuperAdmin(laundryName, ownerEmail, ownerName);
    
    // Auto-approve laundry created directly by Super Admin
    laundryService.updateLaundryStatus(laundry.laundryId, true);

    setFormSuccess(`Sukses mendaftarkan & menyetujui ${laundry.name}! Pemilik baru: ${owner.name}.`);
    
    // reset form
    setLaundryName('');
    setOwnerName('');
    setOwnerEmail('');

    // reload list
    loadData();

    setTimeout(() => setFormSuccess(''), 4000);
  };

  // Lists splitting
  const pendingLaundries = laundries.filter(l => !l.isActive);
  const activeLaundries = laundries.filter(l => l.isActive);

  // Stats calculation
  const totalLaundriesCount = laundries.length;
  const activeLaundriesCount = activeLaundries.length;
  const pendingLaundriesCount = pendingLaundries.length;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Super Admin Dashboard</h1>
          <p className="text-slate-500 text-sm">Selamat datang, Pengelola Platform Laundry Utama.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Status Platform: AKTIF (Vite+Firebase)
        </div>
      </div>

      {/* GLOBAL METRICS BENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Kemitraan</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-slate-800">{totalLaundriesCount}</span>
            <span className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Building2 className="w-5 h-5" /></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Laundry Aktif</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-emerald-600">{activeLaundriesCount}</span>
            <span className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><CheckCircle2 className="w-5 h-5" /></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Menunggu Approval</p>
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-extrabold ${pendingLaundriesCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-600'}`}>{pendingLaundriesCount}</span>
            <span className={`p-2.5 rounded-xl ${pendingLaundriesCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
        </div>
      </div>

      {/* CORE TWO-COLUMN PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LAUNDRIES LISTING - 3 COLUMNS */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden lg:col-span-3 flex flex-col">
          
          {/* NEW NAVIGATION TABS */}
          <div className="flex border-b border-slate-100 bg-slate-50/55 p-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-amber-700 shadow-sm border border-slate-200/65'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Menunggu Approval ({pendingLaundriesCount})
              {pendingLaundriesCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'active'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/65'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Kemitraan Aktif ({activeLaundriesCount})
            </button>
          </div>

          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
              {activeTab === 'pending' 
                ? '📋 Daftar pendaftaran mandiri via Google Sign-In yang berstatus pending/nonaktif. Klik "Setujui & Aktifkan" untuk memberikan akses dashboard.'
                : '✅ Daftar outlet laundry yang berstatus aktif dan sedang operasional pada platform.'
              }
            </p>
          </div>
          
          <div className="divide-y divide-slate-100 flex-1">
            {activeTab === 'pending' && (
              <>
                {pendingLaundries.map((lnd) => {
                  const owner = owners.find(o => o.laundryId === lnd.laundryId && o.role === 'owner');
                  return (
                    <div key={lnd.laundryId} className="p-6 space-y-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Pending Approval
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {lnd.laundryId}</span>
                          </div>
                          
                          <h4 className="font-extrabold text-slate-800 text-base">{lnd.name}</h4>
                          
                          <div className="space-y-1 text-xs text-slate-500 font-medium">
                            <p className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>Alamat: <strong className="text-slate-700">{lnd.address}</strong></span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>Telepon: <strong className="text-slate-700">{lnd.phone}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-stretch gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleToggleStatus(lnd.laundryId, lnd.isActive)}
                            className="flex-1 text-xs font-bold px-4 py-2.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm text-center flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Setujui & Aktifkan
                          </button>
                          <button
                            onClick={() => handleDeleteLaundry(lnd.laundryId, lnd.name)}
                            className="text-xs font-bold px-4 py-2.5 border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all text-center flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Tolak & Hapus
                          </button>
                        </div>
                      </div>

                      {/* GOOGLE PROFILE REGISTRATION ATTACHMENT */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Identifikasi Pendaftar Google</p>
                          <p className="font-bold text-slate-700 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            Nama: {owner?.name || 'Menunggu pendaftaran profil'}
                          </p>
                          <p className="text-slate-500 font-mono flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {owner?.email || 'Tidak ada email'}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium sm:text-right">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Daftar: {lnd.createdAt ? new Date(lnd.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {pendingLaundries.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-60" />
                    <p className="font-bold text-slate-700 mt-2">Semua Bersih!</p>
                    <p className="text-xs max-w-xs mx-auto">Tidak ada pengajuan pendaftaran mandiri yang menanti persetujuan saat ini.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'active' && (
              <>
                {activeLaundries.map((lnd) => {
                  const owner = owners.find(o => o.laundryId === lnd.laundryId && o.role === 'owner');
                  return (
                    <div key={lnd.laundryId} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          {lnd.name}
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">Aktif</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold">{lnd.address}</p>
                        <p className="text-xs text-slate-400 font-mono">Telp: {lnd.phone} | Owner: {owner?.name || 'Platform Admin'} ({owner?.email || 'N/A'})</p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                        <button 
                          onClick={() => handleToggleStatus(lnd.laundryId, lnd.isActive)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 transition-all flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend / Blokir
                        </button>
                        <button 
                          onClick={() => handleDeleteLaundry(lnd.laundryId, lnd.name)}
                          className="text-xs font-bold p-2 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-100 bg-white hover:bg-rose-50 rounded-xl transition-all"
                          title="Hapus Kemitraan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {activeLaundries.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Belum ada mitra laundry yang aktif saat ini.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* REGISTER OWNER & LAUNDRY HUB FORM - 2 COLUMNS */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 lg:col-span-2 h-fit">
          <h3 className="font-extrabold text-slate-800 text-base mb-5 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Daftarkan & Approve Mitra Baru
          </h3>

          {formSuccess && (
            <div className="mb-4 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl animate-fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateLaundry} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nama Laundry Baru</label>
              <input 
                type="text"
                placeholder="Contoh: Anti-Noda Laundry"
                value={laundryName}
                onChange={(e) => setLaundryName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="border-t border-dashed border-slate-100 pt-4 mt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Akun Google Owner Baru</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nama Owner</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Hj. Maimunah"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email Owner (Google)</label>
                  <input 
                    type="email"
                    placeholder="Contoh: maimunah@gmail.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Email wajib sama persis dengan Google Account yang akan digunakan oleh pemilik.</p>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-1.5 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              Daftarkan Baru (Otomatis Approved)
            </button>
          </form>
        </div>

      </div>

      {/* PURE REACT CONFIRMATION DIALOG */}
      {deletingLaundry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print" id="delete-laundry-modal">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex gap-4 items-start">
              <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl border border-rose-100 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-extrabold text-slate-950 text-base leading-tight">Hapus Pendaftaran Mitra?</h4>
                <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                  Apakah Anda benar-benar yakin ingin menghapus pengajuan/kemitraan <strong className="text-slate-800">"{deletingLaundry.name}"</strong>?
                </p>
                <div className="bg-rose-50 border border-slate-100 p-3 rounded-xl text-[10px] text-rose-800 font-bold leading-relaxed">
                  ⚠️ Tindakan ini permanen. Seluruh akun owner, akun staff kasir, data timbangan, pesanan, dan pengaturan outlet yang terhubung dengan mitra ini di Firestore akan dihapus total!
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setDeletingLaundry(null)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={confirmDeleteLaundry}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
