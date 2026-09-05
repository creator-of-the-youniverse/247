import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import { 
  HeartHandshake, 
  Sparkles, 
  Droplet, 
  Sun, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Heart,
  DollarSign
} from 'lucide-react';
import { SponsorContribution } from '../../types';

export const SponsorScreen: React.FC = () => {
  const { addToast } = useStore();
  const [sponsorsData, setSponsorsData] = useState<{
    contributions: SponsorContribution[];
    fund_balance: number;
    total_raised: number;
    total_funded_items: number;
    public_impact_statement: string;
  } | null>(null);

  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSponsors();
  }, []);

  const loadSponsors = async () => {
    try {
      const data = await api.getSponsors();
      setSponsorsData(data);
    } catch (err) {
      console.error('Failed to load sponsors:', err);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (!finalAmount || finalAmount <= 0) {
      addToast('Invalid Amount', 'Please select or enter a valid dollar amount.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.contributeSponsor({
        sponsor_name: isAnonymous ? 'Anonymous' : (sponsorName || 'Manchester Community Supporter'),
        is_anonymous: isAnonymous,
        amount: finalAmount,
        campaign: 'Manchester Essential Supply Fund',
        message
      });
      addToast('Thank You!', `Your contribution of $${finalAmount.toFixed(2)} will directly fund essential supplies for neighbors.`, 'success');
      setCustomAmount('');
      setMessage('');
      loadSponsors();
    } catch (err: any) {
      addToast('Error', 'Could not record contribution.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const PRESETS = [
    { amount: 10, label: "$10", subtitle: "Funds ~15 Spring Waters" },
    { amount: 25, label: "$25", subtitle: "Funds 12 Warm Sock Pairs" },
    { amount: 50, label: "$50", subtitle: "Funds 8 Emergency Cold-Night Kits" },
    { amount: 100, label: "$100", subtitle: "Funds ~100 Essential Items" }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-code font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded uppercase">
            COMMUNITY SUPPLY FUND
          </span>
          <span className="text-xs font-mono-code text-stone-400">MUTUAL AID & IMPACT</span>
        </div>
        <h1 className="font-display font-black text-2xl text-white uppercase tracking-wider mt-1">
          Fund Essential Supplies
        </h1>
        <p className="text-xs text-stone-400 font-mono-code">
          100% of community contributions go directly to free water, warmth, and first aid on Manchester streets.
        </p>
      </div>

      {/* Impact Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono-code text-stone-400 uppercase">Items Funded</span>
          <div className="text-2xl font-display font-black text-amber-400">
            {sponsorsData?.total_funded_items || 137}
          </div>
          <span className="text-[10px] text-stone-500 font-mono-code">Distributed at $0.00</span>
        </div>

        <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono-code text-stone-400 uppercase">Fund Balance</span>
          <div className="text-2xl font-display font-black text-emerald-400">
            ${sponsorsData?.fund_balance.toFixed(2) || '245.00'}
          </div>
          <span className="text-[10px] text-stone-500 font-mono-code">Reserved for supplies</span>
        </div>

        <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono-code text-stone-400 uppercase">Total Raised</span>
          <div className="text-2xl font-display font-black text-white">
            ${sponsorsData?.total_raised.toFixed(2) || '425.00'}
          </div>
          <span className="text-[10px] text-stone-500 font-mono-code">From local supporters</span>
        </div>
      </div>

      {/* Contribution Form */}
      <form onSubmit={handleContribute} className="p-5 bg-stone-900 border border-amber-500/40 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <h2 className="font-display font-bold text-base text-white uppercase tracking-wider">
            Sponsor an Essential Loadout
          </h2>
        </div>

        {/* Preset Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <button
              type="button"
              key={p.amount}
              onClick={() => { setAmount(p.amount); setCustomAmount(''); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                amount === p.amount && !customAmount
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow'
                  : 'bg-stone-950 text-stone-200 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="text-lg font-display font-bold">{p.label}</div>
              <div className={`text-[10px] font-mono-code mt-0.5 leading-tight ${amount === p.amount && !customAmount ? 'text-stone-900' : 'text-stone-400'}`}>
                {p.subtitle}
              </div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div>
          <label className="text-xs text-stone-400 font-mono-code block mb-1">Or Custom Amount ($)</label>
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 35"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Donor Name & Anonymous */}
        <div className="space-y-2">
          {!isAnonymous && (
            <div>
              <label className="text-xs text-stone-400 font-mono-code block mb-1">Your Name / Business (optional)</label>
              <input
                type="text"
                placeholder="e.g. Manchester Downtown Merchant or Alex J."
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded"
            />
            <span className="text-xs text-stone-300 font-mono-code">Make contribution anonymous</span>
          </label>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs text-stone-400 font-mono-code block mb-1">Community Message (optional)</label>
          <input
            type="text"
            placeholder="e.g. 'Keep rolling, Manchester! Stay warm.'"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white font-mono-code focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 font-bold text-sm uppercase tracking-wider font-mono-code flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] transition-all"
        >
          <HeartHandshake className="w-4 h-4" />
          <span>{submitting ? 'PROCESSING...' : `CONTRIBUTE $${customAmount || amount} TO FUND`}</span>
        </button>
      </form>

      {/* Recent Supporter Wall */}
      <div className="space-y-3">
        <h3 className="font-mono-code text-xs text-stone-400 uppercase tracking-wider">
          Recent Community Supporters:
        </h3>
        <div className="space-y-2">
          {(sponsorsData?.contributions || []).map(s => (
            <div key={s.id} className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between text-xs font-mono-code">
              <div>
                <strong className="text-white">{s.sponsor_name}</strong>
                {s.message && <p className="text-stone-400 text-[11px] mt-0.5">"{s.message}"</p>}
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-400">${s.amount.toFixed(2)}</span>
                <span className="text-[10px] text-stone-500 block">{new Date(s.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {(!sponsorsData?.contributions || sponsorsData.contributions.length === 0) && (
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl text-center text-xs text-stone-400 font-mono-code">
              No recent contributions recorded yet. Be the first to fund essential supplies!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
