import { supabase } from "./supabase";

export type LessonFeedbackKind = "basic" | "profile_check";
export type LessonFeedbackRole = "student" | "teacher";

export type LessonFeedbackReport = {
  id: string;
  reservationId: string;
  respondentRole: LessonFeedbackRole;
  surveyKind: LessonFeedbackKind;
  reportStatus: "pending" | "submitted";
  deliveredAt: string;
  submittedAt: string | null;
  lessonWasHeld: boolean | null;
  issueReasons: string[];
  profileMatched: boolean | null;
  alignmentItems: string[];
  reviewComment: string | null;
  subject: string | null;
  startsAt: string;
  endsAt: string;
};

function requireClient() {
  if (!supabase) throw new Error("Supabaseの接続情報が設定されていません。");
  return supabase;
}

export async function getMyLessonFeedbackReports(): Promise<LessonFeedbackReport[]> {
  const client = requireClient();
  const { data: reports, error: reportError } = await client
    .from("lesson_feedback_reports")
    .select("id, reservation_id, respondent_role, survey_kind, report_status, delivered_at, submitted_at, lesson_was_held, issue_reasons, profile_matched, alignment_items, review_comment")
    .order("delivered_at", { ascending: false });
  if (reportError) throw reportError;
  if (!reports?.length) return [];

  const reservationIds = reports.map(report => report.reservation_id);
  const { data: reservations, error: reservationError } = await client
    .from("lesson_reservations")
    .select("id, subject, starts_at, ends_at")
    .in("id", reservationIds);
  if (reservationError) throw reservationError;
  const byId = new Map((reservations ?? []).map(reservation => [reservation.id, reservation]));

  return reports.flatMap(report => {
    const reservation = byId.get(report.reservation_id);
    if (!reservation) return [];
    return [{
      id: report.id,
      reservationId: report.reservation_id,
      respondentRole: report.respondent_role as LessonFeedbackRole,
      surveyKind: report.survey_kind as LessonFeedbackKind,
      reportStatus: report.report_status as "pending" | "submitted",
      deliveredAt: report.delivered_at,
      submittedAt: report.submitted_at,
      lessonWasHeld: report.lesson_was_held,
      issueReasons: report.issue_reasons ?? [],
      profileMatched: report.profile_matched,
      alignmentItems: report.alignment_items ?? [],
      reviewComment: report.review_comment,
      subject: reservation.subject,
      startsAt: reservation.starts_at,
      endsAt: reservation.ends_at,
    }];
  });
}

export async function submitLessonFeedbackReport(input: {
  reportId: string;
  lessonWasHeld: boolean;
  issueReasons: string[];
  profileMatched?: boolean | null;
  alignmentItems?: string[];
  reviewComment?: string;
  teacherRating?: number | null;
}) {
  const { error } = await requireClient().rpc("submit_lesson_feedback_report", {
    p_report_id: input.reportId,
    p_lesson_was_held: input.lessonWasHeld,
    p_issue_reasons: input.issueReasons,
    p_profile_matched: input.profileMatched ?? null,
    p_alignment_items: input.alignmentItems ?? [],
    p_review_comment: input.reviewComment?.trim() || null,
    p_teacher_rating: input.teacherRating ?? null,
  });
  if (error) throw error;
}
