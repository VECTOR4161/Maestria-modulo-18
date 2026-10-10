import { BaseException } from './BaseException';

export class DomainException extends BaseException {
  private constructor(status: number, message: string) {
    super(status, message, 'DomainException');
  }

  static throwException(status: number, message: string): never {
    throw new DomainException(status, message);
  }

  static create(status: number, message: string): DomainException {
    return new DomainException(status, message);
  }
}
