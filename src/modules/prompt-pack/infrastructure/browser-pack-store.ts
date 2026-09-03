import { z } from "zod";

import {
  parsePromptPackConfig,
  promptPackConfigSchema,
  type PackInput,
  type PromptPackConfigV1,
} from "../domain/schema";

const DATABASE_NAME = "topicue-local-packs";
const DATABASE_VERSION = 1;
const PACK_STORE_NAME = "packs";
const LAST_PACK_KEY = "topicue:last-pack-id";
const BACKUP_KEY_PREFIX = "topicue:last-backup:";
const STORAGE_VERSION = 1 as const;
const UPDATE_CHANNEL_NAME = "topicue:pack-updates:v1";

const storedRecordBaseSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const packUpdateMessageSchema = z
  .object({
    packId: z.uuid(),
    revision: z.int().min(1),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const storedPackRecordV1Schema = storedRecordBaseSchema
  .extend({
    storageVersion: z.literal(STORAGE_VERSION),
    pack: promptPackConfigSchema,
    revision: z.int().min(1),
  })
  .strict();

type StoredPackRecordV1 = z.infer<typeof storedPackRecordV1Schema>;

const storedRecordVersionSchema = storedRecordBaseSchema.extend({
  storageVersion: z.number(),
});

export interface LocalPack {
  id: string;
  config: PromptPackConfigV1;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface LocalPackSummary {
  id: string;
  name: string;
  mode: PromptPackConfigV1["mode"];
  faceCount: number;
  updatedAt: string;
  revision: number;
}

export type PackUpdateMessage = z.infer<typeof packUpdateMessageSchema>;

export class LocalPackConflictError extends Error {
  constructor() {
    super("このPackは別のタブで更新されました。再読み込みしてから編集を続けてください。");
  }
}

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("保存処理に失敗しました。")),
      {
        once: true,
      },
    );
  });
};

const transactionDone = (transaction: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("保存処理が中断されました。")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("保存処理に失敗しました。")),
      { once: true },
    );
  });
};

const openDatabase = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("このブラウザではローカル保存を利用できません。"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener(
      "upgradeneeded",
      () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PACK_STORE_NAME)) {
          const store = database.createObjectStore(PACK_STORE_NAME, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
      },
      { once: true },
    );
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("ローカル保存を開けませんでした。")),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () => reject(new Error("別のタブを閉じてから、もう一度お試しください。")),
      { once: true },
    );
  });
};

export const parseStoredPackRecord = (record: PackInput): LocalPack => {
  const current = storedPackRecordV1Schema.safeParse(record);
  if (current.success) {
    return {
      id: current.data.id,
      config: current.data.pack,
      createdAt: current.data.createdAt,
      updatedAt: current.data.updatedAt,
      revision: current.data.revision,
    };
  }
  const version = storedRecordVersionSchema.safeParse(record);
  if (version.success && version.data.storageVersion !== STORAGE_VERSION) {
    throw new Error("未対応の保存データVersionです。");
  }
  throw new Error("保存データの基本情報が壊れています。");
};

const storedRecord = (pack: LocalPack): StoredPackRecordV1 => {
  return {
    id: pack.id,
    storageVersion: STORAGE_VERSION,
    pack: parsePromptPackConfig(pack.config),
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
    revision: pack.revision,
  };
};

export const createLocalPack = async (config: PromptPackConfigV1): Promise<LocalPack> => {
  const now = new Date().toISOString();
  const pack: LocalPack = {
    id: crypto.randomUUID(),
    config: parsePromptPackConfig(config),
    createdAt: now,
    updatedAt: now,
    revision: 0,
  };
  const saved = await saveLocalPack(pack);
  setLastPackId(saved.id);
  return saved;
};

export const saveLocalPack = async (pack: LocalPack): Promise<LocalPack> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PACK_STORE_NAME, "readwrite");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(PACK_STORE_NAME);
    const raw = await requestResult(store.get(pack.id) as IDBRequest<PackInput>);
    if (raw !== undefined) {
      const existing = parseStoredPackRecord(raw);
      if (existing.revision !== pack.revision) {
        await done;
        throw new LocalPackConflictError();
      }
    } else if (pack.revision !== 0) {
      await done;
      throw new LocalPackConflictError();
    }
    const saved: LocalPack = {
      ...pack,
      config: parsePromptPackConfig(pack.config),
      revision: pack.revision + 1,
    };
    store.put(storedRecord(saved));
    await done;
    publishPackUpdate(saved);
    return saved;
  } finally {
    database.close();
  }
};

export const getLocalPack = async (id: string): Promise<LocalPack | null> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PACK_STORE_NAME, "readonly");
    const result = await requestResult(
      transaction.objectStore(PACK_STORE_NAME).get(id) as IDBRequest<PackInput>,
    );
    return result === undefined ? null : parseStoredPackRecord(result);
  } finally {
    database.close();
  }
};

export const listLocalPacks = async (): Promise<LocalPackSummary[]> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PACK_STORE_NAME, "readonly");
    const records = await requestResult(
      transaction.objectStore(PACK_STORE_NAME).getAll() as IDBRequest<PackInput[]>,
    );
    return records
      .map(parseStoredPackRecord)
      .map((pack) => ({
        id: pack.id,
        name: pack.config.name,
        mode: pack.config.mode,
        faceCount: pack.config.faces.length,
        updatedAt: pack.updatedAt,
        revision: pack.revision,
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } finally {
    database.close();
  }
};

export const duplicateLocalPack = async (id: string): Promise<LocalPack> => {
  const source = await getLocalPack(id);
  if (source === null) throw new Error("複製元のPackが見つかりません。");
  const config = parsePromptPackConfig({
    ...source.config,
    name: `${source.config.name}（コピー）`,
    faces: source.config.faces.map((face) => ({
      ...face,
      id: crypto.randomUUID(),
      prompts: face.prompts.map((prompt) => ({ ...prompt, id: crypto.randomUUID() })),
    })),
  });
  return createLocalPack(config);
};

export const deleteLocalPack = async (id: string): Promise<void> => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(PACK_STORE_NAME, "readwrite");
    transaction.objectStore(PACK_STORE_NAME).delete(id);
    await transactionDone(transaction);
    if (getLastPackId() === id) setLastPackId(null);
    if (typeof localStorage !== "undefined") localStorage.removeItem(`${BACKUP_KEY_PREFIX}${id}`);
  } finally {
    database.close();
  }
};

export const resetLocalPacks = async (): Promise<void> => {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.addEventListener("success", () => resolve(), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("初期化できませんでした。")),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () => reject(new Error("Studioを開いている別のタブを閉じてから初期化してください。")),
      { once: true },
    );
  });
  setLastPackId(null);
  if (typeof localStorage !== "undefined") {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(BACKUP_KEY_PREFIX)) localStorage.removeItem(key);
    }
  }
};

export const getLastPackId = (): string | null => {
  return typeof localStorage === "undefined" ? null : localStorage.getItem(LAST_PACK_KEY);
};

export const setLastPackId = (id: string | null): void => {
  if (typeof localStorage === "undefined") return;
  if (id === null) localStorage.removeItem(LAST_PACK_KEY);
  else localStorage.setItem(LAST_PACK_KEY, id);
};

export const getLastBackupAt = (packId: string): string | null => {
  return typeof localStorage === "undefined"
    ? null
    : localStorage.getItem(`${BACKUP_KEY_PREFIX}${packId}`);
};

export const setLastBackupAt = (packId: string, timestamp: string): void => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(`${BACKUP_KEY_PREFIX}${packId}`, timestamp);
  }
};

export const requestPersistentLocalStorage = async (): Promise<boolean> => {
  if (navigator.storage?.persist === undefined) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
};

export const subscribeToPackUpdates = (
  packId: string,
  listener: (message: PackUpdateMessage) => void,
): (() => void) => {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
  const receive = (event: MessageEvent<PackInput>): void => {
    const message = packUpdateMessageSchema.safeParse(event.data);
    if (message.success && message.data.packId === packId) listener(message.data);
  };
  channel.addEventListener("message", receive);
  return () => {
    channel.removeEventListener("message", receive);
    channel.close();
  };
};

const publishPackUpdate = (pack: LocalPack): void => {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
  channel.postMessage(
    packUpdateMessageSchema.parse({
      packId: pack.id,
      revision: pack.revision,
      updatedAt: pack.updatedAt,
    }),
  );
  window.setTimeout(() => channel.close(), 0);
};
