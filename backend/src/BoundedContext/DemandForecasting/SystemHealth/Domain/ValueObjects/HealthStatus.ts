export class HealthStatus {
  private constructor(
    readonly database: boolean,
    readonly modelArtifacts: boolean,
  ) {}

  static create(database: boolean, modelArtifacts: boolean): HealthStatus {
    return new HealthStatus(database, modelArtifacts);
  }

  get status(): 'ok' | 'degraded' {
    return this.database && this.modelArtifacts ? 'ok' : 'degraded';
  }
}
