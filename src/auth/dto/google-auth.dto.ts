import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentDto } from './consent.dto';

export class GoogleAuthDto {
  @IsString()
  googleAccessToken: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentDto)
  consents?: ConsentDto;
}
