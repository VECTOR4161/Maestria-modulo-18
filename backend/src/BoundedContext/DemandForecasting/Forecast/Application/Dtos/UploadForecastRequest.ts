import { Validator } from '../../../../../shared/Application';
import { DomainException } from '../../../../../shared/Domain';
import { HistoryDay, Horizon } from '../../Domain';
import { HistoryCsvParser } from '../Services/HistoryCsvParser';

const FIELDS = ['productId', 'horizon'];

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

export class UploadForecastRequest {
  private constructor(
    readonly productId: string,
    readonly horizon: number,
    readonly points: HistoryDay[],
  ) {}

  static createFromRequest(
    body: Record<string, unknown>,
    file: UploadedFile | undefined,
  ): UploadForecastRequest {
    Validator.allowedFields(body, FIELDS);
    const productId = Validator.requiredUuid(body.productId, 'productId');
    const horizon = Horizon.create(
      Validator.optionalInteger(body.horizon, 'horizon'),
    );
    if (!file) {
      DomainException.throwException(
        400,
        'Debe adjuntar un archivo CSV en el campo "file".',
      );
    }
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      DomainException.throwException(
        400,
        'El archivo debe tener extensión .csv.',
      );
    }
    const points = HistoryCsvParser.parse(file.buffer.toString('utf8'));
    return new UploadForecastRequest(productId, horizon.value, points);
  }
}
