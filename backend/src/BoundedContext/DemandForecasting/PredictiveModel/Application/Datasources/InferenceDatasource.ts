import { InferenceInput, InferenceResult } from '../../Domain';

export abstract class InferenceDatasource {
  abstract predict(input: InferenceInput): Promise<InferenceResult>;
}
