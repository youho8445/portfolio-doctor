import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { UserConsent } from '../entities/user-consent.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const TERMS_VERSION = '2026-04-01';
const PRIVACY_VERSION = '2026-04-01';
const RISK_DISCLAIMER_VERSION = '2026-04-01';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 필수 동의 항목 서버 검증
    if (!dto.agreeToTerms) {
      throw new BadRequestException('이용약관에 동의해야 회원가입이 가능합니다');
    }
    if (!dto.agreeToPrivacy) {
      throw new BadRequestException('개인정보 수집 및 이용에 동의해야 회원가입이 가능합니다');
    }
    if (!dto.agreeToRiskDisclaimer) {
      throw new BadRequestException('투자 유의사항에 동의해야 회원가입이 가능합니다');
    }

    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('이미 사용 중인 이메일입니다');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      trialEndsAt,
    });
    const saved = await this.userRepository.save(user);

    // 동의 이력 저장
    const now = new Date();
    const consent = this.consentRepository.create({
      userId: saved.id,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      riskDisclaimerVersion: RISK_DISCLAIMER_VERSION,
      marketingConsent: dto.agreeToMarketing ?? false,
      agreedToTermsAt: now,
      agreedToPrivacyAt: now,
      agreedToRiskDisclaimerAt: now,
      agreedToMarketingAt: dto.agreeToMarketing ? now : null,
    });
    await this.consentRepository.save(consent);

    return this.issueToken(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    return this.issueToken(user);
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    return user;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  private issueToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        trialEndsAt: user.trialEndsAt ?? null,
      },
    };
  }
}
