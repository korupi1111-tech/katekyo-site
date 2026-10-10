import { ChevronLeft, MessageCircle, Plus, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentAccount, type AccountAccess } from "../lib/account";
import { getChatMessages, getMyChatConversations, getPublicTeacherContacts, sendChatMessage, startChatWithTeacher, subscribeToChatMessages, type ChatConversation, type ChatMessage, type PublicTeacherContact } from "../lib/siteChat";
import "../chat-list.css";
import "../chat-message.css";
import "../chat-refresh.css";

const avatarColors = ["#2d7c71", "#96783f", "#496f9d", "#80647f"];
const formatMessageTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};
const formatMessageDate = (value: string) => new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
const counterpart = (conversation: ChatConversation, account: AccountAccess) => account.role === "teacher" ? conversation.student_display_name : conversation.teacher_display_name;

export function ChatListPage({ onBack }: { onBack: () => void }) {
  const [account, setAccount] = useState<AccountAccess | null | undefined>(undefined);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teachers, setTeachers] = useState<PublicTeacherContact[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    const data = await getMyChatConversations();
    setConversations(data);
    setSelectedId(current => current && data.some(conversation => conversation.id === current) ? current : data[0]?.id ?? null);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const data = await getChatMessages(conversationId);
    setMessages(data);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const current = await getCurrentAccount();
        if (!active) return;
        setAccount(current);
        if (!current) return;
        await loadConversations();
        if (current.role === "student") setTeachers(await getPublicTeacherContacts());
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : "チャットを読み込めませんでした。");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    void loadMessages(selectedId).catch(() => setStatus("メッセージを読み込めませんでした。"));
    const channel = subscribeToChatMessages(selectedId, () => {
      void loadMessages(selectedId);
      void loadConversations();
    });
    return () => { if (channel) void channel.unsubscribe(); };
  }, [selectedId, loadConversations, loadMessages]);

  const selected = useMemo(() => conversations.find(conversation => conversation.id === selectedId) ?? null, [conversations, selectedId]);
  const startConversation = async (teacherProfileId: string) => {
    setSending(true); setStatus("");
    try {
      const conversationId = await startChatWithTeacher(teacherProfileId);
      await loadConversations();
      setSelectedId(conversationId);
      setComposerOpen(false);
      setStatus("会話を開始しました。メッセージを送れます。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "会話を開始できませんでした。");
    } finally { setSending(false); }
  };
  const send = async () => {
    if (!selected) return;
    setSending(true); setStatus("");
    try {
      const message = await sendChatMessage(selected.id, draft);
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
      setDraft("");
      await loadConversations();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "メッセージを送信できませんでした。");
    } finally { setSending(false); }
  };

  const refresh = async () => {
    setStatus("");
    try {
      await loadConversations();
      if (selectedId) await loadMessages(selectedId);
      setStatus("最新のメッセージを読み込みました。");
    } catch {
      setStatus("最新のメッセージを読み込めませんでした。時間をおいて再度お試しください。");
    }
  };

  if (loading || account === undefined) return <main className="chatListPage withTopbar"><p className="chatState">チャットを読み込んでいます…</p></main>;
  if (!account) return <main className="chatListPage withTopbar"><section className="chatAccess"><h1>チャットを利用するにはログインしてください</h1><p>会話内容は講師・生徒の参加者だけに保存・表示されます。</p><button type="button" onClick={onBack}>戻る</button></section></main>;

  return <main className="chatListPage withTopbar">
    <header className="chatListHero">
      <button type="button" className="chatBack" onClick={onBack}><ChevronLeft /> マイページへ戻る</button>
      <span>MESSAGES</span>
      <h1>チャット一覧</h1>
      <p>先生・生徒とのやり取りを、ひとつの場所で確認できます。</p>
    </header>
    <section className="chatWorkspace" aria-label="チャット">
      <div className="chatSidebar">
        <div className="chatSidebarHead"><h2>トーク</h2><span className="chatSidebarActions"><button type="button" className="chatRefresh" aria-label="最新のメッセージを再読み込み" title="最新のメッセージを再読み込み" onClick={() => void refresh()}><RefreshCw size={16} /></button>{account.role === "student" && <button type="button" aria-label="新しい会話を始める" onClick={() => setComposerOpen(true)}><Plus /></button>}</span></div>
        <div className="chatRows">
          {conversations.map((conversation, index) => <button type="button" className={selected?.id === conversation.id ? "active" : ""} key={conversation.id} onClick={() => { setSelectedId(conversation.id); setComposerOpen(false); }}>
            <span className="chatAvatar" style={{ background: avatarColors[index % avatarColors.length] }}>{counterpart(conversation, account).slice(0, 1)}</span>
            <span className="chatRowBody"><b>{counterpart(conversation, account)}</b><small>{conversation.teacher_subject ?? "個別相談"}</small><em>{conversation.last_message_text ?? "まだメッセージはありません"}</em></span>
            <span className="chatRowMeta"><time>{formatMessageTime(conversation.last_message_at || conversation.created_at)}</time></span>
          </button>)}
          {!conversations.length && <p className="chatEmpty">{account.role === "student" ? "先生を選んで会話を始められます。" : "生徒との会話が始まると、ここに表示されます。"}</p>}
        </div>
      </div>
      {composerOpen && account.role === "student" ? <article className="chatPreview chatStarter"><header><div><h2>先生を選んで会話を始める</h2><p>選んだ先生とあなたのみが会話内容を確認できます。</p></div></header><div className="chatTeacherChoices">{teachers.map(teacher => <button type="button" key={teacher.id} disabled={sending} onClick={() => void startConversation(teacher.id)}><span className="chatAvatar">{teacher.display_name.slice(0, 1)}</span><span><b>{teacher.display_name}</b><small>{teacher.main_subject ?? "個別相談"}</small><em>{teacher.catchphrase}</em></span><Plus /></button>)}{!teachers.length && <p className="chatEmpty">公開中でチャットを開始できる講師は、まだいません。</p>}</div></article> : selected ? <article className="chatPreview"><header><span className="chatAvatar" style={{ background: avatarColors[conversations.indexOf(selected) % avatarColors.length] }}>{counterpart(selected, account).slice(0, 1)}</span><div><h2>{counterpart(selected, account)}</h2><p>{selected.teacher_subject ?? "個別相談"}</p></div></header><div className="chatPreviewBody">{messages.map((message, index) => <div key={message.id}>{(index === 0 || formatMessageDate(messages[index - 1].created_at) !== formatMessageDate(message.created_at)) && <p className="chatDate">{formatMessageDate(message.created_at)}</p>}<div className={`chatBubble ${message.sender_user_id === account.id ? "mine" : "other"}`}>{message.body}</div></div>)}{!messages.length && <p className="chatEmpty">最初のメッセージを送って、会話を始めましょう。</p>}</div><footer><textarea maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="メッセージを入力" aria-label="メッセージ" /><button type="button" onClick={() => void send()} disabled={sending || !draft.trim()}><Send />送信</button></footer></article> : <article className="chatPreview chatPlaceholder"><MessageCircle /><h2>会話を選択してください</h2><p>{account.role === "student" ? "「＋」から先生を選ぶと、新しい会話を開始できます。" : "生徒からの会話が届くと、ここで返信できます。"}</p></article>}
    </section>
    {status && <p className="chatStatus" role="status">{status}</p>}
    <aside className="chatPreviewNote"><MessageCircle /><p><b>会話とメッセージはデータベースに保存されます。</b>講師と生徒の参加者以外は、会話内容を閲覧・送信できません。</p></aside>
  </main>;
}
