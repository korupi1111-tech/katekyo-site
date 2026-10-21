import type { PostHog } from "posthog-js";

// 利用状況の分析（docs/architecture/analytics.md）。
// 氏名・メールアドレス・User ID・講師IDは送らない。Cookie を使わず、自動収集と録画は無効にする。
// VITE_POSTHOG_KEY が未設定の環境では何も送らない。
const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const posthogHost = "https://us.i.posthog.com";

type AnalyticsEvent = "landing" | "page_view" | "signup_started" | "signup_completed" | "teacher_detail_opened" | "chat_started" | "report_submitted" | "teacher_inquiry_opened" | "teacher_inquiry_submitted";
type AnalyticsProperties = Record<string, string>;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queued: [AnalyticsEvent, AnalyticsProperties | undefined][] = [];

function load(): Promise<PostHog | null> {
  if (!posthogKey) return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_flags: true,
      person_profiles: "identified_only",
      // URLのクエリとハッシュ、URL内の講師IDは送らない（UTMは送信前に別項目として取り出される）。
      before_send: event => {
        if (!event) return event;
        const sanitize = (properties: Record<string, unknown> | undefined) => {
          if (!properties) return;
          for (const [key, value] of Object.entries(properties)) {
            if (typeof value === "string" && /(url|referrer|pathname)$/.test(key)) properties[key] = value.split(/[?#]/)[0].replace(/\/(inquiry|columns\/teacher)\/[^/]+/, "/$1/:id");
            else if (value && typeof value === "object" && !Array.isArray(value)) sanitize(value as Record<string, unknown>);
          }
        };
        sanitize(event.properties);
        sanitize(event.$set);
        sanitize(event.$set_once);
        return event;
      },
    });
    client = posthog;
    for (const [event, properties] of queued.splice(0)) posthog.capture(event, properties);
    return posthog;
  }).catch(() => null);
  return loading;
}

export function track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (!posthogKey) return;
  if (client) { client.capture(event, properties); return; }
  queued.push([event, properties]);
  void load();
}

/** 初回表示。UTM と参照元は PostHog が各イベントに自動で付ける。 */
export function trackLanding(): void {
  track("landing");
}
