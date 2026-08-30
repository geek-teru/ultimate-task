-- profiles テーブル
--
-- Supabase の認証情報は auth.users にあるが、このスキーマにはカラムを追加できない。
-- そのため public スキーマに 1 対 1 のテーブルを作り、アプリ固有の情報を持たせる。

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'Asia/Tokyo',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'auth.users に 1 対 1 で対応するアプリ側のユーザー情報';

-- updated_at の自動更新
-- アプリ側で毎回セットすると必ず書き忘れが出るため、DB 側で保証する。

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
--
-- 本人のみ参照・更新できる。
-- INSERT のポリシーは作らない。行の作成は下のトリガーが security definer で行うため、
-- ユーザー自身に INSERT を許可する必要がない（権限は最小にする）。
-- 同一ワークスペースのメンバー間で参照できるようにするのは、共有を実装するフェーズで追加する。

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- サインアップ時の自動作成
--
-- Google OAuth ではサインアップとログインが同じフローになり、初回ログイン時に
-- auth.users へ行が作られる。アプリ側で「ログイン → プロフィール作成」と 2 段階にすると、
-- 間で失敗したときにプロフィールを持たないユーザーが生まれる。
-- auth.users への INSERT と同一トランザクションで完結させるためトリガーを使う。

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
  for each row execute function public.handle_new_user();
