import { isIntegerInRange } from "@/shared/number";

import {
  backgroundModeSchema,
  fontPresetIdSchema,
  motionIntensitySchema,
  reducedMotionBehaviorSchema,
  renderQualitySchema,
  resultCardPositionSchema,
} from "../domain/config-schema";
import {
  ANIMATION_DURATION_MILLISECONDS,
  FONT_PRESET_IDS,
  RESULT_CARD_WIDTH_PIXELS,
  REVEAL_DELAY_MILLISECONDS,
  SUPPORTED_FRAME_RATES,
} from "../domain/constants";
import { appearancePresetForTheme, fontPresets } from "../domain/theme";

import { AppearanceColorControls } from "./appearance-color-controls";
import { LivePreview } from "./live-preview";
import {
  ImportExportControls,
  ObsBehaviorSettings,
  SelectionSettings,
} from "./preview-output-sections";
import {
  backgroundModeOptions,
  motionIntensityOptions,
  reducedMotionBehaviorOptions,
  renderQualityOptions,
  resultCardPositionOptions,
} from "./studio-options";
import { ThemePicker } from "./theme-picker";

import type { DownloadKind, PreviewRoll } from "./studio-types";
import type { FaceDeck, Prompt, PromptPackConfigV1 } from "../domain/schema";

interface PreviewOutputPanelProps {
  config: PromptPackConfigV1;
  previewRoll: PreviewRoll | null;
  previewSettled: boolean;
  previewFace: FaceDeck | null;
  previewPrompt: Prompt | null;
  previewLabels: string[];
  previewFaceIds: string[];
  jsonImportText: string;
  importMessage: string;
  onConfigChange: (config: PromptPackConfigV1) => void;
  onPreviewSettled: () => void;
  onRoll: () => void;
  onDownload: (kind: DownloadKind) => Promise<void>;
  onFileImport: (file: File) => Promise<void>;
  onJsonImportTextChange: (value: string) => void;
  onPastedJsonImport: () => void;
}

export const PreviewOutputPanel = ({
  config,
  previewRoll,
  previewSettled,
  previewFace,
  previewPrompt,
  previewLabels,
  previewFaceIds,
  jsonImportText,
  importMessage,
  onConfigChange,
  onPreviewSettled,
  onRoll,
  onDownload,
  onFileImport,
  onJsonImportTextChange,
  onPastedJsonImport,
}: PreviewOutputPanelProps) => (
  <section className="panel preview-output-panel">
    <p className="eyebrow">Live preview</p>
    <LivePreview
      config={config}
      previewRoll={previewRoll}
      previewSettled={previewSettled}
      previewFace={previewFace}
      previewPrompt={previewPrompt}
      previewLabels={previewLabels}
      previewFaceIds={previewFaceIds}
      onSettled={onPreviewSettled}
      onRoll={onRoll}
    />
    <hr />
    <SelectionSettings config={config} onConfigChange={onConfigChange} />
    <div className="editor-section-heading settings-heading">
      <h2>表示・テーマ</h2>
      <p>完成済みテーマを選び、必要な部分だけ調整できます。</p>
    </div>
    <ThemePicker
      selectedThemeId={config.appearance.themeId}
      onChange={(themeId) =>
        onConfigChange({
          ...config,
          appearance: {
            ...config.appearance,
            ...appearancePresetForTheme(themeId),
            themeId,
          },
        })
      }
    />
    <label className="field">
      日本語フォント
      <select
        value={config.appearance.fontPreset}
        onChange={(event) =>
          onConfigChange({
            ...config,
            appearance: {
              ...config.appearance,
              fontPreset: fontPresetIdSchema.parse(event.target.value),
            },
          })
        }
      >
        {FONT_PRESET_IDS.map((fontId) => (
          <option key={fontId} value={fontId}>
            {fontPresets[fontId].name}
          </option>
        ))}
      </select>
      <span className="field-help">OBS用HTMLでも外部通信せず利用できるフォント候補です。</span>
    </label>
    <details className="settings-group">
      <summary>ダイスの色を調整</summary>
      <div className="settings-group-body">
        <AppearanceColorControls
          appearance={config.appearance}
          onChange={(key, value) =>
            onConfigChange({
              ...config,
              appearance: { ...config.appearance, [key]: value },
            })
          }
        />
      </div>
    </details>
    <details className="settings-group">
      <summary>結果カード</summary>
      <div className="settings-group-body">
        <label className="field">
          OBS背景
          <select
            value={config.appearance.background}
            onChange={(event) =>
              onConfigChange({
                ...config,
                appearance: {
                  ...config.appearance,
                  background: backgroundModeSchema.parse(event.target.value),
                },
              })
            }
          >
            {backgroundModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          結果カードの位置
          <select
            value={config.appearance.resultCardPosition}
            onChange={(event) =>
              onConfigChange({
                ...config,
                appearance: {
                  ...config.appearance,
                  resultCardPosition: resultCardPositionSchema.parse(event.target.value),
                },
              })
            }
          >
            {resultCardPositionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          結果カードの最大幅（px）
          <input
            type="number"
            min={RESULT_CARD_WIDTH_PIXELS.minimum}
            max={RESULT_CARD_WIDTH_PIXELS.maximum}
            value={config.appearance.resultCardMaxWidthPx}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (
                isIntegerInRange(
                  value,
                  RESULT_CARD_WIDTH_PIXELS.minimum,
                  RESULT_CARD_WIDTH_PIXELS.maximum,
                )
              ) {
                onConfigChange({
                  ...config,
                  appearance: { ...config.appearance, resultCardMaxWidthPx: value },
                });
              }
            }}
          />
        </label>
      </div>
    </details>
    <details className="settings-group">
      <summary>演出・描画</summary>
      <div className="settings-group-body">
        <label className="field">
          FPS
          <select
            value={config.behavior.targetFps}
            onChange={(event) => {
              const selectedValue = Number(event.target.value);
              const targetFps = SUPPORTED_FRAME_RATES.find((value) => value === selectedValue);
              if (targetFps === undefined) return;
              onConfigChange({
                ...config,
                behavior: { ...config.behavior, targetFps },
              });
            }}
          >
            {SUPPORTED_FRAME_RATES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          描画品質
          <select
            value={config.appearance.quality}
            onChange={(event) =>
              onConfigChange({
                ...config,
                appearance: {
                  ...config.appearance,
                  quality: renderQualitySchema.parse(event.target.value),
                },
              })
            }
          >
            {renderQualityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          アニメーション時間（ms）
          <input
            type="number"
            min={ANIMATION_DURATION_MILLISECONDS.minimum}
            max={ANIMATION_DURATION_MILLISECONDS.maximum}
            step={100}
            value={config.animation.durationMs}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (
                isIntegerInRange(
                  value,
                  ANIMATION_DURATION_MILLISECONDS.minimum,
                  ANIMATION_DURATION_MILLISECONDS.maximum,
                )
              ) {
                onConfigChange({
                  ...config,
                  animation: { ...config.animation, durationMs: value },
                });
              }
            }}
          />
        </label>
        <label className="field">
          動きの強さ
          <select
            value={config.animation.motionIntensity}
            onChange={(event) =>
              onConfigChange({
                ...config,
                animation: {
                  ...config.animation,
                  motionIntensity: motionIntensitySchema.parse(event.target.value),
                },
              })
            }
          >
            {motionIntensityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          着地後の表示待ち時間（ms）
          <input
            type="number"
            min={REVEAL_DELAY_MILLISECONDS.minimum}
            max={REVEAL_DELAY_MILLISECONDS.maximum}
            step={50}
            value={config.animation.revealDelayMs}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (
                isIntegerInRange(
                  value,
                  REVEAL_DELAY_MILLISECONDS.minimum,
                  REVEAL_DELAY_MILLISECONDS.maximum,
                )
              ) {
                onConfigChange({
                  ...config,
                  animation: { ...config.animation, revealDelayMs: value },
                });
              }
            }}
          />
        </label>
        <label className="field">
          モーション軽減
          <select
            value={config.animation.reducedMotionBehavior}
            onChange={(event) =>
              onConfigChange({
                ...config,
                animation: {
                  ...config.animation,
                  reducedMotionBehavior: reducedMotionBehaviorSchema.parse(event.target.value),
                },
              })
            }
          >
            {reducedMotionBehaviorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={config.animation.rollSoundEnabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  animation: { ...config.animation, rollSoundEnabled: event.target.checked },
                })
              }
            />{" "}
            回転音
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={config.animation.landingSoundEnabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  animation: { ...config.animation, landingSoundEnabled: event.target.checked },
                })
              }
            />{" "}
            着地音
          </label>
        </div>
      </div>
    </details>
    <ObsBehaviorSettings config={config} onConfigChange={onConfigChange} />
    <ImportExportControls
      jsonImportText={jsonImportText}
      importMessage={importMessage}
      onDownload={onDownload}
      onFileImport={onFileImport}
      onJsonImportTextChange={onJsonImportTextChange}
      onPastedJsonImport={onPastedJsonImport}
    />
  </section>
);
