import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role, User } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { parseDurationSeconds } from '@/common/utils/duration';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Metadata phiên đăng nhập (audit + phát hiện token bị đánh cắp). */
export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

const DEFAULT_ACCESS_SECONDS = 15 * 60;
const DEFAULT_REFRESH_SECONDS = 14 * 86_400;

// Q24: 5 sai liên tiếp → khóa 15 phút; exponential nhẹ theo số lần (max 2h).
const MAX_FAILED_BEFORE_LOCK = 5;
const BASE_LOCK_SECONDS = 15 * 60;
const MAX_LOCK_SECONDS = 2 * 60 * 60;

// Q23: reset token 1 lần, TTL 30 phút.
const RESET_TTL_SECONDS = 30 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta = {}) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã được đăng ký');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        fullName: dto.fullName,
        role: Role.CUSTOMER,
      },
    });

    await this.prisma.cart.create({ data: { userId: user.id } });
    const tokens = await this.issueTokens(user, meta);
    // Q64: không log email/PII — chỉ log id + role để audit.
    this.logger.log(`Registered user id=${user.id} role=${user.role}`);
    return { user: this.sanitize(user), ...tokens };
  }

  // Q24: login có lockout — sai 5 lần liên tiếp khóa 15p (tăng dần, max 2h).
  // Không tiết lộ "email đúng/mật khẩu sai": mọi thất bại trả cùng message.
  async login(dto: LoginDto, meta: SessionMeta = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Tài khoản đã bị khóa');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
      throw new UnauthorizedException(`Tài khoản tạm khóa ~${mins} phút do đăng nhập sai nhiều lần`);
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.recordFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // MFA bật (admin/privileged): mật khẩu đúng mới chỉ xong bước 1.
    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        userId: user.id,
        message: 'Nhập mã xác thực 6 số từ app Authenticator',
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokens = await this.issueTokens(user, meta);
    return { user: this.sanitize(user), ...tokens };
  }

  private async recordFailedLogin(userId: string, prevFails: number): Promise<void> {
    const fails = prevFails + 1;
    if (fails >= MAX_FAILED_BEFORE_LOCK) {
      const lockSeconds = Math.min(
        BASE_LOCK_SECONDS * 2 ** (fails - MAX_FAILED_BEFORE_LOCK),
        MAX_LOCK_SECONDS,
      );
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: fails,
          lockedUntil: new Date(Date.now() + lockSeconds * 1000),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: fails },
      });
    }
  }

  // Q23: xin reset — luôn trả OK (không lộ email có tồn tại), token 1 lần TTL 30p.
  // Gửi token qua mail/SMTP của shop (chưa cấu hình mailer → trả resetId để job gửi sau).
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: this.hash(raw),
          resetExpiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000),
        },
      });
      // TODO(mailer Q156): gửi `raw` qua email thay vì log. Hiện log id để test/dev.
      this.logger.log(`Password reset requested id=${user.id}`);
      if (process.env.NODE_ENV !== 'production') return { message: 'OK', debugToken: raw };
    }
    return { message: 'Nếu email tồn tại, hướng dẫn đặt lại đã được gửi' };
  }

  // Q23: đổi bằng token — xong thì thu hồi mọi phiên (đổi pass = logout mọi thiết bị).
  async resetPassword(rawToken: string, newPassword: string) {
    if (!/^\d{8,}$/.test(newPassword) && newPassword.length < 8)
      throw new BadRequestException('Mật khẩu tối thiểu 8 ký tự');
    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword))
      throw new BadRequestException('Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số');
    const tokenHash = this.hash(rawToken);
    const user = await this.prisma.user.findFirst({
      where: { resetTokenHash: tokenHash, resetExpiresAt: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('Link đặt lại không hợp lệ hoặc đã hết hạn');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        resetTokenHash: null,
        resetExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.revokeAllSessions(user.id);
    return { message: 'Đã đặt lại mật khẩu. Hãy đăng nhập lại trên mọi thiết bị' };
  }

  // Q29: bật MFA TOTP (admin nên bật) — trả otpauth:// để quét QR + 1 recovery code.
  async setupMfa(userId: string) {
    const secret = crypto.randomBytes(20).toString('base64url');
    const recovery = crypto.randomBytes(8).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaRecoveryHash: this.hash(recovery) },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const otpauth = `otpauth://totp/SmartMiniMart:${user?.email ?? userId}?secret=${secret}&issuer=SmartMiniMart&digits=6&period=30`;
    return { otpauth, recoveryCode: recovery, note: 'Lưu recovery code — dùng 1 lần khi mất máy' };
  }

  async verifyMfaSetup(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('Chưa setup MFA');
    if (!this.verifyTotp(user.mfaSecret, code)) throw new BadRequestException('Mã MFA sai');
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { message: 'Đã bật MFA' };
  }

  // Q29 bước 2: mật khẩu đúng + mã TOTP/recovery → token.
  async loginMfa(userId: string, code: string, meta: SessionMeta = {}) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Tài khoản không hợp lệ');
    let ok = user.mfaSecret ? this.verifyTotp(user.mfaSecret, code) : false;
    if (!ok && user.mfaRecoveryHash && this.hash(code) === user.mfaRecoveryHash) {
      ok = true; // recovery dùng 1 lần → tắt MFA, bắt setup lại
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryHash: null },
      });
    }
    if (!ok) throw new UnauthorizedException('Mã xác thực sai');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
    const tokens = await this.issueTokens(user, meta);
    return { user: this.sanitize(user), ...tokens };
  }

  async disableMfa(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryHash: null },
    });
    return { message: 'Đã tắt MFA' };
  }

  // TOTP RFC6238 (SHA1, 30s, ±1 window) — không thêm dep, stdlib crypto đủ.
  /** Sinh mã hiện tại (chỉ dùng cho test nội bộ, không gọi ở prod). */
  totpNowForTest(secretB64: string): string {
    const key = Buffer.from(secretB64, 'base64url');
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const h = crypto.createHmac('sha1', key).update(msg).digest();
    const o = h[h.length - 1] & 0x0f;
    const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    return String(n % 1000000).padStart(6, '0');
  }

  private verifyTotp(secretB64: string, code: string, window = 1): boolean {
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) return false;
    const key = Buffer.from(secretB64, 'base64url');
    const now = Math.floor(Date.now() / 30000);
    for (let t = now - window; t <= now + window; t++) {
      const msg = Buffer.alloc(8);
      msg.writeBigUInt64BE(BigInt(t));
      const h = crypto.createHmac('sha1', key).update(msg).digest();
      const o = h[h.length - 1] & 0x0f;
      const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
      if (String(n % 1000000).padStart(6, '0') === digits) return true;
    }
    return false;
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revoked: false },
      data: { revoked: true },
    });
    return { message: 'Đăng xuất thành công' };
  }

  /** Thu hồi TOÀN BỘ phiên của user (khi nghi ngờ lộ token / muốn đăng xuất mọi thiết bị). */
  async logoutAll(userId: string) {
    const revoked = await this.revokeAllSessions(userId);
    return { message: 'Đã đăng xuất khỏi tất cả thiết bị', revoked };
  }

  async refresh(refreshToken: string, meta: SessionMeta = {}): Promise<TokenPair> {
    if (!refreshToken) throw new BadRequestException('Thiếu refresh token');

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    // Không có trong DB → token giả mạo hoặc đã bị xoá; không có phiên nào để thu hồi.
    if (!stored) throw new UnauthorizedException('Refresh token không hợp lệ');

    // Token bị dùng lại sau khi đã rotate (hoặc không thuộc user trong payload) →
    // dấu hiệu bị đánh cắp: thu hồi MỌI phiên của user (SEC-021).
    if (stored.revoked || stored.userId !== payload.sub) {
      await this.revokeAllSessions(stored.userId);
      this.logger.warn(
        `Refresh token reuse detected (user=${stored.userId}) — đã thu hồi mọi phiên`,
      );
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } }).catch(() => undefined);
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    // Tài khoản bị khoá phải mất hiệu lực NGAY, không chờ access token hết hạn.
    if (user.status !== 'ACTIVE') {
      await this.revokeAllSessions(user.id);
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // Rotate NGUYÊN TỬ: chỉ 1 request thắng; request song song thứ 2 (replay) thất bại.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revoked: false },
      data: { revoked: true },
    });
    if (claimed.count === 0) {
      await this.revokeAllSessions(user.id);
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    return this.issueTokens(user, meta);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  // ========== Private helpers ==========

  private async issueTokens(user: User, meta: SessionMeta = {}): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessSeconds = parseDurationSeconds(
      this.cfg.get<string>('JWT_ACCESS_EXPIRES'),
      DEFAULT_ACCESS_SECONDS,
    );
    const refreshSeconds = parseDurationSeconds(
      this.cfg.get<string>('JWT_REFRESH_EXPIRES'),
      DEFAULT_REFRESH_SECONDS,
    );

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.cfg.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessSeconds,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.cfg.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshSeconds,
    });

    const tokenHash = this.hash(refreshToken);
    // Hạn trong DB PHẢI khớp hạn JWT (trước đây hard-code 14 ngày, bỏ qua env).
    const expiresAt = new Date(Date.now() + refreshSeconds * 1_000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255),
        ip: meta.ip?.slice(0, 64),
      },
    });

    // Dọn refresh token đã hết hạn của chính user (best-effort, không chặn đăng nhập).
    await this.prisma.refreshToken
      .deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } })
      .catch(() => undefined);

    return { accessToken, refreshToken, expiresIn: accessSeconds };
  }

  /** Thu hồi mọi refresh token còn hiệu lực của user. Best-effort: không làm hỏng luồng chính. */
  private async revokeAllSessions(userId: string): Promise<number> {
    try {
      const res = await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
      return res?.count ?? 0;
    } catch {
      return 0;
    }
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitize(user: User & { addresses?: unknown[] }) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
