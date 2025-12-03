import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  eanCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsUUID('4', { each: true })
  allergenIds?: string[];
}
