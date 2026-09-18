export const TYPES = {
  Config: Symbol.for("Config"),
  HttpClient: Symbol.for("HttpClient"),
  Geocoder: Symbol.for("Geocoder"),
  WeatherProvider: Symbol.for("WeatherProvider"),
  ForecastService: Symbol.for("ForecastService"),
  ForecastController: Symbol.for("ForecastController"),
} as const;
