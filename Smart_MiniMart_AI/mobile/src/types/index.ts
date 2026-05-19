export type Role = 'CUSTOMER' | 'STAFF' | 'STORE_ADMIN' | 'AI_MANAGER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  loyaltyPoints: number;
  isVip: boolean;
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

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: 'COD' | 'QR_DEMO' | 'WALLET_DEMO' | 'VNPAY_SANDBOX';
  createdAt: string;
  items: Array<{
    id: string; productId: string; productName: string;
    unitPrice: number; quantity: number; subtotal: number;
    product?: { imageUrl?: string };
  }>;
}
