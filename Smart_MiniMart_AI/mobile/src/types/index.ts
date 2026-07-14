export type Role = 'CUSTOMER' | 'STAFF' | 'STORE_ADMIN' | 'AI_MANAGER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  status?: UserStatus;
  loyaltyPoints: number;
  isVip: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  category?: Category;
  brand?: string;
  unit: string;
  price: number;
  salePrice?: number;
  stock: number;
  imageUrl?: string;
  tags: string[];
  expiryDate?: string;
  isFeatured?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Pick<Product, 'id' | 'name' | 'slug' | 'imageUrl' | 'price' | 'salePrice' | 'stock' | 'unit'>;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'COMPLETED' | 'CANCELED';
export type PaymentMethod = 'COD' | 'QR_DEMO' | 'WALLET_DEMO' | 'VNPAY_SANDBOX' | 'BANK';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  promotionCode?: string;
  note?: string;
  loyaltyEarned?: number;
  createdAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  address?: Address;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    product?: { imageUrl?: string };
  }>;
}

export interface Address {
  id: string;
  recipient: string;
  phone: string;
  line1: string;
  ward?: string;
  district?: string;
  city?: string;
  isDefault: boolean;
  /** Client-only helper — backend không trả field này. Dùng formatAddress(). */
  fullAddress?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export interface UserStats {
  orderCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  isVip: boolean;
  nextVipThreshold: number;
}

export interface StorePublicConfig {
  info: { name: string; address: string; phone: string; email: string; openHours: string };
  policies: {
    minOrderValue: number; shippingFee: number; freeShipThreshold: number;
    loyaltyPerVnd: number; vipThreshold: number;
  };
  payment: {
    cod: { enabled: boolean; label: string };
    vnpay: { enabled: boolean; label: string };
    bank: { enabled: boolean; label: string };
  };
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}
