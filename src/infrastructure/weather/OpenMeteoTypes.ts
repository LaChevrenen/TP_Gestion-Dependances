export interface OpenMeteoResponse {
  readonly hourly?: {
    readonly time?: readonly string[];
    readonly shortwave_radiation?: readonly number[];
  };
}
