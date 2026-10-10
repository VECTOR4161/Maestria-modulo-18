export abstract class HealthRepository {
  abstract isDatabaseReachable(): Promise<boolean>;
}
