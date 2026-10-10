import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Crown } from "lucide-react";
import { getPublishedDirectoryTeachers, type DirectoryTeacher } from "../lib/teacherDirectory";
import "../advanced-search.css";

const englishTopics = ["長文読解", "英作文・ライティング", "英文法", "リスニング", "スピーキング", "英検対策", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const mathTopics = ["計算", "文章題", "図形", "証明", "関数", "確率", "共通テスト対策", "定期テスト対策", "過去問指導", "その他"];
const englishLevels = ["基礎から", "学校の授業補習", "定期テスト", "高校受験", "大学受験", "難関大学受験", "英検5級", "英検4級", "英検3級", "英検準2級", "英検2級", "英検準1級", "英検1級"];
const mathLevels = ["基礎から", "定期テスト", "高校受験", "共通テスト", "大学受験", "難関大学受験"];

function Chips({ values }: { values: string[] }) {
  return <div className="searchChips">{values.map(value => <label key={value}><input type="checkbox" />{value}</label>)}</div>;
}

const rankBadgeSources: Record<string, string> = { R: "/rank-r.png", SR: "/rank-sr.png", SSR: "/rank-ssr.png" };

function RankBadge({ rank }: { rank: string }) {
  const normalizedRank = rank.trim().toUpperCase();
  const src = rankBadgeSources[normalizedRank];
  return src ? <img className="rankBadge" src={src} alt={`${normalizedRank}ランク`} /> : <strong>{rank}</strong>;
}

function DirectoryTeacherCard({ teacher, onOpen }: { teacher: DirectoryTeacher; onOpen: () => void }) {
  return <button className="directoryTeacherCard ownerPublicCard" type="button" onClick={onOpen}>
    <header className="ownerCompactHeader">
      <div className="ownerPublicCurrentRank"><small>今季ランク</small><RankBadge rank={teacher.current_rank} /></div>
      <div className="directoryAvatar" aria-hidden="true">{teacher.display_name.slice(0, 1)}</div>
      <div className="ownerCompactIdentity"><small className="ownerIdentityLine"><Crown aria-hidden="true"/><b>DEMO TEACHER</b><i aria-hidden="true"/><strong>{teacher.display_name}</strong><span>{teacher.target_label ?? teacher.main_subject}</span></small><h2>{teacher.catchphrase}</h2><div className="ownerQualificationRow"><span><b>資格：</b>{teacher.qualifications.map(value => <span className="ownerVerifiedQualification" key={value}>{value}{teacher.qualification_verified && <i className="ownerVerifiedCheck" aria-label="確認済み">✓</i>}</span>)}</span><span className="ownerHighestRank"><b>過去最高ランク</b><RankBadge rank={teacher.highest_rank}/></span></div><p className="ownerScore"><b>模試成績：</b>{teacher.mock_exam_result ?? "実績収集中"}{teacher.mock_exam_verified && <i className="ownerVerifiedCheck" aria-label="確認済み">✓</i>}</p></div>
      <aside className="ownerCompactMeta"><p><b>学歴：</b>{teacher.education ?? "確認中"}{teacher.education_verified && <i className="ownerVerifiedCheck" aria-label="確認済み">✓</i>}</p><p><b>担当可能方式：</b>{teacher.contact_method ?? "確認中"}</p><div><span><b>性別：</b>{teacher.gender ?? "非公開"}</span><span><b>指導歴：</b>{teacher.teaching_experience ?? "確認中"}</span><span><b>授業形式：</b>{teacher.lesson_types.join("・")}</span><span><b>状態：</b>{teacher.recruitment_status}</span></div></aside>
      <div className="ownerPriceStack"><strong>{teacher.price_yen.toLocaleString()}円</strong><span>{teacher.free_consultation ? "メール相談無料開放中！" : "1時間あたり"}</span></div>
      <span className="ownerFavorite" aria-label="お気に入り登録" title="お気に入り登録">☆</span>
    </header>
    <section className="ownerPublicResults"><h3>実績</h3><div><p><b>{teacher.verified_lesson_count}</b><span>今季授業数</span></p><p><b>{teacher.total_lesson_count}</b><span>総授業数</span></p><p><b>{teacher.profile_match_rate === null ? "−" : `${teacher.profile_match_rate}%`}</b><span>プロフィール一致率<br/><small>プロフィール通りの授業が行われているかを示します。</small></span></p></div></section>
    <section className="ownerPublicAreas"><article><h3>① 専門分野</h3><p><b>メイン科目：</b>{teacher.main_subject}</p><p><b>得意分野：</b>{teacher.strengths.join("、")}</p><p><b>不得意分野：</b>{teacher.limitations.join("、")}</p></article><article><h3>② 対象生徒</h3><p>{teacher.target_label ?? teacher.main_subject}</p><p className="ownerTargetLevel">{teacher.levels.join("・")}</p></article><article><h3>③ 指導方針</h3><p>{teacher.teaching_policy ?? teacher.summary}</p></article><article><h3>他に教えられる科目</h3><p><b>対応科目：</b>{teacher.other_subjects.join("、")}</p><p><b>相談等：</b>{teacher.extra_subjects.join("、")}</p></article></section>
    <span className="ownerPublicDetail">講師プロフィールを見る <ChevronRight/></span>
  </button>;
}

function DirectoryTeacherDetail({ teacher, onClose }: { teacher: DirectoryTeacher; onClose: () => void }) {
  const recommended = [teacher.target_label ?? `${teacher.main_subject}を学びたい方`, ...teacher.levels.slice(0, 2).map(level => `${level}を目指している方`), `${teacher.strengths.join("・")}を伸ばしたい方`];
  return <div className="overlay" onClick={onClose}><article className="modal ownerProfileDialog directoryProfileDialog" role="dialog" aria-modal="true" aria-label={`${teacher.display_name}のプロフィール詳細`} onClick={event => event.stopPropagation()}><button className="close" type="button" onClick={onClose} aria-label="閉じる">×</button><div className="ownerProfileModal"><header className="ownerProfileHero"><div className="directoryDetailAvatar" aria-hidden="true">{teacher.display_name.slice(0, 1)}</div><div className="ownerProfileRank"><RankBadge rank={teacher.current_rank}/><span>現在・過去最高ランク</span></div><div><small className="ownerIdentityLine"><Crown aria-hidden="true"/><b>DEMO TEACHER</b><i aria-hidden="true"/><strong>{teacher.display_name}</strong><span>{teacher.target_label ?? teacher.main_subject}</span></small><h2>{teacher.catchphrase}</h2><p><b>メイン科目：</b>{teacher.main_subject}　 <b>ターゲット：</b>{teacher.target_label ?? teacher.main_subject}</p><p className="ownerProfileCurrentStatus"><b>状態：</b>{teacher.recruitment_status}</p></div></header><section className="ownerProfileQuickFacts" aria-label="問い合わせ前の確認情報"><article><span>受付状態</span><b>{teacher.recruitment_status}</b></article><article><span>対応方法</span><b>{teacher.contact_method ?? "確認中"}</b></article><article><span>料金</span><b>{teacher.price_yen.toLocaleString()}円 <small>{teacher.free_consultation ? "メール相談無料開放中！" : "1時間あたり"}</small></b></article></section><section className="ownerProfileResults ownerProfileResultsCompact"><h3>実績</h3><div><p><b>{teacher.verified_lesson_count}</b><span>今季授業数</span></p><p><b>{teacher.total_lesson_count}</b><span>総授業数</span></p><p><b>{teacher.profile_match_rate === null ? "−" : `${teacher.profile_match_rate}%`}</b><span>プロフィール一致率</span></p></div><p className="ownerProfileResultsNote">確認済み授業実績・評価・信頼性をもとに更新します。</p></section><section className="ownerProfileLong"><h3>授業形式</h3><p>{teacher.lesson_types.join("・")}に対応しています。{teacher.contact_method ?? "確認中"}で、ご希望に合わせて進めます。</p><div className="ownerProfileColumns"><section><h3>こんな生徒におすすめです</h3><ul>{recommended.map(item => <li key={item}>{item}</li>)}</ul></section><section><h3>こんな生徒にはおすすめしません</h3><ul>{teacher.limitations.map(item => <li key={item}>{item}を中心に学びたい方</li>)}</ul></section></div><section className="ownerProfileStrictness"><h3>授業の厳しさ</h3><p><b>指導タイプ：</b>{teacher.teaching_types.join("・")}</p><p><b>授業スタイル：</b>{teacher.lesson_styles.join("・")}</p></section><section className="ownerProfileUnsupported"><h3>非対応</h3><p>{teacher.limitations.join("、")}</p></section><section className="ownerProfileMessage"><h3>講師からのメッセージ</h3><p>{teacher.summary ?? "現在、講師メッセージを準備中です。"}</p><p>{teacher.teaching_policy ?? "生徒の目標に合わせた指導を行います。"}</p></section></section></div><section className="ownerReviews"><h3>口コミ</h3><p>口コミは確認済みの評価が蓄積され次第、公開します。</p></section><button className="ownerInquiry" type="button">この先生に問い合わせる</button></article></div>;
}

function DirectoryResults({ subject, inPerson }: { subject: string; inPerson: boolean }) {
  const [teachers, setTeachers] = useState<DirectoryTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<DirectoryTeacher | null>(null);

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
    {error ? <p className="directoryState">{error}</p> : loading ? <p className="directoryState">公開中の講師データを読み込んでいます。</p> : results.length === 0 ? <p className="directoryState">条件に合う講師が見つかりませんでした。条件を少し広げてお試しください。</p> : <div className="featuredTeacherSection directoryFeaturedTeacherSection"><div className="directoryTeacherGrid">{results.map(teacher => <DirectoryTeacherCard key={teacher.id} teacher={teacher} onOpen={() => setSelectedTeacher(teacher)} />)}</div></div>}
    {selectedTeacher && <DirectoryTeacherDetail teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />}
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
        <label><b>科目</b><select value={subject} onChange={event => setSubject(event.target.value)}><option>高校英語</option><option>高校数学</option><option>中学英語</option><option>中学数学</option><option>現代文</option><option>高校理科</option><option>中学国語</option><option>小学生英語</option><option>地理</option></select></label>
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
