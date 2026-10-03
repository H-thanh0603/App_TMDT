import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

/** Port — Clean Architecture boundary cho Product aggregate.
 *  Generic payload (thay `any`): caller truyền include/select nào nhận đúng type đó. */
export interface IProductRepository {
  findMany<T extends Prisma.ProductFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>,
  ): Promise<Array<Prisma.ProductGetPayload<T>>>;
  count(args?: Prisma.ProductCountArgs): Promise<number>;
  findFirst<T extends Prisma.ProductFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindFirstArgs>,
  ): Promise<Prisma.ProductGetPayload<T> | null>;
  findUnique<T extends Prisma.ProductFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindUniqueArgs>,
  ): Promise<Prisma.ProductGetPayload<T> | null>;
  create<T extends Prisma.ProductCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductCreateArgs>,
  ): Promise<Prisma.ProductGetPayload<T>>;
  update<T extends Prisma.ProductUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductUpdateArgs>,
  ): Promise<Prisma.ProductGetPayload<T>>;
  categoryFindUnique<T extends Prisma.CategoryFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.CategoryFindUniqueArgs>,
  ): Promise<Prisma.CategoryGetPayload<T> | null>;
  transactionList<T extends Prisma.ProductFindManyArgs>(
    findManyArgs: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>,
    countArgs: Prisma.ProductCountArgs,
  ): Promise<[Array<Prisma.ProductGetPayload<T>>, number]>;
}

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany<T extends Prisma.ProductFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>,
  ) {
    return this.prisma.product.findMany(args);
  }

  count(args?: Prisma.ProductCountArgs) {
    return this.prisma.product.count(args);
  }

  findFirst<T extends Prisma.ProductFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindFirstArgs>,
  ) {
    return this.prisma.product.findFirst(args);
  }

  findUnique<T extends Prisma.ProductFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductFindUniqueArgs>,
  ) {
    return this.prisma.product.findUnique(args);
  }

  create<T extends Prisma.ProductCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductCreateArgs>,
  ) {
    return this.prisma.product.create(args);
  }

  update<T extends Prisma.ProductUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProductUpdateArgs>,
  ) {
    return this.prisma.product.update(args);
  }

  categoryFindUnique<T extends Prisma.CategoryFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.CategoryFindUniqueArgs>,
  ) {
    return this.prisma.category.findUnique(args);
  }

  transactionList<T extends Prisma.ProductFindManyArgs>(
    findManyArgs: Prisma.SelectSubset<T, Prisma.ProductFindManyArgs>,
    countArgs: Prisma.ProductCountArgs,
  ) {
    return this.prisma.$transaction([
      this.prisma.product.findMany(findManyArgs),
      this.prisma.product.count(countArgs),
    ]) as Promise<[Array<Prisma.ProductGetPayload<T>>, number]>;
  }
}
