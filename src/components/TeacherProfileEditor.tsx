import { type FormEvent, useEffect, useState } from "react";
import { getMyTeacherProfile, getTeacherAvatarUrl, saveMyTeacherProfile, uploadMyTeacherAvatar, type TeacherProfileInput, type TeacherProfileRow } from "../lib/teacherProfiles";
import { submitTeacherLabelRequests, type LabelRequestGroup } from "../lib/teacherLabelRequests";
import { supabase } from "../lib/supabase";
import { contactMethodOptions, lessonStyleOptions, lessonTypeOptions, levelOptionsForSubject, normalizeCombinedContactMethod, qualificationLabelOptions, qualificationOptions, subjectOptions, subjectTypeOptions, topicOptionsForSubject } from "../lib/teacherLabels";
import "../teacher-label-requests.css";

type ProfileListKey = "qualifications" | "strengths" | "limitations" | "targetStudents" | "teachingTypes" | "qualificationLabels" | "subjects" | "topics" | "levels" | "lessonTypes" | "contactMethods" | "lessonStyles" | "otherSubjects" | "extraSubjects" | "recommendedFor" | "notRecommendedFor";
type EditorState = Omit<TeacherProfileInput, "priceYen" | ProfileListKey> & Required<Pick<TeacherProfileInput, ProfileListKey>> & { priceYen: string };
type LabelRequestValues = Record<LabelRequestGroup, string>;

const emptyLabelRequests = (): LabelRequestValues => ({ subjects: "", topics: "", levels: "", qualification_labels: "", teaching_types: "" });
const labelRequestGroupNames: Record<LabelRequestGroup, string> = { subjects: "講師の得意な科目", topics: "講師の得意な指導方法", levels: "目標", qualification_labels: "資格の検索ラベル", teaching_types: "講師の得意科目のタイプ" };

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
  teachingPolicy: "",
  teachingTypes: [],
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

function normalizeGoals(values: string[], subject: string) {
  const allowedGoals = levelOptionsForSubject(subject);
  return [...new Set(values.map(value => value.startsWith("英検") ? "英検" : value === "基礎から" ? "基礎固め" : value === "学校の授業補習" ? "授業復習" : value === "難関大学受験" ? "大学受験" : value).filter(value => allowedGoals.includes(value)))];
}

function LabelPicker({ label, help, values, selected, onChange, limit, requestValue, onRequestChange }: { label: string; help: string; values: string[]; selected: string[]; onChange: (next: string[]) => void; limit?: number; requestValue?: string; onRequestChange?: (value: string) => void }) {
  return <fieldset className="profileLabelPicker"><legend>{label}</legend><p>{help}</p><div>{values.map(value => <label key={value}><input checked={selected.includes(value)} onChange={() => {
    if (!selected.includes(value) && limit && selected.length >= limit) return;
    onChange(toggleLabel(selected, value));
  }} type="checkbox" />{value}</label>)}</div>{selected.includes("その他") && onRequestChange && <div className="labelRequestField"><label>追加したいラベル<input required value={requestValue ?? ""} onChange={event => onRequestChange(event.target.value)} placeholder="例：英語ディベート" /></label><small>その他で入力した場合は、ラベル申請として保存され、確認後に今後のラベルへ反映されます。</small></div>}</fieldset>;
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
    teachingPolicy: profile.teaching_policy,
    teachingTypes: profile.teaching_types,
    qualificationLabels: profile.qualification_labels,
    subjects: normalizeSubjects(profile.subjects),
    topics: profile.topics,
    levels: normalizeGoals(profile.levels, mainSubject ?? ""),
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

  const updateText = (key: keyof EditorState, value: string) => setProfile(current => ({ ...current, [key]: value }));
  const updateList = (key: keyof EditorState, value: string) => setProfile(current => ({ ...current, [key]: splitList(value) }));
  const update = (values: Partial<EditorState>) => setProfile(current => ({ ...current, ...values }));
  const updateLabelRequest = (group: LabelRequestGroup, value: string) => setLabelRequests(current => ({ ...current, [group]: value }));
  const labelRequestFields: { group: LabelRequestGroup; selected: string[] }[] = [
    { group: "subjects", selected: profile.subjects }, { group: "topics", selected: profile.topics }, { group: "levels", selected: profile.levels },
    { group: "qualification_labels", selected: profile.qualificationLabels }, { group: "teaching_types", selected: profile.teachingTypes },
  ];

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profile.isPublished && profile.subjects.length === 0) {
      setStatus("公開するには、検索に使う「講師の得意な科目」を1つ以上選んでください。");
      return;
    }
    const missingLabelRequest = labelRequestFields.find(({ group, selected }) => selected.includes("その他") && !labelRequests[group].trim());
    if (missingLabelRequest) {
      setStatus(`${labelRequestGroupNames[missingLabelRequest.group]}で「その他」を選んだ場合は、追加したいラベル名を入力してください。`);
      return;
    }
    const requestsToSubmit = labelRequestFields.flatMap(({ group, selected }) => selected.includes("その他") && labelRequests[group].trim() ? [{ group, value: labelRequests[group] }] : []);
    setSaving(true);
    try {
      const avatarPath = avatarFile ? await uploadMyTeacherAvatar(avatarFile) : profile.avatarPath;
      const saved = await saveMyTeacherProfile({ ...profile, avatarPath, priceYen: profile.priceYen === "" ? null : Number(profile.priceYen) });
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
      setStatus((profile.isPublished ? "公開プロフィールを保存し、講師検索用データベースに反映しました。" : "下書きを保存しました。公開するには「公開する」を選択して保存してください。") + requestStatus);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const selectedQualifications = profile.qualifications.filter(value => qualificationOptions.includes(value));
  const customQualifications = profile.qualifications.filter(value => !qualificationOptions.includes(value));
  const availableTopics = topicOptionsForSubject(profile.mainSubject ?? "");
  const availableGoals = levelOptionsForSubject(profile.mainSubject ?? "");
  const updateMainSubject = (mainSubject: string) => setProfile(current => ({ ...current, mainSubject, topics: current.topics.filter(topic => topicOptionsForSubject(mainSubject).includes(topic)), levels: current.levels.filter(level => levelOptionsForSubject(mainSubject).includes(level)) }));
  const updateQualifications = (values: string[]) => setProfile(current => ({ ...current, qualifications: [...values, ...current.qualifications.filter(value => !qualificationOptions.includes(value))] }));

  return <section className="teacherProfileEditor"><header><span>PROFILE EDITOR</span><h2>講師プロフィールを編集</h2><p>{status}</p></header><form onSubmit={save}><div className="profileEditorGrid">
    <label>プロフィール画像<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setAvatarFile(event.target.files?.[0] ?? null)} /><small>PNG・JPEG・WebP、5MB以下。保存時に反映されます。</small>{profile.avatarPath && !avatarFile && <img className="profileAvatarPreview" src={getTeacherAvatarUrl(profile.avatarPath) ?? ""} alt="プロフィール画像のプレビュー" />}{avatarFile && <small>{avatarFile.name}（保存時に反映）</small>}</label>
    <label className="wide">キャッチコピー<input required value={profile.catchphrase} onChange={event => updateText("catchphrase", event.target.value)} /></label>
    <label>学歴<input value={profile.education ?? ""} onChange={event => updateText("education", event.target.value)} /></label>
    <label>指導歴<input value={profile.teachingExperience ?? ""} onChange={event => updateText("teachingExperience", event.target.value)} /></label>
    <label>模試成績<input value={profile.mockExamResult ?? ""} onChange={event => updateText("mockExamResult", event.target.value)} /></label>
    <label>性別<input readOnly value={profile.gender ?? ""} /><small>アカウント登録時の情報です。</small></label>
    <label>時給（円）<input type="number" min="0" value={profile.priceYen} onChange={event => updateText("priceYen", event.target.value)} /></label>
    <label>募集状況<select value={profile.recruitmentStatus ?? ""} onChange={event => updateText("recruitmentStatus", event.target.value)}><option value="">選択してください</option><option>受付中</option><option>残り1枠</option><option>募集停止中</option></select></label>
    <label className="wide">募集状況詳細<textarea value={profile.recruitmentDetail ?? ""} onChange={event => updateText("recruitmentDetail", event.target.value)} /></label>
    <label>主な得意科目<input list="teacher-main-subjects" value={profile.mainSubject ?? ""} onChange={event => updateMainSubject(event.target.value)} /><datalist id="teacher-main-subjects">{subjectOptions.map(value => <option value={value} key={value}/>)}</datalist></label>
    <label>得意分野<input value={joinList(profile.strengths)} onChange={event => updateList("strengths", event.target.value)} /></label>
    <label>不得意分野<input value={joinList(profile.limitations)} onChange={event => updateList("limitations", event.target.value)} /></label>
    <label className="wide">対象生徒<textarea value={joinList(profile.targetStudents)} onChange={event => updateList("targetStudents", event.target.value)} /></label>
    <label className="wide">指導方針<textarea value={profile.teachingPolicy ?? ""} onChange={event => updateText("teachingPolicy", event.target.value)} /><small>例：「長文をしっかり翻訳できるようになるまでやります」は文章で説明し、検索用ラベルは下で「長文読解」を選びます。</small></label>
    <section className="profileLabelSection wide" aria-labelledby="search-labels-title"><header><span>SEARCH LABELS</span><h3 id="search-labels-title">検索に使うラベル</h3><p>選んだラベルは保存後、公開中の講師検索で絞り込みに使われます。一覧にない内容は「その他」を選べます。</p></header>
      <LabelPicker label="講師の得意な科目" help="複数選択できます。" values={subjectOptions} selected={profile.subjects} onChange={subjects => update({ subjects })} requestValue={labelRequests.subjects} onRequestChange={value => updateLabelRequest("subjects", value)} />
      <LabelPicker label="講師の得意な指導方法" help="例：長文を丁寧に訳せるようにする指導は「長文読解」を選びます。" values={availableTopics} selected={profile.topics} onChange={topics => update({ topics })} requestValue={labelRequests.topics} onRequestChange={value => updateLabelRequest("topics", value)} />
      <LabelPicker label="目標" help="対応できる目標を選びます。英検は級ではなく「英検」を選びます。" values={availableGoals} selected={profile.levels} onChange={levels => update({ levels })} requestValue={labelRequests.levels} onRequestChange={value => updateLabelRequest("levels", value)} />
      <LabelPicker label="資格の検索ラベル" help="自己申告の検索用分類です。例：英検準1級なら「英語資格」「英検」、TOEICなら「英語資格」「TOEIC」を選びます。確認済み表示とは別です。" values={qualificationLabelOptions} selected={profile.qualificationLabels} onChange={qualificationLabels => update({ qualificationLabels })} requestValue={labelRequests.qualification_labels} onRequestChange={value => updateLabelRequest("qualification_labels", value)} />
      <LabelPicker label="資格・認定の内容" help="保有する資格や認定を選びます。" values={qualificationOptions} selected={selectedQualifications} onChange={updateQualifications} />
      <label className="profileFreeLabel">その他の資格・認定<input value={joinList(customQualifications)} onChange={event => setProfile(current => ({ ...current, qualifications: [...current.qualifications.filter(value => qualificationOptions.includes(value)), ...splitList(event.target.value)] }))} /><small>一覧にない資格名・点数・補足はこちらへ入力できます。</small></label>
      <LabelPicker label="授業形式" help="提供する形式を選びます。" values={lessonTypeOptions} selected={profile.lessonTypes} onChange={lessonTypes => update({ lessonTypes })} />
      <LabelPicker label="授業・相談の方法" help="メッセージとメールは一つの方法として扱います。" values={contactMethodOptions} selected={profile.contactMethods} onChange={contactMethods => update({ contactMethods, supportsInPerson: contactMethods.includes("対面") })} />
      {profile.supportsInPerson && <div className="profileLocationFields"><label>都道府県<input value={profile.prefecture ?? ""} onChange={event => updateText("prefecture", event.target.value)} /></label><label>市区町村<input value={profile.city ?? ""} onChange={event => updateText("city", event.target.value)} /></label></div>}
      <LabelPicker label="講師の得意科目のタイプ" help="主なタイプを最大2つ選びます。" values={subjectTypeOptions} selected={profile.teachingTypes} onChange={teachingTypes => update({ teachingTypes })} limit={2} requestValue={labelRequests.teaching_types} onRequestChange={value => updateLabelRequest("teaching_types", value)} />
      <LabelPicker label="授業の進め方" help="複数選択できます。" values={lessonStyleOptions} selected={profile.lessonStyles} onChange={lessonStyles => update({ lessonStyles })} />
      <div className="profileBooleanLabels"><label><input checked={profile.freeConsultation} onChange={event => update({ freeConsultation: event.target.checked })} type="checkbox" />無料相談あり</label><label><input checked={profile.initialFree} onChange={event => update({ initialFree: event.target.checked })} type="checkbox" />初回無料あり</label></div>
    </section>
  </div><div className="profileEditorPublish"><label><input type="checkbox" checked={profile.isPublished} onChange={event => setProfile(current => ({ ...current, isPublished: event.target.checked }))} /> 公開する</label><button type="submit" disabled={loading || saving}>{saving ? "保存中…" : "プロフィールを保存"}</button></div></form></section>;
}
