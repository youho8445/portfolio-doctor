import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserConsent } from '../entities/user-consent.entity';
import { PhoneVerification } from '../entities/phone-verification.entity';
import { AppSetting } from '../entities/app-setting.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MockSmsProvider } from './sms/mock-sms.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserConsent, PhoneVerification, AppSetting]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('[Auth] JWT_SECRET environment variable is required but not set. App cannot start.');
        }
        return {
          secret,
          signOptions: { expiresIn: '72h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: 'SMS_PROVIDER', useClass: MockSmsProvider },
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
