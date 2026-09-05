import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory, Product } from '../../types';
import { 
  Search, 
  Sparkles, 
  ShieldAlert, 
  Plus, 
  Check, 
  Droplet, 
  Heart, 
  Sun, 
  Wind, 
  Cigarette, 
  Package, 
  Info,
  Filter
} from 'lucide-react';

interface ShopScreenProps {
  onOpenFreeEssentialModal: () => void;
}

const CATEGORIES: { id: ProductCategory | 'ALL'; label: string; icon?: any }[] = [
  { id: 'ALL', label: 'ALL ITEMS' },
  { id: 'ESSENTIALS', label: 'ESSENTIALS' },
  { id: 'FIRST AID', label: 'FIRST AID' },
  { id: 'HYGIENE', label: 'HYGIENE' },
  { id: 'FOOD & DRINK', label: 'FOOD & DRINK' },
  { id: 'WEATHER', label: 'WEATHER' },
  { id: 'HARM REDUCTION', label: 'HARM REDUCTION' },
  { id: 'SMOKE SHOP', label: 'SMOKE SHOP (21+)' },
  { id: 'OTHER', label: 'OTHER' }
];

export const ShopScreen: React.FC<ShopScreenProps> = ({ onOpenFreeEssentialModal }) => {
  const { approvedProducts, addToCart, cart, activePass } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const isMember = activePass?.subscription_status === 'ACTIVE';

  // Filter products based on category, search, and free-only toggle
  const filteredProducts = approvedProducts.filter(product => {
    if (selectedCategory !== 'ALL' && product.category !== selectedCategory) {
      return false;
    }
    if (showFreeOnly && !product.free_eligible) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = product.name.toLowerCase().includes(q);
      const matchDesc = product.description.toLowerCase().includes(q);
      const matchCat = product.category.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner / Search bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-2xl text-white uppercase tracking-wider">
              Mobile Micro-Store
            </h1>
            <p className="text-xs text-stone-400 font-mono-code">
              Real-time inventory rolling in Manchester cargo cart
            </p>
          </div>
          <button
            onClick={onOpenFreeEssentialModal}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500 hover:text-stone-950 text-amber-300 text-xs font-mono-code font-bold transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Free Item ({cart.free_item ? '1 Selected' : 'Choose'})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="product-search-input"
            type="text"
            placeholder="Search water, socks, first aid, warmers, snacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors font-mono-code"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Free-only quick toggle */}
        <div className="flex items-center justify-between text-xs pt-1">
          <button
            onClick={() => setShowFreeOnly(!showFreeOnly)}
            className={`px-3 py-1 rounded-full border text-xs font-mono-code flex items-center gap-1.5 transition-colors ${
              showFreeOnly
                ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Free Essential Eligible Only</span>
          </button>
          <span className="text-stone-400 font-mono-code text-[11px]">
            {filteredProducts.length} items available
          </span>
        </div>
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`cat-filter-${cat.id.toLowerCase().replace(/[\s&()]/g, '-')}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold tracking-wider whitespace-nowrap transition-colors border ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                  : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white hover:border-stone-700'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-stone-900/50 border border-stone-800 text-stone-400 space-y-2">
          <Package className="w-8 h-8 mx-auto text-stone-600" />
          <p className="font-mono-code text-sm text-stone-300">No products found matching your search</p>
          <button
            onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); setShowFreeOnly(false); }}
            className="text-xs text-amber-400 hover:underline font-mono-code"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map(product => {
            const displayPrice = isMember ? product.member_price : product.retail_price;
            const inCartQty = cart.items.find(i => i.product_id === product.id)?.quantity || 0;
            const isOutOfStock = product.inventory_available <= 0;

            return (
              <div
                key={product.id}
                id={`product-card-${product.id}`}
                className={`bg-stone-900 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${
                  inCartQty > 0 ? 'border-amber-500/80 bg-stone-900/90' : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Image container */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-stone-950">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.free_eligible && (
                        <span className="bg-amber-500 text-stone-950 text-[10px] font-mono-code font-extrabold px-1.5 py-0.5 rounded shadow">
                          FREE ELIGIBLE
                        </span>
                      )}
                      {product.age_restricted && (
                        <span className="bg-rose-900/90 text-rose-200 border border-rose-500/50 text-[9px] font-mono-code font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                          <ShieldAlert className="w-2.5 h-2.5" /> {product.minimum_age || 21}+ ID REQ
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 bg-stone-950/85 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-mono-code text-stone-300 border border-stone-800">
                      {isOutOfStock ? (
                        <span className="text-rose-400 font-bold">OUT OF STOCK</span>
                      ) : (
                        <span className="text-emerald-400">{product.inventory_available} IN CART</span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono-code text-amber-400/90 uppercase">
                      <span>{product.category}</span>
                      <span>SKU: {product.sku}</span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-0.5 leading-snug">{product.name}</h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                  </div>
                </div>

                {/* Pricing & Add to Cart button */}
                <div className="pt-3 border-t border-stone-800/80 mt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-code font-bold text-base text-white">
                        ${displayPrice.toFixed(2)}
                      </span>
                      {isMember && product.member_price < product.retail_price && (
                        <span className="text-xs text-stone-500 line-through font-mono-code">
                          ${product.retail_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {isMember && product.member_price < product.retail_price && (
                      <span className="text-[10px] text-amber-400 font-mono-code block">Member Price Applied</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {inCartQty > 0 && (
                      <span className="text-xs font-mono-code text-amber-400 font-bold px-1.5">
                        {inCartQty} in cart
                      </span>
                    )}
                    <button
                      id={`add-product-btn-${product.id}`}
                      onClick={() => addToCart(product, 1)}
                      disabled={isOutOfStock}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono-code flex items-center gap-1 transition-all ${
                        isOutOfStock
                          ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          : inCartQty > 0
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold'
                            : 'bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{inCartQty > 0 ? 'ADD MORE' : 'ADD'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
