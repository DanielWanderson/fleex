
export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
  PROFESSIONAL = 'PROFESSIONAL'
}

export interface SubAccount {
    id: string;
    name: string;
    password: string; // In a real app, this should be hashed
    role: 'admin' | 'editor';
}

export interface ActivityLog {
    id: string;
    actorName: string; // Who did it
    action: string; // What they did
    details?: string;
    timestamp: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  plan: PlanType;
  themeId: string;
  primaryColor: string;
  phone: string; // WhatsApp number
  pixKey: string; // Pix key for direct payments
  metaPixelId?: string;
  googleAnalyticsId?: string;
  // Store Location for Shipping
  storeCep?: string;
  storeCity?: string;
  storeState?: string;
  // Automated Payment
  autoPaymentActive?: boolean;
  // Professional Plan Features
  subAccounts?: SubAccount[];
  activityLogs?: ActivityLog[];
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  active: boolean;
  clicks: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Variant {
    id: string;
    name: string; // e.g. "P", "M", "Azul"
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  active: boolean;
  sales: number;
  variants?: Variant[];
  // Dimensions for Freight
  weight?: number; // kg
  width?: number; // cm
  height?: number; // cm
  length?: number; // cm
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: Variant;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  durationMin: number;
  active: boolean;
  bookings: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  bgClass: string;
  cardClass: string;
  textClass: string;
  buttonClass: string;
}

export interface StatPoint {
  date: string;
  views: number;
  clicks: number;
  sales: number;
  revenue: number;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  customerState?: string;
  customerCep?: string;
  productTitle: string;
  productPrice: number;
  deliveryMethod: 'pickup' | 'delivery' | 'shipping';
  shippingService?: string; // e.g., 'SEDEX', 'PAC'
  shippingCost?: number;
  trackingCode?: string;
  address?: string;
  status: 'pending' | 'completed' | 'canceled' | 'shipped' | 'paid';
  paymentMethod?: string;
}

export interface Coupon {
    id: string;
    code: string;
    discountPercent: number;
    usageCount: number;
}

export interface AbandonedCart {
    id: string;
    customerName: string;
    customerPhone: string;
    items: CartItem[];
    date: string;
    totalValue: number;
    recovered: boolean;
}
