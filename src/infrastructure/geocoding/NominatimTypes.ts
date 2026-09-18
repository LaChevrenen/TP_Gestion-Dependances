export interface NominatimResult {
  readonly lat: string;
  readonly lon: string;
}

export type NominatimResponse = readonly NominatimResult[];
