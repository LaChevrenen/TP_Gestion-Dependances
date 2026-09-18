import { describe, expect, it } from "vitest";
import type { Coordinates } from "../../src/domain/Coordinates.js";
import { AddressNotFoundError } from "../../src/domain/errors/AddressNotFoundError.js";
import type { Geocoder } from "../../src/domain/ports/Geocoder.js";

/**
 * Fixtures fournies par chaque fournisseur : elles seules connaissent le format
 * d'API (query param, forme du JSON, etc.). Le contrat n'y touche jamais.
 */
export interface GeocoderContractFixtures {
  /** Simule une reponse contenant les coordonnees donnees pour la prochaine requete. */
  mockValidAddress(address: string, coordinates: Coordinates): void;
  /** Simule une reponse "aucun resultat" (structurellement vide) pour la prochaine requete. */
  mockNotFound(): void;
  /** La valeur d'adresse effectivement envoyee lors de la derniere requete interceptee. */
  getSentQuery(): string | undefined;
}

export function runGeocoderContract(
  name: string,
  factory: () => Geocoder,
  fixtures: GeocoderContractFixtures
): void {
  describe(`Contrat Geocoder — ${name}`, () => {
    it("adresse valide -> renvoie des Coordinates du domaine", async () => {
      const coordinates: Coordinates = { latitude: 45.7578, longitude: 4.832 };
      fixtures.mockValidAddress("Lyon", coordinates);

      const result = await factory().geocode("Lyon");

      expect(result).toEqual(coordinates);
    });

    it("adresse introuvable -> AddressNotFoundError", async () => {
      fixtures.mockNotFound();

      await expect(factory().geocode("Nulle part improbable 12345")).rejects.toBeInstanceOf(
        AddressNotFoundError
      );
    });

    it("reponse structurellement vide -> AddressNotFoundError", async () => {
      fixtures.mockNotFound();

      await expect(factory().geocode("Une adresse quelconque")).rejects.toBeInstanceOf(
        AddressNotFoundError
      );
    });

    it("adresse accentuee -> encodage correct de la requete et resultat correct", async () => {
      const address = "Saint-Étienne";
      const coordinates: Coordinates = { latitude: 45.4397, longitude: 4.3872 };
      fixtures.mockValidAddress(address, coordinates);

      const result = await factory().geocode(address);

      expect(result).toEqual(coordinates);
      expect(fixtures.getSentQuery()).toBe(address);
    });
  });
}
