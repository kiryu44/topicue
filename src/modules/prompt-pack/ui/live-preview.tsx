import { useState, type CSSProperties } from "react";

import { dieShapeName } from "@/modules/renderer/three/die-geometry";
import { DicePresentation } from "@/modules/renderer/ui/dice-presentation";

import { dieFaceLabel } from "../domain/die-label";
import { getRollInstruction } from "../domain/roll-instruction";
import { themeCssVariables } from "../domain/theme";

import { useResultCardFit } from "./use-result-card-fit";

import type { PreviewRoll } from "./studio-types";
import type { FaceDeck, Prompt, PromptPackConfigV1 } from "../domain/schema";

type PreviewAspect = "landscape" | "portrait";
type PreviewBackground = "transparent" | "dark" | "light" | "game" | "colorful";
type PreviewScale = 100 | 75 | 50;

interface LivePreviewProps {
  config: PromptPackConfigV1;
  previewRoll: PreviewRoll | null;
  previewSettled: boolean;
  previewFace: FaceDeck | null;
  previewPrompt: Prompt | null;
  previewLabels: string[];
  previewFaceIds: string[];
  onSettled: () => void;
  onRoll: () => void;
}

const backgrounds: ReadonlyArray<{ id: PreviewBackground; label: string }> = [
  { id: "transparent", label: "透過" },
  { id: "dark", label: "暗色" },
  { id: "light", label: "明色" },
  { id: "game", label: "ゲーム" },
  { id: "colorful", label: "高彩度" },
];

const scales: readonly PreviewScale[] = [100, 75, 50];

export const LivePreview = ({
  config,
  previewRoll,
  previewSettled,
  previewFace,
  previewPrompt,
  previewLabels,
  previewFaceIds,
  onSettled,
  onRoll,
}: LivePreviewProps) => {
  const [aspect, setAspect] = useState<PreviewAspect>("landscape");
  const [background, setBackground] = useState<PreviewBackground>("transparent");
  const [scale, setScale] = useState<PreviewScale>(100);
  const visualState = previewRoll === null ? "idle" : previewSettled ? "result" : "rolling";
  const themeStyle = themeCssVariables(config.appearance) as CSSProperties;
  const selectedScale = scale / 100;
  const resultContentKey = JSON.stringify([
    previewFace?.label,
    previewPrompt?.audienceTitle,
    previewPrompt?.audienceBody,
    config.behavior.showCategoryBeforePrompt,
  ]);
  const { cardRef, stageRef } = useResultCardFit({
    active: previewSettled && previewPrompt !== null,
    contentKey: resultContentKey,
    selectedScale,
  });

  return (
    <div className="live-preview" style={themeStyle} data-theme={config.appearance.themeId}>
      <div className="preview-toolbar" role="group" aria-label="プレビュー表示設定">
        <div className="preview-toolbar-group">
          <span>画面比率</span>
          <div className="compact-segmented">
            <button
              type="button"
              aria-pressed={aspect === "landscape"}
              onClick={() => setAspect("landscape")}
            >
              16:9
            </button>
            <button
              type="button"
              aria-pressed={aspect === "portrait"}
              onClick={() => setAspect("portrait")}
            >
              9:16
            </button>
          </div>
        </div>
        <div className="preview-toolbar-group preview-background-controls">
          <span>背景テスト</span>
          <div className="preview-swatches">
            {backgrounds.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`preview-swatch preview-swatch-${option.id}`}
                aria-label={`${option.label}背景`}
                aria-pressed={background === option.id}
                title={`${option.label}背景`}
                onClick={() => setBackground(option.id)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="preview-toolbar-group">
          <span>表示サイズ</span>
          <div className="compact-segmented">
            {scales.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={scale === value}
                onClick={() => setScale(value)}
              >
                {value}%
              </button>
            ))}
          </div>
          <small className="preview-scale-help">長い結果は枠内に収まるよう自動縮小します。</small>
        </div>
      </div>
      <div
        ref={stageRef}
        className={`preview-stage preview-aspect-${aspect} preview-background-${background}`}
        aria-busy={visualState === "rolling"}
        data-testid="preview-stage"
      >
        <div
          className="preview-overlay"
          data-visual-state={visualState}
          data-preview-scale={scale}
          style={{ "--preview-scale": selectedScale } as CSSProperties}
        >
          <DicePresentation
            labels={previewLabels}
            faceIds={previewFaceIds}
            appearance={config.appearance}
            targetFaceId={previewRoll?.faceId}
            motionSeed={previewRoll?.motionSeed}
            durationMs={config.animation.durationMs}
            motionIntensity={config.animation.motionIntensity}
            reducedMotionBehavior={config.animation.reducedMotionBehavior}
            targetFps={config.behavior.targetFps}
            onSettled={onSettled}
          />
          <span className="die-label" aria-live="polite">
            {previewRoll === null
              ? "待機中"
              : previewSettled
                ? previewFace === null
                  ? "—"
                  : dieFaceLabel(previewFace)
                : "抽選中…"}
          </span>
          {previewSettled && previewPrompt !== null && (
            <article
              ref={cardRef}
              className="result-card"
              data-position={config.appearance.resultCardPosition}
              style={{ "--result-scale": selectedScale } as CSSProperties}
              aria-live="polite"
            >
              {config.behavior.showCategoryBeforePrompt && (
                <small className="category-pill">{previewFace?.label}</small>
              )}
              <h1>{previewPrompt.audienceTitle}</h1>
              {previewPrompt.audienceBody !== undefined && <p>{previewPrompt.audienceBody}</p>}
            </article>
          )}
        </div>
      </div>
      <button
        className="primary preview-roll-button"
        disabled={visualState === "rolling"}
        onClick={onRoll}
      >
        {visualState === "rolling" ? "振っています…" : "プレビューを振る"}
      </button>
      <p className="field-help">OBS: {getRollInstruction(config.behavior)}</p>
      <p className="muted die-shape-name">
        形状: {config.mode === "deck" ? "立方体（正六面体）" : dieShapeName(config.faces.length)}
      </p>
    </div>
  );
};
