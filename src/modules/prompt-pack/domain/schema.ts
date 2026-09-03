import { z } from "zod";

import type { JsonPrimitive } from "@/shared/json";

import {
  animationConfigSchema,
  appearanceConfigSchema,
  behaviorConfigSchema,
  localeSchema,
  packModeSchema,
  selectionConfigSchema,
} from "./config-schema";
import {
  MAX_DIE_FACE_COUNT,
  MAX_PROMPTS_PER_FACE,
  MIN_DIRECT_FACE_COUNT,
  PACK_FILE_MAX_BYTES,
  PACK_SCHEMA_VERSION,
  SUGGESTED_DURATION_SECONDS,
} from "./constants";
import { validatePackStructure } from "./pack-structure";
import { boundedTextSchema, byteCount, textLimits } from "./text";

const optionalText = (name: string, maximum: number, maxBytes = maximum * 4) =>
  boundedTextSchema(name, 0, maximum, maxBytes).optional();

export const promptSchema = z
  .object({
    id: z.uuid(),
    audienceTitle: boundedTextSchema(
      "タイトル",
      1,
      textLimits.audienceTitle.graphemes,
      textLimits.audienceTitle.bytes,
    ),
    audienceBody: optionalText(
      "本文",
      textLimits.audienceBody.graphemes,
      textLimits.audienceBody.bytes,
    ),
    hostNotes: optionalText(
      "配信者メモ",
      textLimits.hostNotes.graphemes,
      textLimits.hostNotes.bytes,
    ),
    followUpQuestions: z
      .array(
        boundedTextSchema(
          "補助質問",
          1,
          textLimits.followUpQuestion.graphemes,
          textLimits.followUpQuestion.bytes,
        ),
      )
      .max(textLimits.followUpQuestionCount),
    suggestedDurationSeconds: z
      .int()
      .min(SUGGESTED_DURATION_SECONDS.minimum)
      .max(SUGGESTED_DURATION_SECONDS.maximum)
      .optional(),
    enabled: z.boolean(),
  })
  .strict();

export const faceDeckSchema = z
  .object({
    id: z.uuid(),
    label: boundedTextSchema(
      "カテゴリー名",
      1,
      textLimits.faceLabel.graphemes,
      textLimits.faceLabel.bytes,
    ),
    shortLabel: optionalText(
      "短いカテゴリー名",
      textLimits.shortFaceLabel.graphemes,
      textLimits.shortFaceLabel.bytes,
    ),
    enabled: z.boolean(),
    prompts: z.array(promptSchema).min(1).max(MAX_PROMPTS_PER_FACE),
  })
  .strict();

const packNameSchema = boundedTextSchema(
  "Pack名",
  1,
  textLimits.packName.graphemes,
  textLimits.packName.bytes,
);

export const promptPackConfigSchema = z
  .object({
    schemaVersion: z.literal(PACK_SCHEMA_VERSION),
    mode: packModeSchema,
    name: packNameSchema,
    description: optionalText(
      "説明",
      textLimits.description.graphemes,
      textLimits.description.bytes,
    ),
    locale: localeSchema,
    faces: z.array(faceDeckSchema).min(MIN_DIRECT_FACE_COUNT).max(MAX_DIE_FACE_COUNT),
    selection: selectionConfigSchema,
    appearance: appearanceConfigSchema,
    animation: animationConfigSchema,
    behavior: behaviorConfigSchema,
  })
  .strict()
  .superRefine(validatePackStructure);

export type Prompt = z.infer<typeof promptSchema>;
export type FaceDeck = z.infer<typeof faceDeckSchema>;
export type PromptPackConfigV1 = z.infer<typeof promptPackConfigSchema>;
export type PackInput = JsonPrimitive | object | undefined;

export const parsePromptPackConfig = (input: PackInput): PromptPackConfigV1 => {
  const serializedBytes = byteCount(JSON.stringify(input) ?? "");
  if (serializedBytes > PACK_FILE_MAX_BYTES) {
    throw new Error("Pack設定は1MB以内です。");
  }
  return promptPackConfigSchema.parse(input);
};
