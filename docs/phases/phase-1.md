# Phase 1: 認証

## ゴール

Google アカウントでログインでき、ログインしたユーザーだけが見られるページがある状態。
最後にクラウド（Supabase + Vercel）へデプロイし、本番でもログインできることを確認する。

タスク管理の機能はこのフェーズでは作らない。認証だけを独立して完成させる。

## スコープ

| 含む                                              | 含まない                            |
| ------------------------------------------------- | ----------------------------------- |
| Supabase のローカル環境構築                       | タスク・プロジェクトの CRUD         |
| Google OAuth によるログイン / ログアウト          | `workspaces` / `tasks` などのテーブル |
| `profiles` テーブルとサインアップ時の自動作成     | 招待・メンバー管理                  |
| 未ログイン時のリダイレクト（ルート保護）          | プロフィール編集画面                |
| クラウド（Supabase + Vercel）へのデプロイ         | 独自ドメイン                        |

`workspaces` / `workspace_members` は、タスクを作る次フェーズで追加する。
タスクがまだ存在しない以上、いま作っても RLS の正しさを検証できないため。

## 技術構成

| 要素             | 使うもの                                                  |
| ---------------- | --------------------------------------------------------- |
| 認証             | Supabase Auth（Google OAuth プロバイダ）                  |
| クライアント生成 | `@supabase/ssr`                                           |
| セッション更新   | Next.js Middleware                                        |
| コールバック処理 | Route Handler（`/auth/callback`）                         |
| ローカル環境     | `npx supabase start`（Docker）                            |

### なぜ `@supabase/ssr` が要るか

Supabase のセッションは Cookie に保持される。App Router では
Server Component / Route Handler / Middleware / Client Component で
Cookie の読み書き方法がそれぞれ違うため、素の `@supabase/supabase-js` だけでは
サーバー側でログイン状態を判定できない。`@supabase/ssr` はこの差異を吸収する。

クライアントは用途ごとに 3 つ作り、`src/lib/supabase/` に置く。

| ファイル        | 用途                                       |
| --------------- | ------------------------------------------ |
| `server.ts`     | Server Component / Server Action から使う  |
| `client.ts`     | Client Component から使う                  |
| `middleware.ts` | Middleware でのセッション更新              |

## 画面構成

| パス             | 内容                                                       |
| ---------------- | ---------------------------------------------------------- |
| `/login`         | 「Google でログイン」ボタンのみ。未ログインでもアクセス可   |
| `/`              | ログイン後のトップ。表示名・アバター・ログアウトボタン      |
| `/auth/callback` | 画面なし。認可コードをセッションに交換して `/` へリダイレクト |

Middleware で `/login` と `/auth/callback` 以外を保護する。
未ログインでアクセスしたら `/login` へ飛ばす。

## データモデル

### `profiles`

| カラム         | 型          | 備考                                    |
| -------------- | ----------- | --------------------------------------- |
| `id`           | uuid        | `auth.users.id` を参照する主キー        |
| `display_name` | text        | Google の氏名を初期値に入れる           |
| `avatar_url`   | text        | Google のアイコン URL                   |
| `timezone`     | text        | 既定値 `Asia/Tokyo`                     |
| `settings`     | jsonb       | 個人設定。既定値 `{}`                   |
| `created_at`   | timestamptz |                                         |
| `updated_at`   | timestamptz | トリガーで更新                          |

Supabase の認証情報は `auth.users` にあるが、このスキーマにはカラムを追加できない。
そのため `public` スキーマに 1 対 1 のテーブルを作り、アプリ固有の情報を持たせる。

### RLS

このフェーズでは「本人のみ参照・更新可」とする。

```sql
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
```

INSERT のポリシーは作らない。行の作成は後述のトリガーが `security definer` で行うため、
ユーザー自身に INSERT を許可する必要がない。

ワークスペースのメンバー間で参照できるようにするのは、共有を実装するフェーズで追加する。

### サインアップ時の自動作成

`auth.users` に行が入った瞬間に `profiles` を作るトリガーを置く。
アプリ側のコードで作ると、作成前に落ちた場合にプロフィールのないユーザーが生まれる。

```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Google から返る氏名とアイコンは `raw_user_meta_data` に入る。
キー名はプロバイダによって異なるため、実装時に実際の値を確認する。

## Google OAuth の設定

Google Cloud Console で OAuth クライアント（種別: ウェブアプリケーション）を作成し、
承認済みのリダイレクト URI を 2 つ登録する。

| 環境     | リダイレクト URI                                       |
| -------- | ------------------------------------------------------ |
| ローカル | `http://127.0.0.1:54321/auth/v1/callback`              |
| クラウド | `https://<project-ref>.supabase.co/auth/v1/callback`   |

リダイレクト先は Next.js ではなく **Supabase** である点に注意する。
Google → Supabase → アプリ、の順に戻ってくる。

クライアント ID とシークレットは `supabase/config.toml` の
`[auth.external.google]` に設定するが、**シークレットは直接書かず環境変数を参照する**。
`config.toml` はコミットするファイルのため。

### アクセス制限

OAuth の同意画面は**公開ステータスを「テスト中」のままにし、
ログインを許可する Google アカウントをテストユーザーに登録する**（最大 100 件）。
テストユーザー以外は OAuth フローを完了できないため、実装なしでアクセスを制限できる。

| ステータス | ログインできる人           |
| ---------- | -------------------------- |
| テスト中   | 登録したテストユーザーのみ |
| 本番       | Google アカウントを持つ全員 |

Google Workspace の「内部」は組織ドメインに限定できるが、Workspace 契約が前提のため
個人アカウントでは選択できない。

注意点:

- **この設定はリポジトリの外にある。** 「本番公開したつもりがテスト中のままだった」
  「テストユーザーの追加漏れで家族がログインできない」が起きうる
- **塞げるのは Google 経由の入口だけ。** 将来メールリンクなど別方式を足すとそちらは素通りになる。
  そのため手順 11 で Supabase 側の新規サインアップも無効化し、二重に閉じる
- 「テスト中」では Google のリフレッシュトークンが 7 日で失効するが、
  Supabase はログイン時に一度トークンを受け取ったあとは自前のセッションを発行するため、
  ログイン状態の維持には影響しない

> `config.toml` のキー名や既定ポートは CLI のバージョンで変わりうる。
> 現在の手元のバージョンは 2.116.0。実装時に生成されたファイルを確認する。

## 環境変数

| 変数名                          | 用途                             |
| ------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase の API URL              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon キー                        |
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID`| Google OAuth クライアント ID     |
| `SUPABASE_AUTH_GOOGLE_SECRET`   | Google OAuth シークレット        |

`.env.local` はコミットしない。`.env.example` に変数名だけを残す。

## 作業手順

| #   | 内容                                                              |
| --- | ----------------------------------------------------------------- |
| 1   | Docker Desktop を起動し、`supabase init` / `supabase start`       |
| 2   | Google Cloud Console で OAuth クライアントを作成し、自分をテストユーザーに登録 |
| 3   | `config.toml` に Google プロバイダを設定し、再起動して疎通確認    |
| 4   | `@supabase/ssr` を導入し、クライアント 3 種を作成                 |
| 5   | `profiles` のマイグレーションとトリガーを作成、型を生成           |
| 6   | `/login` と `/auth/callback` を実装                               |
| 7   | Middleware でルート保護                                           |
| 8   | `/` にプロフィール表示とログアウトを実装                          |
| 9   | RLS のテストを書く                                                |
| 10  | Supabase クラウドにプロジェクトを作り、マイグレーションを適用     |
| 11  | Vercel にデプロイして本番でログインを確認し、新規サインアップを無効化 |

## 完了条件

- [ ] ローカルで Google アカウントによるログイン・ログアウトができる
- [ ] 初回ログイン時に `profiles` の行が自動生成される
- [ ] 未ログインで `/` にアクセスすると `/login` へリダイレクトされる
- [ ] 他人の `profiles` を読めないことがテストで確認できている
- [ ] クラウドにデプロイした環境でもログインできる
- [ ] クラウド環境で、意図しないアカウントが作成できない状態になっている
      （Google 側はテスト中のまま、Supabase 側は新規サインアップ無効）

## 残課題

- プロフィール編集画面は作らない（表示のみ）
- `workspaces` / `workspace_members` は次フェーズで追加する
- Phase 0 から持ち越し: `.gitattributes` による改行コードの正規化、ブランチ保護ルール
