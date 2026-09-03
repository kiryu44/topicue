import { Euler, Quaternion, Vector3 } from "three";

import type { MotionIntensity } from "@/modules/prompt-pack/domain/config-schema";

import type { Object3D } from "three";

export interface MotionParameters {
  turns: number;
  wobble: number;
  bounce: number;
  axis: readonly [number, number, number];
}

export interface DieMotionState {
  parameters: MotionParameters;
  spinAxis: Vector3;
  wobbleAxis: Vector3;
  spin: Quaternion;
  wobble: Quaternion;
  intensity: number;
}

export type DieMotionPhase = "rolling" | "landing";

const LANDING_PROGRESS = 0.88;
const LANDING_PROGRESS_RANGE = 1 - LANDING_PROGRESS;

export const easeOutCubic = (progress: number): number => 1 - (1 - progress) ** 3;

export const createDieMotionState = (
  seed: string,
  longDie: boolean,
  motionIntensity: MotionIntensity,
): DieMotionState => {
  const parameters = motionFromSeed(seed);
  const spinAxis = longDie ? new Vector3(0, 1, 0) : new Vector3(...parameters.axis).normalize();
  return {
    parameters,
    spinAxis,
    wobbleAxis: new Vector3(-spinAxis.z, spinAxis.x, spinAxis.y).normalize(),
    spin: new Quaternion(),
    wobble: new Quaternion(),
    intensity: motionIntensity === "low" ? 0.55 : motionIntensity === "high" ? 1.4 : 1,
  };
};

export const applyDieMotionFrame = (
  object: Object3D,
  target: Quaternion,
  motion: DieMotionState,
  progress: number,
  reduceMotion: boolean,
): DieMotionPhase => {
  const eased = easeOutCubic(progress);
  if (reduceMotion) {
    object.quaternion.slerpQuaternions(object.quaternion, target, eased);
    object.position.y = 0;
    object.scale.setScalar(1);
  } else {
    const { parameters, spinAxis, wobbleAxis, spin, wobble, intensity } = motion;
    const totalAngle =
      (parameters.turns + 0.35 + parameters.wobble * 0.3) * Math.PI * 2 * intensity;
    spin.setFromAxisAngle(spinAxis, totalAngle * (1 - eased));
    wobble.setFromAxisAngle(
      wobbleAxis,
      Math.sin(progress * Math.PI * 5) * parameters.wobble * 0.32 * (1 - progress),
    );
    object.quaternion.copy(spin).multiply(target).multiply(wobble);
    object.position.y =
      Math.abs(Math.sin(progress * Math.PI * 3)) * parameters.bounce * (1 - progress) * intensity;
    const rollScale = Math.sin(progress * Math.PI) * 0.015 * intensity;
    const landingScale =
      progress >= LANDING_PROGRESS
        ? Math.sin(((progress - LANDING_PROGRESS) / LANDING_PROGRESS_RANGE) * Math.PI) * 0.04
        : 0;
    object.scale.setScalar(1 + rollScale + landingScale);
  }
  return progress >= LANDING_PROGRESS ? "landing" : "rolling";
};

const seedNumber = (seed: string): number => {
  let value = 2_166_136_261;
  for (const char of seed) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
};

export const motionFromSeed = (seed: string): MotionParameters => {
  const value = seedNumber(seed);
  return {
    turns: 3 + (value % 5),
    wobble: ((value >>> 5) % 1_000) / 1_000,
    bounce: 0.08 + ((value >>> 12) % 300) / 1_000,
    axis: [
      0.3 + (value & 0xff) / 255,
      0.4 + ((value >>> 8) & 0xff) / 255,
      0.2 + ((value >>> 16) & 0xff) / 255,
    ],
  };
};

export const targetQuaternion = (
  faceIndex: number,
  faceCount: number,
  faceNormal?: readonly [number, number, number],
): Quaternion => {
  if (faceNormal !== undefined) {
    return new Quaternion().setFromUnitVectors(
      new Vector3(...faceNormal).normalize(),
      new Vector3(0, 0, 1),
    );
  }
  if (faceCount === 6) {
    const rotations = [
      new Euler(0, -Math.PI / 2, 0),
      new Euler(0, Math.PI / 2, 0),
      new Euler(Math.PI / 2, 0, 0),
      new Euler(-Math.PI / 2, 0, 0),
      new Euler(0, 0, 0),
      new Euler(0, Math.PI, 0),
    ];
    return new Quaternion().setFromEuler(rotations[faceIndex % 6] as Euler);
  }
  const angle = -((faceIndex % faceCount) / faceCount) * Math.PI * 2;
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle);
};
