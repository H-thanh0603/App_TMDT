import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Ép @nestjs/passport v12 mixin bỏ constructor param `AuthModuleOptions`.
 *
 * Passport v12 biên dịch constructor `constructor(options?)` kèm
 * `@Optional() @Inject(AuthModuleOptions)` trên property + param. Khi guard
 * con khai báo constructor riêng (vd `constructor(private reflector)`), TS emit
 * `design:paramtypes = [Reflector]`, nhưng metadata param-decorator của mixin
 * vẫn còn → Nest 12 cố resolve `AuthModuleOptions` ở index 0 và nổ
 * UnknownDependenciesException khi boot (dù @Optional, vì provider không tồn tại
 * trong module con). Ghi đè metadata về constructor không tham số là đủ vì
 * guard luôn gọi `super()` không options.
 */
function stripPassportOptionsParam(target: object): void {
  // CHỈ xóa metadata param-decorator của passport mixin ('self:paramtypes' /
  // 'self:parameters'), GIỮ NGUYÊN 'design:paramtypes' (Nest cần để inject Reflector/JwtService).
  // Lỗi cũ: defineMetadata('design:paramtypes', []) xóa luôn deps thật → reflector undefined.
  try {
    Reflect.defineMetadata('self:paramtypes', [], target);
    Reflect.defineMetadata('self:parameters', [], target);
  } catch {
    /* best-effort */
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
stripPassportOptionsParam(JwtAuthGuard);

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Chỉ inject ConfigService (global) — tự tạo JwtService nội bộ để không đòi
  // JwtModule ở module con (Categories/Products không import JwtModule).
  private readonly jwt: JwtService;
  constructor(private readonly cfg: ConfigService) {
    super();
    this.jwt = new JwtService({});
  }

  /**
   * Guard xác thực "mềm": có Bearer token hợp lệ → gắn `req.user`; không có/không hợp lệ
   * → vẫn cho qua với `req.user = undefined`.
   *
   * Tự verify JWT thay vì đi qua passport (tránh phụ thuộc PassportModule ở module con):
   * payload { sub, email, role } — khớp JwtStrategy.validate (chỉ tin token còn hạn + đúng secret).
   * Trạng thái ACTIVE được kiểm tra lại ở service layer khi cần (giữ route public nhanh).
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = String(req.headers?.authorization ?? '');
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      req.user = undefined;
      return true;
    }
    try {
      const secret = this.cfg.get<string>('JWT_ACCESS_SECRET');
      if (!secret) throw new UnauthorizedException();
      const payload = await this.jwt.verifyAsync(token, { secret });
      req.user = { sub: payload.sub, email: payload.email, role: payload.role };
    } catch {
      req.user = undefined;
    }
    return true;
  }
}
// (Không strip metadata của OptionalJwtAuthGuard — constructor (cfg) thật,
// Nest inject ConfigService global bình thường.)
