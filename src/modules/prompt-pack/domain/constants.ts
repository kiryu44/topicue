export const PACK_SCHEMA_VERSION = 1 as const;
export const PACK_EXPORT_FORMAT = "stream-prompt-dice" as const;
export const PACK_FILE_MAX_BYTES = 1_048_576;
export const DECK_FACE_COUNT = 6;
export const MIN_DIRECT_FACE_COUNT = 3;
export const MAX_DIE_FACE_COUNT = 20;
export const MAX_PROMPTS_PER_FACE = 100;
export const MAX_PROMPTS_PER_PACK = 600;

export const PACK_MODES = ["direct", "deck"] as const;
export const SUPPORTED_LOCALES = ["ja-JP", "en-US"] as const;
export const SELECTION_MODES = [
  "independent",
  "no_immediate_repeat",
  "shuffle_bag",
  "elimination",
] as const;
export const SELECTION_POLICIES = ["face_uniform", "prompt_uniform"] as const;
export const THEME_IDS = [
  "idol_pop",
  "cozy_pastel",
  "cyber_navy",
  "variety_show",
  "dark_minimal",
  "mystery",
] as const;
export const FONT_PRESET_IDS = ["system_sans", "rounded", "gothic", "mincho", "monospace"] as const;
export const BACKGROUND_MODES = ["transparent", "dimmed"] as const;
export const RESULT_CARD_POSITIONS = ["top", "center", "bottom"] as const;
export const RENDER_QUALITIES = ["low", "balanced", "high"] as const;
export const MOTION_INTENSITIES = ["low", "medium", "high"] as const;
export const REDUCED_MOTION_BEHAVIORS = [
  "respect_system",
  "always_reduce",
  "never_reduce",
] as const;
export const SUPPORTED_FRAME_RATES = [30, 60] as const;

export const SUGGESTED_DURATION_SECONDS = { minimum: 15, maximum: 3_600 } as const;
export const DEFAULT_SUGGESTED_DURATION_SECONDS = 120;
export const RESULT_CARD_WIDTH_PIXELS = { minimum: 280, maximum: 1_600 } as const;
export const ANIMATION_DURATION_MILLISECONDS = { minimum: 300, maximum: 10_000 } as const;
export const REVEAL_DELAY_MILLISECONDS = { minimum: 0, maximum: 5_000 } as const;
export const RESULT_VISIBLE_MILLISECONDS = { minimum: 1_000, maximum: 600_000 } as const;
export const DEFAULT_TIMED_RESULT_VISIBLE_MS = 10_000;

export const DIRECT_FACE_COUNTS: ReadonlyArray<number> = [
  ...Array(MAX_DIE_FACE_COUNT - MIN_DIRECT_FACE_COUNT + 1).keys(),
].map((index) => index + MIN_DIRECT_FACE_COUNT);
