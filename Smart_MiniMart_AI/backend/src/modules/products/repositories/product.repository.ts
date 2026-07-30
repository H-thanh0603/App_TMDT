import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

/** Port — Clean Architecture boundary cho Product aggregate */
export interface IProductRepository {
  findMany(args: Prisma.ProductFindManyArgs): Promise<any[]>;
  count(args?: Prisma.ProductCountArgs): Promise<number>;
  findFirst(args: Prisma.ProductFindFirstArgs): Promise<any | null>;
  findUnique(args: Prisma.ProductFindUniqueArgs): Promise<any | null>;
  create(args: Prisma.ProductCreateArgs): Promise<any>;
  update(args: Prisma.ProductUpdateArgs): Promise<any>;
  categoryFindUnique(args: Prisma.CategoryFindUniqueArgs): Promise<any | null>;
  transactionList(
    findManyArgs: Prisma.ProductFindManyArgs,
    countArgs: Prisma.ProductCountArgs,
  ): Promise<[any[], number]>;
}

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.ProductFindManyArgs) {
    return this.prisma.product.findMany(args);
  }

  count(args?: Prisma.ProductCountArgs) {
    return this.prisma.product.count(args);
  }

  findFirst(args: Prisma.ProductFindFirstArgs) {
    return this.prisma.product.findFirst(args);
  }

  findUnique(args: Prisma.ProductFindUniqueArgs) {
    return this.prisma.product.findUnique(args);
  }

  create(args: Prisma.ProductCreateArgs) {
    return this.prisma.product.create(args);
  }

  update(args: Prisma.ProductUpdateArgs) {
    return this.prisma.product.update(args);
  }

  categoryFindUnique(args: Prisma.CategoryFindUniqueArgs) {
    return this.prisma.category.findUnique(args);
  }

  transactionList(findManyArgs: Prisma.ProductFindManyArgs, countArgs: Prisma.ProductCountArgs) {
    return this.prisma.$transaction([
      this.prisma.product.findMany(findManyArgs),
      this.prisma.product.count(countArgs),
    ]) as Promise<[any[], number]>;
  }
}
