import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ForecastModule } from './BoundedContext/DemandForecasting/Forecast/Presentation';
import { PredictiveModelModule } from './BoundedContext/DemandForecasting/PredictiveModel/Presentation';
import { ProductModule } from './BoundedContext/DemandForecasting/Product/Presentation';
import { SalesModule } from './BoundedContext/DemandForecasting/Sales/Presentation';
import { HealthModule } from './BoundedContext/DemandForecasting/SystemHealth/Presentation';
import { EnvConfiguration } from './config/EnvConfiguration';
import { DatabaseModule } from './shared/Infrastructure';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [EnvConfiguration] }),
    DatabaseModule,
    HealthModule,
    PredictiveModelModule,
    SalesModule,
    ProductModule,
    ForecastModule,
  ],
})
export class AppModule {}
