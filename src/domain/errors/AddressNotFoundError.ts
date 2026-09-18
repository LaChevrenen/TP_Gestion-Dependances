export class AddressNotFoundError extends Error {
  constructor(public readonly address: string) {
    super(`Address not found: ${address}`);
    this.name = "AddressNotFoundError";
  }
}
