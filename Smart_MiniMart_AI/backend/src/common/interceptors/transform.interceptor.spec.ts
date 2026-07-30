import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

function ctx(): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

function handler(value: any): CallHandler {
  return { handle: () => of(value) };
}

describe('TransformInterceptor', () => {
  it('wraps response in { success, data, timestamp } by default', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const interceptor = new TransformInterceptor(reflector);

    const out: any = await lastValueFrom(interceptor.intercept(ctx(), handler({ a: 1 })));
    expect(out.success).toBe(true);
    expect(out.data).toEqual({ a: 1 });
    expect(out.timestamp).toBeDefined();
  });

  it('returns raw body when @SkipTransform is set (e.g. VNPay IPN)', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const interceptor = new TransformInterceptor(reflector);

    const raw = { RspCode: '00', Message: 'Confirm Success' };
    const out: any = await lastValueFrom(interceptor.intercept(ctx(), handler(raw)));
    expect(out).toEqual(raw); // không bọc
  });
});
