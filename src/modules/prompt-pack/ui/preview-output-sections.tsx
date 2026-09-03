import { isIntegerInRange } from "@/shared/number";

import { selectionModeSchema, selectionPolicySchema } from "../domain/config-schema";
import { DEFAULT_TIMED_RESULT_VISIBLE_MS, RESULT_VISIBLE_MILLISECONDS } from "../domain/constants";

import { selectionModeOptions, selectionPolicyOptions } from "./studio-options";

import type { DownloadKind } from "./studio-types";
import type { PromptPackConfigV1 } from "../domain/schema";

interface ConfigEditorProps {
  config: PromptPackConfigV1;
  onConfigChange: (config: PromptPackConfigV1) => void;
}

export const SelectionSettings = ({ config, onConfigChange }: ConfigEditorProps) => (
  <details className="settings-group">
    <summary>抽選設定</summary>
    <div className="settings-group-body">
      <label className="field">
        抽選モード
        <select
          value={config.selection.mode}
          onChange={(event) =>
            onConfigChange({
              ...config,
              selection: {
                ...config.selection,
                mode: selectionModeSchema.parse(event.target.value),
              },
            })
          }
        >
          {selectionModeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        抽選ポリシー
        <select
          value={config.selection.policy}
          onChange={(event) =>
            onConfigChange({
              ...config,
              selection: {
                ...config.selection,
                policy: selectionPolicySchema.parse(event.target.value),
              },
            })
          }
        >
          {selectionPolicyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {config.selection.mode === "shuffle_bag" && (
        <label className="field">
          <span>
            <input
              type="checkbox"
              checked={config.selection.resetWhenExhausted}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  selection: {
                    ...config.selection,
                    resetWhenExhausted: event.target.checked,
                  },
                })
              }
            />{" "}
            全件抽選後にBagを自動リセット
          </span>
        </label>
      )}
    </div>
  </details>
);

export const ObsBehaviorSettings = ({ config, onConfigChange }: ConfigEditorProps) => (
  <details className="settings-group">
    <summary>OBSでの操作と結果表示</summary>
    <div className="settings-group-body field checkbox-list">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={config.behavior.rollOnLoad}
          onChange={(event) =>
            onConfigChange({
              ...config,
              behavior: { ...config.behavior, rollOnLoad: event.target.checked },
            })
          }
        />{" "}
        HTML読込時に自動で振る
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={config.behavior.allowOverlayClick}
          onChange={(event) =>
            onConfigChange({
              ...config,
              behavior: { ...config.behavior, allowOverlayClick: event.target.checked },
            })
          }
        />{" "}
        ダイス画面のクリックを許可
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={config.behavior.allowKeyboard}
          onChange={(event) =>
            onConfigChange({
              ...config,
              behavior: { ...config.behavior, allowKeyboard: event.target.checked },
            })
          }
        />{" "}
        Space・Enterキーを許可
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={config.behavior.showCategoryBeforePrompt}
          onChange={(event) =>
            onConfigChange({
              ...config,
              behavior: {
                ...config.behavior,
                showCategoryBeforePrompt: event.target.checked,
              },
            })
          }
        />{" "}
        結果カードにカテゴリーを表示
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={config.behavior.keepResultVisible}
          onChange={(event) =>
            onConfigChange({
              ...config,
              behavior: { ...config.behavior, keepResultVisible: event.target.checked },
              animation: {
                ...config.animation,
                resultVisibleMs: event.target.checked
                  ? null
                  : (config.animation.resultVisibleMs ?? DEFAULT_TIMED_RESULT_VISIBLE_MS),
              },
            })
          }
        />{" "}
        次の抽選まで結果を表示
      </label>
    </div>
    {!config.behavior.keepResultVisible && (
      <label className="field">
        結果を表示する時間（ms）
        <input
          type="number"
          min={RESULT_VISIBLE_MILLISECONDS.minimum}
          max={RESULT_VISIBLE_MILLISECONDS.maximum}
          step={500}
          value={config.animation.resultVisibleMs ?? DEFAULT_TIMED_RESULT_VISIBLE_MS}
          onChange={(event) => {
            const value = event.currentTarget.valueAsNumber;
            if (
              isIntegerInRange(
                value,
                RESULT_VISIBLE_MILLISECONDS.minimum,
                RESULT_VISIBLE_MILLISECONDS.maximum,
              )
            ) {
              onConfigChange({
                ...config,
                animation: { ...config.animation, resultVisibleMs: value },
              });
            }
          }}
        />
      </label>
    )}
  </details>
);

interface ImportExportControlsProps {
  jsonImportText: string;
  importMessage: string;
  onDownload: (kind: DownloadKind) => Promise<void>;
  onFileImport: (file: File) => Promise<void>;
  onJsonImportTextChange: (value: string) => void;
  onPastedJsonImport: () => void;
}

export const ImportExportControls = ({
  jsonImportText,
  importMessage,
  onDownload,
  onFileImport,
  onJsonImportTextChange,
  onPastedJsonImport,
}: ImportExportControlsProps) => (
  <>
    <p className="field-help">
      JSONはすべてのPack設定を保持する正式なバックアップです。CSVはお題一覧の編集用で、テーマ、アニメーション、短い面名などは保持しません。
    </p>
    <div className="actions">
      <button onClick={() => void onDownload("json")}>JSON</button>
      <button onClick={() => void onDownload("csv")}>CSV</button>
      <button onClick={() => void onDownload("html")}>OBS用HTML</button>
      <label className="button">
        JSON / CSVファイルをImport
        <input
          hidden
          type="file"
          accept=".json,.csv,.prompt-dice.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) void onFileImport(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </div>
    <p className="field-help">
      OBS用HTMLは設定と3Dダイスを1ファイルに内蔵します。サーバーやデータベースは不要です。
    </p>
    <details className="json-import">
      <summary>JSONを貼り付けて設定を反映</summary>
      <label className="field">
        Pack設定JSON
        <textarea
          value={jsonImportText}
          placeholder={'{"schemaVersion":1,"mode":"deck",...}'}
          spellCheck={false}
          onChange={(event) => onJsonImportTextChange(event.target.value)}
        />
      </label>
      <button type="button" disabled={jsonImportText.trim() === ""} onClick={onPastedJsonImport}>
        JSON設定を反映
      </button>
    </details>
    {importMessage !== "" && (
      <p className="success" role="status">
        {importMessage}
      </p>
    )}
  </>
);
