import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../../Domain';
import { BaseExceptionFilter, ErrorBody } from './BaseExceptionFilter';

@Catch()
export class UnhandledExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnhandledExceptionFilter.name);
  private readonly baseFilter = new BaseExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof BaseException) {
      this.baseFilter.catch(exception, host);
      return;
    }

    const http = host.switchToHttp();
    const response = http.getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const request = http.getRequest<Request>();
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    const body: ErrorBody = {
      codigo: 500,
      tipo: 'SystemException',
      message: 'Error interno del servidor.',
      timestamp: new Date().toISOString(),
    };
    response.status(500).json(body);
  }
}
