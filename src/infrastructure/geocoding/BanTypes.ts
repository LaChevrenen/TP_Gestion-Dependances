export interface BanFeature {
  readonly geometry?: {
    readonly coordinates?: readonly number[];
  };
}

export interface BanResponse {
  readonly features?: readonly BanFeature[];
}
