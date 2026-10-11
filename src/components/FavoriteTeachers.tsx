import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { getMyFavoriteTeachers, type FavoriteTeacher } from "../lib/teacherFavorites";

export function FavoriteTeachers() {
  const [teachers, setTeachers] = useState<FavoriteTeacher[]>([]);
  const [status, setStatus] = useState("読み込み中です。");
  useEffect(() => { let active = true; void getMyFavoriteTeachers().then(data => {
    if (!active) return; setTeachers(data); setStatus(data.length ? "" : "まだお気に入りの先生はいません。先生のプロフィールから追加できます。");
  }).catch(() => { if (active) setStatus("お気に入りを読み込めませんでした。"); }); return () => { active = false; }; }, []);
  return <section className="accountFeature favoriteTeachers"><header><span>FAVORITE TEACHERS</span><h2><Heart size={19} fill="currentColor"/> お気に入りの先生</h2><p>プロフィールで保存した先生を一覧で確認できます。</p></header>{status ? <p>{status}</p> : <div>{teachers.map(teacher => <article key={teacher.id}><img src={teacher.avatarUrl ?? "/demo-teacher-avatar.svg"} alt=""/><span><b>{teacher.display_name}</b><small>{teacher.main_subject ?? "個別相談"}</small><em>{teacher.catchphrase}</em></span></article>)}</div>}</section>;
}
