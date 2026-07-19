import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from './repositories/product.repository';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
  ) {}

  async list(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput =
      query.includeInactive === 'true' ? {} : { isActive: true };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) (where.price as any).gte = query.minPrice;
      if (query.maxPrice !== undefined) (where.price as any).lte = query.maxPrice;
    }
    if (query.inStock === 'true') where.stock = { gt: 0 };
    if (query.isFeatured === 'true') where.isFeatured = true;
    if (query.tag) where.tags = { has: query.tag };

    const orderBy = this.buildSort(query.sortBy);

    const [items, total] = await this.products.transactionList(
      {
        where, orderBy, skip, take: limit,
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
      { where },
    );

    return {
      items, total, page, limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(idOrSlug: string) {
    const product = await this.products.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    await this.products.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });
    return product;
  }

  async findFeatured(limit = 10) {
    return this.products.findMany({
      where: { isActive: true, isFeatured: true, stock: { gt: 0 } },
      take: limit,
      orderBy: { soldCount: 'desc' },
      include: { category: { select: { name: true, slug: true } } },
    });
  }

  async create(dto: CreateProductDto) {
    const dup = await this.products.findFirst({
      where: { OR: [{ sku: dto.sku }, { slug: dto.slug }] },
    });
    if (dup) throw new ConflictException('SKU hoặc slug đã tồn tại');

    const cat = await this.products.categoryFindUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');

    const { attributes, ...rest } = dto;
    return this.products.create({
      data: {
        ...rest,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        ...(attributes !== undefined && {
          attributes: attributes as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.products.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const { attributes, ...rest } = dto;
    return this.products.update({
      where: { id },
      data: {
        ...rest,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        ...(attributes !== undefined && {
          attributes: attributes as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async remove(id: string) {
    const product = await this.products.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    await this.products.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: `Đã ngừng kinh doanh ${product.name}` };
  }

  private buildSort(sortBy?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sortBy) {
      case 'price_asc':    return { price: 'asc' };
      case 'price_desc':   return { price: 'desc' };
      case 'best_selling': return { soldCount: 'desc' };
      case 'name':         return { name: 'asc' };
      case 'newest':
      default:             return { createdAt: 'desc' };
    }
  }
}
