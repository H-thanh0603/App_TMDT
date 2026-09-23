/**
 * Tiện ích parse thời lượng dạng "15m" | "14d" | "30s" | "2h" | "1w".
 *
 * Lý do tồn tại: trước đây hạn của refresh token trong DB bị hard-code 14 ngày,
 * không khớp với biến môi trường JWT_REFRESH_EXPIRES → token có thể sống lâu hơn
 * cấu hình mong muốn. Dùng chung 1 hàm để JWT expiry và DB expiry luôn khớp nhau.
 */

const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
  w: 604_800,
};

/**
 * Chuyển chuỗi thời lượng thành số GIÂY.
 * Không parse được → trả về `fallbackSeconds` (fail-safe, không bao giờ trả 0/NaN).
 */
export function parseDurationSeconds(value: string | undefined | null, fallbackSeconds: number): number {
  if (typeof value !== 'string') return fallbackSeconds;
  const m = /^\s*(\d+)\s*(s|m|h|d|w)?\s*$/i.exec(value);
  if (!m) return fallbackSeconds;
  const amount = Number(m[1]);
  const unit = (m[2] ?? 's').toLowerCase();
  const seconds = amount * (UNITS[unit] ?? 1);
  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackSeconds;
  return seconds;
}
