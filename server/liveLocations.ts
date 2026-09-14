import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { getFirestoreDb } from './db.js';
import { LiveLocation, LiveLocationMessage } from '../src/types.js';

// In-memory store of currently broadcasted live locations
const activeLocations: Map<string, LiveLocation> = new Map();

// Initialize with default rider positions in Manchester
activeLocations.set('rider-01', {
  id: 'rider-01',
  role: 'RIDER',
  name: 'Alex "Spoke" Vance (Cargo #1)',
  latitude: 42.9908,
  longitude: -71.4637,
  heading: 45,
  speed_mph: 11.5,
  accuracy_meters: 4.2,
  battery_level: 88,
  status: 'DELIVERING',
  order_number: 'TR-9825',
  updated_at: new Date().toISOString(),
  is_real_device: false
});

activeLocations.set('rider-02', {
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
});

let wssInstance: WebSocketServer | null = null;
const connectedClients: Set<WebSocket> = new Set();

/**
 * Broadcasts a message to all connected clients (or all except sender)
 */
export function broadcastLiveMessage(message: LiveLocationMessage, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const client of connectedClients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.error('[WebSocket] Send error to client:', err);
      }
    }
  }
}

/**
 * Returns all active locations as a dictionary
 */
export function getActiveLocationsRecord(): Record<string, LiveLocation> {
  const result: Record<string, LiveLocation> = {};
  for (const [id, loc] of activeLocations.entries()) {
    result[id] = loc;
  }
  return result;
}

/**
 * Updates a live location, stores in memory & Firestore, and broadcasts over WebSocket
 */
export async function updateLiveLocation(location: Partial<LiveLocation> & { id: string; role: LiveLocation['role']; latitude: number; longitude: number }): Promise<LiveLocation> {
  const existing = activeLocations.get(location.id) || {} as LiveLocation;
  
  const updated: LiveLocation = {
    ...existing,
    ...location,
    updated_at: new Date().toISOString()
  };

  activeLocations.set(location.id, updated);

  // Persist asynchronously in Firestore (non-blocking)
  try {
    const db = getFirestoreDb();
    await db.collection('live_locations').doc(location.id).set(updated, { merge: true });

    // If it's a rider, also update the rider document coordinates
    if (location.role === 'RIDER') {
      await db.collection('riders').doc(location.id).set({
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed_mph: location.speed_mph,
        last_location_update: updated.updated_at
      }, { merge: true });
    }

    // If an order_id is associated, update current_rider coordinates on the order
    if (location.order_id) {
      await db.collection('orders').doc(location.order_id).set({
        current_rider_lat: location.latitude,
        current_rider_lng: location.longitude,
        last_tracked_at: updated.updated_at
      }, { merge: true });
    }
  } catch (err) {
    console.warn('[LiveLocations] Firestore async persistence warning:', err);
  }

  // Broadcast to all connected clients
  broadcastLiveMessage({
    type: 'LOCATION_BROADCAST',
    location: updated,
    timestamp: updated.updated_at
  });

  return updated;
}

/**
 * Sets up WebSocket server attached to the HTTP server
 */
export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wssInstance = wss;

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname === '/ws' || url.pathname === '/ws/locations') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      // Let other upgrades proceed or ignore
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    connectedClients.add(ws);
    // Send full current sync immediately upon connect
    const initialSync: LiveLocationMessage = {
      type: 'FULL_SYNC',
      locations: getActiveLocationsRecord(),
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(initialSync));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as LiveLocationMessage;

        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          return;
        }

        if (msg.type === 'REQUEST_SYNC') {
          ws.send(JSON.stringify({
            type: 'FULL_SYNC',
            locations: getActiveLocationsRecord(),
            timestamp: new Date().toISOString()
          }));
          return;
        }

        if (msg.type === 'LOCATION_UPDATE' && msg.location) {
          await updateLiveLocation(msg.location);
        }

        if (msg.type === 'DISPATCH_PING') {
          // Broadcast ping to all (e.g. courier alert or customer proximity notice)
          broadcastLiveMessage(msg);
        }
      } catch (err) {
        console.error('[WebSocket] Failed processing message:', err);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Client error:', err);
      connectedClients.delete(ws);
    });
  });

  return wss;
}

/**
 * Resets rider locations to known Manchester points for simulation/testing
 */
export function resetLiveLocationsDemo(): Record<string, LiveLocation> {
  activeLocations.set('rider-01', {
    id: 'rider-01',
    role: 'RIDER',
    name: 'Alex "Spoke" Vance (Cargo #1)',
    latitude: 42.9908,
    longitude: -71.4637,
    heading: 45,
    speed_mph: 12.0,
    accuracy_meters: 3.5,
    battery_level: 90,
    status: 'DELIVERING',
    order_number: 'TR-9825',
    updated_at: new Date().toISOString(),
    is_real_device: false
  });

  activeLocations.set('rider-02', {
    id: 'rider-02',
    role: 'RIDER',
    name: 'Marcus Cole (Cargo #2)',
    latitude: 42.9882,
    longitude: -71.4658,
    heading: 270,
    speed_mph: 14.5,
    accuracy_meters: 4.8,
    battery_level: 95,
    status: 'ONLINE',
    updated_at: new Date().toISOString(),
    is_real_device: false
  });

  const record = getActiveLocationsRecord();

  broadcastLiveMessage({
    type: 'FULL_SYNC',
    locations: record,
    timestamp: new Date().toISOString()
  });

  return record;
}
