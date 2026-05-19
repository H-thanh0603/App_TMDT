import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, unwrap } from '@/services/api';
import type { User, Role } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string, phone?: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: unwrap<User>(res), initialized: true });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, initialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = unwrap<{ user: User; accessToken: string; refreshToken: string }>(res);
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      set({ user: data.user });
      return data.user;
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, fullName, phone) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', { email, password, fullName, phone });
      const data = unwrap<{ user: User; accessToken: string; refreshToken: string }>(res);
      await SecureStore.setItemAsync('access_token', data.accessToken);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      set({ user: data.user });
      return data.user;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch { /* ignore */ }
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));

export const useRole = (): Role | null => useAuthStore((s) => s.user?.role ?? null);
