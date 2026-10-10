export abstract class HealthDatasource {
  abstract isDatabaseReachable(): Promise<boolean>;
}
