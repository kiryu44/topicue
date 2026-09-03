import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

test("marketing and create pages are usable and accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "6面に、無限の話題を。" })).toBeVisible();
  await expect(page.locator(".hero-die-viewport .renderer-root")).toBeVisible();
  await expect(page.getByRole("link", { name: "トークダイスを作る" })).toHaveCSS(
    "text-decoration-line",
    "none",
  );
  await expect(page.getByRole("link", { name: "サンプルを振ってみる" })).toHaveCSS(
    "text-decoration-line",
    "none",
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  await page.getByRole("link", { name: "トークダイスを作る" }).click();
  await expect(
    page.getByRole("heading", { name: "配信の流れに合うお題セットを選ぶ" }),
  ).toBeVisible();
});

test("sample CTA opens a dice that rolls immediately and can roll again", async ({ page }) => {
  await page.addInitScript({
    content: `
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...options) {
        if (String(type).includes("webgl")) return null;
        return originalGetContext.call(this, type, ...options);
      };
    `,
  });
  await page.goto("/");
  await page.getByRole("link", { name: "サンプルを振ってみる" }).click();
  await expect(page).toHaveURL(/\/sample$/u);
  await expect(page.getByRole("heading", { name: "深夜雑談ダイスを振ってみる" })).toBeVisible();
  const rollAgain = page.getByRole("button", { name: "もう一度振る" });
  await expect(rollAgain).toBeVisible({ timeout: 10_000 });
  await rollAgain.click();
  await expect(page.getByRole("button", { name: "振っています…" })).toBeDisabled();
});

test("landing and create pages fit tablet and mobile viewports", async ({ page }) => {
  for (const viewport of [
    { width: 820, height: 1_180 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "6面に、無限の話題を。" })).toBeVisible();
    await expect(page.locator(".hero-die-viewport .renderer-root")).toBeVisible();
    const primaryCta = page.getByRole("link", { name: "トークダイスを作る" });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveCSS("min-height", "44px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.goto("/create");
    await expect(
      page.getByRole("heading", { name: "配信の流れに合うお題セットを選ぶ" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

test("creates, resizes, and restores a browser-local Pack", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/create");
  await page.getByRole("button", { name: /白紙から作る/u }).click();
  await expect(page).toHaveURL(/\/studio\//u, { timeout: 30_000 });
  await page.setViewportSize({ width: 1024, height: 768 });
  const tabletColumns = await page
    .locator(".studio")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(tabletColumns).toBe(2);
  const tabletPreviewBounds = await page.locator(".preview-output-panel").boundingBox();
  expect(tabletPreviewBounds?.width).toBeGreaterThan(900);
  await page.setViewportSize({ width: 1280, height: 720 });
  const previewWebGlCanvas = page.locator(".preview-overlay .renderer-root canvas");
  if ((await previewWebGlCanvas.count()) > 0) {
    await previewWebGlCanvas.dispatchEvent("webglcontextlost");
    await expect(previewWebGlCanvas).toBeVisible({ timeout: 5_000 });
  }
  await expect(page.getByRole("button", { name: "16:9" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "9:16" }).click();
  await expect(page.getByTestId("preview-stage")).toHaveCSS("aspect-ratio", "9 / 16");
  for (const [label, className] of [
    ["透過背景", "preview-background-transparent"],
    ["暗色背景", "preview-background-dark"],
    ["明色背景", "preview-background-light"],
    ["ゲーム背景", "preview-background-game"],
    ["高彩度背景", "preview-background-colorful"],
  ] as const) {
    await page.getByRole("button", { name: label }).click();
    await expect(page.getByTestId("preview-stage")).toHaveClass(new RegExp(className, "u"));
  }
  for (const [label, scale] of [
    ["100%", "1"],
    ["75%", "0.75"],
    ["50%", "0.5"],
  ] as const) {
    await page.getByRole("button", { name: label }).click();
    await expect(page.locator(".preview-overlay")).toHaveAttribute(
      "data-preview-scale",
      label.replace("%", ""),
    );
    await expect(page.locator(".preview-overlay .renderer-root")).toHaveCSS("scale", scale);
  }
  const visualThemeIds = [
    "idol_pop",
    "cozy_pastel",
    "cyber_navy",
    "variety_show",
    "dark_minimal",
    "mystery",
  ] as const;
  await expect(page.locator(".live-preview")).toHaveAttribute("data-theme", "idol_pop");
  for (const themeId of visualThemeIds) {
    const themeCard = page.locator(`[data-theme-id="${themeId}"]`);
    await themeCard.click();
    await expect(themeCard).toHaveAttribute("aria-checked", "true");
    await expect(page.locator(".live-preview")).toHaveAttribute("data-theme", themeId);
  }
  for (let index = 0; index < 24; index += 1) {
    const themeId = visualThemeIds[index % visualThemeIds.length];
    if (themeId === undefined) throw new Error("テーマFixtureが空です。");
    await page.locator(`[data-theme-id="${themeId}"]`).click();
    await expect(page.locator(".live-preview")).toHaveAttribute("data-theme", themeId);
  }
  await expect(page.getByLabel("2Dトークダイス（フォールバック）")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "3Dトークダイス" })).toBeVisible();
  await page.getByText("ダイスの色を調整").click();
  const bodyColor = page.getByLabel("本体色を選択");
  const bodyColorControl = page.locator(".color-control").filter({ has: bodyColor });
  await expect(bodyColor).toBeVisible();
  await bodyColor.fill("#2457a6");
  await expect(bodyColor).toHaveValue("#2457a6");
  await expect(bodyColorControl).toContainText("#2457A6");
  await expect(bodyColorControl).toContainText("未反映");
  await expect(page.getByLabel("本体色を反映")).toBeEnabled();
  await page.getByLabel("本体色を反映").click();
  await expect(bodyColorControl).toContainText("反映済み");
  await expect(page.getByLabel("本体色を反映")).toBeDisabled();
  await expect(page.getByLabel("輪郭色を選択")).toBeVisible();
  await expect(page.getByLabel("文字色を選択")).toBeVisible();
  await expect(page.getByLabel("強調色を選択")).toBeVisible();
  await expect(page.getByLabel("2Dトークダイス（フォールバック）")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "3Dトークダイス" })).toBeVisible();
  await page.locator('[data-theme-id="idol_pop"]').click();
  const longTitle = "二人で店を開くなら何のお店にするか、理由も含めて教えてください";
  const longBody =
    "具体的な出来事や、そのとき感じたことも交えて、初めて見る視聴者にも伝わるように詳しく話してみましょう。";
  await page.getByLabel("選択中の結果タイトル").fill(longTitle);
  await page.getByLabel("視聴者に表示する本文（任意）").fill(longBody);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.getByRole("button", { name: "プレビューを振る" }).click();
    await expect(page.locator(".result-card")).toBeVisible({ timeout: 10_000 });
    if ((await page.locator(".result-card h1").textContent()) === longTitle) break;
  }
  await expect(page.locator(".category-pill")).toBeVisible();
  await expect(page.locator(".result-card h1")).toHaveText(longTitle);
  await expect(page.locator(".result-card p")).toHaveText(longBody);
  await expect(page.locator(".result-card h1")).toHaveCSS("-webkit-line-clamp", "none");
  await page.setViewportSize({ width: 320, height: 760 });
  await page.getByRole("button", { name: "50%" }).click();
  const previewBounds = await page.getByTestId("preview-stage").boundingBox();
  const resultBounds = await page.locator(".result-card").boundingBox();
  expect(previewBounds).not.toBeNull();
  expect(resultBounds).not.toBeNull();
  if (previewBounds !== null && resultBounds !== null) {
    expect(resultBounds.y).toBeGreaterThanOrEqual(previewBounds.y - 1);
    expect(resultBounds.y + resultBounds.height).toBeLessThanOrEqual(
      previewBounds.y + previewBounds.height + 1,
    );
  }
  await page.getByText("演出・描画").click();
  const targetFps = page.getByRole("combobox", { name: "FPS" });
  await targetFps.selectOption("30");
  await expect(targetFps).toHaveValue("30");
  await targetFps.selectOption("60");
  await expect(targetFps).toHaveValue("60");
  const studioAccessibility = await new AxeBuilder({ page }).analyze();
  expect(
    studioAccessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
  await page.getByText("OBSでの操作と結果表示").click();
  const rollOnLoad = page.getByRole("checkbox", { name: "HTML読込時に自動で振る" });
  await expect(rollOnLoad).toBeVisible();
  await expect(rollOnLoad).toHaveCSS("width", "16px");
  await expect(rollOnLoad.locator("..")).toHaveCSS("border-top-style", "solid");
  await page.getByRole("button", { name: "Direct：1面1結果" }).click();
  await expect(page.getByRole("checkbox", { name: "有効" })).toHaveCount(0);
  const faceCount = page.getByRole("combobox", { name: "ダイスの面数と形状" });
  await faceCount.selectOption("9");
  await expect(page.getByText("形状: 7角柱型9面ダイス")).toBeVisible();
  await expect(page.locator(".face-item")).toHaveCount(9);
  await expect(page.getByText("保存済み · このブラウザ")).toBeVisible();
  await page.reload();
  await expect(faceCount).toHaveValue("9");
  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONバックアップ" }).click();
  await jsonDownloadPromise;
  await expect(page.getByText(/最終JSONバックアップ:/u)).not.toContainText("まだありません");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "OBS用HTMLを作る" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("prompt-dice-obs.html");
  const path = await download.path();
  const html = await readFile(path, "utf8");
  expect(html).toContain("window.__PROMPT_DICE_CONFIG__");
  expect(html).toContain("standalone-renderer");
  expect(html).not.toContain("hostNotes");
  const standaloneDirectory = await mkdtemp(join(tmpdir(), "topicue-e2e-"));
  const standalonePath = join(standaloneDirectory, "prompt-dice-obs.html");
  await copyFile(path, standalonePath);
  await page.goto(pathToFileURL(standalonePath).href);
  const usesCanvasFallback = await page.evaluate(() =>
    document.body.classList.contains("canvas-fallback"),
  );
  if (!usesCanvasFallback) {
    await page.locator(".standalone-renderer canvas").dispatchEvent("webglcontextlost");
    await page.waitForTimeout(500);
  }
  await page.getByRole("button", { name: "振る", exact: true }).click();
  await expect(page.locator(".standalone-card")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByText("前回のセッションがあります")).toBeVisible();
  await page.getByRole("button", { name: "続きから振る" }).click();
  await rm(standaloneDirectory, { recursive: true, force: true });

  await page.goto("/create");
  await page.getByRole("button", { name: "複製" }).click();
  await expect(page).toHaveURL(/\/studio\//u);
  await expect(page.getByRole("combobox", { name: "ダイスの面数と形状" })).toHaveValue("9");
});

test("detects a conflicting edit from another browser tab", async ({ page, context }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: /白紙から作る/u }).click();
  await expect(page).toHaveURL(/\/studio\//u);
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(second.getByText("保存済み · このブラウザ")).toBeVisible();

  await page.getByRole("textbox", { name: "Pack名" }).fill("別タブから更新");
  await expect(page.getByText("保存済み · このブラウザ")).toBeVisible();
  await expect(second.getByText(/別のタブでこのPackが更新されました/u)).toBeVisible();
  await second.close();
});
