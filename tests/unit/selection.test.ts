import { describe, expect, it } from "vitest";

import { selectPrompt } from "@/modules/selection/engine";
import { SeededRandomSource } from "@/modules/selection/random";
import { initialSelectionState, SelectionError } from "@/modules/selection/types";

import { makeDeck } from "../fixtures/pack";

describe("selection engine", () => {
  it("does not mutate input and excludes disabled candidates", () => {
    const config = makeDeck();
    const disabled = config.faces[0]?.prompts[0];
    if (disabled === undefined) throw new Error("fixture");
    disabled.enabled = false;
    const state = initialSelectionState();
    const frozen = JSON.stringify(state);
    const result = selectPrompt({ config, state, random: new SeededRandomSource(42) });
    expect(result.promptId).not.toBe(disabled.id);
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("prevents an immediate repeat when more than one prompt exists", () => {
    const config = makeDeck();
    config.selection.mode = "no_immediate_repeat";
    const random = new SeededRandomSource(7);
    const first = selectPrompt({ config, state: initialSelectionState(), random });
    const second = selectPrompt({ config, state: first.nextState, random });
    expect(second.promptId).not.toBe(first.promptId);
  });

  it("allows the only candidate in no-repeat mode", () => {
    const config = makeDeck(1);
    config.faces.slice(1).forEach((face) => {
      face.enabled = false;
    });
    config.selection.mode = "no_immediate_repeat";
    const random = new SeededRandomSource(9);
    const first = selectPrompt({ config, state: initialSelectionState(), random });
    const second = selectPrompt({ config, state: first.nextState, random });
    expect(second.promptId).toBe(first.promptId);
  });

  it("walks a shuffle bag once without duplicates and restores serialized state", () => {
    const config = makeDeck(1);
    config.selection = { mode: "shuffle_bag", policy: "prompt_uniform", resetWhenExhausted: false };
    const random = new SeededRandomSource(101);
    let state = initialSelectionState();
    const selected = new Set<string>();
    for (let index = 0; index < 6; index += 1) {
      const result = selectPrompt({ config, state, random });
      selected.add(result.promptId);
      state = JSON.parse(JSON.stringify(result.nextState)) as typeof state;
    }
    expect(selected.size).toBe(6);
    expect(() => selectPrompt({ config, state, random })).toThrowError(SelectionError);
  });

  it("eliminates used prompts until reset", () => {
    const config = makeDeck(1);
    config.selection.mode = "elimination";
    let state = initialSelectionState();
    const random = new SeededRandomSource(55);
    for (let index = 0; index < 6; index += 1)
      state = selectPrompt({ config, state, random }).nextState;
    expect(() => selectPrompt({ config, state, random })).toThrow("お題をすべて使用");
  });

  it("shows the policy difference for uneven face sizes", () => {
    const config = makeDeck(1);
    const firstFace = config.faces[0];
    if (firstFace === undefined) throw new Error("fixture");
    firstFace.prompts.push(
      ...makeDeck(5)
        .faces[0]!.prompts.slice(1)
        .map((prompt) => ({ ...prompt, id: crypto.randomUUID() })),
    );
    config.faces.slice(2).forEach((face) => {
      face.enabled = false;
    });
    const sample = (policy: "face_uniform" | "prompt_uniform") => {
      config.selection.policy = policy;
      const random = new SeededRandomSource(1234);
      let state = initialSelectionState();
      let firstCount = 0;
      for (let index = 0; index < 10_000; index += 1) {
        const result = selectPrompt({ config, state, random });
        state = result.nextState;
        if (result.faceId === firstFace.id) firstCount += 1;
      }
      return firstCount;
    };
    expect(sample("face_uniform")).toBeGreaterThan(4_500);
    expect(sample("face_uniform")).toBeLessThan(5_500);
    expect(sample("prompt_uniform")).toBeGreaterThan(7_500);
  });
});
