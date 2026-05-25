/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Terminal, 
  Database, 
  ShieldAlert, 
  Globe, 
  Github, 
  Key, 
  Layers, 
  ClipboardCopy 
} from 'lucide-react';

export default function SetupGuide() {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Definisi Helper
    function isSignedIn() { return request.auth != null; }
    function getAuthUser() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }

    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || getAuthUser().role == 'super_admin');
      allow write: if isSignedIn() && getAuthUser().role == 'super_admin';
    }
    match /laundries/{laundryId} {
      allow read: if true;
      allow write: if isSignedIn() && getAuthUser().role == 'super_admin';
    }
  }
}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 max-w-4xl mx-auto shadow-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white font-sans">Pusat Bantuan & Setup Firebase</h2>
          <p className="text-xs text-slate-400">Ikuti panduan berikut untuk meluncurkan aplikasi laundry modern Anda ke server produksi.</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* STEP 1 */}
        <div className="border border-slate-800 rounded-xl p-5 bg-slate-950">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium">
            <Database className="w-5 h-5" />
            <h3>1. Membuat Project di Firebase Console</h3>
          </div>
          <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 mt-2">
            <li>Buka browser dan buka <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Firebase Console</a>.</li>
            <li>Klik tombol <strong>"Add Project"</strong> / "Tambah Proyek", masukkan nama proyek pilihan Anda (misalnya: <code>laundry-modern-app</code>).</li>
            <li>Centang opsi Google Analytics bila diperlukan, lalu selesaikan pembuatan proyek.</li>
            <li>Setelah masuk ke Dashboard Proyek, klik ikon <strong>Web (<code>&lt;/&gt;</code>)</strong> untuk mendaftarkan Aplikasi Web baru.</li>
            <li>Beri nama aplikasi web tersebut, lalu klik <strong>"Register App"</strong>. Salin kode config JSON yang dihasilkan.</li>
          </ol>
        </div>

        {/* STEP 2 */}
        <div className="border border-slate-800 rounded-xl p-5 bg-slate-950">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium">
            <Key className="w-5 h-5" />
            <h3>2. Konfigurasi Autentikasi dan Firestore</h3>
          </div>
          <div className="text-sm text-slate-300 space-y-4">
            <div>
              <p className="font-semibold text-slate-200">A. Firebase Authentication:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-1">
                <li>Di menu samping, klik <strong>Build &gt; Authentication &gt; Get Started</strong>.</li>
                <li>Aktifkan metode login <strong>"Google Sign-In"</strong> (untuk Super Admin dan Laundry Owner).</li>
                <li>Aktifkan metode login <strong>"Email/Password"</strong> (untuk Kasir dan Pegawai internal).</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-200">B. Cloud Firestore Database:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-1">
                <li>Klik <strong>Build &gt; Firestore Database &gt; Create Database</strong>.</li>
                <li>Pilih lokasi server terdekat (contoh: <code>asia-southeast1</code> untuk Singapura/Indonesia).</li>
                <li>Mulai dengan memilih <strong>"Start in Test Mode"</strong> demi kemudahan setup awal.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="border border-slate-800 rounded-xl p-5 bg-slate-950">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium">
            <ShieldAlert className="w-5 h-5" />
            <h3>3. Menyiapkan Security Rules</h3>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Untuk mengamankan database agar Owner hanya bisa mengakses laundry miliknya, Kasir mengelola ordernya, dan Publik hanya memantau status laundry, salin rules berikut ke tab <strong>"Rules"</strong> di Firebase Console Firestore:
          </p>
          <div className="relative">
            <pre className="text-xs bg-slate-900 border border-slate-800 p-3 rounded-lg overflow-x-auto text-slate-400 max-h-40">
              {sampleRules}
            </pre>
            <button 
              onClick={() => handleCopy(sampleRules, 'rules')}
              className="absolute top-2 right-2 p-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded text-xs flex items-center gap-1 transition"
            >
              <ClipboardCopy className="w-3 h-3" />
              {copiedText === 'rules' ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>

        {/* STEP 4 */}
        <div className="border border-slate-800 rounded-xl p-5 bg-slate-950">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium">
            <Globe className="w-5 h-5" />
            <h3>4. Deploy ke Firebase Hosting</h3>
          </div>
          <p className="text-sm text-slate-300">
            Aplikasi react ini siap di-build menjadi file statis dan diunggah ke Firebase Hosting:
          </p>
          <div className="mt-3 space-y-2 text-xs font-mono bg-slate-900 p-3 border border-slate-800 rounded-lg text-emerald-400">
            <p># 1. Install Firebase CLI secara global</p>
            <p>npm install -g firebase-tools</p>
            <p className="mt-2"># 2. Login ke akun Google Anda yang terhubung dengan Firebase</p>
            <p>firebase login</p>
            <p className="mt-2"># 3. Hubungkan project lokal Anda</p>
            <p>firebase init hosting</p>
            <p className="text-slate-400 pl-4">→ Gunakan folder "dist" saat ditanya "directory structure"</p>
            <p className="text-slate-400 pl-4">→ Konfigurasi sebagai Single Page App: Yes</p>
            <p className="mt-2"># 4. Build aplikasi & Upload ke Produksi</p>
            <p>npm run build</p>
            <p>firebase deploy --only hosting</p>
          </div>
        </div>

        {/* STEP 5 */}
        <div className="border border-slate-800 rounded-xl p-5 bg-slate-950">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium">
            <Github className="w-5 h-5" />
            <h3>5. Struktur Project Yang Siap Upload ke GitHub</h3>
          </div>
          <p className="text-sm text-slate-300 mb-2">
            Berikut adalah struktur repositori bersih yang siap diunggah ke GitHub milik Anda:
          </p>
          <pre className="text-xs bg-slate-900 border border-slate-800 p-3 rounded-lg text-blue-300">
{`laundry-modern/
├── .github/workflows/      # CI/CD otomatis (opsional)
├── firebase.json           # Konfigurasi deploy hosting & rules
├── firestore.rules         # Security rules database produksi
├── firebase-blueprint.json # Rancangan skema database
├── package.json            # Daftar package dependency react
├── index.html              # Entry point dom statis
├── tsconfig.json           # Setingan compiler Typescript
├── vite.config.ts          # Build bundler config
└── src/
    ├── main.tsx            # Entry point render DOM
    ├── index.css           # Styling global dengan Tailwind CSS
    ├── types.ts            # Deklarasi model data user / order
    ├── firebase.ts         # Inisialisasi Firebase & local fallback
    ├── App.tsx             # Gerbang Router & UI Utama
    └── components/         # Komponen dashboard dan tracking views
        ├── SuperAdminDashboard.tsx
        ├── OwnerDashboard.tsx
        ├── CashierDashboard.tsx
        ├── EmployeeDashboard.tsx
        ├── TrackingView.tsx
        └── SetupGuide.tsx`}
          </pre>
        </div>

      </div>
    </div>
  );
}
