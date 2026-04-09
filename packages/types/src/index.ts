// ============================================
// LUCA 共有型定義
// ============================================

// ---------- Tenant ----------
export type PlanType = "starter" | "standard" | "premium";
export type TenantStatus = "active" | "suspended" | "trial";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  brand_color: string;
  logo_url: string | null;
  feature_point: boolean;
  feature_stamp: boolean;
  feature_coupon: boolean;
  feature_reservation: boolean;
  feature_order: boolean;
  point_rate: number; // 100円あたりの付与ポイント
}

// ---------- Member ----------
export type MemberRank = "regular" | "silver" | "gold" | "platinum";

export interface Member {
  id: string;
  tenant_id: string;
  line_user_id: string;
  auth_user_id: string | null;
  display_name: string;
  picture_url: string | null;
  rank: MemberRank;
  total_points: number;
  visit_count: number;
  created_at: string;
  updated_at: string;
}

// ---------- Point ----------
export type PointTransactionType = "earn" | "redeem" | "expire" | "adjust";

export interface PointTransaction {
  id: string;
  member_id: string;
  tenant_id: string;
  amount: number;
  balance_after: number;
  type: PointTransactionType;
  description: string | null;
  created_at: string;
}

// ---------- Coupon ----------
export type DiscountType = "fixed" | "percentage";
export type CouponStatus = "active" | "expired" | "archived";

export interface Coupon {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase: number | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

export interface CouponUse {
  id: string;
  coupon_id: string;
  member_id: string;
  tenant_id: string;
  used_at: string;
}

// ---------- Stamp ----------
export interface StampCard {
  id: string;
  tenant_id: string;
  name: string;
  total_stamps: number;
  reward_description: string;
  is_active: boolean;
  created_at: string;
}

export interface StampRecord {
  id: string;
  stamp_card_id: string;
  member_id: string;
  tenant_id: string;
  current_stamps: number;
  completed_count: number;
  updated_at: string;
}

// ---------- API Response ----------
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };
