import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Order } from '../../types';
import { 
  TRADER24_STORE_HUB, 
  resolveManchesterCoordinates, 
  buildDeliveryRoute, 
  calculateDistanceMiles,
  DeliveryRoute 
} from '../../utils/mapRouteUtils';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Layers, 
  Maximize2, 
  Clock, 
  ExternalLink, 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  CheckCircle2, 
  Phone, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Sparkles
} from 'lucide-react';

interface DeliveryRouteMapProps {
  order?: Order | null;
  allActiveOrders?: Order[];
  onSelectOrder?: (order: Order) => void;
  className?: string;
  initialCollapsedTurns?: boolean;
}

type MapTheme = 'DARK_TACTICAL' | 'DAY_STREETS' | 'VOYAGER';

const TILE_LAYERS: Record<MapTheme, { name: string; url: string; attribution: string }> = {
  DARK_TACTICAL: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>'
  },
  DAY_STREETS: {
    name: 'Day Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
  },
  VOYAGER: {
    name: 'High Contrast',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>'
  }
};

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  order,
  allActiveOrders = [],
  onSelectOrder,
  className = '',
  initialCollapsedTurns = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeTheme, setActiveTheme] = useState<MapTheme>('DARK_TACTICAL');
  const [showTurns, setShowTurns] = useState(!initialCollapsedTurns);
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0.45); // 0 to 1
  const animFrameRef = useRef<number | null>(null);

  // Determine initial progress based on order status if not manually simulating
  const defaultProgress = useMemo(() => {
    if (!order) return 0.45;
    if (order.status === 'PLACED' || order.status === 'ACCEPTED' || order.status === 'PREPARING') return 0.05;
    if (order.status === 'READY') return 0.15;
    if (order.status === 'OUT_FOR_DELIVERY') return 0.55;
    if (order.status === 'ARRIVING') return 0.90;
    if (order.status === 'DELIVERED') return 1.0;
    return 0.45;
  }, [order?.status]);

  // Set default progress when order status changes and simulation is inactive
  useEffect(() => {
    if (!simulationActive) {
      setSimulationProgress(defaultProgress);
    }
  }, [defaultProgress, simulationActive]);

  // Resolve Customer Destination Coordinates
  const customerCoords = useMemo<[number, number]>(() => {
    if (order?.delivery_address) {
      return resolveManchesterCoordinates(order.delivery_address);
    }
    return [42.9932, -71.4633]; // Default Downtown Manchester (875 Elm St)
  }, [order?.delivery_address]);

  // Compute Full Route Geometry & Navigation Data
  const routeData: DeliveryRoute = useMemo(() => {
    return buildDeliveryRoute(
      TRADER24_STORE_HUB.coords,
      customerCoords,
      simulationProgress
    );
  }, [customerCoords, simulationProgress]);

  // Simulation Animation Loop
  useEffect(() => {
    if (!simulationActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setSimulationProgress(prev => {
        // Full route in approx 25 seconds for smooth preview loop
        const next = prev + (deltaSeconds / 25);
        if (next >= 1) {
          return 0; // loop back to start
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simulationActive]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [42.9908, -71.4637],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      // Add Zoom Control to bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution to bottom left
      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

      // Initialize Tile Layer
      const initialTile = TILE_LAYERS[activeTheme];
      const tileLayer = L.tileLayer(initialTile.url, {
        attribution: initialTile.attribution,
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Create Layer Group for dynamic markers and paths
      const layersGroup = L.layerGroup().addTo(map);

      tileLayerRef.current = tileLayer;
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;

      // Ensure proper sizing on mount
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    // Attach ResizeObserver to map container for PWA responsive layout and orientation changes
    let resizeTimer: number | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        layersGroupRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newTileConfig = TILE_LAYERS[activeTheme];
    const newTileLayer = L.tileLayer(newTileConfig.url, {
      attribution: newTileConfig.attribution,
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [activeTheme]);

  // Render Markers and Polyline Route Paths
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    // Clear previous vector layers
    group.clearLayers();

    const { storeCoords, riderCoords, waypoints } = routeData;

    // 1. Draw Outer Delivery Zone Perimeter Guide (Subtle Manchester Downtown polygon)
    const downtownBounds: [number, number][] = [
      [42.9995, -71.4690],
      [42.9995, -71.4550],
      [42.9810, -71.4550],
      [42.9810, -71.4720],
      [42.9920, -71.4720]
    ];
    L.polygon(downtownBounds, {
      color: '#d97706',
      weight: 1,
      dashArray: '4, 6',
      fillColor: '#f59e0b',
      fillOpacity: 0.03,
      interactive: false
    }).addTo(group);

    // 2. Full Planned Route (Background glowing dashed track)
    L.polyline(waypoints, {
      color: '#38bdf8',
      weight: 4,
      dashArray: '6, 8',
      opacity: 0.75,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(group);

    // 3. Traveled Segment (Store -> Rider position: solid neon amber line)
    // Find index of waypoint closest to rider
    const passedWaypoints: [number, number][] = [storeCoords];
    for (let i = 1; i < waypoints.length; i++) {
      const wp = waypoints[i];
      // If waypoint is before rider in route sequence
      if (calculateDistanceMiles(storeCoords, wp) <= calculateDistanceMiles(storeCoords, riderCoords)) {
        passedWaypoints.push(wp);
      }
    }
    passedWaypoints.push(riderCoords);

    if (passedWaypoints.length >= 2) {
      // Glow underlay
      L.polyline(passedWaypoints, {
        color: '#f59e0b',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round'
      }).addTo(group);

      // Main traveled line
      L.polyline(passedWaypoints, {
        color: '#f59e0b',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(group);
    }

    // 4. Base Hub Marker (Store)
    const hubIcon = L.divIcon({
      className: 'custom-hub-icon',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-9 h-9 rounded-full bg-amber-500/30 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-xl bg-stone-950 border-2 border-amber-400 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/40">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] uppercase tracking-wider font-mono shadow whitespace-nowrap">
            BASE HUB
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const hubMarker = L.marker(storeCoords, { icon: hubIcon, zIndexOffset: 800 }).addTo(group);
    hubMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #1c1917; padding: 4px;">
        <strong style="color: #d97706; text-transform: uppercase; display: block; margin-bottom: 2px;">24 Base Hub</strong>
        <div>${TRADER24_STORE_HUB.address}</div>
        <div style="color: #78716c; margin-top: 4px;">Central Inventory Resupply & Dispatch</div>
      </div>
    `);

    // 5. Customer Drop-off Marker
    const customerName = order?.customer_name || 'Customer Drop-Off';
    const orderNum = order?.order_number || '#T24-ORDER';
    const address = order?.delivery_address || 'Manchester, NH';

    const dropoffIcon = L.divIcon({
      className: 'custom-dropoff-icon',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-10 h-10 rounded-full bg-emerald-500/20 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-emerald-500 border-2 border-white text-stone-950 flex items-center justify-center shadow-xl">
            <svg class="w-4 h-4 text-stone-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-stone-950 border border-emerald-500 text-emerald-400 font-bold text-[9px] uppercase tracking-wider font-mono shadow whitespace-nowrap">
            DROP-OFF
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const dropoffMarker = L.marker(customerCoords, { icon: dropoffIcon, zIndexOffset: 900 }).addTo(group);
    dropoffMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #1c1917; padding: 4px;">
        <strong style="color: #059669; text-transform: uppercase; display: block; margin-bottom: 2px;">${orderNum} — ${customerName}</strong>
        <div>${address}</div>
        ${order?.delivery_instructions ? `<div style="color: #b45309; margin-top: 4px;">Note: "${order.delivery_instructions}"</div>` : ''}
        <div style="color: #78716c; margin-top: 4px;">Status: <strong>${order?.status?.replace(/_/g, ' ') || 'ACTIVE'}</strong></div>
      </div>
    `);

    // 6. Rider Position Marker (Bicycle Courier Icon)
    const riderSpeed = simulationActive ? '12.6 MPH' : '11.8 MPH';
    const riderIcon = L.divIcon({
      className: 'custom-rider-icon',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
          <div class="absolute w-11 h-11 rounded-full bg-amber-400/25 animate-ping"></div>
          <div class="relative w-9 h-9 rounded-xl bg-stone-950 border-2 border-amber-500 text-amber-400 flex items-center justify-center shadow-2xl">
            <svg class="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="15" cy="5" r="1"></circle>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
          </div>
          <div class="absolute -top-5 px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[9px] uppercase tracking-wider font-mono shadow whitespace-nowrap">
            RIDER (${riderSpeed})
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const riderMarker = L.marker(riderCoords, { icon: riderIcon, zIndexOffset: 1000 }).addTo(group);
    riderMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; color: #1c1917; padding: 4px;">
        <strong style="color: #d97706; text-transform: uppercase; display: block; margin-bottom: 2px;">Cargo Bike 01</strong>
        <div>Unit: Heavy Cargo Trailer (Manchester Central)</div>
        <div style="color: #059669; font-weight: bold; margin-top: 4px;">Speed: ${riderSpeed}</div>
        <div style="color: #78716c; margin-top: 2px;">Distance to Drop: ${(routeData.totalDistanceMiles * (1 - simulationProgress)).toFixed(2)} mi</div>
      </div>
    `);

    // 7. Render other active drop-offs (if multiple orders present) as secondary pins
    if (allActiveOrders.length > 1) {
      allActiveOrders.forEach(otherOrder => {
        if (otherOrder.id === order?.id) return;
        const otherCoords = resolveManchesterCoordinates(otherOrder.delivery_address);
        
        const secondaryIcon = L.divIcon({
          className: 'custom-other-order-icon',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity">
              <div class="w-6 h-6 rounded-full bg-stone-900 border border-stone-600 text-amber-400 flex items-center justify-center shadow">
                <span style="font-size: 9px; font-weight: bold;">${otherOrder.order_number.slice(-2)}</span>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const otherMarker = L.marker(otherCoords, { icon: secondaryIcon, zIndexOffset: 700 }).addTo(group);
        otherMarker.bindPopup(`
          <div style="font-family: monospace; font-size: 11px; color: #1c1917;">
            <strong>${otherOrder.order_number}</strong>: ${otherOrder.customer_name}
            <div>${otherOrder.delivery_address}</div>
          </div>
        `);
        otherMarker.on('click', () => {
          if (onSelectOrder) onSelectOrder(otherOrder);
        });
      });
    }

  }, [routeData, order, allActiveOrders, onSelectOrder, simulationActive, simulationProgress, customerCoords]);

  // Fit bounds to show both Base Hub, Rider, and Customer Drop-off
  const handleFitRouteBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = L.latLngBounds([
      TRADER24_STORE_HUB.coords,
      customerCoords,
      routeData.riderCoords
    ]);

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 16,
      animate: true
    });
  }, [customerCoords, routeData.riderCoords]);

  // Center on Rider position
  const handleCenterOnRider = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(routeData.riderCoords, 16, { animate: true });
  }, [routeData.riderCoords]);

  // Center on Customer Drop-off
  const handleCenterOnDropoff = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(customerCoords, 16, { animate: true });
  }, [customerCoords]);

  // Reset simulation
  const handleResetSimulation = () => {
    setSimulationActive(false);
    setSimulationProgress(defaultProgress);
    handleFitRouteBounds();
  };

  // Trigger initial fitBounds once map is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitRouteBounds();
    }, 350);
    return () => clearTimeout(timer);
  }, [customerCoords, handleFitRouteBounds]);

  // Calculate live telemetry numbers
  const remainingMiles = Math.max(0, Number((routeData.totalDistanceMiles * (1 - simulationProgress)).toFixed(2)));
  const remainingMinutes = Math.max(1, Math.round((remainingMiles / 12) * 60));

  return (
    <div className={`space-y-3 font-mono-code ${className}`}>
      {/* 1. Header & Active Order Switcher */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                  Live Dispatch Route Navigation
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-bold">
                  MANCHESTER, NH
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Store Hub (Elm &amp; Merrimack) &rarr; Customer Drop-off
              </p>
            </div>
          </div>

          {/* Quick theme & reset tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTheme(prev => 
                prev === 'DARK_TACTICAL' ? 'DAY_STREETS' : prev === 'DAY_STREETS' ? 'VOYAGER' : 'DARK_TACTICAL'
              )}
              className="px-2 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white text-[11px] flex items-center gap-1.5 transition-colors"
              title="Toggle Map Style"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{TILE_LAYERS[activeTheme].name}</span>
            </button>

            <button
              onClick={handleFitRouteBounds}
              className="p-1.5 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-colors"
              title="Fit Full Route"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Order Tabs (If rider has multiple active dispatches) */}
        {allActiveOrders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-stone-800/80 pt-2.5">
            <span className="text-[10px] uppercase text-stone-400 shrink-0 font-bold">Orders:</span>
            {allActiveOrders.map(actOrder => {
              const isSelected = actOrder.id === order?.id;
              return (
                <button
                  key={actOrder.id}
                  onClick={() => onSelectOrder && onSelectOrder(actOrder)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  <span>{actOrder.order_number}</span>
                  <span className="text-[10px] opacity-80">({actOrder.customer_name.split(' ')[0]})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Interactive Map Container & Floating Telemetry HUD */}
      <div className="relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-950">
        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Top Telemetry Bar */}
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2">
          {/* Active Delivery Destination Badge */}
          <div className="pointer-events-auto bg-stone-950/90 backdrop-blur-md border border-stone-800 rounded-xl px-3 py-2 shadow-xl flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0 max-w-[200px] sm:max-w-xs">
              <div className="text-white font-bold truncate">
                {order?.customer_name || 'Customer'}
              </div>
              <div className="text-stone-400 text-[10px] truncate">
                {order?.delivery_address || 'Manchester, NH'}
              </div>
            </div>
          </div>

          {/* Real-time Transit Telemetry Pill */}
          <div className="pointer-events-auto bg-stone-950/90 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-2 shadow-xl flex items-center gap-3 text-xs">
            <div>
              <span className="text-[9px] text-stone-400 uppercase block leading-none">Dist Rem</span>
              <span className="font-extrabold text-amber-400 text-sm">{remainingMiles} mi</span>
            </div>
            <div className="w-px h-6 bg-stone-800" />
            <div>
              <span className="text-[9px] text-stone-400 uppercase block leading-none">Bike ETA</span>
              <span className="font-extrabold text-emerald-400 text-sm">~{remainingMinutes}m</span>
            </div>
            <div className="w-px h-6 bg-stone-800" />
            <div>
              <span className="text-[9px] text-stone-400 uppercase block leading-none">Status</span>
              <span className="font-bold text-white text-[11px] uppercase">
                {order?.status?.replace(/_/g, ' ') || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Floating Quick Action Controls (Bottom Left / Bottom Right) */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-stone-950/90 backdrop-blur-md p-1.5 rounded-xl border border-stone-800 shadow-xl">
          <button
            onClick={handleCenterOnRider}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-stone-800 transition-colors"
            title="Locate Rider"
          >
            <Bike className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rider</span>
          </button>

          <button
            onClick={handleCenterOnDropoff}
            className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-stone-800 transition-colors"
            title="Locate Customer Drop-off"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Drop-off</span>
          </button>

          {/* Simulation Toggle */}
          <button
            onClick={() => setSimulationActive(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              simulationActive
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
            }`}
            title="Simulate bicycle movement along route"
          >
            {simulationActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Simulate Route</span>
              </>
            )}
          </button>

          {simulationActive && (
            <button
              onClick={handleResetSimulation}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* External Native Navigation Link (Bottom Center on Mobile) */}
        {order?.delivery_address && (
          <div className="absolute bottom-3 right-12 z-10 hidden sm:block">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${TRADER24_STORE_HUB.coords[0]},${TRADER24_STORE_HUB.coords[1]}&destination=${customerCoords[0]},${customerCoords[1]}&travelmode=bicycling`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-stone-950/90 backdrop-blur-md border border-stone-800 hover:border-amber-500 text-stone-300 hover:text-amber-400 text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all"
            >
              <span>Native GPS</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* 3. Turn-by-Turn Waypoints & Route Details Drawer */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTurns(prev => !prev)}>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
              Bicycle Route Cue Sheet &amp; Turn Waypoints
            </h4>
            <span className="text-[10px] text-stone-400">
              ({routeData.turnInstructions.length} steps • {routeData.totalDistanceMiles} mi total)
            </span>
          </div>

          <button
            type="button"
            className="text-stone-400 hover:text-stone-200 p-1"
          >
            {showTurns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Collapsible Steps list */}
        {showTurns && (
          <div className="pt-2 border-t border-stone-800/80 space-y-2 animate-fadeIn text-xs">
            {routeData.turnInstructions.map(step => (
              <div 
                key={step.step}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {step.step}
                  </div>
                  <span className="text-stone-300 leading-snug">{step.text}</span>
                </div>
                <span className="text-[11px] text-stone-400 font-bold shrink-0 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                  {step.distance}
                </span>
              </div>
            ))}

            {/* Route Environmental & Efficiency Metrics */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 space-y-0.5">
                <span className="text-[10px] text-stone-400 uppercase">Total Distance</span>
                <div className="font-bold text-white text-sm">
                  {routeData.totalDistanceMiles} mi <span className="text-[11px] text-stone-500">({routeData.totalDistanceKm} km)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 space-y-0.5">
                <span className="text-[10px] text-stone-400 uppercase">Avg Cycling ETA</span>
                <div className="font-bold text-amber-400 text-sm">
                  {routeData.estimatedBikeMinutes} mins <span className="text-[10px] text-stone-500">@ 12mph</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-stone-400 uppercase">CO2 Offset vs Van</span>
                <div className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{routeData.carbonSavedGrams}g Saved</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
