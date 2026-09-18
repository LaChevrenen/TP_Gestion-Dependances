export interface HttpRequestOptions {
  readonly headers?: Record<string, string>;
  readonly timeoutMs?: number;
}

export interface HttpClient {
  getJson<T>(url: string, options?: HttpRequestOptions): Promise<T>;
}
