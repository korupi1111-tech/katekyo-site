import { useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, FolderPlus, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createColumnFolder, deleteColumn, deleteColumnFolder, deleteColumnImage, getColumnImageUrl, getMyColumns,
  getPublishedColumnsByAuthor, getTeacherPublishedColumns, moveColumnToFolder, renameColumnFolder, saveColumn,
  uploadColumnImage, type AuthorWithColumns, type ColumnAuthor, type ColumnFolder, type TeacherColumn,
} from "../lib/teacherColumns";
import "../columns.css";

const excerpt = (body: string) => body.replace(/\s+/g, " ").trim().slice(0, 80);
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }) : "";

function AuthorBadge({ author }: { author: ColumnAuthor }) {
  return <span className="colAuthor">{author.avatarUrl ? <img src={author.avatarUrl} alt="" /> : <span className="colAvatarFallback" aria-hidden="true">{author.name.slice(0, 1)}</span>}<span><b>{author.name}</b><small>{author.mainSubject}</small></span></span>;
}

function ColumnCard({ column, onOpen }: { column: TeacherColumn; onOpen: () => void }) {
  const image = getColumnImageUrl(column.imagePath);
  return <button type="button" className="colCard" onClick={onOpen}>
    {image ? <img src={image} alt="" loading="lazy" /> : <span className="colCardPlaceholder" aria-hidden="true">“</span>}
    <b>{column.title}</b>
    <span className="colCardExcerpt">{excerpt(column.body)}</span>
    <small>{formatDate(column.publishedAt)}</small>
  </button>;
}

/** コラム一覧に並べる、講師ごとのまとまり。 */
export function ColumnAuthorGroups({ onOpenColumn, onOpenTeacher }: { onOpenColumn: (column: TeacherColumn, author: ColumnAuthor) => void; onOpenTeacher: (teacherProfileId: string) => void }) {
  const [groups, setGroups] = useState<AuthorWithColumns[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; getPublishedColumnsByAuthor().then(value => { if (active) setGroups(value); }).catch(() => { if (active) setError("コラムを読み込めませんでした。時間をおいて再読み込みしてください。"); }); return () => { active = false; }; }, []);
  if (error) return <p className="colState">{error}</p>;
  if (!groups) return <p className="colState">コラムを読み込んでいます。</p>;
  return <>{groups.map(group => <section className="colGroup" key={group.teacherProfileId}>
    <header><AuthorBadge author={group} /><button type="button" className="colTextButton" onClick={() => onOpenTeacher(group.teacherProfileId)}>この講師のコラムをすべて見る（{group.columns.length}本）</button></header>
    <div className="colGrid">{group.columns.slice(0, 3).map(column => <ColumnCard key={column.id} column={column} onOpen={() => onOpenColumn(column, group)} />)}</div>
  </section>)}</>;
}

/** 1人の講師のコラムページ。フォルダごとに並べる。 */
export function TeacherColumnsView({ teacherProfileId, onOpenColumn, onBack }: { teacherProfileId: string; onOpenColumn: (column: TeacherColumn, author: ColumnAuthor) => void; onBack: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeacherPublishedColumns>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; getTeacherPublishedColumns(teacherProfileId).then(value => { if (active) setData(value); }).catch(() => { if (active) setError("コラムを読み込めませんでした。"); }); return () => { active = false; }; }, [teacherProfileId]);
  if (error) return <p className="colState">{error}</p>;
  if (!data) return <p className="colState">コラムを読み込んでいます。</p>;
  if (!data.author || !data.columns.length) return <div className="colState"><p>公開中のコラムはまだありません。</p><button type="button" className="colTextButton" onClick={onBack}>コラム一覧に戻る</button></div>;
  const author = data.author;
  const sections = [...data.folders.map(folder => ({ key: folder.id, name: folder.name, columns: data.columns.filter(column => column.folderId === folder.id) })), { key: "none", name: data.folders.length ? "その他のコラム" : "", columns: data.columns.filter(column => !column.folderId || !data.folders.some(folder => folder.id === column.folderId)) }].filter(section => section.columns.length);
  return <div className="colTeacher">
    <button type="button" className="colTextButton" onClick={onBack}>コラム一覧に戻る</button>
    <header className="colTeacherHead"><AuthorBadge author={author} /><p>{data.columns.length}本のコラム</p></header>
    {sections.map(section => <section className="colGroup" key={section.key}>{section.name && <h3>{section.name}</h3>}<div className="colGrid">{section.columns.map(column => <ColumnCard key={column.id} column={column} onOpen={() => onOpenColumn(column, author)} />)}</div></section>)}
  </div>;
}

export function ColumnReader({ column, author, onBack, onOpenTeacher }: { column: TeacherColumn; author: ColumnAuthor; onBack: () => void; onOpenTeacher: () => void }) {
  const image = getColumnImageUrl(column.imagePath);
  return <article className="colReader">
    <button type="button" className="colTextButton" onClick={onBack}>戻る</button>
    <h2>{column.title}</h2>
    <div className="colReaderMeta"><AuthorBadge author={author} /><small>{formatDate(column.publishedAt)}</small></div>
    {image && <img className="colReaderImage" src={image} alt="" />}
    <div className="colReaderBody">{column.body.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    <button type="button" className="colButton outline" onClick={onOpenTeacher}>{author.name}のコラムをもっと読む</button>
  </article>;
}

type Draft = { id: string | null; title: string; body: string; imagePath: string | null; folderId: string | null; isPublished: boolean };
const emptyDraft = (folderId: string | null): Draft => ({ id: null, title: "", body: "", imagePath: null, folderId, isPublished: false });

function ColumnEditor({ draft: initial, folders, onDone }: { draft: Draft; folders: ColumnFolder[]; onDone: (message: string) => void }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const uploadedPaths = useRef<string[]>([]);
  const image = getColumnImageUrl(draft.imagePath);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setMessage("");
    try { const path = await uploadColumnImage(file); uploadedPaths.current.push(path); setDraft(value => ({ ...value, imagePath: path })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "写真をアップロードできませんでした。"); }
    finally { setBusy(false); }
  };

  const save = async (isPublished: boolean) => {
    if (!draft.title.trim()) { setMessage("タイトルを入力してください。"); return; }
    if (isPublished && !draft.body.trim()) { setMessage("本文を入力してから公開してください。"); return; }
    setBusy(true); setMessage("");
    try {
      await saveColumn(draft.id, { title: draft.title, body: draft.body, imagePath: draft.imagePath, folderId: draft.folderId, isPublished });
      // 使われなかった写真は片付ける。
      await Promise.all(uploadedPaths.current.filter(path => path !== draft.imagePath).map(path => deleteColumnImage(path).catch(() => undefined)));
      if (initial.imagePath && initial.imagePath !== draft.imagePath) await deleteColumnImage(initial.imagePath).catch(() => undefined);
      onDone(isPublished ? "コラムを公開しました。" : "下書きを保存しました。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存できませんでした。"); setBusy(false); }
  };

  return <div className="colEditor">
    <button type="button" className="colTextButton" onClick={() => onDone("")}>保存せずに戻る</button>
    <label className="colField"><span>タイトル</span><input value={draft.title} maxLength={120} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} placeholder="コラムのタイトル" /></label>
    <div className="colField"><span>写真（1枚まで）</span>
      {image ? <div className="colImagePreview"><img src={image} alt="" /><div><label className="colButton outline small">写真を変える<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void pickImage(event.target.files?.[0])} /></label><button type="button" className="colTextButton" onClick={() => setDraft(value => ({ ...value, imagePath: null }))}>写真を外す</button></div></div>
        : <label className="colImageDrop"><ImagePlus aria-hidden="true" />写真を選ぶ（JPEG・PNG・WebP、5MBまで）<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void pickImage(event.target.files?.[0])} /></label>}
    </div>
    <label className="colField"><span>本文</span><textarea value={draft.body} onChange={event => setDraft(value => ({ ...value, body: event.target.value }))} placeholder="本文を入力してください。文字数の制限はありません。空行で段落が分かれます。" /></label>
    <label className="colField"><span>フォルダ</span><select value={draft.folderId ?? ""} onChange={event => setDraft(value => ({ ...value, folderId: event.target.value || null }))}><option value="">フォルダなし</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
    <div className="colEditorActions">
      <button type="button" className="colButton" disabled={busy} onClick={() => void save(true)}>{draft.isPublished ? "更新して公開する" : "公開する"}</button>
      <button type="button" className="colButton outline" disabled={busy} onClick={() => void save(false)}>{draft.isPublished ? "非公開にして保存" : "下書きとして保存"}</button>
    </div>
    {message && <p className="colMessage" role="status">{message}</p>}
  </div>;
}

/** 講師マイページから開く、自分のコラムの管理画面。 */
export function ColumnStudioPage({ onBack }: { onBack: () => void }) {
  const [folders, setFolders] = useState<ColumnFolder[]>([]);
  const [columns, setColumns] = useState<TeacherColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const data = await getMyColumns(); setFolders(data.folders); setColumns(data.columns); }
    catch (error) { setMessage(error instanceof Error ? error.message : "コラムを読み込めませんでした。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const addFolder = async () => {
    setMenuOpen(false);
    try { const folder = await createColumnFolder("新しいフォルダ"); setFolders(value => [...value, folder]); setRenaming({ id: folder.id, name: folder.name }); }
    catch { setMessage("フォルダを作成できませんでした。"); }
  };
  const finishRename = async () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    setRenaming(null);
    if (!name) return;
    try { await renameColumnFolder(renaming.id, name); setFolders(value => value.map(folder => folder.id === renaming.id ? { ...folder, name } : folder)); }
    catch { setMessage("フォルダ名を変更できませんでした。"); }
  };
  const removeFolder = async (folder: ColumnFolder) => {
    if (!window.confirm(`フォルダ「${folder.name}」を削除しますか？中のコラムは消えず、「フォルダなし」に戻ります。`)) return;
    try { await deleteColumnFolder(folder.id); await load(); } catch { setMessage("フォルダを削除できませんでした。"); }
  };
  const move = async (columnId: string, folderId: string | null) => {
    setDragOver(null);
    const previous = columns;
    setColumns(value => value.map(column => column.id === columnId ? { ...column, folderId } : column));
    try { await moveColumnToFolder(columnId, folderId); } catch { setColumns(previous); setMessage("コラムを移動できませんでした。"); }
  };
  const remove = async (column: TeacherColumn) => {
    if (!window.confirm(`「${column.title}」を削除しますか？元に戻せません。`)) return;
    try { await deleteColumn(column); setColumns(value => value.filter(item => item.id !== column.id)); } catch { setMessage("コラムを削除できませんでした。"); }
  };

  if (editing) return <main className="colPage withTopbar"><ColumnEditor draft={editing} folders={folders} onDone={text => { setEditing(null); if (text) { setMessage(text); setLoading(true); void load(); } }} /></main>;

  const zones = [...folders.map(folder => ({ id: folder.id, folder })), { id: "none", folder: null as ColumnFolder | null }];
  return <main className="colPage withTopbar">
    <button type="button" className="colTextButton" onClick={onBack}>マイページに戻る</button>
    <header className="colStudioHead">
      <div><h1>あなたのコラム</h1><p>コラムをドラッグしてフォルダに移動できます。公開したコラムは、プロフィールの「この講師のコラム」から読まれます。</p></div>
      <div className="colPlus">
        <button type="button" className="colPlusButton" aria-expanded={menuOpen} aria-label="コラムを書く、またはフォルダを作成" onClick={() => setMenuOpen(value => !value)}><Plus aria-hidden="true" /></button>
        {menuOpen && <div className="colPlusMenu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setEditing(emptyDraft(null)); }}><FilePlus2 aria-hidden="true" />コラムを書く</button>
          <button type="button" role="menuitem" onClick={() => void addFolder()}><FolderPlus aria-hidden="true" />フォルダを作成</button>
        </div>}
      </div>
    </header>
    {message && <p className="colMessage" role="status">{message}</p>}
    {loading ? <p className="colState">読み込んでいます。</p> : <div className="colZones">
      {zones.map(zone => {
        const items = columns.filter(column => zone.folder ? column.folderId === zone.folder.id : !column.folderId);
        if (!zone.folder && !items.length && folders.length) return null;
        return <section key={zone.id} className={`colZone${dragOver === zone.id ? " over" : ""}`}
          onDragOver={event => { event.preventDefault(); setDragOver(zone.id); }}
          onDragLeave={() => setDragOver(value => value === zone.id ? null : value)}
          onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData("text/column-id"); if (id) void move(id, zone.folder?.id ?? null); }}>
          <header>
            {zone.folder ? renaming?.id === zone.folder.id
              ? <input className="colRename" autoFocus value={renaming.name} maxLength={60} onChange={event => setRenaming({ id: renaming.id, name: event.target.value })} onBlur={() => void finishRename()} onKeyDown={event => { if (event.key === "Enter") void finishRename(); if (event.key === "Escape") setRenaming(null); }} aria-label="フォルダ名" />
              : <h2>{zone.folder.name}</h2>
              : <h2>フォルダなし</h2>}
            {zone.folder && renaming?.id !== zone.folder.id && <div className="colZoneActions"><button type="button" onClick={() => setRenaming({ id: zone.folder!.id, name: zone.folder!.name })} aria-label="フォルダ名を変える"><Pencil aria-hidden="true" /></button><button type="button" onClick={() => void removeFolder(zone.folder!)} aria-label="フォルダを削除"><Trash2 aria-hidden="true" /></button></div>}
          </header>
          {items.length ? <ul>{items.map(column => <li key={column.id} draggable onDragStart={event => { event.dataTransfer.setData("text/column-id", column.id); event.dataTransfer.effectAllowed = "move"; }}>
            <button type="button" className="colItemOpen" onClick={() => setEditing({ id: column.id, title: column.title, body: column.body, imagePath: column.imagePath, folderId: column.folderId, isPublished: column.isPublished })}><b>{column.title}</b><small>{column.isPublished ? `公開中　${formatDate(column.publishedAt)}` : "下書き"}</small></button>
            <select aria-label={`「${column.title}」の移動先`} value={column.folderId ?? ""} onChange={event => void move(column.id, event.target.value || null)}><option value="">フォルダなし</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
            <button type="button" className="colIconButton" onClick={() => void remove(column)} aria-label={`「${column.title}」を削除`}><Trash2 aria-hidden="true" /></button>
          </li>)}</ul> : <p className="colEmpty">{zone.folder ? "ここにコラムをドラッグして移動できます。" : "まだコラムがありません。右上の＋から書き始められます。"}</p>}
        </section>;
      })}
    </div>}
  </main>;
}
