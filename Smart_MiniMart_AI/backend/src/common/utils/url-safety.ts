import { BadRequestException } from '@nestjs/common';

/**
 * Chặn SSRF: nhận diện hostname trỏ tới địa chỉ nội bộ / loopback / link-local / metadata.
 * Kiểm tra best-effort trên literal hostname (không chống được DNS rebinding hoàn toàn).
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h === '0.0.0.0') return true;

  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }

  // IPv6 ULA (fc00::/7) và link-local (fe80::/10)
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;

  return false;
}

/**
 * Đảm bảo URL là http/https công khai (không trỏ nội bộ). Ném BadRequest nếu vi phạm.
 * Dùng trước khi server (hoặc dịch vụ downstream) fetch một URL do người dùng cung cấp.
 */
export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('URL không hợp lệ');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Chỉ chấp nhận URL http/https');
  }
  if (isPrivateOrLocalHost(url.hostname)) {
    throw new BadRequestException('URL trỏ tới địa chỉ nội bộ không được phép');
  }
  return url;
}
