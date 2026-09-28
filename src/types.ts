export const TYPES = {
  Config: Symbol.for("Config"),
  HttpClient: Symbol.for("HttpClient"),
  Geocoder: Symbol.for("Geocoder"),
  GeocoderDelegate: Symbol.for("GeocoderDelegate"),
  GeocodeCache: Symbol.for("GeocodeCache"),
  WeatherProvider: Symbol.for("WeatherProvider"),
  ForecastService: Symbol.for("ForecastService"),
  ForecastController: Symbol.for("ForecastController"),
  LiveForecastController: Symbol.for("LiveForecastController"),
  DemoForecastController: Symbol.for("DemoForecastController"),
} as const;
