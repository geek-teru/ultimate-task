import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware が未ログインを弾いているため、ここに来る時点で user は存在する。
  // それでも型上は null を取りうるので、保険として扱う。
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const displayName = profile?.display_name ?? user!.email ?? "名前未設定";
  // Google のメタデータにアイコン URL が含まれない場合があるため、頭文字で代替する。
  const initial = displayName.slice(0, 1);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          {profile?.avatar_url ? (
            // next/image を使わないのは、外部ドメインの許可設定が必要になるため。
            // アイコン 1 枚のために設定を増やす利点が薄い。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="size-16 rounded-full"
              width={64}
              height={64}
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full text-xl font-medium">
              {initial}
            </div>
          )}
          <div className="space-y-1">
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground text-sm">{user!.email}</p>
          </div>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            ログアウト
          </Button>
        </form>
      </div>
    </main>
  );
}
