import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FindAllProductsDto {
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
