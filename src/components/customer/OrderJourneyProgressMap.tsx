import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order } from '../../types';
import { useLiveLocations } from '../../context/LiveLocationContext';
import {
  HUB_247_STORE,
  resolveManchesterCoordinates,
  calculateDistanceMiles,
  buildDeliveryRoute,
  CARTO_TILE_URLS,
  CARTO_ATTRIBUTION,
  OSM_ATTRIBUTION
} from '../../utils/mapRouteUtils';
import {
  Bike,
  MapPin,
  Clock,
  Radio,
  Maximize2,
  Layers,
  Phone,
  Navigation,
  CheckCircle2,
  Zap,
  Battery,
  Compass,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Signal
} from 'lucide-react';

interface OrderJourneyProgressMapProps {
  order: Order;
  className?: string;
  onCallRider?: () => void;
}

type MapTheme = 'DARK_TACTICAL' | 'DAY_STREETS' | 'VOYAGER';

const TILE_LAYERS: Record<MapTheme, { name: string; url: string; attribution: string }> = {
  DARK_TACTICAL: {
    name: 'Tactical Dark',
    url: CARTO_TILE_URLS.DARK_TACTICAL,
    attribution: CARTO_ATTRIBUTION
  },
  DAY_STREETS: {
    name: 'Day Streets',
    url: CARTO_TILE_URLS.DAY_STREETS,
    attribution: OSM_ATTRIBUTION
  },
  VOYAGER: {
    name: 'Voyager Light',
    url: CARTO_TILE_URLS.VOYAGER,
    attribution: CARTO_ATTRIBUTION
  }
};

export const OrderJourneyProgressMap: React.FC<OrderJourneyProgressMapProps> = ({
  order,
  className = '',
  onCallRider
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeTheme, setActiveTheme] = useState<MapTheme>('DARK_TACTICAL');
  const [autoFollowRider, setAutoFollowRider] = useState(false);

  const {
    locations,
    connectionStatus,
    isBroadcasting,
    startBroadcasting,
    stopBroadcasting,
    deviceLocation,
    lastSyncTime,
    peerCount
  } = useLiveLocations();

  // 1. Resolve Assigned Rider Location from Live Mesh or fallback to Hub
  const assignedRiderId = order.assigned_rider_id || 'rider-01';
  const liveRider = locations[assignedRiderId] || locations['rider-01'];

  // Customer destination coordinates
  const customerCoords = useMemo<[number, number]>(() => {
    return resolveManchesterCoordinates(order.delivery_address);
  }, [order.delivery_address]);

  // Store Hub coordinates
  const storeCoords = HUB_247_STORE.coords;

  // Derive Current Rider Coordinates
  const riderCoords: [number, number] = useMemo(() => {
    if (liveRider && typeof liveRider.latitude === 'number' && typeof liveRider.longitude === 'number') {
      return [liveRider.latitude, liveRider.longitude];
    }
    // If rider not yet reporting, position slightly ahead of store
    return [42.9915, -71.4635];
  }, [liveRider]);

  // Compute Route Geometry
  const routeData = useMemo(() => {
    return buildDeliveryRoute(storeCoords, customerCoords, 0.5);
  }, [storeCoords, customerCoords]);

  // Calculate Real-Time Journey Telemetry
  const distanceRemainingMiles = useMemo(() => {
    return calculateDistanceMiles(riderCoords, customerCoords);
  }, [riderCoords, customerCoords]);

  const totalDistanceMiles = useMemo(() => {
    return calculateDistanceMiles(storeCoords, customerCoords) || 1.2;
  }, [storeCoords, customerCoords]);

  // Progress percentage (0% at store, 100% at customer)
  const journeyProgressPercent = useMemo(() => {
    if (order.status === 'DELIVERED') return 100;
    if (order.status === 'PLACED' || order.status === 'ACCEPTED' || order.status === 'PREPARING') return 8;
    if (order.status === 'READY') return 18;

    const completed = totalDistanceMiles - distanceRemainingMiles;
    const pct = Math.round((completed / totalDistanceMiles) * 100);
    return Math.max(15, Math.min(96, pct));
  }, [order.status, totalDistanceMiles, distanceRemainingMiles]);

  // Estimated Arrival Minutes
  const etaMinutes = useMemo(() => {
    if (order.status === 'DELIVERED') return 0;
    if (order.status === 'ARRIVING') return 2;
    const speed = liveRider?.speed_mph && liveRider.speed_mph > 2 ? liveRider.speed_mph : 11.5;
    const mins = Math.round((distanceRemainingMiles / speed) * 60);
    return Math.max(1, mins);
  }, [order.status, liveRider?.speed_mph, distanceRemainingMiles]);

  // Real device GPS vs Simulated
  const isRealDeviceGPS = Boolean(liveRider?.is_real_device);
  const riderSpeedDisplay = liveRider?.speed_mph ? `${liveRider.speed_mph.toFixed(1)} MPH` : '11.8 MPH';
  const riderHeading = liveRider?.heading ?? 45;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [
      (riderCoords[0] + customerCoords[0]) / 2,
      (riderCoords[1] + customerCoords[1]) / 2
    ];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Add attribution to bottom left
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    tileLayerRef.current = L.tileLayer(TILE_LAYERS[activeTheme].url, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: TILE_LAYERS[activeTheme].attribution
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Initial fit bounds
    setTimeout(() => {
      const bounds = L.latLngBounds([storeCoords, riderCoords, customerCoords]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Theme Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(TILE_LAYERS[activeTheme].url, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: TILE_LAYERS[activeTheme].attribution
    }).addTo(map);
  }, [activeTheme]);

  // Redraw All Dynamic Journey Markers, Traveled Trail & Waypoints
  useEffect(() => {
    const group = layersGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // 1. Full Route Planned Corridors (Light dashed underlay)
    if (routeData.waypoints && routeData.waypoints.length > 1) {
      L.polyline(routeData.waypoints, {
        color: '#78716c',
        weight: 4,
        opacity: 0.4,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(group);
    }

    // 2. Traveled Route Segment (Store Hub -> Rider)
    L.polyline([storeCoords, riderCoords], {
      color: '#f59e0b',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(group);

    // Glowing halo under traveled line
    L.polyline([storeCoords, riderCoords], {
      color: '#f59e0b',
      weight: 12,
      opacity: 0.25,
      lineCap: 'round'
    }).addTo(group);

    // 3. Active En Route Segment (Rider -> Customer)
    L.polyline([riderCoords, customerCoords], {
      color: '#10b981',
      weight: 4,
      opacity: 0.85,
      dashArray: '5, 8',
      lineCap: 'round'
    }).addTo(group);

    // 4. Base Hub Marker (Store)
    const hubIcon = L.divIcon({
      className: 'custom-hub-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="w-8 h-8 rounded-xl bg-stone-950 border-2 border-amber-500/80 text-amber-400 flex items-center justify-center shadow-lg">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div class="absolute -bottom-4 px-1 rounded bg-stone-950 text-amber-400 font-mono text-[8px] font-bold border border-stone-800 whitespace-nowrap">
            247 HUB
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const hubMarker = L.marker(storeCoords, { icon: hubIcon, zIndexOffset: 500 }).addTo(group);
    hubMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #1c1917; padding: 2px;">
        <strong style="color: #d97706;">247 Base Hub</strong>
        <div>Order Dispatched & Packed</div>
        <div style="color: #78716c; font-size: 10px;">${HUB_247_STORE.address}</div>
      </div>
    `);

    // 5. Customer Destination Drop-Off Marker
    const customerIcon = L.divIcon({
      className: 'custom-customer-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-12 h-12 rounded-full bg-emerald-500/25 animate-ping"></div>
          <div class="relative w-9 h-9 rounded-full bg-emerald-500 border-2 border-white text-stone-950 flex items-center justify-center shadow-2xl">
            <svg class="w-5 h-5 text-stone-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-stone-950 border border-emerald-500 text-emerald-400 font-bold font-mono text-[9px] shadow whitespace-nowrap">
            YOUR LOCATION
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const customerMarker = L.marker(customerCoords, { icon: customerIcon, zIndexOffset: 800 }).addTo(group);
    customerMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #1c1917; padding: 2px;">
        <strong style="color: #059669;">Delivery Destination</strong>
        <div>${order.delivery_address}</div>
        <div style="color: #6b7280; font-size: 10px;">Recipient: ${order.customer_name}</div>
      </div>
    `);

    // 5b. Customer Shared Live GPS Marker (if broadcasting from device)
    if (isBroadcasting && deviceLocation) {
      const liveDeviceIcon = L.divIcon({
        className: 'custom-live-device',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="absolute w-10 h-10 rounded-full bg-blue-500/40 animate-ping"></div>
            <div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white text-white flex items-center justify-center shadow-lg font-bold font-mono text-[9px]">
              GPS
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const liveDeviceMarker = L.marker([deviceLocation.latitude, deviceLocation.longitude], {
        icon: liveDeviceIcon,
        zIndexOffset: 850
      }).addTo(group);

      liveDeviceMarker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #1c1917;">
          <strong style="color: #2563eb;">Your Live GPS Device</strong>
          <div>Broadcasting to Rider in real-time</div>
          <div>Accuracy: ±${deviceLocation.accuracy ? deviceLocation.accuracy.toFixed(0) : 5}m</div>
        </div>
      `);
    }

    // 6. Live Rider Position Marker
    const riderIcon = L.divIcon({
      className: 'custom-rider-journey-marker',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
          <!-- Animated pulse ring -->
          <div class="absolute w-12 h-12 rounded-full ${isRealDeviceGPS ? 'bg-sky-400/35 animate-ping' : 'bg-amber-400/30 animate-ping'}"></div>
          
          <!-- Courier Bicycle Icon Box -->
          <div class="relative w-10 h-10 rounded-xl ${isRealDeviceGPS ? 'bg-stone-950 border-2 border-sky-400 text-sky-400' : 'bg-stone-950 border-2 border-amber-400 text-amber-400'} flex items-center justify-center shadow-2xl">
            <svg class="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="15" cy="5" r="1"></circle>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
          </div>

          <!-- Rotated Heading Arrow -->
          <div class="absolute -top-3.5 w-3.5 h-3.5 flex items-center justify-center pointer-events-none" style="transform: rotate(${riderHeading}deg);">
            <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] ${isRealDeviceGPS ? 'border-b-sky-400' : 'border-b-amber-400'}"></div>
          </div>

          <!-- Live Speed Pill -->
          <div class="absolute -top-6.5 px-2 py-0.5 rounded ${isRealDeviceGPS ? 'bg-sky-500' : 'bg-amber-500'} text-stone-950 font-mono font-black text-[9px] uppercase tracking-wider shadow whitespace-nowrap">
            ${isRealDeviceGPS ? 'GPS ' : ''}${riderSpeedDisplay}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const riderMarker = L.marker(riderCoords, { icon: riderIcon, zIndexOffset: 1000 }).addTo(group);
    riderMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #1c1917; padding: 4px;">
        <strong style="color: #d97706; text-transform: uppercase; display: block; margin-bottom: 2px;">
          ${liveRider?.name || 'Alex Vance (Cargo #1)'}
        </strong>
        <div>Vehicle: Cargo Bike + Insulated Cooler</div>
        <div style="color: #059669; font-weight: bold; margin-top: 3px;">Speed: ${riderSpeedDisplay} | Heading: ${riderHeading}°</div>
        <div style="color: #2563eb; margin-top: 2px;">Distance Away: ${distanceRemainingMiles.toFixed(2)} mi (~${etaMinutes}m)</div>
        <div style="color: #78716c; margin-top: 2px;">Battery: ${liveRider?.battery_level || 92}% • Mesh Status: ${connectionStatus.toUpperCase()}</div>
      </div>
    `);

    // Auto-follow rider if enabled
    if (autoFollowRider && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(riderCoords, { animate: true, duration: 0.8 });
    }

  }, [
    riderCoords,
    customerCoords,
    storeCoords,
    routeData,
    liveRider,
    isRealDeviceGPS,
    riderSpeedDisplay,
    riderHeading,
    distanceRemainingMiles,
    etaMinutes,
    isBroadcasting,
    deviceLocation,
    autoFollowRider,
    connectionStatus,
    order.delivery_address,
    order.customer_name
  ]);

  // Viewport action helpers
  const handleFitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setAutoFollowRider(false);
    const bounds = L.latLngBounds([storeCoords, riderCoords, customerCoords]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
  }, [storeCoords, riderCoords, customerCoords]);

  const handleCenterRider = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(riderCoords, 16, { animate: true });
    setAutoFollowRider(true);
  }, [riderCoords]);

  const handleCenterCustomer = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setAutoFollowRider(false);
    map.setView(customerCoords, 16, { animate: true });
  }, [customerCoords]);

  return (
    <div className={`space-y-3 font-mono-code ${className}`}>
      {/* 1. Journey Progress Bar & Transit Telemetry HUD */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-4">
        {/* Top Header: Transit State & Live Connection */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Bike className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
                <span>Rider Journey Live Tracker</span>
                {isRealDeviceGPS && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-500/40 font-bold">
                    GPS HARDWARE
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-400">
                {liveRider?.name || 'Alex Vance'} • Cargo Bike Unit #1
              </div>
            </div>
          </div>

          {/* Connection Pill & Mesh Sync */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{connectionStatus === 'connected' ? 'WebSocket Live' : 'Mesh Polling'}</span>
            </span>

            {onCallRider && (
              <button
                onClick={onCallRider}
                className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 text-[11px] flex items-center gap-1.5 transition-colors"
                title="Call Assigned Rider"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Call</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Visual Progress Line from Store Hub to Customer Door */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-stone-400">
            <span className="flex items-center gap-1 text-stone-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Base Hub (Elm St)
            </span>
            <span className="font-extrabold text-amber-400 text-xs">
              {journeyProgressPercent}% OF ROUTE COMPLETED
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <MapPin className="w-3 h-3" />
              Your Address
            </span>
          </div>

          {/* Animated Gradient Transit Bar */}
          <div className="relative w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${journeyProgressPercent}%` }}
            />
          </div>
        </div>

        {/* 3. Real-Time Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <span className="text-[9px] text-stone-400 uppercase block">Distance Away</span>
            <span className="font-extrabold text-amber-400 text-sm">{distanceRemainingMiles.toFixed(2)} mi</span>
          </div>

          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <span className="text-[9px] text-stone-400 uppercase block">Estimated Arrival</span>
            <span className="font-extrabold text-emerald-400 text-sm">~{etaMinutes} min</span>
          </div>

          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <span className="text-[9px] text-stone-400 uppercase block">Courier Speed</span>
            <span className="font-extrabold text-stone-200 text-sm">{riderSpeedDisplay}</span>
          </div>

          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
            <span className="text-[9px] text-stone-400 uppercase block">Bicycle Battery</span>
            <span className="font-extrabold text-stone-300 text-sm flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              {liveRider?.battery_level || 92}%
            </span>
          </div>
        </div>

        {/* 4. Customer Drop-off GPS Broadcast Action Bar */}
        <div className="bg-stone-950/80 p-3 rounded-xl border border-dashed border-stone-700 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isBroadcasting ? 'text-blue-400 animate-pulse' : 'text-stone-400'}`} />
            <div>
              <div className="text-xs font-bold text-white">
                {isBroadcasting ? 'Live Drop-Off GPS Active' : 'Waiting Outside or Porch?'}
              </div>
              <div className="text-[10px] text-stone-400">
                {isBroadcasting
                  ? 'Transmitting your exact smartphone/laptop pin to Alex in real-time'
                  : 'Share your exact live GPS pin so the courier walks right to you'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (isBroadcasting) {
                stopBroadcasting();
              } else {
                startBroadcasting({
                  role: 'CUSTOMER',
                  id: `customer-${order.id}`,
                  name: order.customer_name,
                  orderId: order.id,
                  orderNumber: order.order_number,
                  destinationAddress: order.delivery_address
                });
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
              isBroadcasting
                ? 'bg-blue-600 text-white animate-pulse'
                : 'bg-stone-900 hover:bg-stone-800 text-blue-400 border border-blue-500/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isBroadcasting ? 'Stop Sharing GPS' : 'Share My Live Location'}</span>
          </button>
        </div>
      </div>

      {/* 5. Interactive Map Stage & Floating Controls */}
      <div className="relative w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950">
        {/* Leaflet Mount */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top-Right Quick Theme & Zoom Fit Toolbar */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-stone-950/90 backdrop-blur-md p-1.5 rounded-xl border border-stone-800 shadow-xl">
          <button
            onClick={() =>
              setActiveTheme(prev =>
                prev === 'DARK_TACTICAL' ? 'DAY_STREETS' : prev === 'DAY_STREETS' ? 'VOYAGER' : 'DARK_TACTICAL'
              )
            }
            className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white text-[10px] flex items-center gap-1 border border-stone-800 transition-colors"
            title="Switch Map Theme"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{TILE_LAYERS[activeTheme].name}</span>
          </button>

          <button
            onClick={handleFitAll}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors"
            title="Fit Full Route"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom-Left Quick Center Navigation Actions */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-stone-950/90 backdrop-blur-md p-1.5 rounded-xl border border-stone-800 shadow-xl">
          <button
            onClick={handleCenterRider}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              autoFollowRider
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow'
                : 'bg-stone-900 hover:bg-stone-800 text-amber-400 border-stone-800'
            }`}
            title="Center on Courier"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Follow Courier</span>
          </button>

          <button
            onClick={handleCenterCustomer}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-stone-800 transition-colors"
            title="Center on My Location"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Destination</span>
          </button>
        </div>
      </div>
    </div>
  );
};
