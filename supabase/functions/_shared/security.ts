import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const textEncoder = new TextEncoder();

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map(value => value.trim()).filter(Boolean);
  if (!origin || !allowedOrigins.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, x-supabase-client, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

export function json(request: Request, body: Record<string, unknown>, status = 200) {
  const headers = corsHeaders(request);
  return new Response(JSON.stringify(body), { status, headers: headers ?? { "Content-Type": "application/json; charset=utf-8" } });
}

export function allowCorsPreflight(request: Request) {
  const headers = corsHeaders(request);
  return headers ? new Response("ok", { headers }) : new Response("Origin not allowed", { status: 403 });
}

export function requestHasAllowedOrigin(request: Request) {
  return Boolean(corsHeaders(request));
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export async function consumeRateLimit(scope: string, subject: string, limit: number, seconds: number) {
  const admin = adminClient();
  if (!admin) throw new Error("server_configuration_missing");
  const { data, error } = await admin.rpc("consume_edge_rate_limit", {
    p_scope: scope,
    p_subject_hash: await sha256(subject),
    p_limit: limit,
    p_window_seconds: seconds,
  });
  if (error) throw error;
  return data === true;
}

export async function verifyTurnstile(token: unknown, request: Request) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return { ok: false, configurationError: true };
  if (typeof token !== "string" || token.length < 20) return { ok: false, configurationError: false };
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", clientIp(request));
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return { ok: false, configurationError: false };
  const result = await response.json() as { success?: boolean };
  return { ok: result.success === true, configurationError: false };
}
