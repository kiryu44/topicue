import type { PromptPackConfigV1 } from "@/modules/prompt-pack/domain/schema";
import { themeCssVariables } from "@/modules/prompt-pack/domain/theme";
import type { JsonPrimitive } from "@/shared/json";

import { publicStandaloneConfigSchema, type PublicStandaloneConfigV1 } from "./public-schema";

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
  const cardPlacement =
    config.appearance.resultCardPosition === "top"
      ? "top:8%;transform-origin:center top"
      : config.appearance.resultCardPosition === "center"
        ? "top:50%;translate:0 -50%;transform-origin:center"
        : "bottom:8%;transform-origin:center bottom";
  const pageBackground = config.appearance.background === "dimmed" ? "#050713cc" : "transparent";
  const themeVariables = Object.entries(themeCssVariables(config.appearance))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return `<!doctype html>
<html lang="${config.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeText(config.name)}</title>
<style>:root{${themeVariables}}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${pageBackground};color:var(--topicue-text);font-family:var(--topicue-font)}*{box-sizing:border-box}#app{width:100%;height:100%;display:grid;place-items:center;background:transparent}.standalone-stage{position:relative;width:min(96vw,1100px);height:min(96vh,900px);min-height:360px;display:grid;place-items:center;outline:none;container-type:inline-size}.standalone-renderer{position:absolute;inset:0;transition:filter .2s ease}.standalone-renderer canvas{display:block;width:100%;height:100%}#app[data-visual-state=rolling] .standalone-renderer{filter:drop-shadow(0 0 18px var(--topicue-glow))}#app[data-visual-state=landing] .standalone-renderer{animation:topicue-land .22s ease-out}#app[data-visual-state=result] .standalone-renderer{filter:saturate(.88) brightness(.82) drop-shadow(0 0 8px var(--topicue-glow))}.standalone-status{position:absolute;z-index:3;top:2%;left:50%;translate:-50% 0;padding:.5rem .85rem;border:1px solid var(--topicue-category-border);border-radius:999px;background:var(--topicue-category-bg);color:var(--topicue-category-text);font-weight:800}.standalone-card,.standalone-resume{position:absolute;z-index:2;left:5%;right:5%;${cardPlacement};width:min(90%,var(--topicue-card-max-width));margin:auto;padding:clamp(18px,3vw,36px);border:2px solid var(--topicue-card-border);border-radius:24px;background:var(--topicue-card-bg);text-align:center;box-shadow:0 18px 55px rgba(23,15,60,.32),0 0 32px color-mix(in srgb,var(--topicue-glow) 28%,transparent),inset 0 1px #ffffff14}.standalone-card{scale:var(--topicue-card-fit-scale,1);animation:topicue-result .28s ease-out both}.standalone-card[hidden],.standalone-card small[hidden],.standalone-resume[hidden]{display:none}.standalone-card small{display:inline-flex;min-height:30px;align-items:center;padding:4px 11px;border:1px solid var(--topicue-category-border);border-radius:999px;background:var(--topicue-category-bg);color:var(--topicue-category-text);font-weight:800}.standalone-card h1{margin:.35em 0;color:var(--topicue-card-title);font-size:clamp(1.5rem,4vw,3.4rem);font-weight:850;line-height:1.25;overflow-wrap:anywhere;line-break:strict;text-shadow:0 2px 10px #0008}.standalone-card p{margin:.5em 0 0;color:var(--topicue-card-body);font-size:clamp(1rem,2vw,1.5rem);line-height:1.65;overflow-wrap:anywhere;line-break:strict}.standalone-resume{z-index:4;color:var(--topicue-card-title)}.standalone-resume button{min-height:46px;margin:6px;padding:0 18px;border:1px solid var(--topicue-edge);border-radius:12px;background:var(--topicue-card-bg);color:var(--topicue-text);font-weight:700}.standalone-controls{position:absolute;z-index:3;bottom:1%;left:50%;translate:-50% 0;display:flex;opacity:0;transition:opacity .15s}.standalone-stage:hover .standalone-controls,.standalone-stage:focus-within .standalone-controls{opacity:1}.standalone-controls button{min-height:46px;margin:6px;padding:0 18px;border:1px solid var(--topicue-edge);border-radius:12px;background:var(--topicue-card-bg);color:var(--topicue-text);font-weight:700}.canvas-fallback .standalone-renderer canvas{object-fit:contain}@keyframes topicue-land{0%{scale:1}50%{scale:1.04;filter:drop-shadow(0 0 24px var(--topicue-glow))}100%{scale:1}}@keyframes topicue-result{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}.standalone-card{animation-name:topicue-fade}@keyframes topicue-fade{from{opacity:0}to{opacity:1}}}</style>
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
