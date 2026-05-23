import {
  Body,
  Controller,
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
import { isAdminEmail } from '../admin/admin-email.helper';
import { ContentRadarService } from './content-radar.service';
import { PromoScriptService, PromoScriptRequest } from './promo-script.service';

@Controller('admin/content-radar')
@UseGuards(JwtAuthGuard)
export class ContentRadarController {
  constructor(
    private readonly contentRadarService: ContentRadarService,
    private readonly promoScriptService: PromoScriptService,
  ) {}

  private requireAdmin(email: string | null | undefined): void {
    if (!isAdminEmail(email)) throw new ForbiddenException('Admin only');
  }

  @Get('today')
  async getToday(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.contentRadarService.getTodayItems();
  }

  @Post('refresh')
  async refresh(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.contentRadarService.triggerRefresh();
  }

  @Post('force-refresh')
  async forceRefresh(@Req() req: { user: { email: string } }) {
    this.requireAdmin(req.user.email);
    return this.contentRadarService.triggerForceRefresh();
  }

  @Post('promo-scripts')
  async generatePromoScript(
    @Req() req: { user: { email: string } },
    @Body() body: PromoScriptRequest,
  ) {
    this.requireAdmin(req.user.email);
    const VALID_TYPES = new Set(['hook', 'before-after', 'feature', 'education', 'empathy']);
    const VALID_FEATURES = new Set(['rebalancing', 'risk-analysis', 'content-radar', 'portfolio']);
    if (!VALID_TYPES.has(body.type)) throw new ForbiddenException('Invalid type');
    if (!VALID_FEATURES.has(body.featureFocus)) throw new ForbiddenException('Invalid featureFocus');
    return this.promoScriptService.generatePromoScript(body);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: { user: { email: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'new' | 'used' | 'ignored' },
  ) {
    this.requireAdmin(req.user.email);
    const VALID_STATUSES = new Set(['new', 'used', 'ignored']);
    if (!VALID_STATUSES.has(body.status)) {
      throw new ForbiddenException('Invalid status value');
    }
    const updated = await this.contentRadarService.updateStatus(id, body.status);
    if (!updated) return { message: 'Not found' };
    return updated;
  }
}
