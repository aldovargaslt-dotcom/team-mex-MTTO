import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
@Catch(HttpException)
export class CanonicalHttpFilter implements ExceptionFilter {
  catch(error: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = error.getResponse();
    if (typeof body === 'object' && body && 'code' in body) {
      response.status(error.getStatus()).json(body);
      return;
    }
    response
      .status(error.getStatus())
      .json({
        code:
          (
            {
              400: 'INVALID_REQUEST',
              401: 'TRUSTED_AUTHENTICATION_REQUIRED',
              403: 'ACCESS_DENIED',
              404: 'NOT_FOUND',
            } as Record<number, string>
          )[error.getStatus()] ?? 'REQUEST_FAILED',
        message:
          typeof body === 'string'
            ? body
            : 'message' in body
              ? body.message
              : error.message,
        details: {},
      });
  }
}
