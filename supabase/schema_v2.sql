-- ビンボーマップ スキーマ v2: 通報・クーポン交換・抽選のサーバー側検証
-- schema.sql 適用後に SQL Editor で実行する。

-- ========== 通報(利用規約の運用に必須) ==========
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('spot','comment')),
  target_id uuid not null,
  reason text not null check (char_length(reason) <= 200),
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
-- 誰でも通報でき、内容は運営(service role)のみ閲覧。SELECTポリシーを作らない=一般ユーザーは読めない。
create policy "insert own report" on reports for insert with check (created_by = auth.uid());

-- ========== クーポン(B2C交換所) ==========
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text not null default '🎫',
  cost_pt int not null check (cost_pt > 0),
  value_label text not null,
  stock int not null default 0, -- 在庫。0で交換不可(運営が補充)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'preparing' check (status in ('preparing','delivered','cancelled')),
  code text, -- 発券コード。運営が手配後に設定(平文長期保存は避け、発券後に無効化運用)
  created_at timestamptz not null default now()
);

alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
create policy "read active coupons" on coupons for select using (active = true);
create policy "read own redemptions" on coupon_redemptions for select using (user_id = auth.uid());
-- INSERTポリシーは作らない: 交換は必ず下のredeem_coupon()経由(残高検証をサーバーで行う)

-- ========== 抽選の当選 ==========
create table if not exists raffle_winners (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references raffles (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'announced' check (status in ('announced','claimed','shipped')),
  created_at timestamptz not null default now()
);
alter table raffle_winners enable row level security;
create policy "read winners" on raffle_winners for select using (true); -- 当選フィード用(表示名はプロフィールでマスク)

-- ========== サーバー側検証つきの交換/応募(改ざん・残高不正の防止の要) ==========
-- クライアントは台帳やredemptionsに直接書かず、この関数だけを呼ぶ。
-- SECURITY DEFINERでRLSを迂回しつつ、内部で残高・在庫・上限を原子的に検証する。

create or replace function redeem_coupon(p_coupon_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_balance bigint;
  v_redemption uuid;
begin
  if v_user is null then raise exception 'login required'; end if;

  select cost_pt into v_cost from coupons
    where id = p_coupon_id and active = true and stock > 0
    for update;
  if not found then raise exception 'coupon unavailable'; end if;

  select coalesce(sum(amount), 0) into v_balance from points_ledger where user_id = v_user;
  if v_balance < v_cost then raise exception 'insufficient points'; end if;

  update coupons set stock = stock - 1 where id = p_coupon_id;
  insert into points_ledger (user_id, amount, reason, ref)
    values (v_user, -v_cost, 'coupon_redeem', p_coupon_id::text);
  insert into coupon_redemptions (coupon_id, user_id)
    values (p_coupon_id, v_user) returning id into v_redemption;
  return v_redemption;
end $$;

create or replace function enter_raffle(p_raffle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cost int;
  v_max int;
  v_ends timestamptz;
  v_count int;
  v_balance bigint;
begin
  if v_user is null then raise exception 'login required'; end if;

  select cost_pt, max_entries, ends_at into v_cost, v_max, v_ends
    from raffles where id = p_raffle_id;
  if not found or v_ends <= now() then raise exception 'raffle closed'; end if;

  select coalesce(entry_count, 0) into v_count from raffle_entries
    where raffle_id = p_raffle_id and user_id = v_user;
  if coalesce(v_count, 0) >= v_max then raise exception 'entry limit reached'; end if;

  select coalesce(sum(amount), 0) into v_balance from points_ledger where user_id = v_user;
  if v_balance < v_cost then raise exception 'insufficient points'; end if;

  insert into points_ledger (user_id, amount, reason, ref)
    values (v_user, -v_cost, 'raffle_entry', p_raffle_id::text);
  insert into raffle_entries (raffle_id, user_id, entry_count)
    values (p_raffle_id, v_user, 1)
    on conflict (raffle_id, user_id)
    do update set entry_count = raffle_entries.entry_count + 1, updated_at = now();
end $$;

grant execute on function redeem_coupon(uuid) to authenticated;
grant execute on function enter_raffle(uuid) to authenticated;

-- 次の締め付け(TODO):
-- 1) points_ledger のクライアント直INSERTポリシーを廃止し、歩数・広告の付与も
--    サーバー関数/Edge Function化(広告はSDKのサーバーサイド検証コールバックで付与)。
-- 2) 抽選実行はpg_cronで締切後に raffle_winners へ書き込むジョブを追加。
