import { ChevronLeft, LockKeyhole, MessageCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import "../chat-list.css";

type Chat = {
  id: number;
  name: string;
  subject: string;
  message: string;
  time: string;
  unread?: number;
  color: string;
};

const sampleChats: Chat[] = [
  { id: 1, name: "佐藤 陽菜 先生", subject: "高校数学", message: "次回の授業で扱いたい問題を送ります。", time: "10:42", unread: 2, color: "#2d7c71" },
  { id: 2, name: "山本 蒼 先生", subject: "大学受験日本史", message: "学習計画を確認しました。", time: "昨日", color: "#96783f" },
  { id: 3, name: "鈴木 直人 先生", subject: "中学受験算数", message: "資料を共有しました。", time: "月", color: "#496f9d" },
  { id: 4, name: "学習サポート", subject: "お知らせ", message: "利用ガイドを更新しました。", time: "10/03", color: "#6f7982" },
];

export function ChatListPage({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = useState(sampleChats[0].id);
  const selected = useMemo(() => sampleChats.find(chat => chat.id === selectedId) ?? sampleChats[0], [selectedId]);

  return <main className="chatListPage withTopbar">
    <header className="chatListHero">
      <button type="button" className="chatBack" onClick={onBack}><ChevronLeft /> マイページへ戻る</button>
      <span>MESSAGES</span>
      <h1>チャット一覧</h1>
      <p>先生・生徒とのやり取りを、ひとつの場所で確認できます。</p>
    </header>
    <section className="chatWorkspace" aria-label="チャット一覧のプレビュー">
      <div className="chatSidebar">
        <div className="chatSidebarHead"><h2>トーク</h2><button type="button" aria-label="会話を検索"><Search /></button></div>
        <div className="chatRows">
          {sampleChats.map(chat => <button type="button" className={selected.id === chat.id ? "active" : ""} key={chat.id} onClick={() => setSelectedId(chat.id)}>
            <span className="chatAvatar" style={{ background: chat.color }}>{chat.name.slice(0, 1)}</span>
            <span className="chatRowBody"><b>{chat.name}</b><small>{chat.subject}</small><em>{chat.message}</em></span>
            <span className="chatRowMeta"><time>{chat.time}</time>{chat.unread && <i>{chat.unread}</i>}</span>
          </button>)}
        </div>
      </div>
      <article className="chatPreview">
        <header><span className="chatAvatar" style={{ background: selected.color }}>{selected.name.slice(0, 1)}</span><div><h2>{selected.name}</h2><p>{selected.subject}</p></div></header>
        <div className="chatPreviewBody"><p className="chatDate">2026年10月10日</p><div className="chatBubble other">{selected.message}</div><div className="chatBubble mine">確認しました。ありがとうございます。</div></div>
        <footer><div><LockKeyhole /><span>メッセージ機能は準備中です</span></div><button type="button" disabled>送信</button></footer>
      </article>
    </section>
    <aside className="chatPreviewNote"><MessageCircle /><p><b>現在はチャット画面のUIプレビューです。</b>会話の作成・送受信・保存はまだ開始していません。</p></aside>
  </main>;
}
