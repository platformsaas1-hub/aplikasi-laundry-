/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, 
  UserPlus, 
  Layers, 
  Ban, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Hash, 
  ClipboardList 
} from 'lucide-react';
import { laundryService } from '../firebase';
import { Laundry, UserProfile } from '../types';

export default function SuperAdminDashboard() {
  const [laundries, setLaundries] = React.useState<Laundry[]>([]);
  const [owners, setOwners] = React.useState<UserProfile[]>([]);
  
  // Create Laundry Request Form States
  const [laundryName, setLaundryName] = React.useState('');
  const [ownerName, setOwnerName] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [formSuccess, setFormSuccess] = React.useState('');

  const loadData = () => {
    const list = laundryService.getLaundries();
    setLaundries(list);
  };

  React.useEffect(() => {
    loadData();
    const unsubscribe = laundryService.subscribeToChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleToggleStatus = (laundryId: string, currentStatus: boolean) => {
    laundryService.updateLaundryStatus(laundryId, !currentStatus);
    loadData();
  };

  const handleCreateLaundry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laundryName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      alert('Harap lengkapi semua isian form.');
      return;
    }

    const { owner, laundry } = laundryService.createLaundryBySuperAdmin(laundryName, ownerEmail, ownerName);
    setFormSuccess(`Sukses mendaftarkan ${laundry.name}! Pemilik baru: ${owner.name}.`);
    
    // reset form
    setLaundryName('');
    setOwnerName('');
    setOwnerEmail('');

    // reload list
    loadData();

    setTimeout(() => setFormSuccess(''), 4000);
  };

  // Stats calculation
  const totalLaundries = laundries.length;
  const activeLaundries = laundries.filter(l => l.isActive).length;
  const suspendedLaundries = totalLaundries - activeLaundries;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-105 pb-5">
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Kemitraan Laundry</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-slate-800">{totalLaundries}</span>
            <span className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Building2 className="w-5 h-5" /></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Laundry Aktif</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-emerald-600">{activeLaundries}</span>
            <span className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><CheckCircle2 className="w-5 h-5" /></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Laundry Dinonaktifkan</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-extrabold text-rose-600">{suspendedLaundries}</span>
            <span className="bg-rose-50 text-rose-600 p-2.5 rounded-xl"><Ban className="w-5 h-5" /></span>
          </div>
        </div>
      </div>

      {/* CORE TWO-COLUMN PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LAUNDRIES LISTING - 3 COLUMNS */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden lg:col-span-3">
          <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="font-bold text-slate-950 text-base">Kelola Semua Mitra Laundry</h3>
            <span className="text-xs font-bold text-blue-600 font-mono bg-blue-50 px-2.5 py-1 rounded-full uppercase">List Aktif</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {laundries.map((lnd) => (
              <div key={lnd.laundryId} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    {lnd.name}
                    {!lnd.isActive && <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md border border-rose-200">Nonaktif</span>}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{lnd.address}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Telp: {lnd.phone}</p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => handleToggleStatus(lnd.laundryId, lnd.isActive)}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
                      lnd.isActive 
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {lnd.isActive ? 'Suspend Laundry' : 'Aktifkan Kembali'}
                  </button>
                </div>
              </div>
            ))}

            {laundries.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Tidak ada data laundry terdaftar saat ini. Let's register one!
              </div>
            )}
          </div>
        </div>

        {/* REGISTER OWNER & LAUNDRY HUB FORM - 2 COLUMNS */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 lg:col-span-2 h-fit">
          <h3 className="font-extrabold text-slate-800 text-base mb-5 flex items-center gap-1.5 border-b border-slate-200/80 pb-3">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Daftarkan Mitra Baru
          </h3>

          {formSuccess && (
            <div className="mb-4 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl animate-fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateLaundry} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nama Laundry</label>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email Owner</label>
                  <input 
                    type="email"
                    placeholder="Contoh: maimunah@gmail.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Email wajib aktif dan sesuai dengan akun login Google milik pemilik laundry.</p>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-1.5 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              Daftarkan Mitra & Buat Akses
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
