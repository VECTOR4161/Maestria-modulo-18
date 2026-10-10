import { Injectable } from '@nestjs/common';
import {
  InferenceDatasource,
  ModelArtifactsDatasource,
  PredictiveModelRepository,
} from '../../Application';
import {
  InferenceInput,
  InferenceResult,
  ModelEvaluation,
  PredictiveModel,
} from '../../Domain';

@Injectable()
export class PredictiveModelRepositoryImpl extends PredictiveModelRepository {
  constructor(
    private readonly artifacts: ModelArtifactsDatasource,
    private readonly inference: InferenceDatasource,
  ) {
    super();
  }

  artifactsAvailable(): boolean {
    return this.artifacts.artifactsAvailable();
  }

  getModel(): PredictiveModel {
    return this.artifacts.loadModel();
  }

  getEvaluation(): ModelEvaluation {
    return this.artifacts.loadEvaluation();
  }

  getTrainedProductIds(): Set<string> {
    return this.artifacts.artifactsAvailable()
      ? this.artifacts.loadModel().trainedProductIds
      : new Set();
  }

  predict(input: InferenceInput): Promise<InferenceResult> {
    return this.inference.predict(input);
  }
}
