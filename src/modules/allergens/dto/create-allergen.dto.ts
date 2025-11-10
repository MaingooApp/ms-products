import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAllergenDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
