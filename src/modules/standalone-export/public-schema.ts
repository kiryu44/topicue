import { z } from "zod";

import {
  audienceTextLimits,
  boundedTextSchema,
  optionalBoundedTextSchema,
} from "@/modules/prompt-pack/domain/audience-text";
import {
  animationConfigSchema,
  appearanceConfigSchema,
  behaviorConfigSchema,
  localeSchema,
  packModeSchema,
  selectionConfigSchema,
} from "@/modules/prompt-pack/domain/config-schema";
import {
  MAX_DIE_FACE_COUNT,
  MAX_PROMPTS_PER_FACE,
  MIN_DIRECT_FACE_COUNT,
  PACK_SCHEMA_VERSION,
} from "@/modules/prompt-pack/domain/constants";
import { validatePackStructure } from "@/modules/prompt-pack/domain/pack-structure";

const publicStandalonePromptSchema = z
  .object({
    id: z.uuid(),
    audienceTitle: boundedTextSchema(
      "タイトル",
      1,
      audienceTextLimits.audienceTitle.graphemes,
      audienceTextLimits.audienceTitle.bytes,
    ),
    audienceBody: optionalBoundedTextSchema("本文", audienceTextLimits.audienceBody),
    enabled: z.boolean(),
  })
  .strict();

const publicStandaloneFaceSchema = z
  .object({
    id: z.uuid(),
    label: boundedTextSchema(
      "カテゴリー名",
      1,
      audienceTextLimits.faceLabel.graphemes,
      audienceTextLimits.faceLabel.bytes,
    ),
    shortLabel: optionalBoundedTextSchema("短いカテゴリー名", audienceTextLimits.shortFaceLabel),
    enabled: z.boolean(),
    prompts: z.array(publicStandalonePromptSchema).min(1).max(MAX_PROMPTS_PER_FACE),
  })
  .strict();

export const publicStandaloneConfigSchema = z
  .object({
    schemaVersion: z.literal(PACK_SCHEMA_VERSION),
    mode: packModeSchema,
    name: boundedTextSchema(
      "Pack名",
      1,
      audienceTextLimits.packName.graphemes,
      audienceTextLimits.packName.bytes,
    ),
    locale: localeSchema,
    faces: z.array(publicStandaloneFaceSchema).min(MIN_DIRECT_FACE_COUNT).max(MAX_DIE_FACE_COUNT),
    selection: selectionConfigSchema,
    appearance: appearanceConfigSchema,
    animation: animationConfigSchema,
    behavior: behaviorConfigSchema,
  })
  .strict()
  .superRefine(validatePackStructure);

export type PublicStandaloneConfigV1 = z.infer<typeof publicStandaloneConfigSchema>;
