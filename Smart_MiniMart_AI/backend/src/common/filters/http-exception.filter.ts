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

  /** Mã lỗi ổn định theo status — client/mobile phụ thuộc vào đây để xử lý. */
  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return `HTTP_${status}`;
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;
    // requestId do middleware ở main.ts gắn vào request → trả về cho client để tra log
    const requestId = (req as Request & { requestId?: string }).requestId;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      // Mã lỗi theo status (trước đây 400/401/404… cũng bị dán INTERNAL_ERROR → dễ gây hiểu nhầm)
      code = this.codeForStatus(status);
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
      // Chỉ log chi tiết phía server (kèm requestId để đối chiếu).
      this.logger.error(
        `${req.method} ${req.url} [rid=${requestId ?? '-'}] → ${exception.message}`,
        exception.stack,
      );
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
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
