import {
  AmbientLight,
  Color,
  DirectionalLight,
  LineBasicMaterial,
  MeshStandardMaterial,
  type Scene,
} from "three";

import type { AppearanceConfig, RenderQuality } from "@/modules/prompt-pack/domain/config-schema";
import { resolveTopicueTheme } from "@/modules/prompt-pack/domain/theme";

import { createTextTexture } from "./text-texture";

export type DieVisualState = "idle" | "rolling" | "landing" | "result";

interface RenderQualitySettings {
  textureSize: number;
  maximumDevicePixelRatio: number;
}

const RENDER_QUALITY_SETTINGS = {
  low: { textureSize: 512, maximumDevicePixelRatio: 1 },
  balanced: { textureSize: 1_024, maximumDevicePixelRatio: 1.5 },
  high: { textureSize: 2_048, maximumDevicePixelRatio: 2 },
} as const satisfies Record<RenderQuality, RenderQualitySettings>;

export const renderQualitySettings = (quality: RenderQuality): RenderQualitySettings =>
  RENDER_QUALITY_SETTINGS[quality];

export interface DieVisualMaterials {
  labelMaterials: MeshStandardMaterial[];
  bodyMaterial: MeshStandardMaterial | null;
  edgeMaterial: LineBasicMaterial;
}

interface MaterialOptions {
  labels: string[];
  cube: boolean;
  appearance: AppearanceConfig;
  textureSize: number;
}

export const createDieVisualMaterials = ({
  labels,
  cube,
  appearance,
  textureSize,
}: MaterialOptions): DieVisualMaterials => {
  const theme = resolveTopicueTheme(appearance);
  const labelMaterials = labels.map(
    (label) =>
      new MeshStandardMaterial({
        map: createTextTexture(
          label,
          cube ? { body: theme.dice.body, highlight: theme.dice.bodyHighlight } : null,
          theme.dice.text,
          textureSize,
        ),
        color: new Color("#ffffff"),
        emissive: new Color(theme.dice.rim),
        emissiveIntensity: 0.04,
        roughness: 0.62,
        metalness: 0.04,
        transparent: !cube,
      }),
  );
  const bodyMaterial = cube
    ? null
    : new MeshStandardMaterial({
        color: theme.dice.body,
        emissive: theme.dice.rim,
        emissiveIntensity: 0.04,
        roughness: 0.64,
        metalness: 0.04,
      });
  const edgeMaterial = new LineBasicMaterial({
    color: theme.dice.edge,
    transparent: true,
    opacity: 0.9,
  });
  return { labelMaterials, bodyMaterial, edgeMaterial };
};

export const applyDieVisualState = (
  materials: DieVisualMaterials,
  appearance: AppearanceConfig,
  state: DieVisualState,
): void => {
  const theme = resolveTopicueTheme(appearance);
  const emissiveIntensity =
    state === "rolling" ? 0.34 : state === "landing" ? 0.48 : state === "result" ? 0.1 : 0.04;
  const edgeOpacity = state === "rolling" ? 1 : state === "landing" ? 1 : 0.9;
  const edgeColor = state === "idle" ? theme.dice.edge : theme.dice.rim;
  materials.edgeMaterial.color.set(edgeColor);
  materials.edgeMaterial.opacity = edgeOpacity;
  materials.bodyMaterial?.emissive.set(theme.dice.rim);
  if (materials.bodyMaterial !== null) {
    materials.bodyMaterial.emissiveIntensity = emissiveIntensity;
  }
  for (const material of materials.labelMaterials) {
    material.emissive.set(theme.dice.rim);
    material.emissiveIntensity = emissiveIntensity;
  }
};

export const addTopicueLights = (scene: Scene, appearance: AppearanceConfig): void => {
  const theme = resolveTopicueTheme(appearance);
  scene.add(new AmbientLight(0xcad8ff, 1.05));
  const key = new DirectionalLight(0xffffff, 3.1);
  key.position.set(3.5, 4.5, 5);
  scene.add(key);
  const fill = new DirectionalLight(theme.dice.bodyHighlight, 1.45);
  fill.position.set(-4, 1.5, 3);
  scene.add(fill);
  const rim = new DirectionalLight(theme.dice.rim, 2.2);
  rim.position.set(1, -2.5, -4);
  scene.add(rim);
};

export const disposeDieVisualMaterials = (materials: DieVisualMaterials): void => {
  materials.edgeMaterial.dispose();
  materials.bodyMaterial?.dispose();
  for (const material of materials.labelMaterials) {
    material.map?.dispose();
    material.dispose();
  }
};
