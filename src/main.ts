import "reflect-metadata";
import { buildContainer } from "./container.js";
import { createApp } from "./presentation/createApp.js";
import { TYPES } from "./types.js";
import type { AppConfig } from "./config/Config.js";
import { ForecastController } from "./presentation/ForecastController.js";

const container = buildContainer();
const config = container.get<AppConfig>(TYPES.Config);
const forecastController = container.get<ForecastController>(TYPES.ForecastController);

const app = createApp(forecastController);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
