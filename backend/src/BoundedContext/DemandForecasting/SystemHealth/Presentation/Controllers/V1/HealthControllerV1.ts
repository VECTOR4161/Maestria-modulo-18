import { Controller, Get } from '@nestjs/common';
import { PredictiveModelRepository } from '../../../../PredictiveModel/Application';
import {
  CheckHealthUseCase,
  HealthRepository,
  HealthResponse,
} from '../../../Application';

@Controller({ path: 'health', version: '1' })
export class HealthControllerV1 {
  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  @Get()
  check(): Promise<HealthResponse> {
    return new CheckHealthUseCase(
      this.healthRepository,
      this.modelRepository,
    ).execute();
  }
}
