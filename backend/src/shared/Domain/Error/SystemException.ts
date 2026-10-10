import { BaseException } from './BaseException';

export class SystemException extends BaseException {
  private constructor(status: number, message: string) {
    super(status, message, 'SystemException');
  }

  static throwException(status: number, message: string): never {
    throw new SystemException(status, message);
  }

  static create(status: number, message: string): SystemException {
    return new SystemException(status, message);
  }
}
