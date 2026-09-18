import type { Request, Response } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../types.js";
import { ForecastService } from "../application/ForecastService.js";
import { mapErrorToHttp } from "./errorMapping.js";
import { toForecastResponse } from "./forecastResponse.js";

@injectable()
export class ForecastController {
  constructor(@inject(TYPES.ForecastService) private readonly forecastService: ForecastService) {}

  handleGetForecast = async (req: Request, res: Response): Promise<void> => {
    const { address } = req.query;

    if (typeof address !== "string" || address.trim() === "") {
      res.status(400).json({ error: "Query parameter 'address' is required and must not be empty" });
      return;
    }

    try {
      const forecast = await this.forecastService.getForecast(address);
      res.status(200).json(toForecastResponse(forecast));
    } catch (err) {
      const { status, message } = mapErrorToHttp(err);
      res.status(status).json({ error: message });
    }
  };
}
