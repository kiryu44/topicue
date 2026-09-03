import { isIntegerInRange } from "@/shared/number";

import {
  DEFAULT_SUGGESTED_DURATION_SECONDS,
  MAX_PROMPTS_PER_FACE,
  SUGGESTED_DURATION_SECONDS,
} from "../domain/constants";
import { textLimits, withinTextLimit } from "../domain/text";

import { TextCounter } from "./text-counter";

import type { FaceDeck, Prompt, PromptPackConfigV1 } from "../domain/schema";

interface PromptEditorPanelProps {
  config: PromptPackConfigV1;
  face: FaceDeck;
  prompt: Prompt;
  onFaceChange: (change: (current: FaceDeck) => FaceDeck) => void;
  onPromptChange: (change: (current: Prompt) => Prompt) => void;
  onPromptSelect: (promptId: string) => void;
  onPromptAdd: () => void;
  onPromptMove: (offset: -1 | 1) => void;
  onPromptDuplicate: () => void;
}

export const PromptEditorPanel = ({
  config,
  face,
  prompt,
  onFaceChange,
  onPromptChange,
  onPromptSelect,
  onPromptAdd,
  onPromptMove,
  onPromptDuplicate,
}: PromptEditorPanelProps) => (
  <section className="panel">
    <p className="eyebrow">
      {config.mode === "deck" ? "選択中の面と結果候補" : "選択中の面の内容"}
    </p>
    <div className="editor-section-heading">
      <h2>
        {config.faces.findIndex((candidate) => candidate.id === face.id) + 1}面目
        {config.mode === "deck" && `「${face.shortLabel ?? face.label}」`}
      </h2>
      <p>
        {config.mode === "deck"
          ? "このカテゴリー面が出た後、下の結果候補から1件が選ばれます。"
          : "この面が出たときに、そのまま表示する結果を編集します。結果候補の追加抽選はありません。"}
      </p>
    </div>
    {config.mode === "deck" && (
      <>
        <label className="field">
          カテゴリー名
          <input
            value={face.label}
            maxLength={textLimits.faceLabel.bytes}
            onChange={(event) => {
              if (
                event.target.value !== "" &&
                withinTextLimit(event.target.value, textLimits.faceLabel)
              ) {
                onFaceChange((current) => ({ ...current, label: event.target.value }));
              }
            }}
          />
          <span className="field-help">結果カードのカテゴリーとして使います。</span>
          <TextCounter value={face.label} maximum={textLimits.faceLabel.graphemes} />
        </label>
        <label className="field">
          ダイス面に表示する短い名前（任意）
          <input
            value={face.shortLabel ?? ""}
            maxLength={textLimits.shortFaceLabel.bytes}
            placeholder={face.label}
            onChange={(event) => {
              if (withinTextLimit(event.target.value, textLimits.shortFaceLabel)) {
                onFaceChange((current) => ({
                  ...current,
                  shortLabel: event.target.value || undefined,
                }));
              }
            }}
          />
          <span className="field-help">空欄の場合はカテゴリー名を表示します。</span>
          <TextCounter
            value={face.shortLabel ?? ""}
            maximum={textLimits.shortFaceLabel.graphemes}
          />
        </label>
        <div className="editor-section-heading result-candidates-heading">
          <h3>この面の結果候補</h3>
          <p>ここから1件を抽選します。最大{MAX_PROMPTS_PER_FACE}件まで登録できます。</p>
        </div>
        <div className="prompt-list" aria-label="この面の結果候補">
          {face.prompts.map((candidate, index) => (
            <button
              className={`prompt-item ${candidate.id === prompt.id ? "active" : ""}`}
              key={candidate.id}
              onClick={() => onPromptSelect(candidate.id)}
            >
              <span>
                {index + 1}. {candidate.audienceTitle || "無題の結果"}
              </span>
              {!candidate.enabled && <small>無効</small>}
            </button>
          ))}
        </div>
        <div className="actions result-candidate-actions">
          {face.prompts.length < MAX_PROMPTS_PER_FACE && (
            <button onClick={onPromptAdd}>＋ 結果候補</button>
          )}
          <button onClick={() => onPromptMove(-1)}>↑ 前へ</button>
          <button onClick={() => onPromptMove(1)}>↓ 次へ</button>
          <button onClick={onPromptDuplicate}>この候補を複製</button>
        </div>
      </>
    )}
    {config.mode === "direct" && (
      <label className="field">
        ダイス面に表示する短いラベル（任意）
        <input
          value={face.shortLabel ?? ""}
          maxLength={textLimits.shortFaceLabel.bytes}
          placeholder={prompt.audienceTitle}
          onChange={(event) => {
            if (withinTextLimit(event.target.value, textLimits.shortFaceLabel)) {
              onFaceChange((current) => ({
                ...current,
                shortLabel: event.target.value || undefined,
              }));
            }
          }}
        />
        <span className="field-help">空欄の場合は、下の結果タイトルをダイス面に表示します。</span>
        <TextCounter value={face.shortLabel ?? ""} maximum={textLimits.shortFaceLabel.graphemes} />
      </label>
    )}
    <label className="field">
      {config.mode === "direct" ? "この面の結果タイトル" : "選択中の結果タイトル"}
      <input
        value={prompt.audienceTitle}
        maxLength={textLimits.audienceTitle.bytes}
        onChange={(event) => {
          if (
            event.target.value === "" ||
            !withinTextLimit(event.target.value, textLimits.audienceTitle)
          ) {
            return;
          }
          if (config.mode === "direct") {
            onFaceChange((current) => ({
              ...current,
              label: event.target.value,
              prompts: current.prompts.map((candidate) =>
                candidate.id === prompt.id
                  ? { ...candidate, audienceTitle: event.target.value, enabled: true }
                  : candidate,
              ),
            }));
          } else {
            onPromptChange((current) => ({ ...current, audienceTitle: event.target.value }));
          }
        }}
      />
      <TextCounter value={prompt.audienceTitle} maximum={textLimits.audienceTitle.graphemes} />
    </label>
    <label className="field">
      視聴者に表示する本文（任意）
      <textarea
        value={prompt.audienceBody ?? ""}
        maxLength={textLimits.audienceBody.bytes}
        onChange={(event) => {
          if (withinTextLimit(event.target.value, textLimits.audienceBody)) {
            onPromptChange((current) => ({
              ...current,
              audienceBody: event.target.value || undefined,
            }));
          }
        }}
      />
      <TextCounter value={prompt.audienceBody ?? ""} maximum={textLimits.audienceBody.graphemes} />
    </label>
    <label className="field">
      配信者メモ
      <textarea
        value={prompt.hostNotes ?? ""}
        maxLength={textLimits.hostNotes.bytes}
        onChange={(event) => {
          if (withinTextLimit(event.target.value, textLimits.hostNotes)) {
            onPromptChange((current) => ({
              ...current,
              hostNotes: event.target.value || undefined,
            }));
          }
        }}
      />
      <TextCounter value={prompt.hostNotes ?? ""} maximum={textLimits.hostNotes.graphemes} />
    </label>
    <label className="field">
      補助質問（1行1件）
      <textarea
        value={prompt.followUpQuestions.join("\n")}
        maxLength={
          textLimits.followUpQuestion.bytes * textLimits.followUpQuestionCount +
          textLimits.followUpQuestionCount
        }
        onChange={(event) => {
          const questions = event.target.value.split("\n").filter(Boolean);
          if (
            questions.length <= textLimits.followUpQuestionCount &&
            questions.every((question) => withinTextLimit(question, textLimits.followUpQuestion))
          ) {
            onPromptChange((current) => ({ ...current, followUpQuestions: questions }));
          }
        }}
      />
      <span className="field-help">
        {prompt.followUpQuestions.length} / {textLimits.followUpQuestionCount}件、1件
        {textLimits.followUpQuestion.graphemes}文字まで
      </span>
    </label>
    <label className="field">
      推奨秒数
      <input
        type="number"
        min={SUGGESTED_DURATION_SECONDS.minimum}
        max={SUGGESTED_DURATION_SECONDS.maximum}
        value={prompt.suggestedDurationSeconds ?? DEFAULT_SUGGESTED_DURATION_SECONDS}
        onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (
            isIntegerInRange(
              value,
              SUGGESTED_DURATION_SECONDS.minimum,
              SUGGESTED_DURATION_SECONDS.maximum,
            )
          ) {
            onPromptChange((current) => ({ ...current, suggestedDurationSeconds: value }));
          }
        }}
      />
    </label>
    {config.mode === "deck" && (
      <label className="field">
        <span>
          <input
            type="checkbox"
            checked={prompt.enabled}
            onChange={(event) =>
              onPromptChange((current) => ({ ...current, enabled: event.target.checked }))
            }
          />{" "}
          有効
        </span>
      </label>
    )}
    {config.mode === "deck" && face.prompts.length > 1 && (
      <button
        className="danger"
        onClick={() => {
          const remaining = face.prompts.filter((candidate) => candidate.id !== prompt.id);
          onFaceChange((current) => ({ ...current, prompts: remaining }));
          onPromptSelect(remaining[0]?.id ?? "");
        }}
      >
        この結果候補を削除
      </button>
    )}
  </section>
);
