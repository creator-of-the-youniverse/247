import React from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Sparkles, 
  X, 
  ArrowRight, 
  ShieldAlert,
  Bike
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout: () => void;
  onOpenFreeEssentialModal: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onOpenCheckout,
  onOpenFreeEssentialModal
}) => {
  const {
    cart,
    products,
    removeFromCart,
    updateQuantity,
    selectFreeItem,
    clearCart,
    cartSubtotal,
    cartDeliveryFee,
    cartMemberDiscount,
    cartTotal,
    cartItemCount,
    settings,
    activePass
  } = useStore();

  if (!isOpen) return null;

  const isMember = activePass?.subscription_status === 'ACTIVE';
  const hasItems = cart.items.length > 0 || cart.free_item;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border-l border-stone-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-white uppercase tracking-wider">
                Mobile Cargo Cart
              </h2>
              <p className="text-[11px] text-stone-400 font-mono-code">
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} loaded
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

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!hasItems ? (
            <div className="p-8 text-center text-stone-400 space-y-3">
              <Bike className="w-12 h-12 mx-auto text-stone-700" />
              <p className="font-mono-code text-sm text-stone-300">Your cargo cart is empty.</p>
              <p className="text-xs text-stone-500">
                Browse our mobile micro-store catalog or pick your Free Essential choice.
              </p>
            </div>
          ) : (
            <>
              {/* FREE ESSENTIAL SELECTION CARD */}
              <div className="rounded-xl bg-gradient-to-r from-amber-950/40 to-stone-900 border border-amber-500/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-code font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Free Essential Selection
                  </span>
                  <button
                    onClick={onOpenFreeEssentialModal}
                    className="text-xs font-mono-code text-amber-400 hover:underline"
                  >
                    {cart.free_item ? 'Change' : 'Select Item'} →
                  </button>
                </div>

                {cart.free_item ? (
                  <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-lg border border-stone-800">
                    <div className="text-xs">
                      <div className="font-bold text-white">{cart.free_item.name}</div>
                      <div className="text-[10px] text-amber-400 font-mono-code uppercase">{cart.free_item.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code font-bold text-emerald-400 text-xs">$0.00 FREE</span>
                      <button
                        onClick={() => selectFreeItem(null)}
                        className="text-stone-500 hover:text-rose-400 p-1"
                        title="Remove free item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={onOpenFreeEssentialModal}
                    className="cursor-pointer text-xs text-stone-400 bg-stone-950/60 p-2.5 rounded-lg border border-dashed border-stone-700 hover:border-amber-500/60 text-center font-mono-code"
                  >
                    + Tap to select your 1 free qualifying essential ($0.00)
                  </div>
                )}
              </div>

              {/* PURCHASED ITEMS LIST */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-code text-stone-400 uppercase tracking-wider">
                    Purchased Loadout ({(cart?.items || []).length})
                  </span>
                  {(cart?.items || []).length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-[11px] font-mono-code text-stone-500 hover:text-rose-400"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {(cart?.items || []).map(item => {
                  const product = (products || []).find(p => p.id === item.product_id);
                  const price = isMember ? item.member_price : item.unit_price;
                  const itemTotal = price * item.quantity;

                  return (
                    <div
                      key={item.product_id}
                      className="p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-white truncate">{item.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono-code text-stone-400">${price.toFixed(2)} each</span>
                          {product?.age_restricted && (
                            <span className="text-[9px] bg-rose-950 text-rose-300 px-1 rounded border border-rose-500/40 font-mono-code">
                              21+ ID
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-stone-900 border border-stone-700 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-1 text-stone-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono-code text-xs font-bold px-2 text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-1 text-stone-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="w-14 text-right font-mono-code font-bold text-xs text-white">
                          ${itemTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Age Restriction Check Warning */}
              {cart.requires_id_check && (
                <div className="p-3 bg-stone-950 border border-rose-900/60 rounded-xl flex items-start gap-2 text-xs text-stone-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300 font-mono-code">Age-Restricted Item Included</span>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Rider will verify physical government photo ID (21+) upon arrival.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer / Pricing Summary */}
        {hasItems && (
          <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3 font-mono-code">
            <div className="space-y-1.5 text-xs text-stone-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              {cartMemberDiscount > 0 && (
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Trader Pass Member Savings:</span>
                  <span>-${cartMemberDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery (≤60 min bicycle dispatch):</span>
                <span>
                  {cartDeliveryFee === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE</span>
                  ) : (
                    `$${cartDeliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-800 flex justify-between text-base font-bold text-white font-display">
                <span>TOTAL:</span>
                <span className="text-amber-400">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              id="cart-checkout-proceed-btn"
              onClick={() => {
                onClose();
                onOpenCheckout();
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm uppercase tracking-wider font-mono-code flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all"
            >
              <span>Proceed to Delivery</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
