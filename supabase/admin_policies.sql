create table if not exists roadside_station_shops (
  id uuid primary key default gen_random_uuid(),
  station_name text not null,
  shop_name text not null,
  category text,
  business_hours text not null,
  last_order text,
  closed_days text,
  details text,
  latitude double precision not null,
  longitude double precision not null,
  user_id uuid references auth.users(id) on delete set null,
  image_url text,
  photo_uploaded_at timestamptz,
  confirmed_at date not null,
  created_at timestamptz not null default now()
);

alter table roadside_station_shops enable row level security;

drop policy if exists "誰でも閲覧可" on roadside_station_shops;
drop policy if exists "ログインユーザーが登録可" on roadside_station_shops;
drop policy if exists "自分または管理者が編集可" on roadside_station_shops;
drop policy if exists "自分または管理者が削除可" on roadside_station_shops;

create policy "誰でも閲覧可" on roadside_station_shops
  for select
  using (true);

create policy "ログインユーザーが登録可" on roadside_station_shops
  for insert
  with check (auth.uid() = user_id);

create policy "自分または管理者が編集可" on roadside_station_shops
  for update
  using (
    auth.uid() = user_id
    or lower(auth.jwt() ->> 'email') in (
      'ikedaiko1@gmail.com',
      'ikedaiko6@gmail.com'
    )
  );

create policy "自分または管理者が削除可" on roadside_station_shops
  for delete
  using (
    auth.uid() = user_id
    or lower(auth.jwt() ->> 'email') in (
      'ikedaiko1@gmail.com',
      'ikedaiko6@gmail.com'
    )
  );

insert into storage.buckets (id, name, public)
values ('station-shop-photos', 'station-shop-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "営業時間写真は誰でも閲覧可" on storage.objects;
drop policy if exists "ログインユーザーが営業時間写真をアップロード可" on storage.objects;
drop policy if exists "自分の営業時間写真を更新可" on storage.objects;
drop policy if exists "自分の営業時間写真を削除可" on storage.objects;

create policy "営業時間写真は誰でも閲覧可" on storage.objects
  for select
  using (bucket_id = 'station-shop-photos');

create policy "ログインユーザーが営業時間写真をアップロード可" on storage.objects
  for insert
  with check (
    bucket_id = 'station-shop-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "自分の営業時間写真を更新可" on storage.objects
  for update
  using (
    bucket_id = 'station-shop-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "自分の営業時間写真を削除可" on storage.objects
  for delete
  using (
    bucket_id = 'station-shop-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
