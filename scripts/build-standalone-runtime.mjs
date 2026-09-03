import { build } from "esbuild";

await build({
  entryPoints: ["src/modules/standalone-export/runtime-entry.ts"],
  outfile: "public/standalone-runtime.js",
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "iife",
  platform: "browser",
  target: ["chrome109", "firefox115", "safari16"],
  tsconfig: "tsconfig.json",
});
