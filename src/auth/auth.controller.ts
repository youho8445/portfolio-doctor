import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { PhoneSendDto } from './dto/phone-send.dto';
import { PhoneVerifyDto } from './dto/phone-verify.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppSetting } from '../entities/app-setting.entity';
import { isAdminEmail } from '../admin/admin-email.helper';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
  ) {}

  // ── Google ──────────────────────────────────────────────────────────
  @Post('google')
  googleSignIn(@Body() dto: GoogleAuthDto) {
    return this.authService.googleSignIn(dto);
  }

  // ── Email ────────────────────────────────────────────────────────────
  @Post('email/signup')
  emailSignUp(@Body() dto: RegisterDto) {
    return this.authService.emailSignUp(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(ThrottlerGuard)
  @Post('email/login')
  emailLogin(@Body() dto: LoginDto) {
    return this.authService.emailLogin(dto);
  }

  // ── Phone ────────────────────────────────────────────────────────────
  @Post('phone/send-code')
  sendPhoneCode(@Body() dto: PhoneSendDto) {
    return this.authService.sendPhoneCode(dto);
  }

  @Post('phone/verify-code')
  verifyPhoneCode(@Body() dto: PhoneVerifyDto) {
    return this.authService.verifyPhoneCode(dto);
  }

  // ── Complete signup (pending token → full user) ──────────────────────
  @Post('complete-signup')
  completeSignup(@Body() dto: CompleteSignupDto) {
    return this.authService.completeSignup(dto);
  }

  // ── Me / logout ───────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: { user: { id: number; email: string } }) {
    const [user, billingSetting] = await Promise.all([
      this.authService.findById(req.user.id),
      this.settingRepo.findOne({ where: { key: 'billing_mode' } }),
    ]);

    const billingMode = (billingSetting?.value ?? 'FREE') as 'FREE' | 'SOFT_PAYWALL' | 'PAID';
    const isTrial = user.trialEndsAt != null && user.trialEndsAt > new Date();
    const isPremiumUser =
      billingMode === 'FREE' || billingMode === 'SOFT_PAYWALL' || isTrial;
    const isAdmin = isAdminEmail(user.email);

    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      phoneNumber: user.phoneNumber ?? null,
      trialEndsAt: user.trialEndsAt ?? null,
      isPremiumUser,
      isAdmin,
    };
  }

  @Post('logout')
  logout() {
    return { message: 'OK' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changePassword(
    @Req() req: { user: { id: number } },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
    return { message: '비밀번호가 변경되었습니다.' };
  }

  // ── Backward-compatible aliases ────────────────────────────────────────
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
