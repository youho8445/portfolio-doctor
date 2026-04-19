import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: { user: { id: number; email: string } }) {
    const user = await this.authService.findById(req.user.id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      trialEndsAt: user.trialEndsAt ?? null,
    };
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
}
