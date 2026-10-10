import { Validator } from '../../../../../shared/Application';
import { Horizon } from '../../Domain';

const FIELDS = ['productId', 'cutoffDate', 'horizon'];

export class ForecastRequest {
  private constructor(
    readonly productId: string,
    readonly cutoffDate: string | undefined,
    readonly horizon: number,
  ) {}

  static createFromRequest(body: Record<string, unknown>): ForecastRequest {
    Validator.allowedFields(body, FIELDS);
    const productId = Validator.requiredUuid(body.productId, 'productId');
    const cutoffDate = Validator.optionalIsoDate(body.cutoffDate, 'cutoffDate');
    const horizon = Horizon.create(
      Validator.optionalInteger(body.horizon, 'horizon'),
    );
    return new ForecastRequest(productId, cutoffDate, horizon.value);
  }
}
