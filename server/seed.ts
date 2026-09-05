import { getFirestoreDb } from './db.js';
import {
  INITIAL_PRODUCTS,
  INITIAL_SERVICE_ZONES,
  INITIAL_RESOURCES,
  INITIAL_RIDERS,
  INITIAL_SETTINGS,
  INITIAL_FREE_SETTINGS,
  INITIAL_SUBSCRIBERS,
  INITIAL_ORDERS,
  INITIAL_FREE_DISTRIBUTIONS,
  INITIAL_SPONSORS,
  INITIAL_INVENTORY_TRANSACTIONS,
  INITIAL_AUDIT_LOGS
} from '../src/data/initialData.js';
import { DEFAULT_ECONOMICS_CONFIG } from '../src/utils/economics.js';

export async function ensureFirestoreSeeded(forceReset = false) {
  try {
    const db = getFirestoreDb();
    const productsSnapshot = await db.collection('products').limit(1).get();

    if (!productsSnapshot.empty && !forceReset) {
      console.log('Firestore collections already initialized. Skipping auto-seed.');
      return;
    }

    console.log(`Starting Firestore initial dataset seed (forceReset=${forceReset})...`);

    const batch = db.batch();

    // 1. Products
    for (const prod of INITIAL_PRODUCTS) {
      const ref = db.collection('products').doc(prod.id);
      batch.set(ref, prod);
    }

    // 2. Service Zones
    for (const zone of INITIAL_SERVICE_ZONES) {
      const ref = db.collection('serviceZones').doc(zone.id);
      batch.set(ref, zone);
    }

    // 3. Resources
    for (const res of INITIAL_RESOURCES) {
      const ref = db.collection('resources').doc(res.id);
      batch.set(ref, res);
    }

    // 4. Riders
    for (const rider of INITIAL_RIDERS) {
      const ref = db.collection('riders').doc(rider.id);
      batch.set(ref, rider);
    }

    // 5. Settings
    const settingsRef = db.collection('settings').doc('global');
    batch.set(settingsRef, INITIAL_SETTINGS);

    // 6. Free Essential Settings
    const freeSettingsRef = db.collection('freeSettings').doc('global');
    batch.set(freeSettingsRef, INITIAL_FREE_SETTINGS);

    // 6b. Economics Configuration & Economic Inputs
    const economicsRef = db.collection('economicsConfig').doc('global');
    batch.set(economicsRef, DEFAULT_ECONOMICS_CONFIG);

    // 7. Subscribers
    for (const sub of INITIAL_SUBSCRIBERS) {
      const ref = db.collection('traderPassSubscriptions').doc(sub.id);
      batch.set(ref, sub);
    }

    // 8. Orders
    for (const order of INITIAL_ORDERS) {
      const ref = db.collection('orders').doc(order.id);
      batch.set(ref, order);
    }

    // 9. Free Distributions
    for (const dist of INITIAL_FREE_DISTRIBUTIONS) {
      const ref = db.collection('freeDistributions').doc(dist.id);
      batch.set(ref, dist);
    }

    // 10. Sponsors
    for (const sp of INITIAL_SPONSORS) {
      const ref = db.collection('sponsors').doc(sp.id);
      batch.set(ref, sp);
    }

    // 11. Inventory Transactions
    for (const tx of INITIAL_INVENTORY_TRANSACTIONS) {
      const ref = db.collection('inventoryTransactions').doc(tx.id);
      batch.set(ref, tx);
    }

    // 12. Audit Logs
    for (const log of INITIAL_AUDIT_LOGS) {
      const ref = db.collection('auditLogs').doc(log.id);
      batch.set(ref, log);
    }

    // 13. Pre-seed Demo Users
    const demoUsers = [
      {
        id: 'demo-customer-uid',
        email: 'customer@trader24.net',
        display_name: 'Customer Member',
        role: 'CUSTOMER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true
      },
      {
        id: 'demo-rider-uid',
        email: 'rider@trader24.net',
        display_name: 'Cargo Rider 1',
        role: 'RIDER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true
      },
      {
        id: 'demo-admin-uid',
        email: 'admin@trader24.net',
        display_name: 'Admin Controller',
        role: 'ADMIN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true
      }
    ];

    for (const u of demoUsers) {
      const ref = db.collection('users').doc(u.id);
      batch.set(ref, u);
    }

    await batch.commit();
    console.log('Successfully committed Firestore initial seed data.');
  } catch (err) {
    console.error('Error during Firestore initialization seeding:', err);
  }
}
