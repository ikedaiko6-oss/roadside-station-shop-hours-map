# Supabaseセットアップ

## 1. プロジェクト作成

Supabaseで新しいプロジェクトを作成します。

## 2. SQL実行

Supabase DashboardのSQL Editorで、以下の順に実行します。

1. `supabase/admin_policies.sql`
2. 必要なら `supabase/seed_demo.sql`

`admin_policies.sql` は以下を作成します。

- `roadside_station_shops` テーブル
- Row Level Security policy
- Storage bucket `station-shop-photos`
- Storage policy

## 3. APIキーを設定

Supabase Dashboardの Project Settings > API から以下を確認し、`.env.local` に入れます。

```bash
NEXT_PUBLIC_SUPABASE_URL=Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon public key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=Google Maps API key
NEXT_PUBLIC_ADMIN_EMAILS=ikedaiko1@gmail.com,ikedaiko6@gmail.com
NEXT_PUBLIC_ADMIN_USER_IDS=
```

## 4. Googleログイン

Supabase Dashboardの Authentication > Providers で Google を有効化します。

Authentication > URL Configuration に以下を追加します。

```text
http://localhost:3001/auth/callback
https://roadside-station-shop-hours-map.vercel.app/auth/callback
```

## 5. 動作確認

```bash
npm run dev -- --port 3001
```

ブラウザで `http://localhost:3001` を開きます。

確認すること:

- ログイン前でも地図と投稿一覧が見える
- Googleログインできる
- 地図クリックで投稿フォームが開く
- お店の営業時間を登録できる
- 投稿した写真が表示される
- 自分の投稿を編集・削除できる
