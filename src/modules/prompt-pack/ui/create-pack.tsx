"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BrandLockup } from "@/components/brand-lockup";
import { importPackJson } from "@/modules/prompt-pack/application/portable";
import { PACK_FILE_MAX_BYTES } from "@/modules/prompt-pack/domain/constants";
import {
  createLocalPack,
  deleteLocalPack,
  duplicateLocalPack,
  listLocalPacks,
  requestPersistentLocalStorage,
  resetLocalPacks,
  type LocalPackSummary,
} from "@/modules/prompt-pack/infrastructure/browser-pack-store";
import {
  createConfigFromTemplate,
  loadBrowserTemplates,
  type BrowserTemplate,
} from "@/modules/prompt-pack/infrastructure/browser-templates";
import { parseJson } from "@/shared/json";

import { JsonImportSection, SavedPacksSection, TemplateGrid } from "./create-pack-sections";

export const CreatePack = () => {
  const router = useRouter();
  const search = useSearchParams();
  const [templates, setTemplates] = useState<BrowserTemplate[]>([]);
  const [savedPacks, setSavedPacks] = useState<LocalPackSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPageData = useCallback(async () => {
    try {
      const [loadedTemplates, packs] = await Promise.all([
        loadBrowserTemplates(),
        listLocalPacks(),
      ]);
      setTemplates(loadedTemplates);
      setSavedPacks(packs);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ローカルデータを読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadPageData());
  }, [loadPageData]);

  const create = async (template: BrowserTemplate): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      const pack = await createLocalPack(createConfigFromTemplate(template));
      void requestPersistentLocalStorage();
      router.push(`/studio/${pack.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "作成できませんでした。");
      setBusy(false);
    }
  };

  const createFromJson = async (file: File): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      if (file.size > PACK_FILE_MAX_BYTES) {
        throw new Error("Importファイルは1MB以内にしてください。");
      }
      const config = importPackJson(parseJson(await file.text()));
      const pack = await createLocalPack(config);
      void requestPersistentLocalStorage();
      router.push(`/studio/${pack.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "JSONをImportできませんでした。");
      setBusy(false);
    }
  };

  const removePack = async (pack: LocalPackSummary): Promise<void> => {
    if (!window.confirm(`「${pack.name}」をこのブラウザから削除しますか？`)) return;
    try {
      await deleteLocalPack(pack.id);
      await loadPageData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "削除できませんでした。");
    }
  };

  const duplicatePack = async (pack: LocalPackSummary): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      const duplicate = await duplicateLocalPack(pack.id);
      router.push(`/studio/${duplicate.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Packを複製できませんでした。");
      setBusy(false);
    }
  };

  const resetAll = async (): Promise<void> => {
    if (
      !window.confirm(
        "このブラウザに保存したすべてのPackを削除します。この操作は元に戻せません。必要なPackは先にJSONで保存してください。",
      )
    )
      return;
    try {
      await resetLocalPacks();
      await loadPageData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "初期化できませんでした。");
    }
  };

  return (
    <main className="shell">
      <header className="site-header">
        <BrandLockup />
      </header>
      <p className="eyebrow">ローカルPack</p>
      <h1>配信の流れに合うお題セットを選ぶ</h1>
      <p className="muted">
        ログインとサーバー保存はありません。設定はこのブラウザへ自動保存され、JSONでバックアップできます。
      </p>

      <SavedPacksSection
        packs={savedPacks}
        busy={busy}
        onReset={resetAll}
        onDuplicate={duplicatePack}
        onRemove={removePack}
      />
      <JsonImportSection busy={busy} onImport={createFromJson} />
      {error !== "" && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <TemplateGrid
        templates={templates}
        selectedTemplateId={search.get("template") ?? ""}
        busy={busy}
        loading={loading}
        onCreate={create}
      />
    </main>
  );
};
