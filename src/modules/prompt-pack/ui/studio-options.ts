import {
  BACKGROUND_MODES,
  MOTION_INTENSITIES,
  REDUCED_MOTION_BEHAVIORS,
  RENDER_QUALITIES,
  RESULT_CARD_POSITIONS,
  SELECTION_MODES,
  SELECTION_POLICIES,
  SUPPORTED_LOCALES,
} from "../domain/constants";

import type {
  BackgroundMode,
  MotionIntensity,
  ReducedMotionBehavior,
  RenderQuality,
  ResultCardPosition,
  SelectionMode,
  SelectionPolicy,
  SupportedLocale,
} from "../domain/config-schema";

interface SelectOption<T extends string> {
  value: T;
  label: string;
}

const optionsFromLabels = <T extends string>(
  values: readonly T[],
  labels: Readonly<Record<T, string>>,
): ReadonlyArray<SelectOption<T>> => values.map((value) => ({ value, label: labels[value] }));

export const localeOptions = optionsFromLabels<SupportedLocale>(SUPPORTED_LOCALES, {
  "ja-JP": "日本語",
  "en-US": "English",
});

export const selectionModeOptions = optionsFromLabels<SelectionMode>(SELECTION_MODES, {
  independent: "完全ランダム",
  no_immediate_repeat: "直前重複なし",
  shuffle_bag: "Shuffle Bag",
  elimination: "Elimination",
});

export const selectionPolicyOptions = optionsFromLabels<SelectionPolicy>(SELECTION_POLICIES, {
  face_uniform: "面を均等に選ぶ",
  prompt_uniform: "全お題を均等に選ぶ",
});

export const backgroundModeOptions = optionsFromLabels<BackgroundMode>(BACKGROUND_MODES, {
  transparent: "透過",
  dimmed: "暗い背景",
});

export const resultCardPositionOptions = optionsFromLabels<ResultCardPosition>(
  RESULT_CARD_POSITIONS,
  {
    top: "上",
    center: "中央",
    bottom: "下",
  },
);

export const renderQualityOptions = optionsFromLabels<RenderQuality>(RENDER_QUALITIES, {
  low: "Low",
  balanced: "Balanced",
  high: "High",
});

export const motionIntensityOptions = optionsFromLabels<MotionIntensity>(MOTION_INTENSITIES, {
  low: "弱い",
  medium: "標準",
  high: "強い",
});

export const reducedMotionBehaviorOptions = optionsFromLabels<ReducedMotionBehavior>(
  REDUCED_MOTION_BEHAVIORS,
  {
    respect_system: "システム設定に従う",
    always_reduce: "常に軽減する",
    never_reduce: "軽減しない",
  },
);
