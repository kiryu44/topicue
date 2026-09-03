"use client";

import { useEffect, useRef, useState } from "react";
import {
  EdgesGeometry,
  LineSegments,
  Mesh,
  PlaneGeometry,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

import type {
  AnimationConfig,
  AppearanceConfig,
  BehaviorConfig,
} from "@/modules/prompt-pack/domain/config-schema";

import {
  applyDieMotionFrame,
  createDieMotionState,
  easeOutCubic,
  motionFromSeed,
  targetQuaternion,
} from "../shared/motion";
import { effectiveMotionDuration, shouldReduceMotion } from "../shared/reduced-motion";
import { createDieGeometry } from "../three/die-geometry";
import {
  addTopicueLights,
  applyDieVisualState,
  createDieVisualMaterials,
  disposeDieVisualMaterials,
  renderQualitySettings,
} from "../three/die-material";

export interface DicePresentationProps {
  labels: string[];
  appearance: AppearanceConfig;
  targetFaceId?: string | undefined;
  faceIds: string[];
  motionSeed?: string | undefined;
  durationMs: number;
  motionIntensity: AnimationConfig["motionIntensity"];
  reducedMotionBehavior: AnimationConfig["reducedMotionBehavior"];
  targetFps: BehaviorConfig["targetFps"];
  idleSpin?: boolean;
  onSettled?: (() => void) | undefined;
}

export const DicePresentation = ({
  labels,
  appearance,
  targetFaceId,
  faceIds,
  motionSeed,
  durationMs,
  motionIntensity,
  reducedMotionBehavior,
  targetFps,
  idleSpin = false,
  onSettled,
}: DicePresentationProps) => {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState(0);
  const recoveryAttempts = useRef(0);
  const completedMotionSeed = useRef<string | undefined>(undefined);

  useEffect(() => {
    const container = host.current;
    if (container === null) return;
    const mount = container;
    let frame = 0;
    let renderer: WebGLRenderer | null = null;
    let contextLostHandler: ((event: Event) => void) | null = null;
    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 5.2;
    addTopicueLights(scene, appearance);
    const quality = renderQualitySettings(appearance.quality);
    const dieGeometry = createDieGeometry(labels.length);
    const visualMaterials = createDieVisualMaterials({
      labels,
      cube: dieGeometry.kind === "cube",
      appearance,
      textureSize: quality.textureSize,
    });
    applyDieVisualState(visualMaterials, appearance, "idle");
    const geometry = dieGeometry.geometry;
    const meshMaterial =
      dieGeometry.kind === "cube" ? visualMaterials.labelMaterials : visualMaterials.bodyMaterial;
    if (meshMaterial === null) throw new Error("Die body material is unavailable");
    const mesh = new Mesh(geometry, meshMaterial);
    const edges = new EdgesGeometry(geometry, dieGeometry.kind === "cube" ? 24 : 1);
    mesh.add(new LineSegments(edges, visualMaterials.edgeMaterial));
    const labelGeometries: PlaneGeometry[] = [];
    if (dieGeometry.kind !== "cube") {
      dieGeometry.facets.forEach((facet, index) => {
        const plane = new PlaneGeometry(facet.labelSize, facet.labelSize);
        labelGeometries.push(plane);
        const labelMaterial = visualMaterials.labelMaterials[index];
        if (labelMaterial === undefined) return;
        const labelMesh = new Mesh(plane, labelMaterial);
        labelMesh.position.copy(facet.center).addScaledVector(facet.normal, 0.012);
        labelMesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), facet.normal);
        mesh.add(labelMesh);
      });
    }
    scene.add(mesh);

    const mountRenderer = (): WebGLRenderer | null => {
      try {
        const created = new WebGLRenderer({
          alpha: true,
          antialias: appearance.quality !== "low",
          powerPreference: "high-performance",
        });
        renderer = created;
        created.setPixelRatio(Math.min(devicePixelRatio, quality.maximumDevicePixelRatio));
        contextLostHandler = (event): void => {
          event.preventDefault();
          recoveryAttempts.current += 1;
          if (recoveryAttempts.current > 3) {
            setFallback(true);
            return;
          }
          window.setTimeout(
            () => setRecoveryKey((current) => current + 1),
            100 * recoveryAttempts.current,
          );
        };
        created.domElement.addEventListener("webglcontextlost", contextLostHandler);
        mount.append(created.domElement);
        return created;
      } catch {
        setFallback(true);
        return null;
      }
    };

    const activeRenderer = mountRenderer();
    if (activeRenderer === null) {
      geometry.dispose();
      edges.dispose();
      for (const labelGeometry of labelGeometries) labelGeometry.dispose();
      disposeDieVisualMaterials(visualMaterials);
      return;
    }
    const recoveryResetTimer = window.setTimeout(() => {
      recoveryAttempts.current = 0;
    }, 1_000);
    const resize = new ResizeObserver(() => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      activeRenderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      activeRenderer.render(scene, camera);
    });
    resize.observe(mount);

    const index = Math.max(0, faceIds.indexOf(targetFaceId ?? ""));
    const targetFacet = dieGeometry.kind === "cube" ? undefined : dieGeometry.facets[index];
    const target = targetQuaternion(
      index,
      faceIds.length,
      targetFacet === undefined
        ? undefined
        : [targetFacet.normal.x, targetFacet.normal.y, targetFacet.normal.z],
    );
    const reduce = shouldReduceMotion(
      reducedMotionBehavior,
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    if (motionSeed !== undefined && completedMotionSeed.current !== motionSeed) {
      const motion = createDieMotionState(
        motionSeed,
        dieGeometry.kind === "long-die",
        motionIntensity,
      );
      const start = performance.now();
      const effectiveDuration = effectiveMotionDuration(durationMs, reduce);
      let lastRenderedAt = 0;
      const animate = (now: number): void => {
        const progress = Math.min(1, (now - start) / effectiveDuration);
        if (progress < 1 && now - lastRenderedAt < 1_000 / targetFps) {
          frame = requestAnimationFrame(animate);
          return;
        }
        lastRenderedAt = now;
        const phase = applyDieMotionFrame(mesh, target, motion, progress, reduce);
        applyDieVisualState(visualMaterials, appearance, phase);
        activeRenderer.render(scene, camera);
        if (progress < 1) frame = requestAnimationFrame(animate);
        else {
          mesh.quaternion.copy(target);
          mesh.position.y = 0;
          mesh.scale.setScalar(1);
          applyDieVisualState(visualMaterials, appearance, "result");
          activeRenderer.render(scene, camera);
          completedMotionSeed.current = motionSeed;
          onSettled?.();
        }
      };
      frame = requestAnimationFrame(animate);
    } else if (idleSpin) {
      const renderIdleFrame = (elapsedSeconds: number): void => {
        mesh.rotation.set(
          -0.3 + Math.sin(elapsedSeconds * 0.55) * 0.18,
          0.45 + elapsedSeconds * 0.55,
          Math.sin(elapsedSeconds * 0.37) * 0.08,
        );
        activeRenderer.render(scene, camera);
      };
      if (reduce) {
        renderIdleFrame(0);
      } else {
        const start = performance.now();
        let lastRenderedAt = 0;
        const animateIdle = (now: number): void => {
          if (now - lastRenderedAt >= 1_000 / targetFps) {
            lastRenderedAt = now;
            renderIdleFrame((now - start) / 1_000);
          }
          frame = requestAnimationFrame(animateIdle);
        };
        frame = requestAnimationFrame(animateIdle);
      }
    } else {
      mesh.quaternion.copy(target);
      if (motionSeed !== undefined) {
        applyDieVisualState(visualMaterials, appearance, "result");
      }
      activeRenderer.render(scene, camera);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(recoveryResetTimer);
      resize.disconnect();
      geometry.dispose();
      edges.dispose();
      for (const labelGeometry of labelGeometries) labelGeometry.dispose();
      disposeDieVisualMaterials(visualMaterials);
      if (renderer !== null) {
        if (contextLostHandler !== null) {
          renderer.domElement.removeEventListener("webglcontextlost", contextLostHandler);
        }
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [
    appearance,
    durationMs,
    faceIds,
    labels,
    motionIntensity,
    motionSeed,
    idleSpin,
    onSettled,
    reducedMotionBehavior,
    recoveryKey,
    targetFaceId,
    targetFps,
  ]);

  if (fallback) {
    const index = Math.max(0, faceIds.indexOf(targetFaceId ?? ""));
    return (
      <CanvasFallback
        label={labels[index] ?? labels[0] ?? "—"}
        appearance={appearance}
        motionSeed={motionSeed}
        durationMs={durationMs}
        reducedMotionBehavior={reducedMotionBehavior}
        targetFps={targetFps}
        idleSpin={idleSpin}
        onSettled={onSettled}
      />
    );
  }
  return <div className="renderer-root" ref={host} role="img" aria-label="3Dトークダイス" />;
};

const CanvasFallback = ({
  label,
  appearance,
  motionSeed,
  durationMs,
  reducedMotionBehavior,
  targetFps,
  idleSpin,
  onSettled,
}: {
  label: string;
  appearance: AppearanceConfig;
  motionSeed?: string | undefined;
  durationMs: number;
  reducedMotionBehavior: AnimationConfig["reducedMotionBehavior"];
  targetFps: 30 | 60;
  idleSpin: boolean;
  onSettled?: (() => void) | undefined;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const completedMotionSeed = useRef<string | undefined>(undefined);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (element === null || element === undefined || context === null || context === undefined)
      return;
    const drawingContext = context;
    const size = 640;
    element.width = size;
    element.height = size;
    let frame = 0;
    const motion = motionFromSeed(motionSeed ?? "idle");
    const reduce = shouldReduceMotion(
      reducedMotionBehavior,
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const effectiveDuration = effectiveMotionDuration(durationMs, reduce);

    const draw = (angle: number, scale: number): void => {
      drawingContext.clearRect(0, 0, size, size);
      drawingContext.save();
      drawingContext.translate(size / 2, size / 2);
      drawingContext.rotate(angle);
      drawingContext.scale(scale, scale);
      drawingContext.fillStyle = appearance.bodyColor;
      drawingContext.strokeStyle = appearance.edgeColor;
      drawingContext.lineWidth = 16;
      drawingContext.beginPath();
      drawingContext.roundRect(-190, -190, 380, 380, 42);
      drawingContext.fill();
      drawingContext.stroke();
      drawingContext.fillStyle = appearance.textColor;
      drawingContext.textAlign = "center";
      drawingContext.textBaseline = "middle";
      drawingContext.font = "800 54px system-ui";
      drawingContext.fillText(label, 0, 0, 320);
      drawingContext.restore();
    };

    if (motionSeed === undefined) {
      if (!idleSpin || reduce) {
        draw(0, 1);
        return;
      }
      const start = performance.now();
      let lastRenderedAt = 0;
      const animateIdle = (now: number): void => {
        if (now - lastRenderedAt >= 1_000 / targetFps) {
          lastRenderedAt = now;
          draw((now - start) * 0.00045, 1);
        }
        frame = requestAnimationFrame(animateIdle);
      };
      frame = requestAnimationFrame(animateIdle);
      return () => cancelAnimationFrame(frame);
    }
    if (completedMotionSeed.current === motionSeed) {
      draw(0, 1);
      return;
    }
    const start = performance.now();
    let lastRenderedAt = 0;
    const animate = (now: number): void => {
      const progress = Math.min(1, (now - start) / effectiveDuration);
      if (progress < 1 && now - lastRenderedAt < 1_000 / targetFps) {
        frame = requestAnimationFrame(animate);
        return;
      }
      lastRenderedAt = now;
      const eased = easeOutCubic(progress);
      const angle = reduce ? 0 : (motion.turns + 0.2) * Math.PI * 2 * (1 - eased);
      const scale = reduce ? 1 : 1 + Math.sin(progress * Math.PI) * 0.1;
      draw(angle, scale);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else {
        completedMotionSeed.current = motionSeed;
        onSettled?.();
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [
    appearance,
    durationMs,
    idleSpin,
    label,
    motionSeed,
    onSettled,
    reducedMotionBehavior,
    targetFps,
  ]);
  return (
    <canvas className="renderer-root" ref={canvas} aria-label="2Dトークダイス（フォールバック）" />
  );
};
