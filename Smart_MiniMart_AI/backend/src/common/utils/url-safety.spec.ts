import { BadRequestException } from '@nestjs/common';
import { assertSafeHttpUrl, isPrivateOrLocalHost } from './url-safety';

describe('url-safety (SEC-013 SSRF guard)', () => {
  describe('isPrivateOrLocalHost', () => {
    it.each([
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.0.0.5',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '100.100.0.1',
      'db.internal',
      'printer.local',
      '::1',
      'fd00::1',
      'fe80::1',
    ])('flags %s as private/local', (h) => {
      expect(isPrivateOrLocalHost(h)).toBe(true);
    });

    it.each(['api.deepseek.com', '8.8.8.8', 'example.com', '172.32.0.1'])(
      'treats %s as public',
      (h) => {
        expect(isPrivateOrLocalHost(h)).toBe(false);
      },
    );
  });

  describe('assertSafeHttpUrl', () => {
    it('accepts a public https url', () => {
      expect(assertSafeHttpUrl('https://api.deepseek.com/v1').hostname).toBe('api.deepseek.com');
    });

    it('rejects non-http(s) schemes', () => {
      expect(() => assertSafeHttpUrl('file:///etc/passwd')).toThrow(BadRequestException);
      expect(() => assertSafeHttpUrl('ftp://example.com')).toThrow(BadRequestException);
    });

    it('rejects internal targets (SSRF)', () => {
      expect(() => assertSafeHttpUrl('http://169.254.169.254/latest/meta-data')).toThrow(
        BadRequestException,
      );
      expect(() => assertSafeHttpUrl('http://localhost:5432')).toThrow(BadRequestException);
      expect(() => assertSafeHttpUrl('http://10.0.0.9/admin')).toThrow(BadRequestException);
    });

    it('rejects garbage', () => {
      expect(() => assertSafeHttpUrl('not a url')).toThrow(BadRequestException);
    });
  });
});
