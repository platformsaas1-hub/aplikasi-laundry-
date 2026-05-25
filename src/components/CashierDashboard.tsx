/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  PlusCircle, 
  Search, 
  Receipt, 
  Printer, 
  CreditCard, 
  Check, 
  Calendar, 
  Clock, 
  Coins, 
  User, 
  Phone, 
  Layers, 
  ArrowLeft,
  X 
} from 'lucide-react';
import { laundryService } from '../firebase';
import { Laundry, LaundryOrder, LaundryService as ServiceModel, PaymentStatus } from '../types';
import QRCode from 'react-qr-code';

interface CashierDashboardProps {
  currentLaundryId: string;
  cashierId: string;
}

export default function CashierDashboard({ currentLaundryId, cashierId }: CashierDashboardProps) {
  const [activeTab, setActiveTab] = React.useState<'list' | 'create'>('list');
  const [services, setServices] = React.useState<ServiceModel[]>([]);
  const [orders, setOrders] = React.useState<LaundryOrder[]>([]);
  const [laundry, setLaundry] = React.useState<Laundry | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // New Order Form States
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [selectedServiceId, setSelectedServiceId] = React.useState('');
  const [weight, setWeight] = React.useState<number>(1);
  const [notes, setNotes] = React.useState('');
  const [initialPaymentStatus, setInitialPaymentStatus] = React.useState<PaymentStatus>('unpaid');
  const [formSuccess, setFormSuccess] = React.useState<LaundryOrder | null>(null);

  // Active Selected Invoice Overlay State
  const [viewInvoiceOrder, setViewInvoiceOrder] = React.useState<LaundryOrder | null>(null);
  const [paymentModalOrder, setPaymentModalOrder] = React.useState<LaundryOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'transfer'>('cash');

  const loadData = () => {
    setServices(laundryService.getServices(currentLaundryId));
    setOrders(laundryService.getOrders(currentLaundryId));
    
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

  // Handle Order Submit (Cashier Action)
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !selectedServiceId) {
      alert('Harap lengkapi isian form!');
      return;
    }

    const selectedService = services.find(s => s.serviceId === selectedServiceId);
    if (!selectedService) return;

    // Calculation
    const totalPrice = Math.round(selectedService.price * weight);
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + selectedService.estimateDays);

    const created = laundryService.createOrder({
      laundryId: currentLaundryId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      weight: Number(weight),
      unit: selectedService.unit,
      serviceId: selectedServiceId,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      totalPrice,
      paymentStatus: initialPaymentStatus,
      laundryStatus: 'diterima',
      notes: notes.trim(),
      estimatedCompletion: estimatedCompletion.toISOString(),
      cashierId
    });

    setFormSuccess(created);
    
    // Reset Form
    setCustomerName('');
    setCustomerPhone('');
    setSelectedServiceId('');
    setWeight(1);
    setNotes('');
    setInitialPaymentStatus('unpaid');

    loadData();
  };

  // Handle Recording an unpaid order payment
  const handleConfirmPayment = () => {
    if (!paymentModalOrder) return;
    
    laundryService.receivePayment(
      paymentModalOrder.orderId, 
      paymentModalOrder.totalPrice, 
      paymentMethod, 
      cashierId
    );

    setPaymentModalOrder(null);
    loadData();
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Fuzzy Search Match in Orders
  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customerPhone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 relative animate-fade-in">
      
      {/* CASHIER HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
            Sistem Kasir Utama {laundry ? `• ${laundry.name}` : ''}
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Katalog Transaksi Outlet</h1>
        </div>
        
        {/* TAB SWITCH */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => { setActiveTab('list'); setFormSuccess(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Daftar Cucian
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'create' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            Terima Order Baru
          </button>
        </div>
      </div>

      {/* RENDER VIEW: LIST TAB */}
      {activeTab === 'list' && (
        <div className="space-y-5">
          {/* SEARCH & REFRESH */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari cucian dengan Nama Pelanggan, No Telepon, atau Invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* TABLE OF TRANSACTIONS */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-slate-700">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200/80">
                    <th className="py-3.5 px-6">Invoice</th>
                    <th className="py-3.5 px-6">Pelanggan</th>
                    <th className="py-3.5 px-6">Bobot Cucian</th>
                    <th className="py-3.5 px-6">Layanan</th>
                    <th className="py-3.5 px-6">Status Laundri</th>
                    <th className="py-3.5 px-6">Pembayaran</th>
                    <th className="py-3.5 px-6 text-center">Aksi Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredOrders.map(order => (
                    <tr key={order.orderId} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">{order.invoiceNo}</td>
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800">{order.customerName}</p>
                        <p className="text-xs text-slate-400">{order.customerPhone}</p>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-600">{order.weight} {order.unit}</td>
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800 text-xs">{order.serviceName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatRupiah(order.servicePrice)} / {order.unit}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-100">
                          {order.laundryStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {order.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                            <Check className="w-3 h-3" />
                            Lunas
                          </span>
                        ) : (
                          <button 
                            onClick={() => setPaymentModalOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-bold transition shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                            Bayar Sekarang
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setViewInvoiceOrder(order)}
                            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                            title="Print Invoice"
                          >
                            <Receipt className="w-4 h-4 text-slate-500" />
                            Print Nota
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 px-6 text-center text-slate-400">
                        Cucian yang dicari tidak ditemukan atau daftar masih kosong.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: CREATE TAB */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          
          {formSuccess ? (
            /* PRINT NOTA PROMPT AFTER CREATE */
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-center space-y-4">
              <div className="bg-emerald-50 text-emerald-600 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Cucian Berhasil Diterima!</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Order laundry atas nama <strong>{formSuccess.customerName}</strong> telah teregistrasi dengan Invoice <strong>{formSuccess.invoiceNo}</strong>.
              </p>
              
              <div className="flex flex-wrap gap-3 justify-center pt-4">
                <button 
                  onClick={() => setViewInvoiceOrder(formSuccess)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow flex items-center gap-2 text-sm"
                >
                  <Receipt className="w-4 h-4" />
                  Cetak Nota Transaksi
                </button>
                <button 
                  onClick={() => { setFormSuccess(null); setActiveTab('list'); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-xl transition text-sm"
                >
                  Kembali ke Daftar Order
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-500" />
                Registrasi Laundry Baru
              </h2>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                
                {/* PELANGGAN COLUMN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nama Pelanggan</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Nama Lengkap"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nomor HP Pelanggan</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel"
                        placeholder="Contoh: 0812345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SERVICES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Layanan / Jasa</label>
                    <select 
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Kenakan Tarif Jasa --</option>
                      {services.map(s => (
                        <option key={s.serviceId} value={s.serviceId}>
                          {s.name} ({formatRupiah(s.price)}/{s.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Berat / Qty</label>
                    <input 
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* ADDTIONAL FIELDS */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Catatan Khusus</label>
                  <textarea 
                    placeholder="Contoh: Pakaian luntur, kancing copot, atau minta pewangi ekstra..."
                    rows={2.5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Metode Bayar Depan</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="radio"
                        name="paymentInitStatus"
                        value="unpaid"
                        checked={initialPaymentStatus === 'unpaid'}
                        onChange={() => setInitialPaymentStatus('unpaid')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      Bayar Belakangan
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-medium">
                      <input 
                        type="radio"
                        name="paymentInitStatus"
                        value="paid"
                        checked={initialPaymentStatus === 'paid'}
                        onChange={() => setInitialPaymentStatus('paid')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      Lunas di Depan (Tunai/Cash)
                    </label>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-2 mt-4"
                >
                  <PlusCircle className="w-4 h-4" />
                  Kirim & Selesaikan Order
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* =====================================
          THERMAL RECEIPT OVERLAY MODAL (PRINT STYLES)
          ===================================== */}
      {viewInvoiceOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl p-6 max-w-sm w-full font-serif shadow-2xl relative">
            <button 
              onClick={() => setViewInvoiceOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* INVOICE CONTENT TO PRINT */}
            <div id="print-area" className="p-2 text-slate-800 text-xs flex flex-col items-center">
              
              <div className="text-center mb-4 pb-3 border-b border-dashed border-slate-300 w-full">
                <h3 className="text-base font-black uppercase tracking-wider font-sans">CLEAN & FRESH LAUNDRY</h3>
                <p className="font-sans text-[10px] text-slate-500 mt-1">Sistem Laundry Modern Multi-Role</p>
                <p className="font-sans text-[10px] text-slate-500">Telp: 0812-3456-7800</p>
              </div>

              <div className="w-full space-y-1.5 mb-4 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span>No. Invoice:</span>
                  <span className="font-bold">{viewInvoiceOrder.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{new Date(viewInvoiceOrder.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{viewInvoiceOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>HP:</span>
                  <span>{viewInvoiceOrder.customerPhone}</span>
                </div>
              </div>

              <div className="w-full border-t border-b border-dashed border-slate-300 py-2.5 mb-4 font-sans">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>Layanan</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between text-slate-600 mt-1">
                  <span>{viewInvoiceOrder.serviceName}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold mt-0.5">
                  <span>{viewInvoiceOrder.weight} {viewInvoiceOrder.unit} x {formatRupiah(viewInvoiceOrder.servicePrice)}</span>
                  <span>{formatRupiah(viewInvoiceOrder.totalPrice)}</span>
                </div>
              </div>

              <div className="w-full space-y-1.5 mb-4 font-mono text-[10px] text-right">
                <div className="flex justify-between text-[11px] font-black border-b border-slate-250 pb-1.5">
                  <span className="font-sans font-bold">TOTAL AKHIR:</span>
                  <span>{formatRupiah(viewInvoiceOrder.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Bayar:</span>
                  <span className="font-bold uppercase">{viewInvoiceOrder.paymentStatus === 'paid' ? 'LUNAS (Cash/Trans)' : 'BELUM BAYAR'}</span>
                </div>
              </div>

              <div className="flex flex-col items-center mt-3 pt-3 border-t border-dashed border-slate-300 w-full text-center">
                {/* Small tracking details */}
                <p className="font-sans text-[9px] text-slate-500 leading-relaxed max-w-[220px]">
                  Bisa dilacak mandiri di web dengan invoice ini atau scan koordinat QR. Terima kasih atas kepercayaan Anda!
                </p>
                <div className="mt-2.5 p-2.5 bg-white border border-slate-105 rounded-xl shadow-xs flex items-center justify-center">
                  <QRCode 
                    value={`https://app-laundry-one.vercel.app/tracking/${viewInvoiceOrder.invoiceNo}`}
                    size={84}
                    level="H"
                  />
                </div>
                <span className="font-sans font-bold text-[9px] text-slate-400 mt-2 font-mono">ID: {viewInvoiceOrder.orderId}</span>
              </div>

            </div>

            {/* BUTTONS IN SCREEN MODE */}
            <div className="mt-6 flex gap-2 w-full font-sans">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition flex items-center justify-center gap-1.5 text-sm"
              >
                <Printer className="w-4 h-4" />
                Cetak Cetakan
              </button>
              <button 
                onClick={() => setViewInvoiceOrder(null)}
                className="flex-1 bg-slate-105 hover:bg-slate-150 text-slate-700 font-bold py-2 rounded-xl transition text-sm text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          BAYAR SEKARANG MODAL OVERLAY
          ===================================== */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border text-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-black text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              Selesaikan Pembayaran
            </h3>

            <div className="text-sm space-y-1 bg-slate-50 p-4 border rounded-xl">
              <p className="text-xs text-slate-400">Nomor Invoice:</p>
              <p className="font-semibold">{paymentModalOrder.invoiceNo}</p>
              <p className="text-xs text-slate-400 pt-2">Pelanggan:</p>
              <p className="font-semibold">{paymentModalOrder.customerName}</p>
              <p className="text-xs text-slate-400 pt-2">Total Tagihan:</p>
              <p className="font-black text-rose-600 text-lg">{formatRupiah(paymentModalOrder.totalPrice)}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-3 px-4 border rounded-xl font-bold text-xs transition ${
                    paymentMethod === 'cash' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  Uang Tunai (Cash)
                </button>
                <button 
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-3 px-4 border rounded-xl font-bold text-xs transition ${
                    paymentMethod === 'transfer' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  Transfer Bank
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleConfirmPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition text-sm shadow-sm"
              >
                Konfirmasi Lunas
              </button>
              <button 
                onClick={() => setPaymentModalOrder(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
