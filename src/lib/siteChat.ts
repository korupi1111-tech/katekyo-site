import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type ChatConversation = {
  id: string;
  teacher_user_id: string;
  student_user_id: string;
  teacher_display_name: string;
  student_display_name: string;
  teacher_subject: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export type PublicTeacherContact = {
  id: string;
  display_name: string;
  main_subject: string | null;
  catchphrase: string;
};

function requireClient() {
  if (!supabase) throw new Error("Supabaseの接続情報が設定されていません。");
  return supabase;
}

export async function getMyChatConversations() {
  const client = requireClient();
  const { data, error } = await client
    .from("chat_conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChatConversation[];
}

export async function getChatMessages(conversationId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function getPublicTeacherContacts() {
  const client = requireClient();
  const { data, error } = await client
    .from("teacher_profiles")
    .select("id, display_name, main_subject, catchphrase")
    .eq("is_published", true)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PublicTeacherContact[];
}

export async function startChatWithTeacher(teacherProfileId: string) {
  const client = requireClient();
  const { data, error } = await client.rpc("start_chat_with_teacher", { target_teacher_profile_id: teacherProfileId });
  if (error) throw error;
  return data as string;
}

export async function sendChatMessage(conversationId: string, body: string) {
  const client = requireClient();
  const text = body.trim();
  if (!text) throw new Error("メッセージを入力してください。");
  if (text.length > 2000) throw new Error("メッセージは2,000文字以内で入力してください。");
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("メッセージを送るにはログインが必要です。");

  const { data, error } = await client
    .from("chat_messages")
    .insert({ conversation_id: conversationId, sender_user_id: authData.user.id, body: text })
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

export function subscribeToChatMessages(conversationId: string, onMessage: () => void): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel(`chat-${conversationId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` }, onMessage)
    .subscribe();
}
