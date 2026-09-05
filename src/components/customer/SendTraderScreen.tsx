import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import { Product, CommunityResource } from '../../types';
import { 
  Send, 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  Check, 
  ShoppingBag, 
  X, 
  ShieldAlert, 
  CornerDownRight, 
  PhoneCall 
} from 'lucide-react';

interface SendTraderScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
}

const SAMPLE_PROMPTS = [
  "I have wet shoes and freezing feet. I need dry socks and hand warmers.",
  "I scraped my knee on the curb. Need bandages, antiseptic, and cold spring water.",
  "Working late shift, need energy snack, granola bar and electrolytes.",
  "Cold night prep: emergency thermal blanket, wet wipes and water."
];

export const SendTraderScreen: React.FC<SendTraderScreenProps> = ({ isOpen, onClose, onOpenCart }) => {
  const { addToCart, addToast } = useStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    interpretation: string;
    suggestedProducts: Product[];
    explanation: string;
    isEmergencyAlert: boolean;
    emergencyAdvice: string | null;
    relevantResources: CommunityResource[];
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (textToSubmit?: string) => {
    const query = textToSubmit || prompt;
    if (!query.trim()) return;

    try {
      setLoading(true);
      const res = await api.sendTraderAI(query);
      setResult(res);
    } catch (err: any) {
      console.error('Send Trader Error:', err);
      addToast('Request Error', 'Could not process request. Please try selecting items from the shop catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToCart = () => {
    if (!result?.suggestedProducts) return;
    for (const prod of result.suggestedProducts) {
      addToCart(prod, 1);
    }
    addToast('Items Added to Cart', `${result.suggestedProducts.length} items queued for cargo dispatch.`, 'success');
    onClose();
    onOpenCart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-amber-500/50 rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-base text-white uppercase tracking-wider">
                  SEND TRADER
                </h2>
                <span className="text-[10px] bg-amber-400 text-stone-950 font-bold px-1.5 py-0.2 rounded font-mono-code">AI DISPATCH</span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono-code">
                Describe in plain English what you need rolled to your location
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Natural language input */}
          <div className="space-y-2">
            <label className="text-xs font-mono-code text-stone-300 font-bold uppercase tracking-wider block">
              What do you need right now?
            </label>
            <div className="relative">
              <textarea
                id="send-trader-input"
                rows={3}
                placeholder="e.g., 'I am out in the cold on Elm St, need water, heavy socks, and something for a blister...'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono-code resize-none"
              />
              <button
                id="send-trader-submit-btn"
                onClick={() => handleSubmit()}
                disabled={loading || !prompt.trim()}
                className="absolute right-2.5 bottom-2.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 font-bold text-xs font-mono-code flex items-center gap-1.5 transition-all shadow"
              >
                {loading ? (
                  <span className="animate-spin text-stone-950">⟳</span>
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{loading ? 'Interpreting...' : 'Roll Request'}</span>
              </button>
            </div>
          </div>

          {/* Prompt Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono-code text-stone-400 uppercase tracking-wider">
              Quick Situations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PROMPTS.map((sp, idx) => (
                <button
                  key={idx}
                  onClick={() => { setPrompt(sp); handleSubmit(sp); }}
                  className="text-left text-[11px] bg-stone-950 border border-stone-800 hover:border-amber-500/50 hover:text-amber-300 text-stone-400 px-2.5 py-1.5 rounded-lg font-mono-code transition-colors"
                >
                  "{sp}"
                </button>
              ))}
            </div>
          </div>

          {/* AI Result Presentation */}
          {result && (
            <div className="space-y-3 pt-2 border-t border-stone-800 animate-fadeIn">
              {/* Emergency Alert (if applicable) */}
              {result.isEmergencyAlert && (
                <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-xl text-rose-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold uppercase font-mono-code text-rose-400">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    EMERGENCY SAFETY ADVISORY
                  </div>
                  <p className="leading-relaxed">{result.emergencyAdvice || 'For acute life-threatening medical distress, please dial 911 or visit Catholic Medical Center Emergency Dept immediately.'}</p>
                </div>
              )}

              {/* Explanation & Interpretation */}
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
                <div className="text-[10px] font-mono-code text-amber-400 font-bold uppercase">
                  TRADER INTERPRETATION:
                </div>
                <p className="text-xs text-stone-200 leading-relaxed font-mono-code">
                  {result.explanation}
                </p>
              </div>

              {/* Suggested Product Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-code font-bold text-white uppercase">
                    Matched In-Cart Items ({result.suggestedProducts.length}):
                  </span>
                  <button
                    onClick={handleAddAllToCart}
                    className="text-xs font-mono-code text-amber-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add All to Cart
                  </button>
                </div>

                <div className="space-y-2">
                  {(result.suggestedProducts || []).map(prod => (
                    <div
                      key={prod.id}
                      className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-900 shrink-0">
                          <img src={prod.image} alt={prod.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono-code text-amber-400 uppercase">{prod.category}</div>
                          <div className="font-bold text-xs text-white">{prod.name}</div>
                          <div className="text-[11px] text-stone-400 font-mono-code">${prod.retail_price.toFixed(2)}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          addToCart(prod, 1);
                          addToast('Added', `${prod.name} added to cart`, 'success');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-xs font-mono-code font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched Community Resources */}
              {result.relevantResources && result.relevantResources.length > 0 && (
                <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl space-y-1.5 text-xs">
                  <div className="text-[10px] font-mono-code text-stone-400 font-bold uppercase">
                    Free Community Services Available:
                  </div>
                  {(result.relevantResources || []).map(res => (
                    <div key={res.id} className="flex items-center justify-between text-xs text-stone-300">
                      <span><strong>{res.name}</strong> • {res.address}</span>
                      <a href={`tel:${res.phone}`} className="text-amber-400 font-mono-code text-[11px] hover:underline flex items-center gap-1">
                        <PhoneCall className="w-3 h-3" /> {res.phone}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legal Compliance Disclaimer */}
          <div className="text-[10px] font-mono-code text-stone-500 border-t border-stone-800 pt-2 leading-relaxed">
            24 is a mobile micro-store retail delivery service. We do not provide medical diagnosis, emergency medical transport, or controlled substances.
          </div>
        </div>

        {/* Footer */}
        {result && (
          <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-mono-code text-stone-400 hover:text-white"
            >
              Close
            </button>
            <button
              onClick={handleAddAllToCart}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs font-mono-code uppercase tracking-wider flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add All & Open Cart</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
