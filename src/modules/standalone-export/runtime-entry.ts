import {
  EdgesGeometry,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { z } from "zod";

import { dieFaceLabel } from "@/modules/prompt-pack/domain/die-label";
import { getRollInstruction } from "@/modules/prompt-pack/domain/roll-instruction";
import { playBuiltInSound } from "@/modules/renderer/shared/audio";
import {
  applyDieMotionFrame,
  createDieMotionState,
  easeOutCubic,
  motionFromSeed,
  targetQuaternion,
} from "@/modules/renderer/shared/motion";
import {
  effectiveMotionDuration,
  shouldReduceMotion,
} from "@/modules/renderer/shared/reduced-motion";
import { createDieGeometry } from "@/modules/renderer/three/die-geometry";
import {
  addTopicueLights,
  applyDieVisualState,
  createDieVisualMaterials,
  disposeDieVisualMaterials,
  renderQualitySettings,
} from "@/modules/renderer/three/die-material";
import { selectPrompt } from "@/modules/selection/engine";
import { BrowserCryptoRandomSource, randomHexSeed } from "@/modules/selection/random";
import { initialSelectionState, sessionSelectionStateSchema } from "@/modules/selection/types";
import { downloadTextFile } from "@/shared/download-file";

import { publicStandaloneConfigSchema, type PublicStandaloneConfigV1 } from "./public-schema";

import type { Quaternion } from "three";

declare global {
  interface Window {
    __PROMPT_DICE_CONFIG__: PublicStandaloneConfigV1;
  }
}

interface DieRenderer {
  show(faceId: string): void;
  roll(faceId: string, motionSeed: string, onSettled: () => void): void;
  dispose(): void;
}

const STANDALONE_STORAGE_VERSION = 1 as const;

const storedStateSchema = z
  .object({
    selection: sessionSelectionStateSchema,
    history: z.array(
      z
        .object({
          at: z.iso.datetime(),
          faceId: z.string(),
          promptId: z.string(),
          audienceTitle: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

type StoredState = z.infer<typeof storedStateSchema>;

const config = publicStandaloneConfigSchema.parse(window.__PROMPT_DICE_CONFIG__);
const identity = config.faces.map((face) => face.id).join(":");
const storageKey = `topicue:standalone:${identity}:v${STANDALONE_STORAGE_VERSION}`;
let state: StoredState;
let rolling = false;
let revealTimer = 0;
let hideTimer = 0;
const app = document.querySelector<HTMLElement>("#app");
if (app === null) throw new Error("Missing app root");
app.dataset["visualState"] = "idle";
const rollInstruction = getRollInstruction(config.behavior);

app.innerHTML = `<section class="standalone-stage" tabindex="0" aria-label="トークダイス。${rollInstruction}"><div class="standalone-renderer" role="img" aria-label="3Dトークダイス"></div><div class="standalone-status" aria-live="polite">${rollInstruction}</div><article class="standalone-card" hidden><small></small><h1></h1><p></p></article><aside class="standalone-resume" hidden><strong>前回のセッションがあります</strong><p></p><button type="button" data-action="resume">続きから振る</button><button type="button" data-action="restart">最初からやり直す</button></aside><nav class="standalone-controls" aria-label="ダイス操作"><button type="button" data-action="roll">振る</button><button type="button" data-action="reset">履歴をリセット</button><button type="button" data-action="history">履歴JSON</button></nav></section>`;

const requiredElement = <T extends Element>(selector: string): T => {
  const element = app?.querySelector<T>(selector);
  if (element === null || element === undefined) throw new Error(`Missing ${selector}`);
  return element;
};

const rendererHost = requiredElement<HTMLElement>(".standalone-renderer");
const stage = requiredElement<HTMLElement>(".standalone-stage");
const card = requiredElement<HTMLElement>(".standalone-card");
const resumePanel = requiredElement<HTMLElement>(".standalone-resume");
const status = requiredElement<HTMLElement>(".standalone-status");
let renderer: DieRenderer | null = null;

const loadState = (): StoredState => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return { selection: initialSelectionState(), history: [] };
    return storedStateSchema.parse(JSON.parse(stored));
  } catch {
    return { selection: initialSelectionState(), history: [] };
  }
};

const save = (): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // OBSのLocal fileで保存が拒否されても抽選は続行する。
  }
};

const fitResultCard = (): void => {
  if (card.hidden) return;
  const availableHeight = stage.clientHeight * 0.84;
  const contentHeight = card.offsetHeight;
  if (availableHeight <= 0 || contentHeight <= 0) return;
  card.style.setProperty(
    "--topicue-card-fit-scale",
    Math.min(1, availableHeight / contentHeight).toFixed(4),
  );
};

const showResult = (faceId: string, promptId: string): void => {
  const face = config.faces.find((candidate) => candidate.id === faceId);
  const prompt = face?.prompts.find((candidate) => candidate.id === promptId);
  if (face === undefined || prompt === undefined) return;
  const category = card.querySelector("small");
  const title = card.querySelector("h1");
  const body = card.querySelector("p");
  window.clearTimeout(hideTimer);
  if (category !== null) {
    category.textContent = face.label;
    category.hidden = !config.behavior.showCategoryBeforePrompt;
  }
  if (title !== null) title.textContent = prompt.audienceTitle;
  if (body !== null) body.textContent = prompt.audienceBody ?? "";
  card.hidden = false;
  fitResultCard();
  app.dataset["visualState"] = "result";
  status.textContent = dieFaceLabel(face);
  if (!config.behavior.keepResultVisible && config.animation.resultVisibleMs !== null) {
    hideTimer = window.setTimeout(() => {
      card.hidden = true;
    }, config.animation.resultVisibleMs);
  }
};

const roll = (): void => {
  if (rolling) return;
  resumePanel.hidden = true;
  rolling = true;
  window.clearTimeout(revealTimer);
  window.clearTimeout(hideTimer);
  card.hidden = true;
  app.dataset["visualState"] = "rolling";
  status.textContent = "抽選中…";
  if (config.animation.rollSoundEnabled) void playBuiltInSound("roll");
  try {
    const random = new BrowserCryptoRandomSource();
    const selected = selectPrompt({
      config,
      state: state.selection,
      random,
    });
    const face = config.faces.find((candidate) => candidate.id === selected.faceId);
    const prompt = face?.prompts.find((candidate) => candidate.id === selected.promptId);
    if (face === undefined || prompt === undefined) throw new Error("抽選結果が見つかりません。");
    state.selection = selected.nextState;
    state.history.push({
      at: new Date().toISOString(),
      faceId: face.id,
      promptId: prompt.id,
      audienceTitle: prompt.audienceTitle,
    });
    save();
    renderer?.roll(face.id, randomHexSeed(random), () => {
      app.dataset["visualState"] = "landing";
      revealTimer = window.setTimeout(() => {
        showResult(face.id, prompt.id);
        if (config.animation.landingSoundEnabled) void playBuiltInSound("landing");
        rolling = false;
      }, config.animation.revealDelayMs);
    });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "抽選できませんでした。";
    rolling = false;
  }
};

const reset = (): void => {
  if (rolling) return;
  window.clearTimeout(revealTimer);
  window.clearTimeout(hideTimer);
  state = { selection: initialSelectionState(), history: [] };
  save();
  card.hidden = true;
  app.dataset["visualState"] = "idle";
  resumePanel.hidden = true;
  status.textContent = rollInstruction;
  renderer?.show(config.faces[0]?.id ?? "");
};

const downloadHistory = (): void => {
  downloadTextFile(
    JSON.stringify({ exportedAt: new Date().toISOString(), history: state.history }, null, 2),
    "application/json",
    "topicue-session-history.json",
  );
};

const createRenderer = (host: HTMLElement): DieRenderer => {
  let active: DieRenderer | null = null;
  let currentFaceId = config.faces[0]?.id ?? "";
  let pendingSettled: (() => void) | null = null;
  let recoveryAttempts = 0;
  let recovering = false;

  const switchToCanvas = (): void => {
    active?.dispose();
    host.replaceChildren();
    document.body.classList.add("canvas-fallback");
    active = createCanvasRenderer(host);
    active.show(currentFaceId);
    const settle = pendingSettled;
    pendingSettled = null;
    recovering = false;
    settle?.();
  };

  const recover = (): void => {
    if (recovering) return;
    recovering = true;
    active?.dispose();
    active = null;
    const attempt = (): void => {
      recoveryAttempts += 1;
      host.replaceChildren();
      try {
        active = createWebGlRenderer(host, recover);
        active.show(currentFaceId);
        recoveryAttempts = 0;
        recovering = false;
        const settle = pendingSettled;
        pendingSettled = null;
        settle?.();
      } catch {
        if (recoveryAttempts >= 3) switchToCanvas();
        else window.setTimeout(attempt, 100 * recoveryAttempts);
      }
    };
    window.setTimeout(attempt, 100);
  };

  try {
    active = createWebGlRenderer(host, recover);
  } catch {
    switchToCanvas();
  }

  return {
    show: (faceId) => {
      currentFaceId = faceId;
      active?.show(faceId);
    },
    roll: (faceId, motionSeed, onSettled) => {
      currentFaceId = faceId;
      pendingSettled = () => {
        pendingSettled = null;
        onSettled();
      };
      active?.roll(faceId, motionSeed, pendingSettled);
    },
    dispose: () => {
      active?.dispose();
      active = null;
    },
  };
};

const createWebGlRenderer = (host: HTMLElement, onContextLost: () => void): DieRenderer => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 5.2;
  addTopicueLights(scene, config.appearance);
  const labels = config.faces.map((face) => dieFaceLabel(face));
  const faceIds = config.faces.map((face) => face.id);
  const quality = renderQualitySettings(config.appearance.quality);
  const dieGeometry = createDieGeometry(labels.length);
  const visualMaterials = createDieVisualMaterials({
    labels,
    cube: dieGeometry.kind === "cube",
    appearance: config.appearance,
    textureSize: quality.textureSize,
  });
  applyDieVisualState(visualMaterials, config.appearance, "idle");
  const meshMaterial =
    dieGeometry.kind === "cube" ? visualMaterials.labelMaterials : visualMaterials.bodyMaterial;
  if (meshMaterial === null) throw new Error("Die body material is unavailable");
  const mesh = new Mesh(dieGeometry.geometry, meshMaterial);
  const edgeGeometry = new EdgesGeometry(
    dieGeometry.geometry,
    dieGeometry.kind === "cube" ? 24 : 1,
  );
  mesh.add(new LineSegments(edgeGeometry, visualMaterials.edgeMaterial));
  const labelGeometries: PlaneGeometry[] = [];
  if (dieGeometry.kind !== "cube") {
    dieGeometry.facets.forEach((facet, index) => {
      const labelGeometry = new PlaneGeometry(facet.labelSize, facet.labelSize);
      labelGeometries.push(labelGeometry);
      const labelMaterial = visualMaterials.labelMaterials[index];
      if (labelMaterial === undefined) return;
      const labelMesh = new Mesh(labelGeometry, labelMaterial);
      labelMesh.position.copy(facet.center).addScaledVector(facet.normal, 0.012);
      labelMesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), facet.normal);
      mesh.add(labelMesh);
    });
  }
  scene.add(mesh);
  const webgl = new WebGLRenderer({
    alpha: true,
    antialias: config.appearance.quality !== "low",
    powerPreference: "high-performance",
  });
  webgl.setPixelRatio(Math.min(devicePixelRatio, quality.maximumDevicePixelRatio));
  host.append(webgl.domElement);
  const contextLost = (event: Event): void => {
    event.preventDefault();
    onContextLost();
  };
  webgl.domElement.addEventListener("webglcontextlost", contextLost, { once: true });
  const resize = (): void => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    webgl.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    webgl.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  let frame = 0;

  const target = (faceId: string): Quaternion => {
    const index = Math.max(0, faceIds.indexOf(faceId));
    const facet = dieGeometry.kind === "cube" ? undefined : dieGeometry.facets[index];
    return targetQuaternion(
      index,
      faceIds.length,
      facet === undefined ? undefined : [facet.normal.x, facet.normal.y, facet.normal.z],
    );
  };

  return {
    show: (faceId) => {
      cancelAnimationFrame(frame);
      mesh.quaternion.copy(target(faceId));
      mesh.position.y = 0;
      mesh.scale.setScalar(1);
      applyDieVisualState(visualMaterials, config.appearance, "idle");
      webgl.render(scene, camera);
    },
    roll: (faceId, motionSeed, onSettled) => {
      cancelAnimationFrame(frame);
      const destination = target(faceId);
      const motion = createDieMotionState(
        motionSeed,
        dieGeometry.kind === "long-die",
        config.animation.motionIntensity,
      );
      const start = performance.now();
      const reduce = shouldReduceMotion(
        config.animation.reducedMotionBehavior,
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      const duration = effectiveMotionDuration(config.animation.durationMs, reduce);
      let lastRenderedAt = 0;
      const animate = (now: number): void => {
        const progress = Math.min(1, (now - start) / duration);
        if (progress < 1 && now - lastRenderedAt < 1_000 / config.behavior.targetFps) {
          frame = requestAnimationFrame(animate);
          return;
        }
        lastRenderedAt = now;
        const phase = applyDieMotionFrame(mesh, destination, motion, progress, reduce);
        applyDieVisualState(visualMaterials, config.appearance, phase);
        webgl.render(scene, camera);
        if (progress < 1) frame = requestAnimationFrame(animate);
        else {
          mesh.quaternion.copy(destination);
          mesh.position.y = 0;
          mesh.scale.setScalar(1);
          applyDieVisualState(visualMaterials, config.appearance, "result");
          webgl.render(scene, camera);
          onSettled();
        }
      };
      frame = requestAnimationFrame(animate);
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      webgl.domElement.removeEventListener("webglcontextlost", contextLost);
      dieGeometry.geometry.dispose();
      edgeGeometry.dispose();
      for (const geometry of labelGeometries) geometry.dispose();
      disposeDieVisualMaterials(visualMaterials);
      webgl.dispose();
      webgl.domElement.remove();
    },
  };
};

const createCanvasRenderer = (host: HTMLElement): DieRenderer => {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 800;
  host.append(canvas);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Canvas is unavailable");
  const drawingContext = context;
  let frame = 0;
  let currentFaceId = config.faces[0]?.id ?? "";

  const draw = (faceId: string, angle = 0, scale = 1): void => {
    currentFaceId = faceId;
    const face = config.faces.find((candidate) => candidate.id === faceId) ?? config.faces[0];
    const label = face === undefined ? "—" : dieFaceLabel(face);
    drawingContext.clearRect(0, 0, canvas.width, canvas.height);
    drawingContext.save();
    drawingContext.translate(400, 400);
    drawingContext.rotate(angle);
    drawingContext.scale(scale, scale);
    drawingContext.fillStyle = config.appearance.bodyColor;
    drawingContext.strokeStyle = config.appearance.edgeColor;
    drawingContext.lineWidth = 18;
    drawingContext.beginPath();
    drawingContext.roundRect(-220, -220, 440, 440, 48);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = config.appearance.textColor;
    drawingContext.textAlign = "center";
    drawingContext.textBaseline = "middle";
    drawingContext.font = "800 62px system-ui";
    drawingContext.fillText(label, 0, 0, 360);
    drawingContext.restore();
  };

  return {
    show: (faceId) => {
      cancelAnimationFrame(frame);
      draw(faceId);
    },
    roll: (faceId, motionSeed, onSettled) => {
      cancelAnimationFrame(frame);
      const motion = motionFromSeed(motionSeed);
      const start = performance.now();
      const reduce = shouldReduceMotion(
        config.animation.reducedMotionBehavior,
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      const duration = effectiveMotionDuration(config.animation.durationMs, reduce);
      let lastRenderedAt = 0;
      const animate = (now: number): void => {
        const progress = Math.min(1, (now - start) / duration);
        if (progress < 1 && now - lastRenderedAt < 1_000 / config.behavior.targetFps) {
          frame = requestAnimationFrame(animate);
          return;
        }
        lastRenderedAt = now;
        const eased = easeOutCubic(progress);
        draw(
          currentFaceId,
          reduce ? 0 : (motion.turns + 0.2) * Math.PI * 2 * (1 - eased),
          reduce ? 1 : 1 + Math.sin(progress * Math.PI) * 0.1,
        );
        if (progress < 1) frame = requestAnimationFrame(animate);
        else {
          draw(faceId);
          onSettled();
        }
      };
      frame = requestAnimationFrame(animate);
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      canvas.remove();
    },
  };
};

state = loadState();
renderer = createRenderer(rendererHost);
const restored = state.history.at(-1);
if (restored === undefined) {
  renderer.show(config.faces[0]?.id ?? "");
} else {
  renderer.show(restored.faceId);
  showResult(restored.faceId, restored.promptId);
  const total = config.faces.flatMap((face) =>
    face.enabled ? face.prompts.filter((prompt) => prompt.enabled) : [],
  ).length;
  const used = new Set(state.selection.usedPromptIds).size;
  const summary = resumePanel.querySelector("p");
  if (summary !== null) {
    summary.textContent = `${used}件使用済み・残り${Math.max(0, total - used)}件`;
  }
  resumePanel.hidden = false;
  status.textContent = "前回の抽選状態を復元しました";
}
if (restored === undefined && config.behavior.rollOnLoad) window.setTimeout(roll, 50);

app.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  const action = event.target.closest<HTMLButtonElement>("button")?.dataset["action"];
  if (action === "roll") roll();
  else if (action === "reset") reset();
  else if (action === "history") downloadHistory();
  else if (action === "resume") {
    resumePanel.hidden = true;
    status.textContent = rollInstruction;
  } else if (action === "restart") reset();
  else if (
    config.behavior.allowOverlayClick &&
    event.target.closest(".standalone-stage") !== null
  ) {
    roll();
  }
});

window.addEventListener("keydown", (event) => {
  if (config.behavior.allowKeyboard && (event.code === "Space" || event.code === "Enter")) {
    event.preventDefault();
    roll();
  }
});
window.addEventListener("resize", fitResultCard);
