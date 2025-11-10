import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { OpenAiService } from './openai.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, OpenAiService],
})
export class ProductsModule {}
