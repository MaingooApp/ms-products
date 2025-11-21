import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';

import { RpcExceptionHandler } from 'src/common';
import { CreateProductDto, UpdateProductDto, FindAllProductsDto, FindOneProductDto } from './dto';
import { OpenAiService } from './openai.service';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly openAiService: OpenAiService) {
    super();
  }

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

  /**
   * Busca un producto por nombre o EAN, si no existe lo crea
   * Este método es usado por el flujo de análisis de facturas
   */
  async findOrCreate(data: { name: string; eanCode?: string; categoryName?: string }) {
    try {
      const { name, eanCode, categoryName } = data;

      // 1. Buscar por EAN si se proporciona
      if (eanCode) {
        const productByEan = await this.product.findFirst({
          where: { eanCode },
          include: {
            category: true,
            allergens: {
              include: {
                allergen: true,
              },
            },
          },
        });

        if (productByEan) {
          this.logger.log(`✅ Product found by EAN: ${eanCode}`);
          return this.formatProduct(productByEan);
        }
      }

      // 2. Buscar por nombre exacto (insensitive)
      const productByName = await this.product.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
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

      if (productByName) {
        this.logger.log(`✅ Product found by name: ${name}`);
        return this.formatProduct(productByName);
      }

      // 3. Si no existe, crear el producto
      this.logger.log(`🆕 Creating new product: ${name}`);

      // Identificar alérgenos automáticamente con OpenAI
      let allergenIds: string[] = [];
      if (this.openAiService) {
        const allergenResult = await this.openAiService.identifyAllergens(name);

        if (allergenResult.allergenCodes.length > 0) {
          // Buscar los IDs de los alérgenos identificados
          const allergens = await this.allergen.findMany({
            where: {
              code: {
                in: allergenResult.allergenCodes,
              },
            },
            select: { id: true, code: true },
          });

          allergenIds = allergens.map((a) => a.id);

          this.logger.log(
            `🏷️  Auto-detected allergens (${allergenResult.confidence}): ${allergenResult.allergenCodes.join(', ')} - ${allergenResult.reasoning}`,
          );
        }
      }

      // Obtener todas las categorías existentes
      const categories = await this.category.findMany({ select: { name: true } });
      let suggestedCategoryName = categoryName;
      if (this.openAiService && categories.length > 0) {
        const categoryNames = categories.map((c) => c.name);
        const suggestion = await this.openAiService.suggestCategory(name, categoryNames);
        if (suggestion.category && categoryNames.includes(suggestion.category)) {
          suggestedCategoryName = suggestion.category;
          this.logger.log(
            `🏷️  Auto-suggested category (${suggestion.confidence}): ${suggestion.category} - ${suggestion.reasoning}`,
          );
        }
      }

      const categoryId = await this.resolveCategoryId(suggestedCategoryName);

      const newProduct = await this.product.create({
        data: {
          name,
          eanCode: eanCode || undefined,
          categoryId,
          unit: 'Unidad', // Unidad por defecto
          allergens:
            allergenIds.length > 0
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

      this.logger.log(`✅ Product created: ${newProduct.id} with ${allergenIds.length} allergens`);
      return this.formatProduct(newProduct);
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  /**
   * Identificar alérgenos para una descripción de producto
   * Método público para ser llamado desde otros servicios
   */
  async identifyAllergensForProduct(description: string) {
    try {
      const result = await this.openAiService.identifyAllergens(description);

      // Obtener información completa de los alérgenos identificados
      const allergens = await this.allergen.findMany({
        where: {
          code: {
            in: result.allergenCodes,
          },
        },
      });

      return {
        allergenCodes: result.allergenCodes,
        allergens: allergens.map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          description: a.description,
        })),
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
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

  private async resolveCategoryId(categoryName?: string) {
    const trimmedName = categoryName?.trim();

    if (trimmedName) {
      const existingCategory = await this.category.findFirst({
        where: {
          name: {
            contains: trimmedName,
            mode: 'insensitive',
          },
        },
      });

      if (existingCategory) {
        return existingCategory.id;
      }

      const newCategory = await this.category.create({
        data: {
          name: trimmedName,
          description: 'Categoría auto-creada desde el flujo de importación',
        },
      });

      this.logger.log(`🆕 Auto-created category: ${newCategory.name} (${newCategory.id})`);
      return newCategory.id;
    }

    const defaultCategory = await this.category.findFirst({
      where: {
        name: {
          equals: 'Otros',
          mode: 'insensitive',
        },
      },
    });

    if (defaultCategory) {
      return defaultCategory.id;
    }

    const createdDefault = await this.category.create({
      data: {
        name: 'Otros',
        description: 'Categoría por defecto para productos sin clasificación',
      },
    });

    this.logger.log(
      `🆕 Auto-created default category: ${createdDefault.name} (${createdDefault.id})`,
    );
    return createdDefault.id;
  }
}
