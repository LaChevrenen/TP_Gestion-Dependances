import express, { type Express } from "express";
import type { ForecastController } from "./ForecastController.js";

export function createApp(forecastController: ForecastController): Express {
  const app = express();

  app.get("/forecast", forecastController.handleGetForecast);

  return app;
}
