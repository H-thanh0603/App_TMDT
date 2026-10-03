import { validateEnv } from './env.validation';

const PROD_OK = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@h/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  OCR_API_KEY: 'c'.repeat(32),
  CORS_ORIGIN: 'https://app.minimart.vn',
};

describe('validateEnv (fail-closed boot)', () => {
  it('passes with a complete dev config (no secrets required)', () => {
    const out = validateEnv({ NODE_ENV: 'development' });
    expect(out.NODE_ENV).toBe('development');
  });

  it('passes with a complete production config', () => {
    expect(() => validateEnv({ ...PROD_OK })).not.toThrow();
  });

  it('throws when production is missing secrets', () => {
    expect(() => validateEnv({ NODE_ENV: 'production', DATABASE_URL: 'x' })).toThrow(
      /Cấu hình env không hợp lệ/,
    );
  });

  it('rejects a short JWT secret in production', () => {
    expect(() =>
      validateEnv({ ...PROD_OK, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects CORS_ORIGIN='*' in production", () => {
    expect(() => validateEnv({ ...PROD_OK, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
  });

  it('rejects a malformed AI_ENCRYPTION_KEY in any env', () => {
    expect(() => validateEnv({ NODE_ENV: 'development', AI_ENCRYPTION_KEY: 'not-hex' })).toThrow(
      /AI_ENCRYPTION_KEY/,
    );
    expect(() =>
      validateEnv({ NODE_ENV: 'development', AI_ENCRYPTION_KEY: 'a'.repeat(64) }),
    ).not.toThrow();
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
