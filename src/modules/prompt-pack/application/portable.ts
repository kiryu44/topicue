import { z } from "zod";

import { PACK_EXPORT_FORMAT, PACK_SCHEMA_VERSION } from "../domain/constants";
import {
  parsePromptPackConfig,
  promptPackConfigSchema,
  type PackInput,
  type PromptPackConfigV1,
} from "../domain/schema";

export const packExportSchema = z
  .object({
    format: z.literal(PACK_EXPORT_FORMAT),
    schemaVersion: z.literal(PACK_SCHEMA_VERSION),
    exportedAt: z.iso.datetime(),
    pack: promptPackConfigSchema,
  })
  .strict();

export type PackExportV1 = z.infer<typeof packExportSchema>;

export const exportPackJson = (pack: PromptPackConfigV1, now = new Date()): PackExportV1 => {
  return {
    format: PACK_EXPORT_FORMAT,
    schemaVersion: PACK_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    pack,
  };
};

export const importPackJson = (input: PackInput): PromptPackConfigV1 => {
  if (
    typeof input === "object" &&
    input !== null &&
    "schemaVersion" in input &&
    input["schemaVersion"] !== PACK_SCHEMA_VERSION
  ) {
    throw new Error("このファイルのschemaVersionには対応していません。");
  }
  const isEnvelope =
    typeof input === "object" &&
    input !== null &&
    ("format" in input || "exportedAt" in input || "pack" in input);
  if (!isEnvelope) return parsePromptPackConfig(input);
  const envelope = packExportSchema.parse(input);
  return parsePromptPackConfig(envelope.pack);
};

export const csvHeader = [
  "face_label",
  "audience_title",
  "audience_body",
  "host_notes",
  "follow_up_questions",
  "suggested_duration_seconds",
  "enabled",
] as const;

const quoteCsv = (value: string): string => {
  return /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
};

export const exportPackCsv = (pack: PromptPackConfigV1): string => {
  const rows = pack.faces.flatMap((face) =>
    face.prompts.map((prompt) =>
      [
        face.label,
        prompt.audienceTitle,
        prompt.audienceBody ?? "",
        prompt.hostNotes ?? "",
        prompt.followUpQuestions.join("|"),
        prompt.suggestedDurationSeconds?.toString() ?? "",
        prompt.enabled ? "true" : "false",
      ]
        .map(quoteCsv)
        .join(","),
    ),
  );
  return `\uFEFF${csvHeader.join(",")}\r\n${rows.join("\r\n")}\r\n`;
};

const parseCsvRows = (source: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = source.replace(/^\uFEFF/u, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSVの引用符が閉じられていません。");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

export const importCsvIntoPack = (source: string, base: PromptPackConfigV1): PromptPackConfigV1 => {
  const rows = parseCsvRows(source);
  const header = rows.shift();
  if (header === undefined || header.join(",") !== csvHeader.join(","))
    throw new Error("CSVヘッダーが一致しません。");
  const faces = new Map<string, PromptPackConfigV1["faces"][number]>();
  const errors: string[] = [];
  rows.forEach((columns, index) => {
    if (columns.every((column) => column === "")) return;
    if (columns.length !== csvHeader.length) {
      errors.push(`${index + 2}行目: 列数が一致しません。`);
      return;
    }
    const [
      label = "",
      title = "",
      body = "",
      notes = "",
      followUps = "",
      duration = "",
      enabled = "",
    ] = columns;
    if (label.length === 0 || title.length === 0) {
      errors.push(`${index + 2}行目: face_labelとaudience_titleは必須です。`);
      return;
    }
    const parsedDuration = duration === "" ? undefined : Number(duration);
    if (parsedDuration !== undefined && !Number.isInteger(parsedDuration)) {
      errors.push(`${index + 2}行目: suggested_duration_secondsは整数です。`);
      return;
    }
    const face = faces.get(label) ?? {
      id: globalThis.crypto.randomUUID(),
      label,
      enabled: true,
      prompts: [],
    };
    face.prompts.push({
      id: globalThis.crypto.randomUUID(),
      audienceTitle: title,
      ...(body === "" ? {} : { audienceBody: body }),
      ...(notes === "" ? {} : { hostNotes: notes }),
      followUpQuestions: followUps === "" ? [] : followUps.split("|"),
      ...(parsedDuration === undefined ? {} : { suggestedDurationSeconds: parsedDuration }),
      enabled: enabled.toLowerCase() !== "false",
    });
    faces.set(label, face);
  });
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return parsePromptPackConfig({ ...base, faces: [...faces.values()] });
};
