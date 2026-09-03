# Topicue — トークセッション・ダイス

配信用のお題Packをブラウザで作り、3Dダイスを内蔵した単一HTMLをOBSで使うローカルファーストアプリです。DB、Redis、ログイン、必須環境変数はありません。

実装範囲、制約、OBS・Vercel手順、検証結果は[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)に集約しています。

データ契約はZod Schemaから生成した[docs/openapi.json](docs/openapi.json)で確認できます。現在、公開HTTP API endpointはありません。

Schema変更後は`pnpm openapi:generate`でOpenAPIを更新し、`pnpm openapi:check`で生成差分がないことを確認します。

## 起動

Node.js 24とpnpm 11を使います。

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

起動ログに表示されたURLを開き、`/create`からPackを作成します。

## 品質確認

日常的な確認は`pnpm check`でFormat、Lint、TypeScript、Unit Testを一括実行できます。Import順などの自動修正は`pnpm lint:fix`、Prettierによる整形は`pnpm format`で実行します。

リリース前は次をすべて実行します。

```bash
pnpm openapi:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:distribution
pnpm build
pnpm test:e2e
```

## Gitに含めないファイル

次はInstall、起動、Build、Test時にローカルで生成されるため、Git管理しません。

- `node_modules/`
- `.next/`
- `next-env.d.ts`
- `public/standalone-runtime.js`
- `playwright-report/`
- `test-results/`
- `*.tsbuildinfo`
- `.vercel/`
- `.env.example`以外の`.env*`

VercelへのDeploymentでは`.vercelignore`により、テスト、CI、Lint / Format設定、開発資料、`.env.example`をUpload対象から除外します。`src`、`public/data`、Next.js設定、OBS Runtime生成Script、OpenAPI検証に必要なSchema文書はBuild入力として含めます。
