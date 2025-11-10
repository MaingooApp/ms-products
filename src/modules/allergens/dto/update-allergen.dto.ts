import { IsOptional, IsString } from 'class-validator';

export class UpdateAllergenDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
