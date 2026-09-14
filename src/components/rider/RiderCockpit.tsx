import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';
import { DeliveryRouteMap } from './DeliveryRouteMap';
import { 
  Bike, 
  Clock, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Package, 
  Navigation, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  AlertCircle,
  Plus,
  Radio,
  X,
  Signal,
  BatteryCharging,
  Battery
} from 'lucide-react';
import { useLiveLocations } from '../../context/LiveLocationContext';
import { api } from '../../services/api';

export const RiderCockpit: React.FC = () => {
  const { 
    orders, 
    products, 
    updateOrderStatus, 
    currentRider, 
    setCurrentRider, 
    riders,
    addToast,
    demoMode,
    addMockDelivery,
    seedMockDeliveries,
    batteryExchanges,
    refreshData
  } = useStore();

  const [isAddingMock, setIsAddingMock] = useState(false);

  const {
    locations,
    connectionStatus,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    latestPing,
    dismissPing
  } = useLiveLocations();

  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'ROUTE_MAP' | 'CART_LOADOUT' | 'SHIFT_STATS'>('DISPATCH');
  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState<Order | null>(null);
  const [expandedMapOrderId, setExpandedMapOrderId] = useState<string | null>(null);
  const [problemModalOrder, setProblemModalOrder] = useState<Order | null>(null);
  const [problemReason, setProblemReason] = useState('');

  const activeOrders = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const activeRouteOrder = selectedOrderForRoute || activeOrders[0] || null;

  const getMinutesRemaining = (order: Order) => {
    const deadline = new Date(order.deadline_at).getTime();
    const now = Date.now();
    return Math.round((deadline - now) / 60000);
  };

  const handleAdvanceStatus = async (order: Order) => {
    let nextStatus: OrderStatus = 'ACCEPTED';
    if (order.status === 'PLACED' || order.status === 'PAYMENT_CONFIRMED') nextStatus = 'ACCEPTED';
    else if (order.status === 'ACCEPTED') nextStatus = 'PREPARING';
    else if (order.status === 'PREPARING') nextStatus = 'READY';
    else if (order.status === 'READY') nextStatus = 'OUT_FOR_DELIVERY';
    else if (order.status === 'OUT_FOR_DELIVERY') nextStatus = 'ARRIVING';
    else if (order.status === 'ARRIVING') nextStatus = 'DELIVERED';

    await updateOrderStatus(order.id, nextStatus);
  };

  const handleReportProblem = async () => {
    if (!problemModalOrder) return;
    await updateOrderStatus(problemModalOrder.id, problemModalOrder.status, `Rider Flag: ${problemReason}`);
    addToast('Report Logged', `Dispatch alerted: ${problemReason}`, 'warning');
    setProblemModalOrder(null);
    setProblemReason('');
  };

  const pendingSwaps = batteryExchanges.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');

  const handleAdvanceSwapStatus = async (swapId: string, nextStatus: string) => {
    try {
      await api.updateBatteryExchangeStatus(swapId, {
        status: nextStatus,
        rider_id: currentRider?.id,
        rider_name: currentRider?.name || 'Cargo Unit 1'
      });
      addToast('Battery Swap Updated', `Exchange marked as ${nextStatus}.`, 'info');
      await refreshData();
    } catch (e: any) {
      addToast('Error', e.message || 'Failed to update swap', 'error');
    }
  };

  const cartInventory = products.filter(p => p.inventory_available > 0);

  return (
    <div className="space-y-4 pb-12">
      {/* Real-time Dispatch Ping Alert Banner */}
      {latestPing && (
        <div className="p-3.5 bg-amber-500 text-stone-950 rounded-2xl flex items-center justify-between gap-3 shadow-xl animate-bounce">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-stone-950 animate-pulse shrink-0" />
            <div>
              <div className="font-mono-code font-black text-xs uppercase tracking-wider">
                TACTICAL DISPATCH: {latestPing.title}
              </div>
              <div className="text-xs font-bold font-mono-code">
                {latestPing.message}
              </div>
            </div>
          </div>
          <button
            onClick={dismissPing}
            className="p-1.5 rounded-lg bg-stone-950 text-white hover:bg-stone-800 transition-colors shrink-0"
            title="Acknowledge Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Rider Status Card */}
      <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-xl shadow">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-extrabold text-base text-white uppercase">
                {currentRider?.name || 'Rider 01 - Downtown Hub'}
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono-code font-bold">
                ONLINE
              </span>
              {/* WebSocket mesh status indicator */}
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono-code font-bold uppercase flex items-center gap-1 ${
                connectionStatus === 'connected'
                  ? 'bg-sky-950 text-sky-400 border border-sky-500/40'
                  : 'bg-amber-950 text-amber-400 border border-amber-500/40'
              }`}>
                <Signal className="w-3 h-3" />
                <span>{connectionStatus === 'connected' ? 'GPS MESH SYNC' : 'POLLING'}</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono-code mt-0.5">
              Unit: {currentRider?.vehicle_type || 'Cargo Cargo Bike + Trailer'} • Manchester, NH
            </p>
          </div>
        </div>

        {/* GPS Broadcast Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isBroadcasting) {
                stopBroadcasting();
              } else {
                startBroadcasting({
                  role: 'RIDER',
                  id: currentRider?.id || 'rider-01',
                  name: currentRider?.name || 'Alex Vance (Cargo #1)',
                  orderId: activeOrders[0]?.id,
                  orderNumber: activeOrders[0]?.order_number,
                  destinationAddress: activeOrders[0]?.delivery_address
                });
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-mono-code text-xs font-bold flex items-center gap-2 transition-all ${
              isBroadcasting
                ? 'bg-rose-500 text-stone-950 animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-stone-950 text-sky-400 border border-sky-500/40 hover:bg-stone-850'
            }`}
            title="Stream real GPS from your device to customers and admin"
          >
            <Radio className="w-4 h-4" />
            <span>{isBroadcasting ? 'Broadcasting Device GPS' : 'Share My Live GPS'}</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-mono-code font-bold">
          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'DISPATCH' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            DISPATCH ({activeOrders.length})
          </button>
          <button
            onClick={() => {
              if (!selectedOrderForRoute && activeOrders.length > 0) {
                setSelectedOrderForRoute(activeOrders[0]);
              }
              setActiveTab('ROUTE_MAP');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'ROUTE_MAP' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>ROUTE MAP</span>
          </button>
          <button
            onClick={() => setActiveTab('CART_LOADOUT')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'CART_LOADOUT' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            CART LOADOUT
          </button>
          <button
            onClick={() => setActiveTab('SHIFT_STATS')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'SHIFT_STATS' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            STATS
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE DISPATCH QUEUE */}
      {activeTab === 'DISPATCH' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              Active Dispatch Queue ({activeOrders.length})
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-mono-code hidden sm:inline">60-Min Target SLA</span>
              {demoMode && (
                <button
                  onClick={async () => {
                    setIsAddingMock(true);
                    try {
                      await addMockDelivery();
                    } finally {
                      setIsAddingMock(false);
                    }
                  }}
                  disabled={isAddingMock}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono-code font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                  title="Inject a realistic mock delivery for testing rider navigation and workflow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingMock ? 'Dispatching...' : 'Add Mock Delivery'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Tesla Battery Hot-Swaps Queue */}
          {pendingSwaps.length > 0 && (
            <div className="p-4 bg-cyan-950/30 border border-cyan-500/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="font-mono-code font-bold text-xs uppercase text-cyan-300 tracking-wider">
                    Tesla Battery Hot-Swaps Pending Handover ({pendingSwaps.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono-code text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  BYO PACK SWAP
                </span>
              </div>

              <div className="space-y-2">
                {pendingSwaps.map(swap => (
                  <div key={swap.id} className="p-3 bg-stone-900/90 rounded-xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono-code font-bold text-[10px] bg-cyan-900 text-cyan-200">
                          {swap.capacity} mAh Pack
                        </span>
                        <strong className="text-white font-mono-code">{swap.customer_name}</strong>
                        <span className="text-stone-400 font-mono-code text-[11px]">{swap.customer_phone}</span>
                      </div>
                      <div className="text-[11px] text-stone-300 font-mono-code mt-1 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{swap.delivery_address}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Protocol: Hand over dead pack, deliver full pack ({swap.pack_serial || 'TSL-10K'})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {swap.status === 'REQUESTED' && (
                        <button
                          onClick={() => handleAdvanceSwapStatus(swap.id, 'EN_ROUTE')}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold font-mono-code text-xs uppercase transition-colors"
                        >
                          Accept & Ride
                        </button>
                      )}
                      {swap.status === 'EN_ROUTE' && (
                        <button
                          onClick={() => handleAdvanceSwapStatus(swap.id, 'COMPLETED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold font-mono-code text-xs uppercase transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete Handover</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeOrders.length === 0 ? (
            <div className="p-8 text-center bg-stone-900 border border-stone-800 rounded-2xl text-stone-400 space-y-4">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <div>
                <p className="font-mono-code text-sm text-stone-200">
                  {demoMode ? 'No active dispatches currently in flight.' : 'Dispatch Queue Clear — Standing By'}
                </p>
                <p className="text-xs text-stone-500">
                  {demoMode 
                    ? 'Inject a mock delivery to simulate bicycle routing and status updates.'
                    : 'Live courier telemetry is active. Standing by for customer orders across Manchester.'
                  }
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                {demoMode ? (
                  <>
                    <button
                      onClick={async () => {
                        setIsAddingMock(true);
                        try {
                          await addMockDelivery();
                        } finally {
                          setIsAddingMock(false);
                        }
                      }}
                      disabled={isAddingMock}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono-code font-bold text-xs flex items-center gap-2 transition-colors shadow"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Mock Delivery</span>
                    </button>
                    <button
                      onClick={async () => {
                        await seedMockDeliveries();
                      }}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono-code font-bold text-xs flex items-center gap-2 transition-colors border border-stone-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Seed Full Queue</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={refreshData}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono-code font-bold text-xs flex items-center gap-2 transition-colors border border-stone-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Inbound Dispatches</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => {
                const minsRemaining = getMinutesRemaining(order);
                const isUrgent = minsRemaining <= 20;
                const isCritical = minsRemaining <= 10;

                return (
                  <div
                    key={order.id}
                    className={`p-5 rounded-2xl border-2 shadow-xl space-y-4 transition-all ${
                      isCritical
                        ? 'bg-rose-950/40 border-rose-500'
                        : isUrgent
                        ? 'bg-amber-950/30 border-amber-500'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code font-extrabold text-lg text-white">
                            {order.order_number}
                          </span>
                          <span className="text-xs font-mono-code px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold uppercase">
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 font-mono-code mt-0.5">
                          Customer: {order.customer_name} • {order.payment_method} (${order.total.toFixed(2)})
                        </p>
                      </div>

                      {/* 60-Minute SLA countdown badge */}
                      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono-code font-bold text-xs ${
                        isCritical
                          ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                          : isUrgent
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : 'bg-stone-950 text-stone-300 border-stone-800'
                      }`}>
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{minsRemaining} MIN LEFT (≤60M SLA)</span>
                      </div>
                    </div>

                    {/* Delivery Address & Meeting Instructions */}
                    <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2 text-xs font-mono-code">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 text-white font-bold">
                          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div>{order.delivery_address}</div>
                            {order.delivery_instructions && (
                              <div className="text-stone-400 font-normal text-[11px] mt-0.5">
                                Note: "{order.delivery_instructions}"
                              </div>
                            )}
                          </div>
                        </div>

                        <a
                          href={`tel:${order.customer_phone}`}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 font-bold flex items-center gap-1.5 shrink-0"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </div>

                      {order.requires_id_check && (
                        <div className="p-2 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-200 text-[11px] flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>MANDATORY: Check physical government photo ID (21+) before handover.</span>
                        </div>
                      )}
                    </div>

                    {/* Items Checklist for Packing */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono-code text-stone-400 uppercase tracking-wider block">
                        Items to Dispatch ({order.items.length + (order.free_item ? 1 : 0)}):
                      </span>
                      <div className="space-y-1 bg-stone-950 p-3 rounded-xl border border-stone-800 font-mono-code text-xs">
                        {order.free_item && (
                          <div className="flex justify-between text-emerald-400 font-bold">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> [FREE ESSENTIAL] {order.free_item.name}
                            </span>
                            <span>1x</span>
                          </div>
                        )}
                        {(order.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between text-stone-300">
                            <span>{it.name}</span>
                            <span className="font-bold text-white">{it.quantity}x</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rider Action Workflow Button */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrderForRoute(order);
                            setActiveTab('ROUTE_MAP');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-400 border border-stone-800 hover:border-amber-500/50 text-xs font-mono-code font-bold flex items-center gap-1.5 transition-all shadow"
                          title="Open full route navigation map"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Route Map</span>
                        </button>

                        <button
                          onClick={() => setExpandedMapOrderId(prev => prev === order.id ? null : order.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 text-xs font-mono-code flex items-center gap-1.5 transition-all"
                          title="Toggle inline quick map"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{expandedMapOrderId === order.id ? 'Hide Map' : 'Quick Map'}</span>
                        </button>

                        <button
                          onClick={() => setProblemModalOrder(order)}
                          className="text-xs font-mono-code text-stone-400 hover:text-rose-400 flex items-center gap-1 px-2 py-1"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Issue
                        </button>
                      </div>

                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs uppercase tracking-wider font-mono-code flex items-center gap-2 shadow-lg active:scale-[0.99] transition-all ml-auto"
                      >
                        {order.status === 'PLACED' || order.status === 'PAYMENT_CONFIRMED' ? (
                          <><span>ACCEPT DISPATCH</span> <ArrowRight className="w-4 h-4" /></>
                        ) : order.status === 'ACCEPTED' ? (
                          <><span>MARK PACKED</span> <CheckCircle2 className="w-4 h-4" /></>
                        ) : order.status === 'PREPARING' || order.status === 'READY' ? (
                          <><span>START ROLLING</span> <Bike className="w-4 h-4" /></>
                        ) : order.status === 'OUT_FOR_DELIVERY' ? (
                          <><span>MARK ARRIVED AT LOCATION</span> <MapPin className="w-4 h-4" /></>
                        ) : order.status === 'ARRIVING' ? (
                          <><span>COMPLETE DELIVERY</span> <CheckCircle2 className="w-4 h-4" /></>
                        ) : null}
                      </button>
                    </div>

                    {/* Inline Expandable Route Map Preview */}
                    {expandedMapOrderId === order.id && (
                      <div className="pt-3 border-t border-stone-800">
                        <DeliveryRouteMap
                          order={order}
                          allActiveOrders={activeOrders}
                          onSelectOrder={setSelectedOrderForRoute}
                          initialCollapsedTurns={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: LIVE ROUTE MAP */}
      {activeTab === 'ROUTE_MAP' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              Live Route Navigation
            </h2>
            <span className="text-xs text-stone-400 font-mono-code">
              Base Hub &rarr; Customer Drop-off
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="space-y-4">
              <div className="p-6 text-center bg-stone-900 border border-stone-800 rounded-2xl text-stone-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                <p className="font-mono-code text-sm text-stone-200">No pending dispatches right now.</p>
                <p className="text-xs text-stone-500">Base Hub monitoring active at Elm St &amp; Merrimack St.</p>
              </div>
              <DeliveryRouteMap
                order={completedOrders[0] || null}
                allActiveOrders={[]}
                initialCollapsedTurns={false}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Interactive Route Map */}
              <DeliveryRouteMap
                order={activeRouteOrder}
                allActiveOrders={activeOrders}
                onSelectOrder={(ord) => setSelectedOrderForRoute(ord)}
                initialCollapsedTurns={false}
              />

              {/* Active Delivery Control Console */}
              {activeRouteOrder && (
                <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code font-bold text-base text-white">
                        {activeRouteOrder.order_number}
                      </span>
                      <span className="text-xs font-mono-code px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold uppercase">
                        {activeRouteOrder.status.replace(/_/g, ' ')}
                      </span>
                      {activeRouteOrder.requires_id_check && (
                        <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded font-mono-code font-bold">
                          ID REQ (21+)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 font-mono-code mt-0.5">
                      Drop-off: <strong className="text-white">{activeRouteOrder.delivery_address}</strong> • {activeRouteOrder.customer_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <a
                      href={`tel:${activeRouteOrder.customer_phone}`}
                      className="px-3.5 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-400 border border-stone-800 font-bold text-xs font-mono-code flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    <button
                      onClick={() => handleAdvanceStatus(activeRouteOrder)}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs uppercase tracking-wider font-mono-code flex items-center gap-2 shadow-lg active:scale-[0.99] transition-all"
                    >
                      {activeRouteOrder.status === 'PLACED' || activeRouteOrder.status === 'PAYMENT_CONFIRMED' ? (
                        <><span>ACCEPT DISPATCH</span> <ArrowRight className="w-4 h-4" /></>
                      ) : activeRouteOrder.status === 'ACCEPTED' ? (
                        <><span>MARK PACKED</span> <CheckCircle2 className="w-4 h-4" /></>
                      ) : activeRouteOrder.status === 'PREPARING' || activeRouteOrder.status === 'READY' ? (
                        <><span>START ROLLING</span> <Bike className="w-4 h-4" /></>
                      ) : activeRouteOrder.status === 'OUT_FOR_DELIVERY' ? (
                        <><span>MARK ARRIVED</span> <MapPin className="w-4 h-4" /></>
                      ) : activeRouteOrder.status === 'ARRIVING' ? (
                        <><span>COMPLETE DELIVERY</span> <CheckCircle2 className="w-4 h-4" /></>
                      ) : null}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CURRENT CARGO CART LOADOUT */}
      {activeTab === 'CART_LOADOUT' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-white uppercase tracking-wider">
              Bicycle Trailer Inventory Loadout
            </h2>
            <span className="text-xs text-stone-400 font-mono-code">
              {(cartInventory || []).length} SKU categories active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(cartInventory || []).map(prod => (
              <div
                key={prod.id}
                className="p-3.5 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between gap-3 text-xs font-mono-code"
              >
                <div>
                  <div className="text-[10px] text-amber-400 uppercase">{prod.category}</div>
                  <strong className="text-white block font-sans text-sm">{prod.name}</strong>
                  <div className="text-stone-400 text-[11px] mt-0.5">
                    Weight: {prod.weight}g • Cost: ${prod.unit_cost.toFixed(2)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-display font-bold text-amber-400">
                    {prod.inventory_available} in Cart
                  </div>
                  <span className="text-[10px] text-stone-500 block">
                    (Resupply: {prod.inventory_on_hand - prod.inventory_available})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RIDER SHIFT STATS */}
      {activeTab === 'SHIFT_STATS' && (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-base text-white uppercase tracking-wider">
            Shift Performance
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-stone-400 uppercase">Deliveries Today</span>
              <div className="text-2xl font-display font-black text-white">{completedOrders.length}</div>
            </div>
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-stone-400 uppercase">Avg Delivery Time</span>
              <div className="text-2xl font-display font-black text-amber-400">28 MIN</div>
            </div>
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-stone-400 uppercase">SLA &lt;60m Compliance</span>
              <div className="text-2xl font-display font-black text-emerald-400">100%</div>
            </div>
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-stone-400 uppercase">Estimated Miles</span>
              <div className="text-2xl font-display font-black text-sky-400">14.2 mi</div>
            </div>
          </div>
        </div>
      )}

      {/* Problem Modal */}
      {problemModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm">
          <div className="bg-stone-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-4 space-y-3">
            <h3 className="font-display font-bold text-white uppercase">Report Delivery Issue</h3>
            <p className="text-xs text-stone-300 font-mono-code">
              Order {problemModalOrder.order_number} ({problemModalOrder.delivery_address})
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Customer not responding at door, severe snow drift, flat tire..."
              value={problemReason}
              onChange={(e) => setProblemReason(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-white font-mono-code focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setProblemModalOrder(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono-code text-stone-400"
              >
                Cancel
              </button>
              <button
                onClick={handleReportProblem}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono-code"
              >
                Submit Issue to Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
