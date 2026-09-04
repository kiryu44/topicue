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
.standalone-history-panel button{min-height:42px;padding:0 14px;border:1px solid var(--topicue-edge);border-radius:10px;background:var(--topicue-card-bg);color:var(--topicue-card-title);font-weight:700;cursor:pointer}
.standalone-history-panel{position:absolute;z-index:6;top:14px;right:14px;width:min(280px,calc(100% - 28px));padding:14px;border:1px solid color-mix(in srgb,var(--topicue-edge) 58%,transparent);border-radius:14px;background:color-mix(in srgb,var(--topicue-card-bg) 92%,transparent);color:var(--topicue-card-body);box-shadow:0 10px 28px #0507134d;font-size:.875rem}
.standalone-history-panel h2{margin:0;color:var(--topicue-card-title);font-size:1rem}
.standalone-history-panel p{margin:8px 0 12px}
.standalone-history-panel button{display:block;width:100%;margin-top:8px;text-align:left}
.standalone-dialog-backdrop{position:fixed;z-index:10;inset:0;display:grid;place-items:center;padding:clamp(18px,4vw,48px);background:#050713d4;backdrop-filter:blur(7px)}
.standalone-dialog{width:min(480px,100%);padding:clamp(22px,4vw,32px);border:2px solid #9f8bea;border-radius:22px;background:linear-gradient(145deg,#20223c,#121426 72%);color:#e6e3f2;box-shadow:0 28px 90px #000c,0 0 42px #8e78dc38}
.standalone-dialog-header{display:flex;gap:14px;align-items:flex-start}
.standalone-dialog-header>div{min-width:0}
.standalone-dialog-icon{display:grid;width:38px;height:38px;flex:0 0 auto;place-items:center;border:1px solid #ff9bac;border-radius:50%;background:#682b3a;color:#fff2f5;font-size:1.25rem;font-weight:900}
.standalone-dialog-header p{margin:0 0 4px;color:#ffb5c2;font-size:.75rem;font-weight:850;letter-spacing:.12em}
.standalone-dialog h2{margin:0;color:#fff;font-size:clamp(1.2rem,3vw,1.5rem);line-height:1.4}
.standalone-dialog>p{line-height:1.65}
.standalone-reset-summary{margin:22px 0 10px;padding:13px 15px;border:1px solid #ffffff24;border-radius:12px;background:#080a18b8;color:#f0edf8}
.standalone-reset-summary strong{margin-right:3px;color:#ffb5c2;font-size:1.3rem}
.standalone-dialog #standalone-reset-description{margin:0 0 24px;color:#cbc6dc}
.standalone-dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.standalone-dialog button{min-height:48px;padding:0 16px;border:1px solid #aaa3c2;border-radius:11px;background:#292c46;color:#fff;font-weight:800;cursor:pointer}
.standalone-dialog button:hover{border-color:#d8d3e9;background:#363a58}
.standalone-dialog [data-action=confirm-reset]{border-color:#ff879b;background:#a83249;color:#fff}
.standalone-dialog [data-action=confirm-reset]:hover{border-color:#ffc3cd;background:#c13d56}
.standalone-dialog-shortcuts{margin:16px 0 0!important;color:#9e98b2!important;font-size:.75rem;text-align:center}
.standalone-dialog-shortcuts kbd{display:inline-block;padding:2px 6px;border:1px solid #77718e;border-radius:5px;background:#090b18;color:#e9e6f2;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
button:focus-visible,.standalone-stage:focus-visible{outline:3px solid #aeeeff;outline-offset:3px}
.canvas-fallback .standalone-renderer canvas{object-fit:contain}
@keyframes topicue-land{0%{scale:1}50%{scale:1.04;filter:drop-shadow(0 0 24px var(--topicue-glow))}100%{scale:1}}
@keyframes topicue-result{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(max-width:480px){.standalone-dialog-actions{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}.standalone-card{animation-name:topicue-fade}@keyframes topicue-fade{from{opacity:0}to{opacity:1}}}`;
};
