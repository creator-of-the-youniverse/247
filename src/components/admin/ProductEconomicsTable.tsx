import React, { useState, useMemo } from 'react';
import { ProductEconomics, ProductCategory } from '../../types';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Filter, 
  DollarSign, 
  Scale, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Package, 
  Sparkles,
  Info
} from 'lucide-react';

interface ProductEconomicsTableProps {
  products: ProductEconomics[];
  loading?: boolean;
  onRefresh?: () => void;
}

type NumericSortColumn = 
  | 'unit_cost' 
  | 'retail_price' 
  | 'member_price' 
  | 'gross_profit' 
  | 'gross_margin_percent' 
  | 'member_gross_profit' 
  | 'member_margin_percent' 
  | 'weight' 
  | 'profit_per_gram' 
  | 'inventory_available'
  | 'cart_score';

type QuickFilter = 
  | 'ALL' 
  | 'HIGH_MARGIN' 
  | 'LOW_MARGIN' 
  | 'HIGH_VELOCITY' 
  | 'LOW_VELOCITY' 
  | 'FREE_ELIGIBLE' 
  | 'REGULATED' 
  | 'LOW_STOCK';

export const ProductEconomicsTable: React.FC<ProductEconomicsTableProps> = ({ products, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [sortColumn, setSortColumn] = useState<NumericSortColumn>('gross_margin_percent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: NumericSortColumn) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter(item => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = item.product.name?.toLowerCase().includes(q);
          const matchSku = item.product.sku?.toLowerCase().includes(q);
          const matchCat = item.product.category?.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.product.category !== selectedCategory) {
          return false;
        }

        // Quick filter
        switch (quickFilter) {
          case 'HIGH_MARGIN':
            return item.gross_margin_percent >= 60;
          case 'LOW_MARGIN':
            return item.gross_margin_percent < 40;
          case 'HIGH_VELOCITY':
            return (item.velocity_7d || 0) >= 1.0;
          case 'LOW_VELOCITY':
            return item.velocity_7d !== null && item.velocity_7d < 0.3;
          case 'FREE_ELIGIBLE':
            return item.free_eligible;
          case 'REGULATED':
            return item.product.minimum_age > 0 || item.product.requires_id || item.product.category === 'SMOKE SHOP';
          case 'LOW_STOCK':
            return (item.inventory_available || 0) <= (item.product.reorder_threshold || 2);
          case 'ALL':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        let valA = Number(a[sortColumn] || 0);
        let valB = Number(b[sortColumn] || 0);
        if (sortDirection === 'asc') {
          return valA - valB;
        } else {
          return valB - valA;
        }
      });
  }, [products, searchQuery, selectedCategory, quickFilter, sortColumn, sortDirection]);

  // Aggregate stats
  const summaryStats = useMemo(() => {
    const totalCount = products.length;
    const avgMargin = totalCount > 0
      ? (products.reduce((sum, p) => sum + p.gross_margin_percent, 0) / totalCount)
      : 0;
    const negativeMarginCount = products.filter(p => p.gross_profit < 0 || p.member_gross_profit < 0).length;
    const highMarginCount = products.filter(p => p.gross_margin_percent >= 60).length;
    const totalCartValue = products.reduce((sum, p) => sum + (p.inventory_available * p.unit_cost), 0);

    return {
      totalCount,
      avgMargin: avgMargin.toFixed(1),
      negativeMarginCount,
      highMarginCount,
      totalCartValue: totalCartValue.toFixed(2)
    };
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.product.category) set.add(p.product.category);
    });
    return Array.from(set);
  }, [products]);

  const renderSortIcon = (col: NumericSortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-amber-500 ml-1" />
      : <ArrowDown className="w-3.5 h-3.5 text-amber-500 ml-1" />;
  };

  return (
    <div id="product-economics-table-container" className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            Product Economics & Margins
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Authoritative unit costs, gross margins, member profit, profit density per gram, and cart stock.
          </p>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 flex items-center gap-1.5">
            <span className="font-semibold text-neutral-900">{summaryStats.totalCount}</span> Products
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-900">{summaryStats.avgMargin}%</span> Avg Gross Margin
          </div>
          <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
            <span className="font-semibold text-amber-900">{summaryStats.highMarginCount}</span> High Margin (&ge;60%)
          </div>
          {summaryStats.negativeMarginCount > 0 && (
            <div className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-center gap-1.5 animate-pulse font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {summaryStats.negativeMarginCount} Negative Margin Risk
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-product-economics"
              type="text"
              placeholder="Search by product name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-neutral-500 whitespace-nowrap">Category:</label>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="ALL">All Categories ({products.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 8 Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
          <span className="text-xs font-medium text-neutral-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {(
            [
              { id: 'ALL', label: 'All Products' },
              { id: 'HIGH_MARGIN', label: 'High Margin (≥60%)' },
              { id: 'LOW_MARGIN', label: 'Low Margin (<40%)' },
              { id: 'HIGH_VELOCITY', label: 'High Velocity' },
              { id: 'LOW_VELOCITY', label: 'Slow Movers' },
              { id: 'FREE_ELIGIBLE', label: 'Free Essential Eligible' },
              { id: 'REGULATED', label: 'Regulated / 21+ / ID' },
              { id: 'LOW_STOCK', label: 'Low Cart Stock' }
            ] as { id: QuickFilter; label: string }[]
          ).map(chip => {
            const isActive = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                id={`filter-chip-${chip.id.toLowerCase()}`}
                onClick={() => setQuickFilter(chip.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Economics Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5 min-w-[200px]">PRODUCT</th>
                <th className="py-3 px-3 min-w-[110px]">CATEGORY</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('unit_cost')}
                >
                  <div className="flex items-center justify-end">UNIT COST {renderSortIcon('unit_cost')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('retail_price')}
                >
                  <div className="flex items-center justify-end">RETAIL {renderSortIcon('retail_price')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('member_price')}
                >
                  <div className="flex items-center justify-end">MEMBER {renderSortIcon('member_price')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('gross_profit')}
                >
                  <div className="flex items-center justify-end">GROSS PROFIT {renderSortIcon('gross_profit')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('gross_margin_percent')}
                >
                  <div className="flex items-center justify-end">MARGIN % {renderSortIcon('gross_margin_percent')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('member_gross_profit')}
                >
                  <div className="flex items-center justify-end">MEMBER PROFIT {renderSortIcon('member_gross_profit')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('member_margin_percent')}
                >
                  <div className="flex items-center justify-end">MEM MARGIN % {renderSortIcon('member_margin_percent')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('weight')}
                >
                  <div className="flex items-center justify-end">WEIGHT {renderSortIcon('weight')}</div>
                </th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('profit_per_gram')}
                >
                  <div className="flex items-center justify-end">PROFIT/GRAM {renderSortIcon('profit_per_gram')}</div>
                </th>
                <th className="py-3 px-3 text-center min-w-[90px]">FREE ELIGIBLE</th>
                <th 
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:text-neutral-900"
                  onClick={() => handleSort('inventory_available')}
                >
                  <div className="flex items-center justify-end">CART STOCK {renderSortIcon('inventory_available')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Calculating product economics and unit profitabilities...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-neutral-400">
                    No products matched the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map(item => {
                  const isNegativeMargin = item.gross_profit < 0;
                  const isMemberLoss = item.member_gross_profit < 0;
                  const isHighMargin = item.gross_margin_percent >= 60;
                  const isLowMargin = item.gross_margin_percent < 40;
                  const isLowStock = (item.inventory_available || 0) <= (item.product.reorder_threshold || 2);

                  return (
                    <tr 
                      key={item.product.id}
                      id={`prod-econ-row-${item.product.id}`}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isNegativeMargin || isMemberLoss ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* PRODUCT */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-neutral-900 max-w-[220px] truncate" title={item.product.name}>
                          {item.product.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 font-mono">
                          <span>{item.product.sku}</span>
                          {item.product.compliance_status !== 'APPROVED' && (
                            <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-sans font-medium">
                              {item.product.compliance_status}
                            </span>
                          )}
                          {item.velocity_status === 'CALCULATED' && item.velocity_7d !== null ? (
                            <span className="text-neutral-500 font-sans" title="7-day sales velocity">
                              vel: {item.velocity_7d}/d
                            </span>
                          ) : (
                            <span className="text-neutral-400 italic font-sans" title="Order history is too short to estimate continuous velocity">
                              INSUFFICIENT DATA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 bg-neutral-100 rounded text-[11px] font-medium text-neutral-700">
                          {item.product.category}
                        </span>
                      </td>

                      {/* UNIT COST */}
                      <td className="py-3 px-3 text-right font-mono text-neutral-600">
                        ${item.unit_cost.toFixed(2)}
                      </td>

                      {/* RETAIL */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-neutral-900">
                        ${item.retail_price.toFixed(2)}
                      </td>

                      {/* MEMBER */}
                      <td className="py-3 px-3 text-right font-mono text-amber-700">
                        ${item.member_price.toFixed(2)}
                      </td>

                      {/* GROSS PROFIT */}
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${
                        isNegativeMargin ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        ${item.gross_profit.toFixed(2)}
                      </td>

                      {/* MARGIN % */}
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-medium text-[11px] ${
                          isNegativeMargin 
                            ? 'bg-rose-100 text-rose-800 font-bold' 
                            : isHighMargin 
                              ? 'bg-emerald-50 text-emerald-800' 
                              : isLowMargin
                                ? 'bg-amber-50 text-amber-800'
                                : 'text-neutral-700'
                        }`}>
                          {item.gross_margin_percent.toFixed(1)}%
                        </span>
                      </td>

                      {/* MEMBER PROFIT */}
                      <td className={`py-3 px-3 text-right font-mono ${
                        isMemberLoss ? 'text-rose-600 font-bold' : 'text-neutral-700'
                      }`}>
                        ${item.member_gross_profit.toFixed(2)}
                      </td>

                      {/* MEMBER MARGIN % */}
                      <td className="py-3 px-3 text-right font-mono text-neutral-600">
                        <span className={isMemberLoss ? 'text-rose-600 font-bold' : ''}>
                          {item.member_margin_percent.toFixed(1)}%
                        </span>
                      </td>

                      {/* WEIGHT */}
                      <td className="py-3 px-3 text-right font-mono text-neutral-500">
                        {item.weight > 0 ? `${item.weight}g` : '—'}
                      </td>

                      {/* PROFIT / GRAM */}
                      <td className="py-3 px-3 text-right font-mono text-neutral-700">
                        {item.weight > 0 ? (
                          <span title={`$${item.gross_profit} gross profit / ${item.weight} grams`}>
                            ${item.profit_per_gram.toFixed(4)}/g
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* FREE ELIGIBLE */}
                      <td className="py-3 px-3 text-center">
                        {item.free_eligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Free Eligible
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">—</span>
                        )}
                      </td>

                      {/* CART STOCK */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span className={`inline-block px-2 py-0.5 rounded font-medium ${
                          item.inventory_available === 0
                            ? 'bg-rose-100 text-rose-800'
                            : isLowStock
                              ? 'bg-amber-100 text-amber-800 font-bold'
                              : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          {item.inventory_available} in cart
                        </span>
                        <div className="text-[10px] text-neutral-400 font-sans">
                          {item.inventory_on_hand} total on hand
                        </div>
                      </td>
                    </tr>
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
