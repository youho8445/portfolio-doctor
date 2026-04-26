import { IsString, Matches } from 'class-validator';

export class PhoneSendDto {
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: '올바른 전화번호를 입력해주세요' })
  phoneNumber: string;
}
