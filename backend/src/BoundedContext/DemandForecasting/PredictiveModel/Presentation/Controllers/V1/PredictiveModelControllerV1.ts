import { Controller, Get } from '@nestjs/common';
import {
  GetModelInfoUseCase,
  ModelInfoResponse,
  PredictiveModelRepository,
} from '../../../Application';

@Controller({ path: 'model', version: '1' })
export class PredictiveModelControllerV1 {
  constructor(private readonly modelRepository: PredictiveModelRepository) {}

  @Get('info')
  info(): ModelInfoResponse {
    return new GetModelInfoUseCase(this.modelRepository).execute();
  }
}
