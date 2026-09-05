import React, { useState, useMemo } from 'react';
import { OrderEconomics } from '../../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Package,
  Receipt,
  User,
  ShieldAlert
} from 'lucide-react';

interface OrderEconomicsLedgerProps {
  orders: OrderEconomics[];
  loading?: boolean;
}

export const OrderEconomicsLedger: React.FC<OrderEconomicsLedgerProps> = ({ orders, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PROFITABLE' | 'UNPROFITABLE' | 'MEMBERS' | 'FREE_INCLUDED'>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = item.order_id?.toLowerCase().includes(q);
        const matchCust = item.customer_name?.toLowerCase().includes(q);
        if (!matchId && !matchCust) return false;
      }

      switch (filterType) {
        case 'PROFITABLE':
          return item.is_profitable;
        case 'UNPROFITABLE':
          return !item.is_profitable;
        case 'MEMBERS':
          return item.is_member;
        case 'FREE_INCLUDED':
          return item.free_items_count > 0;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [orders, searchQuery, filterType]);

  const summary = useMemo(() => {
    const totalCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.gross_merchandise_revenue, 0);
    const totalContribution = orders.reduce((sum, o) => sum + o.contribution_margin, 0);
    const avgContribution = totalCount > 0 ? totalContribution / totalCount : 0;
    const profitableCount = orders.filter(o => o.is_profitable).length;
    const unprofitableCount = orders.filter(o => !o.is_profitable).length;
    const totalFreeCost = orders.reduce((sum, o) => sum + o.free_item_wholesale_cost, 0);

    return {
      totalCount,
      totalRevenue: totalRevenue.toFixed(2),
      totalContribution: totalContribution.toFixed(2),
      avgContribution: avgContribution.toFixed(2),
      profitableCount,
      unprofitableCount,
      totalFreeCost: totalFreeCost.toFixed(2)
    };
  }, [orders]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  return (
    <div id="order-economics-ledger-container" className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            Order Economics & Contribution Margin Ledger
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Authoritative order-by-order breakdown: COGS, delivery labor, processing fees, and net contribution.
          </p>
        </div>

        {/* Summary Metric Cards */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
            Orders: <span className="font-semibold text-neutral-900">{summary.totalCount}</span>
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs text-emerald-800">
            Total Contribution: <span className="font-semibold text-emerald-900">${summary.totalContribution}</span>
          </div>
          <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs text-blue-800">
            Avg / Order: <span className="font-semibold text-blue-900">${summary.avgContribution}</span>
          </div>
          {summary.unprofitableCount > 0 && (
            <div className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              {summary.unprofitableCount} Negative Contribution
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-order-economics"
              type="text"
              placeholder="Search by Order ID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'ALL', label: 'All Orders' },
                { id: 'PROFITABLE', label: 'Profitable Only' },
                { id: 'UNPROFITABLE', label: 'Negative Margin' },
                { id: 'MEMBERS', label: 'Trader Pass Members' },
                { id: 'FREE_INCLUDED', label: 'Has Free Essential' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5">ORDER & CUSTOMER</th>
                <th className="py-3 px-3 text-right">TOTAL REV</th>
                <th className="py-3 px-3 text-right">PROD COST</th>
                <th className="py-3 px-3 text-right">PROD PROFIT</th>
                <th className="py-3 px-3 text-right">DELIVERY FEE</th>
                <th className="py-3 px-3 text-right">DELIVERY COST</th>
                <th className="py-3 px-3 text-right">STRIPE/FEE</th>
                <th className="py-3 px-3 text-right">FREE ESSENTIAL</th>
                <th className="py-3 px-3.5 text-right">CONTRIBUTION</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading authoritative order ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(item => {
                  const isExpanded = expandedOrderId === item.order_id;
                  const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

                  return (
                    <React.Fragment key={item.order_id}>
                      <tr 
                        id={`order-econ-row-${item.order_id}`}
                        onClick={() => toggleExpand(item.order_id)}
                        className={`cursor-pointer hover:bg-neutral-50/80 transition-colors ${
                          !item.is_profitable ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        {/* ORDER & CUSTOMER */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-neutral-900">{item.order_id}</span>
                            {item.is_member && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                MEMBER
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2">
                            <span>{item.customer_name}</span>
                            <span>•</span>
                            <span className="text-neutral-400">{dateStr}</span>
                          </div>
                        </td>

                        {/* TOTAL REV */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-neutral-900">
                          ${item.gross_merchandise_revenue.toFixed(2)}
                        </td>

                        {/* PROD COST */}
                        <td className="py-3 px-3 text-right font-mono text-neutral-600">
                          ${item.product_cost.toFixed(2)}
                        </td>

                        {/* PROD PROFIT */}
                        <td className="py-3 px-3 text-right font-mono text-neutral-700">
                          ${item.product_gross_profit.toFixed(2)}
                        </td>

                        {/* DELIVERY FEE */}
                        <td className="py-3 px-3 text-right font-mono text-neutral-600">
                          ${item.delivery_fee_revenue.toFixed(2)}
                        </td>

                        {/* DELIVERY COST */}
                        <td className="py-3 px-3 text-right font-mono text-neutral-500">
                          ${item.delivery_variable_cost.toFixed(2)}
                        </td>

                        {/* PAYMENT FEE */}
                        <td className="py-3 px-3 text-right font-mono text-neutral-500">
                          ${item.payment_processing_cost.toFixed(2)}
                        </td>

                        {/* FREE ESSENTIAL COST */}
                        <td className="py-3 px-3 text-right font-mono">
                          {item.free_item_wholesale_cost > 0 ? (
                            <span className="text-blue-700 font-medium" title={`${item.free_items_count} free essential item(s) included`}>
                              -${item.free_item_wholesale_cost.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-neutral-300">$0.00</span>
                          )}
                        </td>

                        {/* CONTRIBUTION */}
                        <td className="py-3 px-3.5 text-right font-mono">
                          <div className={`font-bold ${
                            item.is_profitable ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            ${item.contribution_margin.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {item.contribution_margin_percent.toFixed(1)}%
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="py-3 px-3 text-center">
                          {item.is_profitable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Profitable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600" /> Unprofitable
                            </span>
                          )}
                        </td>

                        {/* EXPAND TOGGLE */}
                        <td className="py-3 px-2 text-center text-neutral-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>

                      {/* EXPANDED ITEM DETAIL DRAWER */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/90 border-b border-neutral-200">
                          <td colSpan={11} className="py-4 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
                              {/* Left: Items Breakdown */}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-neutral-500" />
                                  Ordered Line Items ({item.items_breakdown.length})
                                </h4>
                                <div className="space-y-1.5">
                                  {item.items_breakdown.map((prod, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-neutral-50 border border-neutral-100">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-neutral-800">{prod.quantity}x</span>
                                        <span className="text-neutral-700 font-medium">{prod.name}</span>
                                        {prod.is_free && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                            FREE ESSENTIAL
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-right font-mono text-neutral-600">
                                        <span>${prod.price.toFixed(2)}</span>
                                        <span className="text-[10px] text-neutral-400 ml-2">cost: ${prod.unit_cost.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Right: Authoritative Contribution Math Formula */}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2 flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
                                  Contribution Margin Math Breakdown
                                </h4>
                                <div className="space-y-1 text-xs font-mono bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                  <div className="flex justify-between text-neutral-700">
                                    <span>Product Revenue:</span>
                                    <span>+${item.product_revenue.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-neutral-700">
                                    <span>Delivery Fee Revenue:</span>
                                    <span>+${item.delivery_fee_revenue.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-rose-600">
                                    <span>- Product COGS:</span>
                                    <span>-${item.product_cost.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-rose-600">
                                    <span>- Delivery Variable Labor:</span>
                                    <span>-${item.delivery_variable_cost.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-rose-600">
                                    <span>- Payment Processing (2.9% + $0.30):</span>
                                    <span>-${item.payment_processing_cost.toFixed(2)}</span>
                                  </div>
                                  {item.free_item_wholesale_cost > 0 && (
                                    <div className="flex justify-between text-blue-700 font-semibold">
                                      <span>- Free Essential Wholesale Cost:</span>
                                      <span>-${item.free_item_wholesale_cost.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="border-t border-neutral-200 pt-1.5 mt-1.5 flex justify-between font-bold text-sm">
                                    <span className="font-sans text-neutral-900">Net Order Contribution:</span>
                                    <span className={item.is_profitable ? 'text-emerald-700' : 'text-rose-600'}>
                                      ${item.contribution_margin.toFixed(2)} ({item.contribution_margin_percent.toFixed(1)}%)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
