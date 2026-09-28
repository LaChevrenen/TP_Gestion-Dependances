export interface OpenMeteoResponse {
  readonly timezone?: string;
  readonly hourly?: {
    readonly time?: readonly number[];
    readonly temperature_2m?: readonly (number | null)[];
    readonly shortwave_radiation?: readonly (number | null)[];
  };
  readonly hourly_units?: {
    readonly temperature_2m?: string;
    readonly shortwave_radiation?: string;
  };
}
