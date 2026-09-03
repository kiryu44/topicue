import { expect, it } from "vitest";

import { selectPrompt } from "@/modules/selection/engine";
import { SeededRandomSource } from "@/modules/selection/random";
import { initialSelectionState } from "@/modules/selection/types";

import { makeDeck } from "../fixtures/pack";

it("passes a deterministic 100,000 roll statistical sanity check", () => {
  const config = makeDeck(1);
  const random = new SeededRandomSource(0x51e_c710);
  let state = initialSelectionState();
  const counts = new Map<string, number>();
  for (let index = 0; index < 100_000; index += 1) {
    const result = selectPrompt({ config, state, random });
    state = result.nextState;
    counts.set(result.promptId, (counts.get(result.promptId) ?? 0) + 1);
  }
  expect(counts.size).toBe(6);
  for (const count of counts.values()) {
    expect(count).toBeGreaterThan(15_500);
    expect(count).toBeLessThan(17_900);
  }
});
