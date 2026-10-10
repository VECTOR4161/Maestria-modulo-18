import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../../../../shared/Infrastructure';
import { HealthDatasource } from '../../Application';

@Injectable()
export class HealthDatasourceImpl extends HealthDatasource {
  constructor(private readonly db: DatabaseClient) {
    super();
  }

  isDatabaseReachable(): Promise<boolean> {
    return this.db
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);
  }
}
