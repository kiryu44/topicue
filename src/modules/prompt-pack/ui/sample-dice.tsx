"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { BrandLockup } from "@/components/brand-lockup";
import { DicePresentation } from "@/modules/renderer/ui/dice-presentation";
import { selectPrompt } from "@/modules/selection/engine";
import { BrowserCryptoRandomSource, randomHexSeed } from "@/modules/selection/random";
import { initialSelectionState, type SessionSelectionState } from "@/modules/selection/types";

import { dieFaceLabel } from "../domain/die-label";
import { themeCssVariables } from "../domain/theme";

import type { PromptPackConfigV1 } from "../domain/schema";

interface SampleRoll {
  faceId: string;
  promptId: string;
  motionSeed: string;
}

export const SampleDice = ({ config }: { config: PromptPackConfigV1 }) => {
  const [roll, setRoll] = useState<SampleRoll | null>(null);
  const [settled, setSettled] = useState(false);
  const [rolling, setRolling] = useState(true);
  const [error, setError] = useState("");
  const selectionState = useRef<SessionSelectionState>(initialSelectionState());
  const revealTimer = useRef<number | null>(null);
  const labels = useMemo(() => config.faces.map((face) => dieFaceLabel(face)), [config.faces]);
  const faceIds = useMemo(() => config.faces.map((face) => face.id), [config.faces]);
  const selectedFace = useMemo(
    () => config.faces.find((face) => face.id === roll?.faceId),
    [config.faces, roll?.faceId],
  );
  const selectedPrompt = useMemo(
    () => selectedFace?.prompts.find((prompt) => prompt.id === roll?.promptId),
    [roll?.promptId, selectedFace],
  );

  const rollDice = useCallback(() => {
    try {
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
      setError("");
      setSettled(false);
      setRolling(true);
      const random = new BrowserCryptoRandomSource();
      const selected = selectPrompt({
        config,
        state: selectionState.current,
        random,
      });
      selectionState.current = selected.nextState;
      setRoll({
        faceId: selected.faceId,
        promptId: selected.promptId,
        motionSeed: randomHexSeed(random),
      });
    } catch (caught) {
      setRolling(false);
      setError(caught instanceof Error ? caught.message : "サンプルを振れませんでした。");
    }
  }, [config]);

  const settleDice = useCallback(() => {
    if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => {
      setSettled(true);
      setRolling(false);
      revealTimer.current = null;
    }, config.animation.revealDelayMs);
  }, [config.animation.revealDelayMs]);

  useEffect(() => {
    const autoRollTimer = window.setTimeout(rollDice, 50);
    return () => window.clearTimeout(autoRollTimer);
  }, [rollDice]);

  useEffect(() => {
    if (roll === null) return;
    const completionTimer = window.setTimeout(
      () => {
        setSettled(true);
        setRolling(false);
      },
      config.animation.durationMs + config.animation.revealDelayMs + 1_000,
    );
    return () => window.clearTimeout(completionTimer);
  }, [config.animation.durationMs, config.animation.revealDelayMs, roll]);

  useEffect(
    () => () => {
      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
    },
    [],
  );

  return (
    <main className="shell sample-page">
      <header className="site-header">
        <BrandLockup />
        <Link className="button" href="/create">
          自分のダイスを作る
        </Link>
      </header>
      <section className="sample-layout">
        <div className="sample-copy">
          <p className="eyebrow">Try the dice</p>
          <h1>深夜雑談ダイスを振ってみる</h1>
          <p className="muted">
            6つのカテゴリーから話題を抽選します。ログインやデータ保存は必要ありません。
          </p>
          <div className="actions">
            <button className="primary" disabled={rolling} onClick={rollDice}>
              {rolling ? "振っています…" : roll === null ? "ダイスを振る" : "もう一度振る"}
            </button>
            <Link className="button" href="/create?template=late-night-ja">
              このテンプレートから作る
            </Link>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <section
          className="panel sample-dice-panel"
          aria-label="サンプルダイス"
          style={themeCssVariables(config.appearance) as CSSProperties}
        >
          <div className="preview-stage preview-background-dark sample-preview" aria-busy={rolling}>
            <div
              className="preview-overlay"
              data-visual-state={rolling ? "rolling" : settled ? "result" : "idle"}
            >
              <DicePresentation
                labels={labels}
                faceIds={faceIds}
                appearance={config.appearance}
                targetFaceId={roll?.faceId}
                motionSeed={roll?.motionSeed}
                durationMs={config.animation.durationMs}
                motionIntensity={config.animation.motionIntensity}
                reducedMotionBehavior={config.animation.reducedMotionBehavior}
                targetFps={config.behavior.targetFps}
                onSettled={settleDice}
              />
              <span className="die-label" aria-live="polite">
                {rolling ? "抽選中…" : (selectedFace?.label ?? "振れます")}
              </span>
              {settled && selectedPrompt !== undefined && (
                <article
                  className="result-card"
                  data-position={config.appearance.resultCardPosition}
                  aria-live="polite"
                >
                  {config.behavior.showCategoryBeforePrompt && (
                    <small className="category-pill">{selectedFace?.label}</small>
                  )}
                  <h2>{selectedPrompt.audienceTitle}</h2>
                  <p>{selectedPrompt.audienceBody}</p>
                </article>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
};
