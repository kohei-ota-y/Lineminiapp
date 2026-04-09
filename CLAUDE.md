# LUCA - Claude Code 開発ガイド

## プロジェクト概要
中小店舗向けLINEミニアプリSaaSプラットフォーム。
会員証・ポイントカード・クーポンをLINEミニアプリとして提供。

## 技術スタック
- **フロントエンド**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **DB/Auth**: Supabase (PostgreSQL + RLS)
- **認証**: LINE LIFF (ミニアプリ) / Supabase Auth (管理画面)
- **決済**: Stripe
- **インフラ**: Vercel + Supabase Cloud
- **モノレポ**: pnpm workspaces + Turborepo

## ディレクトリ構成
```
apps/mini-app/     → LINEミニアプリ (ポート3000)
apps/admin/        → 管理画面 (未実装、MVP後)
packages/db/       → Supabaseクライアント・DB型定義
packages/types/    → 共有型定義 (Member, Coupon等)
packages/utils/    → 共有ユーティリティ (Result型, フォーマッタ)
supabase/          → マイグレーション・設定
```

## コマンド
```bash
pnpm install          # 依存関係インストール
pnpm dev              # 全アプリ起動
pnpm dev:mini         # ミニアプリのみ起動
pnpm build            # 全アプリビルド
pnpm db:migrate       # DBマイグレーション適用
pnpm db:types         # Supabase型を自動生成
```

## 開発ルール
- エラーハンドリングは `Result<T, E>` 型で統一（throwは使わない）
- 全テーブルに `tenant_id` 必須（RLSでテナント分離）
- APIレスポンスは `{ ok: true, data }` or `{ ok: false, error }` の形式
- Server Actionsは `packages/` に関数を置かない（apps/内のみ）

## マルチテナント
- JWTの `app_metadata.tenant_id` でテナント識別
- フロントエンドから `tenant_id` を直接送らない
- Supabase RLSが全クエリに自動適用
