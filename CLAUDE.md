# Ultimate Task

## プロジェクト概要

「究極のタスク管理アプリ」。PC でキーボードだけで高速に扱えることを最優先とし、
タスクそのものの表現力（階層・繰り返し・優先度・期日・ラベル・保存ビュー）を厚く作り込む。

最終的な一般公開を視野に入れつつ、まずは少人数（自分＋数名）で共有して使える状態を目指す。

### プロダクトの原則

1. **キーボードから手を離させない** — 追加・編集・完了・移動をすべてショートカットで完結させる
2. **入力は 1 アクション** — どの画面からでも 1 キーでタスクを追加できる
3. **タスクの表現力で勝負する** — 見た目の派手さより、階層と繰り返しとフィルタの作り込み
4. **最初からマルチユーザー前提のデータ設計** — 後から共有・公開へ広げられるスキーマにする

## 要件サマリ（決定事項）

| 項目         | 決定                                                              |
| ------------ | ----------------------------------------------------------------- |
| 利用者       | まずは少人数で共有。将来的に一般公開する                          |
| 提供形態     | Web アプリ（PC ブラウザ中心）                                     |
| UI 方針      | Linear / Things 風。キーボード高速操作・コマンドパレット・ミニマル |
| 重点機能     | 階層タスク、繰り返し、優先度・期日、ラベル、フィルタと保存ビュー   |
| AI 連携      | 初期スコープ外。Phase 8 で追加する（差し替え可能な形にしておく）   |
| ホスティング | Vercel + Supabase クラウド                                        |
| ダークモード | 対応する（システム設定に追従＋手動切替）                          |

## 技術スタック

| カテゴリ              | 技術                                 | 備考                                     |
| --------------------- | ------------------------------------ | ---------------------------------------- |
| フレームワーク        | Next.js 16 (App Router)              | Server Components をデフォルトとする     |
| 言語                  | TypeScript (strict)                  |                                          |
| スタイリング          | Tailwind CSS                         |                                          |
| UI コンポーネント     | shadcn/ui (Radix UI ベース)          | 生成後は自前コードとして管理する         |
| アイコン              | lucide-react                         |                                          |
| コマンドパレット      | cmdk                                 | Cmd/Ctrl + K                             |
| ショートカット        | react-hotkeys-hook                   | スコープ管理付き                         |
| BaaS                  | Supabase                             | PostgreSQL / Auth / RLS / Realtime       |
| Supabase クライアント | @supabase/ssr, @supabase/supabase-js | Server / Client で生成関数を分ける       |
| データベース          | PostgreSQL (Supabase)                |                                          |
| スキーマ管理          | Supabase CLI マイグレーション        | `supabase/migrations/*.sql` を手書き     |
| 型生成                | `supabase gen types typescript`      | `src/types/database.types.ts` (編集禁止) |
| バリデーション        | Zod                                  | Server Actions の入力検証に必須          |
| フォーム              | React Hook Form + Zod                | 複雑なフォームのみ使用                   |
| 日付処理              | date-fns                             | タイムゾーンは Asia/Tokyo を既定とする   |
| 繰り返しルール        | rrule                                | RFC 5545 の RRULE 文字列を DB に保存     |
| 並び替え              | dnd-kit                              | キーボード操作でも並び替え可能にする     |
| テスト (ユニット)     | Vitest + Testing Library             |                                          |
| テスト (E2E)          | Playwright                           | ローカル Supabase に対して実行           |
| Lint / Format         | ESLint + Prettier                    |                                          |
| パッケージマネージャ  | npm                                  |                                          |

## プロジェクト構造

```
ultimate-task/
├── src/
│   ├── app/                      # App Router
│   │   ├── (auth)/               # ログイン・サインアップ
│   │   ├── (app)/                # 認証必須エリア
│   │   │   ├── inbox/
│   │   │   ├── today/
│   │   │   ├── upcoming/
│   │   │   ├── projects/[projectId]/
│   │   │   └── views/[viewId]/   # 保存ビュー
│   │   └── api/                  # Route Handlers (必要な場合のみ)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 由来の汎用コンポーネント
│   │   ├── task/                 # タスク行・詳細パネル・クイックアド
│   │   ├── project/
│   │   └── command/              # コマンドパレット
│   ├── features/                 # 機能単位のロジック
│   │   ├── tasks/
│   │   │   ├── actions.ts        # Server Actions
│   │   │   ├── queries.ts        # データ取得
│   │   │   ├── schema.ts         # Zod スキーマ
│   │   │   └── recurrence.ts     # 繰り返し計算
│   │   ├── projects/
│   │   ├── labels/
│   │   └── views/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts         # Server Component / Action 用クライアント
│   │   │   ├── client.ts         # Client Component 用クライアント
│   │   │   └── middleware.ts     # セッション更新
│   │   ├── quick-add/            # クイックアド構文パーサー
│   │   ├── ordering.ts           # fractional index による並び順
│   │   └── keyboard/             # ショートカット定義
│   └── types/
│       └── database.types.ts     # 自動生成 (編集禁止)
├── supabase/
│   ├── migrations/               # 手書き SQL マイグレーション
│   ├── seed.sql                  # 開発用シードデータ
│   └── config.toml
├── e2e/                          # Playwright
├── docs/
│   └── phases/                   # 各フェーズの設計・作業記録
└── CLAUDE.md
```

## データモデル（初期スキーマ）

将来の共有・公開に耐えるよう、**最初からワークスペース単位**でデータを持つ。
個人利用時は「自分だけがメンバーのワークスペース」がサインアップ時に自動生成される。

| テーブル            | 役割                                                            |
| ------------------- | --------------------------------------------------------------- |
| `profiles`          | `auth.users` の拡張（表示名、アバター、タイムゾーン、設定 JSON） |
| `workspaces`        | データの所有単位。すべてのテーブルが `workspace_id` を持つ       |
| `workspace_members` | ユーザーとワークスペースの紐付け。`role`: owner / admin / member  |
| `projects`          | タスクの入れ物。`name`, `color`, `position`, `archived_at`       |
| `tasks`             | 本体。下記参照                                                   |
| `labels`            | ワークスペース単位のラベル。`name`, `color`                      |
| `task_labels`       | tasks と labels の中間テーブル                                   |
| `saved_views`       | ユーザーごとの保存ビュー。`filter` (jsonb), `sort`, `position`   |

### `tasks` の主なカラム

| カラム                      | 型               | 備考                                                    |
| --------------------------- | ---------------- | ------------------------------------------------------- |
| `id`                        | uuid             |                                                         |
| `workspace_id`              | uuid             | RLS の判定軸。全行必須                                  |
| `project_id`                | uuid null        | null は Inbox 扱い                                      |
| `parent_task_id`            | uuid null        | サブタスク。階層の深さは最大 3 段まで（アプリ側で制限） |
| `title`                     | text             |                                                         |
| `description`               | text null        | Markdown                                                |
| `status`                    | text             | `todo` / `doing` / `done`                               |
| `priority`                  | int              | 0 = なし, 1 = 低, 2 = 中, 3 = 高                        |
| `due_at`                    | timestamptz null | `due_all_day` が true なら時刻部分は無視する            |
| `due_all_day`               | boolean          |                                                         |
| `position`                  | text             | fractional index。並び替えを 1 行 UPDATE で済ませる     |
| `assignee_id`               | uuid null        | Phase 6 の共有で使用                                    |
| `recurrence_rule`           | text null        | RRULE 文字列                                            |
| `recurrence_parent_id`      | uuid null        | 繰り返しから生成されたタスクの元タスク                  |
| `completed_at`              | timestamptz null |                                                         |
| `deleted_at`                | timestamptz null | 論理削除。ゴミ箱から復元できるようにする                |
| `created_by`                | uuid             |                                                         |
| `created_at` / `updated_at` | timestamptz      | `updated_at` はトリガーで更新                           |

### RLS 方針

- **すべてのテーブルで RLS を有効化する。例外を作らない。**
- 判定は「そのワークスペースのメンバーか」で行う。再帰的な RLS 参照を避けるため、
  `security definer` 関数 `public.is_workspace_member(workspace_id uuid)` を用意してポリシーから呼ぶ。
- `profiles` は本人のみ更新可、同一ワークスペースのメンバーは参照可。
- RLS はあくまで最後の砦。**Server Actions 側でも所属チェックを必ず書く**（二重防御）。

## キーボード操作仕様

このアプリの中核。実装時は必ずこの表を参照し、勝手に割り当てを変えない。
追加・変更する場合は本ファイルを更新してから実装する。

| キー                | 動作                                      |
| ------------------- | ----------------------------------------- |
| `Cmd/Ctrl + K`      | コマンドパレットを開く                    |
| `n`                 | クイックアド（どの画面でも新規タスク）    |
| `j` / `k`           | タスクの選択を下 / 上へ移動               |
| `Enter`             | 選択中タスクの詳細を開く                  |
| `e`                 | 完了 / 未完了のトグル                     |
| `Space`             | インライン編集を開始                      |
| `1` `2` `3` `0`     | 優先度を 高 / 中 / 低 / なし に設定       |
| `d`                 | 期日ピッカーを開く                        |
| `t`                 | 期日を今日にする                          |
| `m`                 | プロジェクトを移動                        |
| `l`                 | ラベルを付ける                            |
| `Cmd/Ctrl + ↑/↓`    | 並び順を入れ替える                        |
| `Tab` / `Shift+Tab` | サブタスクにする / 階層を戻す             |
| `/`                 | 検索                                      |
| `g` → `i/t/u/p`     | 移動: Inbox / Today / Upcoming / Projects |
| `Cmd/Ctrl + Z`      | 直前の操作を取り消す（完了・削除・移動）  |
| `Esc`               | 閉じる / 選択解除                         |
| `?`                 | ショートカット一覧                        |

### クイックアド構文

AI を使わずにテキスト入力だけで属性を埋められるようにする。パーサーは自前実装。

```
歯医者 明日 15:00 #私用 !2 @me *買い物
```

| 記法          | 意味                                       |
| ------------- | ------------------------------------------ |
| 日本語の日付  | `今日` `明日` `来週月曜` `3/15` `毎週月曜` |
| `#`           | プロジェクト                               |
| `@`           | 担当者                                     |
| `!1` 〜 `!3`  | 優先度                                     |
| `*`           | ラベル                                     |

> パーサーは `src/lib/quick-add/` に、**入力文字列 → タスク属性オブジェクト**という
> 単一のインターフェースで実装する。Phase 8 で AI パーサーに差し替えられるようにするため、
> この境界を跨ぐ実装をしないこと。

## コーディング規約

### 全般

- 変数・関数は camelCase、コンポーネントと型は PascalCase、ファイルは kebab-case
- `any` を使わない。型が不明な箇所は `unknown` + Zod でナローイングする
- コメントは「なぜそうしたか」を書く。処理の説明は書かない

### Next.js / React

- **Server Components をデフォルト**とし、必要な場合のみ `"use client"` を付ける
- データ取得は Server Components で行い、Client にはデータを props で渡す
- 更新はすべて **Server Actions** 経由。クライアントから Supabase に直接書き込まない
  （Realtime の購読と楽観更新のみクライアント側で行う）
- 体感速度のため、完了・優先度変更・並び替えは `useOptimistic` で楽観更新する
- コンポーネントは 1 ファイル 1 コンポーネント。200 行を超えたら分割を検討する

### Server Actions

- 先頭で必ず次の順に処理する: **① 認証確認 → ② Zod で入力検証 → ③ 所属・権限チェック → ④ 実行**
- 戻り値は `{ ok: true, data }` / `{ ok: false, error }` の判別可能な型に統一する
- 更新後は `revalidatePath` / `revalidateTag` で明示的に再検証する

### Supabase

- スキーマ変更は必ず `supabase migration new <name>` でファイルを作り、SQL を手書きする
- **本番 DB を直接触らない。ダッシュボードからのスキーマ変更も禁止**
- 新しいテーブルを追加したら、同じマイグレーション内で RLS 有効化とポリシーまで書く
- `SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアントへ渡さない。`NEXT_PUBLIC_` を付けない
- 型を変更したら `npm run gen:types` を実行する。生成ファイルは手で編集しない

## 開発コマンド

| コマンド                        | 内容                               |
| ------------------------------- | ---------------------------------- |
| `npm run dev`                   | 開発サーバー起動                   |
| `supabase start`                | ローカル Supabase を起動（Docker） |
| `supabase db reset`             | マイグレーション再適用＋シード投入 |
| `supabase migration new <name>` | マイグレーションファイル作成       |
| `npm run gen:types`             | DB から TypeScript 型を生成        |
| `npm run test`                  | Vitest                             |
| `npm run test:e2e`              | Playwright                         |
| `npm run lint`                  | ESLint                             |

## 環境変数

| 変数名                          | 用途                                     |
| ------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase プロジェクト URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon キー（RLS 前提で公開してよい）      |
| `SUPABASE_SERVICE_ROLE_KEY`     | サーバー側のみ。マイグレーション等で使用 |

`.env.local` は Git にコミットしない。`.env.example` に変数名だけを残す。

## テスト方針

| 対象                                      | 手段                    |
| ----------------------------------------- | ----------------------- |
| クイックアド構文パーサー                  | Vitest                  |
| 繰り返しルールの次回日時計算              | Vitest                  |
| 並び順 (fractional index) の計算          | Vitest                  |
| Server Actions のバリデーションと権限判定 | Vitest                  |
| RLS が他人のデータを守れているか          | Playwright / SQL テスト |
| 主要導線（追加 → 完了 → フィルタ）        | Playwright              |

ロジックのテストを厚く、UI のスナップショットテストは書かない。
**RLS のテストは必ず書く**（公開時に最も事故が起きる箇所のため）。

## 開発フェーズ

| Phase | 内容                                                                     |
| ----- | ------------------------------------------------------------------------ |
| 0     | セットアップ: Next.js / Tailwind / shadcn/ui / Supabase / 認証 / CI       |
| 1     | タスクの基本: CRUD、Inbox / Today / Upcoming、プロジェクト、完了          |
| 2     | **キーボード操作**: コマンドパレット、ショートカット、クイックアド構文    |
| 3     | 表現力: サブタスク階層、優先度、期日、ラベル、並び替え、Undo              |
| 4     | 繰り返しタスク（RRULE、完了時の次回生成）                                 |
| 5     | フィルタ・保存ビュー・全文検索                                            |
| 6     | 共有: ワークスペース招待、担当者アサイン、Realtime 同期                   |
| 7     | 公開準備: オンボーディング、パフォーマンス、監査、エラー監視              |
| 8     | AI 連携: 自然言語入力、タスク自動分解、優先順位の提案                     |

各フェーズの開始時に `docs/phases/phase-N.md` へ設計と作業計画を書いてから実装する。

## 初期スコープ外（やらないこと）

意図的に落としている。相談なく実装しないこと。

- カンバンボード / カレンダー / ガントチャート表示
- 時間見積り・実績記録・ポモドーロ
- ファイル添付
- オフライン対応、モバイルアプリ、PWA
- 課金・プラン管理
- タスクへのコメント、アクティビティログ

## Claude Code への作業ルール

- **応答は日本語で行う**
- 実装前に、変更対象ファイルと方針を短く提示してから着手する
- 1 コミット 1 目的。コミットメッセージは日本語で書く
- スキーマ変更を伴う作業では、マイグレーション・型生成・RLS ポリシーをセットで行う
- キーボードショートカットを追加・変更したら、本ファイルの表を必ず更新する
- 判断に迷う仕様（挙動の解釈が複数ある場合）は、実装を進める前に確認する
- 依存ライブラリを新しく追加する場合は、理由を添えて事前に相談する
