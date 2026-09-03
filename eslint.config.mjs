import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  globalIgnores([
    ".next/**",
    "generated/**",
    "public/standalone-runtime.js",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: {
      eqeqeq: ["error", "always"],
      "func-style": ["error", "expression"],
      "import/no-cycle": ["error", { ignoreExternal: true }],
      "import/no-duplicates": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          pathGroups: [{ pattern: "@/**", group: "internal", position: "before" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "抽選にはCrypto由来のRandomSourceを使用してください。",
        },
      ],
      "no-unused-vars": ["error", { args: "all", caughtErrors: "all" }],
      "prefer-arrow-callback": "error",
      "react/no-danger": "error",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["error", { args: "all", caughtErrors: "all" }],
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSUnknownKeyword",
          message: "外部入力には具体的な入力型と実行時Schema検証を使用してください。",
        },
      ],
    },
  },
  {
    files: ["src/modules/prompt-pack/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "navigator",
        "localStorage",
        "sessionStorage",
        "indexedDB",
        "matchMedia",
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/**",
                "next",
                "next/**",
                "pg",
                "redis",
                "ioredis",
                "@/app/**",
                "@/modules/**/ui/**",
                "@/modules/**/infrastructure/**",
                "../application/**",
                "../infrastructure/**",
                "../ui/**",
              ],
              message: "Domain層からUI・Framework・Infrastructureへは依存できません。",
            },
          ],
        },
      ],
    },
  },
]);
