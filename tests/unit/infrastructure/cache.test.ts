import { describe, expect, it } from "vitest";
import type { Coordinates } from "../../../src/domain/Coordinates.js";
import { ProviderUnavailableError } from "../../../src/domain/errors/ProviderUnavailableError.js";
import type { Geocoder } from "../../../src/domain/ports/Geocoder.js";
import { CachingGeocoder } from "../../../src/infrastructure/cache/CachingGeocoder.js";
import { InMemoryCache } from "../../../src/infrastructure/cache/InMemoryCache.js";

const ALES: Coordinates = { latitude: 44.1279, longitude: 4.0817 };

// Fake ecrit a la main : compte les appels "reseau" et peut echouer N fois d'abord.
class CountingGeocoder implements Geocoder {
  calls = 0;
  constructor(private failuresLeft = 0) {}

  async geocode(): Promise<Coordinates> {
    this.calls += 1;
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new ProviderUnavailableError("fake");
    }
    return ALES;
  }
}

function cache(now = () => 0, options = { ttlMs: 1000, maxEntries: 10 }) {
  return new InMemoryCache<Coordinates>({ ...options, now });
}

describe("CachingGeocoder", () => {
  it("ne fait qu'un seul appel reel pour deux appels sur la meme adresse", async () => {
    const delegate = new CountingGeocoder();
    const geocoder = new CachingGeocoder(delegate, cache());

    const first = await geocoder.geocode("Alès");
    const second = await geocoder.geocode("Alès");

    expect(second).toEqual(first);
    expect(delegate.calls).toBe(1);
  });

  it("normalise la cle (espaces et casse) mais distingue deux adresses differentes", async () => {
    const delegate = new CountingGeocoder();
    const geocoder = new CachingGeocoder(delegate, cache());

    await geocoder.geocode("Saint-Étienne");
    await geocoder.geocode("  saint-étienne ");
    expect(delegate.calls).toBe(1);

    await geocoder.geocode("Alès");
    expect(delegate.calls).toBe(2);
  });

  it("ne met pas en cache un echec : l'appel suivant retente le fournisseur", async () => {
    const delegate = new CountingGeocoder(1);
    const geocoder = new CachingGeocoder(delegate, cache());

    await expect(geocoder.geocode("Alès")).rejects.toBeInstanceOf(ProviderUnavailableError);
    await expect(geocoder.geocode("Alès")).resolves.toEqual(ALES);
    expect(delegate.calls).toBe(2);
  });

  it("deux instances ne partagent aucun etat (pas de static)", async () => {
    const delegate = new CountingGeocoder();

    await new CachingGeocoder(delegate, cache()).geocode("Alès");
    await new CachingGeocoder(delegate, cache()).geocode("Alès");

    expect(delegate.calls).toBe(2);
  });
});

describe("InMemoryCache", () => {
  it("expire les entrees apres le TTL (horloge injectee)", async () => {
    let now = 0;
    const store = cache(() => now, { ttlMs: 1000, maxEntries: 10 });
    await store.set("a", ALES);

    now = 999;
    expect(await store.get("a")).toEqual(ALES);
    now = 1000;
    expect(await store.get("a")).toBeUndefined();
  });

  it("evince la plus ancienne entree au-dela de maxEntries", async () => {
    const store = cache(() => 0, { ttlMs: 1000, maxEntries: 2 });

    await store.set("a", ALES);
    await store.set("b", ALES);
    await store.set("c", ALES);

    expect(await store.get("a")).toBeUndefined();
    expect(await store.get("b")).toEqual(ALES);
    expect(await store.get("c")).toEqual(ALES);
  });
});
