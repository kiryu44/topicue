"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { playBuiltInSound } from "@/modules/renderer/shared/audio";
import { selectPrompt } from "@/modules/selection/engine";
import { BrowserCryptoRandomSource, randomHexSeed } from "@/modules/selection/random";
import { initialSelectionState, type SessionSelectionState } from "@/modules/selection/types";
import { generateStandaloneHtml } from "@/modules/standalone-export/generator";
import { downloadTextFile } from "@/shared/download-file";
import { parseJson } from "@/shared/json";

import {
  exportPackCsv,
  exportPackJson,
  importCsvIntoPack,
  importPackJson,
} from "../application/portable";
import {
  DECK_FACE_COUNT,
  MAX_DIE_FACE_COUNT,
  MAX_PROMPTS_PER_FACE,
  MIN_DIRECT_FACE_COUNT,
  PACK_FILE_MAX_BYTES,
} from "../domain/constants";
import { dieFaceLabel } from "../domain/die-label";
import { byteCount } from "../domain/text";
import {
  deleteLocalPack,
  getLastBackupAt,
  getLocalPack,
  saveLocalPack,
  setLastBackupAt,
  setLastPackId,
  subscribeToPackUpdates,
} from "../infrastructure/browser-pack-store";

import { DiceSettingsPanel } from "./dice-settings-panel";
import { PreviewOutputPanel } from "./preview-output-panel";
import { PromptEditorPanel } from "./prompt-editor-panel";

import type { DownloadKind, PreviewRoll } from "./studio-types";
import type { FaceDeck, Prompt, PromptPackConfigV1 } from "../domain/schema";

type SaveState = "読込中" | "保存中" | "保存済み" | "未保存" | "保存失敗";

interface StudioProps {
  packId: string;
}

const AUTOSAVE_DELAY_MS = 800;
const BACKUP_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1_000;

const configFingerprint = (config: PromptPackConfigV1): string => JSON.stringify(config);

const backupIsOld = (timestamp: string | null): boolean => {
  if (timestamp === null) return true;
  const backedUpAt = Date.parse(timestamp);
  return !Number.isFinite(backedUpAt) || Date.now() - backedUpAt >= BACKUP_STALE_AFTER_MS;
};

const formatBackupStatus = (timestamp: string | null): string => {
  if (timestamp === null) return "まだありません";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "不明" : date.toLocaleString("ja-JP");
};

const createDirectFace = (index: number): FaceDeck => ({
  id: crypto.randomUUID(),
  label: `結果 ${index + 1}`,
  enabled: true,
  prompts: [
    {
      id: crypto.randomUUID(),
      audienceTitle: `結果 ${index + 1}`,
      followUpQuestions: [],
      enabled: true,
    },
  ],
});

const createDeckFace = (index: number): FaceDeck => ({
  id: crypto.randomUUID(),
  label: `カテゴリー${index + 1}`,
  enabled: true,
  prompts: [
    {
      id: crypto.randomUUID(),
      audienceTitle: "新しいお題",
      followUpQuestions: [],
      enabled: true,
    },
  ],
});

const enabledOrFirstPrompt = (face: FaceDeck): Prompt => {
  const prompt = face.prompts.find((candidate) => candidate.enabled) ?? face.prompts[0];
  if (prompt === undefined) throw new Error("結果候補がない面はDirectへ変換できません。");
  return prompt;
};

export const Studio = ({ packId }: StudioProps) => {
  const router = useRouter();
  const [config, setConfig] = useState<PromptPackConfigV1 | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("読込中");
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [jsonImportText, setJsonImportText] = useState("");
  const [lastBackupAt, setLastBackupAtState] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<SessionSelectionState>(initialSelectionState);
  const [previewRoll, setPreviewRoll] = useState<PreviewRoll | null>(null);
  const [previewSettled, setPreviewSettled] = useState(false);
  const loaded = useRef(false);
  const createdAt = useRef("");
  const revision = useRef(0);
  const savedConfigFingerprint = useRef("");
  const previewRevealTimer = useRef<number | null>(null);
  const previewRevealDelay = useRef(0);

  const loadDraft = useCallback(async () => {
    setError("");
    setSaveState("読込中");
    loaded.current = false;
    try {
      const pack = await getLocalPack(packId);
      if (pack === null) throw new Error("このPackはブラウザに保存されていません。");
      createdAt.current = pack.createdAt;
      revision.current = pack.revision;
      savedConfigFingerprint.current = configFingerprint(pack.config);
      setConfig(pack.config);
      setSelectedFaceId(pack.config.faces[0]?.id ?? "");
      setSelectedPromptId(pack.config.faces[0]?.prompts[0]?.id ?? "");
      setLastPackId(pack.id);
      setLastBackupAtState(getLastBackupAt(pack.id));
      setSaveState("保存済み");
      queueMicrotask(() => {
        loaded.current = true;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "読み込めませんでした。");
      setSaveState("保存失敗");
    }
  }, [packId]);

  useEffect(() => {
    queueMicrotask(() => void loadDraft());
  }, [loadDraft]);

  useEffect(() => {
    if (!loaded.current || config === null) return;
    const fingerprint = configFingerprint(config);
    if (fingerprint === savedConfigFingerprint.current) return;
    setSaveState("未保存");
    const timer = window.setTimeout(() => {
      setSaveState("保存中");
      void saveLocalPack({
        id: packId,
        config,
        createdAt: createdAt.current,
        updatedAt: new Date().toISOString(),
        revision: revision.current,
      })
        .then((saved) => {
          revision.current = saved.revision;
          savedConfigFingerprint.current = fingerprint;
          setSaveState("保存済み");
          setError("");
        })
        .catch((caught) => {
          setSaveState("保存失敗");
          setError(caught instanceof Error ? caught.message : "保存できませんでした。");
        });
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [config, packId]);

  useEffect(
    () =>
      subscribeToPackUpdates(packId, (message) => {
        if (message.revision <= revision.current) return;
        loaded.current = false;
        setSaveState("保存失敗");
        setError(
          `別のタブでこのPackが更新されました（${new Date(message.updatedAt).toLocaleTimeString("ja-JP")}）。再読み込みしてください。`,
        );
      }),
    [packId],
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (["未保存", "保存中", "保存失敗"].includes(saveState)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const face =
    config?.faces.find((candidate) => candidate.id === selectedFaceId) ?? config?.faces[0];
  const prompt =
    config?.mode === "direct"
      ? (face?.prompts.find((candidate) => candidate.enabled) ?? face?.prompts[0])
      : (face?.prompts.find((candidate) => candidate.id === selectedPromptId) ?? face?.prompts[0]);
  const previewFace = useMemo(() => {
    if (config === null || previewRoll === null) return null;
    return config.faces.find((candidate) => candidate.id === previewRoll.faceId) ?? null;
  }, [config, previewRoll]);
  const previewPrompt = useMemo(() => {
    if (previewFace === null || previewRoll === null) return null;
    return previewFace.prompts.find((candidate) => candidate.id === previewRoll.promptId) ?? null;
  }, [previewFace, previewRoll]);
  const previewLabels = useMemo(
    () => config?.faces.map((candidate) => dieFaceLabel(candidate)) ?? [],
    [config],
  );
  const previewFaceIds = useMemo(
    () => config?.faces.map((candidate) => candidate.id) ?? [],
    [config],
  );

  useEffect(() => {
    previewRevealDelay.current = config?.animation.revealDelayMs ?? 0;
  }, [config?.animation.revealDelayMs]);

  const settlePreview = useCallback(() => {
    if (previewRevealTimer.current !== null) window.clearTimeout(previewRevealTimer.current);
    previewRevealTimer.current = window.setTimeout(() => {
      setPreviewSettled(true);
      if (config?.animation.landingSoundEnabled) void playBuiltInSound("landing");
      previewRevealTimer.current = null;
    }, previewRevealDelay.current);
  }, [config?.animation.landingSoundEnabled]);

  useEffect(
    () => () => {
      if (previewRevealTimer.current !== null) window.clearTimeout(previewRevealTimer.current);
    },
    [],
  );

  const updateFace = (change: (current: FaceDeck) => FaceDeck): void => {
    if (config === null || face === undefined) return;
    setConfig({
      ...config,
      faces: config.faces.map((candidate) =>
        candidate.id === face.id ? change(candidate) : candidate,
      ),
    });
  };

  const updatePrompt = (change: (current: Prompt) => Prompt): void => {
    if (prompt === undefined) return;
    updateFace((current) => ({
      ...current,
      prompts: current.prompts.map((candidate) =>
        candidate.id === prompt.id ? change(candidate) : candidate,
      ),
    }));
  };

  const addPrompt = (): void => {
    const created: Prompt = {
      id: crypto.randomUUID(),
      audienceTitle: "新しいお題",
      followUpQuestions: [],
      enabled: true,
    };
    updateFace((current) => ({ ...current, prompts: [...current.prompts, created] }));
    setSelectedPromptId(created.id);
  };

  const changeDirectFaceCount = (nextCount: number): void => {
    if (
      config === null ||
      config.mode !== "direct" ||
      nextCount < MIN_DIRECT_FACE_COUNT ||
      nextCount > MAX_DIE_FACE_COUNT
    ) {
      return;
    }
    if (
      nextCount < config.faces.length &&
      !window.confirm(
        `${nextCount + 1}面目以降の結果を削除し、${nextCount}面ダイスに変更しますか？`,
      )
    ) {
      return;
    }
    const faces = config.faces.slice(0, nextCount);
    while (faces.length < nextCount) faces.push(createDirectFace(faces.length));
    setConfig({ ...config, faces });
    const selected = faces.find((candidate) => candidate.id === selectedFaceId) ?? faces[0];
    setSelectedFaceId(selected?.id ?? "");
    setSelectedPromptId(selected?.prompts[0]?.id ?? "");
  };

  const duplicatePrompt = (): void => {
    if (config?.mode !== "deck" || face === undefined || prompt === undefined) return;
    if (face.prompts.length >= MAX_PROMPTS_PER_FACE) return;
    const copy: Prompt = {
      ...prompt,
      id: crypto.randomUUID(),
      audienceTitle: `${prompt.audienceTitle}（コピー）`,
      followUpQuestions: [...prompt.followUpQuestions],
    };
    updateFace((current) => ({ ...current, prompts: [...current.prompts, copy] }));
    setSelectedPromptId(copy.id);
  };

  const movePrompt = (offset: -1 | 1): void => {
    if (face === undefined || prompt === undefined) return;
    const from = face.prompts.findIndex((candidate) => candidate.id === prompt.id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= face.prompts.length) return;
    updateFace((current) => {
      const prompts = [...current.prompts];
      const [moved] = prompts.splice(from, 1);
      if (moved !== undefined) prompts.splice(to, 0, moved);
      return { ...current, prompts };
    });
  };

  const changeMode = (mode: PromptPackConfigV1["mode"]): void => {
    if (config === null || config.mode === mode) return;
    if (
      mode === "direct" &&
      config.faces.some((candidate) => candidate.prompts.length > 1) &&
      !window.confirm(
        "Directでは1面につき結果は1件です。各面で有効になっている1件だけを残し、ほかの結果候補を削除します。切り替えますか？",
      )
    ) {
      return;
    }
    if (
      mode === "deck" &&
      config.faces.length > DECK_FACE_COUNT &&
      !window.confirm(
        "Deckは6面固定です。7面目以降を削除して切り替えますか？必要であれば先にJSONを書き出してください。",
      )
    ) {
      return;
    }
    let faces = config.faces;
    if (mode === "deck") {
      faces = [...faces.slice(0, DECK_FACE_COUNT)];
      while (faces.length < DECK_FACE_COUNT) faces.push(createDeckFace(faces.length));
    } else {
      faces = faces
        .slice(0, Math.max(MIN_DIRECT_FACE_COUNT, Math.min(MAX_DIE_FACE_COUNT, faces.length)))
        .map((candidate) => ({
          ...candidate,
          prompts: [{ ...enabledOrFirstPrompt(candidate), enabled: true }],
        }));
    }
    setConfig({ ...config, mode, faces });
    setSelectedFaceId(faces[0]?.id ?? "");
    setSelectedPromptId(faces[0]?.prompts[0]?.id ?? "");
  };

  const rollPreview = (): void => {
    if (config === null) return;
    try {
      if (previewRevealTimer.current !== null) {
        window.clearTimeout(previewRevealTimer.current);
        previewRevealTimer.current = null;
      }
      setPreviewSettled(false);
      if (config.animation.rollSoundEnabled) void playBuiltInSound("roll");
      const random = new BrowserCryptoRandomSource();
      const selected = selectPrompt({ config, state: previewState, random });
      setPreviewState(selected.nextState);
      setPreviewRoll({
        faceId: selected.faceId,
        promptId: selected.promptId,
        motionSeed: randomHexSeed(random),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "プレビューできませんでした。");
    }
  };

  const download = async (kind: DownloadKind): Promise<void> => {
    if (config === null) return;
    setError("");
    try {
      if (kind === "json") {
        downloadTextFile(
          JSON.stringify(exportPackJson(config), null, 2),
          "application/json",
          "prompt-pack.prompt-dice.json",
        );
        const backedUpAt = new Date().toISOString();
        setLastBackupAt(packId, backedUpAt);
        setLastBackupAtState(backedUpAt);
        return;
      }
      if (kind === "csv") {
        downloadTextFile(exportPackCsv(config), "text/csv;charset=utf-8", "prompt-pack.csv");
        return;
      }
      const response = await fetch("/standalone-runtime.js");
      if (!response.ok) throw new Error("OBS用ランタイムを読み込めませんでした。");
      downloadTextFile(
        generateStandaloneHtml(config, await response.text()),
        "text/html;charset=utf-8",
        "prompt-dice-obs.html",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "出力できませんでした。");
    }
  };

  const removePack = async (): Promise<void> => {
    if (!window.confirm("このPackをブラウザから削除しますか？")) return;
    try {
      await deleteLocalPack(packId);
      router.push("/create");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "削除できませんでした。");
    }
  };

  const applyImportedConfig = (imported: PromptPackConfigV1, sourceName: string): void => {
    if (previewRevealTimer.current !== null) {
      window.clearTimeout(previewRevealTimer.current);
      previewRevealTimer.current = null;
    }
    setConfig(imported);
    setSelectedFaceId(imported.faces[0]?.id ?? "");
    setSelectedPromptId(imported.faces[0]?.prompts[0]?.id ?? "");
    setPreviewState(initialSelectionState());
    setPreviewRoll(null);
    setPreviewSettled(false);
    setError("");
    setImportMessage(`${sourceName}の設定を反映しました。自動保存しています。`);
  };

  const importFile = async (file: File): Promise<void> => {
    if (config === null) return;
    try {
      if (file.size > PACK_FILE_MAX_BYTES) {
        throw new Error("Importファイルは1MB以内にしてください。");
      }
      const text = await file.text();
      const imported = file.name.endsWith(".csv")
        ? importCsvIntoPack(text, config)
        : importPackJson(parseJson(text));
      applyImportedConfig(imported, file.name);
    } catch (caught) {
      setImportMessage("");
      setError(caught instanceof Error ? caught.message : "Importできませんでした。");
    }
  };

  const importPastedJson = (): void => {
    try {
      const bytes = byteCount(jsonImportText);
      if (bytes > PACK_FILE_MAX_BYTES) {
        throw new Error("ImportするJSONは1MB以内にしてください。");
      }
      applyImportedConfig(importPackJson(parseJson(jsonImportText)), "貼り付けたJSON");
      setJsonImportText("");
    } catch (caught) {
      setImportMessage("");
      setError(caught instanceof Error ? caught.message : "JSONをImportできませんでした。");
    }
  };

  if (config === null || face === undefined || prompt === undefined) {
    return (
      <main className="shell">
        <p>{saveState}</p>
        <p className="error">{error}</p>
        {saveState === "保存失敗" && <Link href="/create">Pack一覧へ戻る</Link>}
      </main>
    );
  }

  return (
    <main>
      <header className="studio-toolbar">
        <Link className="brand" href="/create">
          Pack一覧
        </Link>
        <button className="primary" onClick={() => void download("html")}>
          OBS用HTMLを作る
        </button>
        <button onClick={() => void download("json")}>JSONバックアップ</button>
        <button className="danger" onClick={() => void removePack()}>
          Packを削除
        </button>
        <span className="save-state">{saveState} · このブラウザ</span>
      </header>
      <div className="notice" role="status">
        最終JSONバックアップ: {formatBackupStatus(lastBackupAt)}
        {backupIsOld(lastBackupAt) && " — 7日以上バックアップされていません。"}
      </div>
      {error !== "" && (
        <div className="notice error" role="alert">
          {error}
          {saveState === "保存失敗" && (
            <button type="button" onClick={() => void loadDraft()}>
              保存内容を再読み込み
            </button>
          )}
        </div>
      )}
      <div className="studio">
        <DiceSettingsPanel
          config={config}
          selectedFace={face}
          onConfigChange={setConfig}
          onModeChange={changeMode}
          onDirectFaceCountChange={changeDirectFaceCount}
          onFaceSelect={(selected) => {
            setSelectedFaceId(selected.id);
            setSelectedPromptId(selected.prompts[0]?.id ?? "");
          }}
        />
        <PromptEditorPanel
          config={config}
          face={face}
          prompt={prompt}
          onFaceChange={updateFace}
          onPromptChange={updatePrompt}
          onPromptSelect={setSelectedPromptId}
          onPromptAdd={addPrompt}
          onPromptMove={movePrompt}
          onPromptDuplicate={duplicatePrompt}
        />
        <PreviewOutputPanel
          config={config}
          previewRoll={previewRoll}
          previewSettled={previewSettled}
          previewFace={previewFace}
          previewPrompt={previewPrompt}
          previewLabels={previewLabels}
          previewFaceIds={previewFaceIds}
          jsonImportText={jsonImportText}
          importMessage={importMessage}
          onConfigChange={setConfig}
          onPreviewSettled={settlePreview}
          onRoll={rollPreview}
          onDownload={download}
          onFileImport={importFile}
          onJsonImportTextChange={setJsonImportText}
          onPastedJsonImport={importPastedJson}
        />
      </div>
    </main>
  );
};
