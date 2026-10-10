import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { ModelConfig } from '../../../../../config/EnvConfiguration';
import { SystemException } from '../../../../../shared/Domain';
import { ModelArtifactsDatasource } from '../../Application';
import { ModelEvaluation, PredictiveModel } from '../../Domain';
import {
  ModelArtifactsMapper,
  ModelMetadataRecord,
  ModelMetricsRecord,
} from '../Persistence/ModelArtifactsMapper';

@Injectable()
export class ModelArtifactsDatasourceImpl extends ModelArtifactsDatasource {
  private readonly config: ModelConfig;

  constructor(config: ConfigService) {
    super();
    this.config = config.getOrThrow<ModelConfig>('model');
  }

  artifactsAvailable(): boolean {
    return [
      this.config.modelFile,
      this.config.metadataFile,
      this.config.predictScript,
    ].every((path) => existsSync(path));
  }

  loadModel(): PredictiveModel {
    return ModelArtifactsMapper.toModel(
      this.readJson<ModelMetadataRecord>(this.config.metadataFile),
    );
  }

  loadEvaluation(): ModelEvaluation {
    return ModelArtifactsMapper.toEvaluation(
      this.readJson<ModelMetricsRecord>(this.config.metricsFile),
    );
  }

  private readJson<T>(path: string): T {
    if (!existsSync(path)) {
      SystemException.throwException(
        503,
        'El modelo no ha sido entrenado. Ejecute ml/src/train.py.',
      );
    }
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  }
}
