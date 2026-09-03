import { describe, expect, it } from "vitest";

import { createOpenApiDocument } from "../../scripts/openapi-source";

describe("OpenAPI document", () => {
  it("generates the three current data contracts from Zod schemas", async () => {
    const document = await createOpenApiDocument();

    expect(document.openapi).toBe("3.1.0");
    expect(document.paths).toEqual({});
    expect(Object.keys(document.components?.schemas ?? {})).toEqual([
      "PackExportV1",
      "PromptPackConfigV1",
      "PublicStandaloneConfigV1",
    ]);
  });

  it("does not expose host-only prompt fields in the public standalone contract", async () => {
    const document = await createOpenApiDocument();
    const publicSchema = document.components?.schemas?.["PublicStandaloneConfigV1"];
    if (publicSchema === undefined) throw new Error("PublicStandaloneConfigV1がありません。");

    const serialized = JSON.stringify(publicSchema);
    expect(serialized).not.toContain("hostNotes");
    expect(serialized).not.toContain("followUpQuestions");
    expect(serialized).not.toContain("suggestedDurationSeconds");
    expect(serialized).toContain('"pattern":"^#[0-9A-Fa-f]{6}$"');
  });
});
