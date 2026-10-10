import { existsSync } from 'fs';
import { join, resolve } from 'path';

export interface DatabaseConfig {
  url: string;
}

export interface ModelConfig {
  root: string;
  predictScript: string;
  modelFile: string;
  metadataFile: string;
  metricsFile: string;
  pythonBin: string;
  timeoutMs: number;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
  model: ModelConfig;
}

export const getEnvValue = (name: string, fallback = ''): string => {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
};

export const getEnvNumber = (name: string, fallback: number): number => {
  const value = getEnvValue(name);
  return value === '' ? fallback : Number(value);
};

export const EnvConfiguration = (): AppConfig => {
  const root = resolve(getEnvValue('ML_DIR', join(process.cwd(), '..', 'ml')));
  return {
    port: getEnvNumber('PORT', 3000),
    database: {
      url: getEnvValue(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/cafeteria',
      ),
    },
    model: {
      root,
      predictScript: join(root, 'src', 'predict.py'),
      modelFile: join(root, 'artifacts', 'model.txt'),
      metadataFile: join(root, 'artifacts', 'metadata.json'),
      metricsFile: join(root, 'reports', 'metrics.json'),
      pythonBin: getEnvValue('PYTHON_BIN', 'python'),
      timeoutMs: getEnvNumber('MODEL_TIMEOUT_MS', 30000),
    },
  };
};

export const validateEnvironment = (): void => {
  const config = EnvConfiguration();
  const problems: string[] = [];
  if (!Number.isInteger(config.port) || config.port <= 0) {
    problems.push('PORT debe ser un número entero positivo');
  }
  if (!Number.isFinite(config.model.timeoutMs) || config.model.timeoutMs <= 0) {
    problems.push('MODEL_TIMEOUT_MS debe ser un número positivo');
  }
  if (!existsSync(config.model.root)) {
    problems.push(`ML_DIR no existe (${config.model.root})`);
  }
  if (problems.length > 0) {
    throw new Error(`Configuración inválida: ${problems.join('; ')}.`);
  }
};
