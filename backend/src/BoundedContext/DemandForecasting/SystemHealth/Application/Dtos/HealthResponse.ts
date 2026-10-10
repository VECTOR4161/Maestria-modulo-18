import { HealthStatus } from '../../Domain';

export class HealthResponse {
  private constructor(
    private readonly status: 'ok' | 'degraded',
    private readonly database: boolean,
    private readonly modelArtifacts: boolean,
  ) {}

  static createFromValues(health: HealthStatus): HealthResponse {
    return new HealthResponse(
      health.status,
      health.database,
      health.modelArtifacts,
    );
  }
}
