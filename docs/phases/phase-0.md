# Phase 0: 開発基盤のセットアップ

## ゴール

アプリの実装に入る前に、コードの品質を機械的に担保する仕組みを揃える。

## やったこと

| #   | 内容                                                            | PR     |
| --- | --------------------------------------------------------------- | ------ |
| 1   | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 の初期化 | -      |
| 2   | Prettier の導入、保存時の自動整形                                | #1     |
| 3   | shadcn/ui の導入（プリセット Nova / Lucide / Geist）             | #2, #3 |
| 4   | Vitest の導入                                                    | #3     |
| 5   | Claude Code のローカル設定を Git 管理から除外                    | #4     |
| 6   | GitHub Actions による CI（lint / 整形 / テスト / ビルド）        | #5     |

## 決めたこと

### ディレクトリは必要になった時点で作る

CLAUDE.md に構成を宣言しているが、空ディレクトリを先回りして作ることはしない。
Git が空ディレクトリを追跡できず `.gitkeep` が散らかること、
使われないディレクトリが構成の理解を妨げることが理由。

### テストはロジックに絞る

`@vitejs/plugin-react` が `@babel/core@8.0.0-rc` を要求し、
shadcn が依存する `@babel/core@7` と衝突して `ERESOLVE` になったため、
コンポーネントテスト用のパッケージ（`jsdom` / `@testing-library/*`）は導入を見送った。

`--legacy-peer-deps` での回避も可能だったが、不整合を抱えたまま進むより、
必要になった時点で入れるほうが安全と判断した。
キーボード操作の検証は Playwright での E2E が本命であり、Phase 1 以降に再検討する。

これに伴い `vitest.config.ts` の `environment` は `jsdom` ではなく `node` にしている。
コンポーネントのテストを始める段階で変更する。

### Turbopack のルートを明示している

ホームディレクトリ直下に無関係な `package-lock.json`（Claude Code と Playwright の
グローバルインストール）が存在し、Turbopack がそれをワークスペースルートと
誤検出する警告が出たため、`next.config.ts` で `turbopack.root` を明示している。
外すとファイル監視の範囲がホーム配下全体に広がる恐れがある。

### CI は `npm ci` を使う

`package-lock.json` のとおりに厳密にインストールするため、CI と手元で
依存のバージョンがズレない。

### `npm run test` は `vitest run`

`vitest` 単体は監視モードに入り、CI で終了せず固まる。
手元で書きながら回す用途には `test:watch` を用意している。

## 残課題

- Windows と WSL の併用により改行コードが CRLF / LF で混ざる。
  `ci.yml` の初回コミットで実際に整形チェックが落ちた。
  `.gitattributes` による正規化を別途検討する
- ブランチ保護ルール（CI が通らないとマージ不可）は未設定
- Supabase のセットアップは Phase 1 の冒頭で行う（Docker Desktop が必要）
- CI で Supabase を起動しての RLS テストは Phase 6 で対応する
