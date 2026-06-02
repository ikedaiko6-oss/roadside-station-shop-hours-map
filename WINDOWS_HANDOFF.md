# Windows引き継ぎメモ: 道の駅お店時間マップ

## 現状

- 公開URL: https://roadside-station-shop-hours-map.vercel.app
- Vercel project: `ikedaiko6-oss-projects/roadside-station-shop-hours-map`
- Supabase project: `vendomap`
- Supabase project ref: `kgcvenpwxaojszvzriqc`
- ローカルプロジェクト名: `道の駅お店時間マップ`

アプリ自体は公開済みで、Supabaseのサンプルデータ2件も表示できています。

## 実装済みの主な機能

- 道の駅内のお店ごとの営業時間を地図に表示
- 店名、道の駅名、カテゴリ、営業時間、ラストオーダー、定休日、確認日、メモを保存
- 写真アップロード対応
- Googleログイン対応
- 自分の投稿の編集・削除
- Supabase Database / Auth / Storage / RLS 設定済み
- Vercel本番デプロイ済み
- Google Mapsの本番ドメイン制限回避のため、地図はOpenStreetMapタイル表示へ変更済み

## iPhone全画面表示の修正

iPhone 17 Pro Maxで地図が少し小さく見える問題に対して、ローカルコードは修正済みです。

変更ファイル:

- `src/app/HomeClient.tsx`
- `src/app/globals.css`

修正内容:

- 画面全体を `fixed inset-0` で固定
- `h-dvh` / `min-h-dvh` を使ってiOS Safariの表示領域に合わせる
- 地図エリアに `min-h-0` と `overflow-hidden` を追加
- 下部フッターを通常レイアウトから外し、地図上の小さい「プライバシー」リンクに変更
- `html, body` に `height: 100%`, `min-height: 100dvh`, `margin: 0`, `overscroll-behavior: none` を追加

## 検証済み

Mac側ローカルで以下は成功済みです。

```bash
npm run build
npm run lint
```

`npm run lint` はエラーなしです。`<img>` に関するNext.js warningだけ残っていますが、動作には影響ありません。

## 未完了

iPhone全画面表示の修正版は、まだVercel本番に反映できていません。

理由:

- Mac/Codex環境から `vercel.com` と `api.vercel.com` への通信がタイムアウト
- `npx vercel --prod --yes` が `Retrieving project...` で止まる
- Vercel公式ステータスは正常だったため、Vercel全体障害ではなく、Macのスリープ復帰後のネットワーク経路詰まりの可能性が高い

## Windows側でやること

1. このプロジェクトをWindowsへコピーする
2. `.env.local` があることを確認する
3. 依存関係を入れる

```bash
npm install
```

4. ローカル確認

```bash
npm run build
npm run lint
npm run dev
```

5. Vercelにログイン済みか確認

```bash
npx vercel whoami
```

6. 必要ならプロジェクトをリンク

```bash
npx vercel link
```

既存プロジェクトを選ぶ:

- Team: `ikedaiko6-oss-projects`
- Project: `roadside-station-shop-hours-map`

7. 本番デプロイ

```bash
npx vercel --prod --yes
```

デプロイ後、公開URLでiPhone表示を確認:

https://roadside-station-shop-hours-map.vercel.app

## 注意点

- `.env.local` は公開しない
- Supabase anon keyやGoogle Maps API keyは `NEXT_PUBLIC_` なのでフロントに出る前提のキー
- Google Mapsは現在使っていないが、envには残っていても問題なし
- VercelのDashboardからRedeployするだけだと、ローカル修正が反映されない可能性がある
- 確実に反映するには、Windows側からこの修正済みコードをVercelへデプロイする

## うまくいったかの確認ポイント

公開URLを開いて確認:

- 地図が画面の残り領域いっぱいに広がる
- 下部に余計な白いフッター領域が出ない
- 右下に小さい「プライバシー」リンクが地図上に重なる
- サンプルのピン2件が表示される
- ピンを押すと営業時間ポップアップが出る

