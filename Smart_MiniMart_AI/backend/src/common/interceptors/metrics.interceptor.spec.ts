import { ExecutionContext, CallHandler } from '@nestjs/common';
import { EventEmitter } from 'events';
import { of, lastValueFrom } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';

function makeCtx(statusCode = 200, requestId?: string) {
  const req: any = { method: 'GET', url: '/api/v1/products?page=1', path: '/api/v1/products', requestId };
  const res: any = new EventEmitter();
  res.statusCode = statusCode;
  return { ctx: { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as unknown as ExecutionContext, res };
}

function handler(value: any): CallHandler {
  return { handle: () => of(value) };
}

describe('MetricsInterceptor (Q141)', () => {
  it('emits one structured http_request log with route/status/duration', async () => {
    const interceptor = new MetricsInterceptor();
    const spy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation(() => undefined);
    const { ctx, res } = makeCtx(201, 'rid-1');

    const out = await lastValueFrom(interceptor.intercept(ctx, handler({ ok: 1 })));
    res.emit('finish');

    expect(out).toEqual({ ok: 1 }); // không đổi payload
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      event: 'http_request',
      method: 'GET',
      route: '/api/v1/products',
      status: 201,
      requestId: 'rid-1',
    });
    expect(typeof payload.durationMs).toBe('number');
  });

  it('logs final status set by the exception filter and null requestId', async () => {
    const interceptor = new MetricsInterceptor();
    const spy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation(() => undefined);
    const { ctx, res } = makeCtx(200);

    await lastValueFrom(interceptor.intercept(ctx, handler(null)));
    res.statusCode = 404; // exception filter chạy sau interceptor
    res.emit('finish');

    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.status).toBe(404);
    expect(payload.route).toBe('/api/v1/products');
    expect(payload.requestId).toBeNull();
  });
});
