import { ModelInfoResponse } from '../Dtos/ModelInfoResponse';
import { PredictiveModelRepository } from '../Repositories/PredictiveModelRepository';

export interface IGetModelInfoUseCase {
  execute(): ModelInfoResponse;
}

export class GetModelInfoUseCase implements IGetModelInfoUseCase {
  constructor(private readonly modelRepository: PredictiveModelRepository) {}

  execute(): ModelInfoResponse {
    return ModelInfoResponse.createFromValues(
      this.modelRepository.getModel(),
      this.modelRepository.getEvaluation(),
    );
  }
}
