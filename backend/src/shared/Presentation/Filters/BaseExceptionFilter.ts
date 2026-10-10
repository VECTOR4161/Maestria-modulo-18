import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { BaseException } from '../../Domain';

const INTERNAL_ERROR = 500;

export interface ErrorBody {
  codigo: number;
  tipo: string;
  message: string;
  timestamp: string;
}

@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter<BaseException> {
  catch(exception: BaseException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const codigo = BaseExceptionFilter.isHttpStatus(exception.status)
      ? exception.status
      : INTERNAL_ERROR;
    const body: ErrorBody = {
      codigo,
      tipo: exception.type,
      message: exception.message,
      timestamp: new Date().toISOString(),
    };
    response.status(codigo).json(body);
  }

  private static isHttpStatus(status: number): boolean {
    return Number.isInteger(status) && status >= 400 && status <= 599;
  }
}
