import { brand } from "@/config/brand";
import { defaultAppearance } from "@/modules/prompt-pack/domain/defaults";

import { DicePresentation } from "./dice-presentation";

const HERO_DIE_LABELS = [...brand.heroDieLabels];
const HERO_DIE_FACE_IDS = HERO_DIE_LABELS.map((label, index) =>
  encodeURIComponent(`hero-face-${index + 1}-${label}`),
);

export const HeroDie = () => (
  <div className="hero-die-scene">
    <div className="hero-die-shadow" />
    <div className="hero-die-viewport">
      <DicePresentation
        labels={HERO_DIE_LABELS}
        faceIds={HERO_DIE_FACE_IDS}
        appearance={defaultAppearance}
        durationMs={1_800}
        motionIntensity="medium"
        reducedMotionBehavior="respect_system"
        targetFps={60}
        idleSpin
      />
    </div>
  </div>
);
