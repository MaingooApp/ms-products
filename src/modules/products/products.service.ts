import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';

import { RpcExceptionHandler } from 'src/common';
import { CreateProductDto, UpdateProductDto, FindAllProductsDto, FindOneProductDto } from './dto';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductsService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  async create(data: CreateProductDto) {
    try {
      const { allergenIds, ...productData } = data;

      const product = await this.product.create({
        data: {
          ...productData,
          allergens: allergenIds
            ? {
                create: allergenIds.map((allergenId) => ({
                  allergenId,
                })),
              }
            : undefined,
        },
        include: {
          category: true,
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      return this.formatProduct(product);
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async findAll(filters: FindAllProductsDto) {
    try {
      const { search, categoryId, allergenId } = filters;

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { eanCode: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (allergenId) {
        where.allergens = {
          some: {
            allergenId,
          },
        };
      }

      const products = await this.product.findMany({
        where,
        include: {
          category: true,
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return products.map(this.formatProduct);
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async findOne(data: FindOneProductDto) {
    try {
      const product = await this.product.findUnique({
        where: { id: data.id },
        include: {
          category: true,
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      if (!product) {
        throw new RpcException({ status: 404, message: 'Product not found' });
      }

      return this.formatProduct(product);
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async update(id: string, data: UpdateProductDto) {
    try {
      const { allergenIds, ...productData } = data;

      // Si se proporcionan alérgenos, reemplazar los existentes
      if (allergenIds) {
        await this.productAllergen.deleteMany({
          where: { productId: id },
        });
      }

      const product = await this.product.update({
        where: { id },
        data: {
          ...productData,
          allergens: allergenIds
            ? {
                create: allergenIds.map((allergenId) => ({
                  allergenId,
                })),
              }
            : undefined,
        },
        include: {
          category: true,
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      return this.formatProduct(product);
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async remove(id: string) {
    try {
      await this.product.delete({
        where: { id },
      });

      return { message: 'Product deleted successfully' };
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  private formatProduct(product: any) {
    return {
      id: product.id,
      name: product.name,
      eanCode: product.eanCode,
      description: product.description,
      categoryId: product.categoryId,
      unit: product.unit,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            description: product.category.description,
          }
        : null,
      allergens: product.allergens?.map((pa: any) => ({
        id: pa.allergen.id,
        name: pa.allergen.name,
        code: pa.allergen.code,
        description: pa.allergen.description,
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
