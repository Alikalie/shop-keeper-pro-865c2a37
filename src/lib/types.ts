export type UserRole = 'owner' | 'staff';

export interface User {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: UserRole;
  createdAt: string;
}

export interface ShopSettings {
  name: string;
  address: string;
  phone: string;
  logo?: string;
  footerMessage: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  lowStockLevel: number;
  createdAt: string;
}

export interface StockEntry {
  id: string;
  productId: string;
  quantity: number;
  buyingPrice: number;
  supplier: string;
  date: string;
  addedBy: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  receiptId: string;
  items: SaleItem[];
  customerId: string;
  customerName: string;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: 'cash' | 'loan';
  soldBy: string;
  soldByName: string;
  date: string;
  timestamp: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDebt: number;
  createdAt: string;
}

export interface Loan {
  id: string;
  saleId: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'unpaid' | 'part-paid' | 'paid';
  payments: LoanPayment[];
  date: string;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  receivedBy: string;
}
