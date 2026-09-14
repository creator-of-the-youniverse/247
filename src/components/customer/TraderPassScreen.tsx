import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { BatteryCapacity, PassTier } from '../../types';
import { BatteryExchangeDashboard } from './BatteryExchangeDashboard';
import { 
  Sparkles, 
  Check, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Bike, 
  BatteryCharging, 
  Battery, 
  RefreshCw, 
  MapPin, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  Package,
  Layers,
  Award
} from 'lucide-react';

export const TraderPassScreen: React.FC = () => {
  const { 
    activePass, 
    toggleMemberPass, 
    requestBatteryExchange, 
    batteryExchanges, 
    batteryReservations,
    hasBatteryPrivilege, 
    hasDeliveryPrivilege,
    cart
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'BATTERY_EXCHANGE' | 'PASSES' | 'BATTERY_SWAP' | 'HISTORY'>('BATTERY_EXCHANGE');
  const [selectedCapacity, setSelectedCapacity] = useState<BatteryCapacity>('10000');
  const [exchangeType, setExchangeType] = useState<'DELIVERY_DISPATCH' | 'STREET_SWAP' | 'HUB_WALKUP'>('DELIVERY_DISPATCH');
  const [deliveryAddress, setDeliveryAddress] = useState(cart.delivery_address || '875 Elm St, Manchester, NH');
  const [swapNotes, setSwapNotes] = useState('Depleted pack ready for handover');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [lastDispatchedSwapId, setLastDispatchedSwapId] = useState<string | null>(null);

  const isMember = activePass?.subscription_status === 'ACTIVE';
  const currentTier: PassTier = activePass?.pass_type || 'TRADER';

  const handleSelectTier = async (tier: PassTier) => {
    await toggleMemberPass(tier);
  };

  const handleDispatchBatterySwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasBatteryPrivilege) {
      await toggleMemberPass('TESLA');
      return;
    }

    try {
      setIsSubmittingSwap(true);
      const res = await requestBatteryExchange(
        selectedCapacity,
        deliveryAddress,
        swapNotes,
        exchangeType
      );
      setLastDispatchedSwapId(res.id);
      setActiveSubTab('HISTORY');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  const capacities: { size: BatteryCapacity; label: string; desc: string; iconSize: string }[] = [
    { size: '2000', label: '2,000 mAh', desc: 'Compact emergency phone boost pack', iconSize: 'text-emerald-400' },
    { size: '5000', label: '5,000 mAh', desc: 'Slim pocket daily travel battery', iconSize: 'text-cyan-400' },
    { size: '10000', label: '10,000 mAh', desc: 'Dual-port daily workhorse pack', iconSize: 'text-blue-400' },
    { size: '20000', label: '20,000 mAh', desc: 'Heavy-duty high-capacity power bank', iconSize: 'text-purple-400' }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-code font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded uppercase">
            MEMBERSHIP NETWORK
          </span>
          <span className="text-xs font-mono-code text-stone-400">MANCHESTER 24/7</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wider mt-1 flex items-center gap-2">
          <span>247 PASSES & HOT-SWAP</span>
        </h1>
        <p className="text-xs text-stone-400 font-mono-code">
          Zero-emission cargo delivery • 24/7 BYO Tesla battery pack exchange network
        </p>
      </div>

      {/* Subtabs Header */}
      <div className="flex border-b border-stone-800 gap-2 overflow-x-auto">
        <button
          id="tab-battery-exchange"
          onClick={() => setActiveSubTab('BATTERY_EXCHANGE')}
          className={`pb-2.5 px-3 text-xs font-mono-code uppercase font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'BATTERY_EXCHANGE'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <BatteryCharging className="w-3.5 h-3.5" />
          <span>Battery Exchange Hubs</span>
          <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono">
            LIVE
          </span>
          {batteryReservations.filter(r => r.status === 'ACTIVE').length > 0 && (
            <span className="text-[9px] bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded-full font-bold">
              {batteryReservations.filter(r => r.status === 'ACTIVE').length} hold
            </span>
          )}
        </button>

        <button
          id="tab-membership-passes"
          onClick={() => setActiveSubTab('PASSES')}
          className={`pb-2.5 px-3 text-xs font-mono-code uppercase font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'PASSES'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Membership Passes</span>
        </button>

        <button
          id="tab-courier-swap"
          onClick={() => setActiveSubTab('BATTERY_SWAP')}
          className={`pb-2.5 px-3 text-xs font-mono-code uppercase font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'BATTERY_SWAP'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Courier Hot-Swap</span>
          <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
            BYO
          </span>
        </button>

        <button
          id="tab-exchange-log"
          onClick={() => setActiveSubTab('HISTORY')}
          className={`pb-2.5 px-3 text-xs font-mono-code uppercase font-bold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'HISTORY'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Exchange Log</span>
          {batteryExchanges.length > 0 && (
            <span className="text-[9px] bg-stone-800 text-stone-300 px-1.5 py-0.2 rounded font-mono">
              {batteryExchanges.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Member Status Card */}
      {isMember && (
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono-code font-bold text-white uppercase tracking-wider">
                ACTIVE PASS: {currentTier === 'COMBO' ? 'COMBINED PASS ($30/MO)' : currentTier === 'TESLA' ? 'TESLA PASS ($20/MO)' : 'TRADER PASS ($20/MO)'}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 font-mono-code">
              Renews {activePass?.renewal_date ? new Date(activePass.renewal_date).toLocaleDateString() : '30 Days'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800/80 text-xs font-mono-code">
            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/60">
              <span className="text-[10px] text-stone-500 uppercase block">Monthly Price</span>
              <span className="text-base font-bold text-white font-display">
                ${activePass?.price_monthly.toFixed(2)}/mo
              </span>
            </div>

            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/60">
              <span className="text-[10px] text-stone-500 uppercase block">Store Credit Left</span>
              <span className="text-base font-bold text-amber-400 font-display">
                ${activePass?.credit_remaining.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/60">
              <span className="text-[10px] text-stone-500 uppercase block">Delivery Fee</span>
              <span className="text-base font-bold text-emerald-400 font-display">
                $0.00 (FREE)
              </span>
            </div>

            <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/60">
              <span className="text-[10px] text-stone-500 uppercase block">Battery Swaps</span>
              <span className="text-base font-bold text-cyan-400 font-display">
                {hasBatteryPrivilege ? 'UNLIMITED' : 'NONE'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 0: BATTERY EXCHANGE DASHBOARD */}
      {activeSubTab === 'BATTERY_EXCHANGE' && (
        <BatteryExchangeDashboard onGoToPasses={() => setActiveSubTab('PASSES')} />
      )}

      {/* TAB 1: PASSES SELECTION */}
      {activeSubTab === 'PASSES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. TRADER PASS ($20/mo) */}
            <div className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
              isMember && currentTier === 'TRADER'
                ? 'bg-amber-950/20 border-amber-500 shadow-xl ring-1 ring-amber-500/50'
                : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
            }`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono-code font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ESSENTIALS & STORE
                    </span>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-wider mt-1.5">
                      TRADER PASS
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-display text-white">$20</span>
                    <span className="text-[10px] text-stone-400 font-mono-code block">/month</span>
                  </div>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed font-sans">
                  The all-inclusive essential delivery membership. Pays for itself immediately with full monthly store credit.
                </p>

                <div className="space-y-2 pt-2 border-t border-stone-800 text-xs">
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>$20.00 Monthly Store Credit</strong> for food, snacks, first aid, & essentials</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>$0 Free Bicycle Delivery</strong> waived on all 247 orders</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Priority cargo dispatch queue (20-35 min target)</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Wholesale member pricing across standard catalog</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4">
                {isMember && currentTier === 'TRADER' ? (
                  <button
                    onClick={() => toggleMemberPass('TRADER')}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-stone-950 font-mono-code font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    id="select-trader-pass-btn"
                    onClick={() => handleSelectTier('TRADER')}
                    className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-mono-code font-bold text-xs uppercase tracking-wider transition-colors border border-stone-700 flex items-center justify-center gap-1.5"
                  >
                    <span>{isMember ? 'Switch to Trader ($20/mo)' : 'Get Trader Pass ($20/mo)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. TESLA PASS ($20/mo) */}
            <div className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
              isMember && currentTier === 'TESLA'
                ? 'bg-cyan-950/20 border-cyan-500 shadow-xl ring-1 ring-cyan-500/50'
                : 'bg-stone-900/90 border-stone-800 hover:border-stone-700'
            }`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono-code font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      HOT-SWAP BATTERY NETWORK
                    </span>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-wider mt-1.5">
                      TESLA PASS
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-display text-white">$20</span>
                    <span className="text-[10px] text-stone-400 font-mono-code block">/month</span>
                  </div>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed font-sans">
                  24/7 battery pack exchange network across Manchester. Hand over dead battery and get a full one on demand!
                </p>

                <div className="space-y-2 pt-2 border-t border-stone-800 text-xs">
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>BYO Battery Pack Exchange</strong>: 2,000, 5,000, 10,000, & 20,000 mAh</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span><strong>Hand over dead, get a full one</strong> (100% charged & certified)</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Unlimited monthly swaps via courier delivery or walk-up</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Free courier dispatch on all battery swap runs</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 space-y-2">
                {isMember && currentTier === 'TESLA' ? (
                  <button
                    onClick={() => toggleMemberPass('TESLA')}
                    className="w-full py-2.5 rounded-xl bg-cyan-400 text-stone-950 font-mono-code font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    id="select-tesla-pass-btn"
                    onClick={() => handleSelectTier('TESLA')}
                    className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-mono-code font-bold text-xs uppercase tracking-wider transition-colors border border-stone-700 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isMember ? 'Switch to Tesla ($20/mo)' : 'Get Tesla Pass ($20/mo)'}</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveSubTab('BATTERY_EXCHANGE')}
                  className="w-full py-1.5 rounded-lg text-cyan-400 hover:bg-cyan-950/40 text-[11px] font-mono-code flex items-center justify-center gap-1 transition-colors"
                >
                  <BatteryCharging className="w-3.5 h-3.5" />
                  <span>Check Live Hub Availability →</span>
                </button>
              </div>
            </div>

            {/* 3. COMBINED PASS ($30/mo) */}
            <div className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
              isMember && currentTier === 'COMBO'
                ? 'bg-purple-950/30 border-purple-400 shadow-2xl ring-2 ring-purple-400/60'
                : 'bg-gradient-to-b from-stone-900 to-purple-950/20 border-purple-500/40 hover:border-purple-400'
            }`}>
              <div className="absolute -top-3 right-4">
                <span className="text-[10px] font-mono-code font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500 text-stone-950 shadow-md flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  SAVE $10/MO • BEST VALUE
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-mono-code font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      TRADER + TESLA BUNDLE
                    </span>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-wider mt-1.5">
                      COMBINED PASS
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-stone-400 line-through font-mono-code">$40</div>
                    <span className="text-2xl font-black font-display text-white">$30</span>
                    <span className="text-[10px] text-stone-400 font-mono-code block">/month</span>
                  </div>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed font-sans">
                  The ultimate community bundle. All Trader Pass delivery perks & store credit PLUS unlimited Tesla battery pack exchanges.
                </p>

                <div className="space-y-2 pt-2 border-t border-stone-800 text-xs">
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>$20.00 Monthly Store Credit</strong> for food & essentials</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>$0 Free Delivery</strong> on every bicycle cargo run</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span><strong>Unlimited Tesla Battery Hot-Swaps</strong> (2k, 5k, 10k, 20k mAh)</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-200">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>Hand over dead pack, receive full charged pack 24/7</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 space-y-2">
                {isMember && currentTier === 'COMBO' ? (
                  <button
                    onClick={() => toggleMemberPass('COMBO')}
                    className="w-full py-2.5 rounded-xl bg-purple-400 text-stone-950 font-mono-code font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    id="select-combo-pass-btn"
                    onClick={() => handleSelectTier('COMBO')}
                    className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-stone-950 font-mono-code font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isMember ? 'Upgrade to Combined ($30/mo)' : 'Get Combined Pass ($30/mo)'}</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveSubTab('BATTERY_EXCHANGE')}
                  className="w-full py-1.5 rounded-lg text-purple-300 hover:bg-purple-950/40 text-[11px] font-mono-code flex items-center justify-center gap-1 transition-colors"
                >
                  <BatteryCharging className="w-3.5 h-3.5" />
                  <span>Check Live Hub Availability →</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Comparison Matrix */}
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-mono-code uppercase font-bold text-white tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Pass Features & Privileges Comparison</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 font-mono-code text-[11px]">
                    <th className="py-2 pr-4 font-normal">Feature / Privilege</th>
                    <th className="py-2 px-3 text-center font-bold text-amber-400">Trader ($20)</th>
                    <th className="py-2 px-3 text-center font-bold text-cyan-400">Tesla ($20)</th>
                    <th className="py-2 pl-3 text-center font-bold text-purple-400">Combined ($30)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-sans text-stone-300">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Monthly Cost</td>
                    <td className="py-2.5 px-3 text-center font-mono-code text-white">$20.00</td>
                    <td className="py-2.5 px-3 text-center font-mono-code text-white">$20.00</td>
                    <td className="py-2.5 pl-3 text-center font-mono-code text-purple-300 font-bold">$30.00 (Save $10)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Monthly Store Credit</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">$20.00</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">—</td>
                    <td className="py-2.5 pl-3 text-center text-emerald-400 font-bold">$20.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Standard Delivery Fee ($5)</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">Waived ($0)</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">Waived ($0)</td>
                    <td className="py-2.5 pl-3 text-center text-emerald-400 font-bold">Waived ($0)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">BYO Battery Pack Hot-Swaps</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">—</td>
                    <td className="py-2.5 px-3 text-center text-cyan-400 font-bold">Unlimited</td>
                    <td className="py-2.5 pl-3 text-center text-purple-400 font-bold">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Supported Pack Sizes</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">—</td>
                    <td className="py-2.5 px-3 text-center font-mono-code text-[11px] text-stone-300">2k, 5k, 10k, 20k mAh</td>
                    <td className="py-2.5 pl-3 text-center font-mono-code text-[11px] text-stone-300">2k, 5k, 10k, 20k mAh</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Hand Over Dead, Get Full</td>
                    <td className="py-2.5 px-3 text-center text-stone-500">—</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">✓ 100% Charged</td>
                    <td className="py-2.5 pl-3 text-center text-emerald-400">✓ 100% Charged</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-white">Bicycle Courier Dispatch</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">Priority</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">On-Demand</td>
                    <td className="py-2.5 pl-3 text-center text-purple-400 font-bold">VIP Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TESLA BATTERY HOT-SWAP TERMINAL */}
      {activeSubTab === 'BATTERY_SWAP' && (
        <div className="space-y-6">
          {/* Instructions Banner */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-mono-code text-xs font-bold uppercase">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>How 247 Tesla Battery Exchange Works</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              Bring your own pack (2,000, 5,000, 10,000, or 20,000 mAh). Hand over your dead pack to a 247 bicycle courier or at our micro-hub, and receive a tested, 100% full battery pack immediately.
            </p>
            <div className="pt-2 border-t border-cyan-900/50 flex items-center justify-between">
              <span className="text-[11px] text-cyan-200/80">Want to swap at the 247 Base Hub yourself?</span>
              <button
                type="button"
                onClick={() => setActiveSubTab('BATTERY_EXCHANGE')}
                className="text-[11px] font-mono-code font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
              >
                <span>View Nearby Hub Availability &amp; Reserve</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {!hasBatteryPrivilege && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-mono-code">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Tesla Pass ($20/mo) or Combined Pass ($30/mo) required for hot-swap network.</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => toggleMemberPass('TESLA')}
                  className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-cyan-400 text-stone-950 font-bold font-mono-code text-[11px] uppercase"
                >
                  Activate Tesla ($20)
                </button>
                <button
                  onClick={() => toggleMemberPass('COMBO')}
                  className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-purple-400 text-stone-950 font-bold font-mono-code text-[11px] uppercase"
                >
                  Get Combo ($30)
                </button>
              </div>
            </div>
          )}

          {/* Exchange Form */}
          <form onSubmit={handleDispatchBatterySwap} className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-5">
            <h3 className="text-sm font-mono-code uppercase font-bold text-white tracking-wider flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-cyan-400" />
              <span>Step 1: Select Depleted Battery Capacity</span>
            </h3>

            {/* Capacity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {capacities.map(cap => {
                const isSelected = selectedCapacity === cap.size;
                return (
                  <button
                    key={cap.size}
                    type="button"
                    onClick={() => setSelectedCapacity(cap.size)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md'
                        : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-display font-black tracking-wide ${isSelected ? 'text-white' : 'text-stone-300'}`}>
                        {cap.label}
                      </span>
                      <Battery className={`w-4 h-4 ${cap.iconSize}`} />
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                      {cap.desc}
                    </p>
                    <div className="mt-2 text-[10px] font-mono-code text-cyan-400/80">
                      Handover dead → Get 100% full
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step 2: Exchange Mode */}
            <div className="space-y-2 pt-3 border-t border-stone-800">
              <h3 className="text-sm font-mono-code uppercase font-bold text-white tracking-wider flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-400" />
                <span>Step 2: Choose Exchange Method</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setExchangeType('DELIVERY_DISPATCH')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    exchangeType === 'DELIVERY_DISPATCH'
                      ? 'bg-amber-950/30 border-amber-500 text-white'
                      : 'bg-stone-950/70 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-mono-code font-bold text-xs uppercase flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-amber-400" />
                    <span>Courier Dispatch</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">Rider travels to your location with full pack.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExchangeType('STREET_SWAP')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    exchangeType === 'STREET_SWAP'
                      ? 'bg-amber-950/30 border-amber-500 text-white'
                      : 'bg-stone-950/70 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-mono-code font-bold text-xs uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Street Meet</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">Flag down an active 247 courier on patrol.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExchangeType('HUB_WALKUP')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    exchangeType === 'HUB_WALKUP'
                      ? 'bg-amber-950/30 border-amber-500 text-white'
                      : 'bg-stone-950/70 border-stone-800 text-stone-400'
                  }`}
                >
                  <div className="font-mono-code font-bold text-xs uppercase flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-purple-400" />
                    <span>Hub Walk-Up</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">Direct hot-swap at 875 Elm St micro-depot.</p>
                </button>
              </div>
            </div>

            {/* Address & Note Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-mono-code text-stone-400 uppercase block mb-1">
                  Location / Address in Manchester
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 rounded-lg border border-stone-800 text-white text-xs font-mono-code focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. 875 Elm St, Manchester, NH"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-stone-400 uppercase block mb-1">
                  Handover Notes
                </label>
                <input
                  type="text"
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 rounded-lg border border-stone-800 text-white text-xs font-mono-code focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. Waiting near bike rack, pack is Anker 10k"
                />
              </div>
            </div>

            {/* Dispatch Button */}
            <button
              type="submit"
              disabled={isSubmittingSwap}
              id="dispatch-battery-swap-btn"
              className="w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-stone-950 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] transition-all"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {hasBatteryPrivilege 
                  ? `Dispatch ${selectedCapacity} mAh Battery Swap (Free)`
                  : `Activate Tesla Pass & Dispatch ${selectedCapacity} mAh Swap`}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: EXCHANGE LOG */}
      {activeSubTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono-code uppercase font-bold text-white tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Tesla Battery Pack Exchange Records</span>
            </h3>
            <span className="text-xs font-mono-code text-stone-400">
              {batteryExchanges.length} Total Swaps
            </span>
          </div>

          {batteryExchanges.length === 0 ? (
            <div className="p-8 text-center bg-stone-900/60 rounded-xl border border-stone-800 text-stone-400 text-xs font-mono-code">
              No battery exchanges recorded yet. Select your battery capacity on the Hot-Swap tab to request a fresh pack.
            </div>
          ) : (
            <div className="space-y-2.5">
              {batteryExchanges.map(swap => (
                <div 
                  key={swap.id}
                  className={`p-4 rounded-xl border transition-all ${
                    swap.id === lastDispatchedSwapId 
                      ? 'bg-cyan-950/30 border-cyan-500/80 shadow-lg' 
                      : 'bg-stone-900 border-stone-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {swap.capacity} mAh
                      </span>
                      <span className="text-xs font-bold text-white font-mono-code">
                        Serial: {swap.pack_serial || 'TSL-10K-001'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded ${
                      swap.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : swap.status === 'EN_ROUTE'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800 animate-pulse'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {swap.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-stone-800/80 text-[11px] font-mono-code text-stone-400">
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase">Location</span>
                      <span className="text-stone-200">{swap.delivery_address || 'Manchester Hub'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase">Assigned Courier</span>
                      <span className="text-stone-200">{swap.rider_name || 'Dispatch Courier'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[9px] uppercase">Handover Time</span>
                      <span className="text-stone-200">{new Date(swap.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
