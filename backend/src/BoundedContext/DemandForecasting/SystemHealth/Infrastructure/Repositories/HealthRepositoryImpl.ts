import { Injectable } from '@nestjs/common';
import { HealthDatasource, HealthRepository } from '../../Application';

@Injectable()
export class HealthRepositoryImpl extends HealthRepository {
  constructor(private readonly datasource: HealthDatasource) {
    super();
  }

  isDatabaseReachable(): Promise<boolean> {
    return this.datasource.isDatabaseReachable();
  }
}
