import { buildCorsOptions, parseCorsOrigins } from './main';

describe('CORS configuration (SEC-005)', () => {
  describe('parseCorsOrigins', () => {
    it('returns true (reflect-any) for "*" or empty', () => {
      expect(parseCorsOrigins('*')).toBe(true);
      expect(parseCorsOrigins('')).toBe(true);
      expect(parseCorsOrigins(undefined)).toBe(true);
    });

    it('returns single origin string', () => {
      expect(parseCorsOrigins('https://app.example')).toBe('https://app.example');
    });

    it('returns array for multiple origins', () => {
      expect(parseCorsOrigins('https://a.example, https://b.example')).toEqual([
        'https://a.example',
        'https://b.example',
      ]);
    });
  });

  describe('buildCorsOptions', () => {
    it('NEVER combines wildcard origin with credentials', () => {
      const opts = buildCorsOptions('*', 'production');
      expect(opts.origin).toBe(true);
      expect(opts.credentials).toBe(false);
    });

    it('enables credentials only for an explicit origin', () => {
      const opts = buildCorsOptions('https://app.example', 'production');
      expect(opts.origin).toBe('https://app.example');
      expect(opts.credentials).toBe(true);
    });

    it('enables credentials for an explicit origin whitelist', () => {
      const opts = buildCorsOptions('https://a.example,https://b.example', 'production');
      expect(opts.origin).toEqual(['https://a.example', 'https://b.example']);
      expect(opts.credentials).toBe(true);
    });
  });
});
