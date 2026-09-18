export interface OpenMeteoResponse {
  readonly timezone?: string;
  readonly hourly?: {
    readonly time?: readonly string[];
    readonly shortwave_radiation?: readonly number[];
  };
  readonly hourly_units?: {
    readonly time?: string;
    readonly shortwave_radiation?: string;
  };
}
