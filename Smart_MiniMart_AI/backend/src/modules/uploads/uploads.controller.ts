import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  assertImageBuffer,
  createImageUploadOptions,
  sniffImageType,
} from '@/common/upload/upload.config';

@ApiTags('Uploads')
@ApiBearerAuth()
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STORE_ADMIN, Role.STAFF)
@Controller('uploads')
export class UploadsController {
  constructor(private cfg: ConfigService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload ảnh (OCR phiếu / product) — validate MIME + size' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', createImageUploadOptions(Number(process.env.MAX_FILE_SIZE_MB || 10))),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    const maxMb = Number(this.cfg.get('MAX_FILE_SIZE_MB') || 10);
    const f = assertImageBuffer(file, maxMb);

    const uploadDir = this.cfg.get<string>('UPLOAD_DIR') || './uploads';
    const absDir = path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir);
    fs.mkdirSync(absDir, { recursive: true });

    const ext =
      {
        png: '.png',
        webp: '.webp',
        heic: '.heic',
        jpeg: '.jpg',
      }[sniffImageType(f.buffer) ?? 'jpeg'] ?? '.jpg';
    const filename = `${randomUUID()}${ext}`;
    const dest = path.join(absDir, filename);
    fs.writeFileSync(dest, f.buffer);

    // Không trả absolute server path ra client (tránh lộ cấu trúc filesystem)
    return {
      filename,
      mimeType: f.mimetype,
      size: f.size,
      url: `/uploads/${filename}`,
    };
  }
}
