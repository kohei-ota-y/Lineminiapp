-- ============================================
-- members テーブルに auth_user_id カラムを追加
-- Supabase Auth ユーザーと会員を紐づけるため
-- ============================================

alter table members
  add column auth_user_id uuid unique;

create index idx_members_auth_user_id on members(auth_user_id);
