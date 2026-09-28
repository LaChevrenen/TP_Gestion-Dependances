import type { Request, Response } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../types.js";
import type { ForecastHandler } from "./ForecastHandler.js";

// Strategy choisie par requete : deux graphes immuables (reel / demo), aucun etat partage.
@injectable()
export class DemoAwareForecastController implements ForecastHandler {
  constructor(
    @inject(TYPES.LiveForecastController) private readonly live: ForecastHandler,
    @inject(TYPES.DemoForecastController) private readonly demo: ForecastHandler
  ) {}

  handleGetForecast = (req: Request, res: Response): Promise<void> =>
    (req.query.demo === "true" ? this.demo : this.live).handleGetForecast(req, res);
}
