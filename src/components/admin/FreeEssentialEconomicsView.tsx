import React from 'react';
import { FreeEssentialEconomics } from '../../types';
import {
  Heart,
  DollarSign,
  Package,
  Calendar,
  Gift,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FreeEssentialEconomicsViewProps {
  freeEconomics: FreeEssentialEconomics | null;
  loading?: boolean;
}

export const FreeEssentialEconomicsView: React.FC<FreeEssentialEconomicsViewProps> = ({ freeEconomics, loading }) => {
  if (loading || !freeEconomics) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Analyzing Free Essential distributions and wholesale costs...</p>
      </div>
    );
  }

  return (
    <div id="free-essential-economics-container" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
          Free Essentials Program Economics & Community Impact
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Tracking the vital difference between <strong>Retail Community Impact Value</strong> (value delivered to residents) and <strong>Wholesale Business COGS</strong> (actual cost to 24).
        </p>
      </div>

      {/* Two Hero Cards: Impact vs Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Retail Community Impact Value */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-blue-600" />
              Community Impact Value (Retail)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
              Delivered Free
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-blue-950">
              ${freeEconomics.total_retail_impact_value.toFixed(2)}
            </span>
            <span className="text-xs text-blue-700 font-medium">
              across {freeEconomics.total_items_distributed} free items
            </span>
          </div>

          <p className="mt-3 text-xs text-blue-800/80 leading-relaxed">
            The total retail price value of essential goods provided to Manchester residents without cost, preventing hunger and dehydration.
          </p>
        </div>

        {/* Card 2: Wholesale Business Cost */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-600" />
              Actual Business Wholesale Cost (COGS)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
              Wholesale Expense
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-amber-950">
              ${freeEconomics.total_wholesale_cost.toFixed(2)}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              ~${freeEconomics.average_wholesale_cost_per_item.toFixed(2)} avg / unit
            </span>
          </div>

          <p className="mt-3 text-xs text-amber-800/80 leading-relaxed">
            The true wholesale expense incurred to purchase and distribute these items, fully offset by sponsor grants and subscription margins.
          </p>
        </div>
      </div>

      {/* Timeframe Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Today's Free Essentials</div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            {freeEconomics.free_items_today} <span className="text-xs font-normal text-neutral-400">items</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 font-mono">
            ${(freeEconomics.free_items_today * freeEconomics.average_wholesale_cost_per_item).toFixed(2)} estimated COGS
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">This Week's Free Essentials</div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            {freeEconomics.free_items_week} <span className="text-xs font-normal text-neutral-400">items</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 font-mono">
            ${(freeEconomics.free_items_week * freeEconomics.average_wholesale_cost_per_item).toFixed(2)} estimated COGS
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">This Month's Free Essentials</div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            {freeEconomics.free_items_month} <span className="text-xs font-normal text-neutral-400">items</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500 font-mono">
            ${freeEconomics.total_wholesale_cost.toFixed(2)} total wholesale cost
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">
            Distribution by Category ({freeEconomics.category_breakdown.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5">CATEGORY</th>
                <th className="py-3 px-3 text-right">UNITS DELIVERED</th>
                <th className="py-3 px-3 text-right">WHOLESALE COST</th>
                <th className="py-3 px-3 text-right">RETAIL IMPACT VALUE</th>
                <th className="py-3 px-3.5 text-right">% OF TOTAL UNITS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {freeEconomics.category_breakdown.map((cat, idx) => {
                const percent = freeEconomics.total_items_distributed > 0
                  ? (cat.units / freeEconomics.total_items_distributed) * 100
                  : 0;

                return (
                  <tr key={idx} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-3.5 font-medium text-neutral-900">{cat.category}</td>
                    <td className="py-3 px-3 text-right font-mono text-neutral-700">{cat.units}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 font-medium">${cat.wholesale_cost.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-700 font-medium">${cat.retail_value.toFixed(2)}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-neutral-500">{percent.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product-by-Product Breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">
            Top Distributed Free Essential Products ({freeEconomics.product_breakdown.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5">PRODUCT NAME</th>
                <th className="py-3 px-3 text-right">UNITS DISTRIBUTED</th>
                <th className="py-3 px-3 text-right">WHOLESALE COGS</th>
                <th className="py-3 px-3 text-right">RETAIL IMPACT</th>
                <th className="py-3 px-3.5 text-right">AVG UNIT COST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {freeEconomics.product_breakdown.map(prod => (
                <tr key={prod.product_id} className="hover:bg-neutral-50/70">
                  <td className="py-3 px-3.5 font-medium text-neutral-900">{prod.product_name}</td>
                  <td className="py-3 px-3 text-right font-mono text-neutral-700">{prod.units_distributed}</td>
                  <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">${prod.total_wholesale_cost.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-mono text-blue-700 font-semibold">${prod.total_retail_value.toFixed(2)}</td>
                  <td className="py-3 px-3.5 text-right font-mono text-neutral-500">${prod.average_unit_cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
