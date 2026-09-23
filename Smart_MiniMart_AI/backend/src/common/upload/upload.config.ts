import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/** MIME types cho ảnh phiếu nhập / product image */
export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export function createImageUploadOptions(maxFileSizeMb = 10): MulterOptions {
  const maxBytes = Math.max(1, maxFileSizeMb) * 1024 * 1024;

  return {
    storage: memoryStorage(),
    limits: {
      fileSize: maxBytes,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      const mime = (file.mimetype || '').toLowerCase();
      if (!ALLOWED_IMAGE_MIMES.has(mime)) {
        return cb(
          new BadRequestException(
            `Định dạng file không hợp lệ (${file.mimetype}). Chỉ chấp nhận: JPEG, PNG, WEBP, HEIC.`,
          ) as any,
          false,
        );
      }
      // Tên file không chứa
      if (file.originalname && /[\\/]/.test(file.originalname)) {
        return cb(new BadRequestException('Tên file không hợp lệ') as any, false);
      }
      cb(null, true);
    },
  };
}

/**
 * Sniff định dạng ảnh THẬT từ magic bytes — KHÔNG tin Content-Type/đuôi file do client gửi.
 * Trả về họ ảnh nhận diện được hoặc null nếu nội dung không phải ảnh hợp lệ.
 */
const HEIF_BRANDS = [
  'heic',
  'heix',
  'hevc',
  'heim',
  'heis',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
  'heif',
];

export function sniffImageType(buf: Buffer): 'jpeg' | 'png' | 'webp' | 'heic' | null {
  if (!buf || buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // WEBP: "RIFF"...."WEBP"
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }

  // HEIC/HEIF: box "ftyp" tại offset 4, brand tại offset 8
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12).toLowerCase();
    if (HEIF_BRANDS.includes(brand)) return 'heic';
  }

  return null;
}

/**
 * Đọc kích thước ảnh từ header (không cần thư viện giải mã).
 * Trả về null khi không parse được (file quá ngắn/lạ) — khi đó chỉ áp dụng giới hạn size.
 */
export function readImageDimensions(
  buf: Buffer,
  type: 'jpeg' | 'png' | 'webp' | 'heic',
): { width: number; height: number } | null {
  try {
    if (type === 'png' && buf.length >= 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    if (type === 'webp' && buf.length >= 30) {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') {
        const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return { width: w, height: h };
      }
      if (chunk === 'VP8 ') {
        // lossy: kích thước ở offset 26 (14 bit mỗi chiều)
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
      if (chunk === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      return null;
    }

    if (type === 'jpeg') {
      // Quét các marker để tìm SOFn (0xC0-0xCF, bỏ 0xC4/0xC8/0xCC) → height/width
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buf[offset + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          offset += 2;
          continue;
        }
        const segLength = buf.readUInt16BE(offset + 2);
        if (segLength < 2) return null;
        const isSof =
          marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) {
          return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
        }
        if (marker === 0xda) return null; // bắt đầu scan data, không còn header
        offset += 2 + segLength;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * SEC-029 — chặn "decompression bomb": file vài chục KB nhưng giải nén ra hàng trăm
 * megapixel, làm treo worker khi decode (kể cả ở OCR service phía sau).
 */
export function assertImageDimensions(buf: Buffer, maxPixels = 40_000_000): void {
  const type = sniffImageType(buf);
  if (!type) return; // nội dung không phải ảnh → đã bị assertImageBuffer chặn trước đó
  const dims = readImageDimensions(buf, type);
  if (!dims) return; // không đọc được header → chỉ dựa vào giới hạn dung lượng
  if (dims.width <= 0 || dims.height <= 0) return;
  if (dims.width * dims.height > maxPixels) {
    throw new BadRequestException(
      `Ảnh quá lớn (${dims.width}x${dims.height}px). Tối đa ${Math.round(maxPixels / 1_000_000)} megapixel.`,
    );
  }
}

export function assertImageBuffer(file?: Express.Multer.File, maxFileSizeMb = 10) {
  if (!file) {
    throw new BadRequestException('Thiếu file upload (field: file)');
  }
  if (!ALLOWED_IMAGE_MIMES.has((file.mimetype || '').toLowerCase())) {
    throw new BadRequestException(`MIME không được phép: ${file.mimetype}`);
  }
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new BadRequestException(`File vượt quá ${maxFileSizeMb}MB`);
  }
  // Xác thực nội dung THẬT bằng magic bytes (chống file độc hại đội lốt ảnh)
  const detected = sniffImageType(file.buffer);
  if (!detected) {
    throw new BadRequestException('Nội dung file không phải ảnh hợp lệ (JPEG/PNG/WEBP/HEIC)');
  }
  // Chống ảnh "bom" kích thước (SEC-029)
  assertImageDimensions(file.buffer);
  return file;
}
