import { describe, expect, it } from "vitest";

import {
  exportPackCsv,
  exportPackJson,
  importCsvIntoPack,
  importPackJson,
} from "@/modules/prompt-pack/application/portable";
import { dieFaceLabel } from "@/modules/prompt-pack/domain/die-label";
import { parsePromptPackConfig } from "@/modules/prompt-pack/domain/schema";

import sample from "../../public/data/sample.prompt-dice.json";
import { makeDeck, makeDirect } from "../fixtures/pack";

describe("PromptPackConfigV1", () => {
  it("accepts Direct Dice with 3 and 20 faces", () => {
    expect(parsePromptPackConfig(makeDirect(3)).faces).toHaveLength(3);
    const direct20 = makeDirect(6);
    while (direct20.faces.length < 20) {
      const source = makeDirect(3).faces[0];
      if (source === undefined) throw new Error("fixture");
      const index = direct20.faces.length + 1;
      direct20.faces.push({
        ...source,
        id: crypto.randomUUID(),
        label: `面${index}`,
        prompts: source.prompts.map((prompt) => ({ ...prompt, id: crypto.randomUUID() })),
      });
    }
    expect(parsePromptPackConfig(direct20).faces).toHaveLength(20);
  });

  it("uses one consistent face-label rule for Deck and Direct", () => {
    const face = makeDirect(3).faces[0];
    const prompt = face?.prompts[0];
    if (face === undefined || prompt === undefined) throw new Error("fixture");
    face.label = "カテゴリー名";
    delete face.shortLabel;
    prompt.audienceTitle = "結果タイトル";
    expect(dieFaceLabel(face)).toBe("カテゴリー名");
    face.shortLabel = "短縮名";
    expect(dieFaceLabel(face)).toBe("短縮名");
  });

  it("rejects invalid Direct and Deck cardinality", () => {
    expect(() => parsePromptPackConfig(makeDirect(2))).toThrow();
    const deck = makeDeck();
    deck.faces.pop();
    expect(() => parsePromptPackConfig(deck)).toThrow("Deck Diceは6面固定");
  });

  it("rejects duplicate IDs, no enabled prompts, and overlong grapheme strings", () => {
    const duplicate = makeDeck();
    const first = duplicate.faces[0];
    const second = duplicate.faces[1];
    if (first === undefined || second === undefined) throw new Error("fixture");
    second.id = first.id;
    expect(() => parsePromptPackConfig(duplicate)).toThrow("IDが重複");
    const disabled = makeDeck();
    disabled.faces.forEach((face) => {
      face.enabled = false;
    });
    expect(() => parsePromptPackConfig(disabled)).toThrow("有効なお題");
    const long = makeDeck();
    long.name = "🎲".repeat(81);
    expect(() => parsePromptPackConfig(long)).toThrow();
  });

  it("imports both exported envelopes and bare Pack configuration JSON", () => {
    const pack = makeDeck();
    expect(importPackJson(exportPackJson(pack))).toEqual(pack);
    expect(importPackJson(pack)).toEqual(pack);
  });

  it("round-trips every field promised by the lossy CSV format", () => {
    const pack = makeDeck();
    const first = pack.faces[0]?.prompts[0];
    if (first === undefined) throw new Error("fixture");
    first.audienceTitle = 'カンマ, 引用符"と改行\nを含むタイトル';
    first.audienceBody = "本文1行目\n本文2行目";
    first.hostNotes = '配信者だけの"メモ"';
    first.followUpQuestions = ["質問A", "質問B"];
    first.suggestedDurationSeconds = 75;

    const imported = importCsvIntoPack(exportPackCsv(pack), pack);
    expect(exportPackCsv(pack).split("\r\n", 1)[0]).not.toContain("tags");
    const restored = imported.faces[0]?.prompts[0];
    expect(restored).toMatchObject({
      audienceTitle: first.audienceTitle,
      audienceBody: first.audienceBody,
      hostNotes: first.hostNotes,
      followUpQuestions: first.followUpQuestions,
      suggestedDurationSeconds: 75,
      enabled: true,
    });
  });

  it("rejects retired config fields, theme ids, and incomplete appearance settings", () => {
    const pack = makeDeck();
    const prompt = pack.faces[0]?.prompts[0];
    if (prompt === undefined) throw new Error("fixture");
    Object.assign(prompt, { faceLabel: "廃止済みラベル" });
    expect(() => parsePromptPackConfig(pack)).toThrow();

    const retiredTheme = makeDeck();
    expect(() =>
      parsePromptPackConfig({
        ...retiredTheme,
        appearance: { ...retiredTheme.appearance, themeId: "midnight" },
      }),
    ).toThrow();

    const missingFont = makeDeck();
    delete (missingFont.appearance as Partial<typeof missingFont.appearance>).fontPreset;
    expect(() => parsePromptPackConfig(missingFont)).toThrow();
  });

  it("rejects unsupported JSON export versions", () => {
    const exported = { ...exportPackJson(makeDeck()), schemaVersion: 2 };
    expect(() => importPackJson(exported)).toThrow("schemaVersionには対応していません");
  });

  it("imports the public sample without modification", () => {
    const pack = importPackJson(sample);
    expect(pack.name).toBe("JSON Importサンプル");
    expect(pack.faces).toHaveLength(6);
  });
});
