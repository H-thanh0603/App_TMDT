/**
 * Chuẩn hóa phân trang — mọi list endpoint dùng chung để không có findMany thiếu take.
 * page/limit không hợp lệ (NaN, âm, 0) → rơi về mặc định an toàn.
 */
export function clampPagination(
  page?: unknown,
  limit?: unknown,
  opts: { defaultPage?: number; defaultLimit?: number; maxLimit?: number } = {},
): { page: number; limit: number; skip: number; take: number } {
  const { defaultPage = 1, defaultLimit = 20, maxLimit = 100 } = opts;
  const toInt = (v: unknown, fallback: number): number => {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };
  const safePage = toInt(page, defaultPage);
  const safeLimit = Math.min(toInt(limit, defaultLimit), maxLimit);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit, take: safeLimit };
}
