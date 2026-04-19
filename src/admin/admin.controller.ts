import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService, BillingMode } from './admin.service';
import { PriceFetchService } from './price-fetch.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly priceFetchService: PriceFetchService,
  ) {}

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

  // ── 가격 데이터 수집 ──────────────────────────────────────────────────────

  @Get('prices/status')
  async getPriceFetchStatus(@Req() req: { user: { email: string } }) {
    this.checkAdmin(req.user.email);
    return this.priceFetchService.getStatus();
  }

  @Post('prices/run')
  async runPriceFetch(@Req() req: { user: { email: string } }) {
    this.checkAdmin(req.user.email);
    // 비동기로 시작하고 즉시 응답 (오래 걸리므로)
    void this.priceFetchService.runFetch();
    return { message: '데이터 수집을 시작했습니다.' };
  }
}
