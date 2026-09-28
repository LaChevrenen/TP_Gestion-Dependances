import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { DemoGeocoder } from "../../../src/infrastructure/demo/DemoGeocoder.js";
import { DemoWeatherProvider } from "../../../src/infrastructure/demo/DemoWeatherProvider.js";
import { DemoAwareForecastController } from "../../../src/presentation/DemoAwareForecastController.js";
import type { ForecastHandler } from "../../../src/presentation/ForecastHandler.js";

describe("adapters de demo", () => {
  it("DemoGeocoder renvoie des coordonnees fixes", async () => {
    await expect(new DemoGeocoder().geocode()).resolves.toEqual({
      latitude: 44.1279,
      longitude: 4.0817,
    });
  });

  it("DemoWeatherProvider renvoie 24 points deterministes, en ISO UTC, avec une temperature", async () => {
    const provider = new DemoWeatherProvider();

    const first = await provider.getHourlyForecast();
    const second = await provider.getHourlyForecast();

    expect(first).toEqual(second);
    expect(first.hourly).toHaveLength(24);
    for (const { time, temperature } of first.hourly) {
      expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(temperature?.unit).toBe("celsius");
    }
  });
});

describe("DemoAwareForecastController", () => {
  function setup() {
    const calls: string[] = [];
    const handler = (name: string): ForecastHandler => ({
      handleGetForecast: async () => {
        calls.push(name);
      },
    });
    const controller = new DemoAwareForecastController(handler("live"), handler("demo"));
    const handle = (demo?: string) =>
      controller.handleGetForecast({ query: demo === undefined ? {} : { demo } } as unknown as Request, {} as Response);
    return { calls, handle };
  }

  it("aiguille vers le graphe demo uniquement pour demo=true", async () => {
    const { calls, handle } = setup();

    await handle("true");

    expect(calls).toEqual(["demo"]);
  });

  it.each([undefined, "false", "TRUE", "1"])("aiguille vers le graphe reel pour demo=%s", async (value) => {
    const { calls, handle } = setup();

    await handle(value);

    expect(calls).toEqual(["live"]);
  });
});
