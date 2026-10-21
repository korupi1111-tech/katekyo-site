import { type FormEvent, useEffect, useState } from "react";
import { getMyTeacherContact, saveMyTeacherContact } from "../lib/teacherProfiles";

// 生徒・保護者からの問い合わせを運営が取り次ぐときに、問い合わせ者へ渡す仕事用メールアドレス（利用規約 第5条の2）。
export function TeacherContactSettings() {
  const [workEmail, setWorkEmail] = useState("");
  const [shareConsent, setShareConsent] = useState(false);
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getMyTeacherContact()
      .then(settings => { if (!active) return; setWorkEmail(settings.workEmail); setShareConsent(settings.shareConsent); setConsentedAt(settings.consentedAt); })
      .catch(() => { if (active) setMessage("設定を読み込めませんでした。時間をおいて再読み込みしてください。"); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      await saveMyTeacherContact(workEmail, shareConsent);
      const settings = await getMyTeacherContact();
      setWorkEmail(settings.workEmail); setShareConsent(settings.shareConsent); setConsentedAt(settings.consentedAt);
      setMessage(settings.shareConsent ? "保存しました。お問い合わせがあった場合、運営からこのアドレスを問い合わせ者へお送りします。" : "保存しました。同意がないため、運営は連絡先を問い合わせ者へ送りません。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存できませんでした。");
    } finally { setBusy(false); }
  };

  return <section className="accountFeature teacherContactSettings">
    <h2>お問い合わせを受けるためのメールアドレス</h2>
    <p>生徒・保護者からのお問い合わせは、まず運営が受け付けます。運営からあなたへ連絡したうえで、ここに登録した仕事用メールアドレスを問い合わせ者へお送りします。このアドレスはプロフィールには表示されず、運営だけが確認できます。</p>
    {!loaded ? <p>読み込み中です…</p> : <form onSubmit={save}>
      <label>仕事用メールアドレス<input type="email" maxLength={254} value={workEmail} onChange={event => setWorkEmail(event.target.value)} placeholder="例：yourname.tutor@gmail.com" autoComplete="email" /></label>
      <label className="teacherContactConsent"><input type="checkbox" checked={shareConsent} onChange={event => setShareConsent(event.target.checked)} /><span>お問い合わせがあった場合に、運営がこのメールアドレスを、お問い合わせをした生徒・保護者へ提供することに同意します。同意はこの欄のチェックを外して保存すれば、いつでも取り消せます（すでに送ったアドレスは回収できません）。</span></label>
      {consentedAt && shareConsent && <small>同意日：{new Date(consentedAt).toLocaleDateString("ja-JP")}</small>}
      <button type="submit" disabled={busy}>{busy ? "保存中…" : "保存する"}</button>
    </form>}
    {message && <p className="teacherContactMessage" role="status">{message}</p>}
  </section>;
}
