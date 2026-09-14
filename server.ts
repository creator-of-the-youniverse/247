import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { getFirestoreDb } from './server/db.js';
import { authenticateUser, requireAuth, requireRole, AuthenticatedRequest } from './server/auth.js';
import { ensureFirestoreSeeded } from './server/seed.js';
import { INITIAL_ORDERS, INITIAL_BATTERY_HUBS, INITIAL_BATTERY_RESERVATIONS } from './src/data/initialData.js';
import {
  setupWebSocketServer,
  getActiveLocationsRecord,
  updateLiveLocation,
  resetLiveLocationsDemo,
  broadcastLiveMessage
} from './server/liveLocations.js';
import {
  Product,
  Order,
  TraderPassSubscription,
  SponsorContribution,
  InventoryTransaction,
  FreeDistribution,
  ServiceZone,
  CommunityResource,
  Rider,
  DeliverySettings,
  FreeEssentialSettings,
  AuditLogEntry,
  BusinessMetrics,
  UserProfile,
  BusinessEconomicsConfig,
  ProductEconomics,
  OrderEconomics,
  TraderPassEconomics,
  FreeEssentialEconomics,
  CartOptimizerResult,
  BreakEvenResult,
  ScenarioInputs,
  ScenarioResults,
  AdminAlert,
  BatteryExchangeRecord,
  BatteryHub,
  BatteryReservation,
  PassTier
} from './src/types.js';
import {
  DEFAULT_ECONOMICS_CONFIG,
  calculateProductEconomics,
  calculateOrderEconomics,
  calculateTraderPassEconomics,
  calculateFreeEssentialEconomics,
  runCartOptimizer,
  calculateBreakEven,
  runScenarioSimulation,
  evaluateAdminAlerts
} from './src/utils/economics.js';

// Initialize Gemini Client
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

/**
 * Robust Gemini model invoker with intelligent fallback between supported 3.x models
 * Recommended modern models: gemini-3.6-flash and gemini-3.8-flash
 */
async function generateGeminiContent(ai: GoogleGenAI, params: {
  contents: any;
  config?: any;
}) {
  const preferredModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ].filter(Boolean) as string[];

  // Deduplicate while preserving priority order
  const models = Array.from(new Set(preferredModels));

  let lastErr: any = null;
  for (const model of models) {
    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
    } catch (err: any) {
      lastErr = err;
      console.warn(`Gemini model ${model} invocation attempt failed, trying fallback:`, err?.message || err);
    }
  }
  throw lastErr;
}

async function addAuditLog(user: string, action: string, object: string, oldValue?: string, newValue?: string) {
  try {
    const db = getFirestoreDb();
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      user,
      action,
      object,
      old_value: oldValue,
      new_value: newValue
    };
    await db.collection('auditLogs').doc(entry.id).set(entry);
  } catch (e) {
    console.error('Failed to write audit log to Firestore:', e);
  }
}

async function calculateBusinessMetrics(): Promise<BusinessMetrics> {
  const db = getFirestoreDb();

  const [ordersSnap, productsSnap, freeDistSnap, subsSnap, sponsorsSnap, settingsDoc] = await Promise.all([
    db.collection('orders').get(),
    db.collection('products').get(),
    db.collection('freeDistributions').get(),
    db.collection('traderPassSubscriptions').get(),
    db.collection('sponsors').get(),
    db.collection('settings').doc('global').get()
  ]);

  const orders = ordersSnap.docs.map(d => d.data() as Order);
  const products = productsSnap.docs.map(d => d.data() as Product);
  const freeDistributions = freeDistSnap.docs.map(d => d.data() as FreeDistribution);
  const subscribers = subsSnap.docs.map(d => d.data() as TraderPassSubscription);
  const sponsors = sponsorsSnap.docs.map(d => d.data() as SponsorContribution);
  const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as DeliverySettings;

  const today = new Date().toISOString().split('T')[0];
  const ordersToday = orders.filter(o => o.created_at?.startsWith(today) && o.status !== 'CANCELLED');
  const revenueToday = ordersToday.reduce((sum, o) => sum + (o.total || 0), 0);
  const deliveryFeesToday = ordersToday.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const productRevenueToday = revenueToday - deliveryFeesToday;
  const aov = ordersToday.length > 0 ? revenueToday / ordersToday.length : 0;

  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' && o.actual_delivery_minutes);
  const avgDeliveryTime = deliveredOrders.length > 0
    ? Math.round(deliveredOrders.reduce((sum, o) => sum + (o.actual_delivery_minutes || 0), 0) / deliveredOrders.length)
    : 32;

  const under60 = deliveredOrders.filter(o => (o.actual_delivery_minutes || 0) <= 60);
  const percentUnder60 = deliveredOrders.length > 0 ? Math.round((under60.length / deliveredOrders.length) * 100) : 100;

  const activeMembers = subscribers.filter(s => s.subscription_status === 'ACTIVE').length;

  const freeToday = freeDistributions.filter(f => f.timestamp?.startsWith(today));
  const freeCostToday = freeToday.reduce((sum, f) => sum + ((f.unit_cost || 0.45) * (f.quantity || 1)), 0);
  const freeCostMonth = freeDistributions.reduce((sum, f) => sum + ((f.unit_cost || 0.45) * (f.quantity || 1)), 0);

  const cartValue = products.reduce((sum, p) => sum + ((p.inventory_available || 0) * (p.unit_cost || 0)), 0);
  const resupplyValue = products.reduce((sum, p) => sum + (((p.inventory_on_hand || 0) - (p.inventory_available || 0)) * (p.unit_cost || 0)), 0);

  const lowStock = products.filter(p => (p.inventory_available || 0) > 0 && (p.inventory_available || 0) <= (p.reorder_threshold || 5)).length;
  const outOfStock = products.filter(p => (p.inventory_available || 0) <= 0).length;

  const totalRevenueMonth = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + (o.total || 0), 0) + (activeMembers * 20);
  const totalCostOfGoodsSold = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => {
    return sum + (o.items || []).reduce((itemSum, item) => itemSum + ((item.unit_cost || 0) * (item.quantity || 1)), 0);
  }, 0);

  const grossMarginPercent = totalRevenueMonth > 0 ? Math.round(((totalRevenueMonth - totalCostOfGoodsSold) / totalRevenueMonth) * 100) : 62;
  const deliveryCostTotal = orders.length * (settings.average_delivery_labor_cost || 3.50);
  const paymentProcessingCostTotal = orders.reduce((sum, o) => sum + ((o.total || 0) * (settings.payment_processing_rate || 0.029) + (settings.payment_processing_flat || 0.30)), 0);
  const contributionMarginDollars = totalRevenueMonth - totalCostOfGoodsSold - deliveryCostTotal - paymentProcessingCostTotal - freeCostMonth;
  const contributionPerOrder = orders.length > 0 ? Number((contributionMarginDollars / orders.length).toFixed(2)) : 4.50;

  const fixedMonthly = settings.fixed_monthly_costs || 1850;
  const breakEvenOrdersMonth = contributionPerOrder > 0 ? Math.ceil(fixedMonthly / contributionPerOrder) : 400;
  const breakEvenOrdersDay = Math.ceil(breakEvenOrdersMonth / 30);

  const totalRaised = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);
  const sponsorFundBalance = totalRaised - freeCostMonth;
  const communityFundedCount = freeDistributions.filter(f => f.funded_by_sponsor).length;

  return {
    orders_today: ordersToday.length,
    revenue_today: Number(revenueToday.toFixed(2)),
    delivery_fees_today: Number(deliveryFeesToday.toFixed(2)),
    product_revenue_today: Number(productRevenueToday.toFixed(2)),
    average_order_value: Number(aov.toFixed(2)),
    average_delivery_time_minutes: avgDeliveryTime,
    percent_under_60_minutes: percentUnder60,
    active_members: activeMembers,
    new_members_month: activeMembers,
    cancelled_members_month: 0,
    free_essentials_today: freeToday.length,
    free_essentials_week: freeDistributions.length,
    free_essentials_month: freeDistributions.length,
    free_essential_cost_today: Number(freeCostToday.toFixed(2)),
    free_essential_cost_week: Number(freeCostMonth.toFixed(2)),
    free_essential_cost_month: Number(freeCostMonth.toFixed(2)),
    inventory_value_cart: Number(cartValue.toFixed(2)),
    inventory_value_resupply: Number(resupplyValue.toFixed(2)),
    inventory_value_total: Number((cartValue + resupplyValue).toFixed(2)),
    low_stock_products_count: lowStock,
    out_of_stock_products_count: outOfStock,
    revenue_month: Number(totalRevenueMonth.toFixed(2)),
    product_gross_margin_percent: grossMarginPercent,
    contribution_margin_dollars: Number(contributionMarginDollars.toFixed(2)),
    contribution_per_order: contributionPerOrder,
    delivery_cost_total: Number(deliveryCostTotal.toFixed(2)),
    payment_processing_cost_total: Number(paymentProcessingCostTotal.toFixed(2)),
    repeat_customer_rate_percent: 68,
    membership_churn_rate_percent: 3.2,
    customer_lifetime_value: 145.00,
    break_even_orders_month: breakEvenOrdersMonth,
    break_even_orders_day: breakEvenOrdersDay,
    community_fund_balance: Math.max(0, Number(sponsorFundBalance.toFixed(2))),
    community_funded_items_month: communityFundedCount
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Attach global auth extraction middleware
  app.use(authenticateUser);

  // Initialize Firestore collections from seed if empty (run asynchronously so server starts instantly)
  ensureFirestoreSeeded(false).catch(err => {
    console.error('Initial Firestore seed check error:', err);
  });

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: '247 Mobile OS',
      persistence: 'Firestore',
      auth: 'Firebase Auth',
      time: new Date().toISOString()
    });
  });

  // USER & AUTH PROFILE API
  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    res.json(req.user?.profile);
  });

  app.post('/api/auth/register-profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = getFirestoreDb();
    const { email, display_name, phone } = req.body;
    const uid = req.user!.uid;

    // Check if profile exists; role cannot be promoted to ADMIN or RIDER via client
    const existingDoc = await db.collection('users').doc(uid).get();
    let currentRole = req.user?.role || 'CUSTOMER';

    if (existingDoc.exists) {
      currentRole = existingDoc.data()?.role || currentRole;
    }

    const profile: UserProfile = {
      id: uid,
      email: email || req.user!.email,
      display_name: display_name || 'Customer',
      phone: phone || '',
      role: currentRole,
      created_at: existingDoc.exists ? existingDoc.data()?.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true
    };

    await db.collection('users').doc(uid).set(profile, { merge: true });
    res.json(profile);
  });

  // PRODUCTS API (Public Read, Admin Write)
  app.get('/api/products', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const { category, compliance_status, customer_view, search } = req.query;

      const snap = await db.collection('products').get();
      let list = snap.docs.map(doc => doc.data() as Product);

      // Enforce compliance firewall for customers
      if (customer_view === 'true') {
        list = list.filter(p => p.compliance_status === 'APPROVED' && p.active && p.delivery_allowed);
      }

      if (category && category !== 'ALL') {
        list = list.filter(p => p.category === category);
      }

      if (compliance_status) {
        list = list.filter(p => p.compliance_status === compliance_status);
      }

      if (search) {
        const q = String(search).toLowerCase();
        list = list.filter(p =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
        );
      }

      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error fetching products' });
    }
  });

  app.post('/api/products', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const data = req.body;
      const id = `prod-${Date.now()}`;
      const newProduct: Product = {
        ...data,
        id,
        sku: data.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        inventory_available: Number(data.inventory_on_hand || 0),
        inventory_reserved: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.collection('products').doc(id).set(newProduct);
      await addAuditLog(req.user?.email || 'Admin', 'PRODUCT_CREATE', `Product: ${newProduct.name} (${newProduct.sku})`, undefined, JSON.stringify(newProduct));
      res.status(201).json(newProduct);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/products/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('products').doc(req.params.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const oldProduct = doc.data() as Product;
      const updated: Product = {
        ...oldProduct,
        ...req.body,
        updated_at: new Date().toISOString()
      };

      await docRef.set(updated);
      await addAuditLog(req.user?.email || 'Admin', 'PRODUCT_UPDATE', `Product: ${updated.name}`, JSON.stringify(oldProduct), JSON.stringify(updated));
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/products/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('products').doc(req.params.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const deleted = doc.data() as Product;
      await docRef.delete();
      await addAuditLog(req.user?.email || 'Admin', 'PRODUCT_DELETE', `Product: ${deleted.name} (${deleted.sku})`, JSON.stringify(deleted), undefined);
      res.json({ success: true, deletedId: req.params.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // INVENTORY API (Public Read, Protected Write)
  app.get('/api/inventory', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [prodSnap, txSnap] = await Promise.all([
        db.collection('products').get(),
        db.collection('inventoryTransactions').orderBy('timestamp', 'desc').limit(100).get()
      ]);

      const products = prodSnap.docs.map(d => d.data() as Product);
      const transactions = txSnap.docs.map(d => d.data() as InventoryTransaction);

      res.json({
        products,
        transactions,
        locations: ['CART', 'RESUPPLY']
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/inventory/transfer', requireRole(['ADMIN', 'RIDER']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { product_id, quantity, from_location, to_location, reason } = req.body;
      const qty = Number(quantity);

      if (qty <= 0) {
        return res.status(400).json({ error: 'Quantity must be greater than zero' });
      }

      const prodRef = db.collection('products').doc(product_id);

      const result = await db.runTransaction(async (transaction) => {
        const prodDoc = await transaction.get(prodRef);
        if (!prodDoc.exists) {
          throw new Error('Product not found');
        }

        const prod = prodDoc.data() as Product;

        if (from_location === 'RESUPPLY' && to_location === 'CART') {
          const resupplyAvailable = (prod.inventory_on_hand || 0) - (prod.inventory_available || 0);
          if (qty > resupplyAvailable) {
            throw new Error(`Insufficient resupply inventory. Available: ${resupplyAvailable}`);
          }
          prod.inventory_available = (prod.inventory_available || 0) + qty;
        } else if (from_location === 'CART' && to_location === 'RESUPPLY') {
          if (qty > (prod.inventory_available || 0)) {
            throw new Error(`Insufficient cart inventory. Available: ${prod.inventory_available}`);
          }
          prod.inventory_available = Math.max(0, (prod.inventory_available || 0) - qty);
        }

        prod.updated_at = new Date().toISOString();
        transaction.set(prodRef, prod);

        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const tx: InventoryTransaction = {
          id: txId,
          timestamp: new Date().toISOString(),
          product_id: prod.id,
          product_name: prod.name,
          type: 'TRANSFER',
          location_from: from_location,
          location_to: to_location,
          quantity: qty,
          unit_cost: prod.unit_cost,
          reason: reason || `Transfer from ${from_location} to ${to_location}`,
          user: req.user?.email || 'Rider / Dispatch'
        };

        const txRef = db.collection('inventoryTransactions').doc(txId);
        transaction.set(txRef, tx);

        return { prod, tx };
      });

      await addAuditLog(req.user?.email || 'Dispatch', 'INVENTORY_TRANSFER', `${result.prod.name}: ${qty} units from ${from_location} to ${to_location}`);
      res.json({ success: true, transaction: result.tx, product: result.prod });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/inventory/adjust', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { product_id, type, quantity, reason } = req.body;
      const qty = Number(quantity);
      const prodRef = db.collection('products').doc(product_id);

      const result = await db.runTransaction(async (transaction) => {
        const prodDoc = await transaction.get(prodRef);
        if (!prodDoc.exists) throw new Error('Product not found');

        const prod = prodDoc.data() as Product;
        if (type === 'RESTOCK' || type === 'PURCHASE') {
          prod.inventory_on_hand = (prod.inventory_on_hand || 0) + qty;
          prod.inventory_available = (prod.inventory_available || 0) + qty;
        } else {
          prod.inventory_on_hand = Math.max(0, (prod.inventory_on_hand || 0) - qty);
          prod.inventory_available = Math.max(0, (prod.inventory_available || 0) - qty);
        }
        prod.updated_at = new Date().toISOString();
        transaction.set(prodRef, prod);

        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const tx: InventoryTransaction = {
          id: txId,
          timestamp: new Date().toISOString(),
          product_id: prod.id,
          product_name: prod.name,
          type: type as any,
          quantity: qty,
          unit_cost: prod.unit_cost,
          reason: reason || `${type} adjustment`,
          user: req.user?.email || 'Admin'
        };

        const txRef = db.collection('inventoryTransactions').doc(txId);
        transaction.set(txRef, tx);

        return { prod, tx };
      });

      await addAuditLog(req.user?.email || 'Admin', 'INVENTORY_ADJUST', `${type} for ${result.prod.name} (Qty: ${qty})`);
      res.json({ success: true, product: result.prod, transaction: result.tx });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // CART LOADOUT RECOMMENDATIONS
  app.get('/api/loadout', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('products').where('compliance_status', '==', 'APPROVED').get();
      const approved = snap.docs.map(d => d.data() as Product);

      const recommendations = approved.map(p => {
        let recQty = Math.min(p.target_stock || 10, p.inventory_on_hand || 10);
        if (p.category === 'ESSENTIALS') recQty = Math.min(15, p.inventory_on_hand);
        if (p.category === 'FIRST AID') recQty = Math.min(6, p.inventory_on_hand);
        if (p.category === 'WEATHER') recQty = Math.min(10, p.inventory_on_hand);
        if (p.category === 'HARM REDUCTION') recQty = Math.min(8, p.inventory_on_hand);

        return {
          product_id: p.id,
          product_name: p.name,
          category: p.category,
          unit_weight: p.weight || 100,
          unit_cost: p.unit_cost || 1.0,
          retail_price: p.retail_price || 2.0,
          recommended_quantity: recQty,
          current_cart_quantity: p.inventory_available || 0,
          resupply_available: Math.max(0, (p.inventory_on_hand || 0) - (p.inventory_available || 0)),
          recent_sales_24h: 3,
          recent_free_dist_24h: p.free_eligible ? 1 : 0,
          inventory_value: Number(((p.inventory_available || 0) * (p.unit_cost || 1)).toFixed(2))
        };
      });

      const totalWeightGrams = recommendations.reduce((sum, r) => sum + (r.current_cart_quantity * r.unit_weight), 0);
      const totalInventoryValue = recommendations.reduce((sum, r) => sum + r.inventory_value, 0);

      res.json({
        recommendations,
        cart_stats: {
          total_weight_kg: Number((totalWeightGrams / 1000).toFixed(2)),
          total_weight_lbs: Number(((totalWeightGrams / 1000) * 2.20462).toFixed(2)),
          total_inventory_value: Number(totalInventoryValue.toFixed(2)),
          estimated_demand_coverage_percent: 94
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ORDERS API
  app.get('/api/orders', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { status, customer_id } = req.query;

      let query: any = db.collection('orders');

      // If user is a customer, strictly scope orders to their authenticated ID
      if (req.user && req.user.role === 'CUSTOMER') {
        query = query.where('customer_id', '==', req.user.uid);
      } else if (customer_id) {
        query = query.where('customer_id', '==', customer_id);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      const snap = await query.get();
      const list = snap.docs.map(d => d.data() as Order);

      // Sort in memory by created_at desc
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/orders', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const orderData = req.body;
      const orderId = `ord-${Date.now()}`;
      const orderNumber = `TR-${Math.floor(8000 + Math.random() * 1999)}`;
      const now = new Date();

      const customerId = req.user?.uid || orderData.customer_id || `cust-${Date.now()}`;
      const customerName = orderData.customer_name || req.user?.profile?.display_name || 'Customer';

      // Atomic transaction: inventory verification, quota check, deduction, order write
      const createdOrder = await db.runTransaction(async (transaction) => {
        // 1. Fetch settings for SLA and free limits
        const settingsDoc = await transaction.get(db.collection('settings').doc('global'));
        const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as DeliverySettings;
        const deadline = new Date(now.getTime() + (settings.target_delivery_minutes || 60) * 60000);

        // 2. Fetch riders for initial assignment
        const ridersSnap = await transaction.get(db.collection('riders').limit(1));
        const firstRider = !ridersSnap.empty ? ridersSnap.docs[0].data() as Rider : null;

        // 3. Verify products and check inventory availability
        for (const item of orderData.items || []) {
          const prodRef = db.collection('products').doc(item.product_id);
          const prodDoc = await transaction.get(prodRef);

          if (!prodDoc.exists) {
            throw new Error(`Product not found: ${item.name}`);
          }

          const prod = prodDoc.data() as Product;
          if (prod.compliance_status !== 'APPROVED' || !prod.delivery_allowed) {
            throw new Error(`Product "${prod.name}" is not approved for mobile delivery.`);
          }

          if ((prod.inventory_available || 0) < item.quantity) {
            throw new Error(`Insufficient cart inventory for "${prod.name}". Available: ${prod.inventory_available}`);
          }

          // Decrement stock
          prod.inventory_available = Math.max(0, (prod.inventory_available || 0) - item.quantity);
          prod.inventory_on_hand = Math.max(0, (prod.inventory_on_hand || 0) - item.quantity);
          prod.updated_at = now.toISOString();
          transaction.set(prodRef, prod);

          // Log inventory transaction
          const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const tx: InventoryTransaction = {
            id: txId,
            timestamp: now.toISOString(),
            product_id: prod.id,
            product_name: prod.name,
            type: 'SALE',
            quantity: item.quantity,
            unit_cost: prod.unit_cost,
            reason: `Order ${orderNumber}`,
            user: customerName
          };
          transaction.set(db.collection('inventoryTransactions').doc(txId), tx);
        }

        // 4. Handle free essential item if present
        if (orderData.free_item) {
          const freeProdRef = db.collection('products').doc(orderData.free_item.product_id);
          const freeProdDoc = await transaction.get(freeProdRef);

          if (freeProdDoc.exists) {
            const freeProd = freeProdDoc.data() as Product;
            if (!freeProd.free_eligible) {
              throw new Error(`Product "${freeProd.name}" is not designated for the free essential program.`);
            }

            freeProd.inventory_available = Math.max(0, (freeProd.inventory_available || 0) - 1);
            freeProd.inventory_on_hand = Math.max(0, (freeProd.inventory_on_hand || 0) - 1);
            transaction.set(freeProdRef, freeProd);

            const distId = `fdist-${Date.now()}`;
            const freeDist: FreeDistribution = {
              id: distId,
              order_id: orderId,
              customer_id: customerId,
              product_id: freeProd.id,
              product_name: freeProd.name,
              category: freeProd.category,
              quantity: 1,
              unit_cost: freeProd.unit_cost || 0.45,
              reason: 'Free essential item with qualifying order',
              timestamp: now.toISOString(),
              funded_by_sponsor: true
            };
            transaction.set(db.collection('freeDistributions').doc(distId), freeDist);
          }
        }

        // 5. Construct order
        const newOrder: Order = {
          id: orderId,
          order_number: orderNumber,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: orderData.customer_phone || '(603) 555-0100',
          delivery_address: orderData.delivery_address || 'Elm St, Manchester, NH',
          delivery_zone_id: orderData.delivery_zone_id || 'zone-man-downtown',
          delivery_instructions: orderData.delivery_instructions || 'Meet on sidewalk or steps',
          items: orderData.items || [],
          free_item: orderData.free_item,
          subtotal: Number(orderData.subtotal || 0),
          delivery_fee: Number(orderData.delivery_fee || 0),
          pass_discount: Number(orderData.pass_discount || 0),
          credit_applied: Number(orderData.credit_applied || 0),
          total: Number(orderData.total || 0),
          payment_method: orderData.payment_method || 'CARD',
          payment_status: 'PAID',
          status: 'PLACED',
          created_at: now.toISOString(),
          deadline_at: deadline.toISOString(),
          assigned_rider_id: firstRider?.id,
          assigned_rider_name: firstRider?.name,
          age_verified: Boolean(orderData.age_verified),
          requires_id_check: Boolean(orderData.requires_id_check)
        };

        transaction.set(db.collection('orders').doc(orderId), newOrder);
        return newOrder;
      });

      await addAuditLog(customerName, 'ORDER_PLACED', `Order ${createdOrder.order_number} ($${createdOrder.total})`);
      res.status(201).json(createdOrder);
    } catch (e: any) {
      console.error('Order creation error:', e);
      res.status(400).json({ error: e.message || 'Failed to place order' });
    }
  });

  // GENERATE ON-DEMAND MOCK DELIVERY
  app.post('/api/orders/mock', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const body = req.body || {};

      const mockLocations = [
        { address: '875 Elm St, Apt 4B, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Ring buzzer 4B, leave on door mat or hand to me.' },
        { address: 'Corner of Granite St & Canal St, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Wearing a navy beanie standing outside staff entrance.' },
        { address: '320 McGregor St (West Side), Manchester, NH', zone: 'zone-man-west-side', instructions: 'Side porch light is on. Please knock 2 times.' },
        { address: '195 McGregor St, Manchester, NH', zone: 'zone-man-west-side', instructions: 'Meeting in main entrance turnaround by the visitor bike rack.' },
        { address: '405 Pine St, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Near the Manchester Library park side benches.' },
        { address: '40 Pine St, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Front steps of CAP community center. Look for green jacket.' },
        { address: '293 Wilson St, Manchester, NH', zone: 'zone-man-east-side', instructions: 'Side entrance near driveway. Call on arrival.' },
        { address: '540 Chestnut St, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Delivered to front lobby table.' },
        { address: '199 Manchester St, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Hand to reception desk staff inside gate.' },
        { address: 'Commercial St & Bridge St, Manchester, NH', zone: 'zone-man-downtown', instructions: 'Under brick mill archway near the bike trail entrance.' },
        { address: '100 McGregor St, Manchester, NH', zone: 'zone-man-west-side', instructions: 'Emergency wing patient intake lobby area.' },
        { address: '80 Willow St, Manchester, NH', zone: 'zone-man-south-end', instructions: 'Side loading bay door.' }
      ];

      const mockCustomers = [
        { name: 'Sarah Jenkins', phone: '(603) 555-7812' },
        { name: 'Dave Miller', phone: '(603) 555-3490' },
        { name: 'Jordan Rivera', phone: '(603) 555-8911' },
        { name: 'Elena Rostova', phone: '(603) 555-6421' },
        { name: 'Liam O\'Connor', phone: '(603) 555-4432' },
        { name: 'Maya Lin', phone: '(603) 555-9120' },
        { name: 'Marcus Chen', phone: '(603) 555-7788' },
        { name: 'Hannah Brooks', phone: '(603) 555-3122' },
        { name: 'Carlos Mendez', phone: '(603) 555-1980' },
        { name: 'Chloe Bennett', phone: '(603) 555-4819' },
        { name: 'Tyler Reed', phone: '(603) 555-1244' },
        { name: 'Jason Tremblay', phone: '(603) 555-5201' },
        { name: 'Samantha Ortiz', phone: '(603) 555-8319' }
      ];

      const mockRiders = [
        { id: 'rider-01', name: 'Alex "Spoke" Vance' },
        { id: 'rider-02', name: 'Marcus Cole' }
      ];

      const mockStatuses: any[] = ['OUT_FOR_DELIVERY', 'ARRIVING', 'ACCEPTED', 'PREPARING', 'READY', 'PLACED'];

      const loc = mockLocations[Math.floor(Math.random() * mockLocations.length)];
      const cust = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
      const rider = mockRiders[Math.floor(Math.random() * mockRiders.length)];
      const selectedStatus = body.status || mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

      const orderId = `ord-${Date.now()}`;
      const orderNumber = `TR-${Math.floor(8000 + Math.random() * 1999)}`;
      const now = new Date();

      // Query some approved products
      const prodSnap = await db.collection('products').where('compliance_status', '==', 'APPROVED').limit(6).get();
      let chosenItems: any[] = [];
      let freeItem: any = null;

      if (!prodSnap.empty) {
        const prods = prodSnap.docs.map(d => d.data() as Product);
        const item1 = prods[Math.floor(Math.random() * prods.length)];
        chosenItems.push({
          product_id: item1.id,
          name: item1.name,
          quantity: 1 + Math.floor(Math.random() * 2),
          unit_price: item1.retail_price || 3.00,
          member_price: item1.member_price || (item1.retail_price ? item1.retail_price * 0.8 : 2.50),
          unit_cost: item1.unit_cost || 0.80,
          category: item1.category
        });

        // Chance of second item
        if (prods.length > 1) {
          const item2 = prods.find(p => p.id !== item1.id) || prods[0];
          chosenItems.push({
            product_id: item2.id,
            name: item2.name,
            quantity: 1,
            unit_price: item2.retail_price || 2.50,
            member_price: item2.member_price || (item2.retail_price ? item2.retail_price * 0.8 : 2.00),
            unit_cost: item2.unit_cost || 0.70,
            category: item2.category
          });
        }

        // Add free essential item
        const freeCandidate = prods.find(p => p.category === 'ESSENTIALS' || p.category === 'WEATHER' || p.category === 'FOOD & DRINK') || prods[0];
        freeItem = {
          product_id: freeCandidate.id,
          name: freeCandidate.name,
          quantity: 1,
          unit_price: 0,
          member_price: 0,
          unit_cost: freeCandidate.unit_cost || 0.40,
          is_free_item: true,
          category: freeCandidate.category
        };
      } else {
        chosenItems = [
          {
            product_id: 'prod-water-01',
            name: 'Poland Spring Natural Spring Water (1 Liter)',
            quantity: 2,
            unit_price: 2.00,
            member_price: 1.50,
            unit_cost: 0.45,
            category: 'ESSENTIALS'
          }
        ];
      }

      const subtotal = chosenItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
      const isMember = Math.random() > 0.5;
      const deliveryFee = isMember ? 0.00 : 5.00;
      const passDiscount = isMember ? 2.00 : 0.00;
      const total = Math.max(0, subtotal + deliveryFee - passDiscount);

      const newMockOrder: Order = {
        id: orderId,
        order_number: orderNumber,
        customer_id: `cust-${Math.floor(100 + Math.random() * 900)}`,
        customer_name: body.customer_name || cust.name,
        customer_phone: cust.phone,
        delivery_address: body.delivery_address || loc.address,
        delivery_zone_id: loc.zone,
        delivery_instructions: loc.instructions,
        items: chosenItems,
        free_item: freeItem,
        subtotal,
        delivery_fee: deliveryFee,
        pass_discount: passDiscount,
        credit_applied: 0.00,
        total,
        payment_method: isMember ? 'TRADER_PASS_CREDIT' : 'CARD',
        payment_status: 'PAID',
        status: selectedStatus,
        created_at: new Date(now.getTime() - 15 * 60000).toISOString(),
        accepted_at: new Date(now.getTime() - 13 * 60000).toISOString(),
        preparing_at: ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED'].includes(selectedStatus)
          ? new Date(now.getTime() - 10 * 60000).toISOString() : undefined,
        ready_at: ['READY', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED'].includes(selectedStatus)
          ? new Date(now.getTime() - 7 * 60000).toISOString() : undefined,
        out_for_delivery_at: ['OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED'].includes(selectedStatus)
          ? new Date(now.getTime() - 5 * 60000).toISOString() : undefined,
        arriving_at: ['ARRIVING', 'DELIVERED'].includes(selectedStatus)
          ? new Date(now.getTime() - 1 * 60000).toISOString() : undefined,
        deadline_at: new Date(now.getTime() + 45 * 60000).toISOString(),
        assigned_rider_id: rider.id,
        assigned_rider_name: rider.name,
        rider_notes: `Bicycle courier rolling on route. ETA ~15 min.`,
        age_verified: true,
        requires_id_check: false
      };

      await db.collection('orders').doc(orderId).set(newMockOrder);
      await addAuditLog(req.user?.email || 'Demo Dispatch', 'MOCK_DELIVERY_DISPATCHED', `Order ${orderNumber} (${newMockOrder.status}) to ${newMockOrder.delivery_address}`);

      res.status(201).json(newMockOrder);
    } catch (e: any) {
      console.error('Mock order generation error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // SEED ALL MOCK DELIVERIES TO FIRESTORE
  app.post('/api/orders/seed-mock-deliveries', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const batch = db.batch();
      for (const order of INITIAL_ORDERS) {
        batch.set(db.collection('orders').doc(order.id), order);
      }
      await batch.commit();
      await addAuditLog(req.user?.email || 'System', 'MOCK_DELIVERIES_SEEDED', `Populated ${INITIAL_ORDERS.length} mock deliveries`);
      res.json({ success: true, count: INITIAL_ORDERS.length, message: `Successfully seeded ${INITIAL_ORDERS.length} mock deliveries.` });
    } catch (e: any) {
      console.error('Seed mock deliveries error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/orders/:id/status', requireRole(['ADMIN', 'RIDER']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { status, rider_id, rider_name, rider_notes } = req.body;
      const orderRef = db.collection('orders').doc(req.params.id);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderDoc.data() as Order;
      const oldStatus = order.status;
      order.status = status;
      const now = new Date().toISOString();

      if (status === 'ACCEPTED') order.accepted_at = now;
      if (status === 'PREPARING') order.preparing_at = now;
      if (status === 'READY') order.ready_at = now;
      if (status === 'OUT_FOR_DELIVERY') order.out_for_delivery_at = now;
      if (status === 'ARRIVING') order.arriving_at = now;
      if (status === 'DELIVERED') {
        order.delivered_at = now;
        const createdTime = new Date(order.created_at).getTime();
        const deliveredTime = new Date(now).getTime();
        order.actual_delivery_minutes = Math.max(1, Math.round((deliveredTime - createdTime) / 60000));
      }
      if (status === 'CANCELLED') order.cancelled_at = now;

      if (rider_id) order.assigned_rider_id = rider_id;
      if (rider_name) order.assigned_rider_name = rider_name;
      if (rider_notes !== undefined) order.rider_notes = rider_notes;

      await orderRef.set(order);
      await addAuditLog(req.user?.email || 'Rider / Dispatch', 'ORDER_STATUS_UPDATE', `Order ${order.order_number}`, oldStatus, status);
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // LIVE LOCATIONS & REAL-TIME SHARED MAP API
  app.get('/api/live-locations', (req, res) => {
    res.json({
      success: true,
      locations: getActiveLocationsRecord(),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/live-locations', async (req, res) => {
    try {
      const { id, role, latitude, longitude } = req.body;
      if (!id || !role || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'Missing required fields: id, role, latitude, longitude' });
      }
      const updated = await updateLiveLocation(req.body);
      res.json({ success: true, location: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/live-locations/reset-demo', (req, res) => {
    const locations = resetLiveLocationsDemo();
    res.json({ success: true, locations });
  });

  app.post('/api/live-locations/dispatch-ping', (req, res) => {
    const { title, message, targetId } = req.body;
    broadcastLiveMessage({
      type: 'DISPATCH_PING',
      payload: { title, message, targetId, time: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, message: 'Ping broadcasted' });
  });

  // FREE ESSENTIALS API
  app.get('/api/free-essentials', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [settingsDoc, distSnap] = await Promise.all([
        db.collection('freeSettings').doc('global').get(),
        db.collection('freeDistributions').orderBy('timestamp', 'desc').limit(200).get()
      ]);

      const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as FreeEssentialSettings;
      const freeDistributions = distSnap.docs.map(d => d.data() as FreeDistribution);

      const today = new Date().toISOString().split('T')[0];
      const todayDist = freeDistributions.filter(f => f.timestamp?.startsWith(today));
      const costToday = todayDist.reduce((sum, f) => sum + ((f.unit_cost || 0.45) * (f.quantity || 1)), 0);
      const costMonth = freeDistributions.reduce((sum, f) => sum + ((f.unit_cost || 0.45) * (f.quantity || 1)), 0);

      const categoryCosts: Record<string, number> = {};
      for (const dist of freeDistributions) {
        categoryCosts[dist.category] = (categoryCosts[dist.category] || 0) + ((dist.unit_cost || 0.45) * (dist.quantity || 1));
      }

      res.json({
        settings,
        metrics: {
          free_items_today: todayDist.length,
          free_items_week: freeDistributions.length,
          free_items_month: freeDistributions.length,
          free_item_cost_today: Number(costToday.toFixed(2)),
          free_item_cost_week: Number(costMonth.toFixed(2)),
          free_item_cost_month: Number(costMonth.toFixed(2)),
          free_cost_by_category: categoryCosts
        },
        distributions: freeDistributions
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/free-essentials/settings', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('freeSettings').doc('global');
      await docRef.set(req.body, { merge: true });
      await addAuditLog(req.user?.email || 'Admin', 'FREE_SETTINGS_UPDATE', 'Free Essential Rules', undefined, JSON.stringify(req.body));
      res.json(req.body);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // MEMBERSHIP PASSES & TESLA BATTERY EXCHANGE API
  app.get('/api/trader-pass', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [subsSnap, swapsSnap] = await Promise.all([
        db.collection('traderPassSubscriptions').get(),
        db.collection('batteryExchanges').get()
      ]);

      const subscribers = subsSnap.docs.map(d => d.data() as TraderPassSubscription);
      const totalSwaps = swapsSnap.docs.length;
      const activeSubs = subscribers.filter(s => s.subscription_status === 'ACTIVE');

      const passCatalog = [
        {
          id: 'TRADER',
          name: 'Trader Pass',
          price_monthly: 20.00,
          tagline: 'The all-inclusive essential delivery pass',
          description: '$20 monthly essential store credit, waived $5 bicycle delivery on all 247 orders, priority dispatch.',
          credit_monthly: 20.00,
          free_delivery: true,
          battery_exchange: false
        },
        {
          id: 'TESLA',
          name: 'Tesla Pass',
          price_monthly: 20.00,
          tagline: '24/7 Hot-swap battery pack exchange network',
          description: 'BYO battery pack exchange (2,000, 5,000, 10,000, and 20,000 mAh). Hand over dead pack, get a 100% charged full one instantly.',
          credit_monthly: 0.00,
          free_delivery: true,
          battery_exchange: true,
          supported_capacities: ['2000', '5000', '10000', '20000']
        },
        {
          id: 'COMBO',
          name: 'Combined Pass',
          price_monthly: 30.00,
          regular_price: 40.00,
          savings_monthly: 10.00,
          tagline: 'Both Trader & Tesla Passes bundled together',
          description: 'All Trader Pass benefits ($20 monthly store credit + free delivery) PLUS unlimited Tesla battery pack exchanges (2k-20k mAh). Best value.',
          credit_monthly: 20.00,
          free_delivery: true,
          battery_exchange: true,
          supported_capacities: ['2000', '5000', '10000', '20000']
        }
      ];

      res.json({
        price_monthly: 20.00,
        subscribers,
        active_count: activeSubs.length,
        trader_count: activeSubs.filter(s => !s.pass_type || s.pass_type === 'TRADER').length,
        tesla_count: activeSubs.filter(s => s.pass_type === 'TESLA').length,
        combo_count: activeSubs.filter(s => s.pass_type === 'COMBO').length,
        total_battery_swaps: totalSwaps,
        catalog: passCatalog
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/trader-pass/subscribe', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { customer_id, customer_name, customer_email, pass_type, registered_capacities } = req.body;
      const subId = `sub-${Date.now()}`;
      const tier: PassTier = pass_type === 'TESLA' || pass_type === 'COMBO' ? pass_type : 'TRADER';

      let priceMonthly = 20.00;
      let monthlyCredit = 20.00;

      if (tier === 'TESLA') {
        priceMonthly = 20.00;
        monthlyCredit = 0.00;
      } else if (tier === 'COMBO') {
        priceMonthly = 30.00;
        monthlyCredit = 20.00;
      }

      const newSub: TraderPassSubscription = {
        id: subId,
        customer_id: req.user?.uid || customer_id || `cust-${Date.now()}`,
        customer_name: customer_name || req.user?.profile?.display_name || 'Pass Member',
        customer_email: customer_email || req.user?.email || 'member@manchester.net',
        subscription_status: 'ACTIVE',
        pass_type: tier,
        price_monthly: priceMonthly,
        start_date: new Date().toISOString(),
        renewal_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        monthly_credit: monthlyCredit,
        credit_used: 0.00,
        credit_remaining: monthlyCredit,
        member_savings_total: 0.00,
        member_orders_count: 0,
        battery_exchanges_count: 0,
        registered_battery_capacities: registered_capacities || ['5000', '10000']
      };

      await db.collection('traderPassSubscriptions').doc(subId).set(newSub);
      await addAuditLog(
        req.user?.email || 'Customer',
        'SUBSCRIPTION_CREATED',
        `${tier} Pass for ${newSub.customer_name} ($${priceMonthly.toFixed(2)}/mo)`
      );
      res.status(201).json(newSub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/trader-pass/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('traderPassSubscriptions').doc(req.params.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      const sub = doc.data() as TraderPassSubscription;
      const oldStatus = sub.subscription_status;
      const oldTier = sub.pass_type || 'TRADER';

      if (req.body.subscription_status) {
        sub.subscription_status = req.body.subscription_status;
        if (req.body.subscription_status === 'CANCELLED') {
          sub.cancellation_date = new Date().toISOString();
        }
      }

      // Allow switching or upgrading pass tiers (e.g. TRADER -> COMBO or TESLA -> COMBO)
      if (req.body.pass_type && req.body.pass_type !== sub.pass_type) {
        const newTier: PassTier = req.body.pass_type;
        sub.pass_type = newTier;
        if (newTier === 'COMBO') {
          sub.price_monthly = 30.00;
          if (sub.monthly_credit === 0) {
            sub.monthly_credit = 20.00;
            sub.credit_remaining = Math.max(sub.credit_remaining, 20.00);
          }
        } else if (newTier === 'TESLA') {
          sub.price_monthly = 20.00;
        } else if (newTier === 'TRADER') {
          sub.price_monthly = 20.00;
          if (sub.monthly_credit === 0) {
            sub.monthly_credit = 20.00;
            sub.credit_remaining = 20.00;
          }
        }
      }

      if (req.body.registered_battery_capacities) {
        sub.registered_battery_capacities = req.body.registered_battery_capacities;
      }

      await docRef.set(sub);
      await addAuditLog(
        req.user?.email || 'Member Admin',
        'SUBSCRIPTION_UPDATE',
        `Pass ${sub.id} (Tier: ${oldTier}->${sub.pass_type || 'TRADER'}, Status: ${oldStatus}->${sub.subscription_status})`
      );
      res.json(sub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // TESLA BATTERY PACK EXCHANGE ENDPOINTS
  app.get('/api/battery-exchange/history', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('batteryExchanges').orderBy('created_at', 'desc').limit(50).get();
      const exchanges = snap.docs.map(d => d.data() as BatteryExchangeRecord);
      res.json(exchanges);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/battery-exchange/request', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const {
        customer_id,
        customer_name,
        customer_phone,
        capacity,
        exchange_type,
        delivery_address,
        notes
      } = req.body;

      if (!capacity || !['2000', '5000', '10000', '20000'].includes(capacity)) {
        return res.status(400).json({ error: 'Valid pack capacity (2000, 5000, 10000, or 20000 mAh) required.' });
      }

      const swapId = `swap-${Date.now()}`;
      const newSwap: BatteryExchangeRecord = {
        id: swapId,
        customer_id: req.user?.uid || customer_id || `cust-${Date.now()}`,
        customer_name: customer_name || req.user?.profile?.display_name || 'Tesla Pass Member',
        customer_phone: customer_phone || '(603) 555-0199',
        capacity: capacity as any,
        exchange_type: exchange_type || 'DELIVERY_DISPATCH',
        status: exchange_type === 'STREET_SWAP' || exchange_type === 'HUB_WALKUP' ? 'COMPLETED' : 'REQUESTED',
        created_at: new Date().toISOString(),
        completed_at: exchange_type === 'STREET_SWAP' || exchange_type === 'HUB_WALKUP' ? new Date().toISOString() : undefined,
        delivery_address: delivery_address || '875 Elm St, Manchester, NH',
        pack_serial: `TSL-${Math.round(parseInt(capacity) / 1000)}K-${Math.floor(100 + Math.random() * 900)}`,
        notes: notes || 'BYO Pack Swap: hand over dead pack, receive 100% full pack'
      };

      await db.collection('batteryExchanges').doc(swapId).set(newSwap);

      // Increment battery exchange count on user's active pass if available
      try {
        const subSnap = await db.collection('traderPassSubscriptions')
          .where('customer_id', '==', newSwap.customer_id)
          .where('subscription_status', '==', 'ACTIVE')
          .limit(1)
          .get();
        if (!subSnap.empty) {
          const subDoc = subSnap.docs[0];
          const subData = subDoc.data() as TraderPassSubscription;
          await subDoc.ref.update({
            battery_exchanges_count: (subData.battery_exchanges_count || 0) + 1
          });
        }
      } catch (subErr) {
        console.warn('Could not update subscriber battery exchange count:', subErr);
      }

      // Broadcast alert to active couriers on the network
      broadcastLiveMessage({
        type: 'DISPATCH_PING',
        payload: {
          title: 'Tesla Battery Hot-Swap Alert',
          message: `${capacity} mAh pack swap at ${newSwap.delivery_address || 'Manchester'}`,
          orderId: swapId
        },
        timestamp: new Date().toISOString()
      });

      await addAuditLog(
        req.user?.email || newSwap.customer_name,
        'BATTERY_SWAP_REQUESTED',
        `${capacity} mAh battery swap for ${newSwap.customer_name} (${newSwap.exchange_type})`
      );

      res.status(201).json(newSwap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/battery-exchange/:id/status', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('batteryExchanges').doc(req.params.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Battery exchange record not found' });
      }

      const swap = doc.data() as BatteryExchangeRecord;
      const { status, rider_id, rider_name, notes } = req.body;

      if (status) swap.status = status;
      if (rider_id) swap.rider_id = rider_id;
      if (rider_name) swap.rider_name = rider_name;
      if (notes) swap.notes = notes;
      if (status === 'COMPLETED') {
        swap.completed_at = new Date().toISOString();
      }

      await docRef.set(swap);
      await addAuditLog(
        req.user?.email || 'Rider',
        'BATTERY_SWAP_STATUS',
        `Swap ${swap.id} status changed to ${swap.status}`
      );
      res.json(swap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // BATTERY HUBS & AVAILABILITY ENDPOINTS
  app.get('/api/battery-hubs', async (req, res) => {
    try {
      const db = getFirestoreDb();
      let snap = await db.collection('batteryHubs').get();
      
      if (snap.empty) {
        // Seed initial battery hubs
        const batch = db.batch();
        for (const hub of INITIAL_BATTERY_HUBS) {
          batch.set(db.collection('batteryHubs').doc(hub.id), hub);
        }
        await batch.commit();
        snap = await db.collection('batteryHubs').get();
      }

      const hubs = snap.docs.map(d => d.data() as BatteryHub);
      res.json(hubs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/battery-reservations', async (req, res) => {
    try {
      const db = getFirestoreDb();
      let snap = await db.collection('batteryReservations').orderBy('created_at', 'desc').get();

      if (snap.empty) {
        const batch = db.batch();
        for (const r of INITIAL_BATTERY_RESERVATIONS) {
          batch.set(db.collection('batteryReservations').doc(r.id), r);
        }
        await batch.commit();
        snap = await db.collection('batteryReservations').orderBy('created_at', 'desc').get();
      }

      const reservations = snap.docs.map(d => d.data() as BatteryReservation);
      res.json(reservations);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/battery-reservations/reserve', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const {
        hub_id,
        capacity,
        hold_duration_minutes = 30,
        pickup_mode = 'HUB_WALKUP',
        notes = '',
        customer_name,
        customer_phone
      } = req.body;

      if (!hub_id || !capacity) {
        return res.status(400).json({ error: 'Hub ID and battery capacity are required' });
      }

      const hubRef = db.collection('batteryHubs').doc(hub_id);
      const hubDoc = await hubRef.get();

      if (!hubDoc.exists) {
        return res.status(404).json({ error: 'Battery Hub not found' });
      }

      const hubData = hubDoc.data() as BatteryHub;
      const validCap = capacity as '2000' | '5000' | '10000' | '20000';
      const available = hubData.available_packs[validCap] || 0;

      if (available <= 0) {
        return res.status(400).json({ error: `No ${validCap} mAh packs currently available at this hub` });
      }

      // Decrement inventory at hub
      const updatedPacks = {
        ...hubData.available_packs,
        [validCap]: available - 1
      };
      const updatedTotal = Object.values(updatedPacks).reduce((sum, count) => sum + count, 0);

      await hubRef.update({
        available_packs: updatedPacks,
        total_available: updatedTotal
      });

      const resId = `res-${Date.now()}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + hold_duration_minutes * 60 * 1000);
      const lockerBay = Math.floor(1 + Math.random() * 12);
      const randomCodeSuffix = Math.floor(1000 + Math.random() * 9000);

      const reservation: BatteryReservation = {
        id: resId,
        reservation_code: `TSL-RES-${randomCodeSuffix}`,
        hub_id: hubData.id,
        hub_name: hubData.name,
        hub_address: hubData.address,
        capacity: validCap,
        customer_id: req.user?.uid || `cust-${Date.now()}`,
        customer_name: customer_name || req.user?.profile?.display_name || 'Tesla Pass Member',
        customer_phone: customer_phone || '(603) 555-0199',
        status: 'ACTIVE',
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        hold_duration_minutes,
        pickup_mode,
        locker_bay_number: lockerBay,
        pack_serial: `TSL-${Math.round(parseInt(validCap) / 1000)}K-${Math.floor(100 + Math.random() * 900)}`,
        notes: notes || 'BYO pack ready for exchange'
      };

      await db.collection('batteryReservations').doc(resId).set(reservation);

      // Broadcast alert
      broadcastLiveMessage({
        type: 'DISPATCH_PING',
        payload: {
          title: 'Battery Pack Reserved',
          message: `${validCap} mAh reserved at ${hubData.name} (${pickup_mode === 'HUB_WALKUP' ? 'Station #' + lockerBay : 'Courier Dispatch'})`,
          reservationId: resId
        },
        timestamp: now.toISOString()
      });

      await addAuditLog(
        req.user?.email || reservation.customer_name,
        'BATTERY_RESERVED',
        `Reserved ${validCap} mAh at ${hubData.name} (Code: ${reservation.reservation_code})`
      );

      res.status(201).json({
        reservation,
        hub: {
          ...hubData,
          available_packs: updatedPacks,
          total_available: updatedTotal
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/battery-reservations/:id/cancel', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const resRef = db.collection('batteryReservations').doc(req.params.id);
      const resDoc = await resRef.get();

      if (!resDoc.exists) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      const reservation = resDoc.data() as BatteryReservation;
      if (reservation.status !== 'ACTIVE') {
        return res.status(400).json({ error: `Reservation is already ${reservation.status}` });
      }

      reservation.status = 'CANCELLED';
      await resRef.update({ status: 'CANCELLED' });

      // Return pack to hub inventory
      const hubRef = db.collection('batteryHubs').doc(reservation.hub_id);
      const hubDoc = await hubRef.get();
      if (hubDoc.exists) {
        const hubData = hubDoc.data() as BatteryHub;
        const currentCount = hubData.available_packs[reservation.capacity] || 0;
        const updatedPacks = {
          ...hubData.available_packs,
          [reservation.capacity]: currentCount + 1
        };
        const updatedTotal = Object.values(updatedPacks).reduce((sum, count) => sum + count, 0);
        await hubRef.update({
          available_packs: updatedPacks,
          total_available: updatedTotal
        });
      }

      await addAuditLog(
        req.user?.email || reservation.customer_name,
        'BATTERY_RESERVATION_CANCELLED',
        `Cancelled reservation ${reservation.reservation_code}`
      );

      res.json({ success: true, reservation });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/battery-reservations/:id/claim', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const resRef = db.collection('batteryReservations').doc(req.params.id);
      const resDoc = await resRef.get();

      if (!resDoc.exists) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      const reservation = resDoc.data() as BatteryReservation;
      reservation.status = 'COLLECTED';
      await resRef.update({ status: 'COLLECTED' });

      // Create completed battery exchange record
      const swapId = `swap-${Date.now()}`;
      const exchange: BatteryExchangeRecord = {
        id: swapId,
        customer_id: reservation.customer_id,
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        capacity: reservation.capacity,
        exchange_type: reservation.pickup_mode === 'HUB_WALKUP' ? 'HUB_WALKUP' : 'DELIVERY_DISPATCH',
        status: 'COMPLETED',
        created_at: reservation.created_at,
        completed_at: new Date().toISOString(),
        delivery_address: reservation.hub_address,
        pack_serial: reservation.pack_serial || `TSL-${reservation.capacity}-OK`,
        notes: `Claimed from ${reservation.hub_name} (${reservation.pickup_mode === 'HUB_WALKUP' ? 'Hub Station #' + (reservation.locker_bay_number || 1) : 'Courier Dispatch'})`
      };

      await db.collection('batteryExchanges').doc(swapId).set(exchange);

      // Increment pass count if active subscriber
      try {
        const subSnap = await db.collection('traderPassSubscriptions')
          .where('customer_id', '==', reservation.customer_id)
          .where('subscription_status', '==', 'ACTIVE')
          .limit(1)
          .get();
        if (!subSnap.empty) {
          const subDoc = subSnap.docs[0];
          const subData = subDoc.data() as TraderPassSubscription;
          await subDoc.ref.update({
            battery_exchanges_count: (subData.battery_exchanges_count || 0) + 1
          });
        }
      } catch (err) {
        console.warn('Could not update subscriber exchange count:', err);
      }

      await addAuditLog(
        req.user?.email || reservation.customer_name,
        'BATTERY_RESERVATION_COLLECTED',
        `Claimed pack ${reservation.pack_serial} at ${reservation.hub_name}`
      );

      res.json({ success: true, exchange, reservation });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // SPONSORS / COMMUNITY SUPPLY FUND API
  app.get('/api/sponsors', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [sponsorsSnap, freeSnap] = await Promise.all([
        db.collection('sponsors').get(),
        db.collection('freeDistributions').get()
      ]);

      const sponsors = sponsorsSnap.docs.map(d => d.data() as SponsorContribution);
      const freeDistributions = freeSnap.docs.map(d => d.data() as FreeDistribution);

      const totalRaised = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);
      const totalSpent = freeDistributions.reduce((sum, f) => sum + ((f.unit_cost || 0.45) * (f.quantity || 1)), 0);
      const balance = Math.max(0, totalRaised - totalSpent);
      const totalFundedItems = freeDistributions.filter(f => f.funded_by_sponsor).length;

      res.json({
        contributions: sponsors,
        fund_balance: Number(balance.toFixed(2)),
        total_raised: Number(totalRaised.toFixed(2)),
        total_funded_items: totalFundedItems,
        public_impact_statement: `Community supporters helped provide ${totalFundedItems} essential items across Manchester this month.`
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/sponsors/contribute', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { sponsor_name, is_anonymous, amount, campaign, message } = req.body;
      const spId = `sp-${Date.now()}`;
      const newContrib: SponsorContribution = {
        id: spId,
        sponsor_name: is_anonymous ? 'Anonymous Community Supporter' : (sponsor_name || 'Community Supporter'),
        is_anonymous: Boolean(is_anonymous),
        amount: Number(amount || 25),
        date: new Date().toISOString(),
        campaign: campaign || 'Manchester Community Essential Supply Fund',
        message
      };

      await db.collection('sponsors').doc(spId).set(newContrib);
      await addAuditLog(req.user?.email || 'Sponsor Checkout', 'SPONSOR_CONTRIBUTION', `Fund donation of $${newContrib.amount}`);
      res.status(201).json(newContrib);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // SERVICE ZONES & SETTINGS API
  app.get('/api/zones', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('serviceZones').get();
      const zones = snap.docs.map(d => d.data() as ServiceZone);
      res.json(zones);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/zones/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('serviceZones').doc(req.params.id);
      await docRef.set(req.body, { merge: true });
      await addAuditLog(req.user?.email || 'Admin', 'ZONE_UPDATE', `Zone: ${req.params.id}`);
      res.json(req.body);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/settings', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const doc = await db.collection('settings').doc('global').get();
      res.json(doc.exists ? doc.data() : {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/settings', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('settings').doc('global');
      await docRef.set(req.body, { merge: true });
      await addAuditLog(req.user?.email || 'Admin', 'SETTINGS_UPDATE', 'Global Settings', undefined, JSON.stringify(req.body));
      res.json(req.body);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // RESOURCES API
  app.get('/api/resources', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('resources').get();
      const resources = snap.docs.map(d => d.data() as CommunityResource);
      res.json(resources);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/resources', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const resId = `res-${Date.now()}`;
      const newRes: CommunityResource = {
        ...req.body,
        id: resId,
        active: true
      };
      await db.collection('resources').doc(resId).set(newRes);
      await addAuditLog(req.user?.email || 'Admin', 'RESOURCE_CREATE', `Resource: ${newRes.name}`);
      res.status(201).json(newRes);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/resources/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('resources').doc(req.params.id);
      await docRef.set(req.body, { merge: true });
      await addAuditLog(req.user?.email || 'Admin', 'RESOURCE_UPDATE', `Resource: ${req.params.id}`);
      res.json(req.body);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // RIDERS API
  app.get('/api/riders', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('riders').get();
      const riders = snap.docs.map(d => d.data() as Rider);
      res.json(riders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/riders/:id/status', requireRole(['ADMIN', 'RIDER']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const docRef = db.collection('riders').doc(req.params.id);
      await docRef.set({ status: req.body.status }, { merge: true });
      const updated = (await docRef.get()).data();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // COMPLIANCE API
  app.get('/api/compliance', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('products').get();
      const products = snap.docs.map(d => d.data() as Product);

      const pending = products.filter(p => p.compliance_status === 'PENDING_REVIEW');
      const restricted = products.filter(p => p.compliance_status === 'RESTRICTED' || p.age_restricted);
      const approved = products.filter(p => p.compliance_status === 'APPROVED');
      const disabled = products.filter(p => p.compliance_status === 'DISABLED');

      res.json({
        pending_review: pending,
        restricted_products: restricted,
        approved_count: approved.length,
        disabled_count: disabled.length,
        zero_controlled_substances_policy: 'Active & Enforced'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/compliance/review', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { product_id, compliance_status, minimum_age, requires_id } = req.body;
      const prodRef = db.collection('products').doc(product_id);
      const prodDoc = await prodRef.get();

      if (!prodDoc.exists) return res.status(404).json({ error: 'Product not found' });

      const prod = prodDoc.data() as Product;
      const oldStatus = prod.compliance_status;
      prod.compliance_status = compliance_status;
      if (minimum_age !== undefined) prod.minimum_age = minimum_age;
      if (requires_id !== undefined) prod.requires_id = requires_id;
      prod.delivery_allowed = compliance_status === 'APPROVED';
      prod.updated_at = new Date().toISOString();

      await prodRef.set(prod);
      await addAuditLog(req.user?.email || 'Compliance Officer', 'COMPLIANCE_DECISION', `Product: ${prod.name} (${prod.sku})`, oldStatus, compliance_status);
      res.json(prod);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // BUSINESS ANALYTICS & ECONOMICS API (PHASE 3A)

  const getEconomicsConfigHelper = async (): Promise<BusinessEconomicsConfig> => {
    try {
      const db = getFirestoreDb();
      const doc = await db.collection('economicsConfig').doc('global').get();
      if (doc.exists) {
        return { ...DEFAULT_ECONOMICS_CONFIG, ...doc.data() } as BusinessEconomicsConfig;
      }
    } catch (e) {
      console.warn('Could not fetch economics config, using defaults:', e);
    }
    return DEFAULT_ECONOMICS_CONFIG;
  };

  app.get('/api/economics/config', async (req, res) => {
    try {
      const config = await getEconomicsConfigHelper();
      res.json(config);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/economics/config', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const current = await getEconomicsConfigHelper();
      const updated: BusinessEconomicsConfig = { ...current, ...req.body };
      await db.collection('economicsConfig').doc('global').set(updated);
      await addAuditLog(req.user?.email || 'Admin', 'ECONOMICS_CONFIG_UPDATE', 'Business Economics Settings', undefined, JSON.stringify(updated));
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/products', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [productsSnap, ordersSnap, freeSnap, config] = await Promise.all([
        db.collection('products').get(),
        db.collection('orders').get(),
        db.collection('freeDistributions').get(),
        getEconomicsConfigHelper()
      ]);

      const products = productsSnap.docs.map(d => d.data() as Product);
      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const freeDists = freeSnap.docs.map(d => d.data() as FreeDistribution);

      const list: ProductEconomics[] = products.map(p =>
        calculateProductEconomics(p, orders, freeDists, config)
      );

      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/orders', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [ordersSnap, productsSnap, config] = await Promise.all([
        db.collection('orders').get(),
        db.collection('products').get(),
        getEconomicsConfigHelper()
      ]);

      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const products = productsSnap.docs.map(d => d.data() as Product);
      const productsMap = new Map<string, Product>(products.map(p => [p.id, p]));

      // Sort by created_at desc
      orders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      const list: OrderEconomics[] = orders.map(o =>
        calculateOrderEconomics(o, config, productsMap)
      );

      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/trader-pass', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [subsSnap, ordersSnap, config] = await Promise.all([
        db.collection('traderPassSubscriptions').get(),
        db.collection('orders').get(),
        getEconomicsConfigHelper()
      ]);

      const subs = subsSnap.docs.map(d => d.data() as TraderPassSubscription);
      const orders = ordersSnap.docs.map(d => d.data() as Order);

      const passEcon = calculateTraderPassEconomics(subs, orders, config);
      res.json(passEcon);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/free-essentials', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [freeSnap, productsSnap] = await Promise.all([
        db.collection('freeDistributions').get(),
        db.collection('products').get()
      ]);

      const freeDists = freeSnap.docs.map(d => d.data() as FreeDistribution);
      const products = productsSnap.docs.map(d => d.data() as Product);
      const productsMap = new Map<string, Product>(products.map(p => [p.id, p]));

      const freeEcon = calculateFreeEssentialEconomics(freeDists, productsMap);
      res.json(freeEcon);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/cart-optimizer', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [productsSnap, ordersSnap, freeSnap, config] = await Promise.all([
        db.collection('products').get(),
        db.collection('orders').get(),
        db.collection('freeDistributions').get(),
        getEconomicsConfigHelper()
      ]);

      const products = productsSnap.docs.map(d => d.data() as Product);
      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const freeDists = freeSnap.docs.map(d => d.data() as FreeDistribution);

      const optResult = runCartOptimizer(products, orders, freeDists, config);
      res.json(optResult);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/economics/cart-optimizer/apply', requireRole(['ADMIN', 'RIDER']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const [productsSnap, ordersSnap, freeSnap, config] = await Promise.all([
        db.collection('products').get(),
        db.collection('orders').get(),
        db.collection('freeDistributions').get(),
        getEconomicsConfigHelper()
      ]);

      const products = productsSnap.docs.map(d => d.data() as Product);
      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const freeDists = freeSnap.docs.map(d => d.data() as FreeDistribution);

      const optResult = runCartOptimizer(products, orders, freeDists, config);

      // Execute atomic transaction to apply all recommendations
      await db.runTransaction(async (transaction) => {
        for (const item of optResult.items) {
          const prodRef = db.collection('products').doc(item.product_id);
          const prodDoc = await transaction.get(prodRef);
          if (prodDoc.exists) {
            const p = prodDoc.data() as Product;
            p.inventory_available = Math.max(0, Math.min(p.inventory_on_hand || 0, item.recommended_quantity));
            p.updated_at = new Date().toISOString();
            transaction.set(prodRef, p);
          }
        }
      });

      await addAuditLog(req.user?.email || 'Dispatcher', 'CART_LOADOUT_OPTIMIZED', 'Applied Cart Optimizer recommendations to mobile cart');
      res.json({ success: true, message: 'Cart loadout updated to optimal recommended distribution.', optResult });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/dashboard', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [ordersSnap, productsSnap, freeSnap, subsSnap, config] = await Promise.all([
        db.collection('orders').get(),
        db.collection('products').get(),
        db.collection('freeDistributions').get(),
        db.collection('traderPassSubscriptions').get(),
        getEconomicsConfigHelper()
      ]);

      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const products = productsSnap.docs.map(d => d.data() as Product);
      const freeDists = freeSnap.docs.map(d => d.data() as FreeDistribution);
      const subs = subsSnap.docs.map(d => d.data() as TraderPassSubscription);
      const productsMap = new Map<string, Product>(products.map(p => [p.id, p]));

      const todayStr = new Date().toISOString().split('T')[0];
      const ordersToday = orders.filter(o => o.created_at?.startsWith(todayStr) && o.status !== 'CANCELLED');
      const orderEconomicsToday = ordersToday.map(o => calculateOrderEconomics(o, config, productsMap));

      const ordersMonth = orders.filter(o => o.status !== 'CANCELLED');
      const orderEconomicsMonth = ordersMonth.map(o => calculateOrderEconomics(o, config, productsMap));

      const passEcon = calculateTraderPassEconomics(subs, orders, config);
      const freeEcon = calculateFreeEssentialEconomics(freeDists, productsMap);

      // TODAY METRICS:
      const revenueToday = ordersToday.reduce((sum, o) => sum + (o.total || 0), 0);
      const deliveryRevToday = ordersToday.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      const productRevToday = revenueToday - deliveryRevToday;
      const aovToday = ordersToday.length > 0 ? revenueToday / ordersToday.length : 0;
      const productGrossProfitToday = orderEconomicsToday.reduce((sum, o) => sum + o.product_gross_profit, 0);
      const contributionToday = orderEconomicsToday.reduce((sum, o) => sum + o.contribution_margin, 0);
      const freeCostToday = freeEcon.free_items_today * 0.45;
      const processingCostToday = orderEconomicsToday.reduce((sum, o) => sum + o.payment_processing_cost, 0);

      const deliveredToday = ordersToday.filter(o => o.status === 'DELIVERED' && o.actual_delivery_minutes);
      const avgDeliveryTimeToday = deliveredToday.length > 0
        ? Math.round(deliveredToday.reduce((sum, o) => sum + (o.actual_delivery_minutes || 0), 0) / deliveredToday.length)
        : 28;
      const under60Today = deliveredToday.filter(o => (o.actual_delivery_minutes || 0) <= 60);
      const percentUnder60Today = deliveredToday.length > 0
        ? Math.round((under60Today.length / deliveredToday.length) * 100)
        : 100;

      // MONTH METRICS:
      const revenueMonth = ordersMonth.reduce((sum, o) => sum + (o.total || 0), 0);
      const aovMonth = ordersMonth.length > 0 ? revenueMonth / ordersMonth.length : 0;
      const productGrossProfitMonth = orderEconomicsMonth.reduce((sum, o) => sum + o.product_gross_profit, 0);
      const orderContributionMonth = orderEconomicsMonth.reduce((sum, o) => sum + o.contribution_margin, 0);
      const totalContributionMonth = orderContributionMonth + passEcon.net_membership_contribution;

      const estimatedOperatingResult = totalContributionMonth - config.monthly_fixed_costs;
      const avgContributionPerOrder = ordersMonth.length > 0
        ? Number((orderContributionMonth / ordersMonth.length).toFixed(2))
        : 4.50;

      const breakEven = calculateBreakEven(config.monthly_fixed_costs, avgContributionPerOrder, aovMonth);

      res.json({
        today: {
          orders_count: ordersToday.length,
          revenue: Number(revenueToday.toFixed(2)),
          product_revenue: Number(productRevToday.toFixed(2)),
          delivery_revenue: Number(deliveryRevToday.toFixed(2)),
          aov: Number(aovToday.toFixed(2)),
          product_gross_profit: Number(productGrossProfitToday.toFixed(2)),
          contribution: Number(contributionToday.toFixed(2)),
          free_essential_cost: Number(freeCostToday.toFixed(2)),
          payment_processing_cost: Number(processingCostToday.toFixed(2)),
          average_delivery_time_minutes: avgDeliveryTimeToday,
          percent_under_60_minutes: percentUnder60Today
        },
        month: {
          orders_count: ordersMonth.length,
          revenue: Number(revenueMonth.toFixed(2)),
          aov: Number(aovMonth.toFixed(2)),
          product_gross_profit: Number(productGrossProfitMonth.toFixed(2)),
          order_contribution: Number(orderContributionMonth.toFixed(2)),
          total_contribution: Number(totalContributionMonth.toFixed(2)),
          free_essential_cost: Number(freeEcon.total_wholesale_cost.toFixed(2)),
          subscription_revenue: Number(passEcon.monthly_subscription_revenue.toFixed(2)),
          member_count: passEcon.active_subscribers,
          member_contribution: Number(passEcon.net_membership_contribution.toFixed(2)),
          fixed_costs: Number(config.monthly_fixed_costs.toFixed(2)),
          estimated_operating_result: Number(estimatedOperatingResult.toFixed(2))
        },
        break_even: breakEven,
        kpi_status: {
          aov: { current: Number(aovMonth.toFixed(2)), target: config.target_aov, met: aovMonth >= config.target_aov },
          delivery_minutes: { current: avgDeliveryTimeToday, target: config.target_delivery_minutes_kpi, met: avgDeliveryTimeToday <= config.target_delivery_minutes_kpi },
          under_60_percent: { current: percentUnder60Today, target: config.target_under_60_percent, met: percentUnder60Today >= config.target_under_60_percent },
          members: { current: passEcon.active_subscribers, target: config.target_members_count, met: passEcon.active_subscribers >= config.target_members_count },
          monthly_orders: { current: ordersMonth.length, target: config.target_monthly_orders, met: ordersMonth.length >= config.target_monthly_orders },
          free_daily_limit: { current: freeEcon.free_items_today, target: config.target_free_daily_limit, met: freeEcon.free_items_today <= config.target_free_daily_limit }
        },
        config
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/economics/alerts', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const [productsSnap, ordersSnap, freeSnap, subsSnap, config] = await Promise.all([
        db.collection('products').get(),
        db.collection('orders').get(),
        db.collection('freeDistributions').get(),
        db.collection('traderPassSubscriptions').get(),
        getEconomicsConfigHelper()
      ]);

      const products = productsSnap.docs.map(d => d.data() as Product);
      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const freeDists = freeSnap.docs.map(d => d.data() as FreeDistribution);
      const subs = subsSnap.docs.map(d => d.data() as TraderPassSubscription);
      const productsMap = new Map<string, Product>(products.map(p => [p.id, p]));

      const productEcon = products.map(p => calculateProductEconomics(p, orders, freeDists, config));
      const orderEcon = orders.map(o => calculateOrderEconomics(o, config, productsMap));
      const passEcon = calculateTraderPassEconomics(subs, orders, config);
      const freeEcon = calculateFreeEssentialEconomics(freeDists, productsMap);
      const cartOpt = runCartOptimizer(products, orders, freeDists, config);

      const alerts = evaluateAdminAlerts(productEcon, orderEcon, passEcon, freeEcon, cartOpt, config);
      res.json(alerts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/economics/scenario', async (req, res) => {
    try {
      const inputs = req.body as ScenarioInputs;
      const results = runScenarioSimulation(inputs);
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // BUSINESS ANALYTICS API
  app.get('/api/analytics', async (req, res) => {
    try {
      const metrics = await calculateBusinessMetrics();
      res.json(metrics);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AUDIT LOGS API (Admin only)
  app.get('/api/audit-logs', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('auditLogs').orderBy('timestamp', 'desc').limit(100).get();
      const logs = snap.docs.map(d => d.data() as AuditLogEntry);
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // CONTROLLED DEMO RESET (Admin/Development protected)
  app.post('/api/demo/reset', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
    try {
      await ensureFirestoreSeeded(true);
      await addAuditLog(req.user?.email || 'Admin', 'DEMO_DATA_RESET', 'All Firestore collections re-seeded with demo baseline');
      res.json({ success: true, message: '247 database cleanly restored with demo dataset.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- GEMINI AI ENDPOINTS ---

  app.post('/api/ai/send-trader', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const db = getFirestoreDb();
      const [prodSnap, resSnap] = await Promise.all([
        db.collection('products').where('compliance_status', '==', 'APPROVED').get(),
        db.collection('resources').get()
      ]);

      const approvedProducts = prodSnap.docs.map(d => d.data() as Product).filter(p => p.active && p.delivery_allowed);
      const resources = resSnap.docs.map(d => d.data() as CommunityResource);

      const productCatalogBrief = approvedProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.retail_price,
        member_price: p.member_price,
        free_eligible: p.free_eligible,
        description: p.description
      }));

      const ai = getGeminiClient();
      if (!ai) {
        const text = prompt.toLowerCase();
        const matches: string[] = [];
        let advice = 'Here are the essential items we matched from your description. Please review and approve your cart.';

        if (text.includes('water') || text.includes('thirsty') || text.includes('drink')) matches.push('prod-water-01');
        if (text.includes('sock') || text.includes('cold feet') || text.includes('dry feet')) matches.push('prod-hyg-socks');
        if (text.includes('blister') || text.includes('foot hurt') || text.includes('rubbing')) matches.push('prod-fa-blister');
        if (text.includes('band') || text.includes('cut') || text.includes('bleed')) matches.push('prod-fa-bandages');
        if (text.includes('snack') || text.includes('food') || text.includes('hungry') || text.includes('granola')) matches.push('prod-snack-granola');
        if (text.includes('warm') || text.includes('cold') || text.includes('freeze')) {
          matches.push('prod-wth-warmers');
          matches.push('prod-wth-blanket');
        }
        if (text.includes('wipe') || text.includes('clean') || text.includes('wash')) matches.push('prod-hyg-wipes');
        if (text.includes('battery') || text.includes('phone dead') || text.includes('charge')) matches.push('prod-oth-powerbank');

        const matchedProducts = approvedProducts.filter(p => matches.includes(p.id));

        return res.json({
          interpretation: `Interpreted request: "${prompt}"`,
          suggestedProducts: matchedProducts.length > 0 ? matchedProducts : [approvedProducts[0], approvedProducts[1]],
          explanation: advice,
          isEmergencyAlert: false,
          emergencyAdvice: null,
          relevantResources: resources.slice(0, 2)
        });
      }

      const systemPrompt = `You are "SEND RIDER", the intelligent order assistant for 247 in Manchester, New Hampshire.
247 is a 24/7/365 bicycle-and-cargo-cart mobile retail and essential-supply delivery service.
Rules:
1. Interpret the user's natural language request.
2. Select 1 to 5 EXACT matching product IDs strictly from the provided APPROVED product catalog.
3. NEVER invent product IDs or sell controlled substances.
4. AI must NOT automatically purchase anything. The customer must approve the cart.
5. Medical requests must NEVER become medical diagnosis. For life-threatening emergencies (e.g. severe chest pain, major hemorrhage, severe overdose), set isEmergencyAlert: true and advise calling 911 immediately.
6. Provide a concise, friendly, street-level explanation of how these items help.`;

      const response = await generateGeminiContent(ai, {
        contents: `Customer prompt: "${prompt}"\n\nApproved Catalog:\n${JSON.stringify(productCatalogBrief, null, 2)}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              interpretation: { type: Type.STRING },
              suggestedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              explanation: { type: Type.STRING },
              isEmergencyAlert: { type: Type.BOOLEAN },
              emergencyAdvice: { type: Type.STRING }
            },
            required: ['interpretation', 'suggestedProductIds', 'explanation', 'isEmergencyAlert']
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      const suggestedProducts = approvedProducts.filter(p => (parsed.suggestedProductIds || []).includes(p.id));

      let matchedResources = resources.slice(0, 2);
      if (parsed.isEmergencyAlert) {
        matchedResources = resources.filter(r => r.category === 'HEALTHCARE' || r.category === 'CRISIS');
      }

      res.json({
        interpretation: parsed.interpretation,
        suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : [approvedProducts[0]],
        explanation: parsed.explanation,
        isEmergencyAlert: parsed.isEmergencyAlert,
        emergencyAdvice: parsed.emergencyAdvice,
        relevantResources: matchedResources
      });
    } catch (err: any) {
      console.error('Send Trader AI error:', err);
      res.json({
        interpretation: `Request: "${prompt}"`,
        suggestedProducts: [],
        explanation: 'We are rolling with daily essentials. Explore the shop catalog or call dispatch.',
        isEmergencyAlert: false,
        emergencyAdvice: null,
        relevantResources: []
      });
    }
  });

  app.post('/api/ai/ask-trader', async (req, res) => {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    try {
      const db = getFirestoreDb();
      const [settingsDoc, zonesSnap, prodSnap] = await Promise.all([
        db.collection('settings').doc('global').get(),
        db.collection('serviceZones').get(),
        db.collection('products').where('compliance_status', '==', 'APPROVED').limit(15).get()
      ]);

      const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as DeliverySettings;
      const serviceZones = zonesSnap.docs.map(d => (d.data() as ServiceZone).name);
      const activeProducts = prodSnap.docs.map(d => `${(d.data() as Product).name} ($${(d.data() as Product).retail_price})`);

      const storeContext = {
        service_name: '247',
        tagline: 'NEED SOMETHING? RIDERS ROLL OUT.',
        city: 'Manchester, New Hampshire',
        delivery_speed: 'Target delivery ≤60 minutes (often 25-40 min)',
        hours: '24/7/365 rain, snow, or heat',
        delivery_fee: `$${(settings.delivery_fee || 5).toFixed(2)} (Free for Trader Pass members or orders over $${(settings.free_delivery_threshold || 30).toFixed(2)})`,
        trader_pass: '$20/month, includes $20 monthly Essential Credit, free standard delivery, priority dispatch, member pricing, and monthly care-pack eligibility',
        free_essential_feature: 'Every qualifying order may select one free essential item (water, snack, hygiene, first aid, or weather item)',
        service_status: settings.service_status || 'ONLINE',
        service_zones: serviceZones,
        categories: ['ESSENTIALS', 'FIRST AID', 'HYGIENE', 'FOOD & DRINK', 'WEATHER', 'HARM REDUCTION', 'SMOKE SHOP (21+ only)'],
        active_products_sample: activeProducts
      };

      const ai = getGeminiClient();
      if (!ai) {
        const q = question.toLowerCase();
        let ans = '247 is Manchester’s 24/7/365 bicycle-and-cargo-cart micro-store delivery service. We bring water, first aid, hygiene, cold weather gear, and essentials in ≤60 minutes.';

        if (q.includes('pass') || q.includes('subscription') || q.includes('cost') || q.includes('20')) {
          ans = 'Trader Pass is $20/month. You receive $20 in monthly Essential Credit to spend on eligible goods, 100% free standard delivery on all orders, priority rider dispatch, member discount pricing, and monthly care-pack eligibility.';
        } else if (q.includes('free') || q.includes('essential')) {
          ans = 'Every qualifying order can choose 1 free eligible essential item! Options include spring water, granola bars, wet wipes, hand warmers, blister care, and harm reduction essentials.';
        } else if (q.includes('where') || q.includes('zone') || q.includes('deliver here') || q.includes('manchester')) {
          ans = 'We deliver anywhere in Manchester, NH! Our primary coverage zones include Downtown Elm St corridor, North End & Currier, West Side & Rimmon Heights, South End/Somerville, and East Side.';
        } else if (q.includes('time') || q.includes('how long') || q.includes('fast') || q.includes('speed')) {
          ans = 'Our target delivery time is 60 minutes or less. Because our riders operate custom cargo bikes and mobile carts positioned throughout Manchester, average downtown delivery is often 20–35 minutes.';
        }

        return res.json({ answer: ans });
      }

      const response = await generateGeminiContent(ai, {
        contents: `User question: "${question}"\n\nCurrent Store Knowledge:\n${JSON.stringify(storeContext, null, 2)}`,
        config: {
          systemInstruction: `You are "ASK TRADER", the helpful assistant for 247 in Manchester, NH.
Answer clearly, concisely, and honestly using only current store data.
Tone: Street-level, reliable, respectful, concise.
Do not invent product inventory or legal claims.
Customers can always call the owner/dispatch directly on their phone at (603) 555-0199 to speak with them immediately.
If asked about emergency medical care, direct them to emergency services (911 / CMC / Elliott).`
        }
      });

      res.json({ answer: response.text?.trim() || '247 is rolling 24/7 across Manchester, NH. Delivery in ≤60 minutes.' });
    } catch (err: any) {
      console.error('Ask Trader AI error:', err);
      res.json({
        answer: '247 is Manchester’s 24/7/365 bicycle-and-cargo-cart micro-store. We deliver essentials, first aid, weather supplies, and food in under 60 minutes.'
      });
    }
  });

  // PWA Service Worker & Manifest explicitly served with appropriate headers
  app.get('/sw.js', (req, res) => {
    const swPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'dist', 'sw.js')
      : path.join(process.cwd(), 'public', 'sw.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(swPath);
  });

  app.get('/manifest.json', (req, res) => {
    const manifestPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'dist', 'manifest.json')
      : path.join(process.cwd(), 'public', 'manifest.json');
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(manifestPath);
  });

  // VITE MIDDLEWARE (Development) or STATIC SERVE (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`247 Mobile Micro-Store Operating System live on http://0.0.0.0:${PORT}`);
  });

  // Attach WebSocket server for real-time live map location broadcasting across devices
  setupWebSocketServer(server);
  console.log(`247 Live Location WebSocket server attached on /ws and /ws/locations`);

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal error starting 247 server:', err);
  process.exit(1);
});
