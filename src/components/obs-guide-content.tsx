import Link from "next/link";

import { OBS_SETUP_STEPS, OBS_SHORTCUTS } from "@/config/obs-guide";

interface ObsSetupStepsProps {
  compact?: boolean;
}

export const ObsSetupSteps = ({ compact = false }: ObsSetupStepsProps) => {
  const steps = compact ? OBS_SETUP_STEPS.slice(0, 4) : OBS_SETUP_STEPS;
  return (
    <ol className={compact ? "obs-setup-steps compact" : "obs-setup-steps"}>
      {steps.map((step, index) => (
        <li key={step.title}>
          <span aria-hidden="true">{index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};

export const ObsShortcutTable = () => (
  <div className="obs-shortcut-table-wrapper">
    <table className="obs-shortcut-table">
      <caption>OBS対話画面での操作</caption>
      <thead>
        <tr>
          <th scope="col">操作</th>
          <th scope="col">キー</th>
          <th scope="col">補足</th>
        </tr>
      </thead>
      <tbody>
        {OBS_SHORTCUTS.map((shortcut) => (
          <tr key={`${shortcut.operation}-${shortcut.key}`}>
            <th scope="row">{shortcut.operation}</th>
            <td>
              <kbd>{shortcut.key}</kbd>
            </td>
            <td>{shortcut.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const ObsQuickGuide = () => (
  <section className="obs-quick-guide" aria-label="OBSで使う手順">
    <p className="eyebrow">OBS Browser Source</p>
    <h3>OBSで使う</h3>
    <ObsSetupSteps compact />
    <p className="field-help">
      OBSの「対話」を開いて操作します。Overlay上に管理ボタンは常時表示されません。
    </p>
    <div className="obs-quick-actions">
      <span>
        <kbd>Space</kbd> 振る
      </span>
      <span>
        <kbd>H</kbd> 履歴
      </span>
      <span>
        <kbd>R</kbd> Reset確認
      </span>
    </div>
    <Link className="button" href="/guide/obs">
      OBSでの使い方を詳しく見る
    </Link>
  </section>
);
