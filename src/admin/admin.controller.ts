import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService, BillingMode } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdmin(email: string) {
    if (email !== process.env.ADMIN_EMAIL) {
      throw new ForbiddenException('Admin only');
    }
  }

  @Get('settings/billing-mode')
  async getBillingMode(@Req() req: { user: { email: string } }) {
    this.checkAdmin(req.user.email);
    const mode = await this.adminService.getBillingMode();
    return { mode };
  }

  @Patch('settings/billing-mode')
  async setBillingMode(
    @Req() req: { user: { email: string } },
    @Body() body: { mode: BillingMode },
  ) {
    this.checkAdmin(req.user.email);
    await this.adminService.setBillingMode(body.mode);
    return { mode: body.mode };
  }
}
