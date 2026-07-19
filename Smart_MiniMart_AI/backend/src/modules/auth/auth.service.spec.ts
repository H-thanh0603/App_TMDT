import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
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
        create: jest.fn(),
        update: jest.fn(),
      },
      cart: { create: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
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

      const result = await service.login({
        email: baseUser.email,
        password: '123456',
      });

      expect(result.accessToken).toBe('access.jwt.token');
      expect(result.refreshToken).toBe('refresh.jwt.token');
      expect(result.expiresIn).toBe(15 * 60);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.email).toBe(baseUser.email);
      expect(prisma.refreshToken.create).toHaveBeenCalled();
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

  describe('refresh', () => {
    it('rotates refresh token (revokes old, issues new)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        tokenHash: 'x',
        revoked: false,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const tokens = await service.refresh('old-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revoked: true },
      });
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('throws when refresh token was revoked', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: baseUser.id,
        revoked: true,
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws BadRequest when refresh token missing', async () => {
      await expect(service.refresh('')).rejects.toBeInstanceOf(BadRequestException);
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
});
