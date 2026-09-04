"use client";

import Link from "next/link";

import { ObsSetupSteps, ObsShortcutTable } from "@/components/obs-guide-content";

interface ObsExportNoticeProps {
  onClose: () => void;
}

export const ObsExportNotice = ({ onClose }: ObsExportNoticeProps) => (
  <section className="obs-export-notice" aria-labelledby="obs-export-notice-title">
    <header>
      <div>
        <p className="eyebrow">Download complete</p>
        <h2 id="obs-export-notice-title">OBS用HTMLを作成しました</h2>
      </div>
      <button type="button" aria-label="OBS用HTML作成後の案内を閉じる" onClick={onClose}>
        閉じる
      </button>
    </header>
    <p role="status">
      <code>prompt-dice-obs.html</code>を保存しました。次の手順でOBSへ追加してください。
    </p>
    <ObsSetupSteps />
    <ObsShortcutTable />
    <Link className="button" href="/guide/obs">
      OBSでの使い方を詳しく見る
    </Link>
  </section>
);
