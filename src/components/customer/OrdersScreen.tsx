import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';
import { 
  Clock, 
  Bike, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Package, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'PLACED', label: 'Placed' },
  { key: 'PAYMENT_CONFIRMED', label: 'Paid' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Packed' },
  { key: 'OUT_FOR_DELIVERY', label: 'Rolling' },
  { key: 'ARRIVING', label: 'Arriving' },
  { key: 'DELIVERED', label: 'Delivered' }
];

export const OrdersScreen: React.FC = () => {
  const { orders, currentOrder, setCurrentOrder, updateOrderStatus, demoMode } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(currentOrder || orders[0] || null);

  useEffect(() => {
    if (currentOrder) {
      setSelectedOrder(currentOrder);
    } else if (orders.length > 0 && !selectedOrder) {
      setSelectedOrder(orders[0]);
    }
  }, [currentOrder, orders]);

  // Calculate 60-minute target countdown
  const getMinutesRemaining = (order: Order) => {
    if (order.status === 'DELIVERED') return 0;
    if (order.status === 'CANCELLED') return 0;
    const deadline = new Date(order.deadline_at).getTime();
    const now = Date.now();
    const diff = Math.round((deadline - now) / 60000);
    return Math.max(0, diff);
  };

  const getStepIndex = (status: OrderStatus) => {
    const idx = STATUS_STEPS.findIndex(s => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl text-white uppercase tracking-wider">
          Delivery Orders
        </h1>
        <p className="text-xs text-stone-400 font-mono-code">
          Live bicycle dispatch tracking across Manchester streets
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center bg-stone-900 border border-stone-800 rounded-2xl text-stone-400 space-y-2">
          <Package className="w-10 h-10 mx-auto text-stone-600" />
          <p className="font-mono-code text-sm text-stone-300">No orders active or historic.</p>
          <p className="text-xs text-stone-500">Orders placed will appear here with live countdown timers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Active Order Spotlight / Tracker */}
          {selectedOrder && (
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-stone-900 border border-amber-500/50 rounded-2xl p-5 shadow-xl space-y-5">
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code font-bold text-lg text-white">
                        {selectedOrder.order_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold font-mono-code uppercase">
                        {selectedOrder.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-mono-code mt-0.5">
                      Placed at {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* 60-minute countdown indicator */}
                  {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' ? (
                    <div className="bg-stone-950 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                      <div>
                        <div className="text-[10px] text-stone-400 font-mono-code uppercase">Target Arrival</div>
                        <div className="text-sm font-mono-code font-extrabold text-amber-300">
                          {getMinutesRemaining(selectedOrder)} MIN REMAINING
                        </div>
                      </div>
                    </div>
                  ) : selectedOrder.status === 'DELIVERED' ? (
                    <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-emerald-400 font-mono-code text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>DELIVERED IN {selectedOrder.actual_delivery_minutes || 28} MIN</span>
                    </div>
                  ) : null}
                </div>

                {/* Progress Step Bar */}
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-1">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(selectedOrder.status);
                      const isComplete = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div
                            className={`h-2 w-full rounded-full transition-all ${
                              isComplete ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-stone-800'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-mono-code mt-1 text-center truncate w-full ${
                              isCurrent
                                ? 'text-amber-400 font-bold'
                                : isComplete
                                ? 'text-stone-300'
                                : 'text-stone-600'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rider Info Card */}
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono-code border border-amber-500/40">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono-code">
                        {selectedOrder.assigned_rider_name || 'Bicycle Dispatch Rider #1'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono-code">
                        Cargo Cart Unit • Manchester Downtown Hub
                      </div>
                    </div>
                  </div>
                  <a
                    href="tel:6035550199"
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-mono-code flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Call Rider</span>
                  </a>
                </div>

                {/* Delivery Location & Instructions */}
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-1.5 text-xs font-mono-code">
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white font-bold">{selectedOrder.delivery_address}</span>
                  </div>
                  {selectedOrder.delivery_instructions && (
                    <p className="text-stone-400 pl-5">
                      Note: "{selectedOrder.delivery_instructions}"
                    </p>
                  )}
                  {selectedOrder.requires_id_check && (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[11px] pt-1 pl-5">
                      <ShieldCheck className="w-3.5 h-3.5" /> ID Verification Required (21+)
                    </div>
                  )}
                </div>

                {/* Items Breakdown */}
                <div className="space-y-2">
                  <div className="text-xs font-mono-code text-stone-400 uppercase tracking-wider">
                    Order Items ({selectedOrder.items.length + (selectedOrder.free_item ? 1 : 0)})
                  </div>
                  <div className="space-y-1.5 bg-stone-950 p-3 rounded-xl border border-stone-800 font-mono-code text-xs">
                    {selectedOrder.free_item && (
                      <div className="flex justify-between text-emerald-400 pb-1.5 border-b border-stone-800">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> [FREE] {selectedOrder.free_item.name}
                        </span>
                        <span>$0.00</span>
                      </div>
                    )}
                    {(selectedOrder.items || []).map((it, i) => (
                      <div key={i} className="flex justify-between text-stone-300">
                        <span>{it.quantity}x {it.name}</span>
                        <span>${((it.member_price || it.unit_price) * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-white text-sm">
                      <span>Total Paid:</span>
                      <span className="text-amber-400">${selectedOrder.total.toFixed(2)} ({selectedOrder.payment_method})</span>
                    </div>
                  </div>
                </div>

                {/* Demo Progression Simulator */}
                {demoMode && selectedOrder.status !== 'DELIVERED' && (
                  <div className="bg-stone-950/80 p-3 rounded-xl border border-dashed border-stone-700 space-y-2">
                    <span className="text-[10px] font-mono-code text-stone-400 uppercase block">
                      Demo Mode • Simulate Rider Progression:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_STEPS.map(step => (
                        <button
                          key={step.key}
                          onClick={() => updateOrderStatus(selectedOrder.id, step.key)}
                          className={`text-[10px] font-mono-code px-2 py-1 rounded ${
                            selectedOrder.status === step.key
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 text-stone-300 hover:bg-stone-800 border border-stone-800'
                          }`}
                        >
                          → {step.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orders History List Column */}
          <div className="space-y-3">
            <h2 className="font-mono-code text-xs text-stone-400 uppercase tracking-wider">
              All Orders ({(orders || []).length})
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {(orders || []).map(order => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setCurrentOrder(order);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-stone-900 border-amber-500 text-white shadow'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-code font-bold text-xs text-white">
                        {order.order_number}
                      </span>
                      <span className={`text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded ${
                        order.status === 'DELIVERED' 
                          ? 'bg-emerald-950 text-emerald-400' 
                          : 'bg-amber-950 text-amber-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-400 font-mono-code mt-1 truncate">
                      {order.delivery_address}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono-code text-stone-500 mt-2 pt-2 border-t border-stone-800/60">
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="font-bold text-white">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
