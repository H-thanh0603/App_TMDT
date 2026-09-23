import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limit theo DANH TÍNH thay vì chỉ theo IP.
 *
 * Vấn đề trước đây: sau reverse proxy (Render/Nginx) mọi request có cùng `req.ip`,
 * nên hạn mức 100 req/phút bị chia sẻ cho TOÀN BỘ người dùng → vừa dễ DoS vừa
 * chặn nhầm khách thật.
 *
 * Giải pháp: nếu request đã được xác thực (JwtAuthGuard chạy trước nhờ thứ tự
 * APP_GUARD trong AppModule) thì bucket theo `user:<id>`, ngược lại theo `ip:<ip>`.
 * Kèm `TRUST_PROXY` ở main.ts để `req.ip` lấy đúng IP client từ X-Forwarded-For.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req?.user?.sub;
    if (userId) return `user:${userId}`;
    // Q24: login/register/refresh throttle theo email (body) thay vì IP —
    // kẻ dò mật khẩu xoay IP không thoát được, user thật chung IP không bị vạ lây.
    const email = req?.body?.email;
    if (typeof email === 'string' && email.includes('@')) {
      return `email:${email.toLowerCase().slice(0, 160)}`;
    }
    return `ip:${req?.ip ?? req?.socket?.remoteAddress ?? 'unknown'}`;
  }
}
