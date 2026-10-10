import { DomainException } from '../../../../../shared/Domain';
import { MAX_HORIZON } from '../Constants/ForecastRules';

export class Horizon {
  private constructor(readonly value: number) {}

  static create(days: number = MAX_HORIZON): Horizon {
    if (days < 1) {
      DomainException.throwException(400, 'horizon debe ser al menos 1 día.');
    }
    if (days > MAX_HORIZON) {
      DomainException.throwException(
        400,
        `horizon no puede superar ${MAX_HORIZON} días.`,
      );
    }
    return new Horizon(days);
  }
}
