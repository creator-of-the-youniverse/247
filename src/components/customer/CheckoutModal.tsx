import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod } from '../../types';
import { 
  Bike, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  Wallet, 
  Banknote, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  ArrowRight,
  Clock
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderCompleted
}) => {
  const {
    cart,
    setDeliveryAddress,
    setDeliveryZoneId,
    setDeliveryInstructions,
    setCustomerInfo,
    setPaymentMethod,
    setAgeVerified,
    cartSubtotal,
    cartDeliveryFee,
    cartMemberDiscount,
    cartCreditApplied,
    cartTotal,
    serviceZones,
    settings,
    activePass,
    placeOrder,
    addToast
  } = useStore();

  const [submitting, setSubmitting] = useState(false);
  const isMember = activePass?.subscription_status === 'ACTIVE';

  if (!isOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart.delivery_address.trim()) {
      addToast('Address Required', 'Please enter a Manchester delivery street or meetup spot.', 'warning');
      return;
    }

    if (cart.requires_id_check && !cart.age_verified) {
      addToast('Age Verification Required', 'You must verify that you are 21+ to order restricted items.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await placeOrder();
      onClose();
      onOrderCompleted();
    } catch (err: any) {
      console.error('Order submission error:', err);
      addToast('Order Error', err.message || 'Could not place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-white uppercase tracking-wider">
                Dispatch Checkout
              </h2>
              <p className="text-[11px] text-stone-400 font-mono-code flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Target Delivery ≤{settings.target_delivery_minutes} Minutes
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

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Section 1: Customer Contact */}
          <div className="space-y-3 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <span className="text-xs font-mono-code font-bold text-amber-400 uppercase tracking-wider block">
              1. Contact & Recipient
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-stone-400 font-mono-code block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={cart.customer_name}
                  onChange={(e) => setCustomerInfo(e.target.value, cart.customer_phone)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-code"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-400 font-mono-code block mb-1">Phone (SMS updates)</label>
                <input
                  type="tel"
                  required
                  value={cart.customer_phone}
                  onChange={(e) => setCustomerInfo(cart.customer_name, e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-code"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Location & Spot */}
          <div className="space-y-3 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <span className="text-xs font-mono-code font-bold text-amber-400 uppercase tracking-wider block">
              2. Manchester Delivery Location
            </span>
            
            <div>
              <label className="text-[11px] text-stone-400 font-mono-code block mb-1">Coverage Zone</label>
              <select
                value={cart.delivery_zone_id}
                onChange={(e) => setDeliveryZoneId(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-code"
              >
                {serviceZones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} • ETA {zone.typical_eta_minutes} min ({zone.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-stone-400 font-mono-code block mb-1">Street Address or Meeting Point</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 875 Elm St, Manchester, NH or Pulaski Park bench"
                  value={cart.delivery_address}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-code"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-stone-400 font-mono-code block mb-1">Meetup Notes for Rider</label>
              <input
                type="text"
                placeholder="e.g. 'Standing near front steps wearing blue jacket'"
                value={cart.delivery_instructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500 font-mono-code"
              />
            </div>
          </div>

          {/* Section 3: Age Verification Check (if applicable) */}
          {cart.requires_id_check && (
            <div className="bg-stone-950 p-3.5 rounded-xl border border-rose-900/80 space-y-2">
              <span className="text-xs font-mono-code font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                3. Age Verification Attestation (21+)
              </span>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Your cart contains age-regulated items. You must present valid government photo ID matching this name upon bicycle arrival.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  id="age-verify-checkbox"
                  checked={cart.age_verified}
                  onChange={(e) => setAgeVerified(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span className="text-xs text-white font-mono-code">
                  I certify that I am at least 21 years of age and will show valid ID.
                </span>
              </label>
            </div>
          )}

          {/* Section 4: Payment Method */}
          <div className="space-y-3 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
            <span className="text-xs font-mono-code font-bold text-amber-400 uppercase tracking-wider block">
              {cart.requires_id_check ? '4. Payment Method' : '3. Payment Method'}
            </span>

            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Card */}
              <label
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                  cart.payment_method === 'CARD'
                    ? 'bg-amber-500/10 border-amber-400 text-white'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold font-mono-code">Credit / Debit Card</div>
                    <div className="text-[10px] text-stone-400">Secure contactless processing</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={cart.payment_method === 'CARD'}
                  onChange={() => setPaymentMethod('CARD')}
                  className="accent-amber-500"
                />
              </label>

              {/* Option 2: Trader Pass Essential Credit */}
              {isMember && (
                <label
                  onClick={() => setPaymentMethod('TRADER_PASS_CREDIT')}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    cart.payment_method === 'TRADER_PASS_CREDIT'
                      ? 'bg-amber-500/10 border-amber-400 text-white'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold font-mono-code text-amber-300">
                        Trader Pass Essential Credit
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Balance: ${activePass?.credit_remaining.toFixed(2)} available
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={cart.payment_method === 'TRADER_PASS_CREDIT'}
                    onChange={() => setPaymentMethod('TRADER_PASS_CREDIT')}
                    className="accent-amber-500"
                  />
                </label>
              )}

              {/* Option 3: Cash */}
              <label
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                  cart.payment_method === 'CASH'
                    ? 'bg-amber-500/10 border-amber-400 text-white'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold font-mono-code">Cash on Delivery</div>
                    <div className="text-[10px] text-stone-400">Exact change appreciated by rider</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={cart.payment_method === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                  className="accent-amber-500"
                />
              </label>
            </div>
          </div>

          {/* Section: Breakdown Summary */}
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-1.5 text-xs font-mono-code">
            <div className="flex justify-between text-stone-300">
              <span>Items Subtotal:</span>
              <span>${cartSubtotal.toFixed(2)}</span>
            </div>
            {cart.free_item && (
              <div className="flex justify-between text-emerald-400">
                <span>Free Essential ({cart.free_item.name}):</span>
                <span>$0.00</span>
              </div>
            )}
            {cartMemberDiscount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Member Discount:</span>
                <span>-${cartMemberDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-300">
              <span>Bicycle Delivery:</span>
              <span>{cartDeliveryFee === 0 ? 'FREE' : `$${cartDeliveryFee.toFixed(2)}`}</span>
            </div>
            {cartCreditApplied > 0 && (
              <div className="flex justify-between text-amber-300 font-bold">
                <span>Trader Pass Credit Applied:</span>
                <span>-${cartCreditApplied.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-800 flex justify-between text-sm font-bold text-white font-display">
              <span>AMOUNT DUE:</span>
              <span className="text-amber-400">${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="order-submit-btn"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 text-stone-950 font-bold text-sm uppercase tracking-wider font-mono-code flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] transition-all"
          >
            {submitting ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <Bike className="w-5 h-5" />
            )}
            <span>{submitting ? 'DISPATCHING TRADER...' : 'ROLL TRADER • PLACE ORDER'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
