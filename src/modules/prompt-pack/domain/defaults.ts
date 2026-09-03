import { appearancePresetForTheme } from "./theme";

import type { AppearanceConfig, AnimationConfig, BehaviorConfig } from "./config-schema";

export const DEFAULT_THEME_ID: AppearanceConfig["themeId"] = "idol_pop";

export const defaultAppearance: AppearanceConfig = {
  themeId: DEFAULT_THEME_ID,
  ...appearancePresetForTheme(DEFAULT_THEME_ID),
  fontPreset: "system_sans",
  resultCardPosition: "bottom",
  resultCardMaxWidthPx: 840,
  quality: "balanced",
};

export const defaultAnimation: AnimationConfig = {
  durationMs: 1_800,
  revealDelayMs: 180,
  resultVisibleMs: null,
  motionIntensity: "medium",
  reducedMotionBehavior: "respect_system",
  rollSoundEnabled: true,
  landingSoundEnabled: true,
};

export const defaultBehavior: BehaviorConfig = {
  rollOnLoad: false,
  allowOverlayClick: false,
  allowKeyboard: false,
  keepResultVisible: true,
  showCategoryBeforePrompt: true,
  targetFps: 60,
};
