import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';

import { RpcExceptionHandler } from 'src/common';
import { CreateAllergenDto, UpdateAllergenDto } from './dto';

@Injectable()
export class AllergensService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AllergensService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  async create(data: CreateAllergenDto) {
    try {
      const allergen = await this.allergen.create({
        data,
      });

      return allergen;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async findAll() {
    try {
      const allergens = await this.allergen.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return allergens;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async findOne(id: string) {
    try {
      const allergen = await this.allergen.findUnique({
        where: { id },
      });

      if (!allergen) {
        throw new RpcException({ status: 404, message: 'Allergen not found' });
      }

      return allergen;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async update(id: string, data: UpdateAllergenDto) {
    try {
      const allergen = await this.allergen.update({
        where: { id },
        data,
      });

      return allergen;
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  async remove(id: string) {
    try {
      await this.allergen.delete({
        where: { id },
      });

      return { message: 'Allergen deleted successfully' };
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }
}
