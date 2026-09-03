import { describe, expect, it } from "vitest";

import { parseStoredPackRecord } from "@/modules/prompt-pack/infrastructure/browser-pack-store";

import { makeDeck } from "../fixtures/pack";

const timestamp = "2026-09-01T00:00:00.000Z";
const packId = "00000000-0000-4000-8000-000000000001";

describe("browser Pack storage validation", () => {
  it("parses the current storage record", () => {
    const existingCyberPack = makeDeck();
    existingCyberPack.appearance = {
      ...existingCyberPack.appearance,
      themeId: "cyber_navy",
      bodyColor: "#1C2338",
      edgeColor: "#7D6CFF",
      textColor: "#F4F7FF",
      accentColor: "#63D8FF",
    };
    const stored = parseStoredPackRecord({
      id: packId,
      storageVersion: 1,
      pack: existingCyberPack,
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 1,
    });

    expect(stored.id).toBe(packId);
    expect(stored.revision).toBe(1);
    expect(stored.config.faces).toHaveLength(6);
    expect(stored.config.appearance.themeId).toBe("cyber_navy");
  });

  it("rejects the retired config record", () => {
    expect(() =>
      parseStoredPackRecord({
        id: packId,
        config: makeDeck(),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ).toThrow("基本情報");
  });

  it("rejects unsupported or malformed storage records", () => {
    expect(() => parseStoredPackRecord({ storageVersion: 99 })).toThrow("基本情報");
    expect(() =>
      parseStoredPackRecord({
        id: packId,
        storageVersion: 99,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ).toThrow("未対応");
  });
});
