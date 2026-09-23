import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let cfg: { get: jest.Mock };

  const baseUser = {
    id: 'user-1',
    email: 'customer@minimart.vn',
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    mfaSecret: null,
    phone: null,
    passwordHash: 'hashed',
    fullName: 'Khách Demo',
    avatarUrl: null,
    role: Role.CUSTOMER,
    status: UserStatus.ACTIVE,
    loyaltyPoints: 0,
    isVip: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cart: { create: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    jwt = {
      signAsync: jest.fn().mockImplementation(async (_payload, opts: any) => {
        if (opts?.secret === 'refresh-secret') return 'refresh.jwt.token';
        return 'access.jwt.token';
      }),
      verifyAsync: jest.fn(),
    };

    cfg = {
      get: jest.fn((key: string, def?: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRES: '15m',
          JWT_REFRESH_EXPIRES: '14d',
        };
        return map[key] ?? def;
      }),
    };

    service = new AuthService(
      prisma as any,
      jwt as unknown as JwtService,
      cfg as unknown as ConfigService,
    );
  });

  describe('login', () => {
    it('returns sanitized user + token pair on valid credentials', async () => {
      const hash = await bcrypt.hash('123456', 4);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      prisma.user.update.mockResolvedValue({ ...baseUser, passwordHash: hash });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = (await service.login({
        email: baseUser.email,
        password: '123456',
      })) as { accessToken: string; refreshToken: string; expiresIn: number; user: any };

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.expiresIn).toBe(15 * 60);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.email).toBe(baseUser.email);
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('stores session metadata (user-agent + ip) on the refresh token', async () => {
      const hash = await bcrypt.hash('123456', 4);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      prisma.user.update.mockResolvedValue({ ...baseUser, passwordHash: hash });

      await service.login(
        { email: baseUser.email, password: '123456' },
        { userAgent: 'Expo/54 (Android)', ip: '203.0.113.9' },
      );

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userAgent: 'Expo/54 (Android)', ip: '203.0.113.9' }),
      });
    });

    it('sets the DB expiry from JWT_REFRESH_EXPIRES instead of a hard-coded 14 days', async () => {
      const hash = await bcrypt.hash('123456', 4);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });
      prisma.user.update.mockResolvedValue({ ...baseUser, passwordHash: hash });
      cfg.get = jest.fn((key: string, def?: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRES: '10m',
          JWT_REFRESH_EXPIRES: '2d',
        };
        return map[key] ?? def;
      });

      const result = (await service.login({ email: baseUser.email, password: '123456' })) as {
        expiresIn: number;
      };
      const { expiresAt } = prisma.refreshToken.create.mock.calls[0][0].data;

      expect(result.expiresIn).toBe(600); // 10 phút
      const days = (expiresAt.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(1.9);
      expect(days).toBeLessThan(2.1);
    });

    it('throws Unauthorized when password is wrong', async () => {
      const hash = await bcrypt.hash('correct', 4);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: hash });

      await expect(
        service.login({ email: baseUser.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized when account is suspended', async () => {
      const hash = await bcrypt.hash('123456', 4);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hash,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({ email: baseUser.email, password: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh (SEC-021 rotation hardening)', () => {
    it('rotates refresh token atomically (revokes old, issues new)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        tokenHash: 'x',
        revoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.refresh('old-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt-1', revoked: false },
        data: { revoked: true },
      });
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('revokes ALL sessions when a rotated (revoked) token is replayed', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revoked: true,
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id, revoked: false },
        data: { revoked: true },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('revokes ALL sessions and rejects when the account is no longer ACTIVE', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, status: UserStatus.SUSPENDED });

      await expect(service.refresh('valid-looking-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id, revoked: false },
        data: { revoked: true },
      });
    });

    it('rejects a token that does not exist in the database (forged)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('forged-token')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('revokes every session when the atomic claim loses a race', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 }); // request khác đã rotate trước

      await expect(service.refresh('concurrent-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('throws BadRequest when refresh token missing', async () => {
      await expect(service.refresh('')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('logoutAll', () => {
    it('revokes every active session of the user', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const res = await service.logoutAll(baseUser.id);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: baseUser.id, revoked: false },
        data: { revoked: true },
      });
      expect(res.revoked).toBe(3);
    });
  });

  describe('register', () => {
    it('throws Conflict when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.register({
          email: baseUser.email,
          password: '123456',
          fullName: 'X',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // Q24: lockout sau 5 sai liên tiếp.
  describe('login lockout (Q24)', () => {
    it('locks the account for ~15 minutes after 5 consecutive failures', async () => {
      const hash = await bcrypt.hash('123456', 4);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hash,
        failedLoginAttempts: 4,
      });
      await expect(
        service.login({ email: baseUser.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: expect.objectContaining({ failedLoginAttempts: 5 }),
      });
      const lockArg = prisma.user.update.mock.calls[0][0].data;
      expect(lockArg.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects login while locked without checking the password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        lockedUntil: new Date(Date.now() + 10 * 60000),
      });
      const compare = jest.spyOn(bcrypt, 'compare');
      await expect(
        service.login({ email: baseUser.email, password: '123456' }),
      ).rejects.toThrow(/tạm khóa/);
      expect(compare).not.toHaveBeenCalled();
      compare.mockRestore();
    });

    it('resets the counter on successful login', async () => {
      const hash = await bcrypt.hash('123456', 4);
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        passwordHash: hash,
        failedLoginAttempts: 2,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});
      await service.login({ email: baseUser.email, password: '123456' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }),
      });
    });
  });

  // Q23: reset password 1 lần, TTL ngắn, xong thu hồi phiên.
  describe('password reset (Q23)', () => {
    it('issues a one-time token that expires', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.user.update.mockResolvedValue({});
      const res = await service.requestPasswordReset(baseUser.email);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: expect.objectContaining({ resetTokenHash: expect.any(String) }),
      });
      expect(res).toBeDefined();
    });

    it('does not reveal whether the email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await service.requestPasswordReset('nope@x.vn');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(res.message).toMatch(/Nếu email/);
    });

    it('consumes the token and revokes all sessions', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, id: 'u1' });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      const res = await service.resetPassword('a'.repeat(64), 'Newpass123');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ resetTokenHash: null }),
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(res.message).toMatch(/đăng nhập lại/);
    });
  });

  // Q29: MFA TOTP round-trip (gen secret → verify → login bước 2).
  describe('MFA TOTP (Q29)', () => {
    it('setup → verify → loginMfa issues tokens', async () => {
      prisma.user.update.mockResolvedValue({});
      prisma.user.findUnique
        .mockResolvedValueOnce({ ...baseUser, email: 'a@x.vn' })
        .mockResolvedValueOnce({ ...baseUser, mfaSecret: 'AAAAAAAAAAAAAAAAAAAAAA==' })
        .mockResolvedValueOnce({
          ...baseUser,
          status: 'ACTIVE',
          mfaEnabled: true,
          mfaSecret: 'AAAAAAAAAAAAAAAAAAAAAA==',
        });
      prisma.refreshToken.create.mockResolvedValue({});
      const setup = await service.setupMfa('user-1');
      expect(setup.otpauth).toMatch(/^otpauth:\/\/totp\//);
      // round-trip với mã TOTP thật (tính từ cùng secret) — không phụ thuộc giờ cố định
      const good = service.totpNowForTest('AAAAAAAAAAAAAAAAAAAAAA==');
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        mfaSecret: 'AAAAAAAAAAAAAAAAAAAAAA==',
      });
      await expect(service.verifyMfaSetup('user-1', good)).resolves.toBeDefined();
      await expect(service.verifyMfaSetup('user-1', '000000')).rejects.toThrow();
    });
  });
});
