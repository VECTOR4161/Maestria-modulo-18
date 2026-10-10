import { Module } from '@nestjs/common';
import { PredictiveModelModule } from '../../../PredictiveModel/Presentation';
import { HealthDatasource, HealthRepository } from '../../Application';
import {
  HealthDatasourceImpl,
  HealthRepositoryImpl,
} from '../../Infrastructure';
import { HealthControllerV1 } from '../Controllers/V1/HealthControllerV1';

@Module({
  imports: [PredictiveModelModule],
  controllers: [HealthControllerV1],
  providers: [
    { provide: HealthDatasource, useClass: HealthDatasourceImpl },
    { provide: HealthRepository, useClass: HealthRepositoryImpl },
  ],
})
export class HealthModule {}
