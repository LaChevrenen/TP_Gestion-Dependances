import type { Location } from "./Location.js";

export interface HourlyReadings {
  readonly time: readonly string[];
  readonly shortwaveRadiation: readonly number[];
}

export interface HourlyUnits {
  readonly time: string;
  readonly shortwaveRadiation: string;
}

export interface WeatherForecast {
  readonly timezone: string;
  readonly hourly: HourlyReadings;
  readonly hourlyUnits: HourlyUnits;
}

export interface Forecast {
  readonly location: Location;
  readonly timezone: string;
  readonly hourly: HourlyReadings;
  readonly hourlyUnits: HourlyUnits;
}
