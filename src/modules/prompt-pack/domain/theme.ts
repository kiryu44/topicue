import { THEME_IDS } from "./constants";

import type { AppearanceConfig, FontPresetId, ThemeId } from "./config-schema";

export interface TopicueTheme {
  id: ThemeId;
  name: string;
  description: string;
  studio: {
    accent: string;
  };
  dice: {
    body: string;
    bodyHighlight: string;
    edge: string;
    text: string;
    rim: string;
  };
  resultCard: {
    background: string;
    border: string;
    title: string;
    body: string;
    categoryBackground: string;
    categoryBorder: string;
    categoryText: string;
  };
  effects: {
    glowStrength: number;
  };
}

export interface ResolvedTopicueTheme extends TopicueTheme {
  fontFamily: string;
}

export interface ThemeAppearancePreset {
  background: AppearanceConfig["background"];
  bodyColor: string;
  edgeColor: string;
  textColor: string;
  accentColor: string;
}

export interface ThemeCssVariables {
  "--topicue-body": string;
  "--topicue-body-highlight": string;
  "--topicue-edge": string;
  "--topicue-text": string;
  "--topicue-rim": string;
  "--topicue-card-bg": string;
  "--topicue-card-border": string;
  "--topicue-card-title": string;
  "--topicue-card-body": string;
  "--topicue-card-max-width": string;
  "--topicue-category-bg": string;
  "--topicue-category-border": string;
  "--topicue-category-text": string;
  "--topicue-glow": string;
  "--topicue-font": string;
}

const themeList: readonly TopicueTheme[] = [
  {
    id: "cyber_navy",
    name: "Cyber Navy",
    description: "Gaming・VTuber・Tech向けの標準テーマ",
    studio: { accent: "#63D8FF" },
    dice: {
      body: "#1C2338",
      bodyHighlight: "#303955",
      edge: "#7D6CFF",
      text: "#F4F7FF",
      rim: "#63D8FF",
    },
    resultCard: {
      background: "#080E1E",
      border: "#63D8FF",
      title: "#F4F7FF",
      body: "#C7D2EA",
      categoryBackground: "#16384A",
      categoryBorder: "#4EB9DC",
      categoryText: "#F4F7FF",
    },
    effects: { glowStrength: 0.72 },
  },
  {
    id: "idol_pop",
    name: "Idol Pop",
    description: "Lavender・Pink・Aquaを使った上品で柔らかなテーマ",
    studio: { accent: "#B69CFF" },
    dice: {
      body: "#A891FF",
      bodyHighlight: "#BDEAFF",
      edge: "#E8FAFF",
      text: "#24213B",
      rim: "#FF9ED6",
    },
    resultCard: {
      background: "#1A1933",
      border: "#C8B4FF",
      title: "#FDFBFF",
      body: "#DCD6ED",
      categoryBackground: "#332744",
      categoryBorder: "#FFB6DC",
      categoryText: "#FDFBFF",
    },
    effects: { glowStrength: 0.44 },
  },
  {
    id: "cozy_pastel",
    name: "Cozy Pastel",
    description: "朝活や深夜雑談向けの落ち着いた配色",
    studio: { accent: "#83D7C0" },
    dice: {
      body: "#38536A",
      bodyHighlight: "#58758B",
      edge: "#83D7C0",
      text: "#FFF8E8",
      rim: "#A7E9D6",
    },
    resultCard: {
      background: "#10262D",
      border: "#83D7C0",
      title: "#FFF8E8",
      body: "#DDEBE4",
      categoryBackground: "#21483F",
      categoryBorder: "#68BDA7",
      categoryText: "#FFF8E8",
    },
    effects: { glowStrength: 0.48 },
  },
  {
    id: "variety_show",
    name: "Variety Show",
    description: "コラボや企画向けの明快なテレビ番組風テーマ",
    studio: { accent: "#FFD75A" },
    dice: {
      body: "#174A7A",
      bodyHighlight: "#2D6A9E",
      edge: "#FFD75A",
      text: "#FFFFFF",
      rim: "#5DD7FF",
    },
    resultCard: {
      background: "#0C2038",
      border: "#FFD75A",
      title: "#FFFFFF",
      body: "#D8E8F7",
      categoryBackground: "#5A4210",
      categoryBorder: "#DAB540",
      categoryText: "#FFFFFF",
    },
    effects: { glowStrength: 0.62 },
  },
  {
    id: "dark_minimal",
    name: "Dark Minimal",
    description: "どんな配信にも合わせやすい無彩色テーマ",
    studio: { accent: "#BFC8D8" },
    dice: {
      body: "#24272E",
      bodyHighlight: "#3A3E48",
      edge: "#BFC8D8",
      text: "#FFFFFF",
      rim: "#E2E7F0",
    },
    resultCard: {
      background: "#101216",
      border: "#AAB3C2",
      title: "#FFFFFF",
      body: "#CDD2DB",
      categoryBackground: "#2A2E35",
      categoryBorder: "#747D8A",
      categoryText: "#FFFFFF",
    },
    effects: { glowStrength: 0.3 },
  },
  {
    id: "mystery",
    name: "Mystery",
    description: "ホラーや深夜企画向けの紫と深紅のテーマ",
    studio: { accent: "#B28AE8" },
    dice: {
      body: "#291A3A",
      bodyHighlight: "#49305C",
      edge: "#A77BDA",
      text: "#F8F3FF",
      rim: "#D85D78",
    },
    resultCard: {
      background: "#170F24",
      border: "#A77BDA",
      title: "#F8F3FF",
      body: "#D8CAE5",
      categoryBackground: "#442037",
      categoryBorder: "#A84C68",
      categoryText: "#F8F3FF",
    },
    effects: { glowStrength: 0.58 },
  },
];

export const topicueThemes = Object.fromEntries(
  THEME_IDS.map((themeId) => {
    const theme = themeList.find((candidate) => candidate.id === themeId);
    if (theme === undefined) throw new Error(`Theme definition is missing: ${themeId}`);
    return [themeId, theme];
  }),
) as Record<ThemeId, TopicueTheme>;

export const fontPresets: Record<FontPresetId, { name: string; stack: string }> = {
  system_sans: {
    name: "システム標準",
    stack: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  rounded: {
    name: "丸ゴシック",
    stack: '"Yu Gothic UI", "Hiragino Maru Gothic ProN", system-ui, sans-serif',
  },
  gothic: {
    name: "ゴシック",
    stack: '"Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
  },
  mincho: {
    name: "明朝",
    stack: '"Yu Mincho", "Hiragino Mincho ProN", serif',
  },
  monospace: {
    name: "等幅",
    stack: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
  },
};

export const appearancePresetForTheme = (themeId: ThemeId): ThemeAppearancePreset => {
  const theme = topicueThemes[themeId];
  return {
    background: "transparent",
    bodyColor: theme.dice.body,
    edgeColor: theme.dice.edge,
    textColor: theme.dice.text,
    accentColor: theme.dice.rim,
  };
};

export const resolveTopicueTheme = (appearance: AppearanceConfig): ResolvedTopicueTheme => {
  const base = topicueThemes[appearance.themeId];
  return {
    ...base,
    studio: { accent: appearance.accentColor },
    dice: {
      body: appearance.bodyColor,
      bodyHighlight:
        appearance.bodyColor.toLowerCase() === base.dice.body.toLowerCase()
          ? base.dice.bodyHighlight
          : mixHex(appearance.bodyColor, "#FFFFFF", 0.12),
      edge: appearance.edgeColor,
      text: appearance.textColor,
      rim: appearance.accentColor,
    },
    resultCard: { ...base.resultCard },
    fontFamily: fontPresets[appearance.fontPreset].stack,
  };
};

export const themeCssVariables = (appearance: AppearanceConfig): ThemeCssVariables => {
  const theme = resolveTopicueTheme(appearance);
  return {
    "--topicue-body": theme.dice.body,
    "--topicue-body-highlight": theme.dice.bodyHighlight,
    "--topicue-edge": theme.dice.edge,
    "--topicue-text": theme.dice.text,
    "--topicue-rim": theme.dice.rim,
    "--topicue-card-bg": withAlpha(theme.resultCard.background, 0.94),
    "--topicue-card-border": theme.resultCard.border,
    "--topicue-card-title": theme.resultCard.title,
    "--topicue-card-body": theme.resultCard.body,
    "--topicue-card-max-width": `${appearance.resultCardMaxWidthPx}px`,
    "--topicue-category-bg": theme.resultCard.categoryBackground,
    "--topicue-category-border": theme.resultCard.categoryBorder,
    "--topicue-category-text": theme.resultCard.categoryText,
    "--topicue-glow": withAlpha(theme.dice.rim, theme.effects.glowStrength),
    "--topicue-font": theme.fontFamily,
  };
};

export const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const light = Math.max(foregroundLuminance, backgroundLuminance);
  const dark = Math.min(foregroundLuminance, backgroundLuminance);
  return (light + 0.05) / (dark + 0.05);
};

const relativeLuminance = (hex: string): number => {
  const toLinear = (channel: number): number => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = hexChannels(hex);
  return toLinear(red) * 0.2126 + toLinear(green) * 0.7152 + toLinear(blue) * 0.0722;
};

const hexChannels = (hex: string): [number, number, number] => {
  const normalized = hex.slice(0, 7).replace("#", "");
  if (!/^[0-9a-f]{6}$/iu.test(normalized)) throw new Error(`Invalid color: ${hex}`);
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

const mixHex = (first: string, second: string, amount: number): string => {
  const firstChannels = hexChannels(first);
  const secondChannels = hexChannels(second);
  const channels = firstChannels.map((channel, index) =>
    Math.round(channel + ((secondChannels[index] ?? channel) - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

const withAlpha = (hex: string, alpha: number): string => {
  const [red, green, blue] = hexChannels(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
