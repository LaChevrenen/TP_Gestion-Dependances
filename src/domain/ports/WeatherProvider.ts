import type { Coordinates } from "../Coordinates.js";
import type { WeatherForecast } from "../Forecast.js";

export interface WeatherProvider {
  getHourlyForecast(coordinates: Coordinates): Promise<WeatherForecast>;
}
