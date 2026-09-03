import { dieShapeName } from "@/modules/renderer/three/die-geometry";

import { localeSchema } from "../domain/config-schema";
import { DIRECT_FACE_COUNTS } from "../domain/constants";
import { dieFaceLabel } from "../domain/die-label";
import { textLimits, withinTextLimit } from "../domain/text";

import { localeOptions } from "./studio-options";
import { TextCounter } from "./text-counter";

import type { FaceDeck, PromptPackConfigV1 } from "../domain/schema";

interface DiceSettingsPanelProps {
  config: PromptPackConfigV1;
  selectedFace: FaceDeck;
  onConfigChange: (config: PromptPackConfigV1) => void;
  onModeChange: (mode: PromptPackConfigV1["mode"]) => void;
  onDirectFaceCountChange: (count: number) => void;
  onFaceSelect: (face: FaceDeck) => void;
}

export const DiceSettingsPanel = ({
  config,
  selectedFace,
  onConfigChange,
  onModeChange,
  onDirectFaceCountChange,
  onFaceSelect,
}: DiceSettingsPanelProps) => (
  <section className="panel">
    <p className="eyebrow">ダイス設定</p>
    <div className="field">
      <span>ダイスの作り方</span>
      <div className="segmented">
        <button
          className={config.mode === "deck" ? "primary" : ""}
          onClick={() => onModeChange("deck")}
        >
          Deck：カテゴリー型
        </button>
        <button
          className={config.mode === "direct" ? "primary" : ""}
          onClick={() => onModeChange("direct")}
        >
          Direct：1面1結果
        </button>
      </div>
      <span className="mode-help">
        {config.mode === "deck"
          ? "2段階抽選です。まず6面ダイスでカテゴリーを選び、その面に登録した結果候補から1件を抽選します。"
          : "1段階抽選です。ダイスの各面がそのまま1件の結果になります。3〜20面を設定できます。"}
      </span>
    </div>
    <label className="field">
      Pack名
      <input
        value={config.name}
        maxLength={textLimits.packName.bytes}
        onChange={(event) => {
          if (
            event.target.value !== "" &&
            withinTextLimit(event.target.value, textLimits.packName)
          ) {
            onConfigChange({ ...config, name: event.target.value });
          }
        }}
      />
      <TextCounter value={config.name} maximum={textLimits.packName.graphemes} />
    </label>
    <label className="field">
      Packの説明（任意）
      <textarea
        value={config.description ?? ""}
        maxLength={textLimits.description.bytes}
        onChange={(event) => {
          if (withinTextLimit(event.target.value, textLimits.description)) {
            onConfigChange({ ...config, description: event.target.value || undefined });
          }
        }}
      />
      <TextCounter value={config.description ?? ""} maximum={textLimits.description.graphemes} />
    </label>
    <label className="field">
      言語
      <select
        value={config.locale}
        onChange={(event) =>
          onConfigChange({ ...config, locale: localeSchema.parse(event.target.value) })
        }
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
    <div className="editor-section-heading">
      <h2>ダイスの面</h2>
      <p>
        {config.mode === "deck"
          ? "6つのカテゴリーから、編集する面を選びます。"
          : "結果を編集する面を選びます。面数は下のプルダウンで変更します。"}
      </p>
    </div>
    {config.mode === "direct" && (
      <label className="field">
        ダイスの面数と形状
        <select
          aria-label="ダイスの面数と形状"
          value={config.faces.length}
          onChange={(event) => onDirectFaceCountChange(Number(event.target.value))}
        >
          {DIRECT_FACE_COUNTS.map((count) => (
            <option key={count} value={count}>
              {count}面 — {dieShapeName(count)}
            </option>
          ))}
        </select>
        <span className="field-help">3〜20面のすべてを、立体の多面体ダイスとして表示します。</span>
      </label>
    )}
    {config.faces.map((face, index) => (
      <button
        className={`face-item ${face.id === selectedFace.id ? "active" : ""}`}
        key={face.id}
        onClick={() => onFaceSelect(face)}
      >
        <span>
          {index + 1}. {config.mode === "direct" ? dieFaceLabel(face) : face.label}
        </span>
        {config.mode === "deck" && <small>候補 {face.prompts.length}件</small>}
      </button>
    ))}
  </section>
);
