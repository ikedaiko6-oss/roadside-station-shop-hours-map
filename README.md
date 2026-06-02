# 道の駅お店時間マップ

道の駅全体の営業時間ではなく、道の駅に入っている個別店舗の営業時間を集める地図アプリです。

## コンセプト

- 食堂、直売所、カフェ、パン屋、温泉など、道の駅内のお店ごとの営業時間を投稿する
- 営業時間、ラストオーダー、定休日、現地確認日を記録する
- 営業時間表や店頭写真を添付できる
- 情報の鮮度が分かるように、現地確認日を必須にする

## 技術構成

- Next.js
- React
- Tailwind CSS
- Google Maps
- Supabase Auth / Database / Storage

## 公開URL

https://roadside-station-shop-hours-map.vercel.app

## ローカル起動

```bash
npm install
npm run dev
```

`.env.local` には以下を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_ADMIN_EMAILS=
NEXT_PUBLIC_ADMIN_USER_IDS=
```

ひな形は `.env.example` にあります。

## Supabase

SupabaseのSQL Editorで `supabase/admin_policies.sql` を実行します。

作成されるもの:

- `roadside_station_shops` テーブル
- 投稿、閲覧、編集、削除のRLSポリシー
- 写真アップロード用の Storage bucket `station-shop-photos`
- 写真の閲覧、アップロード、更新、削除ポリシー

## Supabase Auth

Googleログインを使う場合は、SupabaseのAuthentication設定でGoogle providerを有効化します。

Redirect URLにはローカルと本番URLを追加します。

```text
http://localhost:3001/auth/callback
https://roadside-station-shop-hours-map.vercel.app/auth/callback
```

ローカル開発で3000番を使う場合は、`src/app/login/page.tsx` のlocalhost用redirectも合わせて変更してください。

詳しい手順は `SUPABASE_SETUP.md` にまとめています。
