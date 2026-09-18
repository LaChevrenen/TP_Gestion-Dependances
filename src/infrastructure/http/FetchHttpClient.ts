import { injectable } from "inversify";
import type { HttpClient, HttpRequestOptions } from "./HttpClient.js";
import { HttpRequestError } from "./HttpRequestError.js";

const DEFAULT_TIMEOUT_MS = 5000;

@injectable()
export class FetchHttpClient implements HttpClient {
  async getJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        ...(options.headers ? { headers: options.headers } : {}),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new HttpRequestError(`Request timed out after ${timeoutMs}ms: ${url}`, err);
      }
      throw new HttpRequestError(`Network error while requesting ${url}`, err);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new HttpRequestError(
        `Unexpected status ${response.status} from ${url}`,
        undefined,
        response.status
      );
    }

    try {
      return (await response.json()) as T;
    } catch (err) {
      throw new HttpRequestError(`Invalid JSON response from ${url}`, err);
    }
  }
}
