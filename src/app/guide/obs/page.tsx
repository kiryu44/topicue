import Link from "next/link";

import { BrandLockup } from "@/components/brand-lockup";
import { ObsSetupSteps, ObsShortcutTable } from "@/components/obs-guide-content";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OBSでの使い方",
  description: "Topicueで作ったトークダイスをOBS Browser Sourceへ追加して操作する手順です。",
};

const ObsGuidePage = () => (
  <main className="shell obs-guide-page">
    <header className="site-header">
      <BrandLockup />
      <Link className="button header-action" href="/create">
        ダイスを作る
      </Link>
    </header>

    <section className="obs-guide-hero">
      <p className="eyebrow">OBS setup guide</p>
      <h1>TopicueをOBSで使う</h1>
      <p>
        HTMLを生成してOBSへ追加する「導入」と、配信中にダイスを振る「操作」を順番に説明します。
        ログイン、サーバー接続、データベース設定は不要です。
      </p>
    </section>

    <section className="panel obs-guide-section" aria-labelledby="obs-install-heading">
      <div className="editor-section-heading">
        <p className="eyebrow">Install</p>
        <h2 id="obs-install-heading">OBSへ追加する</h2>
        <p>StudioでHTMLを生成してから、OBSのBrowser Sourceへローカルファイルとして登録します。</p>
      </div>
      <ObsSetupSteps />
    </section>

    <section className="obs-guide-visuals" aria-label="OBS設定の画面図">
      <article className="panel">
        <h2>1. Topicue Studio</h2>
        <div
          className="obs-guide-diagram"
          role="img"
          aria-label="StudioのOBS用HTMLを作るボタンの画面図"
        >
          <span>Studio</span>
          <strong>OBS用HTMLを作る</strong>
          <small>prompt-dice-obs.html</small>
        </div>
        <p>編集後、上部または出力欄の「OBS用HTML」を押してファイルを保存します。</p>
      </article>
      <article className="panel">
        <h2>2. OBS Browser Source</h2>
        <div className="obs-guide-diagram" role="img" aria-label="OBSブラウザソース設定の画面図">
          <span>ブラウザ</span>
          <strong>ローカルファイル：ON</strong>
          <small>1920 × 1080</small>
        </div>
        <p>ブラウザソースのプロパティでHTMLファイルと表示サイズを指定します。</p>
      </article>
      <article className="panel">
        <h2>3. OBSの「対話」</h2>
        <div className="obs-guide-diagram" role="img" aria-label="OBSソースの対話を開く画面図">
          <span>ソースを右クリック</span>
          <strong>対話</strong>
          <small>クリック・キーボード操作</small>
        </div>
        <p>配信画面を直接選択せず、ソースの右クリックメニューから「対話」を開いて操作します。</p>
      </article>
    </section>

    <section className="panel obs-guide-section" aria-labelledby="obs-controls-heading">
      <div className="editor-section-heading">
        <p className="eyebrow">Controls</p>
        <h2 id="obs-controls-heading">配信中に操作する</h2>
        <p>
          Space・Enterとクリックは、Studioの「OBSでの操作と結果表示」で許可した場合だけ抽選します。
          履歴管理UIは通常のOverlayには表示されません。
        </p>
      </div>
      <ObsShortcutTable />
      <div className="notice obs-guide-warning">
        <strong>履歴Resetは即時実行されません。</strong>
        <p>
          <kbd>R</kbd>
          を押すと確認Dialogが開きます。「リセット」を選ぶかEnterで確定し、Escで取り消せます。
        </p>
      </div>
    </section>

    <div className="actions obs-guide-footer-actions">
      <Link className="button primary" href="/create">
        トークダイスを作る
      </Link>
      <Link className="button" href="/">
        トップへ戻る
      </Link>
    </div>
  </main>
);

export default ObsGuidePage;
