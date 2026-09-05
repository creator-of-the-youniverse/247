export type UserRole = 'CUSTOMER' | 'RIDER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export type ComplianceStatus = 'PENDING_REVIEW' | 'APPROVED' | 'RESTRICTED' | 'DISABLED';

export type ProductCategory = 
  | 'ESSENTIALS'
  | 'FIRST AID'
  | 'HYGIENE'
  | 'FOOD & DRINK'
  | 'WEATHER'
  | 'HARM REDUCTION'
  | 'SMOKE SHOP'
  | 'OTHER';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  subcategory: string;
  image: string;
  retail_price: number;
  member_price: number;
  unit_cost: number;
  weight: number; // in grams or ounces
  inventory_on_hand: number;
  inventory_reserved: number;
  inventory_available: number;
  reorder_threshold: number;
  target_stock: number;
  free_eligible: boolean;
  age_restricted: boolean;
  minimum_age: number; // 0, 18, 21
  requires_id: boolean;
  compliance_status: ComplianceStatus;
  delivery_allowed: boolean;
  active: boolean;
  supplier: string;
  created_at: string;
  updated_at: string;
}

export type InventoryLocation = 'CART' | 'RESUPPLY';

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK';

export type InventoryTransactionType = 
  | 'PURCHASE'
  | 'RESTOCK'
  | 'SALE'
  | 'FREE_DISTRIBUTION'
  | 'DAMAGE'
  | 'LOSS'
  | 'ADJUSTMENT'
  | 'TRANSFER';

export interface InventoryItem {
  product_id: string;
  cart_quantity: number;
  resupply_quantity: number;
  total_available: number;
  status: InventoryStatus;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  timestamp: string;
  product_id: string;
  product_name: string;
  type: InventoryTransactionType;
  location_from?: string;
  location_to?: string;
  quantity: number;
  unit_cost: number;
  reason: string;
  user: string;
}

export interface CartLoadoutRecommendation {
  product_id: string;
  product_name: string;
  category: ProductCategory;
  unit_weight: number;
  unit_cost: number;
  retail_price: number;
  recommended_quantity: number;
  current_cart_quantity: number;
  resupply_available: number;
  recent_sales_24h: number;
  recent_free_dist_24h: number;
  inventory_value: number;
}

export interface FreeDistribution {
  id: string;
  order_id: string;
  customer_id: string;
  product_id: string;
  product_name: string;
  category: ProductCategory;
  quantity: number;
  unit_cost: number;
  reason: string;
  timestamp: string;
  funded_by_sponsor?: boolean;
}

export interface FreeEssentialSettings {
  free_items_per_order: number;
  daily_free_limit: number;
  member_free_limit: number;
  eligible_categories: ProductCategory[];
  minimum_inventory_protection: number; // minimum stock required before allowing free giveaway
}

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED';

export interface TraderPassSubscription {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  subscription_status: SubscriptionStatus;
  price_monthly: number;
  start_date: string;
  renewal_date: string;
  cancellation_date?: string;
  monthly_credit: number;
  credit_used: number;
  credit_remaining: number;
  member_savings_total: number;
  member_orders_count: number;
}

export type OrderState = 
  | 'PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVING'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderStatus = OrderState;

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  member_price: number;
  unit_cost: number;
  is_free_item?: boolean;
  category: ProductCategory;
}

export type PaymentMethod = 'CARD' | 'TRADER_PASS_CREDIT' | 'CASH_ON_DELIVERY' | 'COMMUNITY_FUND';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_zone_id: string;
  delivery_instructions: string;
  items: OrderItem[];
  free_item?: OrderItem;
  subtotal: number;
  delivery_fee: number;
  pass_discount: number;
  credit_applied: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: 'PAID' | 'PENDING' | 'REFUNDED';
  status: OrderState;
  created_at: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  out_for_delivery_at?: string;
  arriving_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  deadline_at: string; // Target delivery deadline (created_at + target minutes)
  actual_delivery_minutes?: number;
  assigned_rider_id?: string;
  assigned_rider_name?: string;
  rider_notes?: string;
  age_verified: boolean;
  requires_id_check: boolean;
}

export type ServiceStatus = 'ONLINE' | 'OFFLINE' | 'LIMITED_SERVICE' | 'WEATHER_HOLD' | 'EMERGENCY_HOLD';

export interface DeliverySettings {
  delivery_fee: number;
  free_delivery_threshold: number;
  member_delivery_fee: number;
  target_delivery_minutes: number;
  minimum_order: number;
  service_radius_miles: number;
  service_status: ServiceStatus;
  service_status_message?: string;
  fixed_monthly_costs: number; // for break-even calculations
  payment_processing_rate: number; // e.g. 0.029 (2.9%)
  payment_processing_flat: number; // e.g. 0.30
  average_delivery_labor_cost: number; // e.g. 3.50 per order
}

export interface ServiceZone {
  id: string;
  name: string;
  boundary_description: string;
  active: boolean;
  delivery_fee: number;
  target_time_minutes: number;
  priority: number;
}

export type ResourceCategory = 
  | 'HEALTHCARE'
  | 'SHELTER'
  | 'FOOD'
  | 'RECOVERY'
  | 'HARM_REDUCTION'
  | 'HOUSING'
  | 'TRANSPORTATION'
  | 'CRISIS'
  | 'IDENTIFICATION'
  | 'WEATHER'
  | 'COMMUNITY';

export interface CommunityResource {
  id: string;
  name: string;
  description: string;
  phone: string;
  website: string;
  address: string;
  hours: string;
  category: ResourceCategory;
  services?: string[];
  free_services?: boolean;
  active: boolean;
}

export interface SponsorContribution {
  id: string;
  sponsor_name: string;
  is_anonymous: boolean;
  amount: number;
  date: string;
  campaign: string;
  message?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  status: 'ONLINE' | 'OFFLINE' | 'DELIVERING';
  bike_name: string;
  cart_id: string;
  current_location: string;
  completed_deliveries_today: number;
  average_delivery_time_min: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  object: string;
  old_value?: string;
  new_value?: string;
}

export interface BusinessMetrics {
  orders_today: number;
  revenue_today: number;
  delivery_fees_today: number;
  product_revenue_today: number;
  average_order_value: number;
  average_delivery_time_minutes: number;
  percent_under_60_minutes: number;
  active_members: number;
  new_members_month: number;
  cancelled_members_month: number;
  free_essentials_today: number;
  free_essentials_week: number;
  free_essentials_month: number;
  free_essential_cost_today: number;
  free_essential_cost_week: number;
  free_essential_cost_month: number;
  inventory_value_cart: number;
  inventory_value_resupply: number;
  inventory_value_total: number;
  low_stock_products_count: number;
  out_of_stock_products_count: number;
  
  // Advanced business & unit economics
  revenue_month: number;
  product_gross_margin_percent: number;
  contribution_margin_dollars: number;
  contribution_per_order: number;
  delivery_cost_total: number;
  payment_processing_cost_total: number;
  repeat_customer_rate_percent: number;
  membership_churn_rate_percent: number;
  customer_lifetime_value: number;
  break_even_orders_month: number;
  break_even_orders_day: number;
  community_fund_balance: number;
  community_funded_items_month: number;
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  address: string;
  is_member: boolean;
  pass?: TraderPassSubscription;
  created_at: string;
}

// ==========================================
// PHASE 3A: ECONOMICS ENGINE & CART OPTIMIZER
// ==========================================

export interface BusinessEconomicsConfig {
  // 1. Business Configuration (Defaults from Spec)
  monthly_trader_pass_price: number; // $20
  annual_trader_pass_price: number; // $200
  monthly_essential_credit: number; // $20
  member_product_discount_percent: number; // 10%
  member_standard_delivery_fee: number; // $0
  non_member_delivery_fee: number; // $5
  free_delivery_threshold: number; // $30
  free_essentials_per_customer_day: number; // 1
  free_essentials_per_customer_per_day?: number;
  system_free_essential_daily_limit: number; // 20
  system_free_essential_limit_per_day?: number;
  target_delivery_minutes: number; // 60
  target_delivery_time_minutes?: number;
  member_included_standard_deliveries: number; // 8
  member_overage_delivery_fee: number; // $2

  // 2. Economic Inputs (Demo Assumptions)
  monthly_fixed_costs: number; // $1,850.00
  payment_processing_percent: number; // 0.029 (2.9%)
  payment_processing_rate?: number;
  payment_processing_fixed_fee: number; // $0.30
  payment_processing_flat?: number;
  average_delivery_variable_cost: number; // $3.50
  average_delivery_labor_cost?: number;
  average_order_packaging_cost: number; // $0.40
  packaging_cost_per_order?: number;
  average_delivery_distance_miles: number; // 1.8
  average_rider_cost_per_delivery: number; // $3.50
  insurance_monthly_cost: number; // $250.00
  software_monthly_cost: number; // $100.00
  maintenance_monthly_cost: number; // $200.00
  other_monthly_costs: number; // $150.00
  default_free_essential_unit_cost?: number;

  fixed_cost_breakdown?: {
    insurance: number;
    software_telecom: number;
    cart_maintenance: number;
    storage_base_rent: number;
    labor_core_base: number;
    other_overhead: number;
  };

  // 3. Cart Optimizer Physical Limits
  cart_max_weight_lbs: number; // 25 lb
  max_cart_weight_lbs?: number;
  cart_max_inventory_value: number; // $500
  max_cart_value_dollars?: number;
  cart_max_units: number; // 100
  max_cart_units?: number;

  // 4. Cart Loadout Score Weights (0-100 total)
  weight_sales_velocity: number; // 40%
  weight_gross_margin: number; // 20%
  weight_free_demand: number; // 15%
  weight_weight_efficiency: number; // 10%
  weight_space_efficiency: number; // 10%
  weight_strategic_importance: number; // 5%

  cart_score_weightings?: {
    sales_velocity: number;
    gross_margin: number;
    free_demand: number;
    weight_efficiency: number;
    space_efficiency: number;
    strategic_importance: number;
  };

  // 5. KPI Targets
  target_aov: number; // $20
  target_delivery_minutes_kpi: number; // 60
  target_under_60_percent: number; // 90%
  target_members_count: number; // 100
  target_monthly_orders: number; // 600
  target_free_daily_limit: number; // 20
}

export interface ProductEconomics {
  product: Product;
  unit_cost: number;
  retail_price: number;
  member_price: number;
  weight: number;
  free_eligible: boolean;
  free_distribution_cost: number;
  inventory_on_hand: number;
  inventory_available: number;
  active: boolean;
  compliance_status: ComplianceStatus;
  
  // Calculated automatically:
  gross_profit: number;
  gross_margin_percent: number;
  member_gross_profit: number;
  member_margin_percent: number;
  profit_per_gram: number;
  
  // Velocity calculated from actual order history:
  velocity_7d: number | null;
  velocity_30d: number | null;
  velocity_90d: number | null;
  velocity_status: 'CALCULATED' | 'INSUFFICIENT_DATA';
  
  // Normalized Cart Recommendation Score:
  cart_score: number;
}

export interface OrderEconomics {
  order_id: string;
  order_number: string;
  customer_name: string;
  created_at: string;
  status: OrderState;
  payment_method: PaymentMethod;
  is_member_order: boolean;

  gross_merchandise_revenue: number;
  product_revenue: number;
  product_cost: number;
  product_gross_profit: number;
  delivery_revenue: number;
  delivery_variable_cost: number;
  payment_processing_cost: number;
  free_item_cost: number;
  free_item_retail_value: number;
  discount_cost: number;
  other_variable_costs: number;
  contribution_margin: number;
  contribution_margin_percent: number;
}

export interface MemberEconomicsSummary {
  subscription_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  subscription_status: SubscriptionStatus;
  monthly_subscription_price: number;
  essential_credit_issued: number;
  essential_credit_redeemed: number;
  essential_credit_remaining: number;
  estimated_wholesale_liability: number;
  delivery_savings_provided: number;
  member_discounts_provided: number;
  member_order_count: number;
  
  redeemed_credit_wholesale_cost: number;
  delivery_subsidy_cost: number;
  discount_subsidy_cost: number;
  estimated_membership_contribution: number;
}

export interface TraderPassEconomics {
  total_subscribers: number;
  active_subscribers: number;
  monthly_subscription_revenue: number;
  total_essential_credit_issued: number;
  total_essential_credit_redeemed: number;
  total_essential_credit_remaining: number;
  total_estimated_wholesale_liability: number;
  total_delivery_savings_provided: number;
  total_member_discounts_provided: number;
  total_member_orders: number;
  total_redeemed_wholesale_cost: number;
  total_delivery_subsidy: number;
  total_discount_subsidy: number;
  net_membership_contribution: number;
  member_summaries: MemberEconomicsSummary[];
}

export interface FreeEssentialItemStat {
  product_id: string;
  product_name: string;
  category: ProductCategory;
  units_distributed: number;
  wholesale_cost_total: number;
  retail_value_total: number;
  average_unit_cost: number;
}

export interface FreeEssentialEconomics {
  free_items_today: number;
  free_items_this_week: number;
  free_items_this_month: number;
  total_units_distributed: number;
  total_wholesale_cost: number; // BUSINESS COST
  total_retail_value: number; // COMMUNITY IMPACT VALUE
  free_cost_per_distribution: number;
  cost_by_category: Record<string, { units: number; wholesale_cost: number; retail_value: number }>;
  cost_by_product: FreeEssentialItemStat[];
}

export type CartRecommendationAction = 'ADD' | 'KEEP' | 'REDUCE' | 'REMOVE';
export type CartActionType = CartRecommendationAction;

export interface CartRecommendationItem {
  product_id: string;
  product_name: string;
  sku?: string;
  category: ProductCategory;
  action: CartRecommendationAction;
  action_reason: string;
  reason?: string;
  score?: number;
  current_cart_quantity: number;
  current_quantity?: number;
  recommended_quantity: number;
  quantity_diff: number;
  unit_weight_g: number;
  unit_cost: number;
  retail_price: number;
  gross_margin_percent: number;
  velocity_7d: number | null;
  cart_score: number;
  total_weight_g: number;
  total_inventory_value: number;
}

export interface CartOptimizerResult {
  current_cart: {
    total_units: number;
    total_weight_lbs: number;
    total_inventory_value: number;
    total_value?: number;
    estimated_gross_profit_capacity: number;
    total_gross_profit_capacity?: number;
  };
  recommended_cart: {
    total_units: number;
    total_weight_lbs: number;
    total_inventory_value: number;
    total_value?: number;
    estimated_gross_profit_capacity: number;
    total_gross_profit_capacity?: number;
    estimated_demand_coverage_percent: number;
    estimated_profit_uplift_percent?: number;
  };
  diff_actions: {
    add: CartRecommendationItem[];
    reduce: CartRecommendationItem[];
    keep: CartRecommendationItem[];
    remove: CartRecommendationItem[];
  };
  items: CartRecommendationItem[];
  warnings: any[];
  max_limits: {
    max_weight_lbs: number;
    max_inventory_value: number;
    max_units: number;
  };
  constraints?: {
    max_weight_lbs: number;
    max_value_dollars: number;
    max_units: number;
  };
}

export interface BreakEvenResult {
  monthly_fixed_costs: number;
  average_contribution_per_order: number;
  average_order_value: number;
  is_sustainable: boolean;
  break_even_achievable?: boolean;
  warning_message?: string;
  break_even_orders_month: number;
  monthly_orders_required?: number;
  break_even_orders_day: number;
  daily_orders_required?: number;
  break_even_revenue_month: number;
  break_even_revenue_required?: number;
}

export interface ScenarioInputs {
  orders_per_day: number;
  average_order_value: number;
  gross_margin_percent: number;
  delivery_fee?: number;
  delivery_fee_per_order?: number;
  free_delivery_percent?: number;
  percent_free_delivery_orders?: number;
  member_count?: number;
  active_members_count?: number;
  member_orders_per_month: number;
  subscription_price?: number;
  monthly_subscription_price?: number;
  essential_credit_redeemed_percent?: number;
  essential_credit_redemption_rate?: number;
  average_free_item_cost?: number;
  free_essential_unit_cost?: number;
  free_essentials_per_day?: number;
  monthly_fixed_costs: number;
  payment_processing_percent: number;
  payment_processing_fixed_fee?: number;
  payment_processing_flat?: number;
  delivery_variable_cost?: number;
  average_delivery_labor_cost?: number;
}

export interface ScenarioResults {
  monthly_orders: number;
  projected_monthly_orders?: number;
  monthly_revenue: number;
  projected_monthly_revenue?: number;
  subscription_revenue: number;
  projected_subscription_revenue?: number;
  product_gross_profit: number;
  projected_product_gross_profit?: number;
  delivery_revenue: number;
  projected_delivery_revenue?: number;
  free_program_cost: number;
  projected_free_essentials_cost?: number;
  payment_processing_cost: number;
  projected_payment_processing_cost?: number;
  delivery_costs: number;
  projected_delivery_labor_cost?: number;
  projected_net_contribution?: number;
  fixed_costs: number;
  estimated_operating_result: number;
  average_contribution_per_order: number;
  break_even_orders_month: number;
  break_even_orders_monthly?: number | null;
  break_even_orders_day: number;
  break_even_orders_daily?: number | null;
  break_even_members: number;
  is_sustainable: boolean;
}

export interface AdminAlert {
  id: string;
  type: 'NEGATIVE_MARGIN' | 'NEGATIVE_MEMBER_CONTRIBUTION' | 'FREE_BUDGET_OVERRUN' | 'CART_OVERWEIGHT' | 'CART_OVER_VALUE' | 'LOW_INVENTORY' | 'DELIVERY_SLA_BREACH' | 'AOV_BELOW_TARGET' | 'SUBSCRIPTION_NEGATIVE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  action_hint?: string;
  related_entity_id?: string;
}
