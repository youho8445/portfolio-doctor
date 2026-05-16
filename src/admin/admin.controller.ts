import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService, BillingMode } from './admin.service';
import { PriceFetchService } from './price-fetch.service';
import { isAdminEmail } from './admin-email.helper';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly priceFetchService: PriceFetchService,
  ) {}

  private requireAdmin(email: string | null | undefined): void {
    if (!isAdminEmail(email)) throw new ForbiddenException('Admin only');
  }

  @Get('settings/billing-mode')
  async getBillingMode(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    const mode = await this.adminService.getBillingMode();
    return { mode };
  }

  @Patch('settings/billing-mode')
  async setBillingMode(
    @Req() req: { user: { email: string } },
    @Body() body: { mode: BillingMode },
  ) {
    this.requireAdmin(req.user.email);
    await this.adminService.setBillingMode(body.mode);
    return { mode: body.mode };
  }

  // ── 유저 관리 ─────────────────────────────────────────────────────────────

  @Get('users')
  async getUsers(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.adminService.getUsers();
  }

  @Patch('users/:id/password')
  async changePassword(
    @Req() req: { user: { email: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password: string },
  ) {
    this.requireAdmin(req.user.email);
    await this.adminService.changeUserPassword(id, body.password);
    return { message: '비밀번호가 변경되었습니다.' };
  }

  @Post('users/:id/trial')
  async grantTrial(
    @Req() req: { user: { email: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { days?: number },
  ) {
    this.requireAdmin(req.user.email);
    await this.adminService.grantTrial(id, body.days ?? 30);
    return { message: `트라이얼 ${body.days ?? 30}일 부여 완료` };
  }

  @Delete('users/:id/trial')
  async revokeTrial(
    @Req() req: { user: { email: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.requireAdmin(req.user.email);
    await this.adminService.revokeTrial(id);
    return { message: '트라이얼 해제 완료' };
  }

  @Delete('users/:id')
  async deleteUser(
    @Req() req: { user: { email: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.requireAdmin(req.user.email);
    await this.adminService.deleteUser(id);
    return { message: '유저가 삭제되었습니다.' };
  }

  // ── 가격 데이터 수집 ──────────────────────────────────────────────────────

  @Get('prices/status')
  async getPriceFetchStatus(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.priceFetchService.getStatus();
  }

  @Post('prices/run')
  async runPriceFetch(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    // 비동기로 시작하고 즉시 응답 (오래 걸리므로)
    void this.priceFetchService.runFetch();
    return { message: '데이터 수집을 시작했습니다.' };
  }

  // ── 페이지 트래픽 ──────────────────────────────────────────────────────────

  @Get('analytics/page-traffic')
  async getPageTrafficStats(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.adminService.getPageTrafficStats();
  }

  // ── 전환 퍼널 (숨김 — 데이터 보존) ──────────────────────────────────────────

  @Get('analytics/conversion')
  async getConversionStats(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.adminService.getConversionStats();
  }
}
