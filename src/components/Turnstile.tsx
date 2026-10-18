import { useEffect, useId, useRef } from "react";
import { turnstileSiteKey } from "../lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "light" }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = { onToken: (token: string | null) => void };
/** Cloudflare Turnstile. The site key is public; the secret remains only in Supabase. */
export function Turnstile({ onToken }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const siteKey = turnstileSiteKey;
    if (!siteKey || !container.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "light",
        callback: token => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };
    const existing = document.getElementById("cf-turnstile-script");
    if (window.turnstile) render();
    else if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [onToken]);

  if (!turnstileSiteKey) return <p className="captchaConfiguration" role="alert">ボット対策の設定が完了していません。運営者は環境変数を設定してください。</p>;
  return <div className="turnstile" id={`turnstile-${id}`} ref={container} aria-label="ボット対策" />;
}
