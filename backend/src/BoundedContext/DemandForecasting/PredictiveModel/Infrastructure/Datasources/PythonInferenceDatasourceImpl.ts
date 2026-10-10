import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { ModelConfig } from '../../../../../config/EnvConfiguration';
import {
  BaseException,
  DomainException,
  SystemException,
} from '../../../../../shared/Domain';
import { InferenceDatasource } from '../../Application';
import { InferenceInput, InferenceResult } from '../../Domain';

const INPUT_ERROR_EXIT_CODE = 2;

@Injectable()
export class PythonInferenceDatasourceImpl extends InferenceDatasource {
  private readonly config: ModelConfig;

  constructor(config: ConfigService) {
    super();
    this.config = config.getOrThrow<ModelConfig>('model');
  }

  predict(input: InferenceInput): Promise<InferenceResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.config.pythonBin, [this.config.predictScript], {
        cwd: this.config.root,
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (action: () => void) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          action();
        }
      };

      const timer = setTimeout(() => {
        child.kill();
        finish(() =>
          reject(
            SystemException.create(
              503,
              'El modelo excedió el tiempo máximo de respuesta.',
            ),
          ),
        );
      }, this.config.timeoutMs);

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => (stdout += chunk));
      child.stderr.on('data', (chunk: string) => (stderr += chunk));

      child.on('error', () =>
        finish(() =>
          reject(
            SystemException.create(
              503,
              `No se pudo ejecutar Python (${this.config.pythonBin}). Revise PYTHON_BIN.`,
            ),
          ),
        ),
      );

      child.on('close', (code) =>
        finish(() => {
          const parsed = this.parse(stdout);
          if (code === 0 && parsed && !('error' in parsed)) {
            resolve(parsed as unknown as InferenceResult);
            return;
          }
          reject(this.toException(code, parsed, stderr));
        }),
      );

      child.stdin.on('error', () => undefined);
      child.stdin.end(JSON.stringify(input));
    });
  }

  private toException(
    code: number | null,
    parsed: Record<string, unknown> | null,
    stderr: string,
  ): BaseException {
    const message =
      parsed && 'error' in parsed
        ? String(parsed.error)
        : `El modelo no está disponible. ${stderr.trim().split('\n').pop() ?? ''}`.trim();
    return code === INPUT_ERROR_EXIT_CODE
      ? DomainException.create(422, message)
      : SystemException.create(503, message);
  }

  private parse(stdout: string): Record<string, unknown> | null {
    try {
      return JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
