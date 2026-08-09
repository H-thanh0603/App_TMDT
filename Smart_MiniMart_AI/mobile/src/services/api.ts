import axios, { AxiosError, AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Tự gắn access token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh khi 401
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as any;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newToken = await (refreshing ?? (refreshing = refreshAccessToken()));
        refreshing = null;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api.request(original);
        }
      } catch {
        refreshing = null;
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(err);
  },
);

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefresh } = data.data;
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', newRefresh);
    return accessToken;
  } catch {
    return null;
  }
}

/** Helper unwrap response từ API (tất cả API trả {success, data, timestamp}) */
export function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

/** Origin của backend (http://host:port) — dùng để ghép ảnh relative "/uploads/..." */
export function apiOrigin(): string {
  return API_URL.replace(/\/+$/, '').replace(/\/api\/v\d*/i, '');
}

/**
 * Biến ảnh tương đối từ backend ("/uploads/x.jpg") thành URL đầy đủ.
 * URL tuyệt đối (http/https) giữ nguyên. Trả null nếu không hợp lệ — để UI fallback placeholder.
 */
export function resolveImage(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${apiOrigin()}${path}`;
  return path;
}
