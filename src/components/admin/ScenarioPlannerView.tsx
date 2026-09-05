import React, { useState, useEffect } from 'react';
import { ScenarioInputs, ScenarioResults } from '../../types';
import { runScenarioSimulation } from '../../utils/economics';
import {
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target
} from 'lucide-react';

export const ScenarioPlannerView: React.FC = () => {
  const [inputs, setInputs] = useState<ScenarioInputs>({
    orders_per_day: 15,
    average_order_value: 22.0,
    gross_margin_percent: 62.0,
    delivery_fee_per_order: 5.0,
    percent_free_delivery_orders: 40.0,
    active_members_count: 25,
    member_orders_per_month: 4,
    monthly_subscription_price: 20.0,
    essential_credit_redemption_rate: 65.0,
    free_essential_unit_cost: 0.45,
    free_essentials_per_day: 15,
    monthly_fixed_costs: 1850.0,
    payment_processing_percent: 2.9,
    payment_processing_flat: 0.30,
    average_delivery_labor_cost: 3.50
  });

  const [results, setResults] = useState<ScenarioResults>(() => runScenarioSimulation(inputs));

  useEffect(() => {
    setResults(runScenarioSimulation(inputs));
  }, [inputs]);

  const updateInput = (key: keyof ScenarioInputs, value: number) => {
    setInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyPreset = (preset: 'PILOT' | 'GROWTH' | 'EXPANSION') => {
    if (preset === 'PILOT') {
      setInputs(prev => ({
        ...prev,
        orders_per_day: 10,
        average_order_value: 18.0,
        active_members_count: 15,
        free_essentials_per_day: 10
      }));
    } else if (preset === 'GROWTH') {
      setInputs(prev => ({
        ...prev,
        orders_per_day: 20,
        average_order_value: 22.0,
        active_members_count: 50,
        free_essentials_per_day: 20
      }));
    } else if (preset === 'EXPANSION') {
      setInputs(prev => ({
        ...prev,
        orders_per_day: 35,
        average_order_value: 25.0,
        active_members_count: 100,
        free_essentials_per_day: 30
      }));
    }
  };

  const isProfitable = results.estimated_operating_result >= 0;

  return (
    <div id="scenario-planner-container" className="space-y-6">
      {/* Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-700">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded mr-2">
              SCENARIO PLANNER — NOT ACTUAL RESULTS
            </span>
            <p className="text-xs text-amber-950 mt-1">
              Interactive financial simulation model to project operating results, contribution margins, and break-even scale under various assumptions.
            </p>
          </div>
        </div>

        {/* Preset Selectors */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Scale Presets:</span>
          <button
            onClick={() => applyPreset('PILOT')}
            className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 rounded text-xs font-medium text-neutral-700 shadow-2xs"
          >
            Pilot (10/d)
          </button>
          <button
            onClick={() => applyPreset('GROWTH')}
            className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 rounded text-xs font-medium text-neutral-700 shadow-2xs"
          >
            Growth (20/d)
          </button>
          <button
            onClick={() => applyPreset('EXPANSION')}
            className="px-2.5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 rounded text-xs font-medium text-neutral-700 shadow-2xs"
          >
            Expansion (35/d)
          </button>
        </div>
      </div>

      {/* Main Results Hero Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Gross Revenue */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Projected Monthly Revenue
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            ${results.projected_monthly_revenue.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500 font-mono">
            {results.projected_monthly_orders} orders/mo ({inputs.orders_per_day}/day)
          </div>
        </div>

        {/* Total Net Contribution */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Projected Net Contribution
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-700">
            ${results.projected_net_contribution.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500 font-mono">
            ${results.average_contribution_per_order.toFixed(2)} avg / order
          </div>
        </div>

        {/* Operating Result */}
        <div className={`p-4 rounded-xl border shadow-sm ${
          isProfitable ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
        }`}>
          <div className="text-xs font-semibold uppercase tracking-wider">
            <span className={isProfitable ? 'text-emerald-800' : 'text-rose-800'}>
              Net Operating Result
            </span>
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${
            isProfitable ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {isProfitable ? '+' : ''}${results.estimated_operating_result.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            after ${inputs.monthly_fixed_costs.toFixed(0)} fixed monthly costs
          </div>
        </div>

        {/* Break-Even Target */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Break-Even Volume
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            {results.break_even_orders_monthly !== null ? `${results.break_even_orders_monthly} orders/mo` : 'N/A'}
          </div>
          <div className="mt-1 text-xs text-neutral-500 font-mono">
            {results.break_even_orders_daily !== null ? `${results.break_even_orders_daily} orders/day` : 'Unsustainable'}
          </div>
        </div>
      </div>

      {/* Inputs vs Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sliders and Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Sliders className="w-4 h-4 text-amber-600" />
            Simulation Input Parameters
          </h3>

          <div className="space-y-4">
            {/* Orders per day */}
            <div>
              <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
                <span>Orders per Day:</span>
                <span className="font-mono font-bold text-neutral-900">{inputs.orders_per_day}</span>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={inputs.orders_per_day}
                onChange={(e) => updateInput('orders_per_day', Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Average Order Value */}
            <div>
              <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
                <span>Average Order Value ($):</span>
                <span className="font-mono font-bold text-neutral-900">${inputs.average_order_value.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={0.5}
                value={inputs.average_order_value}
                onChange={(e) => updateInput('average_order_value', Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Gross Margin % */}
            <div>
              <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
                <span>Product Gross Margin %:</span>
                <span className="font-mono font-bold text-neutral-900">{inputs.gross_margin_percent}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={80}
                value={inputs.gross_margin_percent}
                onChange={(e) => updateInput('gross_margin_percent', Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Active Members */}
            <div>
              <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
                <span>Trader Pass Subscribers ($20/mo):</span>
                <span className="font-mono font-bold text-neutral-900">{inputs.active_members_count}</span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                value={inputs.active_members_count}
                onChange={(e) => updateInput('active_members_count', Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Daily Free Essentials */}
            <div>
              <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
                <span>Free Essentials Distributed / Day:</span>
                <span className="font-mono font-bold text-neutral-900">{inputs.free_essentials_per_day}</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={inputs.free_essentials_per_day}
                onChange={(e) => updateInput('free_essentials_per_day', Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Monthly Fixed Costs */}
            <div>
              <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
                <span>Monthly Fixed Operating Costs ($):</span>
                <span className="font-mono font-bold text-neutral-900">${inputs.monthly_fixed_costs}</span>
              </div>
              <input
                type="range"
                min={500}
                max={5000}
                step={50}
                value={inputs.monthly_fixed_costs}
                onChange={(e) => updateInput('monthly_fixed_costs', Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Projected Line-by-Line Economics (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
            Monthly P&L Projection
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-neutral-700">
              <span>Gross Product Revenue:</span>
              <span>${results.projected_product_gross_profit > 0 ? (results.projected_monthly_revenue - results.projected_subscription_revenue - results.projected_delivery_revenue).toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>Delivery Fee Revenue:</span>
              <span>+${results.projected_delivery_revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>Subscription Revenue:</span>
              <span>+${results.projected_subscription_revenue.toFixed(2)}</span>
            </div>

            <div className="border-t border-neutral-100 pt-2 flex justify-between text-emerald-700 font-semibold">
              <span>Product Gross Profit:</span>
              <span>+${results.projected_product_gross_profit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-rose-600">
              <span>- Delivery Variable Labor:</span>
              <span>-${results.projected_delivery_labor_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>- Payment Processing:</span>
              <span>-${results.projected_payment_processing_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>- Free Essentials Wholesale:</span>
              <span>-${results.projected_free_essentials_cost.toFixed(2)}</span>
            </div>

            <div className="border-t border-neutral-200 pt-2 flex justify-between font-bold text-neutral-900">
              <span className="font-sans">Total Net Contribution:</span>
              <span className="text-emerald-700">${results.projected_net_contribution.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-neutral-500">
              <span>- Fixed Monthly Overhead:</span>
              <span>-${inputs.monthly_fixed_costs.toFixed(2)}</span>
            </div>

            <div className="border-t-2 border-neutral-900 pt-2 mt-2 flex justify-between font-bold text-sm">
              <span className="font-sans">Estimated Monthly Result:</span>
              <span className={isProfitable ? 'text-emerald-700' : 'text-rose-600'}>
                {isProfitable ? '+' : ''}${results.estimated_operating_result.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
