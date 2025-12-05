import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAllProductsDto {
  @IsUUID()
  @IsNotEmpty()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  allergenId?: string;
}
