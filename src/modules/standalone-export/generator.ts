import type { PromptPackConfigV1 } from "@/modules/prompt-pack/domain/schema";
import type { JsonPrimitive } from "@/shared/json";

import { publicStandaloneConfigSchema, type PublicStandaloneConfigV1 } from "./public-schema";
import { standaloneStyles } from "./standalone-styles";

export const publicStandaloneConfig = (config: PromptPackConfigV1): PublicStandaloneConfigV1 => {
  return publicStandaloneConfigSchema.parse({
    schemaVersion: config.schemaVersion,
    mode: config.mode,
    name: config.name,
    locale: config.locale,
    faces: config.faces.map((face) => ({
      id: face.id,
      label: face.label,
      ...(face.shortLabel === undefined ? {} : { shortLabel: face.shortLabel }),
      enabled: face.enabled,
      prompts: face.prompts.map((prompt) => ({
        id: prompt.id,
        audienceTitle: prompt.audienceTitle,
        ...(prompt.audienceBody === undefined ? {} : { audienceBody: prompt.audienceBody }),
        enabled: prompt.enabled,
      })),
    })),
    selection: {
      mode: config.selection.mode,
      policy: config.selection.policy,
      resetWhenExhausted: config.selection.resetWhenExhausted,
    },
    appearance: {
      themeId: config.appearance.themeId,
      background: config.appearance.background,
      bodyColor: config.appearance.bodyColor,
      edgeColor: config.appearance.edgeColor,
      textColor: config.appearance.textColor,
      accentColor: config.appearance.accentColor,
      fontPreset: config.appearance.fontPreset,
      resultCardPosition: config.appearance.resultCardPosition,
      resultCardMaxWidthPx: config.appearance.resultCardMaxWidthPx,
      quality: config.appearance.quality,
    },
    animation: {
      durationMs: config.animation.durationMs,
      revealDelayMs: config.animation.revealDelayMs,
      resultVisibleMs: config.animation.resultVisibleMs,
      motionIntensity: config.animation.motionIntensity,
      reducedMotionBehavior: config.animation.reducedMotionBehavior,
      rollSoundEnabled: config.animation.rollSoundEnabled,
      landingSoundEnabled: config.animation.landingSoundEnabled,
    },
    behavior: {
      rollOnLoad: config.behavior.rollOnLoad,
      allowOverlayClick: config.behavior.allowOverlayClick,
      allowKeyboard: config.behavior.allowKeyboard,
      keepResultVisible: config.behavior.keepResultVisible,
      showCategoryBeforePrompt: config.behavior.showCategoryBeforePrompt,
      targetFps: config.behavior.targetFps,
    },
  });
};

export const safeSerialize = (value: JsonPrimitive | object): string => {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
};

export const generateStandaloneHtml = (
  config: PromptPackConfigV1,
  bundledRuntime: string,
): string => {
  const publicConfig = publicStandaloneConfig(config);
  return `<!doctype html>
<html lang="${config.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeText(config.name)}</title>
<style>${standaloneStyles(config.appearance)}</style>
</head>
<body><main id="app" aria-live="polite"></main>
<script>window.__PROMPT_DICE_CONFIG__=${safeSerialize(publicConfig)};</script>
<script>${bundledRuntime}</script>
</body></html>`;
};

const escapeText = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
};
