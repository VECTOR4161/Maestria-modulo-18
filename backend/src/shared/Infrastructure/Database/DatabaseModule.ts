import { Global, Module } from '@nestjs/common';
import { DatabaseClient } from './DatabaseClient';

@Global()
@Module({
  providers: [DatabaseClient],
  exports: [DatabaseClient],
})
export class DatabaseModule {}
