import { afterEach, describe, expect, it } from "vitest";
import { buildContainer } from "../../src/container.js";
import { ConfigurationError } from "../../src/config/ConfigurationError.js";
import { ForecastController } from "../../src/presentation/ForecastController.js";
import { TYPES } from "../../src/types.js";

const originalEnv = { ...process.env };

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("buildContainer (selection de fournisseur)", () => {
  const validCombinations: ReadonlyArray<
    readonly [geocoderProvider: string, weatherProvider: string, metNorwayUserAgent: string | undefined]
  > = [
    ["nominatim", "open-meteo", undefined],
    ["nominatim", "met-norway", "TP2-MeteoApi/1.0 test@example.com"],
    ["ban", "open-meteo", undefined],
    ["ban", "met-norway", "TP2-MeteoApi/1.0 test@example.com"],
  ];

  it.each(validCombinations)(
    "demarre avec GEOCODER_PROVIDER=%s et WEATHER_PROVIDER=%s",
    (geocoderProvider, weatherProvider, metNorwayUserAgent) => {
      setEnv({
        GEOCODER_PROVIDER: geocoderProvider,
        WEATHER_PROVIDER: weatherProvider,
        MET_NORWAY_USER_AGENT: metNorwayUserAgent,
      });

      expect(() => {
        const container = buildContainer();
        container.get<ForecastController>(TYPES.ForecastController);
      }).not.toThrow();
    }
  );

  it("echoue proprement pour un GEOCODER_PROVIDER inconnu", () => {
    setEnv({ GEOCODER_PROVIDER: "bogus" });

    expect(() => buildContainer()).toThrow(ConfigurationError);
    expect(() => buildContainer()).toThrow(/GEOCODER_PROVIDER/);
  });

  it("echoue proprement pour un WEATHER_PROVIDER inconnu", () => {
    setEnv({ WEATHER_PROVIDER: "bogus" });

    expect(() => buildContainer()).toThrow(ConfigurationError);
    expect(() => buildContainer()).toThrow(/WEATHER_PROVIDER/);
  });

  it("echoue si MET_NORWAY_USER_AGENT est absent alors que WEATHER_PROVIDER=met-norway", () => {
    setEnv({ WEATHER_PROVIDER: "met-norway", MET_NORWAY_USER_AGENT: undefined });

    expect(() => buildContainer()).toThrow(ConfigurationError);
    expect(() => buildContainer()).toThrow(/MET_NORWAY_USER_AGENT/);
  });

  it("n'exige pas MET_NORWAY_USER_AGENT quand un autre fournisseur meteo est selectionne", () => {
    setEnv({ WEATHER_PROVIDER: "open-meteo", MET_NORWAY_USER_AGENT: undefined });

    expect(() => buildContainer()).not.toThrow();
  });
});
