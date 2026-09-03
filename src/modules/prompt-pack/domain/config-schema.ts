import { z } from "zod";

import {
  ANIMATION_DURATION_MILLISECONDS,
  BACKGROUND_MODES,
  FONT_PRESET_IDS,
  MOTION_INTENSITIES,
  PACK_MODES,
  REDUCED_MOTION_BEHAVIORS,
  RENDER_QUALITIES,
  RESULT_CARD_POSITIONS,
  RESULT_CARD_WIDTH_PIXELS,
  RESULT_VISIBLE_MILLISECONDS,
  REVEAL_DELAY_MILLISECONDS,
  SELECTION_MODES,
  SELECTION_POLICIES,
  SUPPORTED_LOCALES,
  THEME_IDS,
} from "./constants";

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "色は#RRGGBB形式で指定してください。");
export const packModeSchema = z.enum(PACK_MODES);
export const localeSchema = z.enum(SUPPORTED_LOCALES);
export const selectionModeSchema = z.enum(SELECTION_MODES);
export const selectionPolicySchema = z.enum(SELECTION_POLICIES);
export const themeIdSchema = z.enum(THEME_IDS);
export const fontPresetIdSchema = z.enum(FONT_PRESET_IDS);
export const backgroundModeSchema = z.enum(BACKGROUND_MODES);
export const resultCardPositionSchema = z.enum(RESULT_CARD_POSITIONS);
export const renderQualitySchema = z.enum(RENDER_QUALITIES);
export const motionIntensitySchema = z.enum(MOTION_INTENSITIES);
export const reducedMotionBehaviorSchema = z.enum(REDUCED_MOTION_BEHAVIORS);

export type PackMode = z.infer<typeof packModeSchema>;
export type SupportedLocale = z.infer<typeof localeSchema>;
export type SelectionMode = z.infer<typeof selectionModeSchema>;
export type SelectionPolicy = z.infer<typeof selectionPolicySchema>;
export type ThemeId = z.infer<typeof themeIdSchema>;
export type FontPresetId = z.infer<typeof fontPresetIdSchema>;
export type BackgroundMode = z.infer<typeof backgroundModeSchema>;
export type ResultCardPosition = z.infer<typeof resultCardPositionSchema>;
export type RenderQuality = z.infer<typeof renderQualitySchema>;
export type MotionIntensity = z.infer<typeof motionIntensitySchema>;
export type ReducedMotionBehavior = z.infer<typeof reducedMotionBehaviorSchema>;

export const selectionConfigSchema = z
  .object({
    mode: selectionModeSchema,
    policy: selectionPolicySchema,
    resetWhenExhausted: z.boolean(),
  })
  .strict();

export const appearanceConfigSchema = z
  .object({
    themeId: themeIdSchema,
    background: backgroundModeSchema,
    bodyColor: colorSchema,
    edgeColor: colorSchema,
    textColor: colorSchema,
    accentColor: colorSchema,
    fontPreset: fontPresetIdSchema,
    resultCardPosition: resultCardPositionSchema,
    resultCardMaxWidthPx: z
      .int()
      .min(RESULT_CARD_WIDTH_PIXELS.minimum)
      .max(RESULT_CARD_WIDTH_PIXELS.maximum),
    quality: renderQualitySchema,
  })
  .strict();

export const animationConfigSchema = z
  .object({
    durationMs: z
      .int()
      .min(ANIMATION_DURATION_MILLISECONDS.minimum)
      .max(ANIMATION_DURATION_MILLISECONDS.maximum),
    revealDelayMs: z
      .int()
      .min(REVEAL_DELAY_MILLISECONDS.minimum)
      .max(REVEAL_DELAY_MILLISECONDS.maximum),
    resultVisibleMs: z
      .int()
      .min(RESULT_VISIBLE_MILLISECONDS.minimum)
      .max(RESULT_VISIBLE_MILLISECONDS.maximum)
      .nullable(),
    motionIntensity: motionIntensitySchema,
    reducedMotionBehavior: reducedMotionBehaviorSchema,
    rollSoundEnabled: z.boolean(),
    landingSoundEnabled: z.boolean(),
  })
  .strict();

export const behaviorConfigSchema = z
  .object({
    rollOnLoad: z.boolean(),
    allowOverlayClick: z.boolean(),
    allowKeyboard: z.boolean(),
    keepResultVisible: z.boolean(),
    showCategoryBeforePrompt: z.boolean(),
    targetFps: z.union([z.literal(30), z.literal(60)]),
  })
  .strict();

export type SelectionConfig = z.infer<typeof selectionConfigSchema>;
export type AppearanceConfig = z.infer<typeof appearanceConfigSchema>;
export type AnimationConfig = z.infer<typeof animationConfigSchema>;
export type BehaviorConfig = z.infer<typeof behaviorConfigSchema>;
