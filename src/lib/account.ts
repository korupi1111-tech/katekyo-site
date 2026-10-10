import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AccountRole = "student" | "teacher";
export type AccountStatus = "pending_email" | "pending_phone" | "active" | "suspended" | "withdrawn";
export type StudentPlan = "free" | "payment_pending" | "paid" | "expired" | "cancelled";

export type AccountAccess = {
  id: string;
  role: AccountRole;
  displayName: string;
  accountStatus: AccountStatus;
  studentPlan: StudentPlan;
  emailVerified: boolean;
  phoneVerified: boolean;
  teacherFeaturesEnabled: boolean;
};

type AccountRow = {
  id: string;
  role: AccountRole;
  display_name: string | null;
  account_status: AccountStatus;
  student_plan: StudentPlan;
  email_verified_at: string | null;
  phone_verified_at: string | null;
};

export function toAccountAccess(user: User, row: AccountRow): AccountAccess {
  const emailVerified = Boolean(user.email_confirmed_at || row.email_verified_at);
  const phoneVerified = Boolean(user.phone_confirmed_at || row.phone_verified_at);
  return {
    id: user.id,
    role: row.role,
    displayName: row.display_name || user.user_metadata.display_name || "ユーザー",
    accountStatus: row.account_status,
    studentPlan: row.student_plan,
    emailVerified,
    phoneVerified,
    teacherFeaturesEnabled: row.role === "teacher" && row.account_status === "active" && emailVerified && phoneVerified,
  };
}

export async function getCurrentAccount(): Promise<AccountAccess | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, role, display_name, account_status, student_plan, email_verified_at, phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? toAccountAccess(user, data as AccountRow) : null;
}

export async function resendConfirmation(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });
  if (error) throw error;
}

/** Supabase が発行した登録メール用OTPを検証する。 */
export async function verifySignupEmailCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
}
