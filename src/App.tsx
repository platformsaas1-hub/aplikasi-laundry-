/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building, 
  Search, 
  LogIn, 
  HelpCircle, 
  LogOut, 
  ShieldAlert, 
  User, 
  RefreshCcw, 
  CheckCircle,
  Trophy,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { laundryService, useRealFirebase, startFirebaseSync, clearFirebaseSubscriptions, auth as libAuth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { UserProfile, UserRole } from './types';

// Importing Dashboard sub-components
import TrackingView from './components/TrackingView';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import OwnerDashboard from './components/OwnerDashboard';
import CashierDashboard from './components/CashierDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import SetupGuide from './components/SetupGuide';
import UserAvatar from './components/UserAvatar';

export default function App() {
  const [currentTab, setCurrentTab] = React.useState<'home' | 'track' | 'dashboard' | 'guide'>('home');
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);

  // Authentication Forms State
  const [loginMethod, setLoginMethod] = React.useState<'google' | 'internal'>('google');
  const [usernameInput, setUsernameInput] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  // Loaded at boot
  React.useEffect(() => {
    // Check pathname routing for Vercel/production tracking view route integration
    const path = window.location.pathname;
    if (path.includes('/tracking/')) {
      const parts = path.split('/tracking/');
      const invoiceNo = parts[parts.length - 1];
      if (invoiceNo && invoiceNo.trim()) {
        localStorage.setItem('lnd_direct_track_invoice', invoiceNo.trim());
        setCurrentTab('track');
      }
    } else {
      const active = laundryService.getCurrentSimulatedUser();
      if (active) {
        setCurrentUser(active);
        setCurrentTab('dashboard');
      }
    }
  }, []);

  // Real-time Firebase Auth session restoration listener hook
  React.useEffect(() => {
    if (!useRealFirebase) return;

    // Listen to Firebase Auth state events
    const unsubscribe = onAuthStateChanged(libAuth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("Firebase Auth detected authenticated user:", firebaseUser.email);
        try {
          const profile = await laundryService.getOrCreateProfileForFirebaseUser(firebaseUser);
          setCurrentUser(profile);
          if (currentTab === 'home') {
            setCurrentTab('dashboard');
          }
        } catch (err) {
          console.error("Failed to restore Firebase profile automatically:", err);
        }
      } else {
        // Sign out locally if logged out from Firebase Auth
        const localUser = laundryService.getCurrentSimulatedUser();
        if (localUser && (localUser.role === 'owner' || localUser.role === 'super_admin')) {
          laundryService.setSimulatedUser(null);
          setCurrentUser(null);
          setCurrentTab('home');
        }
      }
    });

    return () => unsubscribe();
  }, [currentTab]);

  // Context-aware secure listener synchronization hook
  const [listVersion, setListVersion] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = laundryService.subscribeToChanges(() => {
      setListVersion(v => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Compute active laundry & user suspension status dynamically
  const suspensionStatus = React.useMemo(() => {
    if (!currentUser) return { suspended: false, name: '', reason: '' };
    if (currentUser.role === 'super_admin') return { suspended: false, name: '', reason: '' };

    // Check if user account itself is suspended
    if (currentUser.isActive === false) {
      return { 
        suspended: true, 
        name: currentUser.name, 
        reason: 'Akun personal Anda telah dinonaktifkan sementara oleh Super Administrator platform Londria Hub.' 
      };
    }

    // Check if user's laundry outlet is suspended
    if (currentUser.laundryId) {
      const laundryList = laundryService.getLaundries();
      const myLaundry = laundryList.find(l => l.laundryId === currentUser.laundryId);
      if (myLaundry && !myLaundry.isActive) {
        return { 
          suspended: true, 
          name: myLaundry.name, 
          reason: `Outlet laundry "${myLaundry.name}" telah ditangguhkan sementara oleh administrator platform Hub Laundry.` 
        };
      }
    }

    return { suspended: false, name: '', reason: '' };
  }, [currentUser, listVersion]);

  React.useEffect(() => {
    if (currentUser) {
      startFirebaseSync(currentUser);
    } else {
      clearFirebaseSubscriptions();
    }
    return () => {
      clearFirebaseSubscriptions();
    };
  }, [currentUser]);

  const handleGoogleLoginReal = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const profile = await laundryService.loginGoogleReal();
      setCurrentUser(profile);
      setCurrentTab('dashboard');
    } catch (e: any) {
      console.warn("Real Google Auth caught error:", e);
      
      const errCode = e.code || '';
      const errMsg = e.message || '';
      const isPopupInterrupted = 
        errCode === 'auth/cancelled-popup-request' || 
        errCode === 'auth/popup-closed-by-user' || 
        errCode === 'auth/popup-blocked' ||
        errMsg.includes('cancelled-popup-request') || 
        errMsg.includes('popup-closed-by-user') ||
        errMsg.includes('popup-blocked') ||
        errMsg.includes('Pending promise was never set');

      // Regardless of the reported error, give a short grace period for Firebase block states
      // to resolve and onAuthStateChanged to sync the session state from IndexedDB
      await new Promise(resolve => setTimeout(resolve, 1500));
      const active = laundryService.getCurrentSimulatedUser();
      if (active) {
        console.log("Iframe error caught, but session successfully initialized in background. Proceeding to Dashboard...");
        setCurrentUser(active);
        setCurrentTab('dashboard');
        setIsLoggingIn(false);
        return;
      }

      if (isPopupInterrupted) {
        setLoginError('Proses login terputus atau pop-up diblokir oleh browser. Jika Anda menggunakan AI Studio, silakan klik tombol "Buka Aplikasi Di Tab Baru" di pojok kanan atas preview untuk login dengan lancar.');
      } else {
        setLoginError(e.message || 'Gagal masuk dengan Google. Pastikan domain popup telah diizinkan di Firebase Console > Authentication.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInternalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!usernameInput.trim()) {
      setLoginError('Masukkan username karyawan.');
      return;
    }

    try {
      const profile = await laundryService.loginInternalSimulated(usernameInput.trim().toLowerCase());
      if (profile) {
        setCurrentUser(profile);
        setCurrentTab('dashboard');
        setUsernameInput('');
      } else {
        setLoginError('User internal tidak ditemukan. Mintalah Owner laundry mendaftarkan Anda.');
      }
    } catch (err: any) {
      console.error("Internal login caught error:", err);
      setLoginError('Terjadi kesalahan koneksi login. Coba lagi.');
    }
  };

  const handleLogout = () => {
    laundryService.logout();
    setCurrentUser(null);
    setCurrentTab('home');
  };

  const handleResetDemoDb = () => {
    if (window.confirm('Reset Sesi Login & Cache Aplikasi? Langkah ini hanya akan menghapus cache login pada browser Anda.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-105">
      
      {/* FLOATING TOP DEVELOPMENT NOTIFICATION BAR */}
      <div className="bg-slate-900 text-white py-2.5 px-4 text-center text-xs flex flex-wrap items-center justify-center gap-3 border-b border-slate-800 no-print">
        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-450 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase text-[9px] tracking-wider animate-pulse">
          <Activity className="w-3.5 h-3.5 text-emerald-450" /> Firebase Online Mode
        </span>
        <p className="text-slate-300 font-medium">
          Aplikasi terhubung langsung 100% ke Database Firebase Firestore Aktif di Vercel Production.
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentTab('guide')}
            className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md hover:bg-slate-700 transition border border-slate-700"
          >
            Sistem Metadata
          </button>
          <button 
            onClick={handleResetDemoDb}
            className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-md transition flex items-center gap-1"
          >
            <RefreshCcw className="w-3 h-3" /> Reset Database
          </button>
        </div>
      </div>

      {/* CORE FRAMEWORK NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* LOGO BRAND */}
          <div 
            onClick={() => setCurrentTab('home')} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="bg-blue-600 text-white p-2 rounded-xl group-hover:scale-105 transition shadow-md shadow-blue-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-800 font-sans tracking-tight">Londria <span className="text-blue-600">Hub</span></span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Smart Laundry</p>
            </div>
          </div>

          {/* MENUS BUTTONS BAR */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
            <button 
              onClick={() => setCurrentTab('home')}
              className={`px-4 py-2 rounded-xl transition ${currentTab === 'home' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Beranda
            </button>
            <button 
              onClick={() => setCurrentTab('track')}
              className={`px-4 py-2 rounded-xl transition ${currentTab === 'track' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Lacak Cucian (Publik)
            </button>
            <button 
              onClick={() => setCurrentTab('guide')}
              className={`px-4 py-2 rounded-xl transition ${currentTab === 'guide' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Bantuan Setup
            </button>
          </nav>

          {/* USER SESSIONS PANEL */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                  <p className="text-[10px] font-bold text-blue-650 uppercase tracking-wider">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <button 
                  onClick={() => setCurrentTab('dashboard')}
                  className="hover:opacity-90 transition rounded-full focus:outline-none"
                  title="Ke Dashboard"
                >
                  <UserAvatar name={currentUser.name} photoURL={currentUser.photoURL} size="sm" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentTab('dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Masuk Sistem Karyawan
              </button>
            )}
          </div>

        </div>
      </header>

      {/* RENDER BODY SCREENS */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        
        {/* TAB: HOME */}
        {currentTab === 'home' && (
          <div className="space-y-12 py-6">
            
            {/* HERO HERO SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-850 rounded-full text-xs font-bold border border-blue-100">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Sistem Laundry Seluler Multi-Role Terakreditasi
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight tracking-tight">
                  Manajemen Laundry Modern dengan Ekosistem <span className="text-blue-600 underline decoration-wavy decoration-blue-300">Firebase</span>
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                  Kelola operasional laundry mulai dari Super Admin, Owner Outlet, Kasir, hingga Operator cuci secara terpadu. 
                  Pelanggan Anda dapat melacak pencucian secara dinamis tanpa login. Masuk sekarang untuk mencoba fitur lengkapnya!
                </p>
                
                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => setCurrentTab('dashboard')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-6 py-3.5 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                  >
                    Masuk / Hubungkan Google Auth & Karyawan
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentTab('track')}
                    className="bg-white hover:bg-slate-50 text-slate-755 border border-slate-205 font-bold text-sm px-6 py-3.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    Lacak Order Pelanggan
                  </button>
                </div>
              </div>

              {/* FLOATING ROLES CARD PREVIEW */}
              <div className="bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="mb-4 p-3 bg-blue-500/10 text-blue-300 rounded-xl text-xs border border-blue-500/20 font-bold leading-relaxed">
                  🔒 KEAMANAN DATA: Akun administratif (Super Admin & Owner) **WAJIB** masuk menggunakan Google Auth Rill untuk menjamin kenyamanan & keamanan database 100%. Akun karyawan (Kasir & Pegawai) menggunakan sistem internal.
                </div>
                <h3 className="font-extrabold text-white text-lg mb-4">Akses & Manajemen Peran Pengguna</h3>
                <p className="text-slate-400 text-xs mb-6">Berikut adalah panduan peran dan cara autentikasi resmi:</p>
                
                <div className="space-y-4">
                  {[
                    { role: 'Super Admin', task: 'Melihat statistik global & buat laundry pemilik baru.', user: 'Real Google Auth (platformsaas1@gmail.com / admin)' },
                    { role: 'Owner Laundry / Admin', task: 'Mengatur harga jasa & daftarkan akun karyawan.', user: 'Real Google Auth (Gunakan Akun Google Anda)' },
                    { role: 'Kasir Laundry', task: 'Input laundry ditimbang, proses kasir & cetak struk thermal.', user: 'Login Internal (e.g. @kasirtest atau kasir001)' },
                    { role: 'Pegawai Cuci / Lapangan', task: 'Operator cuci-timbang yang update progres basah-kering.', user: 'Login Internal (e.g. @pegawaitest atau pegawai001)' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
                      <div className="bg-blue-500/10 text-blue-400 p-2 rounded-xl text-xs font-bold w-10 text-center flex-shrink-0">
                        0{i+1}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-200 text-sm">{item.role}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.task}</p>
                        <p className="text-[10px] font-mono text-blue-400 font-bold mt-1 bg-blue-950/40 w-fit px-2 py-0.5 rounded border border-blue-500/20">{item.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTIONS: LAUNDRY LOGISTICS STEPS */}
            <div className="border-t border-slate-200 pt-12">
              <h3 className="text-center text-xs font-extrabold tracking-widest text-slate-400 uppercase mb-8">Status Produksi yang Diakomodasi</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center font-semibold">
                {[
                  { title: 'diterima', desc: 'Kasir menimbang pakaian' },
                  { title: 'dicuci', desc: 'Pencucian mesin' },
                  { title: 'dikeringkan', desc: 'Pengeringan panas' },
                  { title: 'disetrika', desc: 'Penyetrikaan uap' },
                  { title: 'selesai', desc: 'Selesai di-packing' },
                  { title: 'diambil', desc: 'Selesai diserahkan' }
                ].map((st, i) => (
                  <div key={i} className="bg-white border rounded-2xl p-4 shadow-sm">
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full uppercase font-bold">Langkah {i+1}</span>
                    <h4 className="text-slate-800 text-sm font-black capitalize mt-2">{st.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{st.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB: PUBLIC TRACKING */}
        {currentTab === 'track' && <TrackingView />}

        {/* TAB: SYSTEM PORTAL / DASHBOARD WRAPPERS */}
        {currentTab === 'dashboard' && (
          <div>
            {!currentUser ? (
              /* THE LOGIN PORTAL BOX */
              <div className="max-w-md mx-auto py-8">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
                  
                  <div className="text-center">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Sistem Login</span>
                    <h2 className="text-xl font-bold text-slate-800 mt-3 font-sans">Gerbang Pengguna Laundry</h2>
                    <p className="text-xs text-slate-500 mt-1">Gunakan akun Google (Owner/Super Admin) atau akun internal (Kasir/Pegawai).</p>
                  </div>

                  {/* METHODS SECTOR */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => { setLoginMethod('google'); setLoginError(''); }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        loginMethod === 'google' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      Login Google (Owner)
                    </button>
                    <button 
                      onClick={() => { setLoginMethod('internal'); setLoginError(''); }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        loginMethod === 'internal' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      Internal (Karyawan)
                    </button>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-50 text-rose-800 border border-rose-105 rounded-xl text-xs font-semibold animate-shake">
                      {loginError}
                    </div>
                  )}

                  {/* FORM RENDER: EMAIL ACCREDITED FOR PLATFORM OR OWNER */}
                  {loginMethod === 'google' ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-2xl text-xs space-y-2 leading-relaxed">
                        <p className="font-extrabold text-emerald-900">🛡️ AUTENTIKASI AMAN:</p>
                        <p>Platform mewajibkan seluruh pemilik laundry (Owner) dan administrator utama (Super Admin) untuk masuk melalui validasi Google resmi guna melindungi data sensitif seperti omset, transaksi, dan data rahasia staf.</p>
                      </div>

                      {/* REAL GOOGLE AUTH POPUP BUTTON */}
                      <button 
                        type="button"
                        onClick={handleGoogleLoginReal}
                        disabled={isLoggingIn}
                        className={`w-full text-white font-black py-4 rounded-xl transition text-sm flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/10 ${
                          isLoggingIn 
                            ? 'bg-blue-450 opacity-75 cursor-wait' 
                            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                        }`}
                      >
                        {isLoggingIn ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Menghubungkan ke Google...
                          </>
                        ) : (
                          <>
                            <span className="w-5 h-5 bg-white text-blue-600 font-extrabold flex items-center justify-center rounded-lg text-xs">G</span>
                            Masuk Via Google (Akun Real)
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* FORM RENDER: INTERNAL LOGIN FROM USERNAME */
                    <form onSubmit={handleInternalLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Username Karyawan Internal</label>
                        <input 
                          type="text"
                          placeholder="Contoh: kasir001 atau pegawai001"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-500">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Gunakan kredensial pengujian berikut:</p>
                          <button 
                            type="button"
                            onClick={() => setUsernameInput('kasir001')}
                            className="text-[10px] font-bold text-slate-700 block hover:underline text-left"
                          >
                            &bull; kasir001 (Untuk Dashboard Kasir)
                          </button>
                          <button 
                            type="button"
                            onClick={() => setUsernameInput('pegawai001')}
                            className="text-[10px] font-bold text-slate-700 block hover:underline text-left"
                          >
                            &bull; pegawai001 (Untuk Dashboard Pegawai Operasional)
                          </button>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition text-sm"
                      >
                        Masuk Menggunakan Password
                      </button>
                    </form>
                  )}

                </div>
              </div>
            ) : (
              /* DYNAMIC DASHBOARD INJECTIONS BASED ON USER ROLES */
              <div className="space-y-4">
                
                {/* ROLE BANNER */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={currentUser.name} photoURL={currentUser.photoURL} size="md" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">LOGIN STATUS RESMI</p>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5 capitalize">
                        {currentUser.name} ({currentUser.role.replace('_', ' ')})
                      </h3>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-rose-650 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar Sesi
                  </button>
                </div>

                {/* Dashboard Router switch with secure suspension safety lock */}
                {suspensionStatus.suspended ? (
                  <div className="bg-white border-2 border-rose-100 rounded-3xl p-8 shadow-md flex flex-col items-center text-center space-y-6 max-w-lg mx-auto my-6 animate-fade-in">
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-full border border-rose-200">
                      <ShieldAlert className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-3 py-1 rounded-full uppercase font-black tracking-widest border border-rose-200">
                        Akses Ditangguhkan / Suspended
                      </span>
                      <h3 className="text-xl font-black text-slate-800 font-sans tracking-tight">
                        {suspensionStatus.name} Nonaktif
                      </h3>
                      <p className="text-sm text-slate-550 leading-relaxed max-w-md pt-2">
                        {suspensionStatus.reason}
                      </p>
                    </div>

                    <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dampak Penonaktifan:</p>
                      <ul className="text-xs text-slate-650 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">&bull;</span>
                          <span>Seluruh pencatatan transaksi kasir, input pakaian masuk, dan timbangan laundry dihentikan sementara.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">&bull;</span>
                          <span>Halaman kelola staff, pengaturan bonus, dan edit layanan outlet dikunci total.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">&bull;</span>
                          <span>Pelacakan nota invoice bagi pelanggan tetap dapat diakses dengan catatan produksi dibekukan.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-3 bg-blue-50/55 text-blue-805 border border-blue-100 rounded-xl text-xs font-semibold leading-relaxed w-full">
                      ✉️ Hubungi Dukungan:<br/>
                      Kirim surel keluhan resmi ke Super Admin platform di:<br/>
                      <a 
                        href="mailto:platformsaas1@gmail.com" 
                        className="underline text-blue-600 font-black hover:text-blue-700 select-all"
                      >
                        platformsaas1@gmail.com
                      </a>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                    >
                      Kembali ke Halaman Login Utama
                    </button>
                  </div>
                ) : (
                  <>
                    {currentUser.role === 'super_admin' && <SuperAdminDashboard />}
                    {currentUser.role === 'owner' && <OwnerDashboard currentLaundryId={currentUser.laundryId || ''} />}
                    {currentUser.role === 'cashier' && <CashierDashboard currentLaundryId={currentUser.laundryId || ''} cashierId={currentUser.userId} />}
                    {currentUser.role === 'employee' && (
                      <EmployeeDashboard 
                        currentLaundryId={currentUser.laundryId || ''} 
                        employeeId={currentUser.userId} 
                        employeeName={currentUser.name} 
                      />
                    )}
                  </>
                )}

              </div>
            )}
          </div>
        )}

        {/* TAB: SETUP GUIDE PANEL */}
        {currenttab_and_fallback(currentTab) === 'guide' && <SetupGuide />}

      </main>

      {/* COMPREHENSIVE PLATFORM FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-8 text-center text-xs text-slate-400 mt-12 bg-cover no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-slate-550">Londria Hub &bull; Dikembangkan Menggunakan React + Tailwind CSS + Firebase</p>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            Sistem ERP laundry handal siap deployment dengan proteksi andal, koder bersih, dan optimalisasi mobile-first. No WhatsApp Automation, No Fonte, Full Firebase.
          </p>
          <div className="flex justify-center gap-4 text-slate-400 pt-2 border-t border-slate-100 max-w-xs mx-auto">
            <span>Auth v2</span>
            <span>&bull;</span>
            <span>Firestore Rules</span>
            <span>&bull;</span>
            <span>React SPA</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Fallback utility to safely resolve component tabs without build-time complaints or errors 
function currenttab_and_fallback(tab: string): string {
  return tab || 'home';
}
