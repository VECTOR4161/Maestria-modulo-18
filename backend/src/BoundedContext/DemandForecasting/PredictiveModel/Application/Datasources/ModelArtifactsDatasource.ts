import { ModelEvaluation, PredictiveModel } from '../../Domain';

export abstract class ModelArtifactsDatasource {
  abstract artifactsAvailable(): boolean;

  abstract loadModel(): PredictiveModel;

  abstract loadEvaluation(): ModelEvaluation;
}
