export class HttpRequestError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}
