import "../dashboard.css";
import "../dashboard-chat.css";

type Props = { onNavigate: (page: "chat-list") => void };

export function TeacherDashboardPreview({ onNavigate }: Props) {
  return <main className="dashboardPage withTopbar"><header className="dashboardHero teacherDashboardHero"><img src="/owner.jpg" alt="こうたろう先生のプロフィール画像"/><div><span>TEACHER DASHBOARD / PREVIEW</span><h1>こうたろう先生</h1><p>講師マイページの管理プレビューです。</p></div></header><section className="accountNotice"><h2>プレビュー表示中</h2><p>この画面は管理用の仮データです。ログインや実データへのアクセスは行いません。</p></section><ChatShortcut onOpen={() => onNavigate("chat-list")} counterpart="生徒"/><section className="accountFeature"><h2>講師プロフィール</h2><p>感覚派向け英検長文読解</p><dl><div><dt>メール認証</dt><dd>確認済み</dd></div><div><dt>電話番号認証</dt><dd>認証待ち</dd></div><div><dt>公開状態</dt><dd>下書き</dd></div></dl></section><section className="accountFeature locked"><h2>講師機能は準備中です</h2><p>SMS認証と運営設定の完了後に、公開プロフィール・予約・実際のチャット機能を利用できるようにします。</p></section></main>;
}

export function StudentDashboardPreview({ onNavigate }: Props) {
  return <main className="dashboardPage withTopbar"><header className="dashboardHero"><div><span>STUDENT DASHBOARD / PREVIEW</span><h1>山田 花さん</h1><p>生徒マイページの管理プレビューです。</p></div></header><section className="accountNotice"><h2>プレビュー表示中</h2><p>この画面は管理用の仮データです。ログインや実データへのアクセスは行いません。</p></section><ChatShortcut onOpen={() => onNavigate("chat-list")} counterpart="先生"/><section className="accountFeature"><h2>無料会員</h2><p>現在のプラン：無料。プロフィール・認証状態・利用条件を確認できます。</p><dl><div><dt>メール認証</dt><dd>確認済み</dd></div><div><dt>電話番号認証</dt><dd>未実装</dd></div><div><dt>有料プラン</dt><dd>未実装</dd></div></dl></section><section className="accountFeature locked"><h2>🔒 現在利用できない機能</h2><p>実際のメッセージ送受信・新しい会話・予約・申込みは、利用条件の実装後に公開します。</p></section></main>;
}

function ChatShortcut({ onOpen, counterpart }: { onOpen: () => void; counterpart: string }) {
  return <section className="accountFeature chatShortcut"><div><span>MESSAGES</span><h2>チャット一覧</h2><p>{counterpart}との会話を一覧で確認できます。</p></div><button onClick={onOpen}>チャット一覧を開く</button></section>;
}
