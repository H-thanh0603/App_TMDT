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
  return file;
}
