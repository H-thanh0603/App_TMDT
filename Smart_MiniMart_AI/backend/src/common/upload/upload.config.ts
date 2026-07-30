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
    const heifBrands = [
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
    if (heifBrands.includes(brand)) return 'heic';
  }

  return null;
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
  return file;
}
