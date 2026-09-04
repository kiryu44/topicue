import type { BehaviorConfig } from "./config-schema";

export const getRollInstruction = (behavior: BehaviorConfig): string => {
  if (behavior.allowOverlayClick && behavior.allowKeyboard) {
    return "クリックまたはSpace・Enterキーで振れます";
  }
  if (behavior.allowOverlayClick) return "クリックして振れます";
  if (behavior.allowKeyboard) return "Space・Enterキーで振れます";
  return "OBS操作設定でクリックまたはキーボード操作を有効にしてください";
};
