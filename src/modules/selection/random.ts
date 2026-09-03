import type { RandomSource } from "./types";

export class BrowserCryptoRandomSource implements RandomSource {
  constructor(private readonly cryptoSource: Crypto = globalThis.crypto) {}

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
      throw new RangeError("maxExclusive is outside the supported range");
    }
    const range = 0x1_0000_0000;
    const limit = range - (range % maxExclusive);
    const buffer = new Uint32Array(1);
    let value: number;
    do {
      this.cryptoSource.getRandomValues(buffer);
      value = buffer[0] ?? 0;
    } while (value >= limit);
    return value % maxExclusive;
  }

  bytes(length: number): Uint8Array {
    return this.cryptoSource.getRandomValues(new Uint8Array(length));
  }
}

export const randomHexSeed = (random: Pick<RandomSource, "bytes">, length = 16): string => {
  return Array.from(random.bytes(length), (value) => value.toString(16).padStart(2, "0")).join("");
};

export class SeededRandomSource implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e37_79b9;
  }

  private nextUint32(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0)
      throw new RangeError("maxExclusive must be positive");
    return this.nextUint32() % maxExclusive;
  }

  bytes(length: number): Uint8Array {
    return Uint8Array.from({ length }, () => this.nextUint32() & 0xff);
  }
}
