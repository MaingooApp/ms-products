import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';

import { RpcExceptionHandler } from 'src/common';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CategoriesService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  async create(data: CreateCategoryDto) {
    try {
      const category = await this.category.create({
        data,
      });

      return category;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async findAll() {
    try {
      const categories = await this.category.findMany({
        orderBy: {
          name: 'asc',
        },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      return categories.map((category) => ({
        ...category,
        productsCount: category._count.products,
        _count: undefined,
      }));
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async findOne(id: string) {
    try {
      const category = await this.category.findUnique({
        where: { id },
        include: {
          products: true,
        },
      });

      if (!category) {
        throw new RpcException({ status: 404, message: 'Category not found' });
      }

      return category;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async update(id: string, data: UpdateCategoryDto) {
    try {
      const category = await this.category.update({
        where: { id },
        data,
      });

      return category;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async remove(id: string) {
    try {
      await this.category.delete({
        where: { id },
      });

      return { message: 'Category deleted successfully' };
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }
}
