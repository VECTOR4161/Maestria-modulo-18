export interface PredictiveModelProps {
  version: string;
  createdAt: string;
  lightgbmVersion: string;
  featureColumns: string[];
  trainedUntil: string;
  lastDataDate: string;
  horizon: number;
  minHistoryDays: number;
  inferenceHistoryDays: number;
  trainedProductIds: string[];
}

export class PredictiveModel {
  private readonly trainedProducts: Set<string>;

  private constructor(private readonly props: PredictiveModelProps) {
    this.trainedProducts = new Set(props.trainedProductIds);
  }

  static restore(props: PredictiveModelProps): PredictiveModel {
    return new PredictiveModel(props);
  }

  get version(): string {
    return this.props.version;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get lightgbmVersion(): string {
    return this.props.lightgbmVersion;
  }

  get featureColumns(): string[] {
    return [...this.props.featureColumns];
  }

  get trainedUntil(): string {
    return this.props.trainedUntil;
  }

  get lastDataDate(): string {
    return this.props.lastDataDate;
  }

  get horizon(): number {
    return this.props.horizon;
  }

  get minHistoryDays(): number {
    return this.props.minHistoryDays;
  }

  get inferenceHistoryDays(): number {
    return this.props.inferenceHistoryDays;
  }

  get trainedProductIds(): Set<string> {
    return new Set(this.trainedProducts);
  }

  isTrainedFor(productId: string): boolean {
    return this.trainedProducts.has(productId);
  }
}
