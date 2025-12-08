import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class FindOneProductDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsOptional()
  @IsUUID()
  enterpriseId?: string;
}
