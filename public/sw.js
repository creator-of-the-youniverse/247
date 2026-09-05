// 24 Progressive Web App Service Worker
// Production-grade Service Worker with Stale-While-Revalidate strategy for offline shell & static assets

const CACHE_VERSION = 'trader24-v6';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const TILES_CACHE = `${CACHE_VERSION}-tiles`;
const ALL_CACHES = [SHELL_CACHE, STATIC_CACHE, API_CACHE, TILES_CACHE];

// Maximum cached entries to prevent storage bloat
const MAX_STATIC_ENTRIES = 75;
const MAX_API_ENTRIES = 50;
const MAX_TILES_ENTRIES = 150;

// Core shell assets required for offline app boot
const CORE_APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

// Offline Fallback SVG for broken images when disconnected
const OFFLINE_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
  <rect width="200" height="200" fill="#1c1917"/>
  <circle cx="100" cy="85" r="30" stroke="#78716c" stroke-width="2" stroke-dasharray="4 4" fill="#292524"/>
  <path d="M50 145 L85 110 L115 135 L135 120 L155 145" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="100" y="172" fill="#a8a29e" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">OFFLINE ASSET</text>
</svg>
`.trim();

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Fetch with configurable timeout to mitigate "Lie-Fi" / hanging connections
 */
function fetchWithTimeout(request, timeoutMs = 4500) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // If request is a Request object, clone signal if present or attach our abort signal
    fetch(request, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

/**
 * Validates if response is cacheable (standard 200 or opaque CDN asset)
 */
function isCacheable(response) {
  if (!response) return false;
  // Type 'basic' / 'cors' with status 200, or 'opaque' (status 0) from allowed CDNs
  return response.status === 200 || response.type === 'opaque';
}

/**
 * Limits cache size by removing oldest keys (FIFO)
 */
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const excess = keys.length - maxEntries;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    // Non-critical cache cleanup error
  }
}

// ============================================================================
// LIFECYCLE EVENTS: INSTALL & ACTIVATE
// ============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      
      // Cache core assets safely; don't fail installation if a single asset 404s
      await Promise.allSettled(
        CORE_APP_SHELL.map((url) =>
          shellCache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn(`[SW] Shell precache failed for ${url}:`, err);
          })
        )
      );

      // Immediately activate new service worker without waiting for old tabs to close
      return self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge any outdated caches from previous versions
      const existingCacheKeys = await caches.keys();
      await Promise.all(
        existingCacheKeys.map((key) => {
          if (!key.startsWith('trader24-v6')) {
            console.log(`[SW] Purging outdated cache: ${key}`);
            return caches.delete(key);
          }
        })
      );

      // Claim all clients immediately so navigation is managed right away
      await self.clients.claim();
    })()
  );
});

// ============================================================================
// STRATEGY: STALE-WHILE-REVALIDATE
// ============================================================================

/**
 * Core Stale-While-Revalidate Handler:
 * 1. Checks cache and returns cachedResponse immediately if present.
 * 2. Concurrently fetches from network in background to revalidate & update cache.
 * 3. If NOT in cache, fetches from network, caches result, or falls back to offline resource.
 */
async function handleStaleWhileRevalidate(request, cacheName, fallbackType = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Background network revalidation promise
  const networkFetchPromise = (async () => {
    try {
      // Use resilient timeout for background revalidation
      const networkResponse = await fetchWithTimeout(request, 8000);
      if (isCacheable(networkResponse)) {
        await cache.put(request, networkResponse.clone());
        // Periodic cache pruning
        const maxEntries = cacheName === TILES_CACHE 
          ? MAX_TILES_ENTRIES 
          : cacheName === STATIC_CACHE 
            ? MAX_STATIC_ENTRIES 
            : MAX_API_ENTRIES;
        trimCache(cacheName, maxEntries);
      }
      return networkResponse;
    } catch (networkError) {
      // Network failed during background revalidation; non-fatal if cachedResponse already exists
      return null;
    }
  })();

  // 1. If cached response is available: Return immediately, revalidate asynchronously
  if (cachedResponse) {
    // Fire-and-forget revalidation in background
    networkFetchPromise.catch(() => {});
    return cachedResponse;
  }

  // 2. If NOT cached: Await the network response with fallback
  try {
    const freshNetworkResponse = await networkFetchPromise;
    if (freshNetworkResponse) {
      return freshNetworkResponse;
    }
    throw new Error('Network fetch returned empty response');
  } catch (err) {
    // Network completely unavailable and no cache found: trigger specific fallbacks

    // Navigation fallback -> App Shell
    if (fallbackType === 'navigation') {
      const shellResponse = (await cache.match('/index.html')) || (await cache.match('/'));
      if (shellResponse) {
        return shellResponse;
      }
    }

    // Image fallback -> SVG placeholder
    if (fallbackType === 'image') {
      return new Response(OFFLINE_IMAGE_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store'
        }
      });
    }

    // API fallback -> Structured JSON offline indicator
    if (fallbackType === 'api') {
      return new Response(
        JSON.stringify({
          offline: true,
          message: 'Offline mode active. Using local cached state.',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generic error fallback
    return new Response('Network error occurred and no offline asset is cached.', {
      status: 503,
      statusText: 'Service Unavailable (Offline)'
    });
  }
}

// ============================================================================
// STRATEGY: NAVIGATION (OFFLINE SHELL)
// ============================================================================

/**
 * Handles navigation requests (HTML page loads):
 * Serves cached app shell via Stale-While-Revalidate for instant screen rendering,
 * while updating shell in background.
 */
async function handleNavigationRequest(request) {
  const shellCache = await caches.open(SHELL_CACHE);

  // Check if we have index.html or root in shell cache
  const cachedShell = (await shellCache.match(request)) || 
                      (await shellCache.match('/index.html')) || 
                      (await shellCache.match('/'));

  // Background revalidation
  const backgroundRevalidate = fetchWithTimeout(request, 6000)
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        await shellCache.put(request, networkResponse.clone());
        await shellCache.put('/index.html', networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  // Instant response with cached shell if available
  if (cachedShell) {
    backgroundRevalidate.catch(() => {});
    return cachedShell;
  }

  // If initial load and not yet cached, await network with fallback
  try {
    const freshShell = await backgroundRevalidate;
    if (freshShell) return freshShell;
    throw new Error('Initial shell network request failed');
  } catch (err) {
    // Ultimate fallback if cache is empty and network is down
    return new Response(
      `<!DOCTYPE html>
       <html lang="en" class="h-full bg-stone-950 text-stone-100">
         <head>
           <meta charset="UTF-8"/>
           <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
           <title>24 — Offline</title>
           <style>
             body { margin:0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; background:#0c0a09; color:#f5f5f4; text-align:center; padding:1.5rem; }
             .card { max-width: 400px; padding: 2rem; background: #1c1917; border: 1px solid #44403c; border-radius: 1rem; }
             h1 { font-size: 1.5rem; color: #f59e0b; margin-bottom: 0.5rem; }
             p { color: #a8a29e; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.25rem; }
             button { background: #f59e0b; color: #0c0a09; font-weight: bold; border: none; padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
           </style>
         </head>
         <body>
           <div class="card">
             <h1>24</h1>
             <p>You appear to be offline or on an intermittent connection. Please check your signal and reload.</p>
             <button onclick="window.location.reload()">Retry Connection</button>
           </div>
         </body>
       </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ============================================================================
// STRATEGY: API CALLS WITH RESILIENT CACHE FALLBACK
// ============================================================================

async function handleApiRequest(request) {
  // Non-GET API calls (POST, PUT, DELETE) must pass through to network
  if (request.method !== 'GET') {
    try {
      return await fetch(request);
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Network connection lost. Changes could not be synced.',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // GET API calls: Network-first with short timeout, falling back to cached response or offline JSON
  const apiCache = await caches.open(API_CACHE);

  try {
    // Quick 3.5s network attempt so UI doesn't hang if cellular connection drops
    const networkResponse = await fetchWithTimeout(request, 3500);
    if (networkResponse && networkResponse.status === 200) {
      await apiCache.put(request, networkResponse.clone());
      trimCache(API_CACHE, MAX_API_ENTRIES);
    }
    return networkResponse;
  } catch (err) {
    // Network failed or timed out: Serve cached API data if available
    const cachedResponse = await apiCache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache: return structured offline payload
    return new Response(
      JSON.stringify({
        offline: true,
        message: 'Network offline. Showing cached local store data.',
        items: [],
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ============================================================================
// MAIN FETCH DISPATCHER
// ============================================================================

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Filter out unsupported protocols (chrome-extension, about, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 2. Navigation / Page requests (Offline Shell with Stale-While-Revalidate)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 3. API endpoints (/api/*)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 4. Map Tile requests for Leaflet PWA offline maps (CartoDB, OpenStreetMap)
  const isMapTile = url.hostname.includes('tile.openstreetmap.org') || 
                    url.hostname.includes('basemaps.cartocdn.com') ||
                    url.pathname.includes('/rastertiles/');
  if (isMapTile) {
    event.respondWith(handleStaleWhileRevalidate(request, TILES_CACHE, 'image'));
    return;
  }

  // 5. Bypass dev scripts, hot module reload, Vite internals, and node_modules
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.searchParams.has('import')
  ) {
    return; // Pass through directly to network
  }

  // 6. Static Assets (Scripts, Styles, Fonts, Images, Audio, Icons)
  // Check either request destination or URL extension
  const isImage = request.destination === 'image' || 
                  /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);

  const isFont = request.destination === 'font' || 
                 /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname) ||
                 url.hostname === 'fonts.gstatic.com';

  const isScriptOrStyle = (request.destination === 'script' || request.destination === 'style' || /\.(js|css)$/i.test(url.pathname)) &&
                          url.pathname.startsWith('/assets/');

  if (isImage) {
    event.respondWith(handleStaleWhileRevalidate(request, STATIC_CACHE, 'image'));
    return;
  }

  if (isFont || isScriptOrStyle || CORE_APP_SHELL.includes(url.pathname)) {
    event.respondWith(handleStaleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 5. Default fallback for other GET requests: Stale-While-Revalidate
  if (request.method === 'GET') {
    event.respondWith(handleStaleWhileRevalidate(request, STATIC_CACHE));
  }
});

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        version: CACHE_VERSION,
        caches: ALL_CACHES
      });
    }
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all(ALL_CACHES.map((cacheName) => caches.delete(cacheName)))
    );
  }
});
