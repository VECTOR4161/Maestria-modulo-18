import { Module } from '@nestjs/common';
import {
  InferenceDatasource,
  ModelArtifactsDatasource,
  PredictiveModelRepository,
} from '../../Application';
import {
  ModelArtifactsDatasourceImpl,
  PredictiveModelRepositoryImpl,
  PythonInferenceDatasourceImpl,
} from '../../Infrastructure';
import { PredictiveModelControllerV1 } from '../Controllers/V1/PredictiveModelControllerV1';

@Module({
  controllers: [PredictiveModelControllerV1],
  providers: [
    {
      provide: ModelArtifactsDatasource,
      useClass: ModelArtifactsDatasourceImpl,
    },
    { provide: InferenceDatasource, useClass: PythonInferenceDatasourceImpl },
    {
      provide: PredictiveModelRepository,
      useClass: PredictiveModelRepositoryImpl,
    },
  ],
  exports: [PredictiveModelRepository],
})
export class PredictiveModelModule {}
