/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'owner' | 'cashier' | 'employee';

export interface UserProfile {
  userId: string;
  email?: string;
  username?: string; // used for internal cashier/employee logs
  name: string;
  role: UserRole;
  laundryId?: string; // null for super_admin
  createdAt: string;
  isActive: boolean;
  photoURL?: string;
}

export interface Laundry {
  laundryId: string;
  name: string;
  address: string;
  phone: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}

export interface LaundryService {
  serviceId: string;
  laundryId: string;
  name: string;
  price: number;
  unit: 'kg' | 'pcs';
  estimateDays: number;
  createdAt: string;
}

export type LaundryStatus = 'diterima' | 'dicuci' | 'dikeringkan' | 'disetrika' | 'selesai' | 'diambil';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Customer {
  customerId: string;
  laundryId: string;
  name: string;
  phone: string;
  memberType: 'regular' | 'member';
  discountPercent: number; // standard e.g. 10 for 10%
  notes?: string;
  createdAt: string;
}

export interface LaundryOrder {
  orderId: string;
  laundryId: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  weight: number; // weight in kg, or qty
  unit: 'kg' | 'pcs';
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  laundryStatus: LaundryStatus;
  notes?: string;
  estimatedCompletion: string;
  createdAt: string;
  cashierId: string;
  customerId?: string; // Optional: link to registered customer
  discountPercent?: number; // Optional: percentage of discount applied (e.g. 10)
  originalPrice?: number; // Optional: calculated price before discount
}

export interface OrderProgress {
  progressId: string;
  orderId: string;
  status: LaundryStatus;
  description: string;
  updatedBy: string; // userId or username
  updatedByName: string;
  updatedAt: string;
}

export interface LaundryPayment {
  paymentId: string;
  orderId: string;
  laundryId: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer';
  paymentDate: string;
  cashierId: string;
}

export type ExpenseCategory = 'operational' | 'salary' | 'equipment' | 'other';

export interface LaundryExpense {
  expenseId: string;
  laundryId: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

