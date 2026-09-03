import {
  BufferGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export interface FacetFrame {
  center: Vector3;
  normal: Vector3;
  labelSize: number;
}

export type DieGeometry =
  | { kind: "cube"; geometry: RoundedBoxGeometry; facets: [] }
  | {
      kind: "platonic" | "long-die" | "prismatic" | "bipyramid";
      geometry: BufferGeometry;
      facets: FacetFrame[];
    };

const platonicNames = new Map<number, string>([
  [4, "正四面体"],
  [6, "立方体（正六面体）"],
  [8, "正八面体"],
  [12, "正十二面体"],
  [20, "正二十面体"],
]);

export const dieShapeName = (faceCount: number): string => {
  const platonicName = platonicNames.get(faceCount);
  if (platonicName !== undefined) return platonicName;
  if (faceCount === 3) return "ロングダイス型3面ダイス";
  if (faceCount % 2 === 1) return `${faceCount - 2}角柱型${faceCount}面ダイス`;
  return `${faceCount / 2}角双角錐型${faceCount}面ダイス`;
};

const platonicLabelSize = (faceCount: number): number => {
  if (faceCount === 4) return 0.88;
  if (faceCount === 8) return 0.68;
  if (faceCount === 12) return 0.62;
  return 0.44;
};

const facetFrames = (geometry: BufferGeometry, expectedCount: number): FacetFrame[] => {
  const positions = geometry.getAttribute("position");
  const groups = new Map<
    string,
    { centerTotal: Vector3; normal: Vector3; triangleCount: number }
  >();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const edgeA = new Vector3();
  const edgeB = new Vector3();
  const normal = new Vector3();
  const center = new Vector3();

  for (let offset = 0; offset < positions.count; offset += 3) {
    a.fromBufferAttribute(positions, offset);
    b.fromBufferAttribute(positions, offset + 1);
    c.fromBufferAttribute(positions, offset + 2);
    edgeA.subVectors(b, a);
    edgeB.subVectors(c, a);
    normal.crossVectors(edgeA, edgeB).normalize();
    center
      .copy(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    if (center.dot(normal) < 0) normal.negate();
    const key = [normal.x, normal.y, normal.z]
      .map((value) => (Math.abs(value) < 0.000_05 ? 0 : value).toFixed(4))
      .join(":");
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, {
        centerTotal: center.clone(),
        normal: normal.clone(),
        triangleCount: 1,
      });
    } else {
      group.centerTotal.add(center);
      group.triangleCount += 1;
    }
  }

  if (groups.size !== expectedCount) return [];
  return [...groups.values()].map((group) => ({
    center: group.centerTotal.multiplyScalar(1 / group.triangleCount),
    normal: group.normal,
    labelSize: platonicLabelSize(expectedCount),
  }));
};

const createPrism = (faceCount: number): DieGeometry => {
  const sideCount = faceCount - 2;
  const radius = 1.55;
  const geometry = new CylinderGeometry(radius, radius, 2.15, sideCount, 1, false).toNonIndexed();
  geometry.computeVertexNormals();
  const faceWidth = 2 * radius * Math.sin(Math.PI / sideCount);
  const facets = facetFrames(geometry, faceCount).map((facet) => ({
    ...facet,
    labelSize:
      Math.abs(facet.normal.y) > 0.8
        ? Math.min(1.05, radius * 0.72)
        : Math.min(1.1, faceWidth * 0.72),
  }));
  return { kind: "prismatic", geometry, facets };
};

const createLongDie = (): DieGeometry => {
  const radius = 1.6;
  const geometry = new CylinderGeometry(radius, radius, 2.25, 3, 1, false).toNonIndexed();
  geometry.computeVertexNormals();
  const facets = facetFrames(geometry, 5)
    .filter((facet) => Math.abs(facet.normal.y) < 0.8)
    .map((facet) => ({ ...facet, labelSize: 1.05 }));
  return { kind: "long-die", geometry, facets };
};

const createBipyramid = (faceCount: number): DieGeometry => {
  const sideCount = faceCount / 2;
  const radius = 1.55;
  const height = 1.65;
  const vertices: number[] = [];
  const top = new Vector3(0, height, 0);
  const bottom = new Vector3(0, -height, 0);

  const addTriangle = (first: Vector3, second: Vector3, third: Vector3): void => {
    vertices.push(
      first.x,
      first.y,
      first.z,
      second.x,
      second.y,
      second.z,
      third.x,
      third.y,
      third.z,
    );
  };

  for (let index = 0; index < sideCount; index += 1) {
    const angle = (index / sideCount) * Math.PI * 2;
    const nextAngle = ((index + 1) / sideCount) * Math.PI * 2;
    const current = new Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
    const next = new Vector3(radius * Math.cos(nextAngle), 0, radius * Math.sin(nextAngle));
    addTriangle(top, next, current);
    addTriangle(bottom, current, next);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const faceWidth = 2 * radius * Math.sin(Math.PI / sideCount);
  const facets = facetFrames(geometry, faceCount).map((facet) => ({
    ...facet,
    labelSize: Math.min(0.92, faceWidth * 0.62),
  }));
  return { kind: "bipyramid", geometry, facets };
};

export const createDieGeometry = (faceCount: number): DieGeometry => {
  if (faceCount === 6) {
    return {
      kind: "cube",
      geometry: new RoundedBoxGeometry(2.25, 2.25, 2.25, 4, 0.2),
      facets: [],
    };
  }
  const geometry =
    faceCount === 4
      ? new TetrahedronGeometry(1.65)
      : faceCount === 8
        ? new OctahedronGeometry(1.65)
        : faceCount === 12
          ? new DodecahedronGeometry(1.65)
          : faceCount === 20
            ? new IcosahedronGeometry(1.7)
            : null;
  if (geometry !== null) {
    const facets = facetFrames(geometry, faceCount);
    if (facets.length === faceCount) return { kind: "platonic", geometry, facets };
    geometry.dispose();
  }
  if (faceCount === 3) return createLongDie();
  if (faceCount % 2 === 1) return createPrism(faceCount);
  return createBipyramid(faceCount);
};
