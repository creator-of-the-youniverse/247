import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import {
  Product,
  Order,
  OrderStatus,
  ServiceZone,
  CommunityResource,
  AuditLogEntry,
  BusinessMetrics,
  CartLoadoutRecommendation,
  TraderPassSubscription,
  SponsorContribution,
  BusinessEconomicsConfig,
  ProductEconomics,
  OrderEconomics,
  TraderPassEconomics,
  FreeEssentialEconomics,
  CartOptimizerResult,
  AdminAlert
} from '../../types';
import {
  BarChart3,
  Package,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  Users,
  MapPin,
  FileText,
  Settings,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  Clock,
  AlertTriangle,
  Check,
  CheckCircle2,
  X,
  Bike,
  Sliders,
  Calculator,
  Zap,
  Scale
} from 'lucide-react';

import { ProductEconomicsTable } from './ProductEconomicsTable';
import { OrderEconomicsLedger } from './OrderEconomicsLedger';
import { TraderPassEconomicsView } from './TraderPassEconomicsView';
import { FreeEssentialEconomicsView } from './FreeEssentialEconomicsView';
import { CartOptimizerView } from './CartOptimizerView';
import { ScenarioPlannerView } from './ScenarioPlannerView';
import { EconomicsSettingsView } from './EconomicsSettingsView';
import { TraderEconomicsDashboard } from './TraderEconomicsDashboard';

type AdminTab =
  | 'OVERVIEW'
  | 'PRODUCT_ECONOMICS'
  | 'ORDER_ECONOMICS'
  | 'CART_OPTIMIZER'
  | 'TRADER_PASS'
  | 'FREE_ESSENTIALS'
  | 'SCENARIO_PLANNER'
  | 'ECONOMICS_CONFIG'
  | 'ORDERS'
  | 'INVENTORY'
  | 'PRODUCTS'
  | 'SPONSORS'
  | 'COMPLIANCE'
  | 'AUDIT_LOGS';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    orders,
    serviceZones,
    settings,
    analytics,
    refreshData,
    resetDemoState,
    updateOrderStatus,
    addToast
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

  // Economics Engine states
  const [econConfig, setEconConfig] = useState<BusinessEconomicsConfig | null>(null);
  const [productEconomics, setProductEconomics] = useState<ProductEconomics[]>([]);
  const [orderEconomics, setOrderEconomics] = useState<OrderEconomics[]>([]);
  const [passEconomics, setPassEconomics] = useState<TraderPassEconomics | null>(null);
  const [freeEconomics, setFreeEconomics] = useState<FreeEssentialEconomics | null>(null);
  const [cartOptimizer, setCartOptimizer] = useState<CartOptimizerResult | null>(null);
  const [econDashboard, setEconDashboard] = useState<any>(null);
  const [econAlerts, setEconAlerts] = useState<AdminAlert[]>([]);
  const [econLoading, setEconLoading] = useState(false);

  // Supplementary states
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [sponsorsData, setSponsorsData] = useState<{ contributions: SponsorContribution[]; fund_balance: number; total_raised: number } | null>(null);

  // Form states
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [transferModal, setTransferModal] = useState<{ productId: string; name: string; max: number } | null>(null);
  const [transferQty, setTransferQty] = useState(5);
  const [transferDir, setTransferDir] = useState<'RESUPPLY_TO_CART' | 'CART_TO_RESUPPLY'>('RESUPPLY_TO_CART');

  useEffect(() => {
    loadEconomicsData();
  }, [activeTab]);

  const loadEconomicsData = async () => {
    setEconLoading(true);
    try {
      // Always fetch config and alerts
      const [cfg, alerts] = await Promise.all([
        api.getEconomicsConfig().catch(() => null),
        api.getEconomicsAlerts().catch(() => [])
      ]);
      if (cfg) setEconConfig(cfg);
      setEconAlerts(alerts || []);

      if (activeTab === 'OVERVIEW') {
        const dash = await api.getEconomicsDashboard();
        setEconDashboard(dash);
      } else if (activeTab === 'PRODUCT_ECONOMICS') {
        const pe = await api.getProductEconomics();
        setProductEconomics(pe);
      } else if (activeTab === 'ORDER_ECONOMICS') {
        const oe = await api.getOrderEconomics();
        setOrderEconomics(oe);
      } else if (activeTab === 'CART_OPTIMIZER') {
        const opt = await api.getCartOptimizer();
        setCartOptimizer(opt);
      } else if (activeTab === 'TRADER_PASS') {
        const tp = await api.getTraderPassEconomics();
        setPassEconomics(tp);
      } else if (activeTab === 'FREE_ESSENTIALS') {
        const fe = await api.getFreeEssentialEconomics();
        setFreeEconomics(fe);
      } else if (activeTab === 'AUDIT_LOGS') {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      } else if (activeTab === 'SPONSORS') {
        const sp = await api.getSponsors();
        setSponsorsData(sp);
      }
    } catch (err) {
      console.error('Error loading economics/admin data:', err);
    } finally {
      setEconLoading(false);
    }
  };

  const handleSaveEconomicsConfig = async (updated: BusinessEconomicsConfig) => {
    try {
      const saved = await api.updateEconomicsConfig(updated);
      setEconConfig(saved);
      addToast('Economics Saved', 'Authoritative business economics configuration updated.', 'success');
      loadEconomicsData();
      refreshData();
    } catch (err: any) {
      addToast('Save Failed', err.message || 'Could not update configuration', 'error');
      throw err;
    }
  };

  const handleApplyCartOptimization = async () => {
    try {
      const res = await api.applyCartOptimization();
      addToast('Cart Loadout Applied', `Updated mobile cart with optimal quantities (${res.total_units} total units).`, 'success');
      loadEconomicsData();
      refreshData();
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to apply cart loadout', 'error');
      throw err;
    }
  };

  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      if (editingProduct.id) {
        await api.updateProduct(editingProduct.id, editingProduct);
        addToast('Product Updated', `${editingProduct.name} saved.`, 'success');
      } else {
        await api.createProduct(editingProduct);
        addToast('Product Created', `${editingProduct.name} added to catalog.`, 'success');
      }
      setEditingProduct(null);
      refreshData();
      loadEconomicsData();
    } catch (err: any) {
      addToast('Error', err.message || 'Could not save product', 'error');
    }
  };

  const handleProductDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the store catalog?`)) return;
    try {
      await api.deleteProduct(id);
      addToast('Product Deleted', `${name} removed.`, 'info');
      refreshData();
      loadEconomicsData();
    } catch (err: any) {
      addToast('Error', 'Could not delete product', 'error');
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferModal) return;
    try {
      const fromLoc = transferDir === 'RESUPPLY_TO_CART' ? 'RESUPPLY' : 'CART';
      const toLoc = transferDir === 'RESUPPLY_TO_CART' ? 'CART' : 'RESUPPLY';

      await api.transferInventory({
        product_id: transferModal.productId,
        quantity: transferQty,
        from_location: fromLoc,
        to_location: toLoc,
        reason: 'Manual Admin Inventory Rebalance',
        user: 'Admin'
      });

      addToast('Transfer Complete', `Transferred ${transferQty} units of ${transferModal.name} to ${toLoc}.`, 'success');
      setTransferModal(null);
      refreshData();
      loadEconomicsData();
    } catch (err: any) {
      addToast('Transfer Error', err.message || 'Failed to transfer', 'error');
    }
  };

  const handleComplianceDecision = async (productId: string, status: string) => {
    try {
      await api.reviewCompliance({
        product_id: productId,
        compliance_status: status
      });
      addToast('Compliance Updated', `Product marked as ${status}.`, 'info');
      refreshData();
      loadEconomicsData();
    } catch (err) {
      addToast('Error', 'Compliance update failed', 'error');
    }
  };

  const navItems: { id: AdminTab; label: string; icon: any; category?: string }[] = [
    { id: 'OVERVIEW', label: 'Economics Dashboard', icon: DollarSign },
    { id: 'PRODUCT_ECONOMICS', label: 'Product Margins', icon: TrendingUp },
    { id: 'ORDER_ECONOMICS', label: 'Order Ledger', icon: BarChart3 },
    { id: 'CART_OPTIMIZER', label: 'Cart Optimizer', icon: Zap },
    { id: 'TRADER_PASS', label: 'Trader Pass', icon: Sparkles },
    { id: 'FREE_ESSENTIALS', label: 'Free Essentials', icon: HeartHandshake },
    { id: 'SCENARIO_PLANNER', label: 'Scenario Planner', icon: Calculator },
    { id: 'ECONOMICS_CONFIG', label: 'Business Inputs', icon: Sliders },
    { id: 'ORDERS', label: 'Live Orders', icon: ShoppingBag },
    { id: 'INVENTORY', label: 'Inventory & Cart', icon: Package },
    { id: 'PRODUCTS', label: 'Products Catalog', icon: Edit3 },
    { id: 'COMPLIANCE', label: 'Compliance', icon: ShieldCheck },
    { id: 'SPONSORS', label: 'Sponsors', icon: Users },
    { id: 'AUDIT_LOGS', label: 'Audit Trail', icon: FileText }
  ];

  return (
    <div id="admin-dashboard-root" className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Top Header Bar */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white uppercase tracking-wider">
              24 OPERATING SYSTEM
            </span>
            <span className="text-[10px] bg-amber-500 text-neutral-950 font-bold px-2 py-0.5 rounded font-mono">
              PHASE 3A ECONOMICS ENGINE
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Authoritative unit economics, subscription models & mobile cart loadout solver • Manchester, NH
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-admin-data"
            onClick={() => {
              loadEconomicsData();
              refreshData();
            }}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            id="btn-reset-demo-state"
            onClick={resetDemoState}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-admin-${item.id.toLowerCase()}`}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: EXECUTIVE ECONOMICS DASHBOARD --- */}
      {activeTab === 'OVERVIEW' && (
        <TraderEconomicsDashboard
          dashboardData={econDashboard}
          alerts={econAlerts}
          loading={econLoading}
        />
      )}

      {/* --- TAB 2: PRODUCT ECONOMICS & MARGINS --- */}
      {activeTab === 'PRODUCT_ECONOMICS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              Product Unit Economics & Margin Matrix
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Wholesale COGS, member margins, profit capacity, space efficiency, and sales velocity across all inventory.
            </p>
          </div>
          <ProductEconomicsTable products={productEconomics} loading={econLoading} />
        </div>
      )}

      {/* --- TAB 3: ORDER ECONOMICS LEDGER --- */}
      {activeTab === 'ORDER_ECONOMICS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              Order Economics & Contribution Ledger
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Authoritative transaction-by-transaction contribution breakdown: Revenue − COGS − Delivery − Stripe − Free Essentials = Net Contribution.
            </p>
          </div>
          <OrderEconomicsLedger orders={orderEconomics} loading={econLoading} />
        </div>
      )}

      {/* --- TAB 4: MOBILE CART LOADOUT OPTIMIZER --- */}
      {activeTab === 'CART_OPTIMIZER' && (
        <CartOptimizerView
          optimizerResult={cartOptimizer}
          loading={econLoading}
          onApply={handleApplyCartOptimization}
          onRefresh={loadEconomicsData}
        />
      )}

      {/* --- TAB 5: TRADER PASS SUBSCRIPTION ECONOMICS --- */}
      {activeTab === 'TRADER_PASS' && (
        <TraderPassEconomicsView
          passEconomics={passEconomics}
          loading={econLoading}
        />
      )}

      {/* --- TAB 6: FREE ESSENTIALS WHOLESALE ECONOMICS --- */}
      {activeTab === 'FREE_ESSENTIALS' && (
        <FreeEssentialEconomicsView
          freeEconomics={freeEconomics}
          loading={econLoading}
        />
      )}

      {/* --- TAB 7: SCENARIO PLANNER & WHAT-IF SIMULATION --- */}
      {activeTab === 'SCENARIO_PLANNER' && (
        <ScenarioPlannerView />
      )}

      {/* --- TAB 8: BUSINESS CONFIGURATION & INPUTS --- */}
      {activeTab === 'ECONOMICS_CONFIG' && econConfig && (
        <EconomicsSettingsView
          config={econConfig}
          onSave={handleSaveEconomicsConfig}
        />
      )}

      {/* --- TAB 9: ORDERS MASTER OPERATIONS --- */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">
              Live Order Operations ({orders.length})
            </h2>
            <span className="text-xs text-neutral-500 font-mono">Real-time status management</span>
          </div>

          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-neutral-900">{order.order_number}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold font-mono">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">
                      {order.customer_name} ({order.customer_phone}) • {order.delivery_address}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-base text-neutral-900">${order.total.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 font-mono block">{order.payment_method}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 text-xs font-mono text-neutral-700 space-y-1">
                  {order.free_item && (
                    <div className="text-emerald-700 flex items-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3" /> Free Essential: {order.free_item.name}
                    </div>
                  )}
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.quantity}x {it.name}</span>
                      <span>${((it.member_price || it.unit_price) * it.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Status Override Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-500 mr-2">Override Status:</span>
                  {(['PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'ARRIVING', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => updateOrderStatus(order.id, st)}
                      className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                        order.status === st
                          ? 'bg-amber-500 text-neutral-950 font-bold'
                          : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 10: INVENTORY & TRANSFERS --- */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Inventory & Mobile Trailer Load
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                Bicycle Cart Inventory vs Base Resupply Hub
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {products.map(prod => (
              <div key={prod.id} className="p-3.5 bg-white border border-neutral-200 rounded-xl flex items-center justify-between text-xs font-mono shadow-xs">
                <div>
                  <strong className="text-neutral-900 font-sans block text-sm">{prod.name}</strong>
                  <span className="text-neutral-500 text-[11px]">
                    Cost: ${prod.unit_cost.toFixed(2)} • Retail: ${prod.retail_price.toFixed(2)} • {prod.weight}g
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-neutral-900">
                      Cart: <span className="text-amber-600 font-bold">{prod.inventory_available}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">Hub: {prod.inventory_on_hand}</span>
                  </div>

                  <button
                    onClick={() => setTransferModal({
                      productId: prod.id,
                      name: prod.name,
                      max: prod.inventory_on_hand
                    })}
                    className="px-2.5 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Transfer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 11: PRODUCT CATALOG CRUD --- */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Product Catalog Management
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                {products.length} SKUs configured
              </p>
            </div>
            <button
              onClick={() => setEditingProduct({
                name: ''
              })}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map(prod => (
              <div key={prod.id} className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-3 flex flex-col justify-between shadow-xs">
                <div className="space-y-2">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-100">
                    <img src={prod.image} alt={prod.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-amber-700 uppercase">
                      <span>{prod.category}</span>
                      <span className="font-bold">{prod.compliance_status}</span>
                    </div>
                    <strong className="text-neutral-900 text-sm block mt-0.5">{prod.name}</strong>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{prod.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="font-bold text-neutral-900">${prod.retail_price.toFixed(2)} (Mem: ${prod.member_price.toFixed(2)})</div>
                    <div className="text-[10px] text-neutral-400">Cost: ${prod.unit_cost.toFixed(2)} • {prod.inventory_on_hand} in stock</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingProduct(prod)}
                      className="p-1.5 rounded bg-neutral-100 hover:bg-amber-500 hover:text-neutral-950 text-neutral-700 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleProductDelete(prod.id, prod.name)}
                      className="p-1.5 rounded bg-neutral-100 hover:bg-rose-600 hover:text-white text-neutral-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 12: COMPLIANCE WORKBENCH --- */}
      {activeTab === 'COMPLIANCE' && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              Compliance Enforcement Firewall
            </div>
            <p className="text-xs text-rose-950 font-mono leading-relaxed">
              24 strictly prohibits controlled substances, illegal drugs, and prescription medication. Unapproved products are strictly blocked by server-side middleware from customer views and order checkout.
            </p>
          </div>

          <div className="space-y-2">
            {products.map(prod => (
              <div key={prod.id} className="p-3.5 bg-white border border-neutral-200 rounded-xl flex items-center justify-between text-xs font-mono shadow-xs">
                <div>
                  <strong className="text-neutral-900 block font-sans text-sm">{prod.name}</strong>
                  <span className="text-neutral-500 text-[11px]">Category: {prod.category} • Age Check: {prod.age_restricted ? '21+ ID Required' : 'None'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    prod.compliance_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {prod.compliance_status}
                  </span>
                  {prod.compliance_status !== 'APPROVED' ? (
                    <button
                      onClick={() => handleComplianceDecision(prod.id, 'APPROVED')}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleComplianceDecision(prod.id, 'RESTRICTED')}
                      className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-amber-600 hover:text-white text-neutral-700 text-[11px]"
                    >
                      Restrict
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 13: SPONSORS & COMMUNITY FUND --- */}
      {activeTab === 'SPONSORS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Community Essential Fund Sponsors
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                Total Fund Raised: ${sponsorsData?.total_raised.toFixed(2) || '150.00'} • Balance: ${sponsorsData?.fund_balance.toFixed(2) || '112.50'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {(sponsorsData?.contributions || []).map(sp => (
              <div key={sp.id} className="p-3.5 bg-white border border-neutral-200 rounded-xl flex items-center justify-between text-xs font-mono shadow-xs">
                <div>
                  <strong className="text-neutral-900 font-sans block">{sp.sponsor_name}</strong>
                  <span className="text-neutral-500 text-[11px]">{sp.sponsor_message || 'Supporting community essentials in Manchester'}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700 text-sm">${sp.amount.toFixed(2)}</div>
                  <span className="text-[10px] text-neutral-400">{new Date(sp.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 14: AUDIT LEDGER --- */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-neutral-900">
            Chronological Audit Trail
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 bg-white border border-neutral-200 rounded-xl text-xs font-mono space-y-1 shadow-xs">
                <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="text-amber-600 font-bold">{log.user}</span>
                </div>
                <div className="text-neutral-900 font-bold">{log.action}: {log.object}</div>
                {log.old_value && log.new_value && (
                  <div className="text-[11px] text-neutral-500">
                    Changed from <span className="text-neutral-700">{log.old_value}</span> to <span className="text-emerald-700 font-semibold">{log.new_value}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Edit / Create Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-neutral-900 uppercase">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProductSave} className="space-y-3 text-xs font-mono">
              <div>
                <div>
                  <label className="text-neutral-700 block mb-1">SKU</label><input type="text" required value={editingProduct.sku || ""} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900" />
                </div>
                <label className="text-neutral-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-700 block mb-1">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={editingProduct.retail_price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, retail_price: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-neutral-700 block mb-1">Member Price ($)</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={editingProduct.member_price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, member_price: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-neutral-700 block mb-1">Unit Cost ($ COGS)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingProduct.unit_cost ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit_cost: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                  />
                </div>
                <div><label className="text-neutral-700 block mb-1">Initial Inventory (Units)</label><input type="number" min="0" step="1" required value={editingProduct.inventory_on_hand ?? ""} onChange={(e) => setEditingProduct({ ...editingProduct, inventory_on_hand: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900" /></div><div>
                  <label className="text-neutral-700 block mb-1">Weight (Grams)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.weight ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.free_eligible || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, free_eligible: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <span>Free Essential Eligible</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.age_restricted || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, age_restricted: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <span>21+ Age Restricted</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 rounded-lg text-neutral-500 hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-4 space-y-4 shadow-2xl">
            <h3 className="font-bold text-neutral-900 uppercase">Transfer Inventory</h3>
            <p className="text-xs text-neutral-600 font-mono">{transferModal.name}</p>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <label className="text-neutral-700 block mb-1">Direction</label>
                <select
                  value={transferDir}
                  onChange={(e) => setTransferDir(e.target.value as any)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                >
                  <option value="RESUPPLY_TO_CART">RESUPPLY → CART (Load into Bike Trailer)</option>
                  <option value="CART_TO_RESUPPLY">CART → RESUPPLY (Offload from Trailer)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-700 block mb-1">Transfer Quantity (Units)</label>
                <input
                  type="number"
                  min="1"
                  max={transferModal.max}
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-neutral-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setTransferModal(null)} className="px-3 py-1.5 rounded-lg text-neutral-500">
                Cancel
              </button>
              <button
                onClick={handleTransferSubmit}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
