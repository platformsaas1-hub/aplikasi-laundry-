/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Play, 
  CheckSquare, 
  RotateCcw, 
  Info, 
  Calendar, 
  Clipboard, 
  Edit3, 
  CheckCircle,
  Truck,
  FileCheck,
  Zap
} from 'lucide-react';
import { laundryService } from '../firebase';
import { Laundry, LaundryOrder, LaundryStatus } from '../types';

interface EmployeeDashboardProps {
  currentLaundryId: string;
  employeeId: string;
  employeeName: string;
}

export default function EmployeeDashboard({ currentLaundryId, employeeId, employeeName }: EmployeeDashboardProps) {
  const [orders, setOrders] = React.useState<LaundryOrder[]>([]);
  const [laundry, setLaundry] = React.useState<Laundry | null>(null);
  const [filterMode, setFilterMode] = React.useState<'active' | 'all'>('active');

  // Interactive update status state
  const [editingOrder, setEditingOrder] = React.useState<LaundryOrder | null>(null);
  const [notesText, setNotesText] = React.useState('');
  const [targetStatus, setTargetStatus] = React.useState<LaundryStatus>('diterima');

  const loadData = () => {
    const list = laundryService.getOrders(currentLaundryId);
    setOrders(list);
    
    const laundries = laundryService.getLaundries();
    const lnd = laundries.find(item => item.laundryId === currentLaundryId);
    if (lnd) {
      setLaundry(lnd);
    }
  };

  React.useEffect(() => {
    loadData();
    const unsubscribe = laundryService.subscribeToChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [currentLaundryId]);

  const handleOpenUpdateModal = (order: LaundryOrder, status: LaundryStatus) => {
    setEditingOrder(order);
    setTargetStatus(status);
    setNotesText('');
  };

  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    laundryService.updateOrderStatus(
      editingOrder.orderId, 
      targetStatus, 
      notesText.trim(), 
      employeeId, 
      employeeName
    );

    setEditingOrder(null);
    loadData();
  };

  const nextStatusMap: Record<LaundryStatus, LaundryStatus | null> = {
    diterima: 'dicuci',
    dicuci: 'dikeringkan',
    dikeringkan: 'disetrika',
    disetrika: 'selesai',
    selesai: 'diambil',
    diambil: null
  };

  const statusProgressColor = (status: LaundryStatus) => {
    switch(status) {
      case 'diterima': return 'border-l-4 border-blue-500 bg-blue-50/10';
      case 'dicuci': return 'border-l-4 border-yellow-500 bg-yellow-50/10';
      case 'dikeringkan': return 'border-l-4 border-orange-500 bg-orange-50/10';
      case 'disetrika': return 'border-l-4 border-purple-500 bg-purple-50/10';
      case 'selesai': return 'border-l-4 border-emerald-500 bg-emerald-50/10';
      case 'diambil': return 'border-l-4 border-slate-300 bg-slate-50/10';
    }
  };

  // Filter orders
  const displayOrders = orders.filter(o => {
    if (filterMode === 'active') {
      return o.laundryStatus !== 'diambil' && o.laundryStatus !== 'selesai';
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-650 uppercase tracking-widest">
            Dashboard Operator Lapangan {laundry ? `• ${laundry.name}` : ''}
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Antrean Cuci & Setrika</h1>
        </div>

        {/* ACTIVE FILTER */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setFilterMode('active')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Aktif (Harus Dikerjakan)
          </button>
          <button 
            onClick={() => setFilterMode('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Semua Histori ({orders.length})
          </button>
        </div>
      </div>

      {/* ORDERS OPERATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displayOrders.map(order => {
          const next = nextStatusMap[order.laundryStatus];
          
          return (
            <div 
              key={order.orderId}
              className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition flex flex-col justify-between ${statusProgressColor(order.laundryStatus)}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-slate-800">{order.invoiceNo}</span>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-bold uppercase text-[10px] tracking-wider">
                    {order.laundryStatus}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <h4 className="font-bold text-slate-800 text-sm leading-snug">{order.customerName}</h4>
                  <p className="text-xs text-slate-500 font-medium">Layanan: <span className="font-semibold text-slate-800">{order.serviceName}</span></p>
                  <p className="text-xs text-slate-500 font-medium">Jumlah: <span className="font-bold text-slate-800">{order.weight} {order.unit}</span></p>
                  {order.notes && (
                    <div className="p-2.5 bg-amber-50/40 border border-amber-100 rounded-xl text-amber-900 text-xs">
                      <span className="font-bold">Memo:</span> {order.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION TOGGLERS BAR */}
              <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 gap-y-2">
                <div className="text-[10px] font-mono text-slate-400">
                  Estimasi: {new Date(order.estimatedCompletion).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'})}
                </div>

                {next ? (
                  <button 
                    onClick={() => handleOpenUpdateModal(order, next)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 self-end sm:self-auto"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Proses Ke: <span className="uppercase font-bold">{next}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Selesai & Diambil
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {displayOrders.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <Clipboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-bold mb-1">Antrean Kerja Bersih!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada pakaian dalam antrean pengolahan laundry saat ini. Kerja bagus!
            </p>
          </div>
        )}
      </div>

      {/* =====================================
          DIALOG MODAL: SAVE LOG NOTES
          ===================================== */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveProgress}
            className="bg-white border text-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <h3 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-500" />
              Update Progres Cucian
            </h3>

            <div className="p-3.5 bg-slate-50 rounded-xl border space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Invoice Nota</p>
              <p className="font-mono font-bold text-slate-800 text-xs">{editingOrder.invoiceNo}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2">Pelanggan</p>
              <p className="font-bold text-slate-700 text-xs">{editingOrder.customerName}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2">Peralihan Tahap Progres</p>
              <p className="text-xs font-semibold text-blue-600">
                <span className="uppercase text-slate-400 line-through mr-1">{editingOrder.laundryStatus}</span>
                &rarr; 
                <span className="uppercase font-extrabold bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 ml-1">{targetStatus}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Catatan Operasional (Opsional)</label>
              <textarea 
                placeholder="Contoh: Mesin cuci #3, disetrika lipat, atau kendala mati lampu..."
                rows={3}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm"
              >
                Simpan & Update
              </button>
              <button 
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
