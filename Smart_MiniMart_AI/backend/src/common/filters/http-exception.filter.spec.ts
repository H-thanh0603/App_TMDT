import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost(): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/v1/x', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('HttpExceptionFilter (SEC-020)', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('passes through HttpException message + status', () => {
    const { host, json, status } = mockHost();
    filter.catch(new BadRequestException('Email không hợp lệ'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 400, message: 'Email không hợp lệ' }),
    );
  });

  it('masks internal error messages for unexpected 500s (no leak)', () => {
    const { host, json, status } = mockHost();
    const secretLeak = 'connect ECONNREFUSED 10.0.0.5:5432 (prisma internals)';
    filter.catch(new Error(secretLeak), host);

    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0];
    expect(payload.code).toBe('INTERNAL_ERROR');
    expect(payload.message).toBe('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.');
    expect(JSON.stringify(payload)).not.toContain('ECONNREFUSED');
    // vẫn log chi tiết phía server
    expect((filter as any).logger.error).toHaveBeenCalled();
  });
});
