import { Module } from '@nestjs/common';
import { SalesDatasource, SalesRepository } from '../../Application';
import { SalesDatasourceImpl, SalesRepositoryImpl } from '../../Infrastructure';

@Module({
  providers: [
    { provide: SalesDatasource, useClass: SalesDatasourceImpl },
    { provide: SalesRepository, useClass: SalesRepositoryImpl },
  ],
  exports: [SalesRepository],
})
export class SalesModule {}
