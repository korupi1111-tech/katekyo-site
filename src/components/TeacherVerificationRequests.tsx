import { FileCheck2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { getMyTeacherProfile } from "../lib/teacherProfiles";
import { getMyVerificationSubmissions, submitVerificationDocument, type VerificationStatus, type VerificationSubmission, type VerificationType } from "../lib/teacherVerificationRequests";
import "../verification-review.css";
import "../teacher-verification-input.css";

const labels: Record<VerificationType, string> = { education: "学歴", qualification: "資格・成績", mock_exam: "模試成績" };
const statusLabels: Record<VerificationStatus, string> = { pending: "審査待ち", approved: "確認済み", returned: "差し戻し", rejected: "却下" };

type SubmissionForm = { key: string; type: VerificationType; title: string; itemName: string; placeholder: string; isFixedName?: boolean };

const uniqueValues = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];

export function TeacherVerificationRequests() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<VerificationSubmission[]>([]);
  const [forms, setForms] = useState<SubmissionForm[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    try {
      const [submissions, profile] = await Promise.all([getMyVerificationSubmissions(), getMyTeacherProfile()]);
      setItems(submissions);
      if (!profile) {
        setForms([]);
        setMessage("まず講師プロフィールを保存すると、資格・成績を1件ずつ証明書として提出できます。");
        return;
      }

      const qualificationNames = uniqueValues([...(profile.top_qualifications ?? []), ...(profile.qualifications ?? [])]);
      const nextForms: SubmissionForm[] = [
        { key: "education", type: "education", title: labels.education, itemName: profile.education ?? "", placeholder: "例：○○大学○○学部" },
        ...qualificationNames.map((itemName, index) => ({ key: `qualification-${index}-${itemName}`, type: "qualification" as const, title: "資格・成績", itemName, placeholder: "", isFixedName: true })),
        { key: "mock-exam", type: "mock_exam", title: labels.mock_exam, itemName: profile.mock_exam_result ?? "", placeholder: "例：河合模試英語147点" },
      ];
      setForms(nextForms);
      setNames(current => Object.fromEntries(nextForms.map(form => [form.key, current[form.key] ?? form.itemName])));
    } catch {
      setMessage("提出履歴を読み込めませんでした。ログイン状態と接続設定を確認してください。");
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (form: SubmissionForm) => {
    const itemName = (form.isFixedName ? form.itemName : names[form.key] ?? form.itemName).trim();
    const file = files[form.key];
    if (!itemName || !file) {
      setMessage(`${form.title}の名称と証明書ファイルを入力してください。`);
      return;
    }
    setBusyKey(form.key);
    setMessage("");
    try {
      await submitVerificationDocument({ type: form.type, itemName, note: notes[form.key] ?? "", file });
      await load();
      setFiles(current => ({ ...current, [form.key]: undefined }));
      setMessage(`${itemName}を提出しました。審査完了までお待ちください。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提出できませんでした。");
    } finally {
      setBusyKey(null);
    }
  };

  const qualificationForms = forms.filter(form => form.type === "qualification");
  const basicForms = forms.filter(form => form.type !== "qualification");

  return <section className="verificationRequests accountFeature">
    <header><span>VERIFICATION</span><h2><FileCheck2 /> 証明書・確認申請</h2><p>認定マークは、運営が確認した情報だけに表示されます。証明書自体は公開されません。</p><small className="verificationOptionalNote">提出は任意で、特定の資格だけでも大丈夫です。</small></header>
    {!open ? <div className="verificationNotice"><h3>提出前の注意事項</h3><ul><li>提出画像・PDFは審査担当者だけが確認します。公開プロフィールには表示されません。</li><li>JPEG・PNG・WebP・PDF、8MB以下を提出できます。</li><li>プロフィールに登録した資格・成績は、1件ずつ個別に提出できます。</li><li>承認・差し戻し・却下後、証明書ファイルは24時間後に削除されます。提出履歴と審査結果は残ります。</li></ul><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /> 注意事項を確認しました</label><button disabled={!acknowledged} onClick={() => setOpen(true)} type="button">提出画面へ進む</button></div> : <div className="verificationForms">
      {forms.length > 0 && <><div className="verificationBasicForms">{basicForms.map(form => <VerificationForm key={form.key} form={form} name={names[form.key] ?? form.itemName} note={notes[form.key] ?? ""} file={files[form.key]} busy={busyKey === form.key} onNameChange={value => setNames(current => ({ ...current, [form.key]: value }))} onNoteChange={value => setNotes(current => ({ ...current, [form.key]: value }))} onFileChange={file => setFiles(current => ({ ...current, [form.key]: file }))} onSubmit={() => void submit(form)} />)}</div>
        <section className="verificationQualificationGroup"><h3>資格・模試等の成績</h3><p>プロフィールトップの2項目と「その他の資格」を、1件ずつ提出できます。</p>{qualificationForms.length ? <div className="verificationQualificationList">{qualificationForms.map(form => <VerificationForm key={form.key} form={form} name={form.itemName} note={notes[form.key] ?? ""} file={files[form.key]} busy={busyKey === form.key} onNameChange={() => undefined} onNoteChange={value => setNotes(current => ({ ...current, [form.key]: value }))} onFileChange={file => setFiles(current => ({ ...current, [form.key]: file }))} onSubmit={() => void submit(form)} />)}</div> : <p className="verificationEmptyQualification">プロフィールの「資格・模試等の成績」または「その他の資格」を保存すると、ここに1件ずつ表示されます。</p>}</section></>}
    </div>}
    <section className="verificationHistory"><h3>提出履歴</h3>{items.length ? <ul>{items.map(item => <li key={item.id}><div><b>{labels[item.submission_type]}：{item.item_name}</b><small>{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</small></div><span className={`verificationStatus ${item.review_status}`}>{statusLabels[item.review_status]}</span>{item.review_reason && <p>運営からの連絡：{item.review_reason}</p>}</li>)}</ul> : <p>まだ提出はありません。</p>}</section>
    {message && <p className="verificationMessage" role="status">{message}</p>}
  </section>;
}

function VerificationForm({ form, name, note, file, busy, onNameChange, onNoteChange, onFileChange, onSubmit }: { form: SubmissionForm; name: string; note: string; file: File | undefined; busy: boolean; onNameChange: (value: string) => void; onNoteChange: (value: string) => void; onFileChange: (file: File | undefined) => void; onSubmit: () => void }) {
  return <article className={form.isFixedName ? "verificationQualificationCard" : ""}><h3>{form.isFixedName ? form.itemName : form.title}</h3>{form.isFixedName ? <p className="verificationItemName">この資格・成績の証明書を提出します。</p> : <label>提出対象の名称<input value={name} onChange={event => onNameChange(event.target.value)} placeholder={form.placeholder} /></label>}<label>補足説明<textarea maxLength={1000} value={note} onChange={event => onNoteChange(event.target.value)} /></label><label>証明書画像・PDF<input accept="image/jpeg,image/png,image/webp,application/pdf" type="file" onChange={event => onFileChange(event.target.files?.[0])} /></label>{file && <small className="verificationFileName">選択中：{file.name}</small>}<button disabled={busy} type="button" onClick={onSubmit}><Upload />{busy ? "提出中…" : "この項目を提出"}</button></article>;
}
