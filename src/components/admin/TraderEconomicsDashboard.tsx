import React, { useState } from 'react';
import {
  BreakEvenResult,
  AdminAlert,
  BusinessEconomicsConfig
} from '../../types';
import {
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  Sparkles,
  Heart,
  ShieldAlert,
  ArrowUpRight,
  HelpCircle
} from 'lucide-react';

interface EconomicsDashboardData {
  today: {
    orders_count: number;
    revenue: number;
    product_revenue: number;
    delivery_revenue: number;
    aov: number;
    product_gross_profit: number;
    contribution: number;
    free_essential_cost: number;
    payment_processing_cost: number;
    average_delivery_time_minutes: number;
    percent_under_60_minutes: number;
  };
  month: {
    orders_count: number;
    revenue: number;
    aov: number;
    product_gross_profit: number;
    order_contribution: number;
    total_contribution: number;
    free_essential_cost: number;
    subscription_revenue: number;
    member_count: number;
    member_contribution: number;
    fixed_costs: number;
    estimated_operating_result: number;
  };
  break_even: BreakEvenResult;
  kpi_status: {
    aov: { current: number; target: number; met: boolean };
    delivery_minutes: { current: number; target: number; met: boolean };
    under_60_percent: { current: number; target: number; met: boolean };
    members: { current: number; target: number; met: boolean };
    monthly_orders: { current: number; target: number; met: boolean };
    free_daily_limit: { current: number; target: number; met: boolean };
  };
  config: BusinessEconomicsConfig;
}

interface TraderEconomicsDashboardProps {
  dashboardData: EconomicsDashboardData | null;
  alerts: AdminAlert[];
  loading?: boolean;
}

export const TraderEconomicsDashboard: React.FC<TraderEconomicsDashboardProps> = ({
  dashboardData,
  alerts,
  loading
}) => {
  const [period, setPeriod] = useState<'TODAY' | 'MONTH'>('TODAY');

  if (loading || !dashboardData) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Compiling authoritative business economics and contribution analytics...</p>
      </div>
    );
  }

  const { today, month, break_even, kpi_status, config } = dashboardData;
  const isMonth = period === 'MONTH';

  const activeRevenue = isMonth ? month.revenue : today.revenue;
  const activeOrders = isMonth ? month.orders_count : today.orders_count;
  const activeAov = isMonth ? month.aov : today.aov;
  const activeGrossProfit = isMonth ? month.product_gross_profit : today.product_gross_profit;
  const activeContribution = isMonth ? month.total_contribution : today.contribution;
  const activeFreeCost = isMonth ? month.free_essential_cost : today.free_essential_cost;

  return (
    <div id="trader-economics-dashboard" className="space-y-6">
      {/* Top Bar: Title & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Executive Business Economics & Performance Dashboard
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Real-time authoritative contribution margins, break-even targets, subscription economics, and active alerts.
          </p>
        </div>

        {/* Period Switcher Tabs */}
        <div className="flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200 self-start sm:self-auto">
          <button
            id="tab-period-today"
            onClick={() => setPeriod('TODAY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isMonth ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Today's Economics
          </button>
          <button
            id="tab-period-month"
            onClick={() => setPeriod('MONTH')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isMonth ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Monthly Performance (M-T-D)
          </button>
        </div>
      </div>

      {/* Active Admin Alerts Deck */}
      {alerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Active Economics & Operational Alerts ({alerts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : alert.severity === 'WARNING'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{alert.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-white/70">
                    {alert.type}
                  </span>
                </div>
                <p className="opacity-90">{alert.message}</p>
                {alert.action_required && (
                  <div className="pt-1 text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Recommended: {alert.action_required}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>{isMonth ? 'Monthly Gross Revenue' : "Today's Gross Revenue"}</span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            ${activeRevenue.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {activeOrders} orders completed • <span className="font-mono">${activeAov.toFixed(2)} AOV</span>
          </div>
        </div>

        {/* Product Gross Profit */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Product Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-700">
            ${activeGrossProfit.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {activeRevenue > 0 ? ((activeGrossProfit / activeRevenue) * 100).toFixed(1) : '0'}% product margin
          </div>
        </div>

        {/* Total Net Contribution */}
        <div className="bg-emerald-50/60 p-5 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
            <span>Net Contribution Margin</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-700">
            ${activeContribution.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-emerald-800">
            After variable delivery, payment processing & free items
          </div>
        </div>

        {/* Free Essential Wholesale Cost */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
            <span>Free Essential Wholesale Cost</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            ${activeFreeCost.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Wholesale COGS incurred for free community hydration & snacks
          </div>
        </div>
      </div>

      {/* Break-Even Analysis Module */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Authoritative Break-Even Analysis
              </h3>
              <p className="text-xs text-neutral-500">
                Monthly fixed overhead: <strong>${config.monthly_fixed_costs.toFixed(0)}</strong> • Average order contribution: <strong>${break_even.average_contribution_per_order.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            break_even.break_even_achievable
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}>
            {break_even.break_even_achievable ? 'Break-Even Reachable' : 'Margin Unsustainable'}
          </span>
        </div>

        {break_even.break_even_achievable ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
            <div>
              <div className="text-xs text-neutral-500">Monthly Break-Even Orders</div>
              <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
                {break_even.monthly_orders_required} <span className="text-xs font-normal text-neutral-400">orders</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                {month.orders_count} / {break_even.monthly_orders_required} ({((month.orders_count / Math.max(1, break_even.monthly_orders_required || 1)) * 100).toFixed(0)}% to target)
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500">Daily Break-Even Orders</div>
              <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
                {break_even.daily_orders_required} <span className="text-xs font-normal text-neutral-400">orders/day</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Target pace for 30-day operating month
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500">Break-Even Gross Revenue</div>
              <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
                ${break_even.break_even_revenue_required?.toFixed(2)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                At baseline average order value of ${month.aov.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">NO POSITIVE BREAK-EVEN — CURRENT ORDER ECONOMICS ARE UNSUSTAINABLE</div>
              <p className="mt-1">
                The current average contribution per order (${break_even.average_contribution_per_order.toFixed(2)}) is zero or negative. Fixed costs cannot be amortized until order revenue exceeds direct variable costs (COGS + delivery labor + payment fees).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Targets Progress Tracker */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Core Business KPI Target Progress
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* AOV Target */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">AOV Target</div>
            <div className="text-base font-bold font-mono text-neutral-900 mt-1">
              ${kpi_status.aov.current.toFixed(2)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Target: ${kpi_status.aov.target}</span>
              <span className={`font-bold ${kpi_status.aov.met ? 'text-emerald-700' : 'text-amber-600'}`}>
                {kpi_status.aov.met ? 'MET' : 'BELOW'}
              </span>
            </div>
          </div>

          {/* Delivery SLA */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">Delivery Time</div>
            <div className="text-base font-bold font-mono text-neutral-900 mt-1">
              {kpi_status.delivery_minutes.current} mins
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Target: &le;{kpi_status.delivery_minutes.target}m</span>
              <span className={`font-bold ${kpi_status.delivery_minutes.met ? 'text-emerald-700' : 'text-rose-600'}`}>
                {kpi_status.delivery_minutes.met ? 'MET' : 'EXCEEDED'}
              </span>
            </div>
          </div>

          {/* Under 60 min % */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">&le;60 Min SLA %</div>
            <div className="text-base font-bold font-mono text-neutral-900 mt-1">
              {kpi_status.under_60_percent.current}%
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Target: &ge;{kpi_status.under_60_percent.target}%</span>
              <span className={`font-bold ${kpi_status.under_60_percent.met ? 'text-emerald-700' : 'text-amber-600'}`}>
                {kpi_status.under_60_percent.met ? 'MET' : 'BELOW'}
              </span>
            </div>
          </div>

          {/* Members */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">Subscribers</div>
            <div className="text-base font-bold font-mono text-neutral-900 mt-1">
              {kpi_status.members.current}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Target: {kpi_status.members.target}</span>
              <span className={`font-bold ${kpi_status.members.met ? 'text-emerald-700' : 'text-neutral-500'}`}>
                {kpi_status.members.met ? 'MET' : `${kpi_status.members.current}/${kpi_status.members.target}`}
              </span>
            </div>
          </div>

          {/* Monthly Orders */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">Monthly Orders</div>
            <div className="text-base font-bold font-mono text-neutral-900 mt-1">
              {kpi_status.monthly_orders.current}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Target: {kpi_status.monthly_orders.target}</span>
              <span className={`font-bold ${kpi_status.monthly_orders.met ? 'text-emerald-700' : 'text-neutral-500'}`}>
                {kpi_status.monthly_orders.met ? 'MET' : `${kpi_status.monthly_orders.current}/${kpi_status.monthly_orders.target}`}
              </span>
            </div>
          </div>

          {/* Free Daily Limit */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="text-[11px] text-neutral-500 uppercase font-semibold">Daily Free Cap</div>
            <div className="text-base font-bold font-mono text-neutral-900 mt-1">
              {kpi_status.free_daily_limit.current} / {kpi_status.free_daily_limit.target}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Cap: {kpi_status.free_daily_limit.target}/d</span>
              <span className={`font-bold ${kpi_status.free_daily_limit.met ? 'text-emerald-700' : 'text-rose-600'}`}>
                {kpi_status.free_daily_limit.met ? 'WITHIN CAP' : 'OVER CAP'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
