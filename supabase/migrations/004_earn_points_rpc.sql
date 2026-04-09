-- ============================================
-- ポイント付与をアトミックに処理する RPC 関数
-- point_transactions への INSERT と members.total_points の
-- 更新を単一トランザクションで実行する。
-- ============================================

create or replace function earn_points(
  p_member_id uuid,
  p_tenant_id uuid,
  p_amount integer,
  p_description text default null
) returns json as $$
declare
  v_member record;
  v_new_balance integer;
  v_transaction_id uuid;
begin
  -- ポイント数バリデーション
  if p_amount <= 0 then
    return json_build_object('ok', false, 'error', 'ポイント数は1以上を指定してください');
  end if;

  -- 会員取得（行ロックで競合を防止）
  select * into v_member from members
  where id = p_member_id and tenant_id = p_tenant_id
  for update;

  if v_member is null then
    return json_build_object('ok', false, 'error', '会員が見つかりません');
  end if;

  -- 新しい残高を計算
  v_new_balance := v_member.total_points + p_amount;

  -- ポイント取引を記録
  insert into point_transactions (member_id, tenant_id, amount, balance_after, type, description)
  values (p_member_id, p_tenant_id, p_amount, v_new_balance, 'earn', p_description)
  returning id into v_transaction_id;

  -- 会員のポイント残高と来店回数を更新
  update members set total_points = v_new_balance, visit_count = visit_count + 1 where id = p_member_id;

  return json_build_object('ok', true, 'data', json_build_object(
    'transactionId', v_transaction_id,
    'amount', p_amount,
    'newBalance', v_new_balance
  ));
end;
$$ language plpgsql security definer;
