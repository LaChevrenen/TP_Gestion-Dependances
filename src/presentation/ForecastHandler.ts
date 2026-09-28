import type { Request, Response } from "express";

export interface ForecastHandler {
  handleGetForecast(req: Request, res: Response): Promise<void>;
}
