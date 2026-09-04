import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { importPackJson } from "@/modules/prompt-pack/application/portable";
import { generateStandaloneHtml } from "@/modules/standalone-export/generator";
import { parseJson } from "@/shared/json";

describe("local-first public assets", () => {
  it("combines the public sample and bundled runtime into an offline HTML", async () => {
    const [sampleSource, runtime] = await Promise.all([
      readFile(new URL("../../public/data/sample.prompt-dice.json", import.meta.url), "utf8"),
      readFile(new URL("../../public/standalone-runtime.js", import.meta.url), "utf8"),
    ]);
    const config = importPackJson(parseJson(sampleSource));
    expect(config.appearance.themeId).toBe("idol_pop");
    const privateHostNote = "PRIVATE_HOST_NOTE_MUST_NOT_LEAK";
    const firstPrompt = config.faces[0]?.prompts[0];
    if (firstPrompt === undefined) throw new Error("サンプルにお題がありません。");
    firstPrompt.hostNotes = privateHostNote;
    const html = generateStandaloneHtml(config, runtime);

    expect(runtime.length).toBeGreaterThan(100_000);
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("standalone-renderer");
    expect(html).toContain("standalone-history-panel");
    expect(html).toContain("export-history");
    expect(html).not.toContain('data-action="roll"');
    expect(html).toContain("JSON Importサンプル");
    expect(html).not.toContain(privateHostNote);
    expect(html).not.toMatch(/<script[^>]+src=/u);
  });
});
