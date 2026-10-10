export interface MethodMetrics {
  mase_macro: number;
  mase_pooled: number;
  mae: number;
  rmse: number;
  wape: number | null;
  bias: number;
}

export type EvaluatedMethod =
  'lightgbm' | 'seasonal_naive' | 'same_weekday_mean';

export interface ModelEvaluationProps {
  ranges: Record<'train' | 'validation' | 'test', [string, string]>;
  selectedParams: Record<string, string | number>;
  numBoostRound: number;
  testRows: number;
  productsEvaluated: number;
  success: boolean;
  overall: Record<EvaluatedMethod, MethodMetrics>;
  perProduct: Record<string, string | number>[];
  wasteSimulation: Record<string, unknown>;
  featureImportance: { feature: string; gain: number }[];
}

export class ModelEvaluation {
  private constructor(private readonly props: ModelEvaluationProps) {}

  static restore(props: ModelEvaluationProps): ModelEvaluation {
    return new ModelEvaluation(props);
  }

  get ranges() {
    return this.props.ranges;
  }

  get selectedParams() {
    return this.props.selectedParams;
  }

  get numBoostRound(): number {
    return this.props.numBoostRound;
  }

  get testRows(): number {
    return this.props.testRows;
  }

  get productsEvaluated(): number {
    return this.props.productsEvaluated;
  }

  get success(): boolean {
    return this.props.success;
  }

  get overall() {
    return this.props.overall;
  }

  get perProduct() {
    return this.props.perProduct;
  }

  get wasteSimulation() {
    return this.props.wasteSimulation;
  }

  topFeatures(count: number) {
    return this.props.featureImportance.slice(0, count);
  }
}
