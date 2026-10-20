import { ArrowRight, ArrowUpRight, BadgeCheck, BookOpenText, CalendarCheck, Check, GraduationCap, Mic, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import "../home-editorial.css";

type Destination = "search" | "teacher-auth" | "family-auth" | "pricing" | "student-guide" | "teacher-guide" | "ranks" | "articles";
type Props = { onNavigate: (page: Destination) => void };

// トップページ案B「学びのジャーナル」：紙の質感、大きな和文見出しと欧文イタリック、アーチ型の写真、イラストのコラージュ。
// 未提供のAI機能は必ず「準備中」と表示し、数字は確認できる事実だけを使う。
const flow = [
  { no: "01", title: "学び方を伝える", text: "科目や学年だけでなく、どこで手が止まるのか、どう理解したいのか。その違いから先生を探せます。" },
  { no: "02", title: "教え方で選ぶ", text: "講師は得意な指導と、対応しない内容まで公開。資格や学歴は運営が確認したうえで表示します。" },
  { no: "03", title: "授業を記録に残す", text: "予約から授業後のふりかえりまでサイトの中で完結。積み重ねた授業は、講師の信頼の記録になります。" },
];

// 各段階の画面見本（実際に提供している機能だけを描く）
function FlowScreen({ step }: { step: number }) {
  if (step === 0) return <div className="heScreen"><p className="heScreenTitle">あなたについて</p><div className="heChips"><span className="on">高校2年</span><span className="on">英語</span><span>数学</span><span className="on">英検準1級</span></div><p className="heScreenField">長文は読めるけど、選択肢で迷ってしまう。</p></div>;
  if (step === 1) return <div className="heScreen"><div className="heScreenHead"><img src="/demo-teacher-avatar.svg" alt="" /><div><b>英検長文読解の先生</b><span>英語　英検2級〜1級</span></div><img className="heScreenRank" src="/rank-sr.png" alt="" /></div><dl className="heScreenRows"><div><dt>得意な指導</dt><dd>本文を正確に捉える精読</dd></div><div><dt>対応しない内容</dt><dd>文法用語の暗記中心の指導</dd></div></dl></div>;
  return <div className="heScreen"><div className="heScreenHead"><CalendarCheck className="heScreenIcon" /><div><b>授業後レポート</b><span>英語　60分</span></div><em>提出済み</em></div><ul className="heScreenList"><li><Check />授業は予定どおり実施</li><li><Check />プロフィールどおりの指導内容</li></ul></div>;
}

const columns = [
  { title: "私が「感覚の英語」を身につけた方法", tag: "英語学習", lead: "英語を「勉強」としてだけでなく、日常の楽しみとして続けてきた経験について。" },
  { title: "「感覚の英語」の限界と、私がぶつかった壁", tag: "英語学習", lead: "読める・聞けるのに、正確に書けない。感覚的な英語力の限界に向き合った経験について。" },
  { title: "なぜ中学生で英検準1級に合格できたのか", tag: "英検", lead: "長文全訳を続けたことで、文法・語彙・構文理解をつなげた経験について。" },
  { title: "私なりの英検攻略法", tag: "英検", lead: "単語だけに偏らず、長文・ライティング・リスニングまで英検に向き合う考え方。" },
];

export function HomeEditorial({ onNavigate }: Props) {
  return <main className="he withTopbar">
    <section className="heHero" aria-labelledby="he-title">
      <div className="heHeroCopy">
        <p className="heKicker"><span />得意で選ぶ家庭教師マッチング</p>
        <h1 id="he-title">“わかる”に、<br /><em>まっすぐ</em>届く。</h1>
        <p className="heLatin">Find a tutor by strengths, not by titles.</p>
        <p className="heLead">大学名や肩書きではなく、教え方で選ぶ家庭教師。あなたの得意と学び方から、ぴったりの先生が見つかります。</p>
        <div className="heActions">
          <button className="heBtn" onClick={() => onNavigate("search")}>家庭教師を探す<ArrowRight aria-hidden="true" /></button>
          <button className="heLink" onClick={() => onNavigate("teacher-auth")}>講師として参加する<ArrowUpRight aria-hidden="true" /></button>
        </div>
        <ul className="heFacts">
          <li><b>0円</b><span>授業料からの手数料</span></li>
          <li><b>確認済み</b><span>資格・学歴は運営が審査</span></li>
          <li><b>無料期間中</b><span>年額登録なしで利用可</span></li>
        </ul>
      </div>

      <div className="heCollage" aria-hidden="true">
        <figure className="heArch"><img src="/home/hero-student.webp" alt="" /></figure>
        <div className="heNote heNoteMatch">
          <p className="heTiny">MATCHED BY STRENGTH</p>
          <div className="heMatch"><img src="/demo-teacher-avatar.svg" alt="" /><div><b>英検長文読解の先生</b><span>精読で誤読を直す</span></div><BadgeCheck /></div>
          <p className="heTag"><Check />得意が一致しています</p>
        </div>
        <div className="heNote heNoteAi"><Sparkles /><div><b>AI学習ノート</b><span>授業の気づきを要約</span></div><em>準備中</em></div>
        <svg className="heScribble" viewBox="0 0 120 120"><path d="M14 70 C 30 20, 90 18, 104 58 S 60 112, 40 84" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M36 80 l6 10 l9 -6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </section>

    <section className="heSection" aria-labelledby="he-flow-title">
      <header className="heHead">
        <p className="heIndex">No. 1 — How it works</p>
        <h2 id="he-flow-title">選ぶ、から。<em>出会う</em>、へ。</h2>
      </header>
      <ol className="heFlow">
        {flow.map((item, index) => <li key={item.no}>
          <figure><FlowScreen step={index} /><span className="heStepNo">{item.no}</span></figure>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>)}
      </ol>
    </section>

    <section className="heSection heTrust" aria-labelledby="he-trust-title">
      <div className="heTrustCopy">
        <p className="heIndex">No. 2 — Trust</p>
        <h2 id="he-trust-title">信頼は、<br /><em>記録</em>でつくる。</h2>
        <p>宣伝の言葉ではなく、確認できる事実を積み重ねます。AIは提案するだけ。決めるのは、いつも人です。</p>
        <button className="heLink" onClick={() => onNavigate("ranks")}>ランク制度を見る<ArrowUpRight aria-hidden="true" /></button>
      </div>
      <dl className="heLedger">
        <div><dt>授業料からの手数料</dt><dd><b>0</b>円</dd><p>紹介料・成約手数料・授業ごとの徴収なし</p></div>
        <div><dt>資格・学歴</dt><dd><ShieldCheck />運営が確認</dd><p>2段階認証を設定した運営担当だけが書類を確認</p></div>
        <div><dt>ランク</dt><dd className="heRanks"><img src="/rank-r.png" alt="Rランク" /><img src="/rank-sr.png" alt="SRランク" /><img src="/rank-ssr.png" alt="SSRランク" /></dd><p>確認済みの授業・評価・継続から付与</p></div>
        <div><dt>授業後</dt><dd><Check />双方がふりかえり</dd><p>生徒と講師の両方がレポートを残す</p></div>
      </dl>
    </section>

    <section className="heSection" aria-labelledby="he-col-title">
      <header className="heHead row">
        <div><p className="heIndex">No. 3 — Journal</p><h2 id="he-col-title">先生の言葉で、<em>学び方</em>を知る。</h2></div>
        <button className="heLink" onClick={() => onNavigate("articles")}>コラムをすべて読む<ArrowUpRight aria-hidden="true" /></button>
      </header>
      <div className="heJournal">
        {columns.map(item => <button key={item.title} className="heEntry" onClick={() => onNavigate("articles")}>
          <span className="heEntryQuote" aria-hidden="true">“</span>
          <span className="heEntryTag">{item.tag}</span>
          <b>{item.title}</b>
          <p className="heEntryLead">{item.lead}</p>
          <span className="heEntryAuthor"><img src="/owner.jpg" alt="" />こうたろう先生</span>
        </button>)}
      </div>
    </section>

    <section className="heSection heTools" aria-labelledby="he-tools-title">
      <img className="heCat" src="/home/cat-workshop.webp" alt="工具箱と本のそばで準備を見守る猫のイラスト" loading="lazy" />
      <div>
        <p className="heIndex">No. 4 — Coming next</p>
        <h2 id="he-tools-title">ひとつのアカウントで、<br /><em>学び</em>がつながる。</h2>
        <ul>
          <li><GraduationCap /><b>大学・学部・学科検索</b><em>開発中</em></li>
          <li><BookOpenText /><b>AI単語帳</b><em>準備中</em></li>
          <li><PenLine /><b>AI文章添削</b><em>準備中</em></li>
          <li><Mic /><b>AI面接</b><em>準備中</em></li>
        </ul>
        <p className="heSmall">AIによる評価・提案は参考情報です。合否や成績の向上を保証するものではありません。</p>
      </div>
    </section>

    <section className="heFinal" aria-labelledby="he-final-title">
      <h2 id="he-final-title">次の“わかる”を、<br /><em>ここから</em>。</h2>
      <div className="heActions center">
        <button className="heBtn" onClick={() => onNavigate("search")}>家庭教師を探す<ArrowRight aria-hidden="true" /></button>
        <button className="heLink" onClick={() => onNavigate("pricing")}>料金プラン（無料期間中）<ArrowUpRight aria-hidden="true" /></button>
      </div>
    </section>
  </main>;
}
