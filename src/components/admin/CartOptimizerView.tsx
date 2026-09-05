import React, { useState } from 'react';
import { CartOptimizerResult, CartActionType } from '../../types';
import {
  Package,
  Scale,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';

interface CartOptimizerViewProps {
  optimizerResult: CartOptimizerResult | null;
  loading?: boolean;
  onApply?: () => Promise<void>;
  onRefresh?: () => void;
}

export const CartOptimizerView: React.FC<CartOptimizerViewProps> = ({
  optimizerResult,
  loading,
  onApply,
  onRefresh
}) => {
  const [activeActionFilter, setActiveActionFilter] = useState<string>('ALL');
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  if (loading || !optimizerResult) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Solving optimal mobile cart loadout and score weighting equations...</p>
      </div>
    );
  }

  const { current_cart, recommended_cart, constraints, items, warnings } = optimizerResult;

  // Capacity calculations
  const weightPercent = (recommended_cart.total_weight_lbs / constraints.max_weight_lbs) * 100;
  const valuePercent = (recommended_cart.total_value / constraints.max_value_dollars) * 100;
  const unitsPercent = (recommended_cart.total_units / constraints.max_units) * 100;

  const filteredItems = items.filter(item => {
    if (activeActionFilter === 'ALL') return true;
    return item.action === activeActionFilter;
  });

  const handleApplyClick = async () => {
    if (!onApply) return;
    setApplying(true);
    setApplySuccess(false);
    try {
      await onApply();
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 4000);
    } catch (e) {
      console.error('Failed to apply cart loadout:', e);
    } finally {
      setApplying(false);
    }
  };

  const getActionBadge = (action: CartActionType) => {
    switch (action) {
      case 'ADD':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <PlusCircle className="w-3 h-3 text-emerald-600" /> ADD
          </span>
        );
      case 'KEEP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> KEEP
          </span>
        );
      case 'REDUCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <MinusCircle className="w-3 h-3 text-amber-600" /> REDUCE
          </span>
        );
      case 'REMOVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3 text-rose-600" /> REMOVE
          </span>
        );
    }
  };

  return (
    <div id="cart-optimizer-container" className="space-y-6">
      {/* Header & Apply CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            Mobile Cart Loadout Optimizer
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Optimizes physical bicycle/backpack loadout for maximum profit, sales velocity, and community free essential demand.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium transition-colors"
              title="Refresh Optimization"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            id="btn-apply-cart-loadout"
            onClick={handleApplyClick}
            disabled={applying}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
              applySuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-50'
            }`}
          >
            {applying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating Inventory...
              </>
            ) : applySuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                Cart Loadout Applied!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                Apply Optimal Loadout to Cart
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warnings & Constraints Notices */}
      {warnings && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{w.title}:</span> {w.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Capacity Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weight Gauge */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-neutral-400" /> Total Weight Capacity
            </span>
            <span className="font-mono text-neutral-900 font-bold">
              {recommended_cart.total_weight_lbs.toFixed(1)} / {constraints.max_weight_lbs} lbs
            </span>
          </div>
          <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                weightPercent > 100 ? 'bg-rose-500' : weightPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, weightPercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 text-right font-mono">
            {weightPercent.toFixed(0)}% payload utilization
          </div>
        </div>

        {/* Inventory Value Gauge */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-neutral-400" /> Max Value Limit
            </span>
            <span className="font-mono text-neutral-900 font-bold">
              ${recommended_cart.total_value.toFixed(2)} / ${constraints.max_value_dollars}
            </span>
          </div>
          <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                valuePercent > 100 ? 'bg-rose-500' : valuePercent > 85 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, valuePercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 text-right font-mono">
            {valuePercent.toFixed(0)}% security value cap
          </div>
        </div>

        {/* Unit Count Gauge */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-neutral-400" /> Unit Count Limit
            </span>
            <span className="font-mono text-neutral-900 font-bold">
              {recommended_cart.total_units} / {constraints.max_units} units
            </span>
          </div>
          <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                unitsPercent > 100 ? 'bg-rose-500' : unitsPercent > 85 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, unitsPercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 text-right font-mono">
            {unitsPercent.toFixed(0)}% physical unit density
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison: Current vs Recommended */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Cart */}
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Current Cart Loadout
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-neutral-500">Total Units:</span>
              <div className="font-mono font-bold text-neutral-900 text-base">{current_cart.total_units} units</div>
            </div>
            <div>
              <span className="text-neutral-500">Total Weight:</span>
              <div className="font-mono font-bold text-neutral-900 text-base">{current_cart.total_weight_lbs.toFixed(1)} lbs</div>
            </div>
            <div>
              <span className="text-neutral-500">Wholesale Value:</span>
              <div className="font-mono font-bold text-neutral-900 text-base">${current_cart.total_value.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-neutral-500">Gross Profit Capacity:</span>
              <div className="font-mono font-bold text-neutral-900 text-base">${current_cart.total_gross_profit_capacity.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Recommended Cart */}
        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Recommended Optimal Loadout
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-emerald-800">Optimal Units:</span>
              <div className="font-mono font-bold text-emerald-950 text-base">{recommended_cart.total_units} units</div>
            </div>
            <div>
              <span className="text-emerald-800">Optimal Weight:</span>
              <div className="font-mono font-bold text-emerald-950 text-base">{recommended_cart.total_weight_lbs.toFixed(1)} lbs</div>
            </div>
            <div>
              <span className="text-emerald-800">Wholesale Value:</span>
              <div className="font-mono font-bold text-emerald-950 text-base">${recommended_cart.total_value.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-emerald-800">Profit Capacity (+{recommended_cart.estimated_profit_uplift_percent.toFixed(1)}%):</span>
              <div className="font-mono font-bold text-emerald-700 text-base">${recommended_cart.total_gross_profit_capacity.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Filter Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Recommended Action Diff ({filteredItems.length} items)
          </h3>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'All Items' },
                { id: 'ADD', label: 'Add' },
                { id: 'KEEP', label: 'Keep' },
                { id: 'REDUCE', label: 'Reduce' },
                { id: 'REMOVE', label: 'Remove' }
              ] as const
            ).map(f => (
              <button
                key={f.id}
                onClick={() => setActiveActionFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeActionFilter === f.id
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Diff Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">ACTION</th>
                <th className="py-2.5 px-3">PRODUCT</th>
                <th className="py-2.5 px-3 text-center">CURRENT → OPTIMAL</th>
                <th className="py-2.5 px-3 text-right">CHANGE</th>
                <th className="py-2.5 px-3 text-right">CART SCORE</th>
                <th className="py-2.5 px-3">REASON / JUSTIFICATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredItems.map(item => (
                <tr key={item.product_id} className="hover:bg-neutral-50/70">
                  <td className="py-2.5 px-3">{getActionBadge(item.action)}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-neutral-900">{item.product_name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{item.sku}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="text-neutral-500">{item.current_quantity}</span>
                    <span className="mx-1.5 text-neutral-400">→</span>
                    <span className="font-bold text-neutral-900">{item.recommended_quantity}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {item.quantity_diff > 0 ? (
                      <span className="text-emerald-600">+{item.quantity_diff}</span>
                    ) : item.quantity_diff < 0 ? (
                      <span className="text-rose-600">{item.quantity_diff}</span>
                    ) : (
                      <span className="text-neutral-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-800">
                    {item.score.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-600">
                    {item.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
