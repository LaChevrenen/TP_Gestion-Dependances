export interface MetNorwayUnits {
  readonly air_temperature?: string;
  readonly wind_speed?: string;
}

export interface MetNorwayInstantDetails {
  readonly air_temperature?: number;
  readonly wind_speed?: number;
}

export interface MetNorwayTimeseriesEntry {
  readonly time: string;
  readonly data?: {
    readonly instant?: {
      readonly details?: MetNorwayInstantDetails;
    };
  };
}

export interface MetNorwayResponse {
  readonly properties?: {
    readonly meta?: {
      readonly units?: MetNorwayUnits;
    };
    readonly timeseries?: readonly MetNorwayTimeseriesEntry[];
  };
}
