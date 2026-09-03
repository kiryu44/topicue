import type { AnimationConfig } from "@/modules/prompt-pack/domain/config-schema";

export const shouldReduceMotion = (
  behavior: AnimationConfig["reducedMotionBehavior"],
  systemPrefersReducedMotion: boolean,
): boolean =>
  behavior === "always_reduce" || (behavior === "respect_system" && systemPrefersReducedMotion);

const REDUCED_MOTION_MAX_DURATION_MS = 300;

export const effectiveMotionDuration = (durationMs: number, reduceMotion: boolean): number =>
  reduceMotion ? Math.min(REDUCED_MOTION_MAX_DURATION_MS, durationMs) : durationMs;
