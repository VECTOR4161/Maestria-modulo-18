import { PredictiveModelRepository } from '../../../PredictiveModel/Application';
import { HealthStatus } from '../../Domain';
import { HealthResponse } from '../Dtos/HealthResponse';
import { HealthRepository } from '../Repositories/HealthRepository';

export interface ICheckHealthUseCase {
  execute(): Promise<HealthResponse>;
}

export class CheckHealthUseCase implements ICheckHealthUseCase {
  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  async execute(): Promise<HealthResponse> {
    const status = HealthStatus.create(
      await this.healthRepository.isDatabaseReachable(),
      this.modelRepository.artifactsAvailable(),
    );
    return HealthResponse.createFromValues(status);
  }
}
