import { DomainException, isIsoDate } from '../../../../../shared/Domain';
import { HistoryDay } from '../../Domain';

const MAX_CSV_ROWS = 2000;
const DATE_HEADERS = ['fecha', 'date'];
const QTY_HEADERS = ['cantidad', 'qty'];
const BYTE_ORDER_MARK = 0xfeff;

const invalid = (message: string): never =>
  DomainException.throwException(400, message);

export class HistoryCsvParser {
  static parse(content: string): HistoryDay[] {
    const lines = HistoryCsvParser.stripBom(content)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      invalid('El CSV está vacío o solo contiene la cabecera.');
    }
    if (lines.length - 1 > MAX_CSV_ROWS) {
      invalid(`El CSV no puede tener más de ${MAX_CSV_ROWS} filas.`);
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const header = lines[0]
      .split(separator)
      .map((cell) => cell.trim().toLowerCase());
    const dateIndex = header.findIndex((cell) => DATE_HEADERS.includes(cell));
    const qtyIndex = header.findIndex((cell) => QTY_HEADERS.includes(cell));
    if (dateIndex < 0 || qtyIndex < 0) {
      invalid('El CSV debe tener las columnas "fecha" y "cantidad".');
    }

    const seen = new Set<string>();
    const rows = lines.slice(1).map((line, index) => {
      const rowNumber = index + 2;
      const cells = line.split(separator).map((cell) => cell.trim());
      const date = cells[dateIndex] ?? '';
      const rawQty = cells[qtyIndex] ?? '';

      if (!isIsoDate(date)) {
        invalid(
          `Fila ${rowNumber}: la fecha "${date}" no tiene el formato AAAA-MM-DD.`,
        );
      }
      const qty = rawQty === '' ? NaN : Number(rawQty);
      if (!Number.isFinite(qty) || qty < 0) {
        invalid(
          `Fila ${rowNumber}: la cantidad "${rawQty}" debe ser un número mayor o igual a 0.`,
        );
      }
      if (seen.has(date)) {
        invalid(`Fila ${rowNumber}: la fecha ${date} está duplicada.`);
      }
      seen.add(date);
      return { date, qty };
    });

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  private static stripBom(content: string): string {
    return content.charCodeAt(0) === BYTE_ORDER_MARK
      ? content.slice(1)
      : content;
  }
}
