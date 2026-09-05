import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CustomerTab } from '../BottomNav';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { 
  ShoppingBag, 
  Sparkles, 
  Send, 
  HelpCircle, 
  Droplet, 
  HeartHandshake, 
  ShieldAlert, 
  ArrowRight,
  Flame,
  Plus,
  Bike
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (tab: CustomerTab) => void;
  onOpenSendTrader: () => void;
  onOpenAskTrader: () => void;
  onOpenFreeEssentialModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onOpenSendTrader,
  onOpenAskTrader,
  onOpenFreeEssentialModal
}) => {
  const { 
    settings, 
    approvedProducts, 
    addToCart, 
    cart, 
    analytics,
    activePass
  } = useStore();

  const quickEssentials = approvedProducts.slice(0, 4);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Container - Street-Level Industrial Mobile-First Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-stone-800 p-6 shadow-xl">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header Subhead Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono-code font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              24/7/365 • MANCHESTER, NH
            </span>
            <span className="text-xs font-mono-code text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded border border-stone-700">
              TARGET DELIVERY ≤{settings.target_delivery_minutes} MIN
            </span>
          </div>

          {/* Primary Typography Branding */}
          <div className="pt-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-display uppercase leading-none">
              24
            </h1>
            <p className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide font-display mt-2">
              NEED SOMETHING?
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-wider font-display uppercase">
              RIDERS ROLL OUT.
            </p>
          </div>

          <p className="text-stone-300 text-sm leading-relaxed max-w-md pt-1">
            Bicycle and cargo-cart mobile retail and essential supply delivery across Manchester streets. Real humans on pedal power, 60 minutes or less.
          </p>

          {/* Free Essential Feature Callout */}
          <div 
            onClick={onOpenFreeEssentialModal}
            className="cursor-pointer bg-gradient-to-r from-amber-500/20 to-stone-900 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between hover:border-amber-400 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300 font-mono-code uppercase">Free Essential Program</div>
                <div className="text-xs text-stone-300">
                  {cart.free_item 
                    ? `Selected: ${cart.free_item.name} ($0.00)` 
                    : 'Every qualifying order includes 1 free eligible essential.'}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
              {cart.free_item ? 'Change' : 'Choose Free'} →
            </span>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY ACTION TILES */}
      <div className="grid grid-cols-2 gap-3">
        {/* ACTION 1: SHOP */}
        <button
          id="home-action-shop"
          onClick={() => onNavigate('SHOP')}
          className="p-4 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-850 text-left transition-all group flex flex-col justify-between h-32 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white block uppercase">SHOP</span>
            <span className="text-xs text-stone-400 block font-mono-code">Full mobile store catalog</span>
          </div>
        </button>

        {/* ACTION 2: SEND TRADER (AI Natural Language) */}
        <button
          id="home-action-send-trader"
          onClick={onOpenSendTrader}
          className="p-4 rounded-xl bg-gradient-to-br from-stone-900 to-amber-950/40 border border-amber-500/40 hover:border-amber-400 hover:from-stone-850 text-left transition-all group flex flex-col justify-between h-32 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-sm">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono-code bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded font-black">AI ASSIST</span>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-amber-300 block uppercase">SEND TRADER</span>
            <span className="text-xs text-stone-300 block font-mono-code">Describe what you need</span>
          </div>
        </button>

        {/* ACTION 3: I NEED ESSENTIALS */}
        <button
          id="home-action-essentials"
          onClick={onOpenFreeEssentialModal}
          className="p-4 rounded-xl bg-stone-900 border border-stone-800 hover:border-emerald-500/60 hover:bg-stone-850 text-left transition-all group flex flex-col justify-between h-32 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-stone-950 transition-colors">
              <Droplet className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white block uppercase">I NEED ESSENTIALS</span>
            <span className="text-xs text-stone-400 block font-mono-code">Water, first aid, warmth</span>
          </div>
        </button>

        {/* ACTION 4: ASK TRADER */}
        <button
          id="home-action-ask-trader"
          onClick={onOpenAskTrader}
          className="p-4 rounded-xl bg-stone-900 border border-stone-800 hover:border-sky-500/60 hover:bg-stone-850 text-left transition-all group flex flex-col justify-between h-32 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-stone-950 transition-colors">
              <HelpCircle className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white block uppercase">ASK TRADER</span>
            <span className="text-xs text-stone-400 block font-mono-code">Delivery, items & kits Q&A</span>
          </div>
        </button>
      </div>

      {/* PWA Mobile Quick Install Card */}
      <div className="sm:hidden">
        <PWAInstallButton variant="drawer" />
      </div>

      {/* QUICK DISPATCH CART ESSENTIALS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-amber-400" />
            <h2 className="font-display font-bold text-sm text-white uppercase tracking-wider">Fast In-Cart Loadout</h2>
          </div>
          <button
            onClick={() => onNavigate('SHOP')}
            className="text-xs text-amber-400 font-mono-code hover:underline"
          >
            View All ({approvedProducts.length}) →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickEssentials.map(product => {
            const isMember = activePass?.subscription_status === 'ACTIVE';
            const displayPrice = isMember ? product.member_price : product.retail_price;
            return (
              <div 
                key={product.id}
                className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-col justify-between hover:border-stone-700 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-stone-950 relative">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {product.free_eligible && (
                      <span className="absolute top-1 right-1 bg-amber-500 text-stone-950 text-[9px] font-mono-code font-bold px-1 rounded">
                        FREE ELIGIBLE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono-code text-amber-400/80 uppercase">{product.category}</div>
                  <h3 className="font-semibold text-xs text-stone-100 line-clamp-2 leading-snug">{product.name}</h3>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-stone-800/80 mt-2">
                  <div>
                    <span className="font-mono-code font-bold text-sm text-white">
                      ${displayPrice.toFixed(2)}
                    </span>
                    {isMember && product.member_price < product.retail_price && (
                      <span className="text-[10px] text-stone-500 line-through ml-1">${product.retail_price.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    id={`quick-add-${product.id}`}
                    onClick={() => addToCart(product, 1)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 transition-colors"
                    title="Add to Cart"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TRADER PASS PROMO BANNER */}
      {activePass?.subscription_status !== 'ACTIVE' ? (
        <div className="rounded-xl bg-gradient-to-r from-amber-950/60 via-stone-900 to-stone-900 border border-amber-500/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm text-white uppercase tracking-wider">TRADER PASS • $20/MONTH</span>
            </div>
            <p className="text-xs text-stone-300">
              Get <span className="text-amber-300 font-bold">$20 monthly Essential Credit</span>, $0 delivery fees, priority bicycle dispatch, and member pricing.
            </p>
          </div>
          <button
            onClick={() => onNavigate('TRADER_PASS')}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs font-mono-code uppercase tracking-wider transition-colors whitespace-nowrap"
          >
            Learn & Activate →
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-stone-900 border border-amber-500/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 font-mono-code">TRADER PASS ACTIVE</div>
              <div className="text-xs text-stone-300">
                Essential Credit Remaining: <span className="font-bold text-white">${activePass.credit_remaining.toFixed(2)}</span> • $0 Delivery Active
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('TRADER_PASS')}
            className="text-xs text-amber-400 hover:underline font-mono-code"
          >
            Manage Pass →
          </button>
        </div>
      )}

      {/* COMMUNITY SUPPLY FUND IMPACT */}
      <div className="rounded-xl bg-stone-900/60 border border-stone-800 p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <HeartHandshake className="w-4 h-4 text-rose-400" />
          <span className="text-stone-300">
            Community supporters helped provide <strong className="text-white font-mono-code">{analytics?.community_funded_items_month || 137}</strong> essential items across Manchester this month.
          </span>
        </div>
        <button
          onClick={() => onNavigate('ACCOUNT')}
          className="text-amber-400 font-mono-code font-bold hover:underline whitespace-nowrap ml-2"
        >
          Fund Supplies →
        </button>
      </div>
    </div>
  );
};
