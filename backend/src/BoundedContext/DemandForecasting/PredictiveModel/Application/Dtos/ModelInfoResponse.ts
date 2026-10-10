import { ModelEvaluation, PredictiveModel } from '../../Domain';

const TOP_FEATURES = 10;

export class ModelInfoResponse {
  private constructor(
    private readonly modelVersion: string,
    private readonly createdAt: string,
    private readonly lightgbmVersion: string,
    private readonly trainedUntil: string,
    private readonly lastDataDate: string,
    private readonly horizon: number,
    private readonly minHistoryDays: number,
    private readonly features: string[],
    private readonly selectedParams: ModelEvaluation['selectedParams'],
    private readonly numBoostRound: number,
    private readonly ranges: ModelEvaluation['ranges'],
    private readonly testRows: number,
    private readonly productsEvaluated: number,
    private readonly success: boolean,
    private readonly overall: ModelEvaluation['overall'],
    private readonly perProduct: ModelEvaluation['perProduct'],
    private readonly wasteSimulation: ModelEvaluation['wasteSimulation'],
    private readonly featureImportance: { feature: string; gain: number }[],
  ) {}

  static createFromValues(
    model: PredictiveModel,
    evaluation: ModelEvaluation,
  ): ModelInfoResponse {
    return new ModelInfoResponse(
      model.version,
      model.createdAt,
      model.lightgbmVersion,
      model.trainedUntil,
      model.lastDataDate,
      model.horizon,
      model.minHistoryDays,
      model.featureColumns,
      evaluation.selectedParams,
      evaluation.numBoostRound,
      evaluation.ranges,
      evaluation.testRows,
      evaluation.productsEvaluated,
      evaluation.success,
      evaluation.overall,
      evaluation.perProduct,
      evaluation.wasteSimulation,
      evaluation.topFeatures(TOP_FEATURES),
    );
  }
}
