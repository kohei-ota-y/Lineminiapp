-- ============================================
-- クーポン使用をアトミックに処理する RPC 関数
-- coupon_uses への INSERT と coupons.used_count の
-- インクリメントを単一トランザクションで実行する。
-- ============================================

create or replace function use_coupon(
  p_coupon_id uuid,
  p_member_id uuid,
  p_tenant_id uuid
) returns json as $$
declare
  v_coupon record;
  v_already_used boolean;
begin
  -- クーポン取得（行ロックで競合を防止）
  select * into v_coupon from coupons
  where id = p_coupon_id and tenant_id = p_tenant_id
  for update;

  if v_coupon is null then
    return json_build_object('ok', false, 'error', 'クーポンが見つかりません');
  end if;

  -- is_active チェック
  if not v_coupon.is_active then
    return json_build_object('ok', false, 'error', 'このクーポンは無効です');
  end if;

  -- 有効期限チェック
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return json_build_object('ok', false, 'error', 'このクーポンは期限切れです');
  end if;

  -- 使用上限チェック
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return json_build_object('ok', false, 'error', 'このクーポンの使用上限に達しました');
  end if;

  -- 重複使用チェック（tenant_id も条件に含める）
  select exists(
    select 1 from coupon_uses
    where coupon_id = p_coupon_id and member_id = p_member_id and tenant_id = p_tenant_id
  ) into v_already_used;

  if v_already_used then
    return json_build_object('ok', false, 'error', 'このクーポンは既に使用済みです');
  end if;

  -- クーポン使用を記録
  insert into coupon_uses (coupon_id, member_id, tenant_id)
  values (p_coupon_id, p_member_id, p_tenant_id);

  -- used_count をインクリメント
  update coupons set used_count = used_count + 1 where id = p_coupon_id;

  return json_build_object('ok', true, 'data', json_build_object('usedAt', now()));
end;
$$ language plpgsql security definer;
