import { IsNotEmpty, IsString } from 'class-validator';

export class FindOneProductDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
