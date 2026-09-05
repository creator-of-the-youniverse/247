import React, { useState, useEffect } from 'react';
import { BusinessEconomicsConfig } from '../../types';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Truck,
  Percent,
  Sparkles,
  Heart,
  Scale,
  Sliders,
  RotateCcw
} from 'lucide-react';

interface EconomicsSettingsViewProps {
  config: BusinessEconomicsConfig;
  onSave: (updated: BusinessEconomicsConfig) => Promise<void>;
}

export const EconomicsSettingsView: React.FC<EconomicsSettingsViewProps> = ({ config, onSave }) => {
  const [form, setForm] = useState<BusinessEconomicsConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleChange = (field: keyof BusinessEconomicsConfig, val: any) => {
    setForm(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleScoreWeightChange = (weightKey: keyof BusinessEconomicsConfig['cart_score_weightings'], val: number) => {
    setForm(prev => ({
      ...prev,
      cart_score_weightings: {
        ...prev.cart_score_weightings,
        [weightKey]: val
      }
    }));
  };

  const handleFixedBreakdownChange = (costKey: keyof BusinessEconomicsConfig['fixed_cost_breakdown'], val: number) => {
    const newBreakdown = {
      ...form.fixed_cost_breakdown,
      [costKey]: val
    };
    const total = Object.values(newBreakdown).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
    setForm(prev => ({
      ...prev,
      fixed_cost_breakdown: newBreakdown,
      monthly_fixed_costs: total
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      await onSave(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save economics configuration');
    } finally {
      setSaving(false);
    }
  };

  // Check sum of score weightings
  const weights = form.cart_score_weightings || {
    sales_velocity: 40,
    gross_margin: 20,
    free_demand: 15,
    weight_efficiency: 10,
    space_efficiency: 10,
    strategic_importance: 5
  };
  const totalWeighting = weights.sales_velocity + weights.gross_margin + weights.free_demand + weights.weight_efficiency + weights.space_efficiency + weights.strategic_importance;

  return (
    <form id="economics-settings-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Header & Save CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" />
            Business Configuration & Economic Inputs
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Authoritative parameters controlling pricing, member benefits, free essentials, and cost assumptions.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
            saveSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-50'
          }`}
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving to Firestore...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              Settings Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Economics Settings
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Grid of Configuration Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Trader Pass & Pricing */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Trader Pass & Customer Pricing
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Monthly Pass Price ($)</label>
              <input
                type="number"
                step="1"
                value={form.monthly_trader_pass_price}
                onChange={(e) => handleChange('monthly_trader_pass_price', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Annual Pass Price ($)</label>
              <input
                type="number"
                step="5"
                value={form.annual_trader_pass_price}
                onChange={(e) => handleChange('annual_trader_pass_price', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Monthly Essential Credit ($)</label>
              <input
                type="number"
                step="1"
                value={form.monthly_essential_credit}
                onChange={(e) => handleChange('monthly_essential_credit', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Member Product Discount (%)</label>
              <input
                type="number"
                step="1"
                value={form.member_product_discount_percent}
                onChange={(e) => handleChange('member_product_discount_percent', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Fees & Limits */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-2">
            <Truck className="w-4 h-4 text-purple-600" />
            Delivery Pricing & Tier Rules
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Non-Member Delivery Fee ($)</label>
              <input
                type="number"
                step="0.5"
                value={form.non_member_delivery_fee}
                onChange={(e) => handleChange('non_member_delivery_fee', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Free Delivery Threshold ($)</label>
              <input
                type="number"
                step="5"
                value={form.free_delivery_threshold}
                onChange={(e) => handleChange('free_delivery_threshold', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Member Included Deliveries/mo</label>
              <input
                type="number"
                step="1"
                value={form.member_included_standard_deliveries}
                onChange={(e) => handleChange('member_included_standard_deliveries', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Member Overage Fee ($)</label>
              <input
                type="number"
                step="0.5"
                value={form.member_overage_delivery_fee}
                onChange={(e) => handleChange('member_overage_delivery_fee', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Free Essentials & Community Limits */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-2">
            <Heart className="w-4 h-4 text-rose-500" />
            Free Essentials Rules & SLA
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Free Limit / Customer / Day</label>
              <input
                type="number"
                step="1"
                value={form.free_essentials_per_customer_per_day}
                onChange={(e) => handleChange('free_essentials_per_customer_per_day', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">System Free Limit / Day</label>
              <input
                type="number"
                step="1"
                value={form.system_free_essential_limit_per_day}
                onChange={(e) => handleChange('system_free_essential_limit_per_day', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Target Delivery SLA (mins)</label>
              <input
                type="number"
                step="5"
                value={form.target_delivery_time_minutes}
                onChange={(e) => handleChange('target_delivery_time_minutes', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Estimated Free Unit Cost ($)</label>
              <input
                type="number"
                step="0.05"
                value={form.default_free_essential_unit_cost}
                onChange={(e) => handleChange('default_free_essential_unit_cost', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Variable Cost Assumptions (Stripe & Labor) */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Variable Cost Assumptions (Demo Baseline)
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Delivery Labor Cost / Order ($)</label>
              <input
                type="number"
                step="0.25"
                value={form.average_delivery_labor_cost}
                onChange={(e) => handleChange('average_delivery_labor_cost', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Packaging Cost / Order ($)</label>
              <input
                type="number"
                step="0.05"
                value={form.packaging_cost_per_order}
                onChange={(e) => handleChange('packaging_cost_per_order', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Stripe Rate (e.g. 0.029 = 2.9%)</label>
              <input
                type="number"
                step="0.001"
                value={form.payment_processing_rate}
                onChange={(e) => handleChange('payment_processing_rate', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Stripe Flat Fee / Order ($)</label>
              <input
                type="number"
                step="0.05"
                value={form.payment_processing_flat}
                onChange={(e) => handleChange('payment_processing_flat', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Monthly Fixed Overhead Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h3 className="text-sm font-bold text-neutral-900">
              Monthly Fixed Overhead (${form.monthly_fixed_costs})
            </h3>
            <span className="text-xs text-neutral-400 font-mono">Break-even driver</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Insurance ($)</label>
              <input
                type="number"
                value={form.fixed_cost_breakdown?.insurance || 250}
                onChange={(e) => handleFixedBreakdownChange('insurance', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Software & Telecom ($)</label>
              <input
                type="number"
                value={form.fixed_cost_breakdown?.software_telecom || 100}
                onChange={(e) => handleFixedBreakdownChange('software_telecom', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Cart Maintenance ($)</label>
              <input
                type="number"
                value={form.fixed_cost_breakdown?.cart_maintenance || 200}
                onChange={(e) => handleFixedBreakdownChange('cart_maintenance', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Storage / Base Rent ($)</label>
              <input
                type="number"
                value={form.fixed_cost_breakdown?.storage_base_rent || 400}
                onChange={(e) => handleFixedBreakdownChange('storage_base_rent', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Core Labor Base ($)</label>
              <input
                type="number"
                value={form.fixed_cost_breakdown?.labor_core_base || 750}
                onChange={(e) => handleFixedBreakdownChange('labor_core_base', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Other Overhead ($)</label>
              <input
                type="number"
                value={form.fixed_cost_breakdown?.other_overhead || 150}
                onChange={(e) => handleFixedBreakdownChange('other_overhead', Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Cart Optimizer Physical Limits & Weights */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-600" />
              Cart Limits & Score Weighting
            </h3>
            <span className={`text-xs font-mono font-bold ${
              totalWeighting === 100 ? 'text-emerald-700' : 'text-rose-600'
            }`}>
              Weight Total: {totalWeighting}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Max Weight (lbs)</label>
              <input
                type="number"
                value={form.max_cart_weight_lbs}
                onChange={(e) => handleChange('max_cart_weight_lbs', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Max Value ($)</label>
              <input
                type="number"
                value={form.max_cart_value_dollars}
                onChange={(e) => handleChange('max_cart_value_dollars', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-600 block mb-1">Max Units (#)</label>
              <input
                type="number"
                value={form.max_cart_units}
                onChange={(e) => handleChange('max_cart_units', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-3 space-y-2 text-xs">
            <span className="font-semibold text-neutral-700 block">Score Formula Weights (%):</span>
            <div className="grid grid-cols-3 gap-2 font-mono">
              <div>
                <span className="text-[10px] text-neutral-400 block">Sales Velocity</span>
                <input
                  type="number"
                  value={weights.sales_velocity}
                  onChange={(e) => handleScoreWeightChange('sales_velocity', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Gross Margin</span>
                <input
                  type="number"
                  value={weights.gross_margin}
                  onChange={(e) => handleScoreWeightChange('gross_margin', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Free Demand</span>
                <input
                  type="number"
                  value={weights.free_demand}
                  onChange={(e) => handleScoreWeightChange('free_demand', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Weight Effic.</span>
                <input
                  type="number"
                  value={weights.weight_efficiency}
                  onChange={(e) => handleScoreWeightChange('weight_efficiency', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Space Effic.</span>
                <input
                  type="number"
                  value={weights.space_efficiency}
                  onChange={(e) => handleScoreWeightChange('space_efficiency', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Strategic</span>
                <input
                  type="number"
                  value={weights.strategic_importance}
                  onChange={(e) => handleScoreWeightChange('strategic_importance', Number(e.target.value))}
                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
