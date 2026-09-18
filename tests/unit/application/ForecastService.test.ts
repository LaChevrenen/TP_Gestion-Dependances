import { describe, expect, it } from "vitest";
import { ForecastService } from "../../../src/application/ForecastService.js";
import { AddressNotFoundError } from "../../../src/domain/errors/AddressNotFoundError.js";
import { ProviderUnavailableError } from "../../../src/domain/errors/ProviderUnavailableError.js";
import { FakeGeocoder } from "../../fakes/FakeGeocoder.js";
import { FakeWeatherProvider } from "../../fakes/FakeWeatherProvider.js";

describe("ForecastService", () => {
  it("retourne une prevision en combinant geocodage et meteo (cas nominal)", async () => {
    const geocoder = new FakeGeocoder({ latitude: 44.13, longitude: 4.08 });
    const weatherProvider = new FakeWeatherProvider({
      time: ["2024-01-01T00:00"],
      shortwaveRadiation: [0],
    });
    const service = new ForecastService(geocoder, weatherProvider);

    const forecast = await service.getForecast("Ales");

    expect(forecast).toEqual({
      location: {
        address: "Ales",
        coordinates: { latitude: 44.13, longitude: 4.08 },
      },
      hourly: {
        time: ["2024-01-01T00:00"],
        shortwaveRadiation: [0],
      },
    });
  });

  it("propage AddressNotFoundError quand le geocodage echoue a trouver l'adresse", async () => {
    const geocoder = new FakeGeocoder(new AddressNotFoundError("Nulle part"));
    const weatherProvider = new FakeWeatherProvider({ time: [], shortwaveRadiation: [] });
    const service = new ForecastService(geocoder, weatherProvider);

    await expect(service.getForecast("Nulle part")).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it("propage ProviderUnavailableError quand le fournisseur meteo echoue", async () => {
    const geocoder = new FakeGeocoder({ latitude: 44.13, longitude: 4.08 });
    const weatherProvider = new FakeWeatherProvider(new ProviderUnavailableError("open-meteo"));
    const service = new ForecastService(geocoder, weatherProvider);

    await expect(service.getForecast("Ales")).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
