import { BadRequestException } from '@nestjs/common';
import { assertImageBuffer, sniffImageType } from './upload.config';

const pad = (b: Buffer) => Buffer.concat([b, Buffer.alloc(16)]); // đủ >= 12 byte

const JPEG = pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
const PNG = pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
  Buffer.alloc(8),
]);
const HEIC = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftyp', 'ascii'),
  Buffer.from('heic', 'ascii'),
  Buffer.alloc(8),
]);

describe('sniffImageType (SEC-012 magic bytes)', () => {
  it('detects real image families', () => {
    expect(sniffImageType(JPEG)).toBe('jpeg');
    expect(sniffImageType(PNG)).toBe('png');
    expect(sniffImageType(WEBP)).toBe('webp');
    expect(sniffImageType(HEIC)).toBe('heic');
  });

  it('returns null for non-image content (e.g. HTML/script/PE)', () => {
    expect(sniffImageType(pad(Buffer.from('<script>alert(1)</script>', 'ascii')))).toBeNull();
    expect(sniffImageType(pad(Buffer.from('MZ', 'ascii')))).toBeNull(); // PE header
    expect(sniffImageType(Buffer.alloc(4))).toBeNull(); // quá ngắn
  });
});

describe('assertImageBuffer', () => {
  it('rejects a file whose content is not a real image even if MIME says image/png', () => {
    const fake = {
      mimetype: 'image/png',
      size: 100,
      buffer: pad(Buffer.from('<svg onload=alert(1)>', 'ascii')),
    } as any;
    expect(() => assertImageBuffer(fake, 10)).toThrow(BadRequestException);
  });

  it('accepts a genuine PNG', () => {
    const ok = { mimetype: 'image/png', size: PNG.length, buffer: PNG } as any;
    expect(assertImageBuffer(ok, 10)).toBe(ok);
  });

  it('rejects oversize file', () => {
    const big = { mimetype: 'image/png', size: 999 * 1024 * 1024, buffer: PNG } as any;
    expect(() => assertImageBuffer(big, 10)).toThrow(BadRequestException);
  });
});
