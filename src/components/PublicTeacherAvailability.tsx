import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { formatAvailabilityTime, getPublicTeacherAvailability, type TeacherAvailabilityNote } from "../lib/teacherAvailability";
import "../teacher-availability.css";

const label = (date: string) => new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`));
export function PublicTeacherAvailability({ teacherProfileId }: { teacherProfileId: string }) {
  const [notes, setNotes] = useState<TeacherAvailabilityNote[]>([]);
  useEffect(() => { let active = true; void getPublicTeacherAvailability(teacherProfileId).then(data => { if (active) setNotes(data.slice(0, 10)); }).catch(() => undefined); return () => { active = false; }; }, [teacherProfileId]);
  return <section className="publicTeacherAvailability"><header><span>AVAILABILITY</span><h3><CalendarDays /> 対応可能な日程</h3><p>下記は講師が登録した目安です。予約は申請後、講師の承認で確定します。</p></header>{notes.length ? <ul>{notes.map(item => <li key={item.id}><time>{label(item.available_on)}</time><b>{formatAvailabilityTime(item)}</b><span>{item.note || "対応可能"}</span></li>)}</ul> : <p className="availabilityEmpty">現在公開されている対応可能日程はありません。チャットでご相談ください。</p>}</section>;
}
