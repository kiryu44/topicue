import Link from "next/link";

import { BrandLockup } from "@/components/brand-lockup";
import { brand } from "@/config/brand";
import { HeroDie } from "@/modules/renderer/ui/hero-die";

const HomePage = () => {
  return (
    <main className="shell">
      <header className="site-header">
        <BrandLockup />
        <Link className="button header-action" href="/create">
          作成を始める
        </Link>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">Topicue Talk Dice</p>
          <h1 aria-label={brand.headline}>
            {brand.headlineLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p>
            {brand.description}{" "}
            ブラウザで作り、単一HTMLをOBSに読み込むだけ。ログインやDBは不要です。
          </p>
          <div className="actions">
            <Link className="button primary" href="/create">
              トークダイスを作る
            </Link>
            <Link className="button" href="/sample">
              サンプルを振ってみる
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <HeroDie />
        </div>
      </section>
      <section className="feature-grid" aria-label="主な機能">
        <article className="panel">
          <p className="eyebrow">Deck Dice</p>
          <h2>お題はたっぷり</h2>
          <p className="muted">
            1面に最大100件。カテゴリー演出とお題抽選を分け、重複防止や全件一巡にも対応します。
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">Private</p>
          <h2>配信者メモは映さない</h2>
          <p className="muted">
            OBS用HTMLには公開タイトルと本文だけを含め、配信者メモは除外します。
          </p>
        </article>
        <article className="panel">
          <p className="eyebrow">Offline</p>
          <h2>HTMLひとつでOBSへ</h2>
          <p className="muted">
            設定と3Dランタイムを1つのHTMLに内蔵。通信障害の影響を受けず、WebGL不可時は2D表示へ降級します。
          </p>
        </article>
      </section>
    </main>
  );
};

export default HomePage;
