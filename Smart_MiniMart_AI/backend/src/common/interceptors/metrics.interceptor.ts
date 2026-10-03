import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

/**
 * Q141: metrics tối thiểu — log structured 1 dòng/request để Render log thu được
 * (latency/status/route). Không cần Prometheus cho free tier.
 * Dùng res 'finish' (không phải tap finalize) vì exception filter set status SAU interceptor,
 * nên chỉ ở finish mới đọc được statusCode cuối (kể cả 4xx/5xx).
 * ponytail: log-based metrics, add Prometheus exporter nếu cần dashboard/alert theo p95.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Metrics');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      // Route pattern (không phải URL thật) → nhóm được, không lộ id/PII.
      const route = (req.route?.path as string | undefined) ?? req.path ?? req.url;
      this.logger.log(
        JSON.stringify({
          event: 'http_request',
          method: req.method,
          route,
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
          requestId: req.requestId ?? null,
        }),
      );
    });

    return next.handle();
  }
}
