import { type FormEvent, useEffect, useState } from "react";
import { getMyTeacherProfile, saveMyTeacherProfile, type TeacherProfileInput, type TeacherProfileRow } from "../lib/teacherProfiles";
import { supabase } from "../lib/supabase";

type EditorState = Omit<TeacherProfileInput, "priceYen"> & { priceYen: string };

const initialProfile: EditorState = {
  publicSlug: "kotaro",
  displayName: "こうたろう先生",
  catchphrase: "感覚派向け英検長文読解",
  education: "現役高校3年生（大学受験中）",
  teachingExperience: "0",
  qualifications: ["英検準1級", "TOEIC L&R 910"],
  mockExamResult: "2026年度第1回河合塾全統記述模試 英語147点",
  gender: "男性",
  lessonFormat: "単発授業・学習相談",
  contactMethod: "メールでの相談",
  recruitmentStatus: "受験のため原則停止中",
  recruitmentDetail: "どうしてもという方のみメッセージにてご連絡ください。",
  priceYen: "0",
  mainSubject: "英語",
  strengths: ["長文読解", "ライティング"],
  limitations: ["TOEIC対策", "文法指導"],
  targetStudents: ["英検2級〜1級", "感覚で英文を読む方", "長文読解で伸び悩んでいる方"],
  teachingPolicy: "生徒のレベルより少し難度の高い長文を精読し、意味を正確に捉えた全訳を重視します。",
  teachingTypes: ["感覚型"],
  otherSubjects: [],
  extraSubjects: [],
  lessonFormatDetail: "単発授業がメインとなり、基本はメールでの相談となります。",
  recommendedFor: ["読めているがしっかり訳せない方", "英検2級〜1級を目指している方"],
  notRecommendedFor: ["英語初学者", "文法を基礎から学びたい人", "TOEIC対策をしたい人"],
  homeworkPolicy: "単語を毎日5分ほど、週に2回の長文（少し難しめ）",
  unsupportedContent: "文法中心の英語学習、初学者、TOEIC対策",
  teacherMessage: "",
  isPublished: false,
};

const splitList = (value: string) => value.split(/[、,\n]/).map(item => item.trim()).filter(Boolean);
const joinList = (value: string[] | undefined) => (value ?? []).join("、");

function toEditorState(profile: TeacherProfileRow): EditorState {
  return {
    publicSlug: profile.public_slug,
    displayName: profile.display_name,
    catchphrase: profile.catchphrase,
    education: profile.education,
    teachingExperience: profile.teaching_experience,
    qualifications: profile.qualifications,
    mockExamResult: profile.mock_exam_result,
    gender: profile.gender,
    lessonFormat: profile.lesson_format,
    contactMethod: profile.contact_method,
    recruitmentStatus: profile.recruitment_status,
    recruitmentDetail: profile.recruitment_detail,
    priceYen: profile.price_yen?.toString() ?? "",
    mainSubject: profile.main_subject,
    strengths: profile.strengths,
    limitations: profile.limitations,
    targetStudents: profile.target_students,
    teachingPolicy: profile.teaching_policy,
    teachingTypes: profile.teaching_types,
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

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveMyTeacherProfile({ ...profile, priceYen: profile.priceYen === "" ? null : Number(profile.priceYen) });
      setStatus(profile.isPublished ? "公開プロフィールを保存しました。" : "下書きを保存しました。公開するには「公開する」を選択して保存してください。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return <section className="teacherProfileEditor"><header><span>PROFILE EDITOR</span><h2>講師プロフィールを編集</h2><p>{status}</p></header><form onSubmit={save}><div className="profileEditorGrid"><label>表示名<input required value={profile.displayName} onChange={event => updateText("displayName", event.target.value)} /></label><label>公開URL用ID<input required pattern="[a-z0-9-]{3,80}" value={profile.publicSlug} onChange={event => updateText("publicSlug", event.target.value.toLowerCase())} /><small>半角英小文字・数字・ハイフンのみ</small></label><label className="wide">キャッチコピー<input required value={profile.catchphrase} onChange={event => updateText("catchphrase", event.target.value)} /></label><label>学歴<input value={profile.education ?? ""} onChange={event => updateText("education", event.target.value)} /></label><label>指導歴<input value={profile.teachingExperience ?? ""} onChange={event => updateText("teachingExperience", event.target.value)} /></label><label>資格<input value={joinList(profile.qualifications)} onChange={event => updateList("qualifications", event.target.value)} /></label><label>模試成績<input value={profile.mockExamResult ?? ""} onChange={event => updateText("mockExamResult", event.target.value)} /></label><label>性別<input value={profile.gender ?? ""} onChange={event => updateText("gender", event.target.value)} /></label><label>料金（円）<input type="number" min="0" value={profile.priceYen} onChange={event => updateText("priceYen", event.target.value)} /></label><label>授業形式<input value={profile.lessonFormat ?? ""} onChange={event => updateText("lessonFormat", event.target.value)} /></label><label>対応方法<input value={profile.contactMethod ?? ""} onChange={event => updateText("contactMethod", event.target.value)} /></label><label>募集状況<input value={profile.recruitmentStatus ?? ""} onChange={event => updateText("recruitmentStatus", event.target.value)} /></label><label className="wide">募集状況詳細<textarea value={profile.recruitmentDetail ?? ""} onChange={event => updateText("recruitmentDetail", event.target.value)} /></label><label>メイン科目<input value={profile.mainSubject ?? ""} onChange={event => updateText("mainSubject", event.target.value)} /></label><label>得意分野<input value={joinList(profile.strengths)} onChange={event => updateList("strengths", event.target.value)} /></label><label>不得意分野<input value={joinList(profile.limitations)} onChange={event => updateList("limitations", event.target.value)} /></label><label className="wide">対象生徒<textarea value={joinList(profile.targetStudents)} onChange={event => updateList("targetStudents", event.target.value)} /></label><label className="wide">指導方針<textarea value={profile.teachingPolicy ?? ""} onChange={event => updateText("teachingPolicy", event.target.value)} /></label></div><div className="profileEditorPublish"><label><input type="checkbox" checked={profile.isPublished} onChange={event => setProfile(current => ({ ...current, isPublished: event.target.checked }))} /> 公開する</label><button type="submit" disabled={loading || saving}>{saving ? "保存中…" : "プロフィールを保存"}</button></div></form></section>;
}
