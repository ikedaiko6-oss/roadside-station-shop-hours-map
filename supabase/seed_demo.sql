insert into roadside_station_shops (
  station_name,
  shop_name,
  category,
  business_hours,
  last_order,
  closed_days,
  details,
  latitude,
  longitude,
  confirmed_at
) values
(
  '道の駅サンプル',
  '食堂サンプル',
  '食堂',
  '11:00-15:00',
  '14:30',
  '水曜',
  'タグ: 食堂, LO確認済み
メモ: デモデータです。実際の営業時間ではありません。',
  35.6812,
  139.7671,
  '2026-06-02'
),
(
  '道の駅サンプル',
  '直売所サンプル',
  '直売所',
  '9:00-17:00',
  null,
  '年末年始',
  'タグ: 直売所, 営業時間表あり
メモ: 投稿フォームと地図表示の確認用データです。',
  35.6840,
  139.7640,
  '2026-06-02'
);
