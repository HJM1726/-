-- ビンボーマップ Supabase スキーマ
-- 使い方: Supabaseダッシュボード > SQL Editor にこのファイルを貼り付けて実行。
-- 事前に Authentication > Sign In / Up で「Anonymous Sign-Ins」を有効にすること
-- (会員登録なしで使わせるため、匿名認証でユーザーを識別する)。

-- ========== プロフィール ==========
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '匿名の節約家',
  created_at timestamptz not null default now()
);

-- 新規ユーザー作成時にプロフィールを自動作成
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========== スポット(投稿は承認制) ==========
create table if not exists spots (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 40),
  category text not null check (category in ('teishoku','men','don','bento','pan','free')),
  price int not null check (price >= 0 and price <= 1000),
  lat double precision not null,
  lng double precision not null,
  menu text check (char_length(menu) <= 30),
  hours text check (char_length(hours) <= 40),
  comment text check (char_length(comment) <= 80),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists spots_status_idx on spots (status);

create table if not exists spot_votes (
  spot_id uuid not null references spots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  dir text not null check (dir in ('up','down')),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

create table if not exists spot_ratings (
  spot_id uuid not null references spots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

create table if not exists spot_comments (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references spots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) <= 120),
  created_at timestamptz not null default now()
);

-- アプリが読む公開ビュー(承認済み + 集計値)
create or replace view spots_public as
select
  s.id, s.name, s.category, s.price, s.lat, s.lng, s.menu, s.hours, s.comment,
  s.created_at,
  coalesce(v.up, 0) as up,
  coalesce(v.down, 0) as down,
  r.avg_stars as rating,
  coalesce(r.cnt, 0) as rating_count
from spots s
left join (
  select spot_id,
    count(*) filter (where dir = 'up') as up,
    count(*) filter (where dir = 'down') as down
  from spot_votes group by spot_id
) v on v.spot_id = s.id
left join (
  select spot_id, round(avg(stars)::numeric, 1) as avg_stars, count(*) as cnt
  from spot_ratings group by spot_id
) r on r.spot_id = s.id
where s.status = 'approved';

-- ========== ポイント台帳(残高はSUM。改ざん防止のため直接UPDATEさせない) ==========
create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  reason text not null, -- steps_milestone / login_bonus / roulette / chest / quiz / market_buy / market_sell / raffle_entry ...
  ref text,             -- 対象ID(記事ID・出品IDなど)。同一報酬の重複付与チェックに使う
  created_at timestamptz not null default now()
);
create index if not exists points_ledger_user_idx on points_ledger (user_id);

create or replace view point_balances as
select user_id, coalesce(sum(amount), 0) as balance
from points_ledger group by user_id;

-- 注意: 本番では報酬付与(歩数・ルーレット等)はクライアント直INSERTではなく
-- Edge Function経由にして検証を挟むこと。ここではMVPとして自分の行のINSERTのみ許可。

-- ========== ギフト券マーケット ==========
create table if not exists gift_listings (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  face_value int not null check (face_value >= 100),
  type text not null check (type in ('sell','exchange')),
  price_pt int check (price_pt is null or (price_pt > 0 and price_pt <= face_value)),
  wants text check (char_length(wants) <= 60),
  note text check (char_length(note) <= 80),
  status text not null default 'open' check (status in ('open','requested','completed','withdrawn')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists gift_trades (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references gift_listings (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','code_deposited','completed','cancelled')),
  created_at timestamptz not null default now()
);
-- コードの受け渡し(エスクロー)は平文でDBに置かず、Edge Function + 暗号化カラムで実装すること。

-- ========== チリツモ抽選 ==========
create table if not exists raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text not null default '🎁',
  cost_pt int not null check (cost_pt > 0),
  max_entries int not null default 3,
  winners int not null default 1,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists raffle_entries (
  raffle_id uuid not null references raffles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_count int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (raffle_id, user_id)
);
-- 抽選の実行はcronのEdge Functionで行い、当選結果テーブルに書き込む(クライアントに任せない)。

-- ========== RLS(行レベルセキュリティ) ==========
alter table profiles enable row level security;
alter table spots enable row level security;
alter table spot_votes enable row level security;
alter table spot_ratings enable row level security;
alter table spot_comments enable row level security;
alter table points_ledger enable row level security;
alter table gift_listings enable row level security;
alter table gift_trades enable row level security;
alter table raffles enable row level security;
alter table raffle_entries enable row level security;

-- profiles: 本人のみ読み書き
create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- spots: 承認済みは誰でも閲覧、自分の投稿は状態問わず閲覧可。INSERTは必ずpendingで本人名義。
create policy "read approved spots" on spots for select
  using (status = 'approved' or created_by = auth.uid());
create policy "insert own pending spot" on spots for insert
  with check (created_by = auth.uid() and status = 'pending');

-- votes/ratings/comments: 誰でも閲覧、自分の行のみ作成・更新・削除
create policy "read votes" on spot_votes for select using (true);
create policy "write own vote" on spot_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read ratings" on spot_ratings for select using (true);
create policy "write own rating" on spot_ratings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read comments" on spot_comments for select using (true);
create policy "insert own comment" on spot_comments for insert
  with check (user_id = auth.uid());
create policy "delete own comment" on spot_comments for delete
  using (user_id = auth.uid());

-- points: 自分の台帳のみ閲覧・追記(本番はEdge Function経由に締めること)
create policy "read own ledger" on points_ledger for select using (user_id = auth.uid());
create policy "insert own ledger" on points_ledger for insert with check (user_id = auth.uid());

-- market: 出品は誰でも閲覧、本人のみ作成・更新
create policy "read listings" on gift_listings for select using (true);
create policy "insert own listing" on gift_listings for insert with check (created_by = auth.uid());
create policy "update own listing" on gift_listings for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "read own trades" on gift_trades for select
  using (buyer_id = auth.uid()
         or exists (select 1 from gift_listings l where l.id = listing_id and l.created_by = auth.uid()));
create policy "insert own trade" on gift_trades for insert with check (buyer_id = auth.uid());

-- raffles: 誰でも閲覧。応募は本人の行のみ。
create policy "read raffles" on raffles for select using (true);
create policy "read own entries" on raffle_entries for select using (user_id = auth.uid());
create policy "write own entries" on raffle_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
