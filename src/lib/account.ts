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
    teacherFeaturesEnabled: row.role === "teacher" && emailVerified && (row.account_status === "pending_phone" || row.account_status === "active"),
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
    // Supabaseの登録確認メール内のOTPは email 型として検証する。
    // resend の用途（signup）と verifyOtp の検証種別は異なる。
    type: "email",
  });
  if (error) throw error;
}

/** パスワード再設定用のメールOTPを送る。メール本文は {{ .Token }} を使う。 */
export async function sendPasswordResetCode(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/** 再設定メール用OTPを検証し、Supabaseが発行する再設定セッションを開始する。 */
export async function verifyPasswordResetCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error) throw error;
}

export async function updateMyPassword(password: string): Promise<void> {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/**
 * ログイン失敗回数とロックアウトをサーバーで管理するログイン処理。
 * 直接の signInWithPassword は使わず、成功時のセッションだけを受け取る。
 */
export async function signInWithPasswordLocked(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error("Supabaseの接続設定が見つかりません。");
  const { data, error } = await supabase.functions.invoke("password-login", { body: { email, password } });
  if (error) {
    const context = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const body = context?.json ? await context.json().catch(() => null) : null;
    if (body?.error === "Email not confirmed") throw new Error("Email not confirmed");
    throw new Error(body?.error ?? "ログインできませんでした。時間をおいてお試しください。");
  }
  const session = data?.session as { access_token?: string; refresh_token?: string } | undefined;
  if (!session?.access_token || !session.refresh_token) throw new Error("ログイン情報を受け取れませんでした。");
  const { error: sessionError } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  if (sessionError) throw sessionError;
}
