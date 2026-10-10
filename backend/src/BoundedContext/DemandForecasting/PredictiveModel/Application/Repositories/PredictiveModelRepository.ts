import {
  InferenceInput,
  InferenceResult,
  ModelEvaluation,
  PredictiveModel,
} from '../../Domain';

export abstract class PredictiveModelRepository {
  abstract artifactsAvailable(): boolean;

  abstract getModel(): PredictiveModel;

  abstract getEvaluation(): ModelEvaluation;

  abstract getTrainedProductIds(): Set<string>;

  abstract predict(input: InferenceInput): Promise<InferenceResult>;
}
