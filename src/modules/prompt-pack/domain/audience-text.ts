import { z } from "zod";

const encoder = new TextEncoder();
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export interface TextLimit {
  graphemes: number;
  bytes: number;
}

export const audienceTextLimits = {
  packName: { graphemes: 80, bytes: 320 },
  faceLabel: { graphemes: 40, bytes: 160 },
  shortFaceLabel: { graphemes: 16, bytes: 64 },
  audienceTitle: { graphemes: 80, bytes: 320 },
  audienceBody: { graphemes: 300, bytes: 1_200 },
} as const satisfies Record<string, TextLimit>;

export const graphemeCount = (value: string): number => {
  return [...segmenter.segment(value)].length;
};

export const byteCount = (value: string): number => {
  return encoder.encode(value).byteLength;
};

export const withinTextLimit = (value: string, limit: TextLimit): boolean => {
  return graphemeCount(value) <= limit.graphemes && byteCount(value) <= limit.bytes;
};

export const boundedTextSchema = (
  name: string,
  minimum: number,
  maximum: number,
  maxBytes = maximum * 4,
) =>
  z
    .string()
    .refine((value) => graphemeCount(value) >= minimum, `${name}は${minimum}文字以上です。`)
    .refine((value) => graphemeCount(value) <= maximum, `${name}は${maximum}文字以内です。`)
    .refine((value) => byteCount(value) <= maxBytes, `${name}のデータ量が上限を超えています。`)
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
      `${name}に制御文字は使えません。`,
    );

export const optionalBoundedTextSchema = (name: string, limit: TextLimit) =>
  boundedTextSchema(name, 0, limit.graphemes, limit.bytes).optional();
