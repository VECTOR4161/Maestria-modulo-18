import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';
import { DatabaseConfig } from '../../../config/EnvConfiguration';

@Injectable()
export class DatabaseClient implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const database = config.getOrThrow<DatabaseConfig>('database');
    this.pool = new Pool({ connectionString: database.url, max: 5 });
  }

  async query<T extends QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
