-- ============================================
-- LUCA 初期スキーマ
-- マルチテナント対応 + RLS
-- ============================================

-- UUID拡張を有効化
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. テナント
-- ============================================
create table tenants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  plan        text not null default 'starter' check (plan in ('starter', 'standard', 'premium')),
  status      text not null default 'trial' check (status in ('active', 'suspended', 'trial')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tenants_slug on tenants(slug);

-- ============================================
-- 2. テナント設定
-- ============================================
create table tenant_settings (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  brand_color         text not null default '#06C755',
  logo_url            text,
  feature_point       boolean not null default true,
  feature_stamp       boolean not null default false,
  feature_coupon      boolean not null default true,
  feature_reservation boolean not null default false,
  feature_order       boolean not null default false,
  point_rate          integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(tenant_id)
);

-- ============================================
-- 3. 会員（LINE ユーザー）
-- ============================================
create table members (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  line_user_id    text not null,
  display_name    text not null default '',
  picture_url     text,
  rank            text not null default 'regular' check (rank in ('regular', 'silver', 'gold', 'platinum')),
  total_points    integer not null default 0,
  visit_count     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(tenant_id, line_user_id)
);

create index idx_members_tenant_line on members(tenant_id, line_user_id);

-- ============================================
-- 4. ポイント取引
-- ============================================
create table point_transactions (
  id              uuid primary key default uuid_generate_v4(),
  member_id       uuid not null references members(id) on delete cascade,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  amount          integer not null,
  balance_after   integer not null,
  type            text not null check (type in ('earn', 'redeem', 'expire', 'adjust')),
  description     text,
  created_at      timestamptz not null default now()
);

create index idx_point_tx_member on point_transactions(member_id, created_at desc);

-- ============================================
-- 5. クーポン
-- ============================================
create table coupons (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  title           text not null,
  description     text,
  discount_type   text not null check (discount_type in ('fixed', 'percentage')),
  discount_value  integer not null,
  min_purchase    integer,
  is_active       boolean not null default true,
  max_uses        integer,
  used_count      integer not null default 0,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_coupons_active on coupons(tenant_id, is_active, expires_at);

-- ============================================
-- 6. クーポン使用履歴
-- ============================================
create table coupon_uses (
  id          uuid primary key default uuid_generate_v4(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  used_at     timestamptz not null default now()
);

create index idx_coupon_uses_member on coupon_uses(member_id, used_at desc);

-- ============================================
-- 7. スタンプカード（MVP後、スタンダードプラン以上）
-- ============================================
create table stamp_cards (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  name                text not null,
  total_stamps        integer not null default 10,
  reward_description  text not null default '',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create table stamp_records (
  id              uuid primary key default uuid_generate_v4(),
  stamp_card_id   uuid not null references stamp_cards(id) on delete cascade,
  member_id       uuid not null references members(id) on delete cascade,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  current_stamps  integer not null default 0,
  completed_count integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- ============================================
-- 8. 管理者ユーザー
-- ============================================
create table admin_users (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  auth_user_id    uuid not null unique,
  email           text not null,
  role            text not null default 'owner' check (role in ('owner', 'staff')),
  created_at      timestamptz not null default now()
);

-- ============================================
-- 9. updated_at 自動更新トリガー
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tenants_updated_at
  before update on tenants
  for each row execute function update_updated_at();

create trigger trg_tenant_settings_updated_at
  before update on tenant_settings
  for each row execute function update_updated_at();

create trigger trg_members_updated_at
  before update on members
  for each row execute function update_updated_at();

-- ============================================
-- 10. RLS（行レベルセキュリティ）
-- ============================================
alter table tenants enable row level security;
alter table tenant_settings enable row level security;
alter table members enable row level security;
alter table point_transactions enable row level security;
alter table coupons enable row level security;
alter table coupon_uses enable row level security;
alter table stamp_cards enable row level security;
alter table stamp_records enable row level security;
alter table admin_users enable row level security;

-- テナント分離ポリシー: JWTのapp_metadata.tenant_idで自動フィルタ
create policy "tenant_isolation" on members
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on point_transactions
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on coupons
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on coupon_uses
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on stamp_cards
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on stamp_records
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on tenant_settings
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

create policy "tenant_isolation" on admin_users
  for all using (tenant_id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);

-- tenantsテーブルは自分のテナントのみ閲覧可
create policy "own_tenant_only" on tenants
  for select using (id = (auth.jwt()->'app_metadata'->>'tenant_id')::uuid);
