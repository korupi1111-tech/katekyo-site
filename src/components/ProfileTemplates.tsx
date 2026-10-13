import { useEffect, type ReactNode } from "react";
import { ChevronRight, Crown, X } from "lucide-react";

export type ProfileTemplateData = {
  avatarSrc: string;
  avatarAlt: string;
  identityLabel: string;
  name: string;
  targetLabel: string;
  title: string;
  titleAccent?: string;
  detailTitle?: string;
  currentRank: string;
  highestRank: string;
  qualifications: string[];
  qualificationVerified?: boolean;
  mockExamResult: string;
  mockExamVerified?: boolean;
  education: string;
  educationVerified?: boolean;
  contactMethod: string;
  gender: string;
  teachingExperience: string;
  lessonFormat: string;
  recruitmentStatus: string;
  priceUnit?: string;
  priceText: string;
  priceNote: string;
  seasonLessons: number | string;
  totalLessons: number | string;
  matchRate: number | string | null;
  mainSubject: string;
  strengths: string;
  limitations: string;
  targetDescription: string;
  targetLevel: string;
  teachingPolicy: string;
  teachingType: string;
  otherSubjectsLine: string;
  extraSubjectsLine: string;
  lessonDescription: string;
  recommendations: string[];
  notRecommendations: string[];
  paceDescription: string;
  homeworkDescription: string;
  teacherMessage: ReactNode;
};

const rankBadgeSources: Record<string, string> = { R: "/rank-r.png", SR: "/rank-sr.png", SSR: "/rank-ssr.png" };

export function ProfileRankBadge({ rank }: { rank: string }) {
  const normalizedRank = rank.trim().toUpperCase();
  const src = rankBadgeSources[normalizedRank];
  return src ? <img className="rankBadge" src={src} alt={`${normalizedRank}ランク`} /> : <strong>{rank}</strong>;
}

/* This is the single source of truth for the card used on the home page and in search. */
export function PublicProfileCard({ profile: sourceProfile, open }: { profile: ProfileTemplateData; open: () => void }) {
  const profile = sourceProfile.identityLabel === "SITE OWNER" ? { ...sourceProfile, priceUnit: "60分", priceNote: "メール無料相談開放中！" } : sourceProfile;
  return <button className="ownerPublicCard" type="button" onClick={open}><header className="ownerCompactHeader"><div className="ownerPublicCurrentRank"><small>今季ランク</small><ProfileRankBadge rank={profile.currentRank}/></div><img src={profile.avatarSrc} alt={profile.avatarAlt}/><div className="ownerCompactIdentity"><small className="ownerIdentityLine"><Crown aria-hidden="true"/><b>{profile.identityLabel}</b><i aria-hidden="true"/><strong>{profile.name}</strong><span>{profile.targetLabel}</span></small><h2>{profile.title}</h2><div className="ownerQualificationRow"><span><b>資格：</b>{profile.qualifications.map(qualification=><span className="ownerVerifiedQualification" key={qualification}>{qualification}{profile.qualificationVerified && <i className="ownerVerifiedCheck" aria-label="確認済み">✓</i>}</span>)}</span><span className="ownerHighestRank"><b>過去最高ランク</b><ProfileRankBadge rank={profile.highestRank}/></span></div><p className="ownerScore"><b>模試成績：</b>{profile.mockExamResult}{profile.mockExamVerified && <i className="ownerVerifiedCheck" aria-label="確認済み">✓</i>}</p></div><aside className="ownerCompactMeta"><p><b>学歴：</b>{profile.education}{profile.educationVerified && <i className="ownerVerifiedCheck" aria-label="確認済み">✓</i>}</p><p><b>担当可能方式：</b>{profile.contactMethod}</p><div><span><b>性別：</b>{profile.gender}</span><span><b>指導歴：</b>{profile.teachingExperience}</span><span><b>授業形式：</b>{profile.lessonFormat}</span><span><b>状態：</b>{profile.recruitmentStatus}</span></div></aside><div className="ownerPriceStack"><small className="ownerPriceUnit">{profile.priceUnit}</small><strong>{profile.priceText}</strong><span>{profile.priceNote}</span></div><span className="ownerFavorite" aria-label="お気に入り登録" title="お気に入り登録">☆</span></header><section className="ownerPublicResults"><h3>実績</h3><div><p><b>{profile.seasonLessons}</b><span>今季授業数</span></p><p><b>{profile.totalLessons}</b><span>総授業数</span></p><p><b>{profile.matchRate === null ? "−" : profile.matchRate}</b><span>プロフィール一致率<br/><small>プロフィール通りの授業が行われているかを示します。</small></span></p></div></section><section className="ownerPublicAreas"><article><h3>① 専門分野</h3><p><b>メイン科目：</b>{profile.mainSubject}</p><p><b>得意分野：</b>{profile.strengths}</p><p><b>不得意分野：</b>{profile.limitations}</p></article><article><h3>② 対象生徒</h3><p>{profile.targetDescription}</p><p className="ownerTargetLevel">{profile.targetLevel}</p></article><article><h3>③ 指導方針</h3><p>{profile.teachingPolicy}</p><p><b>{profile.teachingType}</b></p></article><article><h3>他に教えられる科目</h3><p>{profile.otherSubjectsLine}</p><p>{profile.extraSubjectsLine}</p></article></section><span className="ownerPublicDetail">講師プロフィールを見る <ChevronRight/></span></button>;
}

/* This is the matching single source of truth for the opened profile detail. */
export function ProfileDetailContent({ profile: sourceProfile }: { profile: ProfileTemplateData }) {
  const profile = sourceProfile.identityLabel === "SITE OWNER" ? { ...sourceProfile, priceUnit: "60分", priceNote: "メール無料相談開放中！" } : sourceProfile;
  return <div className="ownerProfileModal"><header className="ownerProfileHero"><img src={profile.avatarSrc} alt={profile.avatarAlt}/><div className="ownerProfileRank"><ProfileRankBadge rank={profile.currentRank}/><span>現在・過去最高ランク</span></div><div><small className="ownerIdentityLine"><Crown aria-hidden="true"/><b>{profile.identityLabel}</b><i aria-hidden="true"/><strong>{profile.name}</strong><span>{profile.targetLabel}</span></small><h2>{profile.titleAccent && <em>{profile.titleAccent}</em>}{profile.detailTitle ?? profile.title}</h2><p><b>メイン科目：</b>{profile.mainSubject}　 <b>ターゲット：</b>{profile.targetLabel}</p><p className="ownerProfileCurrentStatus"><b>状態：</b>{profile.recruitmentStatus}</p></div></header><section className="ownerProfileQuickFacts" aria-label="問い合わせ前の確認情報"><article><span>受付状態</span><b>{profile.recruitmentStatus}</b></article><article><span>対応方法</span><b>{profile.contactMethod}</b></article><article><span>料金</span><b>{profile.priceText} <small>{profile.priceUnit}　{profile.priceNote}</small></b></article></section><section className="ownerProfileResults ownerProfileResultsCompact"><h3>実績</h3><div><p><b>{profile.seasonLessons}</b><span>今季授業数</span></p><p><b>{profile.totalLessons}</b><span>総授業数</span></p><p><b>{profile.matchRate === null ? "−" : profile.matchRate}</b><span>プロフィール一致率</span></p></div><p className="ownerProfileResultsNote">現在は活動開始前のため、授業実績・評価を蓄積中です。</p></section><section className="ownerProfileLong"><h3>授業形式</h3><p>{profile.lessonDescription}</p><div className="ownerProfileColumns"><section><h3>こんな生徒におすすめです</h3><ul>{profile.recommendations.map(item=><li key={item}>{item}</li>)}</ul></section><section><h3>こんな生徒にはおすすめしません</h3><ul>{profile.notRecommendations.map(item=><li key={item}>{item}</li>)}</ul></section></div><section className="ownerProfileStrictness"><h3>授業の厳しさ</h3><p><b>授業速度：</b>{profile.paceDescription}</p><p><b>宿題量：</b>{profile.homeworkDescription}</p></section><section className="ownerProfileUnsupported"><h3>非対応</h3><p>{profile.limitations}</p></section><section className="ownerProfileMessage"><h3>講師からのメッセージ</h3>{profile.teacherMessage}</section></section></div>;
}

/* Shared outer shell too: both profile details close, scroll, and position identically. */
export function ProfileModalShell({ profile, close, onContact, onFavorite, favoriteLabel, availability }: { profile: ProfileTemplateData; close: () => void; onContact?: () => void; onFavorite?: () => void; favoriteLabel?: string; availability?: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [close]);

  return <div className="overlay" onClick={close}><article className="modal ownerProfileDialog" onClick={event => event.stopPropagation()}><button className="close" type="button" onClick={close} aria-label="閉じる"><X/></button><ProfileDetailContent profile={profile}/>{availability}<div className="ownerProfileActions">{onFavorite && <button className="ownerFavoriteButton" type="button" onClick={onFavorite}>{favoriteLabel ?? "☆ お気に入りに追加"}</button>}<button className="ownerInquiry" type="button" onClick={onContact}>この先生に問い合わせる</button></div></article></div>;
}
