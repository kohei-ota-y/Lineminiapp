-- ============================================
-- LUCA シードデータ
-- 開発・デモ用サンプルデータ
-- ============================================

-- テナントIDは固定UUID
-- .env.example の DEFAULT_TENANT_ID にこの値を設定してください
-- 11111111-1111-1111-1111-111111111111

-- ============================================
-- 1. テナント
-- ============================================
insert into tenants (id, name, slug, plan, status) values
  ('11111111-1111-1111-1111-111111111111', 'サンプルカフェ', 'sample-cafe', 'starter', 'active')
on conflict (id) do nothing;

-- ============================================
-- 2. テナント設定
-- ============================================
insert into tenant_settings (tenant_id, brand_color, feature_point, feature_coupon) values
  ('11111111-1111-1111-1111-111111111111', '#06C755', true, true)
on conflict (tenant_id) do nothing;

-- ============================================
-- 3. クーポン (3件: 割引率、定額、期限切れ)
-- ============================================

-- 割引率クーポン (有効)
insert into coupons (id, tenant_id, title, description, discount_type, discount_value, min_purchase, is_active, max_uses, expires_at) values
  ('22222222-2222-2222-2222-222222222201',
   '11111111-1111-1111-1111-111111111111',
   'ドリンク10%OFF',
   '全ドリンクメニューが10%オフになります。',
   'percentage', 10, 500, true, 100,
   now() + interval '30 days')
on conflict (id) do nothing;

-- 定額割引クーポン (有効)
insert into coupons (id, tenant_id, title, description, discount_type, discount_value, min_purchase, is_active, max_uses, expires_at) values
  ('22222222-2222-2222-2222-222222222202',
   '11111111-1111-1111-1111-111111111111',
   '200円引きクーポン',
   '1,000円以上のお会計で200円引き。',
   'fixed', 200, 1000, true, 50,
   now() + interval '60 days')
on conflict (id) do nothing;

-- 期限切れクーポン
insert into coupons (id, tenant_id, title, description, discount_type, discount_value, min_purchase, is_active, max_uses, expires_at) values
  ('22222222-2222-2222-2222-222222222203',
   '11111111-1111-1111-1111-111111111111',
   '【終了】オープン記念 500円OFF',
   'オープン記念の特別クーポンです。ご利用ありがとうございました。',
   'fixed', 500, null, false, 200,
   now() - interval '7 days')
on conflict (id) do nothing;

-- ============================================
-- 4. テスト会員 (LINE user ID はダミー)
-- ============================================
insert into members (id, tenant_id, line_user_id, display_name, picture_url, rank, total_points, visit_count) values
  ('33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   'U_dummy_line_user_001',
   'テストユーザー太郎',
   null,
   'silver',
   350,
   12)
on conflict (id) do nothing;

-- ============================================
-- 5. ポイント取引 (5件)
-- ============================================

-- 来店ポイント付与
insert into point_transactions (id, member_id, tenant_id, amount, balance_after, type, description, created_at) values
  ('44444444-4444-4444-4444-444444444401',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   100, 100, 'earn', '来店ポイント（初回）',
   now() - interval '30 days')
on conflict (id) do nothing;

-- 購入ポイント付与
insert into point_transactions (id, member_id, tenant_id, amount, balance_after, type, description, created_at) values
  ('44444444-4444-4444-4444-444444444402',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   200, 300, 'earn', '購入ポイント（ブレンドコーヒー x2）',
   now() - interval '20 days')
on conflict (id) do nothing;

-- ポイント使用
insert into point_transactions (id, member_id, tenant_id, amount, balance_after, type, description, created_at) values
  ('44444444-4444-4444-4444-444444444403',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   -100, 200, 'redeem', 'ポイント利用（100円引き）',
   now() - interval '14 days')
on conflict (id) do nothing;

-- 調整（キャンペーンボーナス）
insert into point_transactions (id, member_id, tenant_id, amount, balance_after, type, description, created_at) values
  ('44444444-4444-4444-4444-444444444404',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   50, 250, 'adjust', '雨の日キャンペーン ボーナスポイント',
   now() - interval '7 days')
on conflict (id) do nothing;

-- 直近の来店ポイント付与
insert into point_transactions (id, member_id, tenant_id, amount, balance_after, type, description, created_at) values
  ('44444444-4444-4444-4444-444444444405',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   100, 350, 'earn', '来店ポイント',
   now() - interval '1 day')
on conflict (id) do nothing;

-- ============================================
-- 6. クーポン使用履歴 (1件: 期限切れクーポンを過去に使用)
-- ============================================
insert into coupon_uses (id, coupon_id, member_id, tenant_id, used_at) values
  ('55555555-5555-5555-5555-555555555501',
   '22222222-2222-2222-2222-222222222203',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   now() - interval '45 days')
on conflict (id) do nothing;
