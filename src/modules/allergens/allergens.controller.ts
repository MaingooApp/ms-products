import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ProductsSubjects } from 'src/config';
import { AllergensService } from './allergens.service';
import { CreateAllergenDto, UpdateAllergenDto } from './dto';

@Controller()
export class AllergensController {
  constructor(private readonly allergensService: AllergensService) {}

  @MessagePattern(ProductsSubjects.createAllergen)
  create(@Payload() data: CreateAllergenDto) {
    return this.allergensService.create(data);
  }

  @MessagePattern(ProductsSubjects.findAllAllergens)
  findAll() {
    return this.allergensService.findAll();
  }

  @MessagePattern(ProductsSubjects.findOneAllergen)
  findOne(@Payload() data: { id: string }) {
    return this.allergensService.findOne(data.id);
  }

  @MessagePattern(ProductsSubjects.updateAllergen)
  update(@Payload() payload: { id: string; data: UpdateAllergenDto }) {
    return this.allergensService.update(payload.id, payload.data);
  }

  @MessagePattern(ProductsSubjects.deleteAllergen)
  remove(@Payload() data: { id: string }) {
    return this.allergensService.remove(data.id);
  }
}
