import { z } from "zod";

import {
  DECK_FACE_COUNT,
  DEFAULT_SUGGESTED_DURATION_SECONDS,
  MAX_PROMPTS_PER_FACE,
  PACK_SCHEMA_VERSION,
} from "../domain/constants";
import { defaultAnimation, defaultAppearance, defaultBehavior } from "../domain/defaults";
import { parsePromptPackConfig, type PromptPackConfigV1 } from "../domain/schema";

const TEMPLATE_CATALOG_SCHEMA_VERSION = 1 as const;

const templateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    packName: z.string().min(1),
    faces: z
      .array(
        z
          .object({
            label: z.string().min(1),
            prompts: z.array(z.string().min(1)).min(1).max(MAX_PROMPTS_PER_FACE),
          })
          .strict(),
      )
      .length(DECK_FACE_COUNT),
  })
  .strict();

const catalogSchema = z
  .object({
    schemaVersion: z.literal(TEMPLATE_CATALOG_SCHEMA_VERSION),
    templates: z.array(templateSchema).min(1),
  })
  .strict();

export type BrowserTemplate = z.infer<typeof templateSchema>;

export const loadBrowserTemplates = async (): Promise<BrowserTemplate[]> => {
  const response = await fetch("/data/templates.json");
  if (!response.ok) throw new Error("サンプルを読み込めませんでした。");
  return catalogSchema.parse(await response.json()).templates;
};

export const createConfigFromTemplate = (template: BrowserTemplate): PromptPackConfigV1 => {
  return parsePromptPackConfig({
    schemaVersion: PACK_SCHEMA_VERSION,
    mode: "deck",
    name: template.packName,
    description: template.description,
    locale: "ja-JP",
    faces: template.faces.map((face) => ({
      id: crypto.randomUUID(),
      label: face.label,
      shortLabel: face.label,
      enabled: true,
      prompts: face.prompts.map((title) => ({
        id: crypto.randomUUID(),
        audienceTitle: title,
        audienceBody: "具体的な出来事や、そのとき感じたことも交えて話してみましょう。",
        hostNotes: "話が広がらない場合は、時期やきっかけを聞いてみましょう。",
        followUpQuestions: ["きっかけは何でしたか？", "今振り返るとどう感じますか？"],
        suggestedDurationSeconds: DEFAULT_SUGGESTED_DURATION_SECONDS,
        enabled: true,
      })),
    })),
    selection: { mode: "shuffle_bag", policy: "face_uniform", resetWhenExhausted: true },
    appearance: { ...defaultAppearance },
    animation: { ...defaultAnimation },
    behavior: { ...defaultBehavior },
  });
};
