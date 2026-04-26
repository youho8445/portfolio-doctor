import { IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsentDto } from './consent.dto';

export class PhoneVerifyDto {
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: '올바른 전화번호를 입력해주세요' })
  phoneNumber: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: '6자리 숫자를 입력해주세요' })
  code: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentDto)
  consents?: ConsentDto;
}
