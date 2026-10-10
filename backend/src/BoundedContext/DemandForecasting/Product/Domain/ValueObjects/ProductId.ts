export class ProductId {
  private constructor(readonly value: string) {}

  static create(value: string): ProductId {
    return new ProductId(value);
  }

  equals(other: string): boolean {
    return this.value === other;
  }
}
