import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ProductsSubjects } from 'src/config';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, FindAllProductsDto, FindOneProductDto } from './dto';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern(ProductsSubjects.create)
  create(@Payload() data: CreateProductDto) {
    return this.productsService.create(data);
  }

  @MessagePattern(ProductsSubjects.findAll)
  findAll(@Payload() filters: FindAllProductsDto) {
    return this.productsService.findAll(filters);
  }

  @MessagePattern(ProductsSubjects.findOne)
  findOne(@Payload() data: FindOneProductDto) {
    return this.productsService.findOne(data);
  }

  @MessagePattern(ProductsSubjects.update)
  update(@Payload() payload: { id: string; data: UpdateProductDto }) {
    return this.productsService.update(payload.id, payload.data);
  }

  @MessagePattern(ProductsSubjects.delete)
  remove(@Payload() data: { id: string }) {
    return this.productsService.remove(data.id);
  }

  @MessagePattern(ProductsSubjects.findOrCreate)
  findOrCreate(@Payload() data: { name: string; eanCode?: string; categoryName?: string }) {
    return this.productsService.findOrCreate(data);
  }

  @MessagePattern(ProductsSubjects.health)
  health() {
    return this.productsService.health();
  }
}
