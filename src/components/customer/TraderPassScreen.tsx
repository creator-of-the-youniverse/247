import React from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Sparkles, 
  Check, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Bike, 
  Tag, 
  HeartHandshake, 
  RefreshCw 
} from 'lucide-react';

export const TraderPassScreen: React.FC = () => {
  const { activePass, toggleMemberPass, addToast } = useStore();

  const isMember = activePass?.subscription_status === 'ACTIVE';

  const benefits = [
    {
      title: "$20 Monthly Essential Credit",
      desc: "Get $20 in monthly store credit to spend on eligible goods, snacks, first aid, or emergency items."
    },
    {
      title: "Free Bicycle Delivery On All Orders",
      desc: "Standard $5.00 bicycle delivery fee is completely waived on all 24/7 orders across Manchester."
    },
    {
      title: "Priority Cargo Dispatch",
      desc: "Member orders jump to the top of the rider queue for fastest possible delivery (often 20-35 min)."
    },
    {
      title: "Member Discount Pricing",
      desc: "Unlock discounted member pricing across everyday essentials, socks, batteries, and hygiene packs."
    },
    {
      title: "Monthly Care-Pack Eligibility",
      desc: "Special seasonal care packages (Cold Weather Kits, Summer Hydration Packs) included."
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-code font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded uppercase">
            MEMBERSHIP
          </span>
          <span className="text-xs font-mono-code text-stone-400">247 CLUB</span>
        </div>
        <h1 className="font-display font-black text-3xl text-white uppercase tracking-wider mt-1">
          TRADER PASS
        </h1>
        <p className="text-xs text-stone-400 font-mono-code">
          The all-inclusive essential delivery membership for Manchester, NH
        </p>
      </div>

      {/* Main Membership Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-stone-900 to-stone-950 border-2 border-amber-500/50 p-6 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-display font-extrabold text-xl text-white tracking-wider uppercase">
                TRADER PASS
              </span>
            </div>
            <p className="text-xs text-amber-300 font-mono-code mt-1">
              $20.00 / MONTH • CANCEL ANYTIME
            </p>
          </div>

          <div className="text-right">
            <span className="text-3xl font-display font-black text-white">$20</span>
            <span className="text-xs text-stone-400 font-mono-code">/mo</span>
          </div>
        </div>

        {/* Member Status Box */}
        {isMember ? (
          <div className="p-4 bg-stone-950/80 border border-emerald-500/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-code text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                MEMBERSHIP ACTIVE
              </span>
              <span className="text-[11px] text-stone-400 font-mono-code">
                Renews {activePass?.renewal_date ? new Date(activePass.renewal_date).toLocaleDateString() : 'Next Month'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800 text-xs font-mono-code">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase">Essential Credit Balance</span>
                <span className="text-xl font-bold text-amber-400 font-display">
                  ${activePass?.credit_remaining.toFixed(2) || '20.00'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase">Member Delivery Fee</span>
                <span className="text-xl font-bold text-emerald-400 font-display">$0.00 (FREE)</span>
              </div>
            </div>

            <button
              onClick={toggleMemberPass}
              className="w-full py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 text-xs font-mono-code transition-colors"
            >
              Pause or Cancel Membership
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-stone-950/60 rounded-xl border border-stone-800 text-xs text-stone-300">
              <strong className="text-white">Break-Even Guarantee:</strong> Because you receive $20 in Essential Credit every month, the membership literally pays for itself on day one.
            </div>

            <button
              id="activate-trader-pass-btn"
              onClick={toggleMemberPass}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm uppercase tracking-wider font-mono-code flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Activate Trader Pass ($20/mo)</span>
            </button>
          </div>
        )}

        {/* Benefits Checklist */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-mono-code text-stone-400 uppercase tracking-wider">
            Included Member Privileges:
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {benefits.map((b, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <strong className="text-white font-mono-code block">{b.title}</strong>
                  <span className="text-stone-400 leading-relaxed">{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
