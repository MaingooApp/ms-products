import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma, PrismaClient } from '@prisma/client';

import { RpcExceptionHandler } from 'src/common';
import {
  CreateProductDto,
  UpdateProductDto,
  FindAllProductsDto,
  FindOneProductDto,
  UpdateStockDto,
} from './dto';
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
      const { allergenIds, stock, ...productData } = data;

      const product = await this.product.create({
        data: {
          ...productData,
          stock: stock ? new Prisma.Decimal(stock) : new Prisma.Decimal(0),
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
      const { search, categoryId, allergenId, enterpriseId } = filters;

      const where: any = {
        enterpriseId, // Filtrar por empresa
      };

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
      const where: any = { id: data.id };

      // Si se proporciona enterpriseId, filtrar también por empresa
      if (data.enterpriseId) {
        where.enterpriseId = data.enterpriseId;
      }

      const product = await this.product.findFirst({
        where,
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
      const { allergenIds, stock, ...productData } = data;

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
          stock: stock !== undefined ? new Prisma.Decimal(stock) : undefined,
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
  async findOrCreate(data: {
    name: string;
    eanCode?: string;
    categoryName?: string;
    enterpriseId: string;
  }) {
    try {
      const { name, eanCode, categoryName, enterpriseId } = data;

      // 1. Buscar por EAN si se proporciona (dentro de la empresa)
      if (eanCode) {
        const productByEan = await this.product.findFirst({
          where: { eanCode, enterpriseId },
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

      // 2. Buscar por nombre exacto (insensitive) dentro de la empresa
      const productByName = await this.product.findFirst({
        where: {
          enterpriseId,
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
      this.logger.log(`🆕 Creating new product: ${name} for enterprise: ${enterpriseId}`);

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
          enterpriseId,
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

  /**
   * Actualiza el stock de uno o varios productos
   * Usado por el flujo de análisis de documentos para actualizar inventario
   * Utiliza transacciones para garantizar consistencia de datos
   */
  async updateStock(data: UpdateStockDto | UpdateStockDto[]) {
    try {
      const items = Array.isArray(data) ? data : [data];

      // 1. Obtener todos los productos en una sola consulta
      const products = await this.product.findMany({
        where: {
          id: { in: items.map((item) => item.productId) },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 2. Separar items válidos de los que no tienen producto
      const validItems: { item: UpdateStockDto; product: (typeof products)[0] }[] = [];
      const missingResults: {
        productId: string;
        newStock: number;
        success: boolean;
        error?: string;
      }[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (product) {
          validItems.push({ item, product });
        } else {
          missingResults.push({
            productId: item.productId,
            newStock: 0,
            success: false,
            error: 'Product not found',
          });
        }
      }

      // Si no hay items válidos, retornar solo los errores
      if (validItems.length === 0) {
        return {
          success: false,
          results: missingResults,
        };
      }

      // 3. Preparar operaciones de actualización
      const updateOps = validItems.map(({ item, product }) => {
        const currentStock = product.stock.toNumber();
        const newStock = Math.max(0, currentStock + item.quantity);

        return this.product.update({
          where: { id: item.productId },
          data: {
            stock: new Prisma.Decimal(newStock),
          },
        });
      });

      // 4. Ejecutar todas las actualizaciones en una transacción
      const updatedProducts = await this.$transaction(updateOps);

      // 5. Logging después de la transacción exitosa
      const successResults = updatedProducts.map((updated, idx) => {
        const { item, product } = validItems[idx];
        const currentStock = product.stock.toNumber();
        const newStock = updated.stock.toNumber();

        this.logger.log(
          `📦 Stock updated for product ${item.productId}: ${currentStock} -> ${newStock} (${item.quantity > 0 ? '+' : ''}${item.quantity})`,
        );

        return {
          productId: updated.id,
          newStock,
          success: true,
        };
      });

      // 6. Combinar resultados
      const allResults = [...successResults, ...missingResults];

      return {
        success: missingResults.length === 0,
        results: allResults,
      };
    } catch (error) {
      throw RpcExceptionHandler.handle(error);
    }
  }

  private formatProduct(product: any) {
    return {
      id: product.id,
      name: product.name,
      eanCode: product.eanCode,
      description: product.description,
      categoryId: product.categoryId,
      enterpriseId: product.enterpriseId,
      unit: product.unit,
      stock: product.stock?.toNumber() ?? 0,
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
