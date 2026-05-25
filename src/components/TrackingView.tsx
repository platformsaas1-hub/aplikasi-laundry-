/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Search, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Info, 
  ArrowLeft,
  QrCode,
  User,
  Printer
} from 'lucide-react';
import { laundryService } from '../firebase';
import { LaundryOrder, OrderProgress, LaundryStatus } from '../types';
import QRCode from 'react-qr-code';

export default function TrackingView() {
  const [searchVal, setSearchVal] = React.useState('');
  const [order, setOrder] = React.useState<LaundryOrder | null>(null);
  const [progress, setProgress] = React.useState<OrderProgress[]>([]);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [showQrSim, setShowQrSim] = React.useState(false);

  // Check URL query parameters for automatic tracking (e.g., ?invoice=INV-2026-0001)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceQuery = params.get('invoice') || params.get('tracking');
    if (invoiceQuery) {
      setSearchVal(invoiceQuery);
      handleTrack(invoiceQuery);
    }
  }, []);

  const handleTrack = (invoice: string) => {
    setErrorMsg('');
    if (!invoice.trim()) {
      setErrorMsg('Harap masukkan nomor invoice Anda.');
      return;
    }

    const foundOrder = laundryService.getOrderByInvoice(invoice);
    if (foundOrder) {
      setOrder(foundOrder);
      const trace = laundryService.getOrderProgress(foundOrder.orderId);
      setProgress(trace);
    } else {
      setOrder(null);
      setProgress([]);
      setErrorMsg('No. Invoice tidak ditemukan. Silakan periksa kembali ketikan Anda.');
    }
  };

  const statusProgressLevels: Record<LaundryStatus, number> = {
    diterima: 15,
    dicuci: 35,
    dikeringkan: 55,
    disetrika: 75,
    selesai: 95,
    diambil: 100
  };

  const statusBadgeColor = (status: LaundryStatus) => {
    switch(status) {
      case 'diterima': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dicuci': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'dikeringkan': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'disetrika': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'selesai': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'diambil': return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Branding & Sub-Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
          Tracking Laundry Publik
        </h1>
        <p className="text-slate-500 text-sm max-w-lg mx-auto">
          Cek progres cucian Anda secara real-time tanpa perlu mendaftar atau login. 
          Gunakan nomor invoice yang terdapat pada nota fisik Anda.
        </p>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Contoh: INV-2026-0001"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack(searchVal)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button 
            onClick={() => handleTrack(searchVal)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Cari Nota
          </button>
        </div>
        {errorMsg && (
          <p className="text-rose-500 text-xs mt-3 flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            {errorMsg}
          </p>
        )}
      </div>

      {/* RESULT CONTAINER */}
      {order ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* CORE SNAPSHOT CARD */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Nomor Nota Invoice</p>
                <h2 className="text-xl font-bold text-slate-800">{order.invoiceNo}</h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowQrSim(!showQrSim)}
                  className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition"
                  title="Tunjukkan QR Code"
                >
                  <QrCode className="w-5 h-5" />
                </button>
                <button 
                  onClick={printInvoice}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition flex items-center gap-1.5 shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Nota
                </button>
              </div>
            </div>

            {/* QR SIMULATOR POPUP */}
            {showQrSim && (
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs mb-3 flex items-center justify-center">
                  <QRCode 
                    value={`https://app-laundry-one.vercel.app/tracking/${order.invoiceNo}`}
                    size={112}
                    level="H"
                  />
                </div>
                <p className="text-xs text-slate-600 font-medium max-w-xs">
                  Scan QR ini untuk langsung mengakses status order di handphone Anda secara mandiri.
                </p>
              </div>
            )}

            <div className="p-6">
              
              {/* STEPS progress bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Progres Laundry</span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">{order.laundryStatus}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${statusProgressLevels[order.laundryStatus]}%` }}
                  />
                </div>
                {/* Horizontal Indicators */}
                <div className="grid grid-cols-6 text-[10px] text-slate-400 font-medium text-center mt-2 gap-1">
                  <div className={order.laundryStatus === 'diterima' ? 'text-blue-600 font-bold' : ''}>Diterima</div>
                  <div className={order.laundryStatus === 'dicuci' ? 'text-yellow-600 font-bold' : ''}>Dicuci</div>
                  <div className={order.laundryStatus === 'dikeringkan' ? 'text-orange-600 font-bold' : ''}>Dikeringkan</div>
                  <div className={order.laundryStatus === 'disetrika' ? 'text-purple-600 font-bold' : ''}>Disetrika</div>
                  <div className={order.laundryStatus === 'selesai' ? 'text-emerald-600 font-bold' : ''}>Selesai</div>
                  <div className={order.laundryStatus === 'diambil' ? 'text-slate-600 font-bold' : ''}>Sudah Diambil</div>
                </div>
              </div>

              {/* CORE INFO LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Pelanggan</p>
                      <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
                      <p className="text-xs text-slate-500">{order.customerPhone.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Perkiraan Selesai</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(order.estimatedCompletion).toLocaleDateString('id-ID', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Total Harga ({order.weight} {order.unit})</p>
                      <p className="text-sm font-bold text-slate-800">{formatRupiah(order.totalPrice)}</p>
                      <p className="text-xs text-slate-500">{order.serviceName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Status Pembayaran</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1 capitalize ${
                        order.paymentStatus === 'paid' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                          : 'bg-rose-50 text-rose-800 border-rose-100'
                      }`}>
                        {order.paymentStatus === 'paid' ? 'LUNAS (Selesai Pembayaran)' : 'BELUM BAYAR'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* TIMELINE PROGRESS LOG CARDS */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-500" />
              Histori Perjalanan Laundry
            </h3>
            
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
              {progress.length === 0 ? (
                <p className="text-slate-400 text-sm">Belum ada pembaruan log progres laundry.</p>
              ) : (
                progress.map((log, index) => (
                  <div key={log.progressId} className="relative">
                    {/* Circle marker */}
                    <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 bg-white border-blue-500" />
                    
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadgeColor(log.status)}`}>
                          {log.status}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(log.updatedAt).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{log.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Diverifikasi oleh: <span className="font-semibold">{log.updatedByName}</span></p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* TRACKING ENCOURAGEMENT GRAPHIC */
        <div className="text-center py-12 px-6 border border-dashed border-slate-200 bg-slate-50 rounded-2xl">
          <div className="bg-blue-50 text-blue-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
            <Info className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Pencarian</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Gunakan kotak pencarian di atas dengan mengetikkan nomor invoice laundry Anda (misal: <code>INV-2026-0001</code>) untuk melacak pengerjaan pakaian.
          </p>
        </div>
      )}
    </div>
  );
}
