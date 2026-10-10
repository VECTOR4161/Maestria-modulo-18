export abstract class BaseException extends Error {
  protected constructor(
    readonly status: number,
    message: string,
    readonly type: string,
  ) {
    super(message);
    this.name = type;
  }
}
