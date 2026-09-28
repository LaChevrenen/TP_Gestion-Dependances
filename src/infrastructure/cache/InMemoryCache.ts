import type { Cache } from "./Cache.js";

export interface InMemoryCacheOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly now: () => number;
}

// Etat porte par l'instance (jamais par le module) ; l'horloge est injectee, pas globale.
export class InMemoryCache<V> implements Cache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly options: InMemoryCacheOptions) {}

  async get(key: string): Promise<V | undefined> {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= this.options.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry?.value;
  }

  async set(key: string, value: V): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.options.now() + this.options.ttlMs });
    if (this.entries.size > this.options.maxEntries) {
      this.entries.delete(this.entries.keys().next().value as string);
    }
  }
}
