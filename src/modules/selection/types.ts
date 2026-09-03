import { z } from "zod";

import type { SelectionConfig } from "@/modules/prompt-pack/domain/config-schema";

export interface RandomSource {
  nextInt(maxExclusive: number): number;
  bytes(length: number): Uint8Array;
}

export const sessionSelectionStateSchema = z
  .object({
    lastPromptId: z.string().nullable(),
    usedPromptIds: z.array(z.string()),
    globalShuffleBag: z.array(z.string()),
    perFaceShuffleBags: z.record(z.string(), z.array(z.string())),
  })
  .strict();

export type SessionSelectionState = z.infer<typeof sessionSelectionStateSchema>;

export interface SelectionPrompt {
  id: string;
  enabled: boolean;
}

export interface SelectionFace {
  id: string;
  enabled: boolean;
  prompts: SelectionPrompt[];
}

export interface SelectionPack {
  faces: SelectionFace[];
  selection: SelectionConfig;
}

export interface SelectionResult {
  faceId: string;
  promptId: string;
  nextState: SessionSelectionState;
  diagnostics: { eligibleFaceCount: number; eligiblePromptCount: number };
}

export interface SelectionInput {
  config: SelectionPack;
  state: SessionSelectionState;
  random: RandomSource;
}

export class SelectionError extends Error {
  constructor(readonly code: "NO_ELIGIBLE_PROMPTS" | "PROMPTS_EXHAUSTED") {
    super(code === "PROMPTS_EXHAUSTED" ? "お題をすべて使用しました。" : "有効なお題がありません。");
  }
}

export const initialSelectionState = (): SessionSelectionState => {
  return {
    lastPromptId: null,
    usedPromptIds: [],
    globalShuffleBag: [],
    perFaceShuffleBags: {},
  };
};
