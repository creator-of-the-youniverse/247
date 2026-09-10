// 247 Manchester NH Route & Geocoding Utilities
// Lightweight coordinate mapping, routing waypoints, and distance calculations

export interface RouteWaypoint {
  lat: number;
  lng: number;
  instruction?: string;
  distanceFromPrevMiles?: number;
}

export interface DeliveryRoute {
  storeCoords: [number, number];
  customerCoords: [number, number];
  riderCoords: [number, number];
  waypoints: [number, number][];
  totalDistanceMiles: number;
  totalDistanceKm: number;
  estimatedBikeMinutes: number;
  carbonSavedGrams: number;
  turnInstructions: { step: number; text: string; distance: string }[];
}

// 247 Base Hub - Elm St & Merrimack St, Downtown Manchester, NH
export const TRADER24_STORE_HUB: {
  name: string;
  address: string;
  coords: [number, number];
} = {
  name: '247 Base Hub',
  address: 'Elm St & Merrimack St, Downtown Manchester, NH 03101',
  coords: [42.9908, -71.4637]
};

// Known Manchester landmarks & address mappings
const KNOWN_MANCHESTER_LOCATIONS: Record<string, [number, number]> = {
  '875 elm': [42.9932, -71.4633],
  'granite': [42.9882, -71.4658],
  'canal': [42.9882, -71.4658],
  '320 mcgregor': [42.9985, -71.4740],
  '195 mcgregor': [42.9942, -71.4735],
  '100 mcgregor': [42.9912, -71.4728],
  '540 chestnut': [42.9948, -71.4598],
  '405 pine': [42.9926, -71.4587],
  '40 pine': [42.9865, -71.4590],
  '293 wilson': [42.9818, -71.4485],
  '199 manchester': [42.9910, -71.4560],
  'amherst': [42.9920, -71.4550],
  'bridge': [42.9950, -71.4630],
  'commercial': [42.9915, -71.4675],
  'willow': [42.9805, -71.4580],
  'valley': [42.9785, -71.4550]
};

/**
 * Calculates straight-line Haversine distance in miles between two coordinates
 */
export function calculateDistanceMiles(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves a delivery address string to coordinates in Manchester, NH.
 * If address contains a known landmark/street, uses verified point.
 * Otherwise, deterministically hashes the address within downtown Manchester bounds.
 */
export function resolveManchesterCoordinates(address: string): [number, number] {
  if (!address) return [42.9932, -71.4633];

  const lower = address.toLowerCase();

  for (const [key, coords] of Object.entries(KNOWN_MANCHESTER_LOCATIONS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  // Deterministic fallback inside Manchester delivery perimeter
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const normalizedHash = Math.abs(hash);

  // Bounds: Lat ~42.9820 to 42.9990, Lng ~-71.4720 to -71.4520
  const latOffset = (normalizedHash % 170) / 10000;
  const lngOffset = ((normalizedHash >> 4) % 200) / 10000;

  return [42.9820 + latOffset, -71.4720 + lngOffset];
}

/**
 * Builds realistic bike courier street-grid waypoints between store and customer drop-off.
 * Generates navigational turns respecting Manchester's north-south avenues (Elm, Canal, Chestnut, Pine)
 * and east-west cross streets (Granite, Merrimack, Hanover, Amherst, Bridge).
 */
export function buildDeliveryRoute(
  storeCoords: [number, number] = TRADER24_STORE_HUB.coords,
  customerCoords: [number, number],
  riderProgressPercent = 0.45 // 0 = at store, 1 = at customer
): DeliveryRoute {
  const [storeLat, storeLng] = storeCoords;
  const [destLat, destLng] = customerCoords;

  const waypoints: [number, number][] = [];
  waypoints.push([storeLat, storeLng]);

  // Turn 1: Ride north or south along Elm Street corridor
  const intermediateLat = storeLat + (destLat - storeLat) * 0.55;
  waypoints.push([intermediateLat, storeLng]);

  // If destination is on West Side (across Merrimack river, west of -71.468)
  if (destLng < -71.468 && storeLng > -71.468) {
    // Cross via Granite St Bridge or Notre Dame Bridge
    const bridgeLat = destLat > 42.992 ? 42.9945 : 42.9880;
    waypoints.push([bridgeLat, -71.4660]);
    waypoints.push([bridgeLat, -71.4715]);
  } else if (destLng > -71.460 && storeLng < -71.460) {
    // Cross east to Chestnut or Pine St
    const crossStreetLat = intermediateLat;
    waypoints.push([crossStreetLat, destLng]);
  } else {
    // Dogleg street turn
    waypoints.push([intermediateLat, destLng]);
  }

  // Final destination
  waypoints.push([destLat, destLng]);

  // Calculate cumulative distance along path
  let totalDistanceMiles = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistanceMiles += calculateDistanceMiles(waypoints[i], waypoints[i + 1]);
  }
  // Realistic road factor (1.15x straight segments for urban turns and crosswalks)
  totalDistanceMiles = Math.max(0.4, Number((totalDistanceMiles * 1.15).toFixed(2)));
  const totalDistanceKm = Number((totalDistanceMiles * 1.60934).toFixed(2));

  // Bike courier speed: ~11-13 mph average including stoplights
  const estimatedBikeMinutes = Math.max(3, Math.round((totalDistanceMiles / 12) * 60));

  // Environmental impact: ~280g CO2 saved per mile compared to delivery van
  const carbonSavedGrams = Math.round(totalDistanceMiles * 285);

  // Compute rider position along waypoint segments
  const riderCoords = interpolatePointAlongPath(waypoints, riderProgressPercent);

  // Generate Turn-by-Turn Instructions
  const turnInstructions = [
    {
      step: 1,
      text: 'Depart 247 Base Hub (Elm & Merrimack) heading towards delivery zone',
      distance: '0.1 mi'
    },
    {
      step: 2,
      text: destLat >= storeLat 
        ? 'Roll north on Elm St cycling lane past City Hall' 
        : 'Roll south on Elm St corridor towards Granite St',
      distance: `${(totalDistanceMiles * 0.4).toFixed(1)} mi`
    },
    {
      step: 3,
      text: destLng < -71.468 
        ? 'Cross Merrimack River bridge with cargo trailer into West Side'
        : 'Turn east towards delivery avenue, watch for curb ramps',
      distance: `${(totalDistanceMiles * 0.3).toFixed(1)} mi`
    },
    {
      step: 4,
      text: 'Approach destination drop-off point, secure cargo bike kickstand',
      distance: `${(totalDistanceMiles * 0.2).toFixed(1)} mi`
    },
    {
      step: 5,
      text: 'Handover items to customer (check 21+ ID if age-restricted)',
      distance: 'Arrival'
    }
  ];

  return {
    storeCoords,
    customerCoords,
    riderCoords,
    waypoints,
    totalDistanceMiles,
    totalDistanceKm,
    estimatedBikeMinutes,
    carbonSavedGrams,
    turnInstructions
  };
}

/**
 * Interpolates a coordinate along a multi-segment polyline path based on 0-1 progress
 */
export function interpolatePointAlongPath(
  waypoints: [number, number][],
  progressRatio: number
): [number, number] {
  if (waypoints.length === 0) return [42.9908, -71.4637];
  if (waypoints.length === 1 || progressRatio <= 0) return waypoints[0];
  if (progressRatio >= 1) return waypoints[waypoints.length - 1];

  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = calculateDistanceMiles(waypoints[i], waypoints[i + 1]);
    segmentLengths.push(d);
    totalLength += d;
  }

  if (totalLength === 0) return waypoints[0];

  const targetDist = totalLength * progressRatio;
  let accumulatedDist = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulatedDist + segLen >= targetDist) {
      const segProgress = (targetDist - accumulatedDist) / segLen;
      const [lat1, lng1] = waypoints[i];
      const [lat2, lng2] = waypoints[i + 1];
      return [
        lat1 + (lat2 - lat1) * segProgress,
        lng1 + (lng2 - lng1) * segProgress
      ];
    }
    accumulatedDist += segLen;
  }

  return waypoints[waypoints.length - 1];
}
