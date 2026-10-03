/**
 * Validate env fail-closed khi boot (Q-ENV).
 *
 * Trước đây ConfigModule.forRoot không validate → prod thiếu JWT secret / AI_ENCRYPTION_KEY
 * chỉ nổ lúc runtime (giữa request). Hàm này chặn ngay lúc khởi động, cùng triết lý với
 * parseCorsOrigins/buildCorsOptions ở main.ts.
 *
 * Quy tắc:
 * - secret bắt buộc ở prod: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (≥32 ký tự).
 * - AI_ENCRYPTION_KEY: nếu đặt thì phải đúng 64 hex (khớp AES-256 của ai-manager).
 * - NODE_ENV ∈ {development,test,production}.
 * - CORS_ORIGIN: prod bắt buộc, không được '*'.
 * - OCR_API_KEY: prod bắt buộc (khớp gate của ocr-service).
 *
 * KHÔNG dựa Joi/zod — viết tay để khỏi thêm dependency.
 */

const VALID_ENVS = new Set(['development', 'test', 'production']);
const HEX64 = /^[0-9a-fA-F]{64}$/;
const MIN_SECRET_LEN = 32;

export interface EnvIssue {
  key: string;
  message: string;
}

function requireValue(
  issues: EnvIssue[],
  config: Record<string, unknown>,
  key: string,
  minLen = 0,
): void {
  const raw = config[key];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    issues.push({ key, message: `${key} là bắt buộc trên production` });
    return;
  }
  if (minLen > 0 && value.length < minLen) {
    issues.push({ key, message: `${key} phải dài ít nhất ${minLen} ký tự` });
  }
}

/**
 * Chuẩn hóa + kiểm tra env. Trả về config đã trim; throw nếu có issue.
 * Thuần (không đụng process.env) → dễ test.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...config };
  const env = String(normalized.NODE_ENV ?? 'development').trim();
  normalized.NODE_ENV = env;

  const issues: EnvIssue[] = [];

  if (!VALID_ENVS.has(env)) {
    issues.push({
      key: 'NODE_ENV',
      message: `NODE_ENV phải thuộc ${[...VALID_ENVS].join(' | ')} (nhận "${env}")`,
    });
  }
  const isProd = env === 'production';

  // AI_ENCRYPTION_KEY: optional ở dev, nhưng nếu có thì phải đúng định dạng (mọi môi trường).
  const aiKey = typeof normalized.AI_ENCRYPTION_KEY === 'string' ? normalized.AI_ENCRYPTION_KEY.trim() : '';
  if (aiKey && !HEX64.test(aiKey)) {
    issues.push({ key: 'AI_ENCRYPTION_KEY', message: 'AI_ENCRYPTION_KEY phải là 64 ký tự hex (32 byte)' });
  }

  if (isProd) {
    requireValue(issues, normalized, 'DATABASE_URL');
    requireValue(issues, normalized, 'JWT_ACCESS_SECRET', MIN_SECRET_LEN);
    requireValue(issues, normalized, 'JWT_REFRESH_SECRET', MIN_SECRET_LEN);
    requireValue(issues, normalized, 'OCR_API_KEY');
    requireValue(issues, normalized, 'CORS_ORIGIN');

    const cors = typeof normalized.CORS_ORIGIN === 'string' ? normalized.CORS_ORIGIN.trim() : '';
    if (cors === '*') {
      issues.push({ key: 'CORS_ORIGIN', message: "CORS_ORIGIN='*' bị cấm trên production" });
    }
  }

  if (issues.length > 0) {
    const detail = issues.map((i) => `  - ${i.key}: ${i.message}`).join('\n');
    throw new Error(`Cấu hình env không hợp lệ — boot dừng (fail-closed):\n${detail}`);
  }

  return normalized;
}
