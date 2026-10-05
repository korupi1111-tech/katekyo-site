import { useMemo, useState } from "react";
import "../advanced-search.css";

type Props = { onOpenTeacher: () => void };

const englishTopics = ["長文読解", "英作文・ライティング", "英文法", "リスニング", "スピーキング", "英検対策", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const mathTopics = ["計算", "文章題", "図形", "証明", "関数", "確率", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const englishLevels = ["基礎から", "学校の授業補習", "定期テスト", "高校受験", "大学受験", "難関大学受験", "英検5級", "英検4級", "英検3級", "英検準2級", "英検2級", "英検準1級", "英検1級"];
const mathLevels = ["基礎から", "定期テスト", "高校受験", "共通テスト", "大学受験", "難関大学受験"];

function Chips({ values }: { values: string[] }) {
  return <div className="searchChips">{values.map(value => <label key={value}><input type="checkbox" />{value}</label>)}</div>;
}

export function AdvancedSearchPage({ onOpenTeacher }: Props) {
  const [subject, setSubject] = useState("高校英語");
  const [inPerson, setInPerson] = useState(false);
  const [more, setMore] = useState(false);
  const topics = useMemo(() => subject === "高校英語" ? englishTopics : mathTopics, [subject]);
  const levels = useMemo(() => subject === "高校英語" ? englishLevels : mathLevels, [subject]);

  return <main className="advancedSearch withTopbar">
    <header className="advancedSearchHero"><span>FIND YOUR TEACHER</span><h1>先生を探す</h1><p>希望する学び方と条件から、相性のよい講師を探せます。</p></header>
    <section className="searchPanel" aria-label="講師検索条件">
      <h2>基本条件</h2>
      <div className="searchFieldGrid">
        <label><b>科目</b><select value={subject} onChange={event => setSubject(event.target.value)}><option>高校英語</option><option>高校数学</option><option>中学英語</option><option>中学数学</option><option>現代文</option></select></label>
        <fieldset className="searchWide"><legend>何を教えてほしいですか？</legend><Chips values={topics} /></fieldset>
        <fieldset className="searchWide"><legend>目標・レベル</legend><Chips values={levels} /></fieldset>
        <fieldset><legend>授業形式</legend><Chips values={["単発授業", "長期指導", "学習相談", "進路相談", "質問対応", "添削", "面接練習"]} /></fieldset>
        <fieldset><legend>対応方法</legend><div className="searchChips"><label><input checked={inPerson} onChange={event => setInPerson(event.target.checked)} type="checkbox" />対面</label>{["オンライン通話", "メッセージ", "メール", "添削のみ"].map(value => <label key={value}><input type="checkbox" />{value}</label>)}</div></fieldset>
        {inPerson && <fieldset className="searchWide regionFields"><legend>対応地域</legend><select><option>都道府県を選択</option></select><select><option>市区町村を選択</option></select></fieldset>}
        <fieldset className="searchWide"><legend>募集状況</legend><div className="searchChecks"><label><input type="checkbox" />募集中の講師のみ</label><label><input type="checkbox" />条件付きで受付中の講師を含む</label><label><input type="checkbox" />募集停止中の講師も表示する</label></div></fieldset>
        <label><b>料金</b><div className="priceRange"><select><option>下限なし</option><option>無料</option><option>1,000円</option></select>から<select><option>上限なし</option><option>2,000円</option><option>5,000円</option></select></div></label>
        <div className="searchChecks feeChecks"><label><input type="checkbox" />無料相談あり</label><label><input type="checkbox" />初回無料あり</label></div>
      </div>
      <button className="searchApply" onClick={onOpenTeacher}>この条件で検索する</button>
    </section>
    <button className="moreSearchToggle" aria-expanded={more} onClick={() => setMore(!more)}>さらに詳しく探す <span>{more ? "−" : "＋"}</span></button>
    {more && <section className="searchPanel detailedSearch"><h2>詳細条件</h2><div className="searchFieldGrid"><fieldset><legend>指導タイプ <small>最大2つ</small></legend><Chips values={["感覚型", "理論型", "暗記型", "演習型", "その他"]} /></fieldset><fieldset><legend>授業の進め方</legend><Chips values={["質問重視", "演習重視", "精読重視", "添削重視", "アウトプット重視", "インプット重視", "対話重視", "生徒に合わせて変更"]} /></fieldset><fieldset><legend>授業外サポート</legend><div className="searchChecks"><label><input type="checkbox" />質問対応あり</label><label><input type="checkbox" />添削対応あり</label><label><input type="checkbox" />学習管理あり</label></div></fieldset><fieldset><legend>確認・実績</legend><div className="searchChecks"><label><input type="checkbox" />本人確認済み</label><label><input type="checkbox" />学歴確認済み</label><label><input type="checkbox" />資格確認済み</label><label><input type="checkbox" />成績確認済み</label></div></fieldset><label><b>講師ランク</b><select><option>指定なし</option><option>R以上</option><option>SR以上</option><option>SSR以上</option><option>UR以上</option><option>LR以上</option><option>KING以上</option><option>OMEGA</option></select></label><label><b>確認済み授業数</b><select><option>指定なし</option><option>10回以上</option><option>30回以上</option><option>50回以上</option><option>100回以上</option><option>300回以上</option></select></label><label><b>プロフィール一致率</b><select><option>指定なし</option><option>評価蓄積中を含む</option><option>80％以上</option><option>90％以上</option><option>95％以上</option></select></label></div><button className="searchApply">詳細条件を適用する</button></section>}
    <section className="concernSearch"><span>SEARCH BY CONCERN</span><h2>悩みから探す</h2><div>{[["英語", ["長文の点数が安定しない", "感覚で読んでいて、解答根拠を説明できない", "英作文を添削してほしい", "英文法を基礎から学び直したい", "英検対策をしてほしい", "TOEIC対策をしてほしい", "一問だけ質問したい"]], ["数学", ["計算ミスが多い", "公式は覚えているが使い方が分からない", "解説を読んでも理解できない", "証明問題が苦手", "共通テスト対策をしたい", "難関大学の記述対策をしたい", "一問だけ質問したい"]], ["学習全般", ["勉強方法を相談したい", "学習計画を立ててほしい", "進路について相談したい", "志望校を決めたい", "面接練習をしたい", "志望理由書を添削してほしい"]]].map(([title, values]) => <article key={title as string}><h3>{title}</h3><ul>{(values as string[]).map(value => <li key={value}><button>{value}</button></li>)}</ul></article>)}</div></section>
  </main>;
}
