const safetyText = [
  "IRIS Token Tipは、AIキャラクターへの応援演出を発生させる機能です。",
  "暗号資産の価格上昇、収益、換金、返金を保証するものではありません。",
  "送金は取り消せません。",
  "税務上の取扱いは利用者の居住国や状況により異なります。",
  "未成年の利用はできません。"
];

export { safetyText };

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">IRIS Web Companion</p>
          <h1>YouTube LIVE Crypto Tip</h1>
          <p className="lede">
            YouTube LIVEを見ながら、外部Web CompanionでAIキャラクターへの応援演出を送るMVPです。
            YouTube Super Chatとは別機能として扱います。
          </p>
        </div>
        <div className="status">
          <span>Mock live session</span>
          <strong>char_mio</strong>
        </div>
      </section>

      <section className="grid">
        <Panel title="Live Companion Home">
          <div className="video">YouTube embed placeholder</div>
          <p>配信面はYouTube LIVE、Tip操作はIRIS Web Companionで分離します。</p>
        </Panel>

        <Panel title="Wallet Connect mock">
          <button type="button">Connect mock wallet</button>
          <p>実ウォレット統合用のAPI契約を残し、MVPでは署名フローをmockします。</p>
        </Panel>

        <Panel title="YouTube Verify mock">
          <code>IRIS-7K2Q9M</code>
          <p>将来は公式YouTube Live APIで10分・1回限りの認証コード投稿を検知します。</p>
        </Panel>

        <Panel title="Tip Form">
          <form className="form">
            <label>読み上げ名<input defaultValue="Akira" maxLength={16} /></label>
            <label>メッセージ<textarea defaultValue="今日も応援しています" maxLength={80} /></label>
            <label>Tip額<select defaultValue="medium"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label>
            <button type="button">Create mock Tip Intent</button>
          </form>
        </Panel>

        <Panel title="Tip status">
          <ol>
            <li>TipIntent created</li>
            <li>Mock chain confirmation</li>
            <li>support.received</li>
            <li>overlay.tip_alert</li>
          </ol>
        </Panel>

        <Panel title="Relationship Panel">
          <p>親密度はIRIS内部の演出パラメータです。譲渡、換金、返金の対象ではありません。</p>
          <meter min={0} max={250} value={72} />
        </Panel>
      </section>

      <section className="notice" aria-label="Safety Notice">
        {safetyText.map((line) => <p key={line}>{line}</p>)}
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
