import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateStockDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;
}

export class BulkUpdateStockDto {
  items!: UpdateStockDto[];
}
