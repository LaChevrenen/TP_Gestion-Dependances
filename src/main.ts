import "reflect-metadata";
import type { Container } from "inversify";
import { buildContainer } from "./container.js";
import { createApp } from "./presentation/createApp.js";
import { TYPES } from "./types.js";
import type { AppConfig } from "./config/Config.js";
import { ConfigurationError } from "./config/ConfigurationError.js";
import { ForecastController } from "./presentation/ForecastController.js";

let container: Container;
try {
  container = buildContainer();
} catch (err) {
  if (err instanceof ConfigurationError) {
    console.error(`Configuration error: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

const config = container.get<AppConfig>(TYPES.Config);
const forecastController = container.get<ForecastController>(TYPES.ForecastController);

const app = createApp(forecastController);

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
