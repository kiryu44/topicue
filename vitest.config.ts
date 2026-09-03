import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const resolve = { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } };

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 30_000,
        },
      },
      {
        resolve,
        test: {
          name: "distribution",
          environment: "node",
          include: ["tests/distribution/**/*.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
  resolve,
});
