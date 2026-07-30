import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else if (typeof r === 'object' && r !== null) {
        const body = r as Record<string, unknown>;
        message = (body.message as string) ?? exception.message;
        code = (body.code as string) ?? code;
        details = body.details;
      }
    } else if (exception instanceof Error) {
      // Lỗi không lường trước (500): KHÔNG lộ message/stack kỹ thuật ra client.
      // Chỉ log chi tiết phía server.
      this.logger.error(`${req.method} ${req.url} → ${exception.message}`, exception.stack);
      message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
      code = 'INTERNAL_ERROR';
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      code,
      message,
      details,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
