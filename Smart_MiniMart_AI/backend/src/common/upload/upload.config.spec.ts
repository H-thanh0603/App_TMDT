import { BadRequestException } from '@nestjs/common';
import {
  assertImageBuffer,
  readImageDimensions,
  sniffImageType,
} from './upload.config';

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

describe('decompression-bomb guard (SEC-029)', () => {
  /** PNG tối thiểu: 8 byte signature + IHDR width/height tại offset 16/20 */
  function pngWithSize(width: number, height: number): Buffer {
    const buf = Buffer.alloc(32);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
    buf.writeUInt32BE(width, 16);
    buf.writeUInt32BE(height, 20);
    return buf;
  }

  it('detects dimensions for PNG/JPEG/WEBP', () => {
    expect(readImageDimensions(pngWithSize(1920, 1080), 'png')).toEqual({
      width: 1920,
      height: 1080,
    });

    // JPEG: SOI + SOF0 (0xC0) với height/width
    const jpeg = Buffer.alloc(20);
    jpeg.writeUInt16BE(0xffd8, 0);
    jpeg.writeUInt16BE(0xffc0, 2);
    jpeg.writeUInt16BE(11, 4); // segment length
    jpeg.writeUInt16BE(600, 7); // height
    jpeg.writeUInt16BE(800, 9); // width
    expect(readImageDimensions(jpeg, 'jpeg')).toEqual({ width: 800, height: 600 });

    // WEBP (VP8X): 24-bit little-endian kích thước trừ 1
    const webp = Buffer.alloc(32);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    webp.write('VP8X', 12, 'ascii');
    webp.writeUIntLE(1023, 24, 3);
    webp.writeUIntLE(767, 27, 3);
    expect(readImageDimensions(webp, 'webp')).toEqual({ width: 1024, height: 768 });
  });

  it('rejects a "bomb" image that expands to hundreds of megapixels', () => {
    const bomb = { mimetype: 'image/png', size: 1024, buffer: pngWithSize(100_000, 100_000) } as any;
    expect(() => assertImageBuffer(bomb, 10)).toThrow(/megapixel/);
  });

  it('accepts a normal photo', () => {
    const ok = { mimetype: 'image/png', size: 2048, buffer: pngWithSize(1920, 1080) } as any;
    expect(assertImageBuffer(ok, 10)).toBe(ok);
  });

  it('does not block when the header carries no readable dimensions', () => {
    const unknown = { mimetype: 'image/png', size: PNG.length, buffer: PNG } as any;
    expect(assertImageBuffer(unknown, 10)).toBe(unknown); // PNG header-only trong unit test
  });
});
