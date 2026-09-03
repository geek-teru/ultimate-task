import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * profiles の RLS が他人のデータを守れているかのテスト。
 *
 * Studio や psql は管理者権限で接続するため RLS を無視する。
 * 「Studio で見えるから大丈夫」は検証にならないので、
 * 実際にユーザーを作り、そのユーザーとして PostgREST 越しに叩く。
 *
 * ローカルの Supabase が起動している必要がある（npm run test:rls）。
 */

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type TestUser = { client: SupabaseClient; user: User };

function createAnonClient() {
  // persistSession を切らないと、複数ユーザーが同じストレージを奪い合う。
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpTestUser(): Promise<TestUser> {
  const client = createAnonClient();
  const { data, error } = await client.auth.signUp({
    email: `rls-test-${crypto.randomUUID()}@example.com`,
    password: crypto.randomUUID(),
  });

  if (error) throw error;
  // ローカルはメール確認が自動承認されるため、この時点でセッションを持つ。
  if (!data.user) throw new Error("ユーザーが作成されなかった");

  return { client, user: data.user };
}

describe("profiles の RLS", () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    if (!url || !publishableKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY が設定されていない");
    }
    alice = await signUpTestUser();
    bob = await signUpTestUser();
  });

  it("サインアップするとプロフィールが自動生成される", async () => {
    const { data, error } = await alice.client.from("profiles").select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(alice.user.id);
  });

  it("他人のプロフィールは取得できない", async () => {
    const { data, error } = await alice.client.from("profiles").select("id").eq("id", bob.user.id);

    // RLS は権限エラーではなく「0 件」として返る。
    // エラーにならないぶん、テストが無いと漏れに気づけない。
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("他人のプロフィールは更新できない", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .update({ display_name: "乗っ取り" })
      .eq("id", bob.user.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("未ログインでは何も取得できない", async () => {
    const { data, error } = await createAnonClient().from("profiles").select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
