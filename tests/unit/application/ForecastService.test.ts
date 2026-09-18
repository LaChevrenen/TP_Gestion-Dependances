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
      timezone: "Europe/Paris",
      hourly: [
        { time: "2024-01-01T00:00", shortwaveRadiation: { value: 0, unit: "W/m²" } },
      ],
    });
    const service = new ForecastService(geocoder, weatherProvider);

    const forecast = await service.getForecast("Ales");

    expect(forecast).toEqual({
      location: {
        address: "Ales",
        coordinates: { latitude: 44.13, longitude: 4.08 },
      },
      timezone: "Europe/Paris",
      hourly: [
        { time: "2024-01-01T00:00", shortwaveRadiation: { value: 0, unit: "W/m²" } },
      ],
    });
  });

  it("retourne une prevision meme quand le provider ne remplit qu'une partie des mesures", async () => {
    const geocoder = new FakeGeocoder({ latitude: 60.39, longitude: 5.32 });
    const weatherProvider = new FakeWeatherProvider({
      timezone: "UTC",
      hourly: [
        { time: "2024-01-01T00:00", temperature: { value: 4.2, unit: "celsius" } },
      ],
    });
    const service = new ForecastService(geocoder, weatherProvider);

    const forecast = await service.getForecast("Bergen");

    expect(forecast.hourly[0]).toEqual({
      time: "2024-01-01T00:00",
      temperature: { value: 4.2, unit: "celsius" },
    });
    expect(forecast.hourly[0]).not.toHaveProperty("shortwaveRadiation");
  });

  it("propage AddressNotFoundError quand le geocodage echoue a trouver l'adresse", async () => {
    const geocoder = new FakeGeocoder(new AddressNotFoundError("Nulle part"));
    const weatherProvider = new FakeWeatherProvider({ timezone: "UTC", hourly: [] });
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
