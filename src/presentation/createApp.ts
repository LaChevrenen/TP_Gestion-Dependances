import express, { type Express } from "express";
import type { ForecastHandler } from "./ForecastHandler.js";

export function createApp(forecastHandler: ForecastHandler): Express {
  const app = express();

  app.get("/forecast", forecastHandler.handleGetForecast);

  return app;
}
