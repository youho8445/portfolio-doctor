import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { PhoneSendDto } from './dto/phone-send.dto';
import { PhoneVerifyDto } from './dto/phone-verify.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    const user = await this.authService.findById(req.user.id);
    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      phoneNumber: user.phoneNumber ?? null,
      trialEndsAt: user.trialEndsAt ?? null,
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

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
