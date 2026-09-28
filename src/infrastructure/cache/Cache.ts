// Asynchrone des le depart : passer a Redis (ou autre) ne changera pas cette interface.
export interface Cache<V> {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V): Promise<void>;
}
