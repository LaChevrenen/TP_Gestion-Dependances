import type { Coordinates } from "../Coordinates.js";
import type { HourlyReadings } from "../Forecast.js";

export interface WeatherProvider {
  getHourlyForecast(coordinates: Coordinates): Promise<HourlyReadings>;
}
