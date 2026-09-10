import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles, X, Check, Droplet, Heart, Sun, Package, ShieldCheck } from 'lucide-react';
import { Product } from '../../types';

interface FreeEssentialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FreeEssentialModal: React.FC<FreeEssentialModalProps> = ({ isOpen, onClose }) => {
  const { approvedProducts, cart, selectFreeItem, freeSettings } = useStore();

  if (!isOpen) return null;

  const freeEligibleProducts = approvedProducts.filter(p => p.free_eligible && p.inventory_available > 0);

  const handleSelect = (product: Product) => {
    if (cart.free_item?.product_id === product.id) {
      selectFreeItem(null); // Unselect
    } else {
      selectFreeItem(product);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-amber-500/40 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-white uppercase tracking-wider">
                Select Your Free Essential
              </h2>
              <p className="text-[11px] text-amber-300 font-mono-code">
                Every qualifying order includes 1 free item ($0.00)
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

        {/* Info Banner */}
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-stone-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Choose 1 eligible essential item from our cargo loadout. Funded by 247 and the Manchester Community Supply Fund.
          </p>
        </div>

        {/* Product Selection List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {freeEligibleProducts.map(product => {
            const isSelected = cart.free_item?.product_id === product.id;
            return (
              <div
                key={product.id}
                onClick={() => handleSelect(product)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow'
                    : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-900 shrink-0">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-code text-amber-400 uppercase">{product.category}</div>
                    <div className="font-bold text-xs text-white">{product.name}</div>
                    <div className="text-[11px] text-stone-400">{product.description}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono-code font-bold text-emerald-400">$0.00 FREE</div>
                  <div className="text-[10px] text-stone-500 line-through">${product.retail_price.toFixed(2)}</div>
                  <div className={`mt-1 text-xs font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'}`}>
                    {isSelected ? 'SELECTED' : 'SELECT'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs font-mono-code">
          <span className="text-stone-400">
            {cart.free_item ? `1 Item Selected: ${cart.free_item.name}` : 'No free item selected'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
          >
            Confirm & Done
          </button>
        </div>
      </div>
    </div>
  );
};
