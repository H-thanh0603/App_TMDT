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

// ===== Profile =====
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fullName?: string; phone?: string; avatarUrl?: string }) =>
      unwrap<any>(await api.patch('/users/me', params)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useMyStats() {
  return useQuery({
    queryKey: ['me', 'stats'],
    queryFn: async () => unwrap<{
      orderCount: number; totalSpent: number; loyaltyPoints: number;
      isVip: boolean; nextVipThreshold: number;
    }>(await api.get('/users/me/stats')),
  });
}

// ===== Addresses =====
export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => unwrap<any[]>(await api.get('/users/me/addresses')),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) =>
      unwrap<any>(await api.post('/users/me/addresses', dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: any }) =>
      unwrap<any>(await api.patch(`/users/me/addresses/${id}`, dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap<any>(await api.delete(`/users/me/addresses/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

// ===== Order detail =====
export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => unwrap<any>(await api.get(`/orders/${id}`)),
    enabled: !!id,
  });
}

// ===== Notifications =====
export function useNotifications(params: { isRead?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => unwrap<{ items: any[]; unread: number }>(
      await api.get('/notifications/me', { params }),
    ),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap<any>(await api.post(`/notifications/me/${id}/read`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap<any>(await api.post('/notifications/me/read-all')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useBroadcast() {
  return useMutation({
    mutationFn: async (dto: {
      title: string; body: string; type?: string;
      targetRoles?: string[]; targetUserIds?: string[];
    }) => unwrap<{ sent: number }>(await api.post('/notifications/broadcast', dto)),
  });
}

// ===== Store config (public) =====
export function useStoreConfig() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () => unwrap<any>(await api.get('/settings/public')),
    staleTime: 5 * 60_000,
  });
}

// ===== Admin: User management =====
export function useAdminUsers(params: { role?: string; status?: string; q?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: async () => unwrap<{
      items: any[]; total: number; page: number; totalPages: number;
    }>(await api.get('/users', { params })),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) =>
      unwrap<any>(await api.post('/users/staff', dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: any }) =>
      unwrap<any>(await api.patch(`/users/${id}`, dto)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useAdjustLoyalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, delta, reason }: { id: string; delta: number; reason?: string }) =>
      unwrap<any>(await api.post(`/users/${id}/loyalty`, { delta, reason })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

// ===== Payments =====
export function useCreateVnpay() {
  return useMutation({
    mutationFn: async (dto: { orderId: string; bankCode?: string }) =>
      unwrap<{ url: string; orderRef: string; amount: number }>(
        await api.post('/payments/vnpay/create', dto),
      ),
  });
}

// ===== Active Promos (public) =====
export function useActivePromos() {
  return useQuery({
    queryKey: ['promos-active'],
    queryFn: async () => unwrap<any[]>(await api.get('/promotions/active')),
  });
}
