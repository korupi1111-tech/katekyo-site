import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { addMyTeacherAvailability, deleteMyTeacherAvailability, formatAvailabilityTime, getMyTeacherAvailability, type TeacherAvailabilityNote } from "../lib/teacherAvailability";
import "../teacher-availability.css";

const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (date: string) => new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`));

export function TeacherAvailabilityEditor() {
  const [notes, setNotes] = useState<TeacherAvailabilityNote[]>([]);
  const [availableOn, setAvailableOn] = useState(today());
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("読み込み中です。");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const result = await getMyTeacherAvailability(); setNotes(result.notes); setStatus(result.profileId ? "" : "先に講師プロフィールを保存すると、対応可能な日程を追加できます。"); } catch { setStatus("日程を読み込めませんでした。"); } }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (startsAt && endsAt && startsAt >= endsAt) { setStatus("終了時刻は開始時刻より後にしてください。"); return; } setBusy(true); setStatus(""); try { await addMyTeacherAvailability({ availableOn, startsAt, endsAt, note }); setStartsAt(""); setEndsAt(""); setNote(""); await load(); } catch (error) { setStatus(error instanceof Error ? error.message : "日程を追加できませんでした。"); } finally { setBusy(false); } };
  const remove = async (id: string) => { setBusy(true); setStatus(""); try { await deleteMyTeacherAvailability(id); await load(); } catch { setStatus("日程を削除できませんでした。"); } finally { setBusy(false); } };
  return <section className="teacherAvailabilityEditor"><header><span>AVAILABILITY</span><h2><CalendarDays /> 対応可能な日程</h2><p>生徒に見せる目安の日程です。実際の予約は、申請を承認した時点で確定します。</p></header><form onSubmit={add}><label>日付<input required type="date" min={today()} value={availableOn} onChange={event => setAvailableOn(event.target.value)} /></label><label>開始（任意）<input type="time" value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label>終了（任意）<input type="time" value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label><label className="availabilityNote">補足（任意）<input maxLength={240} value={note} placeholder="例：オンラインのみ・要相談" onChange={event => setNote(event.target.value)} /></label><button disabled={busy} type="submit"><Plus />日程を追加</button></form>{status && <p className="availabilityStatus">{status}</p>}{notes.length > 0 && <ul>{notes.map(item => <li key={item.id}><time>{dateLabel(item.available_on)}</time><b>{formatAvailabilityTime(item)}</b><span>{item.note || "対応可能"}</span><button disabled={busy} type="button" onClick={() => void remove(item.id)} aria-label="この日程を削除"><Trash2 /></button></li>)}</ul>}</section>;
}
