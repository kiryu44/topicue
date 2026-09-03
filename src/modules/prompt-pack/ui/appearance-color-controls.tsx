import { useState } from "react";

import type { PromptPackConfigV1 } from "../domain/schema";

type AppearanceColorKey = keyof Pick<
  PromptPackConfigV1["appearance"],
  "bodyColor" | "edgeColor" | "textColor" | "accentColor"
>;

interface AppearanceColorControlsProps {
  appearance: PromptPackConfigV1["appearance"];
  onChange: (key: AppearanceColorKey, value: string) => void;
}

const colorFields = [
  { key: "bodyColor", label: "本体色", description: "ダイスの面" },
  { key: "edgeColor", label: "輪郭色", description: "ダイスのふち・稜線" },
  { key: "textColor", label: "文字色", description: "面に表示する文字" },
  { key: "accentColor", label: "強調色", description: "選択表示・発光エフェクト" },
] as const satisfies ReadonlyArray<{
  key: AppearanceColorKey;
  label: string;
  description: string;
}>;

interface AppearanceColorControlProps {
  colorKey: AppearanceColorKey;
  label: string;
  description: string;
  value: string;
  onApply: (key: AppearanceColorKey, value: string) => void;
}

const AppearanceColorControl = ({
  colorKey,
  label,
  description,
  value,
  onApply,
}: AppearanceColorControlProps) => {
  const [draft, setDraft] = useState(value);
  const hasChange = draft !== value;

  return (
    <div className="color-control">
      <span className="color-control-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <div className="color-control-editor">
        <label className="color-control-picker">
          <input
            aria-label={`${label}を選択`}
            type="color"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <code>{draft.toUpperCase()}</code>
        </label>
        <span className="color-control-status" data-changed={hasChange}>
          {hasChange ? "未反映" : "反映済み"}
        </span>
        <div className="color-control-actions">
          {hasChange && (
            <button
              type="button"
              aria-label={`${label}の変更を取り消す`}
              onClick={() => setDraft(value)}
            >
              取消
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={!hasChange}
            aria-label={`${label}を反映`}
            onClick={() => onApply(colorKey, draft)}
          >
            反映
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppearanceColorControls = ({ appearance, onChange }: AppearanceColorControlsProps) => (
  <div className="color-settings">
    <p className="field-help">
      色見本から色を選び、「反映」を押すとプレビューとPack設定が更新されます。
    </p>
    <div className="color-control-list">
      {colorFields.map(({ key, label, description }) => (
        <AppearanceColorControl
          key={`${key}:${appearance[key]}`}
          colorKey={key}
          label={label}
          description={description}
          value={appearance[key]}
          onApply={onChange}
        />
      ))}
    </div>
  </div>
);
