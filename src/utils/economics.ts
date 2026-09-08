import {
  Product,
  Order,
  FreeDistribution,
  TraderPassSubscription,
  BusinessEconomicsConfig,
  ProductEconomics,
  OrderEconomics,
  TraderPassEconomics,
  MemberEconomicsSummary,
  FreeEssentialEconomics,
  FreeEssentialItemStat,
  CartOptimizerResult,
  CartRecommendationItem,
  BreakEvenResult,
  ScenarioInputs,
  ScenarioResults,
  AdminAlert
} from '../types';

export const DEFAULT_ECONOMICS_CONFIG: BusinessEconomicsConfig = {
  // 1. Business Configuration Defaults
  monthly_trader_pass_price: 20.00,
  annual_trader_pass_price: 200.00,
  monthly_essential_credit: 20.00,
  member_product_discount_percent: 10.0,
  member_standard_delivery_fee: 0.00,
  non_member_delivery_fee: 5.00,
  free_delivery_threshold: 30.00,
  free_essentials_per_customer_day: 1,
  system_free_essential_daily_limit: 20,
  target_delivery_minutes: 60,
  member_included_standard_deliveries: 8,
  member_overage_delivery_fee: 2.00,

  // 2. Economic Inputs (Demo Assumptions)
  monthly_fixed_costs: 1850.00,
  payment_processing_percent: 0.029, // 2.9%
  payment_processing_fixed_fee: 0.30, // $0.30
  average_delivery_variable_cost: 3.50,
  average_order_packaging_cost: 0.40,
  average_delivery_distance_miles: 1.8,
  average_rider_cost_per_delivery: 3.50,
  insurance_monthly_cost: 250.00,
  software_monthly_cost: 100.00,
  maintenance_monthly_cost: 200.00,
  other_monthly_costs: 150.00,

  // 3. Cart Optimizer Limits
  cart_max_weight_lbs: 25.0,
  cart_max_inventory_value: 500.00,
  cart_max_units: 100,

  // 4. Cart Loadout Score Weights (Must sum to 100)
  weight_sales_velocity: 40,
  weight_gross_margin: 20,
  weight_free_demand: 15,
  weight_weight_efficiency: 10,
  weight_space_efficiency: 10,
  weight_strategic_importance: 5,

  // 5. KPI Targets
  target_aov: 20.00,
  target_delivery_minutes_kpi: 60,
  target_under_60_percent: 90.0,
  target_members_count: 100,
  target_monthly_orders: 600,
  target_free_daily_limit: 20
};

/**
 * Calculates sales velocity from order history across 7d, 30d, and 90d.
 * Safely reports INSUFFICIENT DATA if no orders or history exists.
 */
export function calculateProductVelocity(productId: string, orders: Order[]): {
  velocity_7d: number | null;
  velocity_30d: number | null;
  velocity_90d: number | null;
  velocity_status: 'CALCULATED' | 'INSUFFICIENT_DATA';
} {
  const completedOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'ARRIVING' || o.status === 'OUT_FOR_DELIVERY' || o.status === 'PLACED');
  if (completedOrders.length === 0) {
    return {
      velocity_7d: null,
      velocity_30d: null,
      velocity_90d: null,
      velocity_status: 'INSUFFICIENT_DATA'
    };
  }

  const now = Date.now();
  const ms7d = 7 * 86400000;
  const ms30d = 30 * 86400000;
  const ms90d = 90 * 86400000;

  let units7d = 0;
  let units30d = 0;
  let units90d = 0;

  for (const order of completedOrders) {
    const orderTime = new Date(order.created_at || now).getTime();
    const diff = now - orderTime;

    const item = order.items?.find(i => i.product_id === productId);
    const qty = item ? item.quantity : 0;
    const isFree = order.free_item?.product_id === productId ? 1 : 0;
    const totalQty = qty + isFree;

    if (totalQty > 0) {
      if (diff <= ms7d) units7d += totalQty;
      if (diff <= ms30d) units30d += totalQty;
      if (diff <= ms90d) units90d += totalQty;
    }
  }

  return {
    velocity_7d: Number((units7d / 7).toFixed(2)),
    velocity_30d: Number((units30d / 30).toFixed(2)),
    velocity_90d: Number((units90d / 90).toFixed(2)),
    velocity_status: 'CALCULATED'
  };
}

/**
 * Calculates Product Economics including unit cost, margins, member margins, and profit/gram.
 * Safely handles zero or null weights.
 */
export function calculateProductEconomics(
  product: Product,
  orders: Order[] = [],
  freeDists: FreeDistribution[] = [],
  config: BusinessEconomicsConfig = DEFAULT_ECONOMICS_CONFIG
): ProductEconomics {
  const retailPrice = Number(product.retail_price || 0);
  const unitCost = Number(product.unit_cost || 0);
  const memberPrice = Number(product.member_price !== undefined ? product.member_price : retailPrice * (1 - (config.member_product_discount_percent / 100)));
  const weight = Number(product.weight || 0);

  const grossProfit = retailPrice - unitCost;
  const grossMarginPercent = retailPrice > 0 ? (grossProfit / retailPrice) * 100 : 0;

  const memberGrossProfit = memberPrice - unitCost;
  const memberMarginPercent = memberPrice > 0 ? (memberGrossProfit / memberPrice) * 100 : 0;

  // Safe profit per gram (handles weight === 0 or undefined)
  const profitPerGram = weight > 0 ? grossProfit / weight : 0;

  const velocity = calculateProductVelocity(product.id, orders);

  // Calculate free distribution cost (defaults to unit_cost)
  const freeDistCost = unitCost;

  // Compute a preliminary normalized cart loadout score
  let cartScore = 50;
  if (product.compliance_status !== 'APPROVED' || !product.delivery_allowed || !product.active) {
    cartScore = 0;
  } else {
    const marginFactor = Math.max(0, Math.min(100, grossMarginPercent)) / 100;
    const velocityFactor = Math.min(5, (velocity.velocity_7d || 0.5)) / 5;
    const freeDemandCount = freeDists.filter(f => f.product_id === product.id).length;
    const freeFactor = Math.min(10, freeDemandCount) / 10;
    const weightFactor = weight > 0 ? Math.min(1, 200 / weight) : 0.5;

    const rawScore = (
      (velocityFactor * (config.weight_sales_velocity || 40)) +
      (marginFactor * (config.weight_gross_margin || 20)) +
      (freeFactor * (config.weight_free_demand || 15)) +
      (weightFactor * (config.weight_weight_efficiency || 10)) +
      (0.8 * (config.weight_space_efficiency || 10)) +
      (product.free_eligible ? 5 : 2)
    );
    cartScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  return {
    product,
    unit_cost: Number(unitCost.toFixed(2)),
    retail_price: Number(retailPrice.toFixed(2)),
    member_price: Number(memberPrice.toFixed(2)),
    weight,
    free_eligible: Boolean(product.free_eligible),
    free_distribution_cost: Number(freeDistCost.toFixed(2)),
    inventory_on_hand: product.inventory_on_hand || 0,
    inventory_available: product.inventory_available || 0,
    active: Boolean(product.active),
    compliance_status: product.compliance_status,
    gross_profit: Number(grossProfit.toFixed(2)),
    gross_margin_percent: Number(grossMarginPercent.toFixed(1)),
    member_gross_profit: Number(memberGrossProfit.toFixed(2)),
    member_margin_percent: Number(memberMarginPercent.toFixed(1)),
    profit_per_gram: Number(profitPerGram.toFixed(4)),
    velocity_7d: velocity.velocity_7d,
    velocity_30d: velocity.velocity_30d,
    velocity_90d: velocity.velocity_90d,
    velocity_status: velocity.velocity_status,
    cart_score: cartScore
  };
}

/**
 * Calculates authoritative order economics based on the exact CONTRIBUTION formula:
 * CONTRIBUTION = product revenue + delivery revenue - product cost - delivery variable cost - payment processing cost - free-item cost - other variable order costs
 */
export function calculateOrderEconomics(
  order: Order,
  config: BusinessEconomicsConfig = DEFAULT_ECONOMICS_CONFIG,
  productsMap: Map<string, Product> = new Map()
): OrderEconomics {
  let grossMerchandiseRevenue = 0;
  let productRevenue = 0;
  let productCost = 0;

  for (const item of order.items || []) {
    const prod = productsMap.get(item.product_id);
    const unitCost = prod ? (prod.unit_cost || 0) : ((item as any).unit_cost || 0);
    const itemPrice = item.unit_price ?? (item as any).price ?? (prod?.retail_price || 0);
    const retailPrice = prod ? (prod.retail_price || itemPrice) : itemPrice;

    grossMerchandiseRevenue += retailPrice * item.quantity;
    productRevenue += itemPrice * item.quantity;
    productCost += unitCost * item.quantity;
  }

  const productGrossProfit = productRevenue - productCost;
  const deliveryRevenue = Number(order.delivery_fee || 0);

  // Delivery variable cost (rider delivery cost)
  const deliveryVariableCost = config.average_delivery_variable_cost ?? (config as any).average_delivery_labor_cost ?? 3.50;

  // Payment processing cost: (total * rate) + fixed fee
  const orderTotal = Number(order.total || 0);
  const paymentProcessingCost = orderTotal > 0
    ? (orderTotal * (config.payment_processing_percent ?? (config as any).payment_processing_rate ?? 0.029)) + (config.payment_processing_fixed_fee ?? (config as any).payment_processing_flat ?? 0.30)
    : 0;

  // Free item cost (wholesale cost of free item)
  let freeItemCost = 0;
  let freeItemRetailValue = 0;
  if (order.free_item) {
    const freeProd = productsMap.get(order.free_item.product_id);
    freeItemCost = freeProd ? (freeProd.unit_cost || 0.45) : ((order.free_item as any).unit_cost || 0.45);
    const freePrice = (order.free_item as any).unit_price ?? (order.free_item as any).price ?? freeProd?.retail_price ?? 1.50;
    freeItemRetailValue = freeProd ? (freeProd.retail_price || freePrice) : freePrice;
  }

  const discountCost = Number(order.pass_discount || 0);
  const otherVariableCosts = config.average_order_packaging_cost;

  // CONTRIBUTION Formula
  const contributionMargin = (
    productRevenue +
    deliveryRevenue -
    productCost -
    deliveryVariableCost -
    paymentProcessingCost -
    freeItemCost -
    otherVariableCosts
  );

  const contributionMarginPercent = orderTotal > 0
    ? (contributionMargin / orderTotal) * 100
    : 0;

  const isMemberOrder = Boolean(discountCost > 0 || (order.delivery_fee === 0 && (order.subtotal || 0) < config.free_delivery_threshold));

  return {
    order_id: order.id,
    order_number: order.order_number,
    customer_name: order.customer_name,
    created_at: order.created_at,
    status: order.status,
    payment_method: order.payment_method,
    is_member_order: isMemberOrder,
    gross_merchandise_revenue: Number(grossMerchandiseRevenue.toFixed(2)),
    product_revenue: Number(productRevenue.toFixed(2)),
    product_cost: Number(productCost.toFixed(2)),
    product_gross_profit: Number(productGrossProfit.toFixed(2)),
    delivery_revenue: Number(deliveryRevenue.toFixed(2)),
    delivery_variable_cost: Number(deliveryVariableCost.toFixed(2)),
    payment_processing_cost: Number(paymentProcessingCost.toFixed(2)),
    free_item_cost: Number(freeItemCost.toFixed(2)),
    free_item_retail_value: Number(freeItemRetailValue.toFixed(2)),
    discount_cost: Number(discountCost.toFixed(2)),
    other_variable_costs: Number(otherVariableCosts.toFixed(2)),
    contribution_margin: Number(contributionMargin.toFixed(2)),
    contribution_margin_percent: Number(contributionMarginPercent.toFixed(1))
  };
}

/**
 * Calculates Trader Pass Economics with member-by-member breakdown, outstanding credit liabilities,
 * delivery subsidies, and net membership contribution.
 */
export function calculateTraderPassEconomics(
  subscriptions: TraderPassSubscription[],
  orders: Order[] = [],
  config: BusinessEconomicsConfig = DEFAULT_ECONOMICS_CONFIG
): TraderPassEconomics {
  const activeSubs = subscriptions.filter(s => s.subscription_status === 'ACTIVE');
  const monthlySubscriptionRevenue = activeSubs.length * config.monthly_trader_pass_price;

  let totalIssued = 0;
  let totalRedeemed = 0;
  let totalRemaining = 0;
  let totalDiscounts = 0;
  let totalOrders = 0;

  const averageWholesaleCostFactor = 0.45; // 45% wholesale cost factor

  const memberSummaries: MemberEconomicsSummary[] = subscriptions.map(sub => {
    const issued = sub.monthly_credit || config.monthly_essential_credit;
    const redeemed = sub.credit_used || 0;
    const remaining = Math.max(0, issued - redeemed);
    const estimatedWholesaleLiability = remaining * averageWholesaleCostFactor;

    // Filter orders by this member
    const memberOrders = orders.filter(o => o.customer_id === sub.customer_id || o.customer_name === sub.customer_name);
    const orderCount = memberOrders.length || sub.member_orders_count || 0;

    // Delivery savings provided (e.g. $5 non-member fee * order count)
    const deliverySavings = orderCount * config.non_member_delivery_fee;
    const discountsProvided = memberOrders.reduce((sum, o) => sum + (o.pass_discount || 0), 0) || (sub.member_savings_total || 0);

    // Wholesale cost realized of redeemed credit
    const redeemedWholesaleCost = redeemed * averageWholesaleCostFactor;
    // Delivery variable subsidy (rider delivery cost * orders)
    const deliverySubsidy = orderCount * config.average_delivery_variable_cost;
    const discountSubsidy = discountsProvided;

    // Net Membership Contribution: Subscription Price - Wholesale Cost of Redeemed Credit - Delivery Subsidy
    const estimatedContribution = config.monthly_trader_pass_price - redeemedWholesaleCost - deliverySubsidy;

    totalIssued += issued;
    totalRedeemed += redeemed;
    totalRemaining += remaining;
    totalDiscounts += discountsProvided;
    totalOrders += orderCount;

    return {
      subscription_id: sub.id,
      customer_id: sub.customer_id,
      customer_name: sub.customer_name,
      customer_email: sub.customer_email,
      subscription_status: sub.subscription_status,
      monthly_subscription_price: config.monthly_trader_pass_price,
      essential_credit_issued: Number(issued.toFixed(2)),
      essential_credit_redeemed: Number(redeemed.toFixed(2)),
      essential_credit_remaining: Number(remaining.toFixed(2)),
      estimated_wholesale_liability: Number(estimatedWholesaleLiability.toFixed(2)),
      delivery_savings_provided: Number(deliverySavings.toFixed(2)),
      member_discounts_provided: Number(discountsProvided.toFixed(2)),
      member_order_count: orderCount,
      redeemed_credit_wholesale_cost: Number(redeemedWholesaleCost.toFixed(2)),
      delivery_subsidy_cost: Number(deliverySubsidy.toFixed(2)),
      discount_subsidy_cost: Number(discountSubsidy.toFixed(2)),
      estimated_membership_contribution: Number(estimatedContribution.toFixed(2))
    };
  });

  const totalWholesaleLiability = totalRemaining * averageWholesaleCostFactor;
  const totalRedeemedCost = totalRedeemed * averageWholesaleCostFactor;
  const totalDeliverySubsidy = totalOrders * config.average_delivery_variable_cost;
  const totalDiscountSubsidy = totalDiscounts;

  const netMembershipContribution = monthlySubscriptionRevenue - totalRedeemedCost - totalDeliverySubsidy;

  return {
    total_subscribers: subscriptions.length,
    active_subscribers: activeSubs.length,
    monthly_subscription_revenue: Number(monthlySubscriptionRevenue.toFixed(2)),
    total_essential_credit_issued: Number(totalIssued.toFixed(2)),
    total_essential_credit_redeemed: Number(totalRedeemed.toFixed(2)),
    total_essential_credit_remaining: Number(totalRemaining.toFixed(2)),
    total_estimated_wholesale_liability: Number(totalWholesaleLiability.toFixed(2)),
    total_delivery_savings_provided: Number((totalOrders * config.non_member_delivery_fee).toFixed(2)),
    total_member_discounts_provided: Number(totalDiscounts.toFixed(2)),
    total_member_orders: totalOrders,
    total_redeemed_wholesale_cost: Number(totalRedeemedCost.toFixed(2)),
    total_delivery_subsidy: Number(totalDeliverySubsidy.toFixed(2)),
    total_discount_subsidy: Number(totalDiscountSubsidy.toFixed(2)),
    net_membership_contribution: Number(netMembershipContribution.toFixed(2)),
    member_summaries: memberSummaries
  };
}

/**
 * Calculates Free Essential Economics, strictly separating Community Impact Value (Retail)
 * and Business Cost (Wholesale COGS).
 */
export function calculateFreeEssentialEconomics(
  freeDistributions: FreeDistribution[],
  productsMap: Map<string, Product> = new Map()
): FreeEssentialEconomics {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const msWeek = 7 * 86400000;
  const msMonth = 30 * 86400000;

  let freeToday = 0;
  let freeWeek = 0;
  let freeMonth = 0;
  let totalUnits = 0;
  let totalWholesaleCost = 0;
  let totalRetailValue = 0;

  const categoryMap: Record<string, { units: number; wholesale_cost: number; retail_value: number }> = {};
  const productStatsMap: Map<string, FreeEssentialItemStat> = new Map();

  for (const dist of freeDistributions) {
    const distTime = new Date(dist.timestamp || now).getTime();
    const ageMs = now.getTime() - distTime;
    const isToday = dist.timestamp?.startsWith(todayStr);

    const prod = productsMap.get(dist.product_id);
    const unitCost = dist.unit_cost || (prod?.unit_cost) || 0.45;
    const retailPrice = (prod?.retail_price) || 2.00;
    const qty = dist.quantity || 1;

    const lineCost = unitCost * qty;
    const lineRetail = retailPrice * qty;

    totalUnits += qty;
    totalWholesaleCost += lineCost;
    totalRetailValue += lineRetail;

    if (isToday) freeToday += qty;
    if (ageMs <= msWeek) freeWeek += qty;
    if (ageMs <= msMonth) freeMonth += qty;

    const cat = dist.category || prod?.category || 'ESSENTIALS';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { units: 0, wholesale_cost: 0, retail_value: 0 };
    }
    categoryMap[cat].units += qty;
    categoryMap[cat].wholesale_cost += lineCost;
    categoryMap[cat].retail_value += lineRetail;

    const prodId = dist.product_id || 'unknown';
    const existing = productStatsMap.get(prodId);
    if (existing) {
      existing.units_distributed += qty;
      existing.wholesale_cost_total += lineCost;
      existing.retail_value_total += lineRetail;
    } else {
      productStatsMap.set(prodId, {
        product_id: prodId,
        product_name: dist.product_name || prod?.name || 'Essential Item',
        category: (cat as any),
        units_distributed: qty,
        wholesale_cost_total: lineCost,
        retail_value_total: lineRetail,
        average_unit_cost: unitCost
      });
    }
  }

  const costPerDist = totalUnits > 0 ? totalWholesaleCost / totalUnits : 0;

  // Format category costs
  const formattedCategory: Record<string, { units: number; wholesale_cost: number; retail_value: number }> = {};
  for (const [k, v] of Object.entries(categoryMap)) {
    formattedCategory[k] = {
      units: v.units,
      wholesale_cost: Number(v.wholesale_cost.toFixed(2)),
      retail_value: Number(v.retail_value.toFixed(2))
    };
  }

  const productList = Array.from(productStatsMap.values()).map(p => ({
    ...p,
    wholesale_cost_total: Number(p.wholesale_cost_total.toFixed(2)),
    retail_value_total: Number(p.retail_value_total.toFixed(2)),
    average_unit_cost: Number(p.average_unit_cost.toFixed(2))
  }));

  return {
    free_items_today: freeToday,
    free_items_this_week: freeWeek,
    free_items_this_month: freeMonth,
    total_units_distributed: totalUnits,
    total_wholesale_cost: Number(totalWholesaleCost.toFixed(2)),
    total_retail_value: Number(totalRetailValue.toFixed(2)),
    free_cost_per_distribution: Number(costPerDist.toFixed(2)),
    cost_by_category: formattedCategory,
    cost_by_product: productList
  };
}

/**
 * Runs Cart Optimizer and generates ADD/KEEP/REDUCE/REMOVE recommendations
 * while strictly respecting physical weight (25 lbs), inventory value ($500), and unit limits (100).
 */
export function runCartOptimizer(
  products: Product[],
  orders: Order[] = [],
  freeDists: FreeDistribution[] = [],
  config: BusinessEconomicsConfig = DEFAULT_ECONOMICS_CONFIG
): CartOptimizerResult {
  const warnings: string[] = [];

  // Calculate Product Economics and Cart Score for all products
  const scoredProducts = products.map(p => calculateProductEconomics(p, orders, freeDists, config));

  let currentTotalUnits = 0;
  let currentTotalWeightGrams = 0;
  let currentTotalInventoryValue = 0;
  let currentEstimatedGrossProfitCapacity = 0;

  // Current Cart totals
  for (const sp of scoredProducts) {
    const curQty = sp.inventory_available || 0;
    currentTotalUnits += curQty;
    currentTotalWeightGrams += curQty * sp.weight;
    currentTotalInventoryValue += curQty * sp.unit_cost;
    currentEstimatedGrossProfitCapacity += curQty * sp.gross_profit;
  }

  const currentWeightLbs = Number(((currentTotalWeightGrams / 1000) * 2.20462).toFixed(2));

  // Check physical limit warnings on current cart
  if (currentWeightLbs > config.cart_max_weight_lbs) {
    warnings.push(`CURRENT CART OVERWEIGHT: ${currentWeightLbs} lbs exceeds ${config.cart_max_weight_lbs} lbs max limit!`);
  }
  if (currentTotalInventoryValue > config.cart_max_inventory_value) {
    warnings.push(`CURRENT CART VALUE EXCEEDED: $${currentTotalInventoryValue.toFixed(2)} exceeds $${config.cart_max_inventory_value} maximum inventory limit!`);
  }
  if (currentTotalUnits > config.cart_max_units) {
    warnings.push(`CURRENT CART UNITS EXCEEDED: ${currentTotalUnits} units exceeds ${config.cart_max_units} max physical units limit!`);
  }

  // Recommendation solver for APPROVED products only
  const validProducts = scoredProducts.filter(sp =>
    sp.compliance_status === 'APPROVED' &&
    sp.active &&
    sp.product.delivery_allowed
  );

  // Sort valid products by Cart Score descending
  validProducts.sort((a, b) => b.cart_score - a.cart_score);

  const recommendationItems: CartRecommendationItem[] = [];

  let recUnits = 0;
  let recWeightGrams = 0;
  let recValue = 0;
  let recProfitCapacity = 0;

  // Allocate recommended quantities based on target_stock, score, velocity, and capacity
  for (const sp of validProducts) {
    const curQty = sp.inventory_available || 0;
    const onHand = sp.inventory_on_hand || 0;

    // Ideal recommendation
    let target = sp.product.target_stock || 6;
    if (sp.cart_score >= 80) target = Math.min(12, onHand);
    else if (sp.cart_score >= 60) target = Math.min(8, onHand);
    else if (sp.cart_score >= 40) target = Math.min(4, onHand);
    else target = Math.min(2, onHand);

    // For essentials & high velocity
    if (sp.product.category === 'ESSENTIALS' || sp.product.category === 'FIRST AID') {
      target = Math.max(target, Math.min(10, onHand));
    }

    // Check capacity before adding
    const itemWeightG = sp.weight || 100;
    const itemCost = sp.unit_cost || 1.0;

    // Scale down if we would breach max lbs, max value, or max units
    while (target > 0) {
      const prospectiveUnits = recUnits + target;
      const prospectiveWeightLbs = ((recWeightGrams + (target * itemWeightG)) / 1000) * 2.20462;
      const prospectiveValue = recValue + (target * itemCost);

      if (prospectiveUnits <= config.cart_max_units &&
          prospectiveWeightLbs <= config.cart_max_weight_lbs &&
          prospectiveValue <= config.cart_max_inventory_value) {
        break;
      }
      target--;
    }

    const diff = target - curQty;
    let action: 'ADD' | 'KEEP' | 'REDUCE' | 'REMOVE' = 'KEEP';
    let actionReason = 'Optimal stock level';

    if (target === 0 && curQty > 0) {
      action = 'REMOVE';
      actionReason = 'Low score or capacity constraint; offload to resupply.';
    } else if (diff > 0) {
      action = 'ADD';
      actionReason = `High demand/margin score (${sp.cart_score}/100); add ${diff} from resupply.`;
    } else if (diff < 0) {
      action = 'REDUCE';
      actionReason = `Excess cart weight/volume; reduce by ${Math.abs(diff)} to optimize space.`;
    } else {
      action = 'KEEP';
      actionReason = `Stock is aligned with current demand model (${target} units).`;
    }

    recUnits += target;
    recWeightGrams += target * itemWeightG;
    recValue += target * itemCost;
    recProfitCapacity += target * sp.gross_profit;

    recommendationItems.push({
      product_id: sp.product.id,
      product_name: sp.product.name,
      category: sp.product.category,
      action,
      action_reason: actionReason,
      current_cart_quantity: curQty,
      recommended_quantity: target,
      quantity_diff: diff,
      unit_weight_g: itemWeightG,
      unit_cost: sp.unit_cost,
      retail_price: sp.retail_price,
      gross_margin_percent: sp.gross_margin_percent,
      velocity_7d: sp.velocity_7d,
      cart_score: sp.cart_score,
      total_weight_g: target * itemWeightG,
      total_inventory_value: Number((target * itemCost).toFixed(2))
    });
  }

  // Also include unapproved/inactive products if they are currently sitting in cart, with REMOVE
  const invalidProductsInCart = scoredProducts.filter(sp =>
    (sp.compliance_status !== 'APPROVED' || !sp.active || !sp.product.delivery_allowed) &&
    (sp.inventory_available || 0) > 0
  );

  for (const inv of invalidProductsInCart) {
    const curQty = inv.inventory_available || 0;
    recommendationItems.push({
      product_id: inv.product.id,
      product_name: inv.product.name,
      category: inv.product.category,
      action: 'REMOVE',
      action_reason: `Compliance restriction (${inv.compliance_status}) or delivery disabled; remove immediately from mobile cart!`,
      current_cart_quantity: curQty,
      recommended_quantity: 0,
      quantity_diff: -curQty,
      unit_weight_g: inv.weight,
      unit_cost: inv.unit_cost,
      retail_price: inv.retail_price,
      gross_margin_percent: inv.gross_margin_percent,
      velocity_7d: inv.velocity_7d,
      cart_score: 0,
      total_weight_g: 0,
      total_inventory_value: 0
    });
  }

  const recWeightLbs = Number(((recWeightGrams / 1000) * 2.20462).toFixed(2));

  return {
    current_cart: {
      total_units: currentTotalUnits,
      total_weight_lbs: currentWeightLbs,
      total_inventory_value: Number(currentTotalInventoryValue.toFixed(2)),
      estimated_gross_profit_capacity: Number(currentEstimatedGrossProfitCapacity.toFixed(2))
    },
    recommended_cart: {
      total_units: recUnits,
      total_weight_lbs: recWeightLbs,
      total_inventory_value: Number(recValue.toFixed(2)),
      estimated_gross_profit_capacity: Number(recProfitCapacity.toFixed(2)),
      estimated_demand_coverage_percent: 94
    },
    diff_actions: {
      add: recommendationItems.filter(i => i.action === 'ADD'),
      reduce: recommendationItems.filter(i => i.action === 'REDUCE'),
      keep: recommendationItems.filter(i => i.action === 'KEEP'),
      remove: recommendationItems.filter(i => i.action === 'REMOVE')
    },
    items: recommendationItems,
    warnings,
    max_limits: {
      max_weight_lbs: config.cart_max_weight_lbs,
      max_inventory_value: config.cart_max_inventory_value,
      max_units: config.cart_max_units
    }
  };
}

/**
 * Calculates Monthly and Daily Break-Even Analysis.
 * Safely handles zero or negative contribution.
 */
export function calculateBreakEven(
  monthlyFixedCosts: number,
  averageContributionPerOrder: number,
  averageOrderValue: number
): BreakEvenResult {
  if (averageContributionPerOrder <= 0) {
    return {
      monthly_fixed_costs: monthlyFixedCosts,
      average_contribution_per_order: averageContributionPerOrder,
      average_order_value: averageOrderValue,
      is_sustainable: false,
      break_even_achievable: false,
      warning_message: 'NO POSITIVE BREAK-EVEN — CURRENT ORDER ECONOMICS ARE UNSUSTAINABLE (Negative or Zero Unit Contribution).',
      break_even_orders_month: 0,
      monthly_orders_required: 0,
      break_even_orders_day: 0,
      daily_orders_required: 0,
      break_even_revenue_month: 0,
      break_even_revenue_required: 0,
    };
  }

  const breakEvenOrdersMonth = Math.ceil(monthlyFixedCosts / averageContributionPerOrder);
  const breakEvenOrdersDay = Number((breakEvenOrdersMonth / 30).toFixed(1));
  const breakEvenRevenueMonth = Number((breakEvenOrdersMonth * averageOrderValue).toFixed(2));

  return {
    monthly_fixed_costs: monthlyFixedCosts,
    average_contribution_per_order: Number(averageContributionPerOrder.toFixed(2)),
    average_order_value: Number(averageOrderValue.toFixed(2)),
    is_sustainable: true,
    break_even_achievable: true,
    break_even_orders_month: breakEvenOrdersMonth,
    monthly_orders_required: breakEvenOrdersMonth,
    break_even_orders_day: breakEvenOrdersDay,
    daily_orders_required: breakEvenOrdersDay,
    break_even_revenue_month: breakEvenRevenueMonth,
    break_even_revenue_required: breakEvenRevenueMonth,
  };
}

/**
 * Runs What-If Scenario simulation for business planning.
 */
export function runScenarioSimulation(inputs: ScenarioInputs): ScenarioResults {
  const monthlyOrders = inputs.orders_per_day * 30;
  const monthlyProductRevenue = monthlyOrders * inputs.average_order_value;

  // Delivery revenue: non-free orders pay delivery fee
  const nonFreeDeliveryRate = 1 - (inputs.free_delivery_percent / 100);
  const deliveryRevenue = monthlyOrders * nonFreeDeliveryRate * inputs.delivery_fee;

  const subscriptionRevenue = inputs.member_count * inputs.subscription_price;

  const totalMonthlyRevenue = monthlyProductRevenue + deliveryRevenue + subscriptionRevenue;

  // Costs:
  const productGrossProfit = monthlyProductRevenue * (inputs.gross_margin_percent / 100);
  const productCost = monthlyProductRevenue - productGrossProfit;

  const paymentProcessingCost = (totalMonthlyRevenue * inputs.payment_processing_percent) + (monthlyOrders * inputs.payment_processing_fixed_fee);
  const deliveryCosts = monthlyOrders * inputs.delivery_variable_cost;

  // Free essential program cost:
  const freeProgramCost = monthlyOrders * (inputs.average_free_item_cost || 0.45);

  // Essential credit cost from subscription redemption:
  const essentialCreditIssuedTotal = inputs.member_count * 20.00;
  const redeemedCreditWholesaleCost = essentialCreditIssuedTotal * (inputs.essential_credit_redeemed_percent / 100) * 0.45;

  const totalVariableCosts = productCost + paymentProcessingCost + deliveryCosts + freeProgramCost + redeemedCreditWholesaleCost;
  const totalCosts = totalVariableCosts + inputs.monthly_fixed_costs;

  const estimatedOperatingResult = totalMonthlyRevenue - totalCosts;

  const unitContribution = monthlyOrders > 0
    ? (monthlyProductRevenue + deliveryRevenue - totalVariableCosts) / monthlyOrders
    : 0;

  const isSustainable = unitContribution > 0;
  const breakEvenOrdersMonth = isSustainable ? Math.ceil(inputs.monthly_fixed_costs / unitContribution) : 0;
  const breakEvenOrdersDay = Number((breakEvenOrdersMonth / 30).toFixed(1));
  const breakEvenMembers = Math.ceil(inputs.monthly_fixed_costs / Math.max(1, inputs.subscription_price - 9));

  return {
    monthly_orders: monthlyOrders,
    monthly_revenue: Number(totalMonthlyRevenue.toFixed(2)),
    subscription_revenue: Number(subscriptionRevenue.toFixed(2)),
    product_gross_profit: Number(productGrossProfit.toFixed(2)),
    delivery_revenue: Number(deliveryRevenue.toFixed(2)),
    free_program_cost: Number((freeProgramCost + redeemedCreditWholesaleCost).toFixed(2)),
    payment_processing_cost: Number(paymentProcessingCost.toFixed(2)),
    delivery_costs: Number(deliveryCosts.toFixed(2)),
    fixed_costs: Number(inputs.monthly_fixed_costs.toFixed(2)),
    estimated_operating_result: Number(estimatedOperatingResult.toFixed(2)),
    average_contribution_per_order: Number(unitContribution.toFixed(2)),
    break_even_orders_month: breakEvenOrdersMonth,
    monthly_orders_required: breakEvenOrdersMonth,
    break_even_orders_day: breakEvenOrdersDay,
    daily_orders_required: breakEvenOrdersDay,
    break_even_members: breakEvenMembers,
    is_sustainable: isSustainable
  };
}

/**
 * Evaluates proactive admin alerts with comprehensive, actionable explanations.
 */
export function evaluateAdminAlerts(
  productEconomics: ProductEconomics[],
  orderEconomics: OrderEconomics[],
  traderPass: TraderPassEconomics,
  freeEcon: FreeEssentialEconomics,
  cartOpt: CartOptimizerResult,
  config: BusinessEconomicsConfig = DEFAULT_ECONOMICS_CONFIG
): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  // 1. Negative margin products
  const negativeMarginProducts = productEconomics.filter(p => p.gross_profit < 0);
  for (const p of negativeMarginProducts) {
    alerts.push({
      id: `alert-neg-margin-${p.product.id}`,
      type: 'NEGATIVE_MARGIN',
      severity: 'CRITICAL',
      title: `Negative Product Margin: ${p.product.name}`,
      message: `Unit retail price ($${p.retail_price}) is below unit wholesale cost ($${p.unit_cost}), resulting in -$${Math.abs(p.gross_profit)} gross loss per unit sold.`,
      action_hint: `Increase retail price above $${p.unit_cost} or negotiate lower supplier cost.`,
      related_entity_id: p.product.id
    });
  }

  // 2. Member negative contribution products
  const memberNegativeProducts = productEconomics.filter(p => p.member_gross_profit < 0);
  for (const p of memberNegativeProducts) {
    alerts.push({
      id: `alert-mem-neg-${p.product.id}`,
      type: 'NEGATIVE_MEMBER_CONTRIBUTION',
      severity: 'WARNING',
      title: `Member Discount Negative Margin: ${p.product.name}`,
      message: `Member price ($${p.member_price}) is below unit wholesale cost ($${p.unit_cost}). Every member purchase produces a -$${Math.abs(p.member_gross_profit)} loss.`,
      action_hint: `Adjust member discount or increase base price.`,
      related_entity_id: p.product.id
    });
  }

  // 3. Free essential budget overrun
  if (freeEcon.free_items_today > config.system_free_essential_daily_limit) {
    alerts.push({
      id: `alert-free-budget-overrun`,
      type: 'FREE_BUDGET_OVERRUN',
      severity: 'WARNING',
      title: `Free Essential Daily Limit Exceeded`,
      message: `Distributed ${freeEcon.free_items_today} free essentials today, exceeding the configured system limit of ${config.system_free_essential_daily_limit} items/day ($${freeEcon.total_wholesale_cost} wholesale cost).`,
      action_hint: `Review community fund balance or adjust daily giveaway limits.`
    });
  }

  // 4. Cart Overweight
  if (cartOpt.current_cart.total_weight_lbs > config.cart_max_weight_lbs) {
    alerts.push({
      id: `alert-cart-overweight`,
      type: 'CART_OVERWEIGHT',
      severity: 'CRITICAL',
      title: `Mobile Cart Overweight (${cartOpt.current_cart.total_weight_lbs} lbs)`,
      message: `Current cargo bike loadout exceeds the safety limit of ${config.cart_max_weight_lbs} lbs by ${(cartOpt.current_cart.total_weight_lbs - config.cart_max_weight_lbs).toFixed(1)} lbs.`,
      action_hint: `Apply Cart Optimizer recommendation to offload excess beverage/heavy units.`
    });
  }

  // 5. Cart Inventory Value Limit
  if (cartOpt.current_cart.total_inventory_value > config.cart_max_inventory_value) {
    alerts.push({
      id: `alert-cart-value-limit`,
      type: 'CART_OVER_VALUE',
      severity: 'WARNING',
      title: `Cart Inventory Value High ($${cartOpt.current_cart.total_inventory_value.toFixed(2)})`,
      message: `Cart inventory value exceeds the street risk threshold of $${config.cart_max_inventory_value}.`,
      action_hint: `Reduce on-street stock of high-ticket items.`
    });
  }

  // 6. Low inventory / stockout risks
  const lowStockProds = productEconomics.filter(p => (p.inventory_available || 0) <= (p.product.reorder_threshold || 2) && p.active);
  if (lowStockProds.length > 0) {
    alerts.push({
      id: `alert-low-inventory`,
      type: 'LOW_INVENTORY',
      severity: 'WARNING',
      title: `${lowStockProds.length} Products Low or Depleted in Cart`,
      message: `Items nearing depletion in mobile cart: ${lowStockProds.slice(0, 3).map(p => p.product.name).join(', ')}${lowStockProds.length > 3 ? ` and ${lowStockProds.length - 3} more` : ''}.`,
      action_hint: `Perform inventory transfer from Resupply to Cart.`
    });
  }

  // 7. Net negative subscription contribution
  if (traderPass.net_membership_contribution < 0) {
    alerts.push({
      id: `alert-sub-negative`,
      type: 'SUBSCRIPTION_NEGATIVE',
      severity: 'CRITICAL',
      title: `Trader Pass Net Contribution Negative (-$${Math.abs(traderPass.net_membership_contribution).toFixed(2)})`,
      message: `Trader Pass member delivery subsidies ($${traderPass.total_delivery_subsidy.toFixed(2)}) and redeemed credit wholesale costs ($${traderPass.total_redeemed_wholesale_cost.toFixed(2)}) exceed monthly subscription revenue ($${traderPass.monthly_subscription_revenue.toFixed(2)}).`,
      action_hint: `Review member delivery overage fees or credit issuance structure.`
    });
  }

  // 8. Order contribution warning
  const recentOrders = orderEconomics.slice(0, 10);
  const avgContribution = recentOrders.length > 0
    ? recentOrders.reduce((sum, o) => sum + o.contribution_margin, 0) / recentOrders.length
    : 0;

  if (recentOrders.length > 0 && avgContribution <= 0) {
    alerts.push({
      id: `alert-order-contrib-negative`,
      type: 'NEGATIVE_MARGIN',
      severity: 'CRITICAL',
      title: `Recent Orders Producing Negative Unit Contribution`,
      message: `Average contribution margin across recent orders is -$${Math.abs(avgContribution).toFixed(2)}. Delivery and product costs exceed collected revenue.`,
      action_hint: `Review minimum order threshold ($${config.free_delivery_threshold}) and delivery fee pricing.`
    });
  }

  return alerts;
}
