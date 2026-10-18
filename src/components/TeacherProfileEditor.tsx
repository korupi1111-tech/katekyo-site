import { type FormEvent, useEffect, useState } from "react";
import { getMyTeacherProfile, getTeacherAvatarUrl, prepareTeacherAvatar, saveMyTeacherProfile, uploadMyTeacherAvatar, type TeacherProfileInput, type TeacherProfileRow } from "../lib/teacherProfiles";
import { submitTeacherLabelRequests, type LabelRequestGroup } from "../lib/teacherLabelRequests";
import { supabase } from "../lib/supabase";
import { contactMethodOptions, lessonStyleOptions, lessonTypeOptions, normalizeCombinedContactMethod, qualificationLabelOptions, subjectOptions, topicOptionsForSubject } from "../lib/teacherLabels";
import "../teacher-label-requests.css";
import { TeacherVerificationRequests } from "./TeacherVerificationRequests";

type ProfileListKey = "qualifications" | "strengths" | "limitations" | "targetStudents" | "topQualifications" | "qualificationLabels" | "subjects" | "topics" | "levels" | "lessonTypes" | "contactMethods" | "lessonStyles" | "otherSubjects" | "extraSubjects" | "recommendedFor" | "notRecommendedFor";
type EditorState = Omit<TeacherProfileInput, "priceYen" | ProfileListKey> & Required<Pick<TeacherProfileInput, ProfileListKey>> & { priceYen: string };
type LabelRequestValues = Record<LabelRequestGroup, string>;
type RequiredField = "priceYen" | "recruitmentStatus" | "mainSubject" | "education" | "teachingExperience" | "catchphrase" | "targetStudents" | "lessonTypes";

const emptyLabelRequests = (): LabelRequestValues => ({ subjects: "", topics: "", levels: "", qualification_labels: "", teaching_types: "" });
const labelRequestGroupNames: Record<LabelRequestGroup, string> = { subjects: "講師の得意な科目", topics: "講師の得意な指導方法", levels: "目標", qualification_labels: "資格の検索ラベル", teaching_types: "講師の得意科目のタイプ" };
const eikenGrades = ["1級", "準1級", "2級", "準2級プラス", "準2級", "3級", "4級", "5級"];
const sukenGrades = ["1級", "準1級", "2級", "準2級", "3級", "4級", "5級", "6級", "7級", "8級", "9級", "10級", "11級"];
const kankenGrades = ["1級", "準1級", "2級", "準2級", "3級", "4級", "5級", "6級", "7級", "8級", "9級", "10級"];

const initialProfile: EditorState = {
  publicSlug: "",
  displayName: "",
  catchphrase: "",
  education: "",
  teachingExperience: "",
  qualifications: [],
  mockExamResult: "",
  gender: "",
  lessonFormat: "",
  contactMethod: "",
  recruitmentStatus: "",
  recruitmentDetail: "",
  priceYen: "",
  mainSubject: "",
  strengths: [],
  limitations: [],
  targetStudents: [],
  targetLevel: "",
  topQualifications: [],
  teachingPolicy: "",
  qualificationLabels: [],
  subjects: [],
  topics: [],
  levels: [],
  lessonTypes: [],
  contactMethods: [],
  lessonStyles: [],
  supportsInPerson: false,
  prefecture: "",
  city: "",
  freeConsultation: false,
  initialFree: false,
  otherSubjects: [],
  extraSubjects: [],
  lessonFormatDetail: "",
  recommendedFor: [],
  notRecommendedFor: [],
  homeworkPolicy: "",
  unsupportedContent: "",
  teacherMessage: "",
  avatarPath: null,
  isPublished: false,
};

const splitList = (value: string) => value.split(/[、,\n]/).map(item => item.trim()).filter(Boolean);
const joinList = (value: string[] | undefined) => (value ?? []).join("、");

function toggleLabel(values: string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
}

function normalizeContactMethods(values: string[]) {
  return [...new Set(values.map(normalizeCombinedContactMethod))];
}

function normalizeSubjects(values: string[]) {
  return [...new Set(values.map(value => value === "社会" ? "小学校社会" : value).filter(value => subjectOptions.includes(value)))];
}

function RequiredMark() { return <span className="requiredMark" aria-label="必須">＊</span>; }

function LabelPicker({ label, help, values, selected, onChange, limit, requestValue, onRequestChange, requestScore, onRequestScoreChange, invalid, required }: { label: string; help: string; values: string[]; selected: string[]; onChange: (next: string[]) => void; limit?: number; requestValue?: string; onRequestChange?: (value: string) => void; requestScore?: string; onRequestScoreChange?: (value: string) => void; invalid?: boolean; required?: boolean }) {
  return <fieldset className={`profileLabelPicker${invalid ? " invalid" : ""}`}><legend>{label}{required && <RequiredMark />}</legend><p>{help}</p><div>{values.map(value => <label key={value}><input checked={selected.includes(value)} onChange={() => {
    if (!selected.includes(value) && limit && selected.length >= limit) return;
    onChange(toggleLabel(selected, value));
  }} type="checkbox" />{value}</label>)}</div>{selected.includes("その他") && onRequestChange && <div className="labelRequestField"><label>追加したいラベル<input required value={requestValue ?? ""} onChange={event => onRequestChange(event.target.value)} placeholder="例：英語ディベート" /></label>{onRequestScoreChange && <label>スコア等<input value={requestScore ?? ""} onChange={event => onRequestScoreChange(event.target.value)} placeholder="例：CSE 2300、900点" /></label>}<small>その他で入力した場合は、ラベル申請として保存され、確認後に今後のラベルへ反映されます。</small></div>}</fieldset>;
}

function toEditorState(profile: TeacherProfileRow): EditorState {
  const mainSubject = profile.main_subject === "社会" ? "小学校社会" : profile.main_subject;
  return {
    publicSlug: profile.public_slug,
    displayName: profile.display_name,
    catchphrase: profile.catchphrase,
    avatarPath: profile.avatar_path,
    education: profile.education,
    teachingExperience: profile.teaching_experience,
    qualifications: profile.qualifications,
    mockExamResult: profile.mock_exam_result,
    gender: profile.gender,
    lessonFormat: profile.lesson_format,
    contactMethod: profile.contact_method ? normalizeCombinedContactMethod(profile.contact_method) : null,
    recruitmentStatus: profile.recruitment_status,
    recruitmentDetail: profile.recruitment_detail,
    priceYen: profile.price_yen?.toString() ?? "",
    mainSubject,
    strengths: profile.strengths,
    limitations: profile.limitations,
    targetStudents: profile.target_students,
    targetLevel: profile.target_level ?? "",
    topQualifications: profile.top_qualifications ?? [],
    teachingPolicy: profile.teaching_policy,
    qualificationLabels: profile.qualification_labels,
    subjects: normalizeSubjects(profile.subjects),
    topics: profile.topics,
    levels: profile.levels,
    lessonTypes: profile.lesson_types,
    contactMethods: normalizeContactMethods(profile.contact_methods),
    lessonStyles: profile.lesson_styles,
    supportsInPerson: profile.supports_in_person,
    prefecture: profile.prefecture ?? "",
    city: profile.city ?? "",
    freeConsultation: profile.free_consultation,
    initialFree: profile.initial_free,
    otherSubjects: profile.other_subjects,
    extraSubjects: profile.extra_subjects,
    lessonFormatDetail: profile.lesson_format_detail,
    recommendedFor: profile.recommended_for,
    notRecommendedFor: profile.not_recommended_for,
    homeworkPolicy: profile.homework_policy,
    unsupportedContent: profile.unsupported_content,
    teacherMessage: profile.teacher_message,
    isPublished: profile.is_published,
  };
}

export function TeacherProfileEditor() {
  const [profile, setProfile] = useState<EditorState>(initialProfile);
  const [status, setStatus] = useState("ログインすると、ここからプロフィールを保存できます。");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [labelRequests, setLabelRequests] = useState<LabelRequestValues>(emptyLabelRequests);
  const [qualificationOtherScore, setQualificationOtherScore] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<RequiredField>>(new Set());

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabase) {
        if (active) { setStatus("Supabaseの接続情報が設定されていません。"); setLoading(false); }
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (active) { setStatus("講師ログイン後に、入力内容を保存できます。"); setLoading(false); }
        return;
      }
      try {
        const savedProfile = await getMyTeacherProfile();
        if (active && savedProfile) setProfile(toEditorState(savedProfile));
        if (active && !savedProfile) {
          const givenName = typeof data.user.user_metadata.given_name_kana === "string" ? data.user.user_metadata.given_name_kana : "";
          const registeredGender = data.user.user_metadata.gender === "男性" || data.user.user_metadata.gender === "女性" ? data.user.user_metadata.gender : "";
          setProfile(current => ({ ...current, publicSlug: `teacher-${data.user.id.slice(0, 12)}`, displayName: givenName ? `${givenName}先生` : "", gender: registeredGender }));
        }
        if (active) setStatus(savedProfile ? "保存済みのプロフィールを読み込みました。" : "新しい講師プロフィールを作成できます。");
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const clearInvalid = (...keys: RequiredField[]) => setInvalidFields(current => {
    const next = new Set(current);
    keys.forEach(key => next.delete(key));
    return next;
  });
  const updateText = (key: keyof EditorState, value: string) => {
    setProfile(current => ({ ...current, [key]: value }));
    if (["priceYen", "recruitmentStatus", "mainSubject", "education", "teachingExperience", "catchphrase"].includes(key)) clearInvalid(key as RequiredField);
  };
  const updateList = (key: keyof EditorState, value: string) => {
    setProfile(current => ({ ...current, [key]: splitList(value) }));
    if (key === "targetStudents") clearInvalid("targetStudents");
  };
  const update = (values: Partial<EditorState>) => setProfile(current => ({ ...current, ...values }));
  const updateLabelRequest = (group: LabelRequestGroup, value: string) => setLabelRequests(current => ({ ...current, [group]: value }));
  const persistProfile = async (nextProfile: EditorState) => {
    const required = [
      ["priceYen", "時給", nextProfile.priceYen], ["recruitmentStatus", "募集状況", nextProfile.recruitmentStatus], ["mainSubject", "主な得意科目", nextProfile.mainSubject], ["education", "学歴", nextProfile.education], ["teachingExperience", "指導歴", nextProfile.teachingExperience], ["catchphrase", "キャッチコピー", nextProfile.catchphrase], ["targetStudents", "対象生徒", nextProfile.targetStudents.length ? "ok" : ""], ["lessonTypes", "授業形式", nextProfile.lessonTypes.length ? "ok" : ""],
    ] as const;
    const missing = required.filter(([, , value]) => !value);
    if (missing.length) {
      setInvalidFields(new Set(missing.map(([key]) => key)));
      setStatus(`${missing.map(([, label]) => label).join("、")}は必須です。赤い＊の項目を入力してから保存してください。`);
      return;
    }
    if (nextProfile.isPublished && nextProfile.subjects.length === 0) {
      setStatus("公開するには、検索に使う「講師の得意な科目」を1つ以上選んでください。");
      return;
    }
    const labelRequestFieldsForProfile: { group: LabelRequestGroup; selected: string[] }[] = [
      { group: "subjects", selected: nextProfile.subjects }, { group: "topics", selected: nextProfile.topics },
      { group: "qualification_labels", selected: nextProfile.qualificationLabels },
    ];
    const missingLabelRequest = labelRequestFieldsForProfile.find(({ group, selected }) => selected.includes("その他") && !labelRequests[group].trim());
    if (missingLabelRequest) {
      setStatus(`${labelRequestGroupNames[missingLabelRequest.group]}で「その他」を選んだ場合は、追加したいラベル名を入力してください。`);
      return;
    }
    const requestsToSubmit = labelRequestFieldsForProfile.flatMap(({ group, selected }) => selected.includes("その他") && labelRequests[group].trim() ? [{ group, value: group === "qualification_labels" && qualificationOtherScore.trim() ? `${labelRequests[group]}（${qualificationOtherScore.trim()}）` : labelRequests[group] }] : []);
    setSaving(true);
    try {
      const avatarPath = avatarFile ? await uploadMyTeacherAvatar(avatarFile) : nextProfile.avatarPath;
      const saved = await saveMyTeacherProfile({ ...nextProfile, avatarPath, priceYen: nextProfile.priceYen === "" ? null : Number(nextProfile.priceYen) });
      let requestStatus = "";
      if (requestsToSubmit.length) {
        try {
          await submitTeacherLabelRequests(saved.id, requestsToSubmit);
          setLabelRequests(emptyLabelRequests());
          requestStatus = " ラベル申請も保存しました。";
        } catch {
          requestStatus = " プロフィールは保存しましたが、ラベル申請は保存できませんでした。";
        }
      }
      setProfile(toEditorState(saved)); setAvatarFile(null);
      setStatus((nextProfile.isPublished ? "公開プロフィールを保存し、講師検索用データベースに反映しました。" : "公開を取り下げ、下書きとして保存しました。") + requestStatus);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await persistProfile(profile);
  };

  const changePublication = async () => {
    const willPublish = !profile.isPublished;
    // 「主な得意科目」を入力済みなら、公開時の検索用主科目として自動で使う。
    // 同じ内容を二度入力させると、公開だけが止まっている理由が分かりにくいため。
    const subjects = willPublish && profile.subjects.length === 0 && profile.mainSubject
      ? [profile.mainSubject]
      : profile.subjects;
    await persistProfile({ ...profile, subjects, isPublished: willPublish });
  };

  const availableTopics = topicOptionsForSubject(profile.mainSubject ?? "");
  const updateMainSubject = (mainSubject: string) => {
    setProfile(current => ({ ...current, mainSubject, topics: current.topics.filter(topic => topicOptionsForSubject(mainSubject).includes(topic)) }));
    clearInvalid("mainSubject");
  };
  const setDynamicList = (key: "recommendedFor" | "notRecommendedFor" | "qualifications", index: number, value: string) => setProfile(current => {
    const values = [...current[key]]; values[index] = value; return { ...current, [key]: values.filter((item, itemIndex) => item.trim() || itemIndex === index) };
  });
  const addDynamicList = (key: "recommendedFor" | "notRecommendedFor" | "qualifications", limit: number) => setProfile(current => current[key].length >= limit ? current : { ...current, [key]: [...current[key], ""] });
  const removeDynamicList = (key: "recommendedFor" | "notRecommendedFor" | "qualifications", index: number) => setProfile(current => ({ ...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index) }));
  const customQualificationValues = profile.qualifications.length ? profile.qualifications : [""];

  const qualificationDetail = (name: string) => profile.qualifications.find(value => value.startsWith(name))?.slice(name.length).trim() ?? "";
  const setQualificationDetail = (name: string, detail: string) => update({
    qualifications: [...profile.qualifications.filter(value => !value.startsWith(name)), ...(detail.trim() ? [`${name}${["TOEIC", "IELTS"].includes(name) ? " " : ""}${detail.trim()}`] : [])],
  });
  const storedOtherQualificationValues = customQualificationValues.filter(value => !["英検", "数検", "漢検", "TOEIC", "IELTS"].some(name => value.startsWith(name)));
  const customQualificationValuesWithoutSearchDetails = storedOtherQualificationValues.length ? storedOtherQualificationValues : [""];
  const searchQualificationValues = profile.qualifications.filter(value => ["英検", "数検", "漢検", "TOEIC", "IELTS"].some(name => value.startsWith(name)));

  const selectAvatar = async (file: File | null) => {
    if (!file) { setAvatarFile(null); return; }
    try {
      setAvatarFile(await prepareTeacherAvatar(file));
      setStatus("プロフィール画像を正方形・512pxのWebPに加工しました。保存すると反映されます。");
    } catch (error) {
      setAvatarFile(null);
      setStatus(error instanceof Error ? error.message : "画像を加工できませんでした。");
    }
  };

  return <section className="teacherProfileEditor"><header><span>PROFILE EDITOR</span><h2>講師プロフィールを編集</h2><p>{status}</p></header><form onSubmit={save}><div className="profileEditorGrid">
    <label>プロフィール画像<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void selectAvatar(event.target.files?.[0] ?? null)} /><small>中央を正方形に切り抜き、512pxのWebPへ変換して保存します。元画像は送信・保存しません。</small>{profile.avatarPath && !avatarFile && <img className="profileAvatarPreview" src={getTeacherAvatarUrl(profile.avatarPath) ?? ""} alt="プロフィール画像のプレビュー" />}{avatarFile && <small>{avatarFile.name}（保存時に反映）</small>}</label>
    <label className={`wide${invalidFields.has("catchphrase") ? " invalid" : ""}`}>キャッチコピー<RequiredMark /> <small>誰向けで、何を教える講師なのかを一文で書いてください。</small><input required maxLength={20} placeholder="感覚派向け英検長文読解" value={profile.catchphrase} onChange={event => updateText("catchphrase", event.target.value)} /></label>
    <label className={invalidFields.has("education") ? "invalid" : ""}>学歴<RequiredMark /> <small>正式名称をお書きください。</small><input required placeholder="東京大学理科三類" value={profile.education ?? ""} onChange={event => updateText("education", event.target.value)} /></label>
    <label className={invalidFields.has("teachingExperience") ? "invalid" : ""}>指導歴（年）<RequiredMark /><select required value={profile.teachingExperience ?? ""} onChange={event => updateText("teachingExperience", event.target.value)}><option value="">選択</option>{Array.from({ length: 101 }, (_, value) => <option key={value} value={String(value)}>{value}</option>)}</select></label>
    <label>模試成績 <small>1科目のみ、専門とする科目の模試の正式名称と得点をお書きください。</small><input placeholder="2026年度第1回河合塾全統記述模試 英語147点" value={profile.mockExamResult ?? ""} onChange={event => updateText("mockExamResult", event.target.value)} /></label>
    <label>性別<input readOnly value={profile.gender ?? ""} /><small>アカウント登録時の情報です。</small></label>
    <label className={invalidFields.has("priceYen") ? "invalid" : ""}>時給（円）<RequiredMark /><input required type="number" min="0" value={profile.priceYen} onChange={event => updateText("priceYen", event.target.value)} /></label>
    <label className={invalidFields.has("recruitmentStatus") ? "invalid" : ""}>募集状況<RequiredMark /><select required value={profile.recruitmentStatus ?? ""} onChange={event => updateText("recruitmentStatus", event.target.value)}><option value="">選択してください</option><option>受付中</option><option>残り1枠</option><option>募集停止中</option></select></label>
    <label className="wide">募集状況詳細 <small>現在の募集状況について1文で書いてください（30文字まで）。</small><textarea maxLength={30} placeholder="絶賛生徒募集中です！" value={profile.recruitmentDetail ?? ""} onChange={event => updateText("recruitmentDetail", event.target.value)} /></label>
    <label className={invalidFields.has("mainSubject") ? "invalid" : ""}>主な得意科目<RequiredMark /><input required list="teacher-main-subjects" placeholder="英語" value={profile.mainSubject ?? ""} onChange={event => updateMainSubject(event.target.value)} /><datalist id="teacher-main-subjects">{subjectOptions.map(value => <option value={value} key={value}/>)}</datalist></label>
    <label>得意分野<input placeholder="長文読解、ライティング" value={joinList(profile.strengths)} onChange={event => updateList("strengths", event.target.value)} /></label>
    <label>不得意分野<input placeholder="TOEIC対策、文法指導" value={joinList(profile.limitations)} onChange={event => updateList("limitations", event.target.value)} /></label>
    <label>対象生徒の範囲<input placeholder="英検2級〜1級" value={profile.targetLevel ?? ""} onChange={event => updateText("targetLevel", event.target.value)} /></label>
    <label className={`wide${invalidFields.has("targetStudents") ? " invalid" : ""}`}>対象生徒<RequiredMark /> <small>具体的にどのような生徒に主に向けているのかを具体的にお書きください（50文字まで）。</small><textarea required maxLength={50} placeholder="感覚で英文を読む方、長文読解で伸び悩んでいる方" value={joinList(profile.targetStudents)} onChange={event => updateList("targetStudents", event.target.value)} /></label>
    <label className="wide">指導方針 <small>実際の授業内容が想像できるように書いてください。</small><textarea placeholder="授業では、生徒のレベルより少し難度の高い長文を精読し、意味を正確に捉えた全訳を重視します。" value={profile.teachingPolicy ?? ""} onChange={event => updateText("teachingPolicy", event.target.value)} /></label>
    <section className="profileLabelSection wide" aria-labelledby="search-labels-title"><header><span>SEARCH LABELS</span><h3 id="search-labels-title">検索に使うラベル</h3><p>選んだラベルは保存後、公開中の講師検索で絞り込みに使われます。一覧にない内容は「その他」を選べます。</p></header>
      <LabelPicker label="講師の得意な科目" help="検索に使う主な科目です。1つだけ選べます。" values={subjectOptions} selected={profile.subjects} onChange={subjects => update({ subjects })} limit={1} requestValue={labelRequests.subjects} onRequestChange={value => updateLabelRequest("subjects", value)} />
      <LabelPicker label="講師の得意な指導方法" help="例：長文を丁寧に訳せるようにする指導は「長文読解」を選びます。" values={availableTopics} selected={profile.topics} onChange={topics => update({ topics })} requestValue={labelRequests.topics} onRequestChange={value => updateLabelRequest("topics", value)} />
      <div className="profileFreeLabel"><b>プロフィールトップに表示する資格</b><small>自由記述で2個まで。実用英語技能検定は「英検◯級」のように省略してください。</small>{[0, 1].map(index => <div className="profileDynamicInput" key={`top-qualification-${index}`}><input value={profile.topQualifications[index] ?? ""} placeholder={index === 0 ? "例：英検準1級" : "例：TOEIC 910"} onChange={event => { const values = [...profile.topQualifications]; values[index] = event.target.value; update({ topQualifications: values.map(value => value.trim()).filter(Boolean) }); }} /></div>)}</div>
      <LabelPicker label="資格の検索ラベル" help="英検・数検・漢検など、検定の種類で検索するときに使うラベルです。公開プロフィールの資格欄には直接表示されません。複数選択可。" values={qualificationLabelOptions} selected={profile.qualificationLabels} onChange={qualificationLabels => update({ qualificationLabels })} requestValue={labelRequests.qualification_labels} onRequestChange={value => updateLabelRequest("qualification_labels", value)} requestScore={qualificationOtherScore} onRequestScoreChange={setQualificationOtherScore} />
      {(profile.qualificationLabels.includes("英検") || profile.qualificationLabels.includes("数検") || profile.qualificationLabels.includes("漢検") || profile.qualificationLabels.includes("TOEIC") || profile.qualificationLabels.includes("IELTS")) && <div className="profileFreeLabel qualificationDetailFields"><b>資格の級・スコア</b><small>英検・数検・漢検は公式の級から選択します。TOEIC・IELTSはスコアを自由に入力できます。</small>{profile.qualificationLabels.includes("英検") && <label>英検<select value={qualificationDetail("英検")} onChange={event => setQualificationDetail("英検", event.target.value)}><option value="">選択</option>{eikenGrades.map(grade => <option key={grade}>{grade}</option>)}</select></label>}{profile.qualificationLabels.includes("数検") && <label>数検<select value={qualificationDetail("数検")} onChange={event => setQualificationDetail("数検", event.target.value)}><option value="">選択</option>{sukenGrades.map(grade => <option key={grade}>{grade}</option>)}</select></label>}{profile.qualificationLabels.includes("漢検") && <label>漢検<select value={qualificationDetail("漢検")} onChange={event => setQualificationDetail("漢検", event.target.value)}><option value="">選択</option>{kankenGrades.map(grade => <option key={grade}>{grade}</option>)}</select></label>}{profile.qualificationLabels.includes("TOEIC") && <label>TOEICスコア<input value={qualificationDetail("TOEIC")} onChange={event => setQualificationDetail("TOEIC", event.target.value)} placeholder="例：910" /></label>}{profile.qualificationLabels.includes("IELTS") && <label>IELTSスコア<input value={qualificationDetail("IELTS")} onChange={event => setQualificationDetail("IELTS", event.target.value)} placeholder="例：7.0" /></label>}</div>}
      <div className="profileFreeLabel"><b>その他の資格</b><small>講師詳細に表示されます。</small>{customQualificationValuesWithoutSearchDetails.map((value, index) => <div className="profileDynamicInput" key={`qualification-${index}`}><input value={value} placeholder="例：TOEIC L&R 910" onChange={event => { const values = [...customQualificationValuesWithoutSearchDetails]; values[index] = event.target.value; update({ qualifications: [...searchQualificationValues, ...values.filter(Boolean)] }); }} />{customQualificationValuesWithoutSearchDetails.length > 1 && <button type="button" onClick={() => update({ qualifications: [...searchQualificationValues, ...customQualificationValuesWithoutSearchDetails.filter((_, itemIndex) => itemIndex !== index)] })}>削除</button>}</div>)}{customQualificationValuesWithoutSearchDetails.length < 10 && <button type="button" onClick={() => update({ qualifications: [...profile.qualifications, ""] })}>＋ 資格を追加</button>}</div>
      <LabelPicker label="授業形式" help="提供する形式を選びます。" values={lessonTypeOptions} selected={profile.lessonTypes} onChange={lessonTypes => { update({ lessonTypes }); clearInvalid("lessonTypes"); }} invalid={invalidFields.has("lessonTypes")} required />
      <LabelPicker label="授業・相談の方法" help="メールを含む対応方法を選びます。" values={contactMethodOptions} selected={profile.contactMethods} onChange={contactMethods => update({ contactMethods, supportsInPerson: contactMethods.includes("対面") })} />
      {profile.supportsInPerson && <div className="profileLocationFields"><label>都道府県<input value={profile.prefecture ?? ""} onChange={event => updateText("prefecture", event.target.value)} /></label><label>市区町村<input value={profile.city ?? ""} onChange={event => updateText("city", event.target.value)} /></label></div>}
      <LabelPicker label="授業の進め方" help="複数選択できます。" values={lessonStyleOptions} selected={profile.lessonStyles} onChange={lessonStyles => update({ lessonStyles })} />
      <LabelPicker label="他に教えられる科目" help="主な得意科目以外に教えられる科目を、最大6つ選べます。" values={subjectOptions.filter(value => value !== profile.mainSubject)} selected={profile.otherSubjects} onChange={otherSubjects => update({ otherSubjects })} limit={6} />
      <LabelPicker label="その他の科目" help="一応対応している科目を複数選べます。公開プロフィールでは「一応対応している科目」として表示されます。" values={subjectOptions.filter(value => value !== profile.mainSubject && !profile.otherSubjects.includes(value))} selected={profile.extraSubjects} onChange={extraSubjects => update({ extraSubjects })} />
      <div className="profileBooleanLabels"><label><input checked={profile.freeConsultation} onChange={event => update({ freeConsultation: event.target.checked })} type="checkbox" />無料相談あり</label><label><input checked={profile.initialFree} onChange={event => update({ initialFree: event.target.checked })} type="checkbox" />初回無料あり</label></div>
    </section>
    <section className="profileDetailEditor wide"><h3>講師詳細</h3><label>授業形式の詳細<textarea value={profile.lessonFormatDetail ?? ""} onChange={event => updateText("lessonFormatDetail", event.target.value)} /></label><div><b>こんな生徒におすすめです</b><small>自分に合った生徒の特徴をお書きください（最大5つ）。</small>{(profile.recommendedFor.length ? profile.recommendedFor : [""]).map((value, index) => <div className="profileDynamicInput" key={`recommended-${index}`}><input placeholder="読めているがしっかり訳せない方" value={value} onChange={event => setDynamicList("recommendedFor", index, event.target.value)} />{index > 0 && <button type="button" onClick={() => removeDynamicList("recommendedFor", index)}>削除</button>}</div>)}{profile.recommendedFor.length < 5 && <button type="button" onClick={() => addDynamicList("recommendedFor", 5)}>＋ 追加</button>}</div><div><b>こんな生徒にはおすすめしません</b><small>自分の指導方針に合わない生徒の方針をお書きください（最大5つ）。</small>{(profile.notRecommendedFor.length ? profile.notRecommendedFor : [""]).map((value, index) => <div className="profileDynamicInput" key={`not-recommended-${index}`}><input placeholder="英語初学者" value={value} onChange={event => setDynamicList("notRecommendedFor", index, event.target.value)} />{index > 0 && <button type="button" onClick={() => removeDynamicList("notRecommendedFor", index)}>削除</button>}</div>)}{profile.notRecommendedFor.length < 5 && <button type="button" onClick={() => addDynamicList("notRecommendedFor", 5)}>＋ 追加</button>}</div><label>非対応 <small>自由記述・100文字まで</small><textarea maxLength={100} placeholder="TOEIC対策、文法指導" value={profile.unsupportedContent ?? ""} onChange={event => updateText("unsupportedContent", event.target.value)} /></label><label>講師からのメッセージ <small>500文字まで</small><textarea maxLength={500} placeholder="私は幼少期の頃から英語をやってきていて、そのおかげで英語がよくできるようになりました。等のご自分の経験などをお書きください" value={profile.teacherMessage ?? ""} onChange={event => updateText("teacherMessage", event.target.value)} /></label></section>
  </div><div className="profileEditorPublish"><div><b>{profile.isPublished ? "現在公開中です" : "現在は非公開です"}</b><small>{profile.isPublished ? "講師検索に表示されています。" : "公開すると、講師検索に表示されます。"}</small>{status && <p className="profilePublishStatus" role="status">{status}</p>}</div><div className="profileEditorPublishActions"><button type="button" className="publicationButton" onClick={() => void changePublication()} disabled={loading || saving}>{saving ? "保存中…" : profile.isPublished ? "公開を取り下げる" : "公開する"}</button><button type="submit" disabled={loading || saving}>{saving ? "保存中…" : "プロフィールを保存"}</button></div></div></form><TeacherVerificationRequests /></section>;
}
