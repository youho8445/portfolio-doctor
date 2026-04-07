import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
