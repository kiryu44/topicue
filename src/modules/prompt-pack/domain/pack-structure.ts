import { DECK_FACE_COUNT, MAX_PROMPTS_PER_PACK } from "./constants";

import type { PackMode } from "./config-schema";
import type { RefinementCtx } from "zod";

interface PackStructure {
  mode: PackMode;
  faces: Array<{
    id: string;
    enabled: boolean;
    prompts: Array<{ id: string; enabled: boolean }>;
  }>;
}

export const validatePackStructure = (config: PackStructure, context: RefinementCtx): void => {
  if (config.mode === "deck" && config.faces.length !== DECK_FACE_COUNT) {
    context.addIssue({ code: "custom", path: ["faces"], message: "Deck Diceは6面固定です。" });
  }
  if (config.mode === "direct") {
    config.faces.forEach((face, index) => {
      const enabledCount = face.prompts.filter((prompt) => prompt.enabled).length;
      if (enabledCount !== 1) {
        context.addIssue({
          code: "custom",
          path: ["faces", index, "prompts"],
          message: "Direct Diceの各面には有効なお題が1件必要です。",
        });
      }
    });
  }
  const prompts = config.faces.flatMap((face) => face.prompts);
  if (prompts.length > MAX_PROMPTS_PER_PACK) {
    context.addIssue({
      code: "custom",
      path: ["faces"],
      message: `お題はPack全体で${MAX_PROMPTS_PER_PACK}件までです。`,
    });
  }
  const ids = [...config.faces.map((face) => face.id), ...prompts.map((prompt) => prompt.id)];
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["faces"], message: "IDが重複しています。" });
  }
  if (!config.faces.some((face) => face.enabled && face.prompts.some((prompt) => prompt.enabled))) {
    context.addIssue({
      code: "custom",
      path: ["faces"],
      message: "有効なお題が1件以上必要です。",
    });
  }
};
