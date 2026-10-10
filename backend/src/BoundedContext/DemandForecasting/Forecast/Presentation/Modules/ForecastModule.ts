import { Module } from '@nestjs/common';
import { PredictiveModelModule } from '../../../PredictiveModel/Presentation';
import { ProductModule } from '../../../Product/Presentation';
import { SalesModule } from '../../../Sales/Presentation';
import { ForecastControllerV1 } from '../Controllers/V1/ForecastControllerV1';

@Module({
  imports: [ProductModule, SalesModule, PredictiveModelModule],
  controllers: [ForecastControllerV1],
})
export class ForecastModule {}
