import { useEffect, useState } from "react";
import { getCurrentAccount, type AccountAccess } from "../lib/account";
import { getPublishedDirectoryTeachers } from "../lib/teacherDirectory";
import { supabase } from "../lib/supabase";
import { ContactPage } from "./ContactPage";

// 講師への問い合わせは、講師と直接やりとりせず運営へ送る（創業者決定 2026-10-21）。
// 運営が講師へ連絡したうえで、講師の仕事用メールアドレスを生徒・保護者へ送る。
export function TeacherInquiryPage({ teacherProfileId, onRequireLogin, onBack }: { teacherProfileId: string; onRequireLogin: () => void; onBack: () => void }) {
  const [teacherName, setTeacherName] = useState<string | null | undefined>(undefined);
  const [account, setAccount] = useState<AccountAccess | null | undefined>(undefined);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    void getPublishedDirectoryTeachers()
      .then(list => { if (active) setTeacherName(list.find(item => item.teacher_profile_id === teacherProfileId)?.display_name ?? null); })
      .catch(() => { if (active) setTeacherName(null); });
    void getCurrentAccount().then(async next => {
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (!active) return;
      setAccount(next);
      setEmail(user?.email ?? "");
    }).catch(() => { if (active) setAccount(null); });
    return () => { active = false; };
  }, [teacherProfileId]);

  if (teacherName === undefined || account === undefined) return <main className="contactPage withTopbar"><section><p>講師情報を確認しています…</p></section></main>;
  if (teacherName === null) return <main className="contactPage withTopbar"><section><span>TEACHER INQUIRY</span><h1>この講師は現在公開されていません</h1><p>プロフィールが非公開になったか、URLが正しくない可能性があります。</p><button type="button" onClick={onBack}>講師を探す</button></section></main>;
  if (!account || account.role !== "student") return <main className="contactPage withTopbar"><section><span>TEACHER INQUIRY</span><h1>{teacherName} についてのお問い合わせ</h1><p>講師についてのお問い合わせには、生徒・保護者アカウントでのログインが必要です。登録は無料です。</p><button type="button" onClick={onRequireLogin}>ログイン・新規登録</button></section></main>;
  return <ContactPage teacher={{ id: teacherProfileId, name: teacherName }} initialName={account.displayName} initialEmail={email} />;
}
