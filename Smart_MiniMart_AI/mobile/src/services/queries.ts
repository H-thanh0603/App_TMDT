import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './api';
import type { Product, Category, Cart, Order } from '@/types';

// ===== Categories =====
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrap<Category[]>(await api.get('/categories')),
  });
}

// ===== Products =====
export function useProducts(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => unwrap<{
      items: Product[]; total: number; page: number; totalPages: number;
    }>(await api.get('/products', { params })),
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => unwrap<Product[]>(await api.get('/products/featured')),
  });
}

export function useProduct(idOrSlug: string) {
  return useQuery({
    queryKey: ['products', idOrSlug],
    queryFn: async () => unwrap<Product & { reviews?: any[] }>(
      await api.get(`/products/${idOrSlug}`),
    ),
    enabled: !!idOrSlug,
  });
}

// ===== AI Search =====
export function useAISearch() {
  return useMutation({
    mutationFn: async (query: string) =>
      unwrap<{ products: Product[]; explanation: string; usedAI: boolean }>(
        await api.post('/ai/search', { query }),
      ),
  });
}

export function useAIChat() {
  return useMutation({
    mutationFn: async (message: string) =>
      unwrap<{ message: string }>(await api.post('/ai/chat', { message })),
  });
}

// ===== Cart =====
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => unwrap<Cart>(await api.get('/cart')),
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { productId: string; quantity: number }) =>
      unwrap<Cart>(await api.post('/cart/items', params)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) =>
      unwrap<Cart>(await api.patch(`/cart/items/${productId}`, { quantity })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) =>
      unwrap<Cart>(await api.delete(`/cart/items/${productId}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

// ===== Orders =====
export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: async () => unwrap<{ items: Order[] }>(await api.get('/orders/mine')),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { paymentMethod: string; addressId?: string; note?: string }) =>
      unwrap<Order>(await api.post('/orders', params)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ===== Staff: Orders management =====
export function useAllOrders(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: async () => unwrap<{ items: Order[]; total: number; totalPages: number }>(
      await api.get('/orders', { params }),
    ),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      unwrap(await api.patch(`/orders/${id}/status`, { status, reason })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
}

// ===== Staff: Import receipts =====
export function useImportReceipts(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: async () => unwrap<{ items: any[]; total: number; totalPages: number }>(
      await api.get('/import-receipts', { params }),
    ),
  });
}

export function useImportReceipt(id: string) {
  return useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => unwrap<any>(await api.get(`/import-receipts/${id}`)),
    enabled: !!id,
  });
}

export function useScanReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageUrl, engine }: { imageUrl: string; engine?: string }) =>
      unwrap(await api.post('/import-receipts/scan', { imageUrl, engine })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
}

export function useUpdateReceiptItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: any[] }) =>
      unwrap(await api.patch(`/import-receipts/${id}/items`, { items })),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['receipts', vars.id] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export function useConfirmReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.post(`/import-receipts/${id}/confirm`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  });
}

// ===== Inventory =====
export function useExpiringProducts(days = 30) {
  return useQuery({
    queryKey: ['inventory', 'expiring', days],
    queryFn: async () => unwrap<any[]>(
      await api.get('/inventory/expiring', { params: { days } }),
    ),
  });
}

export function useSlowMoving() {
  return useQuery({
    queryKey: ['inventory', 'slow-moving'],
    queryFn: async () => unwrap<any[]>(await api.get('/inventory/slow-moving')),
  });
}

export function useRestockSuggestions() {
  return useQuery({
    queryKey: ['inventory', 'restock'],
    queryFn: async () => unwrap<any[]>(await api.get('/inventory/restock-suggestions')),
  });
}

// ===== AI Manager =====
export function useAIOverview() {
  return useQuery({
    queryKey: ['ai-manager', 'overview'],
    queryFn: async () => unwrap<any>(await api.get('/ai-manager/overview')),
  });
}

export function useAIProviders() {
  return useQuery({
    queryKey: ['ai-manager', 'providers'],
    queryFn: async () => unwrap<any[]>(await api.get('/ai-manager/providers')),
  });
}

export function useAITaskConfigs() {
  return useQuery({
    queryKey: ['ai-manager', 'task-configs'],
    queryFn: async () => unwrap<any[]>(await api.get('/ai-manager/task-configs')),
  });
}

export function useAILogs(params: Record<string, any> = {}) {
  return useQuery({
    queryKey: ['ai-manager', 'logs', params],
    queryFn: async () => unwrap<{ items: any[]; total: number }>(
      await api.get('/ai-manager/logs', { params }),
    ),
  });
}
