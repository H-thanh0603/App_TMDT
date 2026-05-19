import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!c) throw new NotFoundException('Danh mục không tồn tại');
    return c;
  }

  async create(dto: CreateCategoryDto) {
    const dup = await this.prisma.category.findFirst({
      where: { OR: [{ slug: dto.slug }, { name: dto.name }] },
    });
    if (dup) throw new ConflictException('Tên hoặc slug danh mục đã tồn tại');
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException(`Không thể xóa: còn ${productCount} sản phẩm`);
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: `Đã xóa danh mục ${c.name}` };
  }
}
