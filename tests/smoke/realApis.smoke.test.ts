import { describe, expect, it } from "vitest";
import { buildContainer } from "../../src/container.js";
import { TYPES } from "../../src/types.js";
import { ForecastService } from "../../src/application/ForecastService.js";

// Ce test tape les vraies API Nominatim et Open-Meteo sur le reseau reel.
// Il est desactive par defaut pour ne pas rendre la CI dependante du reseau
// et du rate limit Nominatim (~1 req/s). Activation manuelle :
//   RUN_SMOKE_TESTS=1 npm run test:smoke
describe.skipIf(!process.env.RUN_SMOKE_TESTS)("Smoke test (reseau reel)", () => {
  it("recupere une prevision reelle pour une adresse connue", async () => {
    const container = buildContainer();
    const service = container.get<ForecastService>(TYPES.ForecastService);

    const forecast = await service.getForecast("Paris, France");

    expect(forecast.location.coordinates.latitude).toBeTypeOf("number");
    expect(forecast.location.coordinates.longitude).toBeTypeOf("number");
    expect(Array.isArray(forecast.hourly.time)).toBe(true);
    expect(Array.isArray(forecast.hourly.shortwaveRadiation)).toBe(true);
    expect(forecast.hourly.time.length).toBeGreaterThan(0);
  }, 15000);
});
