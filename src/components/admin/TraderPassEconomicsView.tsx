import React from 'react';
import { TraderPassEconomics } from '../../types';
import {
  Sparkles,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Users,
  CheckCircle2,
  DollarSign,
  Gift,
  HelpCircle,
  Truck
} from 'lucide-react';

interface TraderPassEconomicsViewProps {
  passEconomics: TraderPassEconomics | null;
  loading?: boolean;
}

export const TraderPassEconomicsView: React.FC<TraderPassEconomicsViewProps> = ({ passEconomics, loading }) => {
  if (loading || !passEconomics) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Calculating Trader Pass subscription liabilities and economics...</p>
      </div>
    );
  }

  const isNetPositive = passEconomics.net_membership_contribution >= 0;

  return (
    <div id="trader-pass-economics-container" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Trader Pass Subscription Program Economics
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          $20/month subscription economics: revenue, wholesale liability modeling, essential credit redemption, and delivery subsidy costs.
        </p>
      </div>

      {/* Hero Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Subscription Revenue */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Subscription Revenue</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            ${passEconomics.monthly_subscription_revenue.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <span>{passEconomics.active_subscribers} active members</span>
          </div>
        </div>

        {/* Realized Wholesale Cost of Credit */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Redeemed Wholesale Cost</span>
            <Gift className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            ${passEconomics.realized_wholesale_cost_of_credit.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            ${passEconomics.total_essential_credit_redeemed.toFixed(2)} retail value claimed
          </div>
        </div>

        {/* Free Delivery Subsidy Cost */}
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Delivery Subsidy Cost</span>
            <Truck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-900">
            ${passEconomics.free_delivery_subsidy_cost.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Saved members ${passEconomics.total_delivery_savings_provided.toFixed(2)}
          </div>
        </div>

        {/* Net Membership Contribution */}
        <div className={`p-4 rounded-xl border shadow-sm ${
          isNetPositive 
            ? 'bg-emerald-50/60 border-emerald-200' 
            : 'bg-rose-50/60 border-rose-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span className={isNetPositive ? 'text-emerald-800' : 'text-rose-800'}>
              Net Pass Contribution
            </span>
            <TrendingUp className={`w-4 h-4 ${isNetPositive ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${
            isNetPositive ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            ${passEconomics.net_membership_contribution.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-neutral-600 font-mono">
            {passEconomics.net_contribution_margin_percent.toFixed(1)}% program margin
          </div>
        </div>
      </div>

      {/* Credit Liability and Outstanding Obligations Card */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Monthly Essential Credit Balance & Liability Ledger
          </h3>
          <span className="text-xs bg-amber-50 text-amber-900 font-medium px-2 py-0.5 rounded border border-amber-200">
            $20 Monthly Credit per Member
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
          <div>
            <div className="text-xs text-neutral-500">Total Essential Credit Issued</div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-1">
              ${passEconomics.total_essential_credit_issued.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {passEconomics.active_subscribers} subscribers × $20.00
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500">Total Credit Redeemed to Date</div>
            <div className="text-lg font-bold font-mono text-blue-700 mt-1">
              ${passEconomics.total_essential_credit_redeemed.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {passEconomics.total_essential_credit_issued > 0 
                ? ((passEconomics.total_essential_credit_redeemed / passEconomics.total_essential_credit_issued) * 100).toFixed(0)
                : 0}% utilization rate
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500">Outstanding Liability (Retail / Wholesale)</div>
            <div className="text-lg font-bold font-mono text-amber-700 mt-1">
              ${passEconomics.total_essential_credit_remaining.toFixed(2)} <span className="text-xs font-normal text-neutral-500">/ ~${passEconomics.estimated_wholesale_liability.toFixed(2)} COGS</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Wholesale liability modeled at 45% of retail credit
            </div>
          </div>
        </div>

        {/* Financial Accounting Notice */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Financial Accounting Policy:</span> Unused essential credit (${passEconomics.total_essential_credit_remaining.toFixed(2)}) is held as an outstanding liability and is <strong>not</strong> recognized as an immediate wholesale cost until the customer actually redeems it on an order.
          </div>
        </div>
      </div>

      {/* Member by Member Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-600" />
            Member Economics & Utilization Breakdown ({passEconomics.subscribers_breakdown.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5">MEMBER</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-right">CREDIT ISSUED</th>
                <th className="py-3 px-3 text-right">CREDIT REDEEMED</th>
                <th className="py-3 px-3 text-right">CREDIT REMAINING</th>
                <th className="py-3 px-3 text-right">ORDERS COMPLETED</th>
                <th className="py-3 px-3 text-right">DELIVERY SAVINGS</th>
                <th className="py-3 px-3.5 text-right">NET CONTRIBUTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {passEconomics.subscribers_breakdown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    No active Trader Pass members currently on file.
                  </td>
                </tr>
              ) : (
                passEconomics.subscribers_breakdown.map((sub, idx) => {
                  const isPositive = sub.net_individual_contribution >= 0;
                  return (
                    <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-neutral-900">
                        {sub.customer_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-600">
                        ${sub.monthly_credit_issued.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700 font-medium">
                        ${sub.credit_redeemed.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700">
                        ${sub.credit_remaining.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-700">
                        {sub.orders_count}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-700">
                        ${sub.delivery_savings_provided.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                          ${sub.net_individual_contribution.toFixed(2)}
                        </span>
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
