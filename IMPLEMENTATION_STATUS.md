# Topicue 現行実装

- 最終確認日: 2026-09-03
- 対象: このリポジトリの現在の作業ツリー
- 記載基準: `src`、`public`、`scripts`、設定ファイル、テストコード、および実行した検証結果から確認できる事実

この文書には将来案を含めません。コードまたは実行結果から確認できない項目は「未実装」または「未確認」として記載します。

## 1. アプリケーション概要

Topicueは、配信用のお題Packをブラウザで作成・編集し、抽選機能とダイス表示を内蔵したOBS用HTMLを生成するNext.jsアプリです。

```text
Next.js画面
  └─ PackをブラウザのIndexedDBへ保存
       ├─ JSON / CSV Import・Export
       ├─ Studio内で抽選Preview
       └─ OBS用の単一HTMLを生成
            └─ OBS Browser SourceのLocal Fileとして実行
```

現行コードにはPostgreSQL、Redis、サーバーサイドDBのMigration、Seed、ログイン、サーバー側Pack保存、公開HTTP APIはありません。Packの編集データはサーバーへ送信せず、ブラウザ内に保存します。

## 2. 使用技術とVersion

`package.json`に記載されている直接依存は次のとおりです。

| 種類              | Package / Version                      |
| ----------------- | -------------------------------------- |
| Runtime           | Node.js `>=24.0.0 <25`                 |
| Package管理       | pnpm `>=11.0.0 <12`                    |
| Framework         | Next.js `16.3.4`                       |
| UI                | React / React DOM `19.2.8`             |
| 3D                | Three.js `0.185.1`                     |
| Node型定義        | @types/node `24.13.3`                  |
| React型定義       | @types/react `19.2.18` / DOM `19.2.5`  |
| Three型定義       | @types/three `0.185.4`                 |
| Schema            | Zod `4.5.4`                            |
| Language          | TypeScript `6.0.3`                     |
| Lint              | ESLint `9.39.5`                        |
| Lint / Format連携 | eslint-config-prettier `10.1.8`        |
| Unit test         | Vitest `4.1.11`                        |
| E2E               | Playwright `1.62.1`                    |
| Accessibility     | @axe-core/playwright `4.13.0`          |
| Build補助         | esbuild `0.28.2`                       |
| OpenAPI生成       | @asteasolutions/zod-to-openapi `9.1.0` |

通常のCSSを使用しています。Tailwind CSSとCSS-in-JSは使用していません。

## 3. 実装済み画面

| URL                | 現在の実装                                                                   |
| ------------------ | ---------------------------------------------------------------------------- |
| `/`                | 製品説明、文字入り6面ダイスの回転表示、作成画面と実抽選サンプルへのリンク    |
| `/create`          | 保存済みPack一覧、複製、個別削除、全初期化、JSON Import、4種類のテンプレート |
| `/sample`          | 深夜雑談テンプレートのダイスを表示し、読込後に自動で1回抽選                  |
| `/studio/[packId]` | IndexedDBからPackを読み込み、編集、Preview、Import・Export、OBS用HTML生成    |

`/api`、`/o`、`/h`、`/r`のRouteは存在しません。Hosted Overlay、Host Dock、Remote操作画面も存在しません。

トップページの「サンプルを振ってみる」は`/sample`へ移動します。サンプル画面の「このテンプレートから作る」は`/create?template=late-night-ja`へ移動し、深夜雑談テンプレートに「おすすめ」を表示します。移動だけではPackを作成せず、テンプレートのボタンを押した時に作成します。

## 4. Pack Schema

Packは`schemaVersion: 1`の`PromptPackConfigV1`です。Zod Schemaは`src/modules/prompt-pack/domain/schema.ts`にあります。

Packが保持する項目は次のとおりです。

- `mode`: `deck`または`direct`
- Pack名、任意の説明、言語
- FaceのID、カテゴリー名、任意の短いラベル、有効状態
- PromptのID、視聴者向けタイトル・本文、配信者メモ、補助質問、推奨秒数、有効状態
- 抽選モード、抽選ポリシー、Shuffle Bag再生成設定
- テーマ、背景、本体色、輪郭色、文字色、強調色、フォント、結果カード、描画品質
- アニメーション時間、結果表示待ち時間、結果表示時間、動きの強さ、モーション軽減、効果音
- OBS用HTMLの起動時抽選、クリック、キーボード、カテゴリー表示、結果表示、FPS

主な上限は次のとおりです。

| 項目                   | 現在の制限                |
| ---------------------- | ------------------------- |
| Pack全体               | UTF-8で1,048,576 bytes    |
| DeckのFace数           | 6固定                     |
| DirectのFace数         | 3〜20                     |
| 1 FaceあたりのPrompt数 | 1〜100                    |
| 1 PackあたりのPrompt数 | 構造上は最大600           |
| Pack名                 | 80書記素 / 320 bytes      |
| 説明                   | 500書記素 / 2,000 bytes   |
| Face名                 | 40書記素 / 160 bytes      |
| Faceの短いラベル       | 16書記素 / 64 bytes       |
| 視聴者向けタイトル     | 80書記素 / 320 bytes      |
| 視聴者向け本文         | 300書記素 / 1,200 bytes   |
| 配信者メモ             | 1,000書記素 / 4,000 bytes |
| 補助質問               | 1件120書記素 / 最大10件   |
| 推奨秒数               | 15〜3,600秒               |

文字数は`Intl.Segmenter`の書記素単位とUTF-8 byte数の両方で検査します。制御文字、UUID重複、Face数、Prompt数、有効候補、色の`#RRGGBB`形式、数値範囲もSchemaで検査します。Schemaに定義していないPropertyは補完や読み替えを行わず拒否します。600件はFace数とPrompt数から決まる構造上限です。Pack全体に1MiB上限もあるため、本文、メモ、補助質問のデータ量によっては600件未満で上限に達します。

## 5. ブラウザ保存

StudioのPack保存先はIndexedDBです。

- Database: `topicue-local-packs`
- Version: `1`
- Object Store: `packs`
- 保存レコード: Pack、作成日時、更新日時、`revision`、`storageVersion`

通常の設定変更はReact Stateへ反映され、最後の変更から800ms後にIndexedDBへ自動保存されます。Studioの初期読込時は、読み込んだ設定と現在の設定が同一なため保存し直しません。保存中はStudio上部の表示が`未保存`、`保存中`、`保存済み`、または`保存失敗`へ変化します。

保存処理には次が実装されています。

- 読込時と保存時のZod検証
- `storageVersion: 1`
- 現行の`pack`形式以外の保存レコードを拒否
- `revision`一致を確認する楽観的競合検出
- `BroadcastChannel`による同一Originの別タブ更新通知
- 未保存、保存中、保存失敗時の`beforeunload`警告
- Pack複製時のFace IDとPrompt ID再生成
- Pack単位の最終JSONバックアップ日時
- 最終JSONバックアップから7日以上経過した場合の警告
- Pack作成時の`navigator.storage.persist()`要求

競合を検出したタブは自動マージしません。保存失敗を表示し、保存内容の再読込ボタンを表示します。

Local Storageは次の用途で使用します。

- 最後に開いたPack ID
- Packごとの最終JSONバックアップ日時
- OBS用Standalone HTML内の抽選状態と履歴

IndexedDBとLocal StorageはOrigin単位です。`localhost:3000`、`localhost:3001`、Vercel Preview URL、Vercel Production URLは別の保存領域になります。ブラウザのサイトデータを削除するとIndexedDBのPackも削除されます。

## 6. Pack作成とテンプレート

テンプレートは`public/data/templates.json`からブラウザで読み込み、Zodで検証します。実装済みテンプレートは次の4種類です。

| ID                | 表示名       | 内容            |
| ----------------- | ------------ | --------------- |
| `first-stream-ja` | 初配信       | 6カテゴリー×5件 |
| `first-collab-ja` | 初対面コラボ | 6カテゴリー×5件 |
| `late-night-ja`   | 深夜雑談     | 6カテゴリー×5件 |
| `blank`           | 白紙から作る | 6カテゴリー×1件 |

テンプレートから作成する際に、Pack、Face、PromptのIDをブラウザの`crypto.randomUUID()`で生成します。

`public/data/sample.prompt-dice.json`は、JSON Import操作を確認するためのサンプルファイルです。`/create`からダウンロードできます。

## 7. DeckとDirect

### Deck

- 6 Face固定
- 3D形状は、角と稜線を面取りした立方体
- Faceはカテゴリーとして扱う
- 1 Faceに1〜100件のPromptを保持できる
- `face_uniform`ではFaceを先に均等抽選し、そのFace内からPromptを1件選ぶ
- `prompt_uniform`では全有効Promptから直接1件選び、そのPromptが属するFaceを当選面とする
- Promptの追加、複製、前後移動、削除、有効・無効を編集できる
- カテゴリー名と、ダイス面用の短い名前を別々に編集できる

### Direct

- 3〜20 Faceをプルダウンで選択する
- 1 Faceが1件の結果に対応する
- 各Faceは有効なPromptを1件だけ保持する
- Promptの追加、複製、削除、有効・無効のUIは表示しない
- 面数を減らす操作では確認Dialogを表示する
- ダイス面の短いラベルを空欄にすると結果タイトルを使用する

Mode切替で削除されるデータがある場合は確認Dialogを表示します。Deckへ切り替える場合は6 Faceへ揃え、Directへ切り替える場合は各Faceの有効なPromptまたは先頭Promptを1件残します。

ダイス面、結果カードで使う文字列は次の規則です。

| 表示箇所               | 使用する値                      |
| ---------------------- | ------------------------------- |
| ダイス面               | `Face.shortLabel ?? Face.label` |
| 結果カードのカテゴリー | `Face.label`                    |
| 結果カードのタイトル   | `Prompt.audienceTitle`          |
| 結果カードの本文       | `Prompt.audienceBody`           |

Directでは結果タイトルを変更すると、同じFaceの`label`も同じ文字列へ更新します。

## 8. ダイス形状

Directの3〜20 Faceは次のGeometryへ割り当てます。

| Face数                      | 現在の形状                          |
| --------------------------- | ----------------------------------- |
| 3                           | 三角柱の側面3面を使うロングダイス型 |
| 4                           | 正四面体                            |
| 6                           | 角と稜線を面取りした立方体          |
| 8                           | 正八面体                            |
| 12                          | 正十二面体                          |
| 20                          | 正二十面体                          |
| 5、7、9、11、13、15、17、19 | 上下面を含む`Face数 - 2`角柱        |
| 10、14、16、18              | `Face数 / 2`角双角錐                |

6面体は`RoundedBoxGeometry`を使い、立方体の6面を保ったまま角と稜線を丸めています。4、6、8、12、20以外を正多面体とは表示しません。Unit testでは3〜20の各Face数について、論理結果数と着地対象Facet数が一致することを検査しています。

抽選結果はGeometryの物理挙動から決めません。抽選エンジンが結果を確定し、その結果に対応するFacetを画面正面へ回転させます。剛体物理演算は実装していません。

## 9. 抽選エンジン

対象候補は、有効なFaceに含まれる有効なPromptです。

抽選モードは次の4種類です。

| 値                    | 現在の処理                                                        |
| --------------------- | ----------------------------------------------------------------- |
| `independent`         | 毎回、現在の有効候補から選ぶ                                      |
| `no_immediate_repeat` | 候補が複数の場合、直前のPromptを候補から除外する                  |
| `shuffle_bag`         | Bag内の候補を使い切るまで同じPromptを再利用しない                 |
| `elimination`         | 使用済みPromptを除外し、候補がなくなると`PROMPTS_EXHAUSTED`にする |

抽選ポリシーは次の2種類です。

| 値               | 現在の処理                                         |
| ---------------- | -------------------------------------------------- |
| `face_uniform`   | 有効なFaceを均等に選び、そのFace内からPromptを選ぶ |
| `prompt_uniform` | 全有効Promptを1つの候補集合として選ぶ              |

ブラウザでの抽選には`crypto.getRandomValues()`とrejection samplingを使います。`Math.random()`は使用していません。テスト用にはSeed指定可能な疑似乱数実装があります。

抽選Stateは直前Prompt、使用済みPrompt、全体Shuffle Bag、Face別Shuffle Bagを保持します。

## 10. Studio Preview

Studio PreviewはThree.jsの`WebGLRenderer`を使用します。
TOPページの文字入り6面ダイスも同じReact版Rendererと`RoundedBoxGeometry`を使用し、通常時は連続回転します。OSでモーション軽減が有効な場合は静止表示にします。

実装済みの描画要素は次のとおりです。

- Face数ごとのGeometry
- Canvasで生成する面ラベルTexture
- 書記素単位の改行、文字縮小、省略
- Ambient Lightと3方向のDirectional Light
- 本体、Edge、文字、Rimの色
- `idle`、`rolling`、`landing`、`result`の表示状態
- 回転、揺れ、跳ね、減速、結果Facetへの着地、Scale変化
- 30 FPSまたは60 FPSの描画間引き
- Low、Balanced、HighのTexture解像度とDevice Pixel Ratio上限
- OSの`prefers-reduced-motion`を含むモーション軽減
- Web Audio APIで生成する回転音と着地音
- `ResizeObserver`によるCanvas Size更新
- WebGL Context Lost後のRenderer再生成
- WebGL初期化失敗または復旧失敗時のCanvas 2D fallback

React版Rendererは破棄時にGeometry、Material、Texture、WebGL Contextを解放します。色やテーマを繰り返し変更した後も3D表示を維持する操作をE2Eで検査しています。

Canvas 2D fallbackは、角丸の四角形を回転・拡縮して結果ラベルを表示します。3〜20 Faceの立体形状は再現しません。

Preview専用UIには次があります。

- 16:9 / 9:16
- 透過Checker / 暗色 / 明色 / ゲーム / 高彩度の背景確認
- 100% / 75% / 50%の表示Scale。配置基準はPreview枠に固定し、ダイス、状態表示、結果カードを個別に縮小する
- Preview抽選ボタン

Previewの比率、背景、ScaleはPack Schemaへ保存しない一時的な確認設定です。
結果カードはタイトルと本文を固定行数で省略せず、文章量とPreview枠の高さから表示Scale以下の収まる倍率を計算します。50%表示では、幅320pxのブラウザでも長文の結果カード全体がPreview枠内に収まることをE2Eで検査しています。

Studioは幅1180px以下かつ901px以上では、ダイス設定と結果候補編集を2カラム、Previewをその下の全幅で表示します。幅900px以下では1カラム表示にします。

## 11. テーマ、フォント、色編集

実装済みテーマは次の6種類です。

- Idol Pop
- Cozy Pastel
- Cyber Navy
- Variety Show
- Dark Minimal
- Mystery

テーマ定義はStudio用強調色、ダイス色、結果カードの背景色と文字色、カテゴリーPill色、Glow強度を保持します。Studio PreviewとOBS用Standalone HTMLは同じTheme resolver、CSS変数、Geometry、Material生成処理を使用します。

新規Packの既定テーマはIdol Popです。保存済みPackとImportしたPackは保持している`themeId`と色設定をそのまま使用し、Idol Popへ自動変換しません。Cyber Navyを含む残り5テーマも選択できます。

テーマ選択は6枚のCard UIで、各テーマの4色Swatch、名前、説明を表示します。選択状態はBorderだけでなくCheck表示と`aria-checked`でも示します。

フォントPresetは次の5種類です。

- システム標準
- 丸ゴシック
- ゴシック
- 明朝
- 等幅

フォントはSystem Font Stackです。Web Fontや外部Font CDNは使用しません。

テーマを選択すると、OBSページの背景Modeを`transparent`へ戻し、テーマのダイス本体色、輪郭色、文字色、強調色をPack設定へ即時反映します。ダイス面の文字色と結果カードの文字色は別々にThemeから解決するため、明るいダイス面でも暗い結果カードの可読性を維持します。フォント、結果カード位置・幅、描画品質は維持します。

4色の個別調整は次の操作です。

1. カラーピッカーで色を選ぶ
2. 選択値をコンポーネント内の一時Stateへ保持し、`未反映`と表示する
3. `反映`を押した時だけPack設定とPreviewを更新する
4. Pack設定更新後、通常の800ms自動保存対象になる

`取消`は一時Stateを現在のPack設定へ戻します。色設定の`details`を閉じるだけでは反映しません。同じページで再び開くと一時値は残りますが、ページを再読み込みすると未反映値は失われます。

旧Theme ID、旧`prompt.faceLabel`、`fontPreset`がない設定は受け付けません。Import対象は現在のSchemaに一致する設定だけです。

## 12. ImportとExport

### JSON

JSON Exportは次のEnvelope形式です。

- `format: "stream-prompt-dice"`
- `schemaVersion: 1`
- `exportedAt`
- `pack`

ImportはEnvelope形式とPack本体だけの形式を受け付けます。未対応Version、1MB超過、JSON Parse失敗、Schema違反は拒否します。

JSON Importは次の場所にあります。

- `/create`のファイル選択
- StudioのJSON / CSVファイル選択
- StudioのJSON貼り付け欄

### CSV

CSVは次の列を扱います。

```text
face_label
audience_title
audience_body
host_notes
follow_up_questions
suggested_duration_seconds
enabled
```

CSVはTheme、Animation、Behavior、Faceの短いラベルなどを保持しないため、全設定のバックアップにはなりません。

## 13. OBS用Standalone HTML

Studioの「OBS用HTMLを作る」は`prompt-dice-obs.html`を生成します。生成HTMLには公開用Pack設定と、esbuildでBundleしたブラウザRuntimeをInline Scriptとして含めます。

Standalone HTMLには次が実装されています。

- Three.jsによる3Dダイス
- Studioと共通のGeometry、Material、Theme、抽選エンジン
- WebGL Context Lost時の再生成とCanvas 2D fallback
- 起動時抽選
- ダイス領域のクリック操作
- Space / Enter操作
- 常時利用できる`振る`ボタン
- 結果カードのカテゴリー表示切替
- 結果の常時表示または時間指定で非表示
- Local Storageへの抽選Stateと履歴保存
- 再読込時の「続きから振る」「最初からやり直す」
- 履歴Reset
- 履歴JSON Download
- 回転音、着地音

操作ボタンはStandalone StageのHoverまたはFocus中に表示します。クリックとKeyboard操作はPack設定で許可した場合だけダイス領域から実行できます。`振る`ボタン自体は許可設定に関係なく動作します。

Standalone HTMLのCSPは次を含みます。

- `default-src 'none'`
- `connect-src 'none'`
- 外部Script禁止
- 外部Font禁止
- Inline ScriptとInline Styleを許可
- `data:` / `blob:`画像とMediaを許可

Integration testでは、生成HTMLに外部`script src`がないこと、`connect-src 'none'`があること、Bundle済みRuntimeを含むことを検査しています。

Pack名はHTML TextとしてEscapeし、公開用Pack設定は`&`、`<`、`>`、U+2028、U+2029をUnicode EscapeしてInline Scriptへ埋め込みます。Unit testでは視聴者向けタイトルに`</script><script>...`を含めた場合に、追加Scriptとして解釈される形で出力されないことを検査します。

`public/standalone-runtime.js`は生成物です。Git管理対象から除外し、`pnpm dev`、`pnpm build`、`pnpm test:integration`、`pnpm test:e2e`の前に生成します。Bundle TargetはChrome 109、Firefox 115、Safari 16です。

## 14. Standaloneへ含めるデータ

`PublicStandaloneConfigV1`は編集用の`PromptPackConfigV1`と分離した公開専用Zod Schemaです。`publicStandaloneConfig()`はPack全体をSpreadせず、公開を許可する各階層のPropertyを新しいObjectとして組み立て、そのSchemaで検証します。Standalone Runtimeは埋め込まれた設定を同じSchemaで再検証します。

Standaloneへ含めるPrompt情報は次のとおりです。

- ID
- 視聴者向けタイトル
- 視聴者向け本文
- 有効状態

次の情報はStandaloneへ含めません。

- Pack説明
- 配信者メモ
- 補助質問の内容
- 推奨秒数
- Schemaに存在しない追加Property

`hostNotes`、`followUpQuestions`、`suggestedDurationSeconds`は公開SchemaにProperty自体がありません。Unit testとIntegration testでは、配信者メモおよび任意に追加したPack / Faceの非公開Propertyが生成結果に含まれないことを検査しています。

## 15. OBSでの使用手順

1. Studioで「OBS用HTMLを作る」を押し、`prompt-dice-obs.html`を保存します。
2. OBSの「ソース」で「ブラウザ」を追加します。
3. 「ローカルファイル」を有効にして、保存したHTMLを選択します。
4. 横配信では1920×1080、縦配信では1080×1920を指定できます。
5. OBSの「対話」から、Hover時に表示される「振る」ボタンを操作できます。

上記は生成HTMLの構造とOBS Browser SourceのLocal File利用を前提にした手順です。このリポジトリではOBS Desktopを自動起動するテストは行っていません。

## 16. Vercelとローカル起動

必須環境変数はありません。`.env.example`には任意の`APP_DISPLAY_NAME`だけを例示しています。コードは`APP_DISPLAY_NAME`、`NEXT_PUBLIC_APP_DISPLAY_NAME`、既定値の順で表示名を解決します。

ローカル起動コマンドは次のとおりです。

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev`はStandalone Runtimeを生成してから`next dev`を起動します。

`vercel.json`には次を設定しています。

- Framework: `nextjs`
- Region: `hnd1`

`.vercelignore`では、Production Buildに不要な次のファイルをDeploymentのUpload対象から除外します。

- Unit / Integration / Distribution / E2E Test
- GitHub Actions設定
- ESLint / Prettier / Vitest / Playwright設定
- `README.md`、`IMPLEMENTATION_STATUS.md`
- `.env.example`

`src`、`public/data`、Next.js設定、OBS Runtime生成Script、OpenAPI検証に必要なSchema文書はBuild入力として除外しません。

`pnpm build`はOpenAPI生成差分、Standalone Runtime生成、`next build --webpack`を実行します。Next.jsのProduction Buildは成功しています。Vercel Preview / Productionへの実Deployはこの環境では実行していません。

## 17. OpenAPI文書

`scripts/openapi-source.ts`は`@asteasolutions/zod-to-openapi`の`OpenAPIRegistry`と`OpenApiGeneratorV31`を使い、Zod SchemaからOpenAPI 3.1 Documentを生成します。生成先は`docs/openapi.json`です。OpenAPI用にSchemaを手書きで複製していません。

現在のOpenAPI文書は次のSchemaを`components.schemas`へ含みます。

- `PromptPackConfigV1`
- `PackExportV1`
- `PublicStandaloneConfigV1`

`paths`は空Objectです。現行版に公開HTTP API endpointはありません。

```bash
pnpm openapi:generate
pnpm openapi:check
```

`openapi:check`は生成結果と`docs/openapi.json`の差分を検査します。HTTP APIが存在しないため、Path登録とRedoclyによるAPI Route検証は行っていません。

## 18. コード構成

```text
src/app/                                      Next.js Route、Layout、Global CSS
src/components/                               画面間で共有するBrand UI Component
src/config/                                   表示名などのBrand設定
src/modules/prompt-pack/domain/               Pack Schema、Theme、既定値、制限、表示規則
src/modules/prompt-pack/application/          JSON / CSV変換
src/modules/prompt-pack/infrastructure/       IndexedDB、Template読込
src/modules/prompt-pack/ui/                   作成画面、Studio、Sample、UI Component
src/modules/selection/                        抽選エンジン、乱数、抽選State
src/modules/renderer/shared/                  Motion、Reduced Motion、Audio
src/modules/renderer/text-layout/             面ラベルの文字Layout
src/modules/renderer/three/                   Geometry、Material、Texture
src/modules/renderer/ui/                      React版3D RendererとCanvas fallback
src/modules/standalone-export/                OBS用HTML GeneratorとRuntime
src/shared/                                   JSON、数値、Download処理
public/data/                                  TemplateとJSON Import Sample
scripts/                                      Standalone / OpenAPI生成Script
docs/openapi.json                             生成済みOpenAPI 3.1 Data Schema
tests/                                        Unit、Integration、Distribution、E2E
```

Studioの主なUI Componentは次のとおりです。

- `Studio`: Pack読込、State、保存、抽選、Import / Exportの調整
- `DiceSettingsPanel`: Mode、Pack、言語、Face選択、Direct面数
- `PromptEditorPanel`: Face、Prompt、配信者向け情報
- `PreviewOutputPanel`: Previewと表示・演出設定
- `SelectionSettings`: 抽選方式と抽選ポリシー
- `ObsBehaviorSettings`: OBS操作と結果表示
- `ImportExportControls`: JSON / CSV / OBS用HTMLのImport・Export
- `AppearanceColorControls`: 4色の一時編集、取消、反映
- `LivePreview`: 比率、背景、Scale、3D表示、結果カード
- `DicePresentation`: React版WebGL RendererとCanvas fallback

設定値の列挙、数値範囲、Schema Version、Pack上限、既定時間は`domain/constants.ts`に集約しています。同ファイルの公開定数名は大文字スネークケースです。プルダウンの表示ラベルは`ui/studio-options.ts`に集約し、各Zod Schemaから推論したUnion型と`Record`で、定義済みの値にラベルが不足しないことを型検査します。

Studio PreviewとOBS用Standaloneは、描画品質、Motion生成、Frameごとの回転・着地、Reduced Motion時間、Geometry、Materialを共通Moduleから使用します。ReactのEffect管理とStandaloneの命令的なDOM管理は実行環境が異なるため、それぞれのAdapterに分けています。

編集用`PromptPackConfigV1`とOBS公開用`PublicStandaloneConfigV1`、編集用文字制限と公開用文字制限は意図的に分離しています。この分離は配信者メモ、補助質問、推奨秒数、未定義PropertyをOBS用HTMLへ渡さないための公開境界です。

## 19. TypeScriptとLint設定

TypeScriptは`strict: true`です。次のOptionも有効です。

- `forceConsistentCasingInFileNames`
- `verbatimModuleSyntax`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noPropertyAccessFromIndexSignature`
- `noUncheckedSideEffectImports`
- `noUnusedLocals`
- `noUnusedParameters`
- `allowUnreachableCode: false`
- `allowUnusedLabels: false`
- `useUnknownInCatchVariables`

`pnpm typecheck`は`next typegen`でRoute型と`next-env.d.ts`を生成した後に`tsc --noEmit`を実行します。`.next`と`next-env.d.ts`がないクリーンなCheckoutでも型検査の前提を生成します。`next-env.d.ts`はNext.jsの生成物としてGit管理から除外します。

ESLintでは次をErrorとして設定しています。

- 未使用変数、未使用Parameter、未使用Import
- ImportのGroup順、Group間の空行、Group内のアルファベット順
- 重複Importと循環Import
- 明示的な`any`
- TypeScriptの`unknown`Keyword
- 未処理Promise、Promiseの誤用、Promiseでない値への`await`
- 非網羅的なUnion型の`switch`
- 不要な型Assertion
- 関数宣言形式
- Arrow Callback以外のCallback
- Value Importとして書かれたType-only Import
- 許可していない`console`使用
- `==` / `!=`
- `Math.random()`
- `eval`、暗黙の文字列評価、`new Function`
- Reactの`dangerouslySetInnerHTML`
- Domain層からReact、Next.js、DB、UI、InfrastructureへのImport
- Domain層でのDOM・Browser Storage Global使用

現行の`prompt-pack/domain`はReact、Next.js、DB、Redis、DOM APIをImportしていません。外部入力にはZod Schemaと具体的な`PackInput`型を使用しています。

Pack、JSON Export Envelope、IndexedDB保存Record、Standalone公開設定、Standalone抽選StateはZod Schemaを一次情報源とし、TypeScript型を`z.infer`で生成します。設定値ごとのUnion型もZod Schemaから生成しており、Schemaと手書きUnion型の二重管理はしていません。

Prettierは2スペース、ダブルクォート、セミコロン、LF、100文字幅です。`eslint-config-prettier`をESLint Flat Configに入れ、Format Ruleの競合を防いでいます。`pnpm lint:fix`で自動修正可能なLint違反を修正し、`pnpm check`でFormat、Lint、TypeScript、Unit Testを一括確認できます。

## 20. 実装していないもの

現行コードに存在しない機能は次のとおりです。

- PostgreSQL、Redis、サーバーサイドDBのMigration、Seed
- サーバー側Pack保存
- 公開HTTP API、Health API
- ログイン、User管理、Capability Token
- Hosted Audience Overlay
- Host Dock
- Remote操作画面
- QRコード
- SSE、WebSocket、PollingによるLive Session同期
- 複数端末間の同期
- Undo、変更履歴、過去Revision復元
- 競合時の自動Merge
- Cloud Backup
- GLB / WebM Export
- Stream Deck / Streamer.bot連携
- 剛体物理Simulation

## 21. 自動検証結果

2026-09-03に現在の作業ツリーで次を実行しました。

```bash
pnpm openapi:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:distribution
pnpm test:e2e
pnpm build
```

| 検査          | 実行結果        | 検査対象                                                                                   |
| ------------- | --------------- | ------------------------------------------------------------------------------------------ |
| OpenAPI       | PASS            | Zodからの生成結果と`docs/openapi.json`の一致                                               |
| Prettier      | PASS            | Prettier対象ファイル                                                                       |
| ESLint        | PASS、Warning 0 | Next.js、React、TypeScript、Repository独自Rule                                             |
| TypeScript    | PASS            | `tsc --noEmit`                                                                             |
| Unit          | PASS、34件      | Schema、Theme、保存形式、抽選、Geometry、描画設定、Text、Standalone公開DataとScript Escape |
| Integration   | PASS、1件       | Sample JSON、Bundle Runtime、単一HTML、CSP、外部Scriptなし、配信者メモ除外                 |
| Distribution  | PASS、1件       | Seed固定で100,000回抽選し、6候補が各15,500〜17,900回に入ること                             |
| Playwright    | PASS、5件       | 画面導線、axe、Responsive、Sample、IndexedDB、Theme、色反映、9面、Standalone、競合検出     |
| Next.js build | PASS            | OpenAPI確認とStandalone生成を含むProduction Build                                          |

PlaywrightのStudio Testには次を含みます。

- 16:9 / 9:16
- 5種類のPreview背景
- 100% / 75% / 50%
- 幅320px・50%表示で省略していない長文結果カードの上下端がPreview枠内に収まること
- 6テーマの切替
- Tablet / Mobile幅でLandingとCreateに横Overflowがないこと
- iPad横向き相当の1024×768でStudioが2カラム＋Preview全幅になること
- 24回連続Theme切替後の3D表示維持
- 色を選択した段階の`未反映`表示
- `反映`ボタンによる確定
- 色反映後の3D表示維持
- Reduced Motion
- 30 / 60 FPS設定
- Checkboxの配置とBorder
- Direct 9面への変更と再読込後の復元
- JSON / OBS用HTML Download
- Local FileとしてのStandalone実行
- StandaloneのWebGL Context Lost
- Standalone Sessionの再読込後復元
- 別Tab競合通知

## 22. 自動検証していない項目

次の項目は自動テストまたは実機確認を行っていないため、PASSとして扱いません。

- OBS Desktop / CEF上での実機操作
- OBS再起動、Scene切替、Source再表示後の状態
- OBS上のAudio Policyと実際の音量
- Vercel Preview / Productionへの実Deploy
- Firefox / SafariでのE2E
- Browser StorageのQuota超過
- IndexedDBの実環境での`blocked`状態
- 実映像へ重ねた6テーマの目視確認
- 30分以上の連続抽選
- CPU / GPU / Memory使用量の長時間計測
