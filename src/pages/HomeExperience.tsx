import { BadgeCheck, BookOpenText, CalendarCheck, Check, GraduationCap, Mic, PenLine, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import "../home-experience.css";

type Destination = "search" | "teacher-auth" | "family-auth" | "pricing" | "student-guide" | "teacher-guide" | "ranks" | "articles";
type Props = { onNavigate: (page: Destination) => void };
type Cta = { label: string; to: Destination };

// タイル1枚：名前・キャッチコピー・ボタン2つ・ビジュアル。未提供のAI機能は必ず「準備中」と表示する。
function Tile({ name, headline, callout, primary, secondary, onNavigate, tone = "gray", size = "full", children }: { name: string; headline: ReactNode; callout?: string; primary: Cta; secondary?: Cta; onNavigate: Props["onNavigate"]; tone?: "gray" | "white" | "warm"; size?: "full" | "half"; children: ReactNode }) {
  return <section className={`hxTile ${tone} ${size}`}>
    <div className="hxTileCopy">
      <h2>{name}</h2>
      <p className="hxTileHeadline">{headline}</p>
      {callout && <p className="hxTileCallout">{callout}</p>}
      <div className="hxTileCtas">
        <button className="hxBtn" onClick={() => onNavigate(primary.to)}>{primary.label}</button>
        {secondary && <button className="hxBtn outline" onClick={() => onNavigate(secondary.to)}>{secondary.label}</button>}
      </div>
    </div>
    <div className="hxTileVisual">{children}</div>
  </section>;
}

export function HomeExperience({ onNavigate }: Props) {
  return <main className="hx withTopbar">
    <Tile name="得意で選ぶ家庭教師" headline="“わかる”に、まっすぐ届く。" callout="現在、無料期間中" primary={{ label: "家庭教師を探す", to: "search" }} secondary={{ label: "さらに詳しく", to: "student-guide" }} onNavigate={onNavigate}>
      <div className="hxWindow" aria-hidden="true">
        <div className="hxWindowBar"><span /><span /><span /><b>korupiyo ・ 家庭教師を探す</b></div>
        <div className="hxWindowBody">
          <img className="hxWindowPhoto" src="/home/hero-student.webp" alt="" />
          <div className="hxWindowList">
            <p className="hxMini">あなたの学び方に合う家庭教師</p>
            {[["英検長文読解", "精読で誤読を直す", "/rank-sr.png"], ["高校数学", "初見問題の方針づくり", "/rank-ssr.png"], ["大学受験日本史", "因果関係で覚える", "/rank-r.png"]].map(([subject, strength, rank], index) => <div className={index === 0 ? "hxRow on" : "hxRow"} key={subject}>
              <img className="hxAvatar" src="/demo-teacher-avatar.svg" alt="" />
              <div><b>{subject}</b><span>{strength}</span></div>
              <img className="hxRank" src={rank} alt="" />
            </div>)}
            <p className="hxVerified"><BadgeCheck />資格・学歴は運営が確認済み</p>
          </div>
        </div>
      </div>
    </Tile>

    <Tile name="講師直筆コラム" headline="先生の言葉で、学び方を知る。" primary={{ label: "コラムを読む", to: "articles" }} secondary={{ label: "講師の方へ", to: "teacher-guide" }} onNavigate={onNavigate} tone="white">
      <div className="hxGallery">
        {[["/home/desk-evening.webp", "私が「感覚の英語」を身につけた方法"], ["/home/desk-structure.webp", "「感覚の英語」の限界と、私がぶつかった壁"], ["/home/desk-reading.webp", "なぜ中学生で英検準1級に合格できたのか"]].map(([src, title]) => <button key={title} className="hxGalleryItem" onClick={() => onNavigate("articles")}><img src={src} alt="" loading="lazy" /><span>{title}</span></button>)}
      </div>
    </Tile>

    <div className="hxGrid">
      <Tile size="half" name="得意と非対応" headline="教え方まで、正直に。" primary={{ label: "家庭教師を探す", to: "search" }} secondary={{ label: "さらに詳しく", to: "student-guide" }} onNavigate={onNavigate}>
        <div className="hxScene"><img src="/home/desk-reading.webp" alt="" loading="lazy" />
          <div className="hxCard"><div className="hxCardHead"><img className="hxAvatar" src="/demo-teacher-avatar.svg" alt="" /><div><b>感覚派向け 英検長文読解</b><span>英語 ・ 英検2級〜1級</span></div></div><div className="hxTwo"><div><p className="hxMini">得意な指導</p><p>本文を正確に捉える精読</p></div><div><p className="hxMini muted">対応しない内容</p><p>文法用語の暗記中心の指導</p></div></div></div>
        </div>
      </Tile>
      <Tile size="half" tone="white" name="運営による確認" headline="資格も学歴も、確かめてから。" primary={{ label: "講師の方へ", to: "teacher-guide" }} onNavigate={onNavigate}>
        <div className="hxStack">
          <p className="hxPill ok"><ShieldCheck />資格 確認済み</p>
          <p className="hxPill ok"><GraduationCap />学歴 確認済み</p>
          <p className="hxNote">証明書類は、2段階認証を設定した運営担当だけが確認します。書類そのものは公開しません。</p>
        </div>
      </Tile>
      <Tile size="half" tone="white" name="授業料からの手数料" headline="授業料は、そのまま先生へ。" primary={{ label: "料金プラン", to: "pricing" }} onNavigate={onNavigate}>
        <p className="hxZero">0<small>円</small></p>
        <p className="hxNote center">紹介料・成約手数料・授業ごとの徴収はありません。</p>
      </Tile>
      <Tile size="half" name="ランク制度" headline="実績を、信頼の記録に。" primary={{ label: "ランク制度を見る", to: "ranks" }} onNavigate={onNavigate}>
        <div className="hxRanks"><img src="/rank-r.png" alt="Rランク" /><img src="/rank-sr.png" alt="SRランク" /><img src="/rank-ssr.png" alt="SSRランク" /></div>
        <p className="hxNote center">確認済みの授業・評価・継続から付与します。</p>
      </Tile>
      <Tile size="half" name="授業後レポート" headline="一回一回が、学びの記録に。" primary={{ label: "生徒・保護者の方へ", to: "student-guide" }} onNavigate={onNavigate}>
        <div className="hxScene"><img src="/home/desk-evening.webp" alt="" loading="lazy" />
          <div className="hxCard"><div className="hxCardHead"><CalendarCheck className="hxIcon" /><div><b>授業後レポート</b><span>英語 ・ 60分</span></div></div><ul className="hxList"><li><Check />授業は予定どおり実施</li><li><Check />プロフィールどおりの指導内容</li></ul></div>
        </div>
      </Tile>
      <Tile size="half" tone="warm" name="人とAI" headline={<>AIは、提案する。<br />決めるのは、人。</>} primary={{ label: "無料で登録する", to: "family-auth" }} onNavigate={onNavigate}>
        <img className="hxWide" src="/home/desk-structure.webp" alt="" loading="lazy" />
      </Tile>
    </div>

    <Tile name="学びのツール" headline="ひとつのアカウントで、学びがつながる。" callout="準備ができたものから順に公開します" primary={{ label: "講師として参加する", to: "teacher-auth" }} secondary={{ label: "料金プラン", to: "pricing" }} onNavigate={onNavigate}>
      <div className="hxTools">
        <img className="hxCat" src="/home/cat-workshop.webp" alt="工具箱と本のそばで準備を見守る猫のイラスト" loading="lazy" />
        <ul>
          <li><GraduationCap /><b>大学・学部・学科検索</b><em>開発中</em></li>
          <li><BookOpenText /><b>AI単語帳</b><em>準備中</em></li>
          <li><PenLine /><b>AI文章添削</b><em>準備中</em></li>
          <li><Mic /><b>AI面接</b><em>準備中</em></li>
        </ul>
      </div>
      <p className="hxNote center small">AIによる評価・提案は参考情報です。合否や成績の向上を保証するものではありません。</p>
    </Tile>
  </main>;
}
