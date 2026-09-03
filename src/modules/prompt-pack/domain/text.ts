import { audienceTextLimits } from "./audience-text";

export { boundedTextSchema, byteCount, graphemeCount, withinTextLimit } from "./audience-text";

export const textLimits = {
  ...audienceTextLimits,
  description: { graphemes: 500, bytes: 2_000 },
  hostNotes: { graphemes: 1_000, bytes: 4_000 },
  followUpQuestion: { graphemes: 120, bytes: 480 },
  followUpQuestionCount: 10,
} as const;
