import { AddressNotFoundError } from "../domain/errors/AddressNotFoundError.js";
import { ProviderUnavailableError } from "../domain/errors/ProviderUnavailableError.js";

export interface HttpErrorResponse {
  readonly status: number;
  readonly message: string;
}

export function mapErrorToHttp(err: unknown): HttpErrorResponse {
  if (err instanceof AddressNotFoundError) {
    return { status: 404, message: err.message };
  }
  if (err instanceof ProviderUnavailableError) {
    return {
      status: 502,
      message: "The address geocoding or weather forecast provider is currently unavailable",
    };
  }
  return { status: 502, message: "An unexpected error occurred while fetching the forecast" };
}
