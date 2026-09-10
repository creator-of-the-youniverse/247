import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { getFirestoreDb } from './server/db.js';
import { authenticateUser, requireAuth, requireRole, AuthenticatedRequest } from './server/auth.js';
import { ensureFirestoreSeeded } from './server/seed.js';
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
  AdminAlert
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
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Attach global auth extraction middleware
  app.use(authenticateUser);

  // Production startup intentionally does not seed demo data.
  // Demo data is loaded explicitly by the onboarding/demo flow.

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
    if (typeof data.sku !== "string" || data.sku.trim() === "") {
      return res.status(400).json({ error: "A real SKU is required when creating a product." });
    }
    if (!Number.isInteger(data.inventory_on_hand) || data.inventory_on_hand < 0) {
      return res.status(400).json({ error: "A real initial inventory quantity is required when creating a product." });
    }
      const id = `prod-${Date.now()}`;
      const newProduct: Product = {
        ...data,
        id,
        sku: data.sku.trim(),
        inventory_available: data.inventory_on_hand,
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

  // TRADER PASS API
  app.get('/api/trader-pass', async (req, res) => {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('traderPassSubscriptions').get();
      const subscribers = snap.docs.map(d => d.data() as TraderPassSubscription);

      res.json({
        price_monthly: 20.00,
        subscribers,
        active_count: subscribers.filter(s => s.subscription_status === 'ACTIVE').length
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/trader-pass/subscribe', async (req: AuthenticatedRequest, res) => {
    try {
      const db = getFirestoreDb();
      const { customer_id, customer_name, customer_email } = req.body;
      const subId = `sub-${Date.now()}`;
      const newSub: TraderPassSubscription = {
        id: subId,
        customer_id: req.user?.uid || customer_id || `cust-${Date.now()}`,
        customer_name: customer_name || req.user?.profile?.display_name || 'Trader Pass Member',
        customer_email: customer_email || req.user?.email || 'member@manchester.net',
        subscription_status: 'ACTIVE',
        price_monthly: 20.00,
        start_date: new Date().toISOString(),
        renewal_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        monthly_credit: 20.00,
        credit_used: 0.00,
        credit_remaining: 20.00,
        member_savings_total: 0.00,
        member_orders_count: 0
      };

      await db.collection('traderPassSubscriptions').doc(subId).set(newSub);
      await addAuditLog(req.user?.email || 'Customer', 'SUBSCRIPTION_CREATED', `Trader Pass for ${newSub.customer_name}`);
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
      sub.subscription_status = req.body.subscription_status;
      if (req.body.subscription_status === 'CANCELLED') {
        sub.cancellation_date = new Date().toISOString();
      }

      await docRef.set(sub);
      await addAuditLog(req.user?.email || 'Member Admin', 'SUBSCRIPTION_UPDATE', `Trader Pass ${sub.id}`, oldStatus, sub.subscription_status);
      res.json(sub);
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

      const systemPrompt = `You are "SEND TRADER", the intelligent order assistant for 247 in Manchester, New Hampshire.
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
        tagline: 'NEED SOMETHING? TRADER ROLLS.',
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
    const { createServer: createViteServer } = await import('vite');
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
