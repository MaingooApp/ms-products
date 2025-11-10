import { IsUUID } from 'class-validator';

export class FindOneProductDto {
  @IsUUID()
  id!: string;
}
