import { User, ShopSettings, Product, StockEntry, Sale, Customer, Loan } from './types';

const KEYS = {
  users: 'deswife_users',
  currentUser: 'deswife_current_user',
  shop: 'deswife_shop',
  products: 'deswife_products',
  stockEntries: 'deswife_stock_entries',
  sales: 'deswife_sales',
  customers: 'deswife_customers',
  loans: 'deswife_loans',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Default data
const defaultShop: ShopSettings = {
  name: 'DESWIFE SHOP',
  address: '123 Main Street, Freetown',
  phone: '+232 76 000 000',
  footerMessage: 'Thank you for your patronage!',
};

const defaultUsers: User[] = [
  { id: '1', name: 'Shop Owner', username: 'owner', pin: '1234', role: 'owner', createdAt: new Date().toISOString() },
  { id: '2', name: 'Mariama', username: 'mariama', pin: '5678', role: 'staff', createdAt: new Date().toISOString() },
];

// Users
export const getUsers = (): User[] => get(KEYS.users, defaultUsers);
export const saveUsers = (users: User[]) => set(KEYS.users, users);
export const getCurrentUser = (): User | null => get(KEYS.currentUser, null);
export const setCurrentUser = (user: User | null) => set(KEYS.currentUser, user);
export const login = (username: string, pin: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin);
  if (user) setCurrentUser(user);
  return user || null;
};
export const logout = () => setCurrentUser(null);

// Shop
export const getShop = (): ShopSettings => get(KEYS.shop, defaultShop);
export const saveShop = (shop: ShopSettings) => set(KEYS.shop, shop);

// Products
export const getProducts = (): Product[] => get(KEYS.products, []);
export const saveProducts = (products: Product[]) => set(KEYS.products, products);
export const addProduct = (product: Product) => {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
};
export const updateProduct = (product: Product) => {
  const products = getProducts().map(p => p.id === product.id ? product : p);
  saveProducts(products);
};

// Stock
export const getStockEntries = (): StockEntry[] => get(KEYS.stockEntries, []);
export const addStockEntry = (entry: StockEntry) => {
  const entries = getStockEntries();
  entries.push(entry);
  set(KEYS.stockEntries, entries);
  // Update product quantity
  const products = getProducts();
  const product = products.find(p => p.id === entry.productId);
  if (product) {
    product.quantity += entry.quantity;
    product.buyingPrice = entry.buyingPrice;
    saveProducts(products);
  }
};

// Customers
export const getCustomers = (): Customer[] => get(KEYS.customers, []);
export const saveCustomers = (customers: Customer[]) => set(KEYS.customers, customers);
export const addCustomer = (customer: Customer) => {
  const customers = getCustomers();
  customers.push(customer);
  saveCustomers(customers);
};

// Sales
export const getSales = (): Sale[] => get(KEYS.sales, []);
export const addSale = (sale: Sale) => {
  const sales = getSales();
  sales.push(sale);
  set(KEYS.sales, sales);
  // Reduce stock
  const products = getProducts();
  sale.items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) product.quantity -= item.quantity;
  });
  saveProducts(products);
  // Update customer debt if loan
  if (sale.paymentMethod === 'loan' && sale.customerId !== 'walk-in') {
    const customers = getCustomers();
    const customer = customers.find(c => c.id === sale.customerId);
    if (customer) {
      customer.totalDebt += sale.balance;
      saveCustomers(customers);
    }
  }
};

// Generate receipt ID
export const generateReceiptId = (): string => {
  const shop = getShop();
  const prefix = shop.name.split(' ')[0]?.toUpperCase().slice(0, 4) || 'SHOP';
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const sales = getSales();
  const todaySales = sales.filter(s => s.date === new Date().toISOString().split('T')[0]);
  const num = String(todaySales.length + 1).padStart(5, '0');
  return `${prefix}-${dateStr}-${num}`;
};

// Loans
export const getLoans = (): Loan[] => get(KEYS.loans, []);
export const addLoan = (loan: Loan) => {
  const loans = getLoans();
  loans.push(loan);
  set(KEYS.loans, loans);
};
export const addLoanPayment = (loanId: string, payment: { id: string; amount: number; date: string; receivedBy: string }) => {
  const loans = getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (loan) {
    loan.payments.push(payment);
    loan.paidAmount += payment.amount;
    loan.balance = loan.totalAmount - loan.paidAmount;
    loan.status = loan.balance <= 0 ? 'paid' : 'part-paid';
    set(KEYS.loans, loans);
    // Update customer debt
    const customers = getCustomers();
    const customer = customers.find(c => c.id === loan.customerId);
    if (customer) {
      customer.totalDebt = Math.max(0, customer.totalDebt - payment.amount);
      saveCustomers(customers);
    }
  }
};
