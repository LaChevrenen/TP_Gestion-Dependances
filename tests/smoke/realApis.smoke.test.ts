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
    expect(Array.isArray(forecast.hourly)).toBe(true);
    expect(forecast.hourly.length).toBeGreaterThan(0);
    expect(forecast.hourly[0]?.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(forecast.hourly[0]?.temperature?.value).toBeTypeOf("number");
    expect(forecast.hourly[0]?.temperature?.unit).toBe("°C");
  }, 15000);
});
