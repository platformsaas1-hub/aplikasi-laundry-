/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  collectionGroup,
  query,
  where
} from 'firebase/firestore';
import { db as libDb, auth as libAuth, googleProvider, useRealFirebase } from './lib/firebase';
import { 
  UserProfile, 
  Laundry, 
  LaundryService, 
  LaundryOrder, 
  OrderProgress, 
  LaundryPayment,
  LaundryStatus,
  Customer
} from './types';

export { libDb as db, libAuth as auth, useRealFirebase };

// ==========================================
// ERROR HANDLER COMPLIANCE FOR FIRESTORE RULES SPECIALIZATION
// ==========================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: libAuth.currentUser?.uid,
      email: libAuth.currentUser?.email,
      emailVerified: libAuth.currentUser?.emailVerified,
      isAnonymous: libAuth.currentUser?.isAnonymous,
      tenantId: libAuth.currentUser?.tenantId,
      providerInfo: libAuth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Membuang field yang bernilai undefined dari sebuah objek secara rekursif
 * agar tidak memicu error ketika write ke database Firestore.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// ==========================================
// LANDING INITIAL STATE & SEED DATA DEFINITIONS
// ==========================================

const INITIAL_LAUNDRIES: Laundry[] = [
  {
    laundryId: 'laundry_clean_fresh',
    name: 'Clean & Fresh Laundry Utama',
    address: 'Jl. Merdeka No. 45, Bandung',
    phone: '081234567800',
    ownerId: 'owner_sugiharti',
    isActive: true,
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    laundryId: 'laundry_express_pro',
    name: 'Express Laundry Pro',
    address: 'Jl. Asia Afrika No. 12, Jakarta',
    phone: '089876543200',
    ownerId: 'owner_budi',
    isActive: true,
    createdAt: new Date('2026-05-15').toISOString()
  }
];

const INITIAL_SERVICES: LaundryService[] = [
  {
    serviceId: 'srv_clean_fresh_kiloan_3d',
    laundryId: 'laundry_clean_fresh',
    name: 'Cuci Setrika Kiloan (Reguler 3 Hari)',
    price: 7000,
    unit: 'kg',
    estimateDays: 3,
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    serviceId: 'srv_clean_fresh_kiloan_1d',
    laundryId: 'laundry_clean_fresh',
    name: 'Cuci Setrika Kiloan (Express 1 Hari)',
    price: 12000,
    unit: 'kg',
    estimateDays: 1,
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    serviceId: 'srv_clean_fresh_blanket',
    laundryId: 'laundry_clean_fresh',
    name: 'Cuci Bedcover / Selimut',
    price: 25000,
    unit: 'pcs',
    estimateDays: 2,
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    serviceId: 'srv_clean_fresh_iron_only',
    laundryId: 'laundry_clean_fresh',
    name: 'Setrika Saja (Reguler 2 Hari)',
    price: 4500,
    unit: 'kg',
    estimateDays: 2,
    createdAt: new Date('2026-05-01').toISOString()
  }
];

const INITIAL_USERS: UserProfile[] = [
  {
    userId: 'admin_platform_uid00',
    email: 'aisugiharti12@admin.smp.belajar.id',
    name: 'Ai Sugiharti (Super Admin)',
    role: 'super_admin',
    isActive: true,
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    userId: 'admin_platform_uid01',
    email: 'platformsaas1@gmail.com',
    name: 'Platform Owner (Super Admin)',
    role: 'super_admin',
    isActive: true,
    createdAt: new Date('2026-05-25').toISOString()
  },
  {
    userId: 'owner_sugiharti_uid01',
    email: 'owner@laundry.com',
    name: 'Hj. Sugiharti (Owner Laundry)',
    role: 'owner',
    laundryId: 'laundry_clean_fresh',
    isActive: true,
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    userId: 'kasir_laundry_uid02',
    username: 'kasir001',
    name: 'Siti Rahma (Kasir)',
    role: 'cashier',
    laundryId: 'laundry_clean_fresh',
    isActive: true,
    createdAt: new Date('2026-05-02').toISOString()
  },
  {
    userId: 'pegawai_laundry_uid03',
    username: 'pegawai001',
    name: 'Dedi Kurnia (Pegawai Cuci)',
    role: 'employee',
    laundryId: 'laundry_clean_fresh',
    isActive: true,
    createdAt: new Date('2026-05-02').toISOString()
  },
  {
    userId: 'owner_budi_uid04',
    email: 'budi@expresslaundry.com',
    name: 'Budi Hartono (Owner Express)',
    role: 'owner',
    laundryId: 'laundry_express_pro',
    isActive: true,
    createdAt: new Date('2026-05-15').toISOString()
  }
];

const INITIAL_ORDERS: LaundryOrder[] = [
  {
    orderId: 'ord_101',
    laundryId: 'laundry_clean_fresh',
    invoiceNo: 'INV-2026-0001',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    weight: 4.5,
    unit: 'kg',
    serviceId: 'srv_clean_fresh_kiloan_3d',
    serviceName: 'Cuci Setrika Kiloan (Reguler 3 Hari)',
    servicePrice: 7000,
    totalPrice: 31500,
    paymentStatus: 'paid',
    laundryStatus: 'disetrika',
    notes: 'Pakaian wangi lavender',
    estimatedCompletion: new Date('2026-05-26T12:00:00Z').toISOString(),
    createdAt: new Date('2026-05-23T08:00:00Z').toISOString(),
    cashierId: 'kasir_laundry_uid02'
  },
  {
    orderId: 'ord_102',
    laundryId: 'laundry_clean_fresh',
    invoiceNo: 'INV-2026-0002',
    customerName: 'Dewi Lestari',
    customerPhone: '085712345678',
    weight: 1,
    unit: 'pcs',
    serviceId: 'srv_clean_fresh_blanket',
    serviceName: 'Cuci Bedcover / Selimut',
    servicePrice: 25000,
    totalPrice: 25000,
    paymentStatus: 'unpaid',
    laundryStatus: 'dicuci',
    notes: 'No bleach',
    estimatedCompletion: new Date('2026-05-26T17:00:00Z').toISOString(),
    createdAt: new Date('2026-05-24T02:30:00Z').toISOString(),
    cashierId: 'kasir_laundry_uid02'
  },
  {
    orderId: 'ord_103',
    laundryId: 'laundry_clean_fresh',
    invoiceNo: 'INV-2026-0003',
    customerName: 'Rian Hidayat',
    customerPhone: '081988776655',
    weight: 3.0,
    unit: 'kg',
    serviceId: 'srv_clean_fresh_kiloan_1d',
    serviceName: 'Cuci Setrika Kiloan (Express 1 Hari)',
    servicePrice: 12000,
    totalPrice: 36000,
    paymentStatus: 'paid',
    laundryStatus: 'selesai',
    notes: 'Minta dipisahkan selimut bayi',
    estimatedCompletion: new Date('2026-05-25T10:00:00Z').toISOString(),
    createdAt: new Date('2026-05-24T10:00:00Z').toISOString(),
    cashierId: 'kasir_laundry_uid02'
  }
];

const INITIAL_PROGRESS: OrderProgress[] = [
  {
    progressId: 'prg_101_1',
    orderId: 'ord_101',
    status: 'diterima',
    description: 'Laundry diterima oleh Kasir Siti Rahma.',
    updatedBy: 'kasir_laundry_uid02',
    updatedByName: 'Siti Rahma',
    updatedAt: new Date('2026-05-23T08:05:00Z').toISOString()
  },
  {
    progressId: 'prg_101_2',
    orderId: 'ord_101',
    status: 'dicuci',
    description: 'Pakaian sedang direndam dan dicuci di mesin cuci.',
    updatedBy: 'pegawai_laundry_uid03',
    updatedByName: 'Dedi Kurnia',
    updatedAt: new Date('2026-05-23T11:00:00Z').toISOString()
  },
  {
    progressId: 'prg_101_3',
    orderId: 'ord_101',
    status: 'dikeringkan',
    description: 'Selesai dicuci, sekarang dimasukkan dalam mesin pengering.',
    updatedBy: 'pegawai_laundry_uid03',
    updatedByName: 'Dedi Kurnia',
    updatedAt: new Date('2026-05-23T14:30:00Z').toISOString()
  },
  {
    progressId: 'prg_101_4',
    orderId: 'ord_101',
    status: 'disetrika',
    description: 'Pakaian sedang disetrika rapih & disemprot pewangi.',
    updatedBy: 'pegawai_laundry_uid03',
    updatedByName: 'Dedi Kurnia',
    updatedAt: new Date('2026-05-24T01:15:00Z').toISOString()
  },
  {
    progressId: 'prg_102_1',
    orderId: 'ord_102',
    status: 'diterima',
    description: 'Bedcover diterima oleh Kasir Siti Rahma.',
    updatedBy: 'kasir_laundry_uid02',
    updatedByName: 'Siti Rahma',
    updatedAt: new Date('2026-05-24T02:35:00Z').toISOString()
  },
  {
    progressId: 'prg_102_2',
    orderId: 'ord_102',
    status: 'dicuci',
    description: 'Bedcover dimasukkan ke mesin cuci heavy duty.',
    updatedBy: 'pegawai_laundry_uid03',
    updatedByName: 'Dedi Kurnia',
    updatedAt: new Date('2026-05-24T03:00:00Z').toISOString()
  }
];

const INITIAL_PAYMENTS: LaundryPayment[] = [
  {
    paymentId: 'pay_101',
    orderId: 'ord_101',
    laundryId: 'laundry_clean_fresh',
    amount: 31500,
    paymentMethod: 'cash',
    paymentDate: new Date('2026-05-23T08:01:00Z').toISOString(),
    cashierId: 'kasir_laundry_uid02'
  },
  {
    paymentId: 'pay_103',
    orderId: 'ord_103',
    laundryId: 'laundry_clean_fresh',
    amount: 36000,
    paymentMethod: 'transfer',
    paymentDate: new Date('2026-05-24T10:05:00Z').toISOString(),
    cashierId: 'kasir_laundry_uid02'
  }
];

// ==========================================
// ACTIVE FIRESTORE REAL-TIME SYNCHRONIZED STORAGE CACHE
// ==========================================

const INITIAL_EXPENSES: LaundryExpense[] = [
  {
    expenseId: 'exp_001',
    laundryId: 'laundry_clean_fresh',
    category: 'operational',
    title: 'Pembelian Deterjen Liquid & Parfum Lavender 10L',
    amount: 185000,
    date: '2026-05-20',
    createdAt: new Date('2026-05-20T10:00:00Z').toISOString()
  },
  {
    expenseId: 'exp_002',
    laundryId: 'laundry_clean_fresh',
    category: 'equipment',
    title: 'Servis Dinamo Mesin Pengering LG Dryer Sektor 3',
    amount: 320000,
    date: '2026-05-22',
    createdAt: new Date('2026-05-22T14:30:00Z').toISOString()
  },
  {
    expenseId: 'exp_003',
    laundryId: 'laundry_clean_fresh',
    category: 'salary',
    title: 'Bonus Insentif Harian Staff Siti Rahma (Lembur Akhir Pekan)',
    amount: 75000,
    date: '2026-05-24',
    createdAt: new Date('2026-05-24T18:00:00Z').toISOString()
  }
];

import { LaundryExpense } from './types';

let cache_users: UserProfile[] = [];
let cache_laundries: Laundry[] = [];
let cache_services: LaundryService[] = [];
let cache_orders: LaundryOrder[] = [];
let cache_progress: OrderProgress[] = [];
let cache_payments: LaundryPayment[] = [];
let cache_expenses: LaundryExpense[] = [];
let cache_customers: Customer[] = [];

let activeSubscriptions: (() => void)[] = [];

let stateChangeListeners: (() => void)[] = [];

export function subscribeToFirebaseChanges(callback: () => void) {
  stateChangeListeners.push(callback);
  return () => {
    stateChangeListeners = stateChangeListeners.filter(cb => cb !== callback);
  };
}

function notifyStateChange() {
  stateChangeListeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.warn("Error calling state change listener:", e);
    }
  });
}

export function clearFirebaseSubscriptions() {
  activeSubscriptions.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      console.warn("Error releasing subscription:", e);
    }
  });
  activeSubscriptions = [];
}

export function startFirebaseSync(user: UserProfile) {
  clearFirebaseSubscriptions();
  if (!useRealFirebase) return;

  const { laundryId, role, userId } = user;
  console.log(`Starting secure context-aware Firebase synchronization...`);

  // 1. Sync User Profile records
  try {
    if (role === 'super_admin') {
      const unsubUsers = onSnapshot(collection(libDb, 'users'), (snapshot) => {
        cache_users = snapshot.docs.map(d => d.data() as UserProfile);
        localStorage.setItem('lnd_users', JSON.stringify(cache_users));
        notifyStateChange();
      }, (error) => {
        console.warn("Active users listener message:", error.message);
      });
      activeSubscriptions.push(unsubUsers);
    } else if (laundryId) {
      const q = query(collection(libDb, 'users'), where('laundryId', '==', laundryId));
      const unsubUsers = onSnapshot(q, (snapshot) => {
        cache_users = snapshot.docs.map(d => d.data() as UserProfile);
        localStorage.setItem('lnd_users', JSON.stringify(cache_users));
        notifyStateChange();
      }, (error) => {
        console.warn("Active staff listener message:", error.message);
      });
      activeSubscriptions.push(unsubUsers);
    }
  } catch (error) {
    console.warn("Failed to subscribe user sync:", error);
  }

  // 2. Sync Laundries records
  try {
    if (role === 'super_admin') {
      const unsubLaundries = onSnapshot(collection(libDb, 'laundries'), (snapshot) => {
        cache_laundries = snapshot.docs.map(d => d.data() as Laundry);
        localStorage.setItem('lnd_laundries', JSON.stringify(cache_laundries));
        notifyStateChange();
      }, (error) => {
        console.warn("Active laundries listener message:", error.message);
      });
      activeSubscriptions.push(unsubLaundries);
    } else if (laundryId) {
      const unsubLaundry = onSnapshot(doc(libDb, 'laundries', laundryId), (snapshot) => {
        if (snapshot.exists()) {
          cache_laundries = [snapshot.data() as Laundry];
          localStorage.setItem('lnd_laundries', JSON.stringify(cache_laundries));
          notifyStateChange();
        }
      }, (error) => {
        console.warn("Active laundry details listener message:", error.message);
      });
      activeSubscriptions.push(unsubLaundry);
    }
  } catch (error) {
    console.warn("Failed to subscribe laundry sync:", error);
  }

  // 3. Sync Services, Orders, and Payments for active laundry context
  if (laundryId) {
    try {
      const unsubServices = onSnapshot(collection(libDb, 'laundries', laundryId, 'services'), (snapshot) => {
        cache_services = snapshot.docs.map(d => d.data() as LaundryService);
        localStorage.setItem('lnd_services', JSON.stringify(cache_services));
        notifyStateChange();
      }, (error) => {
        console.warn("Active laundry services listener message:", error.message);
      });
      activeSubscriptions.push(unsubServices);
    } catch (error) {
      console.warn("Failed to subscribe services sync:", error);
    }

    try {
      const unsubOrders = onSnapshot(collection(libDb, 'laundries', laundryId, 'orders'), (snapshot) => {
        cache_orders = snapshot.docs.map(d => d.data() as LaundryOrder);
        localStorage.setItem('lnd_orders', JSON.stringify(cache_orders));
        notifyStateChange();

        // Safe self-healing: ensure all active orders are properly synced to the public track index 'orders_by_invoice'
        cache_orders.forEach(async (order) => {
          if (order.invoiceNo) {
            const invoiceKey = order.invoiceNo.toUpperCase();
            const pubRef = doc(libDb, 'orders_by_invoice', invoiceKey);
            
            // Sync the main order metadata
            setDoc(pubRef, order, { merge: true }).catch(e => {
              console.warn("Auto-healing sync error for order invoice:", invoiceKey, e);
            });

            // Sync the order's subcollection progress logs to 'orders_by_invoice/{invoiceKey}/progress/'
            try {
              const progColRef = collection(libDb, 'laundries', laundryId, 'orders', order.orderId, 'progress');
              const progSnapshot = await getDocs(progColRef);
              progSnapshot.docs.forEach(pDoc => {
                const progData = pDoc.data();
                const pubProgRef = doc(libDb, 'orders_by_invoice', invoiceKey, 'progress', pDoc.id);
                setDoc(pubProgRef, progData, { merge: true }).catch(err => {
                  console.warn("Auto-healing sync error for progress log:", pDoc.id, err);
                });
              });
            } catch (progErr) {
              console.warn("Failed to fetch order progress logs during auto-healing:", order.orderId, progErr);
            }
          }
        });
      }, (error) => {
        console.warn("Active laundry orders listener message:", error.message);
      });
      activeSubscriptions.push(unsubOrders);
    } catch (error) {
      console.warn("Failed to subscribe orders sync:", error);
    }

    try {
      const unsubPayments = onSnapshot(collection(libDb, 'laundries', laundryId, 'payments'), (snapshot) => {
        cache_payments = snapshot.docs.map(d => d.data() as LaundryPayment);
        localStorage.setItem('lnd_payments', JSON.stringify(cache_payments));
        notifyStateChange();
      }, (error) => {
        console.warn("Active payments listener message:", error.message);
      });
      activeSubscriptions.push(unsubPayments);
    } catch (error) {
      console.warn("Failed to subscribe payments sync:", error);
    }

    try {
      const unsubExpenses = onSnapshot(collection(libDb, 'laundries', laundryId, 'expenses'), (snapshot) => {
        cache_expenses = snapshot.docs.map(d => d.data() as LaundryExpense);
        localStorage.setItem('lnd_expenses', JSON.stringify(cache_expenses));
        notifyStateChange();
      }, (error) => {
        console.warn("Active expenses listener message:", error.message);
      });
      activeSubscriptions.push(unsubExpenses);
    } catch (error) {
      console.warn("Failed to subscribe expenses sync:", error);
    }

    try {
      const unsubCustomers = onSnapshot(collection(libDb, 'laundries', laundryId, 'customers'), (snapshot) => {
        cache_customers = snapshot.docs.map(d => d.data() as Customer);
        localStorage.setItem('lnd_customers', JSON.stringify(cache_customers));
        notifyStateChange();
      }, (error) => {
        console.warn("Active customers listener message:", error.message);
      });
      activeSubscriptions.push(unsubCustomers);
    } catch (error) {
      console.warn("Failed to subscribe customers sync:", error);
    }
  }
}

// Fallback logic to local caches if listeners are still syncing, falling back to clean arrays or initial data on fallback
const getLocalStorageBackup = <T>(key: string, defaultArray: T[]): T[] => {
  try {
    const data = localStorage.getItem(`lnd_${key}`);
    return data ? JSON.parse(data) : defaultArray;
  } catch {
    return defaultArray;
  }
};

// Fallback to empty [] so a fresh database doesn't auto-pollute or force-sync mock records 
const getUsersLocal = () => cache_users.length > 0 ? cache_users : getLocalStorageBackup('users', []);
const getLaundriesLocal = () => cache_laundries.length > 0 ? cache_laundries : getLocalStorageBackup('laundries', []);
const getServicesLocal = () => cache_services.length > 0 ? cache_services : getLocalStorageBackup('services', []);
const getOrdersLocal = () => cache_orders.length > 0 ? cache_orders : getLocalStorageBackup('orders', []);
const getProgressLocal = () => cache_progress.length > 0 ? cache_progress : getLocalStorageBackup('progress', []);
const getPaymentsLocal = () => cache_payments.length > 0 ? cache_payments : getLocalStorageBackup('payments', []);
const getExpensesLocal = () => cache_expenses.length > 0 ? cache_expenses : getLocalStorageBackup('expenses', INITIAL_EXPENSES);
const getCustomersLocal = () => cache_customers.length > 0 ? cache_customers : getLocalStorageBackup('customers', []);

// ==========================================
// UNIFIED DATA SERVICE (DELEGATING TO PERSISTENT FIREBASE FIRESTORE)
// ==========================================

export const laundryService = {
  
  // --- AUTH SERVICES ---
  getCurrentSimulatedUser: (): UserProfile | null => {
    const logged = localStorage.getItem('lnd_current_user');
    return logged ? JSON.parse(logged) : null;
  },

  getAllUsers: (): UserProfile[] => {
    return getUsersLocal();
  },

  setSimulatedUser: (user: UserProfile | null) => {
    if (user) {
      localStorage.setItem('lnd_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lnd_current_user');
    }
  },

  subscribeToChanges: (callback: () => void) => {
    return subscribeToFirebaseChanges(callback);
  },

  loginGoogleReal: async (): Promise<UserProfile> => {
    try {
      const result = await signInWithPopup(libAuth, googleProvider);
      return await laundryService.getOrCreateProfileForFirebaseUser(result.user);
    } catch (error) {
      console.error("Firebase Login Real Auth failed:", error);
      throw error;
    }
  },

  getOrCreateProfileForFirebaseUser: async (firebaseUser: any): Promise<UserProfile> => {
    const email = firebaseUser.email;
    if (!email) {
      throw new Error("Gagal mengambil email dari akun Google.");
    }
    
    const emailLower = email.toLowerCase();
    const realUid = firebaseUser.uid;
    
    // Look up user document in Firestore directly to see if they already exist
    const userDocRef = doc(libDb, 'users', realUid);
    const userSnap = await getDoc(userDocRef);
    
    let user: UserProfile;
    
    if (userSnap.exists()) {
      console.log("Existing user profile found in Firestore:", userSnap.data());
      user = userSnap.data() as UserProfile;
      
      // Auto-migrate to super_admin if this is the platform administrator/developer email
      const isSuperAdminEmail = (emailLower === 'aisugiharti12@admin.smp.belajar.id' || emailLower === 'platformsaas1@gmail.com');
      if (isSuperAdminEmail && user.role !== 'super_admin') {
        console.log("Migrating current owner session to platform super_admin role...");
        user = {
          ...user,
          role: 'super_admin',
          laundryId: undefined // super admins do not belong to a specific laundry
        };
        try {
          await updateDoc(userDocRef, { role: 'super_admin', laundryId: null });
        } catch (err) {
          console.warn("Failed to write super_admin migration to firestore:", err);
        }
      }
    } else {
      console.log("No user profile found, bootstrapping profile...");
      const isSuperAdminEmail = (emailLower === 'aisugiharti12@admin.smp.belajar.id' || emailLower === 'platformsaas1@gmail.com');
      
      const newLaundryId = `laundry_${Date.now()}`;
      
      if (isSuperAdminEmail) {
        user = {
          userId: realUid,
          email: email,
          name: firebaseUser.displayName || 'Platform Owner',
          role: 'super_admin',
          isActive: true,
          createdAt: new Date().toISOString()
        };
        
        try {
          await setDoc(userDocRef, user);
        } catch (bootstrapError) {
          handleFirestoreError(bootstrapError, OperationType.CREATE, `bootstrap_admin_${realUid}`);
        }
      } else {
        const newLaundry: Laundry = {
          laundryId: newLaundryId,
          name: 'Laundry Saya',
          address: 'Alamat Laundry Belum Diisi',
          phone: '08123456789',
          ownerId: realUid,
          isActive: false, // Pending Super Admin approval by default
          createdAt: new Date().toISOString()
        };

        const defaultService: LaundryService = {
          serviceId: `srv_${Date.now()}_1`,
          laundryId: newLaundryId,
          name: 'Cuci Setrika Kiloan (Reguler 3 Hari)',
          price: 6000,
          unit: 'kg',
          estimateDays: 3,
          createdAt: new Date().toISOString()
        };

        user = {
          userId: realUid,
          email: email, // Keep exact casing from Google Auth token to match request.auth.token.email byte-for-byte
          name: firebaseUser.displayName || email.split('@')[0],
          role: 'owner',
          laundryId: newLaundryId,
          isActive: false, // Pending Super Admin approval by default
          createdAt: new Date().toISOString()
        };

        // Write to Firestore immediately with structured error capture
        const laundryDoc = doc(libDb, 'laundries', newLaundryId);
        const srvDoc = doc(libDb, 'laundries', newLaundryId, 'services', defaultService.serviceId);

        try {
          await setDoc(userDocRef, user);
          await setDoc(laundryDoc, newLaundry);
          await setDoc(srvDoc, defaultService);
        } catch (bootstrapError) {
          handleFirestoreError(bootstrapError, OperationType.CREATE, `bootstrap_user_${realUid}`);
        }
      }
    }

    laundryService.setSimulatedUser(user);
    return user;
  },

  loginGoogleSimulated: (email: string): UserProfile => {
    // Try to find if user profile exists in custom users list first
    const users = getUsersLocal();
    let user = users.find(u => u.email === email);
    
    if (!user) {
      const newOwnerId = `owner_${Date.now()}`;
      const newLaundryId = `laundry_${Date.now()}`;
      
      const isSuperAdminEmail = (email === 'aisugiharti12@admin.smp.belajar.id' || email === 'platformsaas1@gmail.com');

      const newLaundry: Laundry = {
        laundryId: newLaundryId,
        name: 'Laundry Saya',
        address: 'Alamat Laundry Belum Diisi',
        phone: '08123456789',
        ownerId: newOwnerId,
        isActive: isSuperAdminEmail ? true : false, // Pending approval for normal users
        createdAt: new Date().toISOString()
      };

      const defaultService: LaundryService = {
        serviceId: `srv_${Date.now()}_1`,
        laundryId: newLaundryId,
        name: 'Cuci Setrika Kiloan (Reguler 3 Hari)',
        price: 6000,
        unit: 'kg',
        estimateDays: 3,
        createdAt: new Date().toISOString()
      };

      user = {
        userId: newOwnerId,
        email: email,
        name: email.split('@')[0],
        role: isSuperAdminEmail ? 'super_admin' : 'owner',
        laundryId: isSuperAdminEmail ? undefined : newLaundryId,
        isActive: isSuperAdminEmail ? true : false, // Pending approval for normal users
        createdAt: new Date().toISOString()
      };

      // Speculatively write back to Firestore synchronously & asynchronously
      const userDoc = doc(libDb, 'users', newOwnerId);
      const laundryDoc = doc(libDb, 'laundries', newLaundryId);
      const srvDoc = doc(libDb, 'laundries', newLaundryId, 'services', defaultService.serviceId);

      setDoc(userDoc, user).catch(e => handleFirestoreError(e, OperationType.WRITE, userDoc.path));
      setDoc(laundryDoc, newLaundry).catch(e => handleFirestoreError(e, OperationType.WRITE, laundryDoc.path));
      setDoc(srvDoc, defaultService).catch(e => handleFirestoreError(e, OperationType.WRITE, srvDoc.path));
    }

    laundryService.setSimulatedUser(user);
    return user;
  },

  loginInternalSimulated: async (username: string): Promise<UserProfile | null> => {
    const usernameClean = username.trim().toLowerCase();
    if (useRealFirebase) {
      try {
        const usersRef = collection(libDb, 'users');
        const q = query(usersRef, where('username', '==', usernameClean));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const user = userDoc.data() as UserProfile;
          laundryService.setSimulatedUser(user);
          return user;
        }
      } catch (e) {
        console.error("Failed to query user by username from Firestore:", e);
      }
    }

    const users = getUsersLocal();
    const user = users.find(u => u.username === usernameClean);
    if (user) {
      laundryService.setSimulatedUser(user);
      return user;
    }
    return null;
  },

  logout: () => {
    laundryService.setSimulatedUser(null);
    signOut(libAuth).catch(e => console.warn("SignOut action log:", e));
  },

  // --- LAUNDRY BUSINESS OPERATIONS ---
  getLaundries: (): Laundry[] => {
    return getLaundriesLocal();
  },

  updateLaundryStatus: async (laundryId: string, isActive: boolean): Promise<void> => {
    const cached = cache_laundries.map(lnd => {
      if (lnd.laundryId === laundryId) {
        return { ...lnd, isActive };
      }
      return lnd;
    });
    cache_laundries = cached;
    localStorage.setItem('lnd_laundries', JSON.stringify(cached));

    // Also update associated users in the cache
    cache_users = cache_users.map(u => {
      if (u.laundryId === laundryId) {
        return { ...u, isActive };
      }
      return u;
    });
    localStorage.setItem('lnd_users', JSON.stringify(cache_users));

    if (useRealFirebase) {
      try {
        const laundryDoc = doc(libDb, 'laundries', laundryId);
        await updateDoc(laundryDoc, { isActive });

        // Update all users belonging to this laundry in Firestore
        const usersRef = collection(libDb, 'users');
        const q = query(usersRef, where('laundryId', '==', laundryId));
        const usersSnap = await getDocs(q);
        for (const uDoc of usersSnap.docs) {
          await updateDoc(doc(libDb, 'users', uDoc.id), { isActive });
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `laundries/${laundryId}`);
        throw e;
      }
    }
    notifyStateChange();
  },

  updateLaundryDetails: async (laundryId: string, name: string, address: string, phone: string): Promise<void> => {
    const cached = cache_laundries.map(lnd => {
      if (lnd.laundryId === laundryId) {
        return { ...lnd, name, address, phone };
      }
      return lnd;
    });
    cache_laundries = cached;
    localStorage.setItem('lnd_laundries', JSON.stringify(cached));
    
    if (useRealFirebase) {
      try {
        const laundryDoc = doc(libDb, 'laundries', laundryId);
        await updateDoc(laundryDoc, { name, address, phone });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `laundries/${laundryId}`);
        throw e;
      }
    }
    notifyStateChange();
  },

  deleteLaundry: async (laundryId: string): Promise<void> => {
    // 1. Remove from cache
    cache_laundries = cache_laundries.filter(lnd => lnd.laundryId !== laundryId);
    localStorage.setItem('lnd_laundries', JSON.stringify(cache_laundries));

    // 2. Remove associated users from cache
    cache_users = cache_users.filter(u => u.laundryId !== laundryId);
    localStorage.setItem('lnd_users', JSON.stringify(cache_users));

    if (useRealFirebase) {
      try {
        const laundryDoc = doc(libDb, 'laundries', laundryId);
        await deleteDoc(laundryDoc);

        // Delete users belonging to this laundry
        const usersRef = collection(libDb, 'users');
        const q = query(usersRef, where('laundryId', '==', laundryId));
        const usersSnap = await getDocs(q);
        for (const uDoc of usersSnap.docs) {
          await deleteDoc(doc(libDb, 'users', uDoc.id));
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `laundries/${laundryId}`);
        throw e;
      }
    }
    notifyStateChange();
  },

  updateUserProfile: async (userId: string, name: string, photoURL?: string): Promise<UserProfile> => {
    const cached = cache_users.map(u => {
      if (u.userId === userId) {
        return { ...u, name, photoURL };
      }
      return u;
    });
    cache_users = cached;
    localStorage.setItem('lnd_users', JSON.stringify(cached));

    const currentSim = laundryService.getCurrentSimulatedUser();
    let updatedUser: UserProfile | null = null;
    if (currentSim && currentSim.userId === userId) {
      updatedUser = { ...currentSim, name, photoURL };
      laundryService.setSimulatedUser(updatedUser);
    }
    
    if (useRealFirebase) {
      try {
        const userDoc = doc(libDb, 'users', userId);
        const dataToUpdate: any = { name };
        if (photoURL !== undefined) {
          dataToUpdate.photoURL = photoURL;
        }
        await updateDoc(userDoc, dataToUpdate);
        
        const snap = await getDoc(userDoc);
        if (snap.exists() && currentSim && currentSim.userId === userId) {
          updatedUser = snap.data() as UserProfile;
          laundryService.setSimulatedUser(updatedUser);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
        throw e;
      }
    }
    
    notifyStateChange();
    return updatedUser || { userId, name, photoURL, role: 'owner', createdAt: new Date().toISOString(), isActive: true };
  },

  createLaundryBySuperAdmin: (laundryName: string, ownerEmail: string, ownerName: string) => {
    const ownerId = `owner_${Date.now()}`;
    const laundryId = `laundry_${Date.now()}`;

    const newOwner: UserProfile = {
      userId: ownerId,
      email: ownerEmail,
      name: ownerName,
      role: 'owner',
      laundryId: laundryId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const newLaundry: Laundry = {
      laundryId: laundryId,
      name: laundryName,
      address: 'Alamat Laundry Baru',
      phone: '081234567890',
      ownerId: ownerId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const defaultService: LaundryService = {
      serviceId: `srv_${Date.now()}`,
      laundryId: laundryId,
      name: 'Cuci Setrika Standard',
      price: 6000,
      unit: 'kg',
      estimateDays: 3,
      createdAt: new Date().toISOString()
    };

    const userDoc = doc(libDb, 'users', ownerId);
    const laundryDoc = doc(libDb, 'laundries', laundryId);
    const srvDoc = doc(libDb, 'laundries', laundryId, 'services', defaultService.serviceId);

    setDoc(userDoc, newOwner).catch(e => handleFirestoreError(e, OperationType.CREATE, userDoc.path));
    setDoc(laundryDoc, newLaundry).catch(e => handleFirestoreError(e, OperationType.CREATE, laundryDoc.path));
    setDoc(srvDoc, defaultService).catch(e => handleFirestoreError(e, OperationType.CREATE, srvDoc.path));

    return { owner: newOwner, laundry: newLaundry };
  },

  // --- SERVICES OPERATIONS ---
  getServices: (laundryId: string): LaundryService[] => {
    const services = getServicesLocal();
    return services.filter(s => s.laundryId === laundryId);
  },

  addService: (service: Omit<LaundryService, 'serviceId' | 'createdAt'>): LaundryService => {
    const serviceId = `srv_${Date.now()}`;
    const newService: LaundryService = {
      ...service,
      serviceId,
      createdAt: new Date().toISOString()
    };

    const srvDoc = doc(libDb, 'laundries', service.laundryId, 'services', serviceId);
    setDoc(srvDoc, newService).catch(e => handleFirestoreError(e, OperationType.CREATE, srvDoc.path));

    return newService;
  },

  updateService: (serviceId: string, updates: Partial<LaundryService>) => {
    const services = getServicesLocal();
    const service = services.find(s => s.serviceId === serviceId);
    if (service) {
      const srvDoc = doc(libDb, 'laundries', service.laundryId, 'services', serviceId);
      updateDoc(srvDoc, updates).catch(e => handleFirestoreError(e, OperationType.UPDATE, srvDoc.path));
    }
  },

  deleteService: (serviceId: string) => {
    const services = getServicesLocal();
    const service = services.find(s => s.serviceId === serviceId);
    if (service) {
      const srvDoc = doc(libDb, 'laundries', service.laundryId, 'services', serviceId);
      deleteDoc(srvDoc).catch(e => handleFirestoreError(e, OperationType.DELETE, srvDoc.path));
    }
  },

  // --- STAFF ACCOUNTS OPERATIONS ---
  getLaundryStaff: (laundryId: string): UserProfile[] => {
    const all = getUsersLocal();
    return all.filter(u => u.laundryId === laundryId && (u.role === 'cashier' || u.role === 'employee'));
  },

  createStaffAccount: (laundryId: string, name: string, username: string, role: 'cashier' | 'employee'): UserProfile => {
    const staffId = `staff_${Date.now()}`;
    const newStaff: UserProfile = {
      userId: staffId,
      username: username,
      name: name,
      role: role,
      laundryId: laundryId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const userDoc = doc(libDb, 'users', staffId);
    setDoc(userDoc, newStaff).catch(e => handleFirestoreError(e, OperationType.CREATE, userDoc.path));

    return newStaff;
  },

  deleteStaffAccount: (userId: string) => {
    const userDoc = doc(libDb, 'users', userId);
    deleteDoc(userDoc).catch(e => handleFirestoreError(e, OperationType.DELETE, userDoc.path));
  },

  // --- ORDERS OPERATIONS ---
  getOrders: (laundryId: string): LaundryOrder[] => {
    const all = getOrdersLocal();
    return all.filter(o => o.laundryId === laundryId);
  },

  getOrderById: (orderId: string): LaundryOrder | null => {
    const all = getOrdersLocal();
    return all.find(o => o.orderId === orderId) || null;
  },

  getOrderByInvoice: (invoiceNo: string): LaundryOrder | null => {
    const all = getOrdersLocal();
    return all.find(o => o.invoiceNo.toLowerCase() === invoiceNo.trim().toLowerCase()) || null;
  },

  createOrder: (order: Omit<LaundryOrder, 'orderId' | 'invoiceNo' | 'createdAt'>): LaundryOrder => {
    const orders = getOrdersLocal();
    const year = new Date().getFullYear();
    const count = orders.filter(o => o.createdAt.startsWith(year.toString())).length + 1;
    const paddedCount = String(count).padStart(4, '0');
    const invoiceNo = `INV-${year}-${paddedCount}`;
    const orderId = `ord_${Date.now()}`;

    const newOrder: LaundryOrder = {
      ...order,
      orderId,
      invoiceNo,
      createdAt: new Date().toISOString()
    };
    
    // Bersihkan field undefined jika ada
    const cleanedOrder = removeUndefinedFields(newOrder);
    
    // Save Order In Firestore
    const orderDoc = doc(libDb, 'laundries', order.laundryId, 'orders', orderId);
    setDoc(orderDoc, cleanedOrder).catch(e => handleFirestoreError(e, OperationType.CREATE, orderDoc.path));

    // Save Order in public tracking invoice index
    const publicInvoiceDoc = doc(libDb, 'orders_by_invoice', invoiceNo.toUpperCase());
    setDoc(publicInvoiceDoc, cleanedOrder).catch(e => console.warn("Error creating public invoice mapping:", e));

    // Save initial progress timeline entry
    const progressId = `prg_${Date.now()}_init`;
    const initialProgress: OrderProgress = {
      progressId,
      orderId,
      status: 'diterima',
      description: `Selesai masuk order. Laundry ditimbang ${order.weight} ${order.unit} oleh kasir.`,
      updatedBy: order.cashierId,
      updatedByName: 'Staff Laundry',
      updatedAt: new Date().toISOString()
    };
    const progressDoc = doc(libDb, 'laundries', order.laundryId, 'orders', orderId, 'progress', progressId);
    setDoc(progressDoc, initialProgress).catch(e => handleFirestoreError(e, OperationType.CREATE, progressDoc.path));

    // Save Initial progress to public tracking index subcollection
    const publicProgressDoc = doc(libDb, 'orders_by_invoice', invoiceNo.toUpperCase(), 'progress', progressId);
    setDoc(publicProgressDoc, initialProgress).catch(e => console.warn("Error creating public progress mapping:", e));

    // Save payment transactions if already paid at registration
    if (order.paymentStatus === 'paid') {
      const paymentId = `pay_${Date.now()}`;
      const payment: LaundryPayment = {
        paymentId,
        orderId,
        laundryId: order.laundryId,
        amount: order.totalPrice,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString(),
        cashierId: order.cashierId
      };
      const paymentDoc = doc(libDb, 'laundries', order.laundryId, 'payments', paymentId);
      setDoc(paymentDoc, payment).catch(e => handleFirestoreError(e, OperationType.CREATE, paymentDoc.path));
    }

    return newOrder;
  },

  updateOrderStatus: (
    orderId: string, 
    status: LaundryStatus, 
    notes: string, 
    updatedBy: string, 
    updatedByName: string
  ) => {
    const orders = getOrdersLocal();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return null;

    const updatedOrder = { 
      ...order,
      laundryStatus: status,
      notes: notes || order.notes || ''
    };

    // Save Order Status Updates In Firestore
    const orderDoc = doc(libDb, 'laundries', order.laundryId, 'orders', orderId);
    updateDoc(orderDoc, { 
      laundryStatus: status,
      notes: notes || order.notes || ''
    }).catch(e => handleFirestoreError(e, OperationType.UPDATE, orderDoc.path));

    // Sync to public invoice tracking index
    if (order.invoiceNo) {
      const publicInvoiceDoc = doc(libDb, 'orders_by_invoice', order.invoiceNo.toUpperCase());
      updateDoc(publicInvoiceDoc, {
        laundryStatus: status,
        notes: notes || order.notes || ''
      }).catch(e => console.warn("Error updating public tracking invoice mapping:", e));
    }

    const statusDescMap: Record<LaundryStatus, string> = {
      diterima: 'Laundry telah diterima di outlet.',
      dicuci: 'Laundry masuk ke proses pencucian dan pembersihan.',
      dikeringkan: 'Proses pencucian selesai, laundry sedang dikeringkan menggunakan mesin spinner panas.',
      disetrika: 'Laundry dalam tahap penyetrikaan presisi, pelipatan, dan packing wangi.',
      selesai: 'Proses laundry SELESAI, siap diambil oleh pelanggan!',
      diambil: 'Laundry sudah diambil oleh pelanggan. Transaksi selesai sepenuhnya.'
    };

    const progressId = `prg_${Date.now()}_upd`;
    const progress: OrderProgress = {
      progressId,
      orderId,
      status,
      description: `${statusDescMap[status]} (Catatan: ${notes || 'Tidak ada catatan tambahan'})`,
      updatedBy,
      updatedByName,
      updatedAt: new Date().toISOString()
    };
    
    const progressDoc = doc(libDb, 'laundries', order.laundryId, 'orders', orderId, 'progress', progressId);
    setDoc(progressDoc, progress).catch(e => handleFirestoreError(e, OperationType.CREATE, progressDoc.path));

    // Sync progress to public tracking index
    if (order.invoiceNo) {
      const publicProgressDoc = doc(libDb, 'orders_by_invoice', order.invoiceNo.toUpperCase(), 'progress', progressId);
      setDoc(publicProgressDoc, progress).catch(e => console.warn("Error creating public progress update mapping:", e));
    }

    return updatedOrder;
  },

  receivePayment: (orderId: string, amount: number, method: 'cash' | 'transfer', cashierId: string) => {
    const orders = getOrdersLocal();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return null;

    // Save Order Payment Update In Firestore
    const orderDoc = doc(libDb, 'laundries', order.laundryId, 'orders', orderId);
    updateDoc(orderDoc, { paymentStatus: 'paid' }).catch(e => handleFirestoreError(e, OperationType.UPDATE, orderDoc.path));

    // Sync payment status to public invoice tracking index
    if (order.invoiceNo) {
      const publicInvoiceDoc = doc(libDb, 'orders_by_invoice', order.invoiceNo.toUpperCase());
      updateDoc(publicInvoiceDoc, { paymentStatus: 'paid' }).catch(e => console.warn("Error updating payment in public tracking invoice mapping:", e));
    }

    const paymentId = `pay_${Date.now()}`;
    const payment: LaundryPayment = {
      paymentId,
      orderId,
      laundryId: order.laundryId,
      amount,
      paymentMethod: method,
      paymentDate: new Date().toISOString(),
      cashierId
    };
    const paymentDoc = doc(libDb, 'laundries', order.laundryId, 'payments', paymentId);
    setDoc(paymentDoc, payment).catch(e => handleFirestoreError(e, OperationType.CREATE, paymentDoc.path));

    return { ...order, paymentStatus: 'paid' as const };
  },

  getOrderProgress: (orderId: string): OrderProgress[] => {
    const all = getProgressLocal();
    return all
      .filter(p => p.orderId === orderId)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  },

  getPayments: (laundryId: string): LaundryPayment[] => {
    const all = getPaymentsLocal();
    return all.filter(p => p.laundryId === laundryId);
  },

  getOrderByInvoiceAsync: async (invoiceNo: string): Promise<LaundryOrder | null> => {
    try {
      const docRef = doc(libDb, 'orders_by_invoice', invoiceNo.trim().toUpperCase());
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as LaundryOrder;
      }
      return null;
    } catch (error) {
      console.warn("Error fetching public invoice order:", error);
      return null;
    }
  },

  getOrderProgressAsync: async (invoiceNo: string): Promise<OrderProgress[]> => {
    try {
      const colRef = collection(libDb, 'orders_by_invoice', invoiceNo.trim().toUpperCase(), 'progress');
      const snapshot = await getDocs(colRef);
      const list = snapshot.docs.map(d => d.data() as OrderProgress);
      return list.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    } catch (error) {
      console.warn("Error fetching public invoice progress:", error);
      return [];
    }
  },

  getExpenses: (laundryId: string): LaundryExpense[] => {
    const all = getExpensesLocal();
    return all.filter(e => e.laundryId === laundryId);
  },

  addExpense: async (expense: Omit<LaundryExpense, 'expenseId' | 'createdAt'>): Promise<LaundryExpense> => {
    const expenseId = `exp_${Date.now()}`;
    const newExpense: LaundryExpense = {
      ...expense,
      expenseId,
      createdAt: new Date().toISOString()
    };

    const updated = [...cache_expenses, newExpense];
    cache_expenses = updated;
    localStorage.setItem('lnd_expenses', JSON.stringify(updated));

    if (useRealFirebase) {
      try {
        const cleanedExpense = removeUndefinedFields(newExpense);
        const expenseDoc = doc(libDb, 'laundries', expense.laundryId, 'expenses', expenseId);
        await setDoc(expenseDoc, cleanedExpense);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `expenses/${expenseId}`);
      }
    }
    notifyStateChange();
    return newExpense;
  },

  deleteExpense: async (laundryId: string, expenseId: string): Promise<void> => {
    const filtered = cache_expenses.filter(e => e.expenseId !== expenseId);
    cache_expenses = filtered;
    localStorage.setItem('lnd_expenses', JSON.stringify(filtered));

    if (useRealFirebase) {
      try {
        const expenseDoc = doc(libDb, 'laundries', laundryId, 'expenses', expenseId);
        await deleteDoc(expenseDoc);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `expenses/${expenseId}`);
      }
    }
    notifyStateChange();
  },

  getCustomers: (laundryId: string): Customer[] => {
    const all = getCustomersLocal();
    return all.filter(c => c.laundryId === laundryId);
  },

  addCustomer: async (customer: Omit<Customer, 'customerId' | 'createdAt'>): Promise<Customer> => {
    const customerId = `cust_${Date.now()}`;
    const newCustomer: Customer = {
      ...customer,
      customerId,
      createdAt: new Date().toISOString()
    };

    cache_customers = [...cache_customers, newCustomer];
    localStorage.setItem('lnd_customers', JSON.stringify(cache_customers));

    if (useRealFirebase) {
      try {
        const cleanedCustomer = removeUndefinedFields(newCustomer);
        const customerDoc = doc(libDb, 'laundries', customer.laundryId, 'customers', customerId);
        await setDoc(customerDoc, cleanedCustomer);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `customers/${customerId}`);
      }
    }
    notifyStateChange();
    return newCustomer;
  },

  updateCustomer: async (customerId: string, laundryId: string, updates: Partial<Customer>): Promise<void> => {
    const all = getCustomersLocal();
    const customer = all.find(c => c.customerId === customerId);
    if (customer) {
      const updatedCustomer = { ...customer, ...updates };
      const filtered = cache_customers.filter(c => c.customerId !== customerId);
      cache_customers = [...filtered, updatedCustomer];
      localStorage.setItem('lnd_customers', JSON.stringify(cache_customers));

      if (useRealFirebase) {
        try {
          const cleanedUpdates = removeUndefinedFields(updates);
          const customerDoc = doc(libDb, 'laundries', laundryId, 'customers', customerId);
          await updateDoc(customerDoc, cleanedUpdates);
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `customers/${customerId}`);
        }
      }
      notifyStateChange();
    }
  },

  deleteCustomer: async (laundryId: string, customerId: string): Promise<void> => {
    const filtered = cache_customers.filter(c => c.customerId !== customerId);
    cache_customers = filtered;
    localStorage.setItem('lnd_customers', JSON.stringify(filtered));

    if (useRealFirebase) {
      try {
        const customerDoc = doc(libDb, 'laundries', laundryId, 'customers', customerId);
        await deleteDoc(customerDoc);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `customers/${customerId}`);
      }
    }
    notifyStateChange();
  }
};
