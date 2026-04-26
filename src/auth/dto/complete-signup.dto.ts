import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentDto } from './consent.dto';

export class CompleteSignupDto {
  @IsString()
  pendingToken: string;

  @IsOptional()
  @IsString()
  name?: string;

  @ValidateNested()
  @Type(() => ConsentDto)
  consents: ConsentDto;
}
