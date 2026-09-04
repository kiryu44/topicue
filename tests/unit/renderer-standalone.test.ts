import { Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { getRollInstruction } from "@/modules/prompt-pack/domain/roll-instruction";
import { motionFromSeed, targetQuaternion } from "@/modules/renderer/shared/motion";
import { effectiveMotionDuration } from "@/modules/renderer/shared/reduced-motion";
import { layoutText } from "@/modules/renderer/text-layout/layout";
import { createDieGeometry, dieShapeName } from "@/modules/renderer/three/die-geometry";
import { renderQualitySettings } from "@/modules/renderer/three/die-material";
import {
  generateStandaloneHtml,
  publicStandaloneConfig,
  safeSerialize,
} from "@/modules/standalone-export/generator";
import { publicStandaloneConfigSchema } from "@/modules/standalone-export/public-schema";

import { makeDeck, PRIVATE_NOTE } from "../fixtures/pack";

describe("renderer and standalone", () => {
  it("lays out graphemes and truncates deterministically", () => {
    const result = layoutText(
      "これはとても長い日本語のラベルです",
      (text, size) => [...text].length * size,
      { maxWidth: 100, maxLines: 2, fontSize: 24, minFontSize: 12 },
    );
    expect(result.lines.length).toBeLessThanOrEqual(2);
    expect(result.truncated).toBe(true);
  });

  it("derives repeatable motion and target orientations", () => {
    expect(motionFromSeed("abc123")).toEqual(motionFromSeed("abc123"));
    for (const count of [3, 4, 5, 6, 7, 20]) {
      const quaternion = targetQuaternion(count - 1, count);
      expect([quaternion.x, quaternion.y, quaternion.z, quaternion.w].every(Number.isFinite)).toBe(
        true,
      );
    }
  });

  it("shares quality and reduced-motion settings across renderers", () => {
    expect(renderQualitySettings("low")).toEqual({
      textureSize: 512,
      maximumDevicePixelRatio: 1,
    });
    expect(renderQualitySettings("high")).toEqual({
      textureSize: 2_048,
      maximumDevicePixelRatio: 2,
    });
    expect(effectiveMotionDuration(1_800, false)).toBe(1_800);
    expect(effectiveMotionDuration(1_800, true)).toBe(300);
  });

  it("creates one physical landing facet for every logical result", () => {
    for (let count = 3; count <= 20; count += 1) {
      const die = createDieGeometry(count);
      if (count === 6) {
        expect(die.kind).toBe("cube");
        expect(die.geometry.type).toBe("RoundedBoxGeometry");
      } else {
        expect(die.facets, `${count}面の着地面`).toHaveLength(count);
        for (const [index, facet] of die.facets.entries()) {
          expect(
            [facet.center.x, facet.center.y, facet.center.z, facet.labelSize].every(
              Number.isFinite,
            ),
          ).toBe(true);
          const target = targetQuaternion(index, count, [
            facet.normal.x,
            facet.normal.y,
            facet.normal.z,
          ]);
          const landedNormal = facet.normal.clone().applyQuaternion(target);
          expect(landedNormal.dot(new Vector3(0, 0, 1))).toBeCloseTo(1, 5);
        }
      }
      die.geometry.dispose();
    }
  });

  it("uses Platonic solids and named convex dice shapes without mislabeling them", () => {
    for (const count of [4, 8, 12, 20]) {
      const die = createDieGeometry(count);
      expect(die.kind, `${count}面の形状`).toBe("platonic");
      die.geometry.dispose();
    }
    expect(dieShapeName(7)).toBe("5角柱型7面ダイス");
    expect(dieShapeName(9)).toBe("7角柱型9面ダイス");
    expect(dieShapeName(10)).toBe("5角双角錐型10面ダイス");
    expect(dieShapeName(11)).toBe("9角柱型11面ダイス");
  });

  it("escapes script-sensitive values and removes private fields", () => {
    expect(safeSerialize({ value: "</script>&\u2028" })).not.toContain("</script>");
    const config = makeDeck();
    const html = generateStandaloneHtml(config, "/* bundled runtime */");
    expect(html).not.toContain(PRIVATE_NOTE);
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("--topicue-card-bg");
    expect(html).toContain("--topicue-card-fit-scale");
    expect(html).toContain("data-visual-state");
    expect(html).toContain("topicue-result");
    expect(html).not.toContain("-webkit-line-clamp");
    const publicConfig = publicStandaloneConfig(config);
    expect(publicStandaloneConfigSchema.parse(publicConfig)).toEqual(publicConfig);
    expect(JSON.stringify(publicConfig)).not.toContain("hostNotes");
    expect(JSON.stringify(publicConfig)).not.toContain("followUpQuestions");
    expect(() => publicStandaloneConfigSchema.parse({ ...publicConfig, mode: "direct" })).toThrow(
      "Direct Diceの各面",
    );
  });

  it("allowlists every standalone level and derives accurate operation instructions", () => {
    const config = makeDeck();
    const tainted = config as typeof config & { internalPackMemo?: string };
    tainted.internalPackMemo = "PRIVATE_PACK_MUST_NOT_LEAK";
    const taintedFace = config.faces[0] as (typeof config.faces)[number] & {
      internalFaceMemo?: string;
    };
    taintedFace.internalFaceMemo = "PRIVATE_FACE_MUST_NOT_LEAK";
    const serialized = JSON.stringify(publicStandaloneConfig(tainted));
    expect(serialized).not.toContain("PRIVATE_PACK_MUST_NOT_LEAK");
    expect(serialized).not.toContain("PRIVATE_FACE_MUST_NOT_LEAK");

    expect(
      getRollInstruction({ ...config.behavior, allowOverlayClick: false, allowKeyboard: false }),
    ).toContain("OBS操作設定");
    expect(
      getRollInstruction({ ...config.behavior, allowOverlayClick: true, allowKeyboard: false }),
    ).toContain("クリック");
    expect(
      getRollInstruction({ ...config.behavior, allowOverlayClick: false, allowKeyboard: true }),
    ).toContain("Space");
  });

  it("keeps script-closing user text inside the serialized configuration", () => {
    const config = makeDeck();
    const prompt = config.faces[0]?.prompts[0];
    if (prompt === undefined) throw new Error("fixture");
    prompt.audienceTitle = "</script><script>window.__TOPICUE_INJECTED__=true</script>";

    const html = generateStandaloneHtml(config, "/* bundled runtime */");
    expect(html).not.toContain("<script>window.__TOPICUE_INJECTED__");
    expect(html).toContain("\\u003c/script\\u003e");
    expect(html.match(/<script>/gu)).toHaveLength(2);
  });
});
