import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  getVapidKey() {
    return { key: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  async subscribe(
    @Req() req: any,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.pushService.subscribe(req.user.id, body.endpoint, body.keys);
    return { ok: true };
  }

  @Delete('unsubscribe')
  async unsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    await this.pushService.unsubscribe(req.user.id, body.endpoint);
    return { ok: true };
  }

  @Post('test')
  async testPush(@Req() req: any) {
    await this.pushService.sendToUser(
      req.user.id,
      '알림 테스트',
      '브라우저 알림이 정상 작동합니다! 포트폴리오에 변화가 생기면 이렇게 알려드려요.',
      { eventType: 'test', portfolioId: null, severity: 'info' },
    );
    return { ok: true };
  }
}
