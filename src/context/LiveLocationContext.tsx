import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { LiveLocation, LiveLocationMessage, LocationParticipantRole } from '../types';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BroadcastOptions {
  role?: LocationParticipantRole;
  id?: string;
  name?: string;
  orderId?: string;
  orderNumber?: string;
  destinationAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
}

interface LiveLocationContextType {
  locations: Record<string, LiveLocation>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'polling';
  isBroadcasting: boolean;
  activeBroadcastInfo: BroadcastOptions | null;
  startBroadcasting: (options?: BroadcastOptions) => Promise<boolean>;
  stopBroadcasting: () => void;
  updateLocation: (loc: Partial<LiveLocation> & { id: string; role: LocationParticipantRole; latitude: number; longitude: number }) => Promise<void>;
  resetDemoLocations: () => Promise<void>;
  sendDispatchPing: (title: string, message: string, targetId?: string) => Promise<void>;
  latestPing: { title: string; message: string; targetId?: string; time: string } | null;
  clearLatestPing: () => void;
  dismissPing: () => void;
  deviceLocation: { latitude: number; longitude: number; accuracy?: number } | null;
  requestDeviceLocation: () => Promise<{ latitude: number; longitude: number; accuracy?: number }>;
  lastSyncTime: string | null;
  peerCount: number;
}

const LiveLocationContext = createContext<LiveLocationContextType | undefined>(undefined);

export const LiveLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Record<string, LiveLocation>>({
    'rider-01': {
      id: 'rider-01',
      role: 'RIDER',
      name: 'Alex "Spoke" Vance (Cargo #1)',
      latitude: 42.9908,
      longitude: -71.4637,
      heading: 45,
      speed_mph: 11.5,
      accuracy_meters: 4.0,
      battery_level: 88,
      status: 'DELIVERING',
      order_number: 'TR-9825',
      updated_at: new Date().toISOString(),
      is_real_device: false
    },
    'rider-02': {
      id: 'rider-02',
      role: 'RIDER',
      name: 'Marcus Cole (Cargo #2)',
      latitude: 42.9882,
      longitude: -71.4658,
      heading: 270,
      speed_mph: 13.8,
      accuracy_meters: 5.0,
      battery_level: 94,
      status: 'ONLINE',
      updated_at: new Date().toISOString(),
      is_real_device: false
    }
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'polling'>('connecting');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeBroadcastInfo, setActiveBroadcastInfo] = useState<BroadcastOptions | null>(null);
  const [latestPing, setLatestPing] = useState<{ title: string; message: string; targetId?: string; time: string } | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState(1);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const broadcastOptionsRef = useRef<BroadcastOptions | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    broadcastOptionsRef.current = activeBroadcastInfo;
  }, [activeBroadcastInfo]);

  // Request single device location
  const requestDeviceLocation = useCallback(async (): Promise<{ latitude: number; longitude: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          setDeviceLocation(loc);
          resolve(loc);
        },
        (err) => {
          console.warn('[Geolocation] Error getting current position:', err);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }, []);

  // Update a location in local state, over WebSocket, and REST API
  const updateLocation = useCallback(async (loc: Partial<LiveLocation> & { id: string; role: LocationParticipantRole; latitude: number; longitude: number }) => {
    const nowIso = new Date().toISOString();
    const fullLoc: LiveLocation = {
      id: loc.id,
      role: loc.role,
      name: loc.name || 'Participant',
      latitude: loc.latitude,
      longitude: loc.longitude,
      heading: loc.heading,
      speed_mph: loc.speed_mph,
      accuracy_meters: loc.accuracy_meters,
      altitude: loc.altitude,
      battery_level: loc.battery_level,
      status: loc.status || 'ONLINE',
      order_id: loc.order_id,
      order_number: loc.order_number,
      destination_address: loc.destination_address,
      destination_lat: loc.destination_lat,
      destination_lng: loc.destination_lng,
      updated_at: nowIso,
      is_real_device: loc.is_real_device ?? true
    };

    // 1. Optimistic local update
    setLocations(prev => ({
      ...prev,
      [loc.id]: fullLoc
    }));
    setLastSyncTime(nowIso);

    // 2. Send over WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'LOCATION_UPDATE',
        location: fullLoc,
        timestamp: nowIso
      }));
    } else {
      // 3. Fallback to REST endpoint
      try {
        await fetch('/api/live-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullLoc)
        });
      } catch (err) {
        console.warn('[LiveLocations] REST update fallback error:', err);
      }
    }

    // 4. Also write directly to Firestore for client-side persistence
    try {
      if (db) {
        const docRef = doc(db, 'live_locations', loc.id);
        await setDoc(docRef, fullLoc, { merge: true });
      }
    } catch (e) {
      // Non-blocking
    }
  }, []);

  // Handle Incoming WebSocket Messages
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as LiveLocationMessage;
      if (data.type === 'FULL_SYNC' && data.locations) {
        setLocations(prev => ({
          ...prev,
          ...data.locations
        }));
        setLastSyncTime(new Date().toISOString());
      } else if (data.type === 'LOCATION_BROADCAST' && data.location) {
        setLocations(prev => ({
          ...prev,
          [data.location!.id]: data.location!
        }));
        setLastSyncTime(new Date().toISOString());
      } else if (data.type === 'DISPATCH_PING' && data.payload) {
        setLatestPing(data.payload);
      }
    } catch (err) {
      console.error('[WebSocket] Parse error:', err);
    }
  }, []);

  // Connect WebSocket with Automatic Reconnection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/locations`;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        // Request immediate full sync
        ws.send(JSON.stringify({ type: 'REQUEST_SYNC', timestamp: new Date().toISOString() }));
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;
        // Reconnect after 3 seconds
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Connection issue, switching to polling fallback:', err);
        setConnectionStatus('polling');
      };
    } catch (err) {
      console.warn('[WebSocket] Init failed, using polling fallback:', err);
      setConnectionStatus('polling');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  }, [handleWebSocketMessage]);

  // Initial WebSocket Connect and Firestore Listener setup
  useEffect(() => {
    connectWebSocket();

    // Secondary layer: Firestore onSnapshot listener for live_locations collection
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      if (db) {
        const colRef = collection(db, 'live_locations');
        unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
          const updatedMap: Record<string, LiveLocation> = {};
          snapshot.forEach(docSnap => {
            updatedMap[docSnap.id] = docSnap.data() as LiveLocation;
          });
          if (Object.keys(updatedMap).length > 0) {
            setLocations(prev => ({
              ...prev,
              ...updatedMap
            }));
            setLastSyncTime(new Date().toISOString());
          }
        }, (err) => {
          console.warn('[Firestore] Live locations snapshot error:', err);
        });
      }
    } catch (err) {
      console.warn('[Firestore] Setup error:', err);
    }

    // Polling fallback interval in case WebSocket is blocked in container preview
    const pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch('/api/live-locations');
        if (res.ok) {
          const json = await res.json();
          if (json.locations) {
            setLocations(prev => ({
              ...prev,
              ...json.locations
            }));
            setLastSyncTime(new Date().toISOString());
          }
        }
      } catch (e) {
        // Polling error non-blocking
      }
    }, 4000);

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [connectWebSocket]);

  // Start Real-World GPS Location Broadcasting
  const startBroadcasting = useCallback(async (options?: BroadcastOptions): Promise<boolean> => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported on this device.');
      return false;
    }

    const opts = options || {};
    setActiveBroadcastInfo(opts);
    setIsBroadcasting(true);

    try {
      // Query battery level if supported
      let batteryPct: number | undefined = undefined;
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryPct = Math.round(battery.level * 100);
        } catch (e) {
          // ignore
        }
      }

      // Stop previous watcher if active
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const now = Date.now();
          // Throttle to at most once every 1.5 seconds
          if (now - lastBroadcastTimeRef.current < 1500) {
            return;
          }
          lastBroadcastTimeRef.current = now;

          const currentOpts = broadcastOptionsRef.current || opts;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          const heading = position.coords.heading ?? undefined;
          // speed is in m/s, convert to mph (1 m/s = 2.23694 mph)
          const speedMph = position.coords.speed !== null && position.coords.speed !== undefined
            ? Math.round(position.coords.speed * 2.23694 * 10) / 10
            : undefined;

          setDeviceLocation({ latitude: lat, longitude: lng, accuracy });

          const id = currentOpts.id || 'rider-01';
          const role = currentOpts.role || 'RIDER';

          await updateLocation({
            id,
            role,
            name: currentOpts.name || (role === 'RIDER' ? 'Active Courier Device' : 'Live Customer Device'),
            latitude: lat,
            longitude: lng,
            accuracy_meters: Math.round(accuracy * 10) / 10,
            heading: heading || undefined,
            speed_mph: speedMph,
            battery_level: batteryPct || 92,
            order_id: currentOpts.orderId,
            order_number: currentOpts.orderNumber,
            destination_address: currentOpts.destinationAddress,
            destination_lat: currentOpts.destinationLat,
            destination_lng: currentOpts.destinationLng,
            status: role === 'RIDER' ? 'DELIVERING' : 'WAITING',
            is_real_device: true
          });
        },
        (err) => {
          console.warn('[Geolocation watchPosition error]:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000
        }
      );

      watchIdRef.current = watchId;
      return true;
    } catch (err) {
      console.error('Failed to start GPS broadcasting:', err);
      setIsBroadcasting(false);
      return false;
    }
  }, [updateLocation]);

  // Stop GPS Broadcasting
  const stopBroadcasting = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
    setActiveBroadcastInfo(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Reset Demo Locations
  const resetDemoLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/live-locations/reset-demo', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.locations) {
          setLocations(data.locations);
          setLastSyncTime(new Date().toISOString());
        }
      }
    } catch (err) {
      console.warn('Failed to reset demo locations:', err);
    }
  }, []);

  // Send Dispatch Ping Alert
  const sendDispatchPing = useCallback(async (title: string, message: string, targetId?: string) => {
    const payload = {
      title,
      message,
      targetId,
      time: new Date().toISOString()
    };
    setLatestPing(payload);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DISPATCH_PING',
        payload,
        timestamp: payload.time
      }));
    } else {
      try {
        await fetch('/api/live-locations/dispatch-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const clearLatestPing = useCallback(() => {
    setLatestPing(null);
  }, []);

  return (
    <LiveLocationContext.Provider
      value={{
        locations,
        connectionStatus,
        isBroadcasting,
        activeBroadcastInfo,
        startBroadcasting,
        stopBroadcasting,
        updateLocation,
        resetDemoLocations,
        sendDispatchPing,
        latestPing,
        clearLatestPing,
        dismissPing: clearLatestPing,
        deviceLocation,
        requestDeviceLocation,
        lastSyncTime,
        peerCount: Object.keys(locations).length
      }}
    >
      {children}
    </LiveLocationContext.Provider>
  );
};

export const useLiveLocations = (): LiveLocationContextType => {
  const context = useContext(LiveLocationContext);
  if (!context) {
    throw new Error('useLiveLocations must be used within a LiveLocationProvider');
  }
  return context;
};
