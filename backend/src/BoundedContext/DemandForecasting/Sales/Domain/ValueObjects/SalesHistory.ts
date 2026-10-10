import { dateRange } from '../../../../../shared/Domain';
import { DailySale } from './DailySale';

export class SalesHistory {
  private constructor(
    private readonly days: DailySale[],
    readonly filledDays: number,
  ) {}

  static fromSales(sales: DailySale[], from: string, to: string): SalesHistory {
    const byDate = new Map(sales.map((sale) => [sale.date, sale.qty]));
    const days = dateRange(from, to).map((date) => ({
      date,
      qty: byDate.get(date) ?? 0,
    }));
    const filledDays = days.filter((day) => !byDate.has(day.date)).length;
    return new SalesHistory(days, filledDays);
  }

  static fromContiguousPoints(points: DailySale[]): SalesHistory {
    return SalesHistory.fromSales(
      points,
      points[0].date,
      points[points.length - 1].date,
    );
  }

  get length(): number {
    return this.days.length;
  }

  get lastDate(): string {
    return this.days[this.days.length - 1].date;
  }

  qtyOn(date: string): number | undefined {
    return this.days.find((day) => day.date === date)?.qty;
  }

  lastDays(count: number): SalesHistory {
    return new SalesHistory(this.days.slice(-count), 0);
  }

  toArray(): DailySale[] {
    return this.days.map((day) => ({ date: day.date, qty: day.qty }));
  }
}
