import Link from "next/link";
import { useRef } from "react";

import type { LocalPackSummary } from "../infrastructure/browser-pack-store";
import type { BrowserTemplate } from "../infrastructure/browser-templates";

interface SavedPacksSectionProps {
  packs: LocalPackSummary[];
  busy: boolean;
  onReset: () => Promise<void>;
  onDuplicate: (pack: LocalPackSummary) => Promise<void>;
  onRemove: (pack: LocalPackSummary) => Promise<void>;
}

export const SavedPacksSection = ({
  packs,
  busy,
  onReset,
  onDuplicate,
  onRemove,
}: SavedPacksSectionProps) => {
  if (packs.length === 0) return null;
  return (
    <section className="panel saved-packs">
      <div className="saved-packs-heading">
        <div>
          <p className="eyebrow">このブラウザに保存済み</p>
          <h2>続きから編集</h2>
        </div>
        <button className="danger" type="button" onClick={() => void onReset()}>
          すべて初期化
        </button>
      </div>
      <div className="saved-pack-list">
        {packs.map((pack) => (
          <article className="saved-pack-item" key={pack.id}>
            <div>
              <strong>{pack.name}</strong>
              <small>
                {pack.mode === "deck" ? "Deck：カテゴリー型" : "Direct：1面1結果"}・{pack.faceCount}
                面・{new Date(pack.updatedAt).toLocaleString("ja-JP")}
              </small>
            </div>
            <div className="actions">
              <Link className="button primary" href={`/studio/${pack.id}`}>
                編集を続ける
              </Link>
              <button type="button" disabled={busy} onClick={() => void onDuplicate(pack)}>
                複製
              </button>
              <button className="danger" type="button" onClick={() => void onRemove(pack)}>
                削除
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

interface JsonImportSectionProps {
  busy: boolean;
  onImport: (file: File) => Promise<void>;
}

export const JsonImportSection = ({ busy, onImport }: JsonImportSectionProps) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="panel create-import">
      <div>
        <p className="eyebrow">JSONバックアップ</p>
        <h2>JSON設定からPackを作る</h2>
        <p className="muted">
          別のブラウザやPCで保存した.prompt-dice.jsonを、このブラウザへ取り込みます。
        </p>
      </div>
      <div className="create-import-actions">
        <a className="button" href="/data/sample.prompt-dice.json" download>
          サンプルJSONをダウンロード
        </a>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          JSONを選択してImport
        </button>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept=".json,.prompt-dice.json,application/json"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file !== undefined) void onImport(file);
          event.currentTarget.value = "";
        }}
      />
    </section>
  );
};

interface TemplateGridProps {
  templates: BrowserTemplate[];
  selectedTemplateId: string;
  busy: boolean;
  loading: boolean;
  onCreate: (template: BrowserTemplate) => Promise<void>;
}

export const TemplateGrid = ({
  templates,
  selectedTemplateId,
  busy,
  loading,
  onCreate,
}: TemplateGridProps) => (
  <section className="create-grid" aria-busy={loading}>
    {templates.map((template) => (
      <button
        className="panel template"
        disabled={busy}
        key={template.id}
        onClick={() => void onCreate(template)}
      >
        <span className="eyebrow">
          {template.id === selectedTemplateId ? "おすすめ" : "テンプレート"}
        </span>
        <h2>{template.name}</h2>
        <span className="muted">{template.description}</span>
      </button>
    ))}
    {loading && <p className="muted">テンプレートを読み込んでいます…</p>}
  </section>
);
