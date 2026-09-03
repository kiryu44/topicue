import type { FaceDeck } from "./schema";

type DieFaceLabelSource = Pick<FaceDeck, "label" | "shortLabel">;

export const dieFaceLabel = (face: DieFaceLabelSource): string => {
  return face.shortLabel ?? face.label;
};
