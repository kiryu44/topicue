import { describe, expect, it } from "vitest";

import {
  resolveStandaloneKeyCommand,
  STANDALONE_KEY_COMMAND,
} from "@/modules/standalone-export/keyboard";

describe("standalone keyboard compatibility", () => {
  it.each([
    {
      input: { code: "Space", key: " ", keyCode: 32 },
      expected: STANDALONE_KEY_COMMAND.roll,
    },
    {
      input: { code: "NumpadEnter", key: "Enter", keyCode: 13 },
      expected: STANDALONE_KEY_COMMAND.roll,
    },
    {
      input: { code: "F7", key: "h", keyCode: 72 },
      expected: STANDALONE_KEY_COMMAND.history,
    },
    {
      input: { code: "", key: "Unidentified", keyCode: 82 },
      expected: STANDALONE_KEY_COMMAND.reset,
    },
    {
      input: { code: "", key: "Esc", keyCode: 27 },
      expected: STANDALONE_KEY_COMMAND.cancel,
    },
    {
      input: { code: "", key: "Tab", keyCode: 9 },
      expected: STANDALONE_KEY_COMMAND.tab,
    },
  ])("normalizes browser and OBS key data: $expected", ({ input, expected }) => {
    expect(resolveStandaloneKeyCommand(input)).toBe(expected);
  });

  it("ignores keys without an assigned operation", () => {
    expect(resolveStandaloneKeyCommand({ code: "KeyA", key: "a", keyCode: 65 })).toBeUndefined();
  });
});
