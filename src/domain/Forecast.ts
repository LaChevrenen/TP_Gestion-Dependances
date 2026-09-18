import type { Location } from "./Location.js";

export interface HourlyReadings {
  readonly time: readonly string[];
  readonly shortwaveRadiation: readonly number[];
}

export interface Forecast {
  readonly location: Location;
  readonly hourly: HourlyReadings;
}
