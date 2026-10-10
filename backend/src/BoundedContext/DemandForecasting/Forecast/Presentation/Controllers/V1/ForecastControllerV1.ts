import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PredictiveModelRepository } from '../../../../PredictiveModel/Application';
import { ProductRepository } from '../../../../Product/Application';
import { SalesRepository } from '../../../../Sales/Application';
import {
  ForecastFromDatabaseUseCase,
  ForecastFromUploadUseCase,
  ForecastRequest,
  ForecastResponse,
  UploadedFile as UploadedCsv,
  UploadForecastRequest,
} from '../../../Application';

const MAX_UPLOAD_BYTES = 1024 * 1024;

@Controller({ path: 'forecast', version: '1' })
export class ForecastControllerV1 {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly salesRepository: SalesRepository,
    private readonly modelRepository: PredictiveModelRepository,
  ) {}

  @Post()
  @HttpCode(200)
  fromDatabase(
    @Body() body: Record<string, unknown>,
  ): Promise<ForecastResponse> {
    const request = ForecastRequest.createFromRequest(body ?? {});
    return new ForecastFromDatabaseUseCase(
      this.productRepository,
      this.salesRepository,
      this.modelRepository,
    ).execute(request);
  }

  @Post('upload')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  fromUpload(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file: UploadedCsv | undefined,
  ): Promise<ForecastResponse> {
    const request = UploadForecastRequest.createFromRequest(body ?? {}, file);
    return new ForecastFromUploadUseCase(
      this.productRepository,
      this.salesRepository,
      this.modelRepository,
    ).execute(request);
  }
}
