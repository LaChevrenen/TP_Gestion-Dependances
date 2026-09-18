export class HttpRequestError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
    public readonly status?: number
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}
