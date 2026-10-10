import { DomainException, isIsoDate } from '../../Domain';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class Validator {
  static allowedFields(body: Record<string, unknown>, fields: string[]): void {
    const unexpected = Object.keys(body).find((key) => !fields.includes(key));
    if (unexpected !== undefined) {
      DomainException.throwException(
        400,
        `El campo ${unexpected} no está permitido.`,
      );
    }
  }

  static requiredUuid(value: unknown, field: string): string {
    if (typeof value !== 'string' || !UUID.test(value)) {
      DomainException.throwException(400, `${field} debe ser un UUID válido.`);
    }
    return value;
  }

  static optionalIsoDate(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== 'string' || !isIsoDate(value)) {
      DomainException.throwException(
        400,
        `${field} debe ser una fecha válida con formato AAAA-MM-DD.`,
      );
    }
    return value;
  }

  static optionalInteger(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      DomainException.throwException(
        400,
        `${field} debe ser un número entero.`,
      );
    }
    return parsed;
  }
}
