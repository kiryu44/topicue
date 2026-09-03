import { DECK_FACE_COUNT, PACK_SCHEMA_VERSION } from "@/modules/prompt-pack/domain/constants";
import {
  defaultAnimation,
  defaultAppearance,
  defaultBehavior,
} from "@/modules/prompt-pack/domain/defaults";
import type { PromptPackConfigV1 } from "@/modules/prompt-pack/domain/schema";

export const PRIVATE_NOTE = "PRIVATE_HOST_NOTE_MUST_NOT_LEAK_7f19c6";

export const uuid = (index: number, prefix = "0"): string => {
  return `${prefix.repeat(8)}-${prefix.repeat(4)}-4000-8000-${index.toString().padStart(12, prefix)}`;
};

export const makeDeck = (promptsPerFace = 2): PromptPackConfigV1 => {
  return {
    schemaVersion: PACK_SCHEMA_VERSION,
    mode: "deck",
    name: "テスト用トークパック",
    description: "抽選仕様を検証するテストデータ",
    locale: "ja-JP",
    faces: [...Array(DECK_FACE_COUNT).keys()].map((faceIndex) => ({
      id: uuid(faceIndex + 1, "1"),
      label: `面${faceIndex + 1}`,
      shortLabel: `F${faceIndex + 1}`,
      enabled: true,
      prompts: [...Array(promptsPerFace).keys()].map((promptIndex) => ({
        id: uuid(faceIndex * promptsPerFace + promptIndex + 1, "2"),
        audienceTitle: `公開お題${faceIndex + 1}-${promptIndex + 1}`,
        audienceBody: "公開本文",
        hostNotes: faceIndex === 0 && promptIndex === 0 ? PRIVATE_NOTE : "秘密の進行メモ",
        followUpQuestions: ["補助質問"],
        suggestedDurationSeconds: 60,
        enabled: true,
      })),
    })),
    selection: { mode: "independent", policy: "prompt_uniform", resetWhenExhausted: true },
    appearance: { ...defaultAppearance },
    animation: { ...defaultAnimation },
    behavior: { ...defaultBehavior },
  };
};

export const makeDirect = (faceCount = 6): PromptPackConfigV1 => {
  const deck = makeDeck(1);
  return { ...deck, mode: "direct", faces: deck.faces.slice(0, faceCount) };
};
