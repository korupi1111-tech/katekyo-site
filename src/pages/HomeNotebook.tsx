import { useState } from "react";
import { BookOpenText, GraduationCap, Mic, PenLine, ShieldCheck } from "lucide-react";
import "../home-notebook.css";

type Destination = "search" | "teacher-auth" | "family-auth" | "pricing" | "student-guide" | "teacher-guide" | "ranks" | "articles";
type Props = { onNavigate: (page: Destination) => void };

// トップページ：ノートの1ページとして組む。赤ペン＝先生の指導・理由、蛍光ペン＝講師の得意。
// 設計の根拠は docs/drafts/home-design-notes.md。試せる見本の講師は架空の例で、実在の講師ではない。
const struggles = [
  { label: "英語の長文で、選択肢に迷う", subject: "英語（英検2級〜1級）", strength: "本文の根拠を一文ずつ確かめる精読", not: "文法用語の暗記を中心にした指導", note: "迷うのは、根拠を探す前に選択肢を読むから。精読から一緒に直します" },
  { label: "数学の初見問題で、手が止まる", subject: "高校数学（数IA〜III）", strength: "最初の一手を言葉にする方針づくり", not: "解法パターンの丸暗記", note: "解説は分かるのに止まるなら、方針の立て方を練習します" },
  { label: "日本史の用語が、つながらない", subject: "大学受験日本史", strength: "出来事を原因と結果で説明する練習", not: "一問一答だけの反復", note: "暗記より先に、つながりを説明できるようにします" },
  { label: "算数の文章題を、式にできない", subject: "中学受験算数", strength: "問題の条件を図に置き換える読み方", not: "計算スピードだけの訓練", note: "式の前に図。何を求めるかを一緒に整理します" },
];

const steps = [
  { title: "つまずき方を伝える", text: "科目や学年だけでなく、どこで手が止まるのか、どう理解したいのかを伝えます。", art: "/home/desk-morning.webp" },
  { title: "教え方で先生を選ぶ", text: "講師の得意な指導と、対応しない内容を見比べて選びます。資格と学歴は運営が確認しています。", art: "/home/desk-reading.webp" },
  { title: "授業を記録に残す", text: "予約から授業後のふりかえりまでサイトの中で完結します。授業の記録は講師の実績になります。", art: "/home/desk-evening.webp" },
];

const columns = [
  { title: "私が「感覚の英語」を身につけた方法", art: "/home/desk-evening.webp" },
  { title: "「感覚の英語」の限界と、私がぶつかった壁", art: "/home/desk-structure.webp" },
  { title: "なぜ中学生で英検準1級に合格できたのか", art: "/home/desk-reading.webp" },
  { title: "私なりの英検攻略法", art: "/home/desk-morning.webp" },
];

export function HomeNotebook({ onNavigate }: Props) {
  const [picked, setPicked] = useState(0);
  const match = struggles[picked];

  return <main className="nb withTopbar">
    <section className="nbHero" aria-labelledby="nb-title">
      <div className="nbHeroCopy">
        <h1 id="nb-title">教え方で選ぶ、<br />家庭教師。</h1>
        <p className="nbLead">大学名や肩書きではなく、先生の得意な教え方と、あなたのつまずき方から家庭教師を探せます。</p>
        <div className="nbActions">
          <button className="nbButton" onClick={() => onNavigate("search")}>家庭教師を探す</button>
          <button className="nbTextLink" onClick={() => onNavigate("teacher-auth")}>講師として登録する</button>
        </div>
        <p className="nbFacts">授業料からの手数料は0円。資格と学歴は運営が確認しています。現在は無料期間中で、年額登録なしで使えます。</p>
      </div>

      <div className="nbStage">
        <img className="nbPhoto" src="/home/hero-student.webp" alt="窓辺の机で考えごとをする生徒" />
        <div className="nbPage" aria-labelledby="nb-demo-title">
          <p id="nb-demo-title" className="nbPageTitle">どこでつまずいていますか？</p>
          <div className="nbChoices" role="radiogroup" aria-label="つまずき方を選ぶ">
            {struggles.map((item, index) => <button key={item.label} role="radio" aria-checked={picked === index} className={picked === index ? "on" : ""} onClick={() => setPicked(index)}>{item.label}</button>)}
          </div>
          <div className="nbMatch" key={picked} aria-live="polite">
            <p className="nbMatchSubject">{match.subject}の先生（見本）</p>
            <p className="nbMatchRow"><span className="nbMatchLabel">得意な教え方</span><mark>{match.strength}</mark></p>
            <p className="nbMatchRow"><span className="nbMatchLabel">対応しない内容</span><span>{match.not}</span></p>
            <p className="nbRedpen">{match.note}</p>
          </div>
        </div>
      </div>
    </section>

    <section className="nbSection" aria-labelledby="nb-steps-title">
      <h2 id="nb-steps-title">先生探しは、3つの段階で進みます。</h2>
      <ol className="nbSteps">
        {steps.map((item, index) => <li key={item.title}>
          <img src={item.art} alt="" loading="lazy" />
          <h3><span>{index + 1}</span>{item.title}</h3>
          <p>{item.text}</p>
        </li>)}
      </ol>
    </section>

    <section className="nbSection nbTrust" aria-labelledby="nb-trust-title">
      <div>
        <h2 id="nb-trust-title">安心して任せられる理由</h2>
        <p className="nbSectionLead">宣伝の言葉ではなく、確かめられる仕組みで信頼をつくります。AIは提案までで、決めるのはいつも人です。</p>
      </div>
      <dl className="nbFactsList">
        <div><dt>授業料からの手数料</dt><dd><b className="nbZero">0円</b>紹介料、成約手数料、授業ごとの徴収はありません。授業料はそのまま先生に支払われます。</dd></div>
        <div><dt>資格と学歴の確認</dt><dd><ShieldCheck aria-hidden="true" />講師が出した証明書類を、2段階認証を設定した運営担当が確認します。書類そのものは公開しません。</dd></div>
        <div><dt>実績にもとづくランク</dt><dd><span className="nbRanks"><img src="/rank-r.png" alt="Rランク" /><img src="/rank-sr.png" alt="SRランク" /><img src="/rank-ssr.png" alt="SSRランク" /></span>確認された授業、評価、継続から付与します。<button className="nbTextLink small" onClick={() => onNavigate("ranks")}>ランク制度を見る</button></dd></div>
        <div><dt>授業後のふりかえり</dt><dd>授業のたびに、生徒と講師の両方がレポートを残します。</dd></div>
      </dl>
    </section>

    <section className="nbSection" aria-labelledby="nb-col-title">
      <div className="nbSplit">
        <h2 id="nb-col-title">先生が書いたコラム</h2>
        <button className="nbTextLink" onClick={() => onNavigate("articles")}>コラムを読む</button>
      </div>
      <p className="nbSectionLead">プロフィールだけでは見えない、考え方や教え方が分かります。</p>
      <ul className="nbIndex">
        {columns.map(item => <li key={item.title}><button onClick={() => onNavigate("articles")}><img src={item.art} alt="" loading="lazy" /><span>{item.title}</span></button></li>)}
      </ul>
    </section>

    <section className="nbSection nbNext" aria-labelledby="nb-next-title">
      <img className="nbCat" src="/home/cat-workshop.webp" alt="工具箱と本のそばで準備を見守る猫のイラスト" loading="lazy" />
      <div>
        <h2 id="nb-next-title">同じアカウントで使える機能を準備しています</h2>
        <ul className="nbTools">
          <li><GraduationCap aria-hidden="true" />大学・学部・学科検索<span>開発中</span></li>
          <li><BookOpenText aria-hidden="true" />AI単語帳<span>準備中</span></li>
          <li><PenLine aria-hidden="true" />AI文章添削<span>準備中</span></li>
          <li><Mic aria-hidden="true" />AI面接<span>準備中</span></li>
        </ul>
        <p className="nbSmall">AIによる評価や提案は参考情報です。合否や成績の向上を保証するものではありません。</p>
      </div>
    </section>

    <section className="nbClosing" aria-labelledby="nb-closing-title">
      <h2 id="nb-closing-title">まずは、合う先生を探してみませんか。</h2>
      <button className="nbButton" onClick={() => onNavigate("search")}>家庭教師を探す</button>
    </section>
  </main>;
}
