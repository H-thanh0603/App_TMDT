import { buildCorsOptions, buildTrustProxy, parseCorsOrigins } from './main';

describe('CORS configuration (SEC-005)', () => {
  describe('parseCorsOrigins', () => {
    it('returns true (reflect-any) for "*" or empty in dev', () => {
      expect(parseCorsOrigins('*', 'development')).toBe(true);
      expect(parseCorsOrigins('', 'development')).toBe(true);
      expect(parseCorsOrigins(undefined, 'development')).toBe(true);
    });

    it('fail-closed on production: throws for "*" or empty', () => {
      expect(() => parseCorsOrigins('*', 'production')).toThrow();
      expect(() => parseCorsOrigins('', 'production')).toThrow();
      expect(() => parseCorsOrigins(undefined, 'production')).toThrow();
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
    it('NEVER allows wildcard on production (fail-closed)', () => {
      expect(() => buildCorsOptions('*', 'production')).toThrow();
    });

    it('NEVER combines wildcard origin with credentials (dev)', () => {
      const opts = buildCorsOptions('*', 'development');
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

  describe('buildTrustProxy (SEC-031)', () => {
    it('defaults to 1 hop in production and disabled in development', () => {
      expect(buildTrustProxy(undefined, 'production')).toBe(1);
      expect(buildTrustProxy(undefined, 'development')).toBe(false);
    });

    it('honours explicit values', () => {
      expect(buildTrustProxy('false', 'production')).toBe(false);
      expect(buildTrustProxy('true', 'development')).toBe(1);
      expect(buildTrustProxy('2', 'production')).toBe(2);
      expect(buildTrustProxy('loopback, 10.0.0.0/8', 'production')).toBe('loopback, 10.0.0.0/8');
    });
  });
});
