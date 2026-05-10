import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { UserConsent } from '../entities/user-consent.entity';
import { PhoneVerification } from '../entities/phone-verification.entity';
import { SmsProvider } from './sms/sms-provider.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { PhoneSendDto } from './dto/phone-send.dto';
import { PhoneVerifyDto } from './dto/phone-verify.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { ConsentDto } from './dto/consent.dto';

const TERMS_VERSION = '2026-04-01';
const PRIVACY_VERSION = '2026-04-01';
const RISK_DISCLAIMER_VERSION = '2026-04-01';
const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SEND_PER_WINDOW = 3;
const SEND_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly BLOCKLIST = [
    '123456', '1234567', '12345678', '123456789', '1234567890',
    '0987654321', 'password', 'passw0rd', 'qwerty', 'qwertyuiop',
    'admin', 'test', '000000', '111111', 'aaaaaa', 'abcdef',
  ];

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserConsent)
    private readonly consentRepo: Repository<UserConsent>,
    @InjectRepository(PhoneVerification)
    private readonly pvRepo: Repository<PhoneVerification>,
    private readonly jwtService: JwtService,
    @Inject('SMS_PROVIDER') private readonly smsProvider: SmsProvider,
  ) {}

  // ── Google ──────────────────────────────────────────────────────────
  async googleSignIn(dto: GoogleAuthDto) {
    const gUser = await this.fetchGoogleUser(dto.googleAccessToken);
    const { sub: googleId, email, name: googleName } = gUser;

    let user = await this.userRepo.findOne({ where: { googleId } });
    if (!user && email) {
      user = await this.userRepo.findOne({ where: { email } });
    }

    if (user) {
      if (!user.googleId) { user.googleId = googleId; await this.userRepo.save(user); }
      return this.issueToken(user);
    }

    if (!dto.consents) {
      return {
        needsConsent: true as const,
        pendingToken: this.issuePendingToken({ googleId, email, name: dto.name ?? googleName }),
        profile: { name: dto.name ?? googleName ?? null, email: email ?? null },
      };
    }

    return this.createUserFromOAuth({ googleId, email, name: dto.name ?? googleName }, dto.consents);
  }

  // ── Email ────────────────────────────────────────────────────────────
  async emailSignUp(dto: RegisterDto) {
    this.validateConsents(dto);
    const email = dto.email.trim().toLowerCase();
    this.validatePassword(dto.password, email);

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      if (existing.googleId) {
        throw new BadRequestException('Google로 가입된 이메일입니다. Google로 계속해주세요.');
      }
      if (existing.passwordHash) {
        throw new BadRequestException('이미 이메일로 가입된 계정입니다. 로그인해주세요.');
      }
      throw new BadRequestException('이미 가입된 이메일입니다. 기존 로그인 방식으로 로그인해주세요.');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const user = this.userRepo.create({
      name: dto.name,
      email,
      passwordHash: await bcrypt.hash(dto.password, AuthService.SALT_ROUNDS),
      trialEndsAt,
    });
    const saved = await this.userRepo.save(user);
    await this.saveConsent(saved.id, dto);
    return this.issueToken(saved);
  }

  async emailLogin(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    return this.issueToken(user);
  }

  // ── Phone ────────────────────────────────────────────────────────────
  async sendPhoneCode(dto: PhoneSendDto) {
    const { phoneNumber } = dto;
    const count = await this.pvRepo.count({
      where: { phoneNumber, createdAt: MoreThan(new Date(Date.now() - SEND_WINDOW_MS)) },
    });
    if (count >= MAX_SEND_PER_WINDOW) {
      throw new BadRequestException('잠시 후 다시 시도해주세요 (10분 후 재시도 가능)');
    }

    const code = process.env.NODE_ENV === 'production'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    await this.pvRepo.save(
      this.pvRepo.create({
        phoneNumber,
        codeHash: await bcrypt.hash(code, 8),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      }),
    );
    await this.smsProvider.sendCode(phoneNumber, code);
    return { message: '인증번호가 발송되었습니다' };
  }

  async verifyPhoneCode(dto: PhoneVerifyDto) {
    const { phoneNumber, code } = dto;
    const record = await this.pvRepo.findOne({
      where: { phoneNumber, verifiedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('인증번호가 만료되었습니다. 다시 요청해주세요');
    }
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('인증 시도 횟수를 초과했습니다. 다시 요청해주세요');
    }

    record.attempts += 1;
    const match = await bcrypt.compare(code, record.codeHash);
    if (!match) {
      await this.pvRepo.save(record);
      throw new BadRequestException('인증번호가 올바르지 않습니다');
    }
    record.verifiedAt = new Date();
    await this.pvRepo.save(record);

    const user = await this.userRepo.findOne({ where: { phoneNumber } });
    if (user) {
      user.phoneVerified = true;
      await this.userRepo.save(user);
      return this.issueToken(user);
    }

    if (!dto.consents) {
      return {
        needsConsent: true as const,
        pendingToken: this.issuePendingToken({ phoneNumber, name: dto.name }),
        profile: { phoneNumber },
      };
    }

    return this.createUserFromOAuth({ phoneNumber, name: dto.name }, dto.consents);
  }

  // ── Complete signup (pending → full user) ────────────────────────────
  async completeSignup(dto: CompleteSignupDto) {
    let payload: { type: string; googleId?: string; phoneNumber?: string; email?: string; name?: string };
    try {
      payload = this.jwtService.verify(dto.pendingToken);
    } catch {
      throw new UnauthorizedException('만료된 세션입니다. 처음부터 다시 시도해주세요');
    }
    if (payload.type !== 'pending') throw new UnauthorizedException('유효하지 않은 토큰입니다');
    this.validateConsents(dto.consents);

    if (payload.googleId) {
      const existing = await this.userRepo.findOne({ where: { googleId: payload.googleId } });
      if (existing) return this.issueToken(existing);
    }
    if (payload.phoneNumber) {
      const existing = await this.userRepo.findOne({ where: { phoneNumber: payload.phoneNumber } });
      if (existing) {
        existing.phoneVerified = true;
        await this.userRepo.save(existing);
        return this.issueToken(existing);
      }
    }

    return this.createUserFromOAuth(
      { googleId: payload.googleId, phoneNumber: payload.phoneNumber, email: payload.email, name: dto.name ?? payload.name },
      dto.consents,
    );
  }

  // ── Misc ─────────────────────────────────────────────────────────────
  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    return user;
  }

  async updateProfile(
    userId: number,
    dto: { investorStyle?: string; marketPref?: string; productPref?: string },
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    if (dto.investorStyle !== undefined) user.investorStyle = dto.investorStyle;
    if (dto.marketPref !== undefined) user.marketPref = dto.marketPref;
    if (dto.productPref !== undefined) user.productPref = dto.productPref;
    await this.userRepo.save(user);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    if (!user.passwordHash) throw new BadRequestException('이 계정은 비밀번호 로그인을 지원하지 않습니다.');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    this.validatePassword(newPassword);
    user.passwordHash = await bcrypt.hash(newPassword, AuthService.SALT_ROUNDS);
    await this.userRepo.save(user);
  }

  // Keep old endpoints working
  async register(dto: RegisterDto) { return this.emailSignUp(dto); }
  async login(dto: LoginDto) { return this.emailLogin(dto); }

  // ── Private helpers ───────────────────────────────────────────────────
  private async createUserFromOAuth(
    data: { googleId?: string; phoneNumber?: string; email?: string | null; name?: string | null },
    consents: ConsentDto,
  ) {
    this.validateConsents(consents);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const user = this.userRepo.create({
      name: data.name ?? null,
      email: data.email ?? null,
      googleId: data.googleId ?? null,
      phoneNumber: data.phoneNumber ?? null,
      phoneVerified: !!data.phoneNumber,
      trialEndsAt,
    });
    const saved = await this.userRepo.save(user);
    await this.saveConsent(saved.id, consents);
    return this.issueToken(saved);
  }

  private validatePassword(password: string, email?: string): void {
    if (password.length < 10) {
      throw new BadRequestException(
        '비밀번호는 10자 이상이며, 문자/숫자/특수문자 중 2가지 이상을 포함해야 합니다.',
      );
    }

    const hasUpper   = /[A-Z]/.test(password);
    const hasLower   = /[a-z]/.test(password);
    const hasNumber  = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(password);
    if ([hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length < 2) {
      throw new BadRequestException(
        '비밀번호는 10자 이상이며, 문자/숫자/특수문자 중 2가지 이상을 포함해야 합니다.',
      );
    }

    const lower = password.toLowerCase();
    if (AuthService.BLOCKLIST.some((p) => p.length >= 6 && lower.includes(p))) {
      throw new BadRequestException('너무 단순하거나 자주 사용되는 비밀번호입니다.');
    }

    if (/(.)\1{4,}/.test(password)) {
      throw new BadRequestException('같은 문자를 5번 이상 반복할 수 없습니다.');
    }

    if (email) {
      const localPart = email.split('@')[0].toLowerCase();
      if (localPart.length >= 3 && lower.includes(localPart)) {
        throw new BadRequestException('비밀번호에 이메일 아이디를 포함할 수 없습니다.');
      }
    }
  }

  private validateConsents(c: { agreeToTerms: boolean; agreeToPrivacy: boolean; agreeToRiskDisclaimer: boolean }) {
    if (!c.agreeToTerms) throw new BadRequestException('이용약관에 동의해야 합니다');
    if (!c.agreeToPrivacy) throw new BadRequestException('개인정보 수집 및 이용에 동의해야 합니다');
    if (!c.agreeToRiskDisclaimer) throw new BadRequestException('투자 유의사항에 동의해야 합니다');
  }

  private async saveConsent(userId: number, c: { agreeToTerms: boolean; agreeToPrivacy: boolean; agreeToRiskDisclaimer: boolean; agreeToMarketing?: boolean }) {
    const now = new Date();
    await this.consentRepo.save(
      this.consentRepo.create({
        userId,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        riskDisclaimerVersion: RISK_DISCLAIMER_VERSION,
        marketingConsent: c.agreeToMarketing ?? false,
        agreedToTermsAt: now,
        agreedToPrivacyAt: now,
        agreedToRiskDisclaimerAt: now,
        agreedToMarketingAt: c.agreeToMarketing ? now : null,
      }),
    );
  }

  private issuePendingToken(data: { googleId?: string; phoneNumber?: string; email?: string | null; name?: string | null }) {
    return this.jwtService.sign({ type: 'pending', ...data }, { expiresIn: '15m' });
  }

  private issueToken(user: User) {
    const payload = { sub: user.id, email: user.email ?? user.phoneNumber };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        phoneNumber: user.phoneNumber ?? null,
        trialEndsAt: user.trialEndsAt ?? null,
      },
    };
  }

  private async fetchGoogleUser(accessToken: string): Promise<{ sub: string; email?: string; name?: string }> {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
    if (!res.ok) throw new UnauthorizedException('유효하지 않은 Google 토큰입니다');
    return res.json() as Promise<{ sub: string; email?: string; name?: string }>;
  }
}
