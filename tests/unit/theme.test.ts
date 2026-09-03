import { describe, expect, it } from "vitest";

import { THEME_IDS } from "@/modules/prompt-pack/domain/constants";
import { DEFAULT_THEME_ID, defaultAppearance } from "@/modules/prompt-pack/domain/defaults";
import {
  contrastRatio,
  fontPresets,
  resolveTopicueTheme,
  themeCssVariables,
  topicueThemes,
} from "@/modules/prompt-pack/domain/theme";
import { shouldReduceMotion } from "@/modules/renderer/shared/reduced-motion";

describe("Topicue visual themes", () => {
  it("uses Idol Pop for new Packs and presents themes in the intended order", () => {
    expect(DEFAULT_THEME_ID).toBe("idol_pop");
    expect(defaultAppearance.themeId).toBe("idol_pop");
    expect(THEME_IDS).toEqual([
      "idol_pop",
      "cozy_pastel",
      "cyber_navy",
      "variety_show",
      "dark_minimal",
      "mystery",
    ]);
  });

  it("provides six complete themes with AA result-card contrast", () => {
    expect(Object.keys(topicueThemes)).toHaveLength(6);
    for (const theme of Object.values(topicueThemes)) {
      expect(
        contrastRatio(theme.dice.text, theme.dice.body),
        `${theme.name} die`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.resultCard.title, theme.resultCard.background),
        theme.name,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.resultCard.body, theme.resultCard.background),
        theme.name,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.resultCard.categoryText, theme.resultCard.categoryBackground),
        `${theme.name} category`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("applies the four supported color overrides without mutating a preset", () => {
    const original = topicueThemes.cyber_navy.dice.body;
    const appearance = {
      ...defaultAppearance,
      bodyColor: "#112233",
      edgeColor: "#445566",
      textColor: "#FDFDFD",
      accentColor: "#55CCEE",
    };
    const resolved = resolveTopicueTheme(appearance);
    expect(resolved.dice).toMatchObject({
      body: "#112233",
      edge: "#445566",
      text: "#FDFDFD",
      rim: "#55CCEE",
    });
    expect(topicueThemes.cyber_navy.dice.body).toBe(original);
  });

  it("keeps light-die text separate from the dark Idol Pop result card", () => {
    const resolved = resolveTopicueTheme(defaultAppearance);
    expect(resolved.dice.bodyHighlight).toBe("#BDEAFF");
    expect(resolved.dice.text).toBe("#24213B");
    expect(resolved.resultCard).toMatchObject({
      background: "#1A1933",
      border: "#C8B4FF",
      title: "#FDFBFF",
      body: "#DCD6ED",
    });
  });

  it("produces shared Studio and Standalone CSS variables and local-safe fonts", () => {
    const variables = themeCssVariables(defaultAppearance);
    expect(variables["--topicue-card-border"]).toBe(topicueThemes.idol_pop.resultCard.border);
    expect(variables["--topicue-card-max-width"]).toBe("840px");
    for (const preset of Object.values(fontPresets)) {
      expect(preset.stack).not.toMatch(/https?:|url\(/u);
    }
  });

  it("resolves reduced motion consistently", () => {
    expect(shouldReduceMotion("always_reduce", false)).toBe(true);
    expect(shouldReduceMotion("never_reduce", true)).toBe(false);
    expect(shouldReduceMotion("respect_system", true)).toBe(true);
    expect(shouldReduceMotion("respect_system", false)).toBe(false);
  });
});
