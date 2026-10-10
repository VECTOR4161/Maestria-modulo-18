import {
  EvaluatedMethod,
  MethodMetrics,
  ModelEvaluation,
  PredictiveModel,
} from '../../Domain';

export interface ModelMetadataRecord {
  model_version: string;
  created_at: string;
  lightgbm_version: string;
  feature_columns: string[];
  trained_until: string;
  last_data_date: string;
  horizon: number;
  min_history_days: number;
  inference_history_days: number;
  products: Record<string, unknown>;
}

export interface ModelMetricsRecord {
  ranges: Record<'train' | 'validation' | 'test', [string, string]>;
  selected_params: Record<string, string | number>;
  num_boost_round: number;
  test_rows: number;
  products_evaluated: number;
  success: boolean;
  overall: Record<EvaluatedMethod, MethodMetrics>;
  per_product: Record<string, string | number>[];
  waste_simulation: Record<string, unknown>;
  feature_importance: { feature: string; gain: number }[];
}

export class ModelArtifactsMapper {
  static toModel(record: ModelMetadataRecord): PredictiveModel {
    return PredictiveModel.restore({
      version: record.model_version,
      createdAt: record.created_at,
      lightgbmVersion: record.lightgbm_version,
      featureColumns: record.feature_columns,
      trainedUntil: record.trained_until,
      lastDataDate: record.last_data_date,
      horizon: record.horizon,
      minHistoryDays: record.min_history_days,
      inferenceHistoryDays: record.inference_history_days,
      trainedProductIds: Object.keys(record.products),
    });
  }

  static toEvaluation(record: ModelMetricsRecord): ModelEvaluation {
    return ModelEvaluation.restore({
      ranges: record.ranges,
      selectedParams: record.selected_params,
      numBoostRound: record.num_boost_round,
      testRows: record.test_rows,
      productsEvaluated: record.products_evaluated,
      success: record.success,
      overall: record.overall,
      perProduct: record.per_product,
      wasteSimulation: record.waste_simulation,
      featureImportance: record.feature_importance,
    });
  }
}
