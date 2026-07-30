import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImportReceiptStatus, Role } from '@prisma/client';

import { ImportReceiptsService } from './import-receipts.service';
import { CreateReceiptDto, UpdateReceiptItemsDto } from './dto/create-receipt.dto';
import { OCRScanDto } from './dto/ocr-scan.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Import Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STORE_ADMIN, Role.STAFF)
@Controller('import-receipts')
export class ImportReceiptsController {
  constructor(private receipts: ImportReceiptsService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Quét phiếu nhập bằng OCR' })
  scan(@Body() dto: OCRScanDto, @CurrentUser('sub') userId: string) {
    return this.receipts.scanReceipt(dto, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu nhập thủ công' })
  createManual(@Body() dto: CreateReceiptDto, @CurrentUser('sub') userId: string) {
    return this.receipts.createManual(dto, userId);
  }

  @Get()
  list(
    @Query('status') status?: ImportReceiptStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.receipts.list(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receipts.findOne(id);
  }

  @Patch(':id/items')
  @ApiOperation({ summary: 'Cập nhật danh sách items sau khi review OCR' })
  updateItems(@Param('id') id: string, @Body() dto: UpdateReceiptItemsDto) {
    return this.receipts.updateItems(id, dto.items);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận nhập kho — áp dụng thay đổi tồn kho' })
  confirm(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.receipts.confirm(id, userId);
  }
}
