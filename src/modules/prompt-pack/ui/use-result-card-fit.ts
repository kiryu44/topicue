import { useLayoutEffect, useRef } from "react";

const RESULT_CARD_STAGE_RATIO = 0.9;

interface ResultCardFitOptions {
  active: boolean;
  contentKey: string;
  selectedScale: number;
}

export const useResultCardFit = ({ active, contentKey, selectedScale }: ResultCardFitOptions) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!active || stage === null || card === null) return;

    const fitCard = (): void => {
      const availableHeight = stage.clientHeight * RESULT_CARD_STAGE_RATIO;
      const contentHeight = card.offsetHeight;
      if (availableHeight <= 0 || contentHeight <= 0) return;
      const fittedScale = Math.min(selectedScale, availableHeight / contentHeight);
      card.style.setProperty("--result-scale", fittedScale.toFixed(4));
    };

    const initialFrame = requestAnimationFrame(fitCard);
    const observer = new ResizeObserver(fitCard);
    observer.observe(stage);
    observer.observe(card);

    return () => {
      cancelAnimationFrame(initialFrame);
      observer.disconnect();
    };
  }, [active, contentKey, selectedScale]);

  return { cardRef, stageRef };
};
