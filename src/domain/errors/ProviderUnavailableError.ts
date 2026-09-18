export class ProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    public override readonly cause?: unknown
  ) {
    super(`Provider unavailable: ${provider}`);
    this.name = "ProviderUnavailableError";
  }
}
