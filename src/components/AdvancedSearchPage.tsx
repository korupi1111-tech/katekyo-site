import { useEffect, useMemo, useState } from "react";
import { getPublishedDirectoryTeachers, type DirectoryTeacher } from "../lib/teacherDirectory";
import "../advanced-search.css";
import "../directory-result-refinement.css";

const englishTopics = ["長文読解", "英作文・ライティング", "英文法", "リスニング", "スピーキング", "英検対策", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const mathTopics = ["計算", "文章題", "図形", "証明", "関数", "確率", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const englishLevels = ["基礎から", "学校の授業補習", "定期テスト", "高校受験", "大学受験", "難関大学受験", "英検5級", "英検4級", "英検3級", "英検準2級", "英検2級", "英検準1級", "英検1級"];
const mathLevels = ["基礎から", "定期テスト", "高校受験", "共通テスト", "大学受験", "難関大学受験"];

function Chips({ values }: { values: string[] }) {
  return <div className="searchChips">{values.map(value => <label key={value}><input type="checkbox" />{value}</label>)}</div>;
}

function DirectoryTeacherCard({ teacher }: { teacher: DirectoryTeacher }) {
  return <article className="directoryTeacherCard">
    <header className="directoryTeacherHeader"><div className="directoryRank"><small>今季ランク</small><b>{teacher.current_rank}</b></div><span>{teacher.recruitment_status}</span></header>
    <div className="directoryIdentity"><i aria-hidden="true">{teacher.display_name.slice(0, 1)}</i><div><small>{teacher.target_label ?? teacher.main_subject}</small><h3>{teacher.display_name}</h3><p>{teacher.catchphrase}</p></div></div>
    <section className="directoryProfileProof"><p><b>資格：</b>{teacher.qualifications.map(value => <span key={value}>{value}{teacher.qualification_verified && <i aria-label="確認済み">✓</i>}</span>)}</p>{teacher.mock_exam_result && <p><b>模試成績：</b>{teacher.mock_exam_result}{teacher.mock_exam_verified && <i aria-label="確認済み">✓</i>}</p>}<span><b>過去最高ランク</b><strong>{teacher.highest_rank}</strong></span></section>
    <aside className="directoryQuickFacts"><p><b>学歴：</b>{teacher.education ?? "確認中"}{teacher.education_verified && <i aria-label="確認済み">✓</i>}</p><p><b>担当可能方式：</b>{teacher.contact_method ?? "確認中"}</p><div><span><b>性別：</b>{teacher.gender ?? "非公開"}</span><span><b>指導歴：</b>{teacher.teaching_experience ?? "確認中"}</span><span><b>授業形式：</b>{teacher.lesson_types.join("・")}</span><span><b>状態：</b>{teacher.recruitment_status}</span></div></aside>
    <div className="directoryPrice"><strong>{teacher.price_yen.toLocaleString()}円</strong><span>{teacher.free_consultation ? "メール相談無料開放中！" : "1時間あたり"}</span></div>
    <section className="directoryEvidence"><h3>実績</h3><dl><div><dt>確認済み授業</dt><dd>{teacher.verified_lesson_count}回</dd></div><div><dt>プロフィール一致率</dt><dd>{teacher.profile_match_rate === null ? "蓄積中" : `${teacher.profile_match_rate}%`}</dd></div><div><dt>現在ランク</dt><dd>{teacher.current_rank}</dd></div></dl></section>
    <section className="directoryAreas"><article><h4>① 専門分野</h4><p>{teacher.strengths.join("、")}</p><p><b>非対応：</b>{teacher.limitations.join("、")}</p></article><article><h4>② 対象生徒</h4><p>{teacher.target_label ?? teacher.main_subject}</p><div>{teacher.levels.slice(0, 3).map(level => <span key={level}>{level}</span>)}</div></article><article><h4>③ 指導方針</h4><p>{teacher.teaching_policy ?? teacher.summary}</p></article></section>
  </article>;
}

function DirectoryResults({ subject, inPerson }: { subject: string; inPerson: boolean }) {
  const [teachers, setTeachers] = useState<DirectoryTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getPublishedDirectoryTeachers()
      .then(data => { if (active) setTeachers(data); })
      .catch(() => { if (active) setError("講師データを読み込めませんでした。接続設定または公開設定を確認してください。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const results = teachers.filter(teacher => teacher.subjects.includes(subject) && (!inPerson || teacher.supports_in_person));

  return <section className="directoryResults" aria-live="polite">
    <div className="directoryResultsHead"><div><span>DATABASE RESULTS</span><h2>講師検索結果</h2></div><b>{loading ? "読み込み中" : `${results.length}人`}</b></div>
    {error ? <p className="directoryState">{error}</p> : loading ? <p className="directoryState">公開中の講師データを読み込んでいます。</p> : results.length === 0 ? <p className="directoryState">条件に合う講師が見つかりませんでした。条件を少し広げてお試しください。</p> : <div className="directoryTeacherGrid">{results.map(teacher => <DirectoryTeacherCard key={teacher.id} teacher={teacher} />)}</div>}
  </section>;
}

export function AdvancedSearchPage({}: { onOpenTeacher?: () => void }) {
  const [subject, setSubject] = useState("高校英語");
  const [inPerson, setInPerson] = useState(false);
  const [more, setMore] = useState(false);
  const [applied, setApplied] = useState(false);
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
      <button className="searchApply" onClick={() => setApplied(true)}>この条件で検索する</button>{applied && <p className="searchApplied">講師データベースの検索結果を更新しました。</p>}
    </section>
    <DirectoryResults subject={subject} inPerson={inPerson} />
    <button className="moreSearchToggle" aria-expanded={more} onClick={() => setMore(!more)}>さらに詳しく探す <span>{more ? "−" : "＋"}</span></button>
    {more && <section className="searchPanel detailedSearch"><h2>詳細条件</h2><div className="searchFieldGrid"><fieldset><legend>指導タイプ <small>最大2つ</small></legend><Chips values={["感覚型", "理論型", "暗記型", "演習型", "その他"]} /></fieldset><fieldset><legend>授業の進め方</legend><Chips values={["質問重視", "演習重視", "精読重視", "添削重視", "アウトプット重視", "インプット重視", "対話重視", "生徒に合わせて変更"]} /></fieldset><fieldset><legend>授業外サポート</legend><div className="searchChecks"><label><input type="checkbox" />質問対応あり</label><label><input type="checkbox" />添削対応あり</label><label><input type="checkbox" />学習管理あり</label></div></fieldset><fieldset><legend>確認・実績</legend><div className="searchChecks"><label><input type="checkbox" />本人確認済み</label><label><input type="checkbox" />学歴確認済み</label><label><input type="checkbox" />資格確認済み</label><label><input type="checkbox" />成績確認済み</label></div></fieldset><label><b>講師ランク</b><select><option>指定なし</option><option>R以上</option><option>SR以上</option><option>SSR以上</option><option>UR以上</option><option>LR以上</option><option>KING以上</option><option>OMEGA</option></select></label><label><b>確認済み授業数</b><select><option>指定なし</option><option>10回以上</option><option>30回以上</option><option>50回以上</option><option>100回以上</option><option>300回以上</option></select></label><label><b>プロフィール一致率</b><select><option>指定なし</option><option>評価蓄積中を含む</option><option>80％以上</option><option>90％以上</option><option>95％以上</option></select></label></div><button className="searchApply">詳細条件を適用する</button></section>}
    <section className="concernSearch"><span>SEARCH BY CONCERN</span><h2>悩みから探す</h2><div>{[["英語", ["長文の点数が安定しない", "感覚で読んでいて、解答根拠を説明できない", "英作文を添削してほしい", "英文法を基礎から学び直したい", "英検対策をしてほしい", "TOEIC対策をしてほしい", "一問だけ質問したい"]], ["数学", ["計算ミスが多い", "公式は覚えているが使い方が分からない", "解説を読んでも理解できない", "証明問題が苦手", "共通テスト対策をしたい", "難関大学の記述対策をしたい", "一問だけ質問したい"]], ["学習全般", ["勉強方法を相談したい", "学習計画を立ててほしい", "進路について相談したい", "志望校を決めたい", "面接練習をしたい", "志望理由書を添削してほしい"]]].map(([title, values]) => <article key={title as string}><h3>{title}</h3><ul>{(values as string[]).map(value => <li key={value}><button>{value}</button></li>)}</ul></article>)}</div></section>
  </main>;
}
