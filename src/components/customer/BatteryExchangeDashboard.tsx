import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { BatteryCapacity, BatteryHub, BatteryReservation } from '../../types';
import {
  BatteryCharging,
  Zap,
  MapPin,
  Clock,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Unlock,
  Bike,
  Navigation,
  RefreshCw,
  Info,
  Timer,
  X
} from 'lucide-react';

const CAPACITY_DETAILS: Record<
  BatteryCapacity,
  { name: string; subtitle: string; iconSize: string; typicalUse: string; color: string }
> = {
  '2000': {
    name: '2,000 mAh',
    subtitle: 'Emergency Pocket Boost',
    iconSize: 'text-emerald-400',
    typicalUse: '1 full smartphone boost (slim credit-card form factor)',
    color: 'from-emerald-500/20 to-emerald-950/20 border-emerald-500/30 text-emerald-400'
  },
  '5000': {
    name: '5,000 mAh',
    subtitle: 'Daily Commuter Pack',
    iconSize: 'text-cyan-400',
    typicalUse: '1.5x phone charges + earbuds (compact pocketable)',
    color: 'from-cyan-500/20 to-cyan-950/20 border-cyan-500/30 text-cyan-400'
  },
  '10000': {
    name: '10,000 mAh',
    subtitle: 'All-Day Dual-Port Workhorse',
    iconSize: 'text-amber-400',
    typicalUse: '2.5x full charges (USB-C Power Delivery 20W)',
    color: 'from-amber-500/20 to-amber-950/20 border-amber-500/30 text-amber-400'
  },
  '20000': {
    name: '20,000 mAh',
    subtitle: 'Heavy-Duty Pro Power Bank',
    iconSize: 'text-purple-400',
    typicalUse: 'Laptop + multi-device fast charge (65W PD compatible)',
    color: 'from-purple-500/20 to-purple-950/20 border-purple-500/30 text-purple-400'
  }
};

interface BatteryExchangeDashboardProps {
  onGoToPasses?: () => void;
}

export const BatteryExchangeDashboard: React.FC<BatteryExchangeDashboardProps> = ({ onGoToPasses }) => {
  const {
    activePass,
    hasBatteryPrivilege,
    batteryHubs,
    batteryReservations,
    reserveBatteryPack,
    cancelBatteryReservation,
    claimBatteryReservation,
    refreshBatteryHubs,
    toggleMemberPass
  } = useStore();

  // Filters & selection state
  const [selectedCapacity, setSelectedCapacity] = useState<BatteryCapacity | 'ALL'>('ALL');
  const [activeReservationModal, setActiveReservationModal] = useState<{
    hub: BatteryHub;
    capacity: BatteryCapacity;
  } | null>(null);

  // Reservation form state inside modal
  const [holdDuration, setHoldDuration] = useState<number>(30);
  const [pickupMode, setPickupMode] = useState<'HUB_WALKUP' | 'COURIER_DISPATCH'>('HUB_WALKUP');
  const [deadPackNotes, setDeadPackNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  // Tick clock for countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    } , 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter hubs
  const filteredHubs = batteryHubs.filter(hub => {
    if (selectedCapacity === 'ALL') return true;
    return (hub.available_packs[selectedCapacity] || 0) > 0;
  });

  // Active reservations
  const activeHolds = batteryReservations.filter(r => r.status === 'ACTIVE');

  // Handle submit reservation
  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReservationModal) return;

    setSubmitting(true);
    try {
      await reserveBatteryPack(activeReservationModal.hub.id, activeReservationModal.capacity, {
        holdDuration,
        pickupMode,
        notes: deadPackNotes || `BYO ${activeReservationModal.capacity} mAh pack ready for exchange`
      });
      setActiveReservationModal(null);
      setDeadPackNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate time remaining formatted
  const formatCountdown = (expiresAtStr: string) => {
    const diff = new Date(expiresAtStr).getTime() - now;
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div id="battery-exchange-dashboard" className="space-y-6">
      {/* Top Banner: BYO Hot-Swap Protocol */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Tesla Hot-Swap Network • Manchester, NH</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BatteryCharging className="w-6 h-6 text-amber-400" />
              Battery Exchange Hubs &amp; Live Availability
            </h2>
            <p className="text-stone-400 text-sm max-w-2xl">
              Bring your depleted battery pack (2,000, 5,000, 10,000, or 20,000 mAh). Hand over dead, get a 100% certified full one from our bicycle couriers or at our 247 Base Hub.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="refresh-hubs-btn"
              onClick={() => refreshBatteryHubs()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
              title="Refresh inventory counts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Hubs</span>
            </button>
            {!hasBatteryPrivilege && (
              <button
                id="activate-tesla-pass-shortcut"
                onClick={() => toggleMemberPass('TESLA')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Join Tesla Pass ($20/mo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Member Status Pill */}
        <div className="mt-4 pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Your Exchange Status:</span>
            {hasBatteryPrivilege ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activePass?.pass_type === 'COMBO' ? 'Trader + Tesla Combined Pass Active' : 'Tesla Pass Active'} • Unlimited Free Swaps
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Info className="w-3.5 h-3.5" />
                Preview Mode (Tesla Pass or Combined Pass required for unlimited swaps)
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-stone-400 font-mono text-xs">
            <span>Network: 4 Active Hubs</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">120 Total Certified Packs Ready</span>
          </div>
        </div>
      </div>

      {/* Active Holds Banner (if any) */}
      {activeHolds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" />
              Active Battery Reservations &amp; Hub Holds ({activeHolds.length})
            </h3>
            <span className="text-xs text-stone-400">Packs held awaiting handover</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeHolds.map(hold => {
              const capInfo = CAPACITY_DETAILS[hold.capacity];
              const isExpired = new Date(hold.expires_at).getTime() <= now;

              return (
                <div
                  key={hold.id}
                  id={`reservation-card-${hold.id}`}
                  className="bg-stone-900 border border-amber-500/30 rounded-xl p-4 shadow-lg relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          {hold.reservation_code}
                        </span>
                        <span className="text-xs text-stone-300 font-medium">{capInfo?.name || hold.capacity} mAh</span>
                      </div>
                      <p className="text-sm font-bold text-white">{hold.hub_name}</p>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-500" />
                        {hold.hub_address}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-lg ${isExpired ? 'bg-red-950/60 border border-red-500/40 text-red-400' : 'bg-amber-950/60 border border-amber-500/40 text-amber-300'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatCountdown(hold.expires_at)}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        {hold.pickup_mode === 'HUB_WALKUP' ? `Hub Station #${hold.locker_bay_number || 1}` : 'Courier Dispatch'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                    <div className="text-xs text-stone-400">
                      <span className="text-stone-300 font-medium">Serial:</span> {hold.pack_serial}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`cancel-res-${hold.id}`}
                        onClick={() => cancelBatteryReservation(hold.id)}
                        className="px-2.5 py-1.5 text-xs text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors border border-transparent hover:border-red-900/40"
                      >
                        Release Hold
                      </button>
                      <button
                        id={`claim-res-${hold.id}`}
                        onClick={() => claimBatteryReservation(hold.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-md"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Confirm Handover &amp; Swap</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacity Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 border border-stone-800 rounded-xl p-3">
        <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Filter by BYO Pack Capacity:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="filter-cap-all"
            onClick={() => setSelectedCapacity('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCapacity === 'ALL'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
            }`}
          >
            All Sizes
          </button>
          {(['2000', '5000', '10000', '20000'] as BatteryCapacity[]).map(cap => (
            <button
              key={cap}
              id={`filter-cap-${cap}`}
              onClick={() => setSelectedCapacity(cap)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCapacity === cap
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-750'
              }`}
            >
              {cap === '2000' && '2,000 mAh'}
              {cap === '5000' && '5,000 mAh'}
              {cap === '10000' && '10,000 mAh'}
              {cap === '20000' && '20,000 mAh'}
            </button>
          ))}
        </div>
      </div>

      {/* Hubs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Manchester Battery Swap Stations ({filteredHubs.length})</span>
          </h3>
          <span className="text-xs text-stone-400">Live bay status updated in real-time</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredHubs.map(hub => {
            return (
              <div
                key={hub.id}
                id={`hub-card-${hub.id}`}
                className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {hub.code}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          24/7 Hot-Swap Active
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">{hub.name}</h4>
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>{hub.address}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-stone-300 bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-700">
                        <Bike className="w-3.5 h-3.5 text-amber-400" />
                        <span>{hub.distance_miles} mi • ~{hub.travel_time_bike_min}m</span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1 font-mono">{hub.zone}</p>
                    </div>
                  </div>

                  {/* Charging Station Diagnostics */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-stone-950/60 rounded-xl border border-stone-800/80 text-xs">
                    <div>
                      <p className="text-[10px] text-stone-500">Ready Packs</p>
                      <p className="font-mono font-bold text-emerald-400 text-sm">{hub.total_available} full</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-500">Active Bays</p>
                      <p className="font-mono font-bold text-stone-200 text-sm">
                        {hub.charging_bays_active}/{hub.charging_bays_total}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-500">Cell Health</p>
                      <p className="font-mono font-bold text-cyan-400 text-sm flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        {hub.bay_voltage_status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Per-Capacity Availability & Reserve Buttons */}
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    Stocked Pack Capacities (Select to Reserve)
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {(['2000', '5000', '10000', '20000'] as BatteryCapacity[]).map(cap => {
                      const count = hub.available_packs[cap] || 0;
                      const capInfo = CAPACITY_DETAILS[cap];
                      const isAvailable = count > 0;
                      const isSelected = selectedCapacity === cap;

                      return (
                        <div
                          key={cap}
                          id={`hub-${hub.id}-cap-${cap}`}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/50'
                              : isAvailable
                              ? 'bg-stone-950/40 border-stone-800 hover:border-stone-700'
                              : 'bg-stone-950/20 border-stone-850 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="font-bold text-xs text-white block">{capInfo.name}</span>
                              <span className="text-[10px] text-stone-400 line-clamp-1">{capInfo.subtitle}</span>
                            </div>
                            <span
                              className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                isAvailable
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-stone-800 text-stone-500'
                              }`}
                            >
                              {count} left
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-stone-500 font-mono">100% test OK</span>
                            <button
                              id={`btn-reserve-${hub.id}-${cap}`}
                              disabled={!isAvailable}
                              onClick={() => {
                                setActiveReservationModal({ hub, capacity: cap });
                              }}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                isAvailable
                                  ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/40'
                                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                              }`}
                            >
                              {isAvailable ? 'Reserve' : 'Depleted'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Express swap with contactless QR/PIN verification
                  </span>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(hub.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" />
                    Map
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reservation Modal Dialog */}
      {activeReservationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-750 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-stone-850 to-stone-900 p-5 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Reserve Battery Pack for Exchange</h3>
                  <p className="text-xs text-stone-400">{activeReservationModal.hub.name}</p>
                </div>
              </div>
              <button
                id="close-reserve-modal-btn"
                onClick={() => setActiveReservationModal(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmReservation} className="p-5 space-y-4 text-xs">
              {/* Selected Specs Box */}
              <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Target Battery Capacity:</span>
                  <span className="font-mono font-bold text-sm text-amber-400">
                    {CAPACITY_DETAILS[activeReservationModal.capacity]?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Hub Location:</span>
                  <span className="text-stone-200 font-medium">{activeReservationModal.hub.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Current Stock at Hub:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {activeReservationModal.hub.available_packs[activeReservationModal.capacity]} packs ready
                  </span>
                </div>
              </div>

              {/* Handover Protocol reminder */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Tesla Pass BYO Swap Protocol
                </p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Bring any depleted battery pack matching this tier. When you arrive at the hub, you will hand over your dead unit at the counter or to a bicycle courier to receive this fully charged unit.
                </p>
              </div>

              {/* Pickup Mode */}
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-300 block">Exchange Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="opt-hub-walkup"
                    onClick={() => setPickupMode('HUB_WALKUP')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      pickupMode === 'HUB_WALKUP'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>247 Base Hub Hold</span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">Walk or bike to hub for direct hand-off.</p>
                  </button>

                  <button
                    type="button"
                    id="opt-courier-dispatch"
                    onClick={() => setPickupMode('COURIER_DISPATCH')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      pickupMode === 'COURIER_DISPATCH'
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Bike className="w-3.5 h-3.5 text-amber-400" />
                      <span>Courier Bring-to-Me</span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">Cargo bike courier pulls pack and rides to you.</p>
                  </button>
                </div>
              </div>

              {/* Hold Duration */}
              {pickupMode === 'HUB_WALKUP' && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-stone-300 block">Hold Duration Guarantee:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[15, 30, 60].map(mins => (
                      <button
                        type="button"
                        key={mins}
                        onClick={() => setHoldDuration(mins)}
                        className={`py-2 rounded-xl border text-center font-mono font-bold transition-all ${
                          holdDuration === mins
                            ? 'bg-stone-800 border-amber-500 text-amber-400'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {mins} Minutes
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dead Pack details */}
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-300 block">
                  Your Dead Pack Brand / Details (Optional):
                </label>
                <input
                  type="text"
                  id="dead-pack-notes-input"
                  placeholder="e.g. Anker 10,000 mAh with USB-C or generic dead power bank"
                  value={deadPackNotes}
                  onChange={e => setDeadPackNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  id="cancel-modal-btn"
                  onClick={() => setActiveReservationModal(null)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-reservation-btn"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Holding Pack...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Lock Reservation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
