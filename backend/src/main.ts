import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  EnvConfiguration,
  validateEnvironment,
} from './config/EnvConfiguration';
import { UnhandledExceptionFilter } from './shared/Presentation';

async function bootstrap() {
  validateEnvironment();
  const config = EnvConfiguration();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors();
  app.useGlobalFilters(new UnhandledExceptionFilter());
  await app.listen(config.port);
}
void bootstrap();
