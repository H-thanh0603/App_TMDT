import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { ImportReceiptStatus, OCREngine } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { OCRClientService } from '@/modules/ai-gateway/ocr-client.service';
import { CreateReceiptDto, ImportReceiptItemDto } from './dto/create-receipt.dto';
import { OCRScanDto } from './dto/ocr-scan.dto';

@Injectable()
export class ImportReceiptsService {
  private readonly logger = new Logger(ImportReceiptsService.name);

  constructor(
    private prisma: PrismaService,
    private ocrClient: OCRClientService,
  ) {}

  /** Quét phiếu nhập hàng — trả về draft receipt đã có items từ OCR */
  async scanReceipt(dto: OCRScanDto, userId: string) {
    const settings = await this.prisma.oCRSettings.findFirst();
    const engine = dto.engine ?? settings?.defaultEngine ?? OCREngine.MOCK;

    this.logger.log(`OCR scan với engine ${engine}: ${dto.imageUrl}`);

    const ocrResult = await this.ocrClient.parseReceipt(dto.imageUrl, engine);

    const receiptNumber = await this.nextReceiptNumber();
    const receipt = await this.prisma.importReceipt.create({
      data: {
        receiptNumber,
        supplierName: dto.supplierName ?? ocrResult.supplierName ?? 'Chưa xác định',
        importDate: ocrResult.importDate ? new Date(ocrResult.importDate) : new Date(),
        imageUrl: dto.imageUrl,
        status: ImportReceiptStatus.OCR_DONE,
        ocrEngine: engine,
        ocrRawText: ocrResult.rawText,
        ocrParsedJson: ocrResult.parsed as object,
        ocrConfidence: ocrResult.confidence,
        createdById: userId,
        items: {
          create: (ocrResult.items ?? []).map((it) => ({
            rawProductName: it.rawProductName ?? it.productName,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit ?? 'cái',
            unitPrice: it.unitPrice,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
            confidence: it.confidence ?? 0.5,
          })),
        },
      },
      include: { items: true },
    });

    return receipt;
  }

  /** Tạo phiếu nhập thủ công (không OCR) */
  async createManual(dto: CreateReceiptDto, userId: string) {
    const receiptNumber = await this.nextReceiptNumber();
    const totalAmount = dto.items.reduce((sum, it) => sum + Number(it.unitPrice) * it.quantity, 0);

    return this.prisma.importReceipt.create({
      data: {
        receiptNumber,
        supplierName: dto.supplierName,
        supplierPhone: dto.supplierPhone,
        importDate: new Date(dto.importDate),
        imageUrl: dto.imageUrl,
        notes: dto.notes,
        status: ImportReceiptStatus.REVIEWED,
        totalAmount,
        createdById: userId,
        items: {
          create: dto.items.map((it) => ({
            productId: it.productId,
            rawProductName: it.rawProductName,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit ?? 'cái',
            unitPrice: it.unitPrice,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
            confidence: it.confidence ?? 1.0,
            isVerified: true,
            notes: it.notes,
          })),
        },
      },
      include: { items: true },
    });
  }

  async list(status?: ImportReceiptStatus, page = 1, limit = 20) {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.importReceipt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.importReceipt.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const receipt = await this.prisma.importReceipt.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    return receipt;
  }

  async updateItems(id: string, items: ImportReceiptItemDto[]) {
    await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.importReceiptItem.deleteMany({ where: { importReceiptId: id } });
      for (const it of items) {
        await tx.importReceiptItem.create({
          data: {
            importReceiptId: id,
            productId: it.productId,
            rawProductName: it.rawProductName ?? it.productName,
            productName: it.productName,
            quantity: it.quantity,
            unit: it.unit ?? 'cái',
            unitPrice: it.unitPrice,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
            confidence: it.confidence ?? 1.0,
            isVerified: true,
          },
        });
      }
      const total = items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
      await tx.importReceipt.update({
        where: { id },
        data: { totalAmount: total, status: ImportReceiptStatus.REVIEWED },
      });
    });
    return this.findOne(id);
  }

  /** Xác nhận nhập kho — cập nhật stock + ghi inventory_transactions */
  async confirm(id: string, userId: string) {
    const receipt = await this.findOne(id);
    if (receipt.status === ImportReceiptStatus.CONFIRMED) {
      throw new BadRequestException('Phiếu đã xác nhận trước đó');
    }
    if (receipt.items.length === 0) {
      throw new BadRequestException('Phiếu không có sản phẩm');
    }

    return this.prisma.$transaction(async (tx) => {
      // Guard nguyên tử chống double-confirm: chỉ "chiếm" phiếu nếu CHƯA CONFIRMED (SEC-019).
      // Nếu một request khác đã xác nhận, count=0 → ném lỗi → rollback toàn bộ (không nhập kho gấp đôi).
      const claim = await tx.importReceipt.updateMany({
        where: { id, status: { not: ImportReceiptStatus.CONFIRMED } },
        data: {
          status: ImportReceiptStatus.CONFIRMED,
          confirmedAt: new Date(),
          reviewedById: userId,
        },
      });
      if (claim.count === 0) {
        throw new BadRequestException('Phiếu đã xác nhận trước đó');
      }

      for (const it of receipt.items) {
        if (!it.productId) {
          throw new BadRequestException(`Dòng "${it.productName}" chưa được gán mã sản phẩm`);
        }
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product) continue;

        await tx.product.update({
          where: { id: it.productId },
          data: {
            stock: { increment: it.quantity },
            importPrice: it.unitPrice,
            expiryDate: it.expiryDate ?? product.expiryDate,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: it.productId,
            type: 'IMPORT',
            quantity: it.quantity,
            reason: `Nhập theo phiếu ${receipt.receiptNumber}`,
            refType: 'IMPORT_RECEIPT',
            refId: receipt.id,
            beforeQty: product.stock,
            afterQty: product.stock + it.quantity,
            createdById: userId,
          },
        });
      }

      const updated = await tx.importReceipt.findUnique({
        where: { id },
        include: { items: true },
      });
      this.logger.log(`Phiếu ${receipt.receiptNumber} đã xác nhận nhập kho`);
      return updated;
    });
  }

  // ========== Helpers ==========

  private async nextReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.importReceipt.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `IR-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
