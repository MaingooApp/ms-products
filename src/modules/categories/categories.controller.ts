import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ProductsSubjects } from 'src/config';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @MessagePattern(ProductsSubjects.createCategory)
  create(@Payload() data: CreateCategoryDto) {
    return this.categoriesService.create(data);
  }

  @MessagePattern(ProductsSubjects.findAllCategories)
  findAll() {
    return this.categoriesService.findAll();
  }

  @MessagePattern(ProductsSubjects.findOneCategory)
  findOne(@Payload() data: { id: string }) {
    return this.categoriesService.findOne(data.id);
  }

  @MessagePattern(ProductsSubjects.updateCategory)
  update(@Payload() payload: { id: string; data: UpdateCategoryDto }) {
    return this.categoriesService.update(payload.id, payload.data);
  }

  @MessagePattern(ProductsSubjects.deleteCategory)
  remove(@Payload() data: { id: string }) {
    return this.categoriesService.remove(data.id);
  }
}
