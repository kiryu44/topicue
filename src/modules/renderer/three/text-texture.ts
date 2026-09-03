import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

import { layoutText } from "../text-layout/layout";

export const createTextTexture = (
  label: string,
  background: { body: string; highlight: string } | null,
  foreground: string,
  size: number,
): CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Canvas 2D is unavailable");
  if (background !== null) {
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, background.highlight);
    gradient.addColorStop(0.55, background.body);
    gradient.addColorStop(1, background.body);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${Math.round(size * 0.12)}px system-ui, sans-serif`;
  const layout = layoutText(
    label,
    (value, fontSize) => {
      context.font = `800 ${fontSize}px system-ui, sans-serif`;
      return context.measureText(value).width;
    },
    { maxWidth: size * 0.78, maxLines: 3, fontSize: size * 0.14, minFontSize: size * 0.07 },
  );
  context.fillStyle = foreground;
  context.font = `800 ${layout.fontSize}px system-ui, sans-serif`;
  const lineHeight = layout.fontSize * 1.25;
  layout.lines.forEach((line, index) => {
    context.fillText(
      line,
      size / 2,
      size / 2 + (index - (layout.lines.length - 1) / 2) * lineHeight,
    );
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  return texture;
};
