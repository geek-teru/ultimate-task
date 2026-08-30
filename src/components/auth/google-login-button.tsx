"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Google へのリダイレクトはブラウザを動かす操作のため、
 * サーバー側からは実行できない。Client Component にする必要がある。
 */
export function GoogleLoginButton() {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setPending(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Google → Supabase → ここ、の順に戻ってくる。
        // この URL は config.toml の additional_redirect_urls と完全一致している必要がある。
        redirectTo: `${window.location.origin}/auth/callback`,
        // ライブラリ任せにせず自分でリダイレクトする。
        // 自動リダイレクトだと、失敗しても画面に何も起きず原因が追えない。
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      console.error("signInWithOAuth failed", error);
      setErrorMessage(error?.message ?? "ログインを開始できませんでした");
      setPending(false);
      return;
    }

    window.location.assign(data.url);
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleClick} disabled={pending} className="w-full">
        {pending ? "リダイレクトしています…" : "Google でログイン"}
      </Button>
      {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
    </div>
  );
}
