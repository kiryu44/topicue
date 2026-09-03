import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { format, resolveConfig } from "prettier";

const outputPath = new URL("../docs/openapi.json", import.meta.url);
const checking = process.argv.includes("--check");
const bundle = await build({
  entryPoints: ["scripts/openapi-source.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  target: "node24",
  tsconfig: "tsconfig.json",
  write: false,
});
const bundledSource = bundle.outputFiles[0]?.text;
if (bundledSource === undefined) throw new Error("OpenAPI generatorをBundleできませんでした。");
const temporaryDirectory = await mkdtemp(join(process.cwd(), ".topicue-openapi-"));
const temporaryModulePath = join(temporaryDirectory, "openapi-source.mjs");
await writeFile(temporaryModulePath, bundledSource, "utf8");
let generator;
try {
  generator = await import(pathToFileURL(temporaryModulePath).href);
} finally {
  await rm(temporaryDirectory, { recursive: true });
}
const outputFilename = fileURLToPath(outputPath);
const generated = await format(JSON.stringify(await generator.createOpenApiDocument()), {
  ...(await resolveConfig(outputFilename)),
  parser: "json",
  filepath: outputFilename,
});

if (checking) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    throw new Error(
      "docs/openapi.jsonがSchemaと一致しません。pnpm openapi:generateを実行してください。",
    );
  }
} else {
  await writeFile(outputPath, generated, "utf8");
}
