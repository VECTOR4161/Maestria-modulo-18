import { daysBetween } from '../../../../../shared/Domain';
import { DISCONTINUED_AFTER_DAYS } from '../Constants/ProductRules';
import { ProductId } from '../ValueObjects/ProductId';

export interface ProductProps {
  id: ProductId;
  name: string;
  category: string;
  type: string;
  price: number;
  stocked: boolean;
  batchSize: number;
  batchLabel: string;
  firstSale: string;
  lastSale: string;
}

export class Product {
  private trainedModel = false;

  private constructor(
    private readonly props: ProductProps,
    private readonly discontinuedFlag: boolean,
  ) {}

  static restore(props: ProductProps, lastDataDate: string): Product {
    const discontinued =
      daysBetween(props.lastSale, lastDataDate) > DISCONTINUED_AFTER_DAYS;
    return new Product(props, discontinued);
  }

  markTrainingStatus(trained: boolean): void {
    this.trainedModel = trained;
  }

  get id(): ProductId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get category(): string {
    return this.props.category;
  }

  get type(): string {
    return this.props.type;
  }

  get price(): number {
    return this.props.price;
  }

  get stocked(): boolean {
    return this.props.stocked;
  }

  get batchSize(): number {
    return this.props.batchSize;
  }

  get batchLabel(): string {
    return this.props.batchLabel;
  }

  get firstSale(): string {
    return this.props.firstSale;
  }

  get lastSale(): string {
    return this.props.lastSale;
  }

  get discontinued(): boolean {
    return this.discontinuedFlag;
  }

  get trained(): boolean {
    return this.trainedModel;
  }
}
