import type { AppearanceConfig } from "@/modules/prompt-pack/domain/config-schema";
import { themeCssVariables } from "@/modules/prompt-pack/domain/theme";

const resultCardPlacement = (position: AppearanceConfig["resultCardPosition"]): string => {
  if (position === "top") return "top:8%;transform-origin:center top";
  if (position === "center") return "top:50%;translate:0 -50%;transform-origin:center";
  return "bottom:8%;transform-origin:center bottom";
};

export const standaloneStyles = (appearance: AppearanceConfig): string => {
  const themeVariables = Object.entries(themeCssVariables(appearance))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  const pageBackground = appearance.background === "dimmed" ? "#050713cc" : "transparent";
  const cardPlacement = resultCardPlacement(appearance.resultCardPosition);

  return `:root{${themeVariables}}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${pageBackground};color:var(--topicue-text);font-family:var(--topicue-font)}
*{box-sizing:border-box}
[hidden]{display:none!important}
button{font:inherit}
#app{width:100%;height:100%;display:grid;place-items:center;background:transparent}
.standalone-stage{position:relative;width:min(96vw,1100px);height:min(96vh,900px);min-height:360px;display:grid;place-items:center;outline:none;container-type:inline-size}
.standalone-renderer{position:absolute;inset:0;transition:filter .2s ease}
.standalone-renderer canvas{display:block;width:100%;height:100%}
#app[data-visual-state=rolling] .standalone-renderer{filter:drop-shadow(0 0 18px var(--topicue-glow))}
#app[data-visual-state=landing] .standalone-renderer{animation:topicue-land .22s ease-out}
#app[data-visual-state=result] .standalone-renderer{filter:saturate(.88) brightness(.82) drop-shadow(0 0 8px var(--topicue-glow))}
.standalone-status{position:absolute;z-index:3;top:2%;left:50%;translate:-50% 0;padding:.5rem .85rem;border:1px solid var(--topicue-category-border);border-radius:999px;background:var(--topicue-category-bg);color:var(--topicue-category-text);font-weight:800}
.standalone-card{position:absolute;z-index:2;left:5%;right:5%;${cardPlacement};width:min(90%,var(--topicue-card-max-width));margin:auto;padding:clamp(18px,3vw,36px);border:2px solid var(--topicue-card-border);border-radius:24px;background:var(--topicue-card-bg);text-align:center;box-shadow:0 18px 55px rgba(23,15,60,.32),0 0 32px color-mix(in srgb,var(--topicue-glow) 28%,transparent),inset 0 1px #ffffff14}
.standalone-card{scale:var(--topicue-card-fit-scale,1);animation:topicue-result .28s ease-out both}
.standalone-card small{display:inline-flex;min-height:30px;align-items:center;padding:4px 11px;border:1px solid var(--topicue-category-border);border-radius:999px;background:var(--topicue-category-bg);color:var(--topicue-category-text);font-weight:800}
.standalone-card h1{margin:.35em 0;color:var(--topicue-card-title);font-size:clamp(1.5rem,4vw,3.4rem);font-weight:850;line-height:1.25;overflow-wrap:anywhere;line-break:strict;text-shadow:0 2px 10px #0008}
.standalone-card p{margin:.5em 0 0;color:var(--topicue-card-body);font-size:clamp(1rem,2vw,1.5rem);line-height:1.65;overflow-wrap:anywhere;line-break:strict}
.standalone-history-panel button,.standalone-dialog button{min-height:42px;padding:0 14px;border:1px solid var(--topicue-edge);border-radius:10px;background:var(--topicue-card-bg);color:var(--topicue-text);font-weight:700;cursor:pointer}
.standalone-history-panel{position:absolute;z-index:6;top:14px;right:14px;width:min(280px,calc(100% - 28px));padding:14px;border:1px solid color-mix(in srgb,var(--topicue-edge) 58%,transparent);border-radius:14px;background:color-mix(in srgb,var(--topicue-card-bg) 92%,transparent);color:var(--topicue-card-body);box-shadow:0 10px 28px #0507134d;font-size:.875rem}
.standalone-history-panel h2{margin:0;color:var(--topicue-card-title);font-size:1rem}
.standalone-history-panel p{margin:8px 0 12px}
.standalone-history-panel button{display:block;width:100%;margin-top:8px;text-align:left}
.standalone-dialog-backdrop{position:absolute;z-index:10;inset:0;display:grid;place-items:center;padding:18px;background:#05071370}
.standalone-dialog{width:min(390px,100%);padding:20px;border:1px solid var(--topicue-card-border);border-radius:16px;background:var(--topicue-card-bg);color:var(--topicue-card-body);box-shadow:0 20px 55px #05071399}
.standalone-dialog h2{margin:0;color:var(--topicue-card-title);font-size:1.15rem}
.standalone-dialog p{margin:10px 0 18px;line-height:1.6}
.standalone-dialog-actions{display:flex;justify-content:flex-end;gap:8px}
.standalone-dialog [data-action=confirm-reset]{border-color:#e76f80;color:#ffdce1}
button:focus-visible,.standalone-stage:focus-visible{outline:3px solid var(--topicue-accent);outline-offset:3px}
.canvas-fallback .standalone-renderer canvas{object-fit:contain}
@keyframes topicue-land{0%{scale:1}50%{scale:1.04;filter:drop-shadow(0 0 24px var(--topicue-glow))}100%{scale:1}}
@keyframes topicue-result{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}.standalone-card{animation-name:topicue-fade}@keyframes topicue-fade{from{opacity:0}to{opacity:1}}}`;
};
