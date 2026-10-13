import { useEffect, useMemo, useState } from "react";
import { getPublishedDirectoryTeachers, type DirectoryTeacher } from "../lib/teacherDirectory";
import { ProfileModalShell, PublicProfileCard, type ProfileTemplateData } from "./ProfileTemplates";
import { getCurrentAccount } from "../lib/account";
import { getTeacherAvatarUrl } from "../lib/teacherProfiles";
import { isTeacherFavorite, toggleTeacherFavorite } from "../lib/teacherFavorites";
import { PublicTeacherAvailability } from "./PublicTeacherAvailability";
import { contactMethodOptions, lessonStyleOptions, lessonTypeOptions, levelOptionsForSubject, normalizeCombinedContactMethod, qualificationLabelOptions, subjectMatches, subjectOptions, subjectTypeOptions, topicOptionsForSubject } from "../lib/teacherLabels";
import "../advanced-search.css";

type SearchFilters = {
  subject: string;
  topics: string[];
  levels: string[];
  lessonTypes: string[];
  contactMethods: string[];
  prefecture: string;
  city: string;
  recruitmentStatuses: string[];
  minPrice: string;
  maxPrice: string;
  freeConsultation: boolean;
  initialFree: boolean;
  teachingTypes: string[];
  lessonStyles: string[];
  qualificationLabels: string[];
  supportOptions: string[];
};

const initialFilters = (): SearchFilters => ({
  subject: "高校英語", topics: [], levels: [], lessonTypes: [], contactMethods: [], prefecture: "", city: "", recruitmentStatuses: [], minPrice: "", maxPrice: "", freeConsultation: false, initialFree: false,
  teachingTypes: [], lessonStyles: [], qualificationLabels: [], supportOptions: [],
});

function cloneFilters(filters: SearchFilters): SearchFilters {
  return { ...filters, topics: [...filters.topics], levels: [...filters.levels], lessonTypes: [...filters.lessonTypes], contactMethods: [...filters.contactMethods], recruitmentStatuses: [...filters.recruitmentStatuses], teachingTypes: [...filters.teachingTypes], lessonStyles: [...filters.lessonStyles], qualificationLabels: [...filters.qualificationLabels], supportOptions: [...filters.supportOptions] };
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function Chips({ values, selected, onChange, limit }: { values: string[]; selected: string[]; onChange: (values: string[]) => void; limit?: number }) {
  return <div className="searchChips">{values.map(value => <label key={value}><input checked={selected.includes(value)} onChange={() => {
    if (!selected.includes(value) && limit && selected.length >= limit) return;
    onChange(toggleValue(selected, value));
  }} type="checkbox" />{value}</label>)}</div>;
}

function toDirectoryProfile(teacher: DirectoryTeacher): ProfileTemplateData {
  const targetLabel = teacher.target_label ?? teacher.main_subject;
  const strengths = teacher.strengths.join("、") || "確認中";
  const limitations = teacher.limitations.join("、") || "確認中";
  const combinedContactMethod = teacher.contact_method ? normalizeCombinedContactMethod(teacher.contact_method) : "確認中";
  return {
    avatarSrc: getTeacherAvatarUrl(teacher.avatar_path) ?? "/demo-teacher-avatar.svg", avatarAlt: `${teacher.display_name}のプロフィール画像`, identityLabel: teacher.is_demo ? "DEMO TEACHER" : "REGISTERED TEACHER", name: teacher.display_name, targetLabel,
    title: teacher.catchphrase, titleAccent: teacher.main_subject, currentRank: teacher.current_rank, highestRank: teacher.highest_rank,
    qualifications: teacher.qualifications, qualificationVerified: teacher.qualification_verified, mockExamResult: teacher.mock_exam_result ?? "実績収集中", mockExamVerified: teacher.mock_exam_verified,
    education: teacher.education ?? "確認中", educationVerified: teacher.education_verified, contactMethod: combinedContactMethod, gender: teacher.gender ?? "非公開", teachingExperience: teacher.teaching_experience ?? "確認中", lessonFormat: teacher.lesson_types.join("・"), recruitmentStatus: teacher.recruitment_status,
    priceUnit: "60分", priceText: `${teacher.price_yen.toLocaleString()}円`, priceNote: teacher.free_consultation && teacher.initial_free ? "メッセージ・メール相談・初回無料" : teacher.free_consultation ? "メッセージ・メール相談無料開放中！" : teacher.initial_free ? "初回無料" : "初回無料なし", seasonLessons: teacher.verified_lesson_count, totalLessons: teacher.total_lesson_count, matchRate: teacher.profile_match_rate === null ? null : `${teacher.profile_match_rate}%`,
    mainSubject: teacher.main_subject, strengths, limitations, targetDescription: targetLabel, targetLevel: teacher.levels.join("・"), teachingPolicy: teacher.teaching_policy ?? teacher.summary ?? "現在、指導方針を準備中です。", teachingType: teacher.teaching_types.join("・") || "確認中", otherSubjectsLine: `2科目：${teacher.other_subjects.join("、") || "無し"}`, extraSubjectsLine: `その他の対応している科目：${teacher.extra_subjects.join("、") || "無し"}`,
    lessonDescription: `${teacher.lesson_types.join("・")}に対応しています。${combinedContactMethod}で、ご希望に合わせて進めます。`, recommendations: [targetLabel, ...teacher.levels.slice(0, 2).map(level => `${level}を目指している方`), `${strengths}を伸ばしたい方`], notRecommendations: teacher.limitations.map(item => `${item}を中心に学びたい方`), paceDescription: teacher.teaching_types.join("・") || "生徒に合わせて調整", homeworkDescription: teacher.lesson_styles.join("・") || "相談して決定",
    teacherMessage: <><p>{teacher.summary ?? "現在、講師メッセージを準備中です。"}</p><p>{teacher.teaching_policy ?? "生徒の目標に合わせた指導を行います。"}</p></>,
  };
}

function DirectoryTeacherCard({ teacher, onOpen }: { teacher: DirectoryTeacher; onOpen: () => void }) {
  return <PublicProfileCard profile={toDirectoryProfile(teacher)} open={onOpen}/>;
}

function DirectoryTeacherDetail({ teacher, onClose, onStartChat }: { teacher: DirectoryTeacher; onClose: () => void; onStartChat: (teacherProfileId: string) => void }) {
  const profile = toDirectoryProfile(teacher);
  const [student, setStudent] = useState(false);
  const [favorite, setFavorite] = useState(false);
  useEffect(() => { let active = true; void getCurrentAccount().then(async account => {
    if (!active || account?.role !== "student" || !teacher.teacher_profile_id) return;
    setStudent(true); setFavorite(await isTeacherFavorite(teacher.teacher_profile_id));
  }).catch(() => undefined); return () => { active = false; }; }, [teacher.teacher_profile_id]);
  const changeFavorite = async () => {
    if (!teacher.teacher_profile_id) return;
    try { const next = await toggleTeacherFavorite(teacher.teacher_profile_id, favorite); setFavorite(next); }
    catch { /* Favorite state remains unchanged when the request fails. */ }
  };
  return <ProfileModalShell profile={profile} close={onClose} onFavorite={student && teacher.teacher_profile_id ? changeFavorite : undefined} favoriteLabel={favorite ? "★ お気に入りから外す" : "☆ お気に入りに追加"} onContact={student && teacher.teacher_profile_id ? () => onStartChat(teacher.teacher_profile_id!) : undefined} availability={teacher.teacher_profile_id ? <PublicTeacherAvailability teacherProfileId={teacher.teacher_profile_id} /> : undefined}/>;
}

function includesAny(values: string[], selected: string[]) {
  return selected.length === 0 || selected.some(value => values.includes(value));
}

function matchesFilters(teacher: DirectoryTeacher, filters: SearchFilters) {
  const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;
  const supportMatches = filters.supportOptions.every(option => (option === "質問対応あり" && teacher.lesson_types.includes("質問対応")) || (option === "添削対応あり" && teacher.lesson_types.includes("添削")) || (option === "学習管理あり" && (teacher.lesson_types.includes("学習相談") || teacher.main_subject === "学習管理")));
  const requestedStatuses = filters.recruitmentStatuses.flatMap(status => status === "受付中" ? ["受付中"] : status === "条件付き" ? ["残り1枠"] : ["募集停止中"]);
  const availableContactMethods = [...(teacher.supports_in_person ? ["対面"] : []), ...teacher.contact_methods.map(normalizeCombinedContactMethod)];

  return subjectMatches(filters.subject, teacher.subjects)
    && includesAny(teacher.topics, filters.topics)
    && includesAny(teacher.levels, filters.levels)
    && includesAny(teacher.lesson_types, filters.lessonTypes)
    && includesAny(availableContactMethods, filters.contactMethods)
    && (!filters.prefecture || teacher.prefecture === filters.prefecture)
    && (!filters.city || teacher.city === filters.city)
    && (requestedStatuses.length === 0 || requestedStatuses.includes(teacher.recruitment_status))
    && (minPrice === null || teacher.price_yen >= minPrice)
    && (maxPrice === null || teacher.price_yen <= maxPrice)
    && (!filters.freeConsultation || teacher.free_consultation)
    && (!filters.initialFree || teacher.initial_free)
    && includesAny(teacher.teaching_types, filters.teachingTypes)
    && includesAny(teacher.lesson_styles, filters.lessonStyles)
    && includesAny(teacher.qualification_labels, filters.qualificationLabels)
    && supportMatches;
}

function DirectoryResults({ teachers, loading, error, filters, onStartChat }: { teachers: DirectoryTeacher[]; loading: boolean; error: string; filters: SearchFilters; onStartChat: (teacherProfileId: string) => void }) {
  const [selectedTeacher, setSelectedTeacher] = useState<DirectoryTeacher | null>(null);
  const results = useMemo(() => teachers.filter(teacher => matchesFilters(teacher, filters)), [teachers, filters]);

  return <section className="directoryResults" aria-live="polite">
    <div className="directoryResultsHead"><div><span>DATABASE RESULTS</span><h2>講師検索結果</h2></div><b>{loading ? "読み込み中" : `${results.length}人`}</b></div>
    {error ? <p className="directoryState">{error}</p> : loading ? <p className="directoryState">公開中の講師データを読み込んでいます。</p> : results.length === 0 ? <p className="directoryState">条件に合う講師が見つかりませんでした。条件を少し広げてお試しください。</p> : <section className="section featuredTeacherSection"><div className="directoryTeacherGrid">{results.map(teacher => <DirectoryTeacherCard key={teacher.id} teacher={teacher} onOpen={() => setSelectedTeacher(teacher)} />)}</div></section>}
    {selectedTeacher && <DirectoryTeacherDetail teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} onStartChat={onStartChat} />}
  </section>;
}

export function AdvancedSearchPage({ onStartChat }: { onStartChat: (teacherProfileId: string) => void }) {
  const [teachers, setTeachers] = useState<DirectoryTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initialFilters);
  const [more, setMore] = useState(false);
  const [applied, setApplied] = useState(false);
  const topics = useMemo(() => topicOptionsForSubject(filters.subject), [filters.subject]);
  const levels = useMemo(() => levelOptionsForSubject(filters.subject), [filters.subject]);
  const prefectures = useMemo(() => [...new Set(teachers.map(teacher => teacher.prefecture).filter((value): value is string => Boolean(value)))].sort(), [teachers]);
  const cities = useMemo(() => [...new Set(teachers.filter(teacher => !filters.prefecture || teacher.prefecture === filters.prefecture).map(teacher => teacher.city).filter((value): value is string => Boolean(value)))].sort(), [teachers, filters.prefecture]);
  const update = (partial: Partial<SearchFilters>) => setFilters(current => ({ ...current, ...partial }));
  const applyFilters = () => { setAppliedFilters(cloneFilters(filters)); setApplied(true); };
  const clearFilters = () => { const reset = initialFilters(); setFilters(reset); setAppliedFilters(reset); setApplied(false); };

  useEffect(() => {
    let active = true;
    void getPublishedDirectoryTeachers()
      .then(data => { if (active) setTeachers(data); })
      .catch(() => { if (active) setError("講師データを読み込めませんでした。接続設定または公開設定を確認してください。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <main className="advancedSearch withTopbar">
    <header className="advancedSearchHero"><span>FIND YOUR TEACHER</span><h1>先生を探す</h1><p>希望する学び方と条件から、相性のよい講師を探せます。</p></header>
    <section className="searchPanel" aria-label="講師検索条件">
      <div className="searchPanelHeading"><h2>基本条件</h2><button className="searchReset" onClick={clearFilters} type="button">条件をクリア</button></div>
      <div className="searchFieldGrid">
        <label><b>講師の得意な科目</b><select value={filters.subject} onChange={event => update({ subject: event.target.value, topics: [], levels: [] })}>{subjectOptions.map(subject => <option key={subject}>{subject}</option>)}</select></label>
        <fieldset className="searchWide"><legend>講師の得意な指導方法</legend><Chips values={topics} selected={filters.topics} onChange={topics => update({ topics })} /></fieldset>
        <fieldset className="searchWide"><legend>目標</legend><Chips values={levels} selected={filters.levels} onChange={levels => update({ levels })} /></fieldset>
        <fieldset><legend>授業形式</legend><Chips values={lessonTypeOptions} selected={filters.lessonTypes} onChange={lessonTypes => update({ lessonTypes })} /></fieldset>
        <fieldset><legend>授業・相談の方法</legend><Chips values={contactMethodOptions} selected={filters.contactMethods} onChange={contactMethods => update({ contactMethods })} /></fieldset>
        {filters.contactMethods.includes("対面") && <fieldset className="searchWide regionFields"><legend>対応地域</legend><select aria-label="都道府県" value={filters.prefecture} onChange={event => update({ prefecture: event.target.value, city: "" })}><option value="">都道府県を選択</option>{prefectures.map(prefecture => <option key={prefecture}>{prefecture}</option>)}</select><select aria-label="市区町村" value={filters.city} onChange={event => update({ city: event.target.value })} disabled={!filters.prefecture}><option value="">市区町村を選択</option>{cities.map(city => <option key={city}>{city}</option>)}</select></fieldset>}
        <fieldset className="searchWide"><legend>募集状況</legend><div className="searchChecks"><label><input checked={filters.recruitmentStatuses.includes("受付中")} onChange={() => update({ recruitmentStatuses: toggleValue(filters.recruitmentStatuses, "受付中") })} type="checkbox" />募集中の講師のみ</label><label><input checked={filters.recruitmentStatuses.includes("条件付き")} onChange={() => update({ recruitmentStatuses: toggleValue(filters.recruitmentStatuses, "条件付き") })} type="checkbox" />条件付きで受付中の講師を含む</label><label><input checked={filters.recruitmentStatuses.includes("募集停止中")} onChange={() => update({ recruitmentStatuses: toggleValue(filters.recruitmentStatuses, "募集停止中") })} type="checkbox" />募集停止中の講師も表示する</label></div></fieldset>
        <label><b>料金</b><div className="priceRange"><select aria-label="料金の下限" value={filters.minPrice} onChange={event => update({ minPrice: event.target.value })}><option value="">下限なし</option><option value="0">無料</option><option value="1000">1,000円</option><option value="2000">2,000円</option><option value="3000">3,000円</option></select>から<select aria-label="料金の上限" value={filters.maxPrice} onChange={event => update({ maxPrice: event.target.value })}><option value="">上限なし</option><option value="1000">1,000円</option><option value="2000">2,000円</option><option value="3000">3,000円</option><option value="5000">5,000円</option></select></div></label>
        <div className="searchChecks feeChecks"><label><input checked={filters.freeConsultation} onChange={event => update({ freeConsultation: event.target.checked })} type="checkbox" />無料相談あり</label><label><input checked={filters.initialFree} onChange={event => update({ initialFree: event.target.checked })} type="checkbox" />初回無料あり</label></div>
      </div>
      <button className="searchApply" onClick={applyFilters} type="button">この条件で検索する</button>{applied && <p className="searchApplied">選択したラベルを講師データベースの検索条件に適用しました。</p>}
    </section>
    <button className="moreSearchToggle" aria-expanded={more} onClick={() => setMore(!more)}>さらに詳しく探す <span>{more ? "−" : "＋"}</span></button>
    {more && <section className="searchPanel detailedSearch"><h2>詳細条件</h2><div className="searchFieldGrid"><fieldset><legend>講師の得意科目のタイプ <small>最大2つ</small></legend><Chips values={subjectTypeOptions} selected={filters.teachingTypes} onChange={teachingTypes => update({ teachingTypes })} limit={2} /></fieldset><fieldset><legend>授業の進め方</legend><Chips values={lessonStyleOptions} selected={filters.lessonStyles} onChange={lessonStyles => update({ lessonStyles })} /></fieldset><fieldset className="searchWide"><legend>資格・認定 <small>講師の自己申告ラベル</small></legend><Chips values={qualificationLabelOptions} selected={filters.qualificationLabels} onChange={qualificationLabels => update({ qualificationLabels })} /></fieldset><fieldset><legend>授業外サポート</legend><div className="searchChecks">{["質問対応あり", "添削対応あり", "学習管理あり"].map(option => <label key={option}><input checked={filters.supportOptions.includes(option)} onChange={() => update({ supportOptions: toggleValue(filters.supportOptions, option) })} type="checkbox" />{option}</label>)}</div></fieldset></div><button className="searchApply" onClick={applyFilters} type="button">詳細条件を適用する</button></section>}
    <DirectoryResults teachers={teachers} loading={loading} error={error} filters={appliedFilters} onStartChat={onStartChat} />
    <section className="concernSearch"><span>SEARCH BY CONCERN</span><h2>悩みから探す</h2><div>{[["英語", ["長文の点数が安定しない", "感覚で読んでいて、解答根拠を説明できない", "英作文を添削してほしい", "英文法を基礎から学び直したい", "英検対策をしてほしい", "TOEIC対策をしてほしい", "一問だけ質問したい"]], ["数学", ["計算ミスが多い", "公式は覚えているが使い方が分からない", "解説を読んでも理解できない", "証明問題が苦手", "共通テスト対策をしたい", "難関大学の記述対策をしたい", "一問だけ質問したい"]], ["学習全般", ["勉強方法を相談したい", "学習計画を立ててほしい", "進路について相談したい", "志望校を決めたい", "面接練習をしたい", "志望理由書を添削してほしい"]]].map(([title, values]) => <article key={title as string}><h3>{title}</h3><ul>{(values as string[]).map(value => <li key={value}><button>{value}</button></li>)}</ul></article>)}</div></section>
  </main>;
}
