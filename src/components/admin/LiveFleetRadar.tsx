import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../../context/StoreContext';
import { useLiveLocations } from '../../context/LiveLocationContext';
import { Order, LiveLocation } from '../../types';
import {
  HUB_247_STORE,
  resolveManchesterCoordinates,
  calculateDistanceMiles,
  CARTO_TILE_URLS,
  CARTO_ATTRIBUTION,
  OSM_ATTRIBUTION
} from '../../utils/mapRouteUtils';
import {
  Radio,
  Bike,
  MapPin,
  Compass,
  Zap,
  Battery,
  Send,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  Layers,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Crosshair
} from 'lucide-react';

export const LiveFleetRadar: React.FC = () => {
  const { orders, riders, demoMode } = useStore();
  const {
    locations,
    connectionStatus,
    updateLocation,
    resetDemoLocations,
    sendDispatchPing,
    latestPing,
    clearLatestPing,
    lastSyncTime
  } = useLiveLocations();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [selectedRiderId, setSelectedRiderId] = useState<string | null>('rider-01');
  const [mapTheme, setMapTheme] = useState<'DARK_TACTICAL' | 'DAY_STREETS'>('DARK_TACTICAL');
  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false);
  const [pingMessage, setPingMessage] = useState<string>('');
  const [pingSuccessToast, setPingSuccessToast] = useState<string | null>(null);

  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  }, [orders]);

  // Leaflet Tile Layers
  const TILE_URLS = {
    DARK_TACTICAL: CARTO_TILE_URLS.DARK_TACTICAL,
    DAY_STREETS: CARTO_TILE_URLS.DAY_STREETS
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [42.9915, -71.4635],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution to bottom left
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

      const tileLayer = L.tileLayer(TILE_URLS[mapTheme], {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: mapTheme === 'DARK_TACTICAL' ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION
      }).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      layersGroupRef.current = layersGroup;

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layersGroupRef.current = null;
      }
    };
  }, []);

  // Update Tile theme if switched
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    L.tileLayer(TILE_URLS[mapTheme], {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: mapTheme === 'DARK_TACTICAL' ? CARTO_ATTRIBUTION : OSM_ATTRIBUTION
    }).addTo(map);
  }, [mapTheme]);

  // Render Markers and Paths whenever locations or activeOrders change
  useEffect(() => {
    const group = layersGroupRef.current;
    if (!group) return;
    group.clearLayers();

    // 1. Service perimeter circle (3-mile radius around Base Hub)
    L.circle(HUB_247_STORE.coords, {
      radius: 4800, // ~3 miles in meters
      color: '#f59e0b',
      weight: 1,
      dashArray: '8, 8',
      fillColor: '#f59e0b',
      fillOpacity: 0.02,
      interactive: false
    }).addTo(group);

    // 2. Base Hub marker
    const hubIcon = L.divIcon({
      className: 'custom-hub-icon',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-10 h-10 rounded-full bg-amber-500/25 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-xl bg-stone-950 border-2 border-amber-400 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] uppercase tracking-wider font-mono shadow whitespace-nowrap">
            247 BASE HUB
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const hubMarker = L.marker(HUB_247_STORE.coords, { icon: hubIcon, zIndexOffset: 700 }).addTo(group);
    hubMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; padding: 4px;">
        <strong style="color: #d97706; display: block;">247 BASE HUB</strong>
        <div>${HUB_247_STORE.address}</div>
        <div style="color: #6b7280; margin-top: 4px;">Inventory & Fleet Dispatch HQ</div>
      </div>
    `);

    // 3. Active Customer Drop-Off Markers
    activeOrders.forEach(order => {
      const dropCoords = resolveManchesterCoordinates(order.delivery_address);

      const dropIcon = L.divIcon({
        className: 'custom-order-pin',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute w-9 h-9 rounded-full bg-emerald-500/20 animate-pulse"></div>
            <div class="relative w-7 h-7 rounded-full bg-emerald-500 border-2 border-white text-stone-950 flex items-center justify-center shadow-lg">
              <span class="text-[10px] font-mono font-bold">${order.order_number.slice(-2)}</span>
            </div>
            <div class="absolute -bottom-4 px-1.5 py-0.5 rounded bg-stone-900 border border-emerald-500/80 text-emerald-300 font-mono text-[8px] whitespace-nowrap">
              ${order.order_number}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const dropMarker = L.marker(dropCoords, { icon: dropIcon, zIndexOffset: 800 }).addTo(group);
      dropMarker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; padding: 4px;">
          <strong style="color: #059669; display: block;">${order.order_number} • ${order.customer_name}</strong>
          <div>${order.delivery_address}</div>
          <div style="color: #d97706; font-weight: bold; margin-top: 4px;">STATUS: ${order.status.replace(/_/g, ' ')}</div>
          <div style="color: #6b7280;">Items: ${order.items.length} | Total: $${order.total.toFixed(2)}</div>
        </div>
      `);
    });

    // 4. Live Courier / Rider Markers
    Object.values(locations).forEach(loc => {
      if (loc.role !== 'RIDER') return;

      const isSelected = selectedRiderId === loc.id;
      const speedText = loc.speed_mph ? `${loc.speed_mph} MPH` : 'IDLE';
      const headingDeg = loc.heading || 0;
      const isDelivering = loc.status === 'DELIVERING';

      const riderIcon = L.divIcon({
        className: 'custom-live-rider-icon',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <div class="absolute w-12 h-12 rounded-full ${isSelected ? 'bg-amber-400/40 animate-ping' : 'bg-amber-400/20'}"></div>
            <div class="relative w-9 h-9 rounded-xl ${isSelected ? 'bg-amber-500 text-stone-950 ring-2 ring-white' : 'bg-stone-950 text-amber-400 border-2 border-amber-500'} flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="18.5" cy="17.5" r="3.5"></circle>
                <circle cx="5.5" cy="17.5" r="3.5"></circle>
                <circle cx="15" cy="5" r="1"></circle>
                <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
              </svg>
            </div>
            <!-- Heading Needle -->
            <div class="absolute -top-3.5 w-3 h-3 flex items-center justify-center" style="transform: rotate(${headingDeg}deg);">
              <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-amber-400"></div>
            </div>
            <!-- Speed badge -->
            <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] uppercase tracking-wider font-mono shadow whitespace-nowrap flex items-center gap-1">
              <span>${loc.name.split(' ')[0]}</span>
              <span class="opacity-75">(${speedText})</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: riderIcon, zIndexOffset: 1000 }).addTo(group);

      marker.on('click', () => {
        setSelectedRiderId(loc.id);
      });

      marker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; padding: 4px;">
          <strong style="color: #d97706; display: block; font-size: 12px;">${loc.name}</strong>
          <div style="color: #1c1917; margin-top: 2px;">Status: <strong>${loc.status || 'ACTIVE'}</strong></div>
          <div style="color: #059669; font-weight: bold; margin-top: 2px;">Speed: ${speedText}</div>
          <div style="color: #6b7280;">Battery: ${loc.battery_level || 90}% | Heading: ${headingDeg}°</div>
          <div style="color: #6b7280;">GPS Accuracy: ±${loc.accuracy_meters || 4}m</div>
          ${loc.is_real_device ? '<div style="color: #2563eb; font-weight: bold; margin-top: 3px;">📡 REAL HARDWARE GPS STREAM</div>' : '<div style="color: #78716c; margin-top: 3px;">Simulation Mesh Node</div>'}
        </div>
      `);

      // 5. Connecting line between rider and their destination (if delivering)
      if (isDelivering && activeOrders.length > 0) {
        const assignedOrder = activeOrders.find(o => o.assigned_rider_id === loc.id) || activeOrders[0];
        if (assignedOrder) {
          const destCoords = resolveManchesterCoordinates(assignedOrder.delivery_address);
          L.polyline([[loc.latitude, loc.longitude], destCoords], {
            color: '#f59e0b',
            weight: 2,
            dashArray: '6, 6',
            opacity: 0.65
          }).addTo(group);
        }
      }
    });

    // 6. Live Customer Device Markers (if any customer is broadcasting)
    Object.values(locations).forEach(loc => {
      if (loc.role === 'CUSTOMER') {
        const custIcon = L.divIcon({
          className: 'custom-live-customer-icon',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
              <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
              <div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white text-white flex items-center justify-center shadow-lg">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <circle cx="12" cy="12" r="8"></circle>
                </svg>
              </div>
              <div class="absolute -bottom-4 px-1 rounded bg-blue-900 border border-blue-400 text-blue-200 font-mono text-[8px] whitespace-nowrap">
                Live Customer
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const custMarker = L.marker([loc.latitude, loc.longitude], { icon: custIcon, zIndexOffset: 950 }).addTo(group);
        custMarker.bindPopup(`
          <div style="font-family: monospace; font-size: 11px;">
            <strong style="color: #2563eb;">Customer Live GPS</strong>
            <div>Device waiting at coordinate location</div>
          </div>
        `);
      }
    });

  }, [locations, activeOrders, selectedRiderId]);

  // Center camera on a specific rider
  const handleCenterRider = (riderId: string) => {
    setSelectedRiderId(riderId);
    const loc = locations[riderId];
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.setView([loc.latitude, loc.longitude], 16, { animate: true });
    }
  };

  // Center camera to fit all participants
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [HUB_247_STORE.coords];
    Object.values(locations).forEach(loc => {
      points.push([loc.latitude, loc.longitude]);
    });
    activeOrders.forEach(o => {
      points.push(resolveManchesterCoordinates(o.delivery_address));
    });

    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16 });
    }
  };

  // Dispatch ping form submit
  const handleSendPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingMessage.trim()) return;

    await sendDispatchPing('Fleet Command Broadcast', pingMessage.trim(), selectedRiderId || undefined);
    setPingSuccessToast(`Broadcast dispatched to ${selectedRiderId || 'all units'}: "${pingMessage.trim()}"`);
    setPingMessage('');
    setTimeout(() => {
      setPingSuccessToast(null);
    }, 4000);
  };

  // Simulate continuous fleet motion loop for demonstration across devices
  useEffect(() => {
    if (!isSimulatingMovement) return;

    let step = 0;
    // Route waypoints along Elm St and Granite St for rider-01 and rider-02
    const path01: [number, number, number][] = [
      [42.9908, -71.4637, 45],
      [42.9920, -71.4635, 10],
      [42.9935, -71.4632, 15],
      [42.9948, -71.4630, 20],
      [42.9942, -71.4610, 110],
      [42.9930, -71.4600, 160],
      [42.9915, -71.4615, 210],
      [42.9908, -71.4637, 240]
    ];

    const path02: [number, number, number][] = [
      [42.9882, -71.4658, 270],
      [42.9890, -71.4690, 290],
      [42.9912, -71.4728, 315],
      [42.9940, -71.4735, 10],
      [42.9930, -71.4700, 120],
      [42.9900, -71.4670, 140],
      [42.9882, -71.4658, 180]
    ];

    const interval = window.setInterval(async () => {
      step++;
      const p1 = path01[step % path01.length];
      const p2 = path02[step % path02.length];

      await updateLocation({
        id: 'rider-01',
        role: 'RIDER',
        name: 'Alex "Spoke" Vance (Cargo #1)',
        latitude: p1[0],
        longitude: p1[1],
        heading: p1[2],
        speed_mph: 12.8,
        accuracy_meters: 3.5,
        battery_level: 86,
        status: 'DELIVERING',
        order_number: 'TR-9825',
        is_real_device: false
      });

      await updateLocation({
        id: 'rider-02',
        role: 'RIDER',
        name: 'Marcus Cole (Cargo #2)',
        latitude: p2[0],
        longitude: p2[1],
        heading: p2[2],
        speed_mph: 14.1,
        accuracy_meters: 4.2,
        battery_level: 93,
        status: 'ONLINE',
        is_real_device: false
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulatingMovement, updateLocation]);

  const activeRiderLocs = Object.values(locations).filter(l => l.role === 'RIDER');

  return (
    <div className="space-y-4">
      {/* Top Tactical Status Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white font-mono uppercase tracking-wide">
                247 Live Shared Fleet Radar
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                connectionStatus === 'polling' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {connectionStatus === 'connected' ? '⚡ WEBSOCKET CONNECTED' :
                 connectionStatus === 'polling' ? '🔄 HTTP FALLBACK POLLING' :
                 'DISCONNECTED'}
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Real-time synchronized GPS telemetry across rider smartphones, customer devices & dispatch
            </p>
          </div>
        </div>

        {/* Quick Map Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {demoMode && (
            <>
              <button
                onClick={() => setIsSimulatingMovement(!isSimulatingMovement)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isSimulatingMovement
                    ? 'bg-rose-500 text-stone-950 animate-pulse'
                    : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-amber-500/40'
                }`}
                title="Simulate continuous fleet movement across connected devices"
              >
                {isSimulatingMovement ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSimulatingMovement ? 'Pause Fleet Simulation' : 'Simulate Fleet Motion'}</span>
              </button>

              <button
                onClick={resetDemoLocations}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-mono text-xs flex items-center gap-1.5"
                title="Reset rider coordinates to Base Hub defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Pins</span>
              </button>
            </>
          )}

          <button
            onClick={handleFitAll}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-mono text-xs flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>Fit All Units</span>
          </button>

          <button
            onClick={() => setMapTheme(mapTheme === 'DARK_TACTICAL' ? 'DAY_STREETS' : 'DARK_TACTICAL')}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-mono text-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapTheme === 'DARK_TACTICAL' ? 'Tactical Dark' : 'Day Streets'}</span>
          </button>
        </div>
      </div>

      {/* Broadcast Ping Notification Banner (if any received) */}
      {latestPing && (
        <div className="bg-amber-950/80 border border-amber-500 rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{latestPing.title}:</strong> "{latestPing.message}" ({new Date(latestPing.time).toLocaleTimeString()})
            </span>
          </div>
          <button
            onClick={clearLatestPing}
            className="text-stone-400 hover:text-white text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {pingSuccessToast && (
        <div className="bg-emerald-950/80 border border-emerald-500 rounded-xl p-3 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{pingSuccessToast}</span>
        </div>
      )}

      {/* Main Map & Telemetry Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar Map Container (Left 2 cols) */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-900 flex flex-col min-h-[540px]">
          {/* Map Viewport */}
          <div ref={mapContainerRef} className="w-full flex-1 min-h-[500px] z-0" />

          {/* Bottom Floating Bar */}
          <div className="absolute bottom-3 left-3 right-3 bg-stone-950/90 backdrop-blur-md border border-stone-800 rounded-xl p-2.5 z-[1000] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-stone-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <strong>{activeRiderLocs.length}</strong> Couriers Active
              </span>
              <span className="text-stone-600">•</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                <strong>{activeOrders.length}</strong> Pending Drops
              </span>
            </div>

            <div className="text-[11px] text-stone-400 flex items-center gap-2">
              <span>Manchester Perimeter: 4.5 mi radius</span>
              {lastSyncTime && (
                <span className="text-stone-500 hidden sm:inline">
                  Last Sync: {new Date(lastSyncTime).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Courier Telemetry Sidebar (Right 1 col) */}
        <div className="space-y-4">
          {/* Active Fleet List */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-mono text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-amber-400" />
                Bicycle Courier Fleet
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                {activeRiderLocs.length} Transmitters
              </span>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {activeRiderLocs.map(riderLoc => {
                const isSelected = selectedRiderId === riderLoc.id;
                const distanceToHub = calculateDistanceMiles(
                  [riderLoc.latitude, riderLoc.longitude],
                  HUB_247_STORE.coords
                ).toFixed(2);

                return (
                  <div
                    key={riderLoc.id}
                    onClick={() => handleCenterRider(riderLoc.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {riderLoc.id.slice(-2)}
                        </div>
                        <div>
                          <div className="font-mono text-xs font-bold text-white">
                            {riderLoc.name}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {riderLoc.status || 'ONLINE'} • {distanceToHub} mi from Base Hub
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono font-extrabold text-amber-400">
                        {riderLoc.speed_mph ? `${riderLoc.speed_mph} MPH` : '0 MPH'}
                      </span>
                    </div>

                    {/* Telemetry row */}
                    <div className="mt-2.5 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-400" />
                        {riderLoc.battery_level || 90}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-sky-400" />
                        {riderLoc.heading || 0}°
                      </span>
                      <span className="text-stone-500">
                        {riderLoc.latitude.toFixed(4)}, {riderLoc.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Broadcast Dispatch Alert Console */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <span className="font-mono text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-4 h-4 text-amber-400" />
              Dispatch Real-Time Alert
            </span>

            <form onSubmit={handleSendPing} className="space-y-2">
              <div>
                <label className="text-[10px] font-mono text-stone-400 block mb-1">
                  Target Recipient:
                </label>
                <select
                  value={selectedRiderId || ''}
                  onChange={e => setSelectedRiderId(e.target.value || null)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Broadcast to All Connected Units</option>
                  {activeRiderLocs.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 block mb-1">
                  Alert Message:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pingMessage}
                    onChange={e => setPingMessage(e.target.value)}
                    placeholder="e.g. Traffic on Elm St, use Canal St route"
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!pingMessage.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-mono font-bold text-xs transition-colors shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  'Priority order placed nearby',
                  'Heavy pedestrian zone on Elm St',
                  'Return to Hub for high-volume resupply'
                ].map((quickText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPingMessage(quickText)}
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-stone-950 hover:bg-stone-800 text-stone-400 border border-stone-800"
                  >
                    + {quickText}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
