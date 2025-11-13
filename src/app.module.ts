import { Module } from '@nestjs/common';

import { NatsModule } from './transports/nats.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AllergensModule } from './modules/allergens/allergens.module';

@Module({
  imports: [NatsModule, ProductsModule, CategoriesModule, AllergensModule],
})
export class AppModule {}
