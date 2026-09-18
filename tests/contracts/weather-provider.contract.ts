import { describe, expect, it } from "vitest";
import type { Coordinates } from "../../src/domain/Coordinates.js";
import type { WeatherMeasurement } from "../../src/domain/Forecast.js";
import { ProviderUnavailableError } from "../../src/domain/errors/ProviderUnavailableError.js";
import type { WeatherProvider } from "../../src/domain/ports/WeatherProvider.js";

const COORDINATES: Coordinates = { latitude: 45.7578, longitude: 4.832 };

/**
 * Fixtures fournies par chaque fournisseur : elles seules connaissent le format
 * d'API (forme du JSON, code HTTP representatif d'une panne, etc.). Le contrat
 * n'y touche jamais.
 */
export interface WeatherProviderContractFixtures {
  /** Simule une reponse bien formee avec au moins un point de mesure. */
  mockValidForecast(): void;
  /** Simule une reponse structurellement vide (aucune serie temporelle). */
  mockEmpty(): void;
  /** Simule une reponse malformee (champs requis manquants). */
  mockMalformed(): void;
  /**
   * Simule une erreur HTTP representative de ce fournisseur (ex. 403 pour MET
   * Norway, 5xx generique pour Open-Meteo) — le choix du code appartient a la
   * fixture, pas au contrat.
   */
  mockHttpError(): void;
  /** Le User-Agent effectivement envoye lors de la derniere requete interceptee. */
  getSentUserAgent(): string | null | undefined;
}

export function runWeatherProviderContract(
  name: string,
  factory: () => WeatherProvider,
  fixtures: WeatherProviderContractFixtures
): void {
  describe(`Contrat WeatherProvider — ${name}`, () => {
    it("coordonnees valides -> WeatherForecast avec au moins un HourlyPoint mesure", async () => {
      fixtures.mockValidForecast();

      const forecast = await factory().getHourlyForecast(COORDINATES);

      expect(typeof forecast.timezone).toBe("string");
      expect(forecast.timezone.length).toBeGreaterThan(0);
      expect(Array.isArray(forecast.hourly)).toBe(true);
      expect(forecast.hourly.length).toBeGreaterThan(0);

      const [point] = forecast.hourly;
      expect(typeof point?.time).toBe("string");

      const measurements = [point?.temperature, point?.shortwaveRadiation, point?.windSpeed].filter(
        (measurement): measurement is WeatherMeasurement => measurement !== undefined
      );
      expect(measurements.length).toBeGreaterThan(0);
      for (const measurement of measurements) {
        expect(typeof measurement.value).toBe("number");
        expect(typeof measurement.unit).toBe("string");
        expect(measurement.unit.length).toBeGreaterThan(0);
      }
    });

    it("reponse vide / sans serie temporelle -> ProviderUnavailableError", async () => {
      fixtures.mockEmpty();

      await expect(factory().getHourlyForecast(COORDINATES)).rejects.toBeInstanceOf(
        ProviderUnavailableError
      );
    });

    it("reponse malformee -> ProviderUnavailableError", async () => {
      fixtures.mockMalformed();

      await expect(factory().getHourlyForecast(COORDINATES)).rejects.toBeInstanceOf(
        ProviderUnavailableError
      );
    });

    it("erreur HTTP -> ProviderUnavailableError, sans detail d'implementation dans le message domaine", async () => {
      fixtures.mockHttpError();

      let caught: unknown;
      try {
        await factory().getHourlyForecast(COORDINATES);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(ProviderUnavailableError);
      const message = (caught as ProviderUnavailableError).message;
      // Le message domaine reste generique : pas d'URL, pas de code de statut brut.
      expect(message).not.toMatch(/https?:\/\//i);
      expect(message).not.toMatch(/\b[1-5]\d{2}\b/);
    });

    it("envoie un User-Agent identifiant l'application sur chaque requete", async () => {
      fixtures.mockValidForecast();

      await factory().getHourlyForecast(COORDINATES);

      expect(fixtures.getSentUserAgent()).toBeTruthy();
    });
  });
}
