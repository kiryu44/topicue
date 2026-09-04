export const STANDALONE_KEY_COMMAND = {
  cancel: "cancel",
  history: "history",
  reset: "reset",
  roll: "roll",
  tab: "tab",
} as const;

export type StandaloneKeyCommand =
  (typeof STANDALONE_KEY_COMMAND)[keyof typeof STANDALONE_KEY_COMMAND];

export interface StandaloneKeyboardInput {
  code: string;
  key: string;
  keyCode: number;
}

const commandFromKey = (key: string): StandaloneKeyCommand | undefined => {
  const normalizedKey = key.toLowerCase();
  if (key === " " || normalizedKey === "space" || normalizedKey === "spacebar") {
    return STANDALONE_KEY_COMMAND.roll;
  }
  if (normalizedKey === "enter") return STANDALONE_KEY_COMMAND.roll;
  if (normalizedKey === "h") return STANDALONE_KEY_COMMAND.history;
  if (normalizedKey === "r") return STANDALONE_KEY_COMMAND.reset;
  if (normalizedKey === "escape" || normalizedKey === "esc") {
    return STANDALONE_KEY_COMMAND.cancel;
  }
  if (normalizedKey === "tab") return STANDALONE_KEY_COMMAND.tab;
  return undefined;
};

const commandFromCode = (code: string): StandaloneKeyCommand | undefined => {
  if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
    return STANDALONE_KEY_COMMAND.roll;
  }
  if (code === "KeyH") return STANDALONE_KEY_COMMAND.history;
  if (code === "KeyR") return STANDALONE_KEY_COMMAND.reset;
  if (code === "Escape") return STANDALONE_KEY_COMMAND.cancel;
  if (code === "Tab") return STANDALONE_KEY_COMMAND.tab;
  return undefined;
};

const commandFromLegacyKeyCode = (keyCode: number): StandaloneKeyCommand | undefined => {
  if (keyCode === 13 || keyCode === 32) return STANDALONE_KEY_COMMAND.roll;
  if (keyCode === 72) return STANDALONE_KEY_COMMAND.history;
  if (keyCode === 82) return STANDALONE_KEY_COMMAND.reset;
  if (keyCode === 27) return STANDALONE_KEY_COMMAND.cancel;
  if (keyCode === 9) return STANDALONE_KEY_COMMAND.tab;
  return undefined;
};

export const resolveStandaloneKeyCommand = ({
  code,
  key,
  keyCode,
}: StandaloneKeyboardInput): StandaloneKeyCommand | undefined =>
  commandFromKey(key) ?? commandFromCode(code) ?? commandFromLegacyKeyCode(keyCode);
