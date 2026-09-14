import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Order,
  OrderItem,
  TraderPassSubscription,
  ServiceZone,
  DeliverySettings,
  FreeEssentialSettings,
  Rider,
  BusinessMetrics,
  PaymentMethod,
  BatteryExchangeRecord,
  BatteryCapacity,
  BatteryHub,
  BatteryReservation,
  PassTier
} from '../types';
import { api } from '../services/api';

export type UserRole = 'CUSTOMER' | 'RIDER' | 'ADMIN';

interface CartState {
  items: OrderItem[];
  free_item?: OrderItem;
  delivery_address: string;
  delivery_zone_id: string;
  delivery_instructions: string;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  age_verified: boolean;
  requires_id_check: boolean;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface StoreContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  cleanBuild: boolean;
  setCleanBuild: (clean: boolean) => void;
  enableCleanBuild: () => Promise<void>;
  
  // Data
  products: Product[];
  approvedProducts: Product[];
  orders: Order[];
  currentOrder: Order | null;
  setCurrentOrder: (order: Order | null) => void;
  serviceZones: ServiceZone[];
  settings: DeliverySettings;
  freeSettings: FreeEssentialSettings;
  riders: Rider[];
  currentRider: Rider | null;
  setCurrentRider: (rider: Rider | null) => void;
  activePass: TraderPassSubscription | null;
  analytics: BusinessMetrics | null;
  loading: boolean;
  error: string | null;

  // Cart
  cart: CartState;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  selectFreeItem: (product: Product | null) => void;
  setDeliveryAddress: (address: string) => void;
  setDeliveryZoneId: (zoneId: string) => void;
  setDeliveryInstructions: (instructions: string) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setAgeVerified: (verified: boolean) => void;
  clearCart: () => void;

  // Calculated Cart values
  cartSubtotal: number;
  cartDeliveryFee: number;
  cartMemberDiscount: number;
  cartCreditApplied: number;
  cartTotal: number;
  cartItemCount: number;

  // Membership & Battery Exchange Privileges
  batteryExchanges: BatteryExchangeRecord[];
  batteryHubs: BatteryHub[];
  batteryReservations: BatteryReservation[];
  hasBatteryPrivilege: boolean;
  hasDeliveryPrivilege: boolean;

  // Actions
  placeOrder: () => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string, notes?: string) => Promise<Order>;
  toggleMemberPass: (targetTier?: PassTier, registeredCapacities?: BatteryCapacity[]) => Promise<void>;
  requestBatteryExchange: (
    capacity: BatteryCapacity,
    address?: string,
    notes?: string,
    exchangeType?: 'DELIVERY_DISPATCH' | 'STREET_SWAP' | 'HUB_WALKUP'
  ) => Promise<BatteryExchangeRecord>;
  reserveBatteryPack: (
    hubId: string,
    capacity: BatteryCapacity,
    options?: {
      holdDuration?: number;
      pickupMode?: 'HUB_WALKUP' | 'COURIER_DISPATCH';
      notes?: string;
    }
  ) => Promise<BatteryReservation>;
  cancelBatteryReservation: (reservationId: string) => Promise<void>;
  claimBatteryReservation: (reservationId: string) => Promise<void>;
  refreshBatteryHubs: () => Promise<void>;
  applyEssentialCredit: (amount: number) => void;
  refreshData: () => Promise<void>;
  resetDemoState: () => Promise<void>;
  addMockDelivery: (params?: { status?: string; delivery_address?: string; customer_name?: string }) => Promise<Order>;
  seedMockDeliveries: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: DeliverySettings = {
  delivery_fee: 5.00,
  free_delivery_threshold: 30.00,
  member_delivery_fee: 0.00,
  target_delivery_minutes: 60,
  minimum_order: 3.00,
  service_radius_miles: 4.5,
  service_status: 'ONLINE',
  service_status_message: 'Rolling 24/7 across Manchester, NH',
  fixed_monthly_costs: 1850.00,
  payment_processing_rate: 0.029,
  payment_processing_flat: 0.30,
  average_delivery_labor_cost: 3.50
};

const DEFAULT_FREE_SETTINGS: FreeEssentialSettings = {
  free_items_per_order: 1,
  daily_free_limit: 50,
  member_free_limit: 100,
  eligible_categories: ['ESSENTIALS', 'FIRST AID', 'HYGIENE', 'WEATHER', 'HARM REDUCTION'],
  minimum_inventory_protection: 2
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [cleanBuild, setCleanBuild] = useState<boolean>(() => {
    return localStorage.getItem('247_clean_build') === 'true' ||
           localStorage.getItem('247_onboarding_completed') === 'true' ||
           localStorage.getItem('trader24_clean_build') === 'true' ||
           localStorage.getItem('trader24_onboarding_completed') === 'true';
  });
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    const isClean = localStorage.getItem('247_clean_build') === 'true' ||
                    localStorage.getItem('247_onboarding_completed') === 'true' ||
                    localStorage.getItem('trader24_clean_build') === 'true' ||
                    localStorage.getItem('trader24_onboarding_completed') === 'true';
    return !isClean;
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_SETTINGS);
  const [freeSettings, setFreeSettings] = useState<FreeEssentialSettings>(DEFAULT_FREE_SETTINGS);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [currentRider, setCurrentRider] = useState<Rider | null>(null);
  const [activePass, setActivePass] = useState<TraderPassSubscription | null>(null);
  const [batteryExchanges, setBatteryExchanges] = useState<BatteryExchangeRecord[]>([]);
  const [batteryHubs, setBatteryHubs] = useState<BatteryHub[]>([]);
  const [batteryReservations, setBatteryReservations] = useState<BatteryReservation[]>([]);
  const [analytics, setAnalytics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Customer Cart
  const [cart, setCart] = useState<CartState>({
    items: [],
    free_item: undefined,
    delivery_address: '875 Elm St, Manchester, NH',
    delivery_zone_id: 'zone-man-downtown',
    delivery_instructions: 'Meet outside front steps / by bike rack',
    customer_name: 'Alex J.',
    customer_phone: '(603) 555-0144',
    payment_method: 'CARD',
    age_verified: true,
    requires_id_check: false
  });

  const addToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        prods,
        ords,
        zones,
        sttngs,
        freeData,
        passData,
        riderList,
        analyticsData,
        swaps,
        hubs,
        resList
      ] = await Promise.all([
        api.getProducts(),
        api.getOrders(),
        api.getZones(),
        api.getSettings(),
        api.getFreeEssentials(),
        api.getTraderPass(),
        api.getRiders(),
        api.getAnalytics(),
        api.getBatteryExchanges().catch(() => []),
        api.getBatteryHubs().catch(() => []),
        api.getBatteryReservations().catch(() => [])
      ]);

      setProducts(prods || []);
      setOrders(ords || []);
      if (ords && ords.length > 0 && !currentOrder) {
        // Set first active or latest order as tracked
        const active = ords.find(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED') || ords[0];
        setCurrentOrder(active);
      }
      setServiceZones(zones || []);
      if (sttngs) setSettings(sttngs);
      if (freeData?.settings) setFreeSettings(freeData.settings);
      setRiders(riderList || []);
      if (riderList && riderList.length > 0 && !currentRider) {
        setCurrentRider(riderList[0]);
      }
      if (passData?.subscribers && passData.subscribers.length > 0) {
        setActivePass(passData.subscribers[0]);
      }
      if (swaps) setBatteryExchanges(swaps);
      if (hubs) setBatteryHubs(hubs);
      if (resList) setBatteryReservations(resList);
      if (analyticsData) setAnalytics(analyticsData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load store data:', err);
      setError(err.message || 'Error loading store data');
    } finally {
      setLoading(false);
    }
  }, [currentOrder, currentRider]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Approved products available for customer view & checkout
  const approvedProducts = products.filter(p => p.compliance_status === 'APPROVED' && p.active && p.delivery_allowed);

  // Cart operations
  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (product.compliance_status !== 'APPROVED') {
      addToast('Product Restricted', 'This item is not approved for mobile dispatch.', 'warning');
      return;
    }

    setCart(prev => {
      const existing = prev.items.find(i => i.product_id === product.id);
      let updatedItems: OrderItem[];

      if (existing) {
        updatedItems = prev.items.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        const isMember = activePass?.subscription_status === 'ACTIVE';
        updatedItems = [
          ...prev.items,
          {
            product_id: product.id,
            name: product.name,
            quantity,
            unit_price: product.retail_price,
            member_price: product.member_price,
            unit_cost: product.unit_cost,
            category: product.category
          }
        ];
      }

      // Check if age restricted product was added
      const requiresId = product.age_restricted || prev.requires_id_check;

      return {
        ...prev,
        items: updatedItems,
        requires_id_check: requiresId
      };
    });

    addToast('Added to Cart', `${product.name} added to loadout.`, 'success');
  }, [activePass, addToast]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => {
      const updatedItems = prev.items.filter(i => i.product_id !== productId);
      const stillHasAgeRestricted = updatedItems.some(item => {
        const p = products.find(prod => prod.id === item.product_id);
        return p?.age_restricted;
      });
      return {
        ...prev,
        items: updatedItems,
        requires_id_check: stillHasAgeRestricted
      };
    });
  }, [products]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => ({
      ...prev,
      items: prev.items.map(i => i.product_id === productId ? { ...i, quantity } : i)
    }));
  }, [removeFromCart]);

  const selectFreeItem = useCallback((product: Product | null) => {
    if (!product) {
      setCart(prev => ({ ...prev, free_item: undefined }));
      return;
    }

    if (!product.free_eligible) {
      addToast('Not Eligible', 'This product is not designated for the Free Essential program.', 'warning');
      return;
    }

    setCart(prev => ({
      ...prev,
      free_item: {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: 0,
        member_price: 0,
        unit_cost: product.unit_cost,
        is_free_item: true,
        category: product.category
      }
    }));

    addToast('Free Essential Selected', `${product.name} will be packed with your order for $0.00!`, 'success');
  }, [addToast]);

  const setDeliveryAddress = useCallback((address: string) => {
    setCart(prev => ({ ...prev, delivery_address: address }));
  }, []);

  const setDeliveryZoneId = useCallback((zoneId: string) => {
    setCart(prev => ({ ...prev, delivery_zone_id: zoneId }));
  }, []);

  const setDeliveryInstructions = useCallback((instructions: string) => {
    setCart(prev => ({ ...prev, delivery_instructions: instructions }));
  }, []);

  const setCustomerInfo = useCallback((name: string, phone: string) => {
    setCart(prev => ({ ...prev, customer_name: name, customer_phone: phone }));
  }, []);

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setCart(prev => ({ ...prev, payment_method: method }));
  }, []);

  const setAgeVerified = useCallback((verified: boolean) => {
    setCart(prev => ({ ...prev, age_verified: verified }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(prev => ({
      ...prev,
      items: [],
      free_item: undefined,
      requires_id_check: false
    }));
  }, []);

  // Calculate pricing & membership privileges
  const isMember = activePass?.subscription_status === 'ACTIVE';
  const currentPassTier: PassTier = activePass?.pass_type || 'TRADER';
  const hasBatteryPrivilege = Boolean(isMember && (currentPassTier === 'TESLA' || currentPassTier === 'COMBO'));
  const hasDeliveryPrivilege = Boolean(isMember && (currentPassTier === 'TRADER' || currentPassTier === 'COMBO'));

  const cartSubtotal = cart.items.reduce((sum, item) => {
    const price = isMember ? item.member_price : item.unit_price;
    return sum + (price * item.quantity);
  }, 0);

  const rawRetailSubtotal = cart.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const cartMemberDiscount = Math.max(0, rawRetailSubtotal - cartSubtotal);

  // Delivery fee logic: Free for members or orders >= free_delivery_threshold
  const standardDeliveryFee = (cartSubtotal >= settings.free_delivery_threshold || isMember) ? 0 : settings.delivery_fee;
  const cartDeliveryFee = standardDeliveryFee;

  // Essential Credit calculation if paying with Trader Pass
  let cartCreditApplied = 0;
  if (isMember && cart.payment_method === 'TRADER_PASS_CREDIT' && (activePass?.credit_remaining || 0) > 0) {
    const totalBeforeCredit = cartSubtotal + cartDeliveryFee;
    cartCreditApplied = Math.min(totalBeforeCredit, activePass?.credit_remaining || 0);
  }

  const cartTotal = Math.max(0, cartSubtotal + cartDeliveryFee - cartCreditApplied);
  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0) + (cart.free_item ? 1 : 0);

  // Place order
  const placeOrder = async (): Promise<Order> => {
    if (cart.items.length === 0 && !cart.free_item) {
      throw new Error('Cart is empty. Add at least one item or free essential.');
    }

    if (settings.service_status === 'OFFLINE' || settings.service_status === 'EMERGENCY_HOLD') {
      throw new Error(`247 is currently ${settings.service_status}. Orders paused for rider safety.`);
    }

    const orderPayload = {
      customer_id: activePass?.customer_id || 'cust-direct',
      customer_name: cart.customer_name,
      customer_phone: cart.customer_phone,
      delivery_address: cart.delivery_address,
      delivery_zone_id: cart.delivery_zone_id,
      delivery_instructions: cart.delivery_instructions,
      items: cart.items,
      free_item: cart.free_item,
      subtotal: cartSubtotal,
      delivery_fee: cartDeliveryFee,
      pass_discount: cartMemberDiscount,
      credit_applied: cartCreditApplied,
      total: cartTotal,
      payment_method: cart.payment_method,
      age_verified: cart.age_verified,
      requires_id_check: cart.requires_id_check
    };

    const newOrder = await api.createOrder(orderPayload);
    setOrders(prev => [newOrder, ...prev]);
    setCurrentOrder(newOrder);
    clearCart();

    // If member paid with essential credit, deduct credit locally & server-side
    if (cartCreditApplied > 0 && activePass) {
      const updatedPass = {
        ...activePass,
        credit_used: activePass.credit_used + cartCreditApplied,
        credit_remaining: Math.max(0, activePass.credit_remaining - cartCreditApplied),
        member_orders_count: activePass.member_orders_count + 1
      };
      setActivePass(updatedPass);
    }

    addToast('Order Placed!', `Riders rolling out for ${newOrder.order_number}. Target arrival ≤60 min.`, 'success');
    refreshData();
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string): Promise<Order> => {
    const updated = await api.updateOrderStatus(orderId, {
      status,
      rider_id: currentRider?.id,
      rider_name: currentRider?.name,
      rider_notes: notes
    });
    setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    if (currentOrder?.id === orderId) {
      setCurrentOrder(updated);
    }
    addToast('Status Updated', `Order ${updated.order_number} marked as ${status}.`, 'info');
    refreshData();
    return updated;
  };

  const toggleMemberPass = async (targetTier: PassTier = 'TRADER', registeredCapacities?: BatteryCapacity[]) => {
    try {
      if (activePass && activePass.subscription_status === 'ACTIVE') {
        // If switching tier
        if (activePass.pass_type !== targetTier) {
          const updated = await api.updateTraderPass(activePass.id, {
            pass_type: targetTier,
            registered_battery_capacities: registeredCapacities
          });
          setActivePass(updated);
          addToast(
            'Pass Tier Updated!',
            `Switched to ${targetTier === 'COMBO' ? 'Combined Pass ($30/mo)' : targetTier === 'TESLA' ? 'Tesla Pass ($20/mo)' : 'Trader Pass ($20/mo)'}.`,
            'success'
          );
          refreshData();
          return;
        }
        // If clicking same active pass, pause it
        const updated = await api.updateTraderPass(activePass.id, 'PAUSED');
        setActivePass(updated);
        addToast('Membership Paused', 'Your pass is paused. Reactivate anytime.', 'info');
      } else if (activePass) {
        const updated = await api.updateTraderPass(activePass.id, {
          subscription_status: 'ACTIVE',
          pass_type: targetTier,
          registered_battery_capacities: registeredCapacities
        });
        setActivePass(updated);
        addToast(
          'Membership Active!',
          `${targetTier === 'COMBO' ? 'Combined Pass ($30/mo)' : targetTier === 'TESLA' ? 'Tesla Pass ($20/mo)' : 'Trader Pass ($20/mo)'} activated.`,
          'success'
        );
      } else {
        const newSub = await api.subscribeTraderPass({
          customer_id: 'cust-current',
          customer_name: cart.customer_name || 'Alex J.',
          customer_email: 'alex.j@manchester.net',
          pass_type: targetTier,
          registered_capacities: registeredCapacities || ['5000', '10000']
        });
        setActivePass(newSub);
        addToast(
          `Welcome to ${targetTier === 'COMBO' ? 'Combined Pass' : targetTier === 'TESLA' ? 'Tesla Pass' : 'Trader Pass'}!`,
          targetTier === 'TESLA'
            ? 'Tesla 2k-20k mAh battery hot-swap network is ready.'
            : targetTier === 'COMBO'
            ? '$20 Essential Credit & Unlimited Tesla Battery Swaps active.'
            : '$20 Essential Credit loaded to your wallet.',
          'success'
        );
      }
      refreshData();
    } catch (e: any) {
      addToast('Membership Error', e.message || 'Could not update subscription', 'error');
    }
  };

  const requestBatteryExchange = async (
    capacity: BatteryCapacity,
    address?: string,
    notes?: string,
    exchangeType: 'DELIVERY_DISPATCH' | 'STREET_SWAP' | 'HUB_WALKUP' = 'DELIVERY_DISPATCH'
  ): Promise<BatteryExchangeRecord> => {
    try {
      const result = await api.requestBatteryExchange({
        customer_id: activePass?.customer_id || 'cust-current',
        customer_name: activePass?.customer_name || cart.customer_name || 'Tesla Pass Member',
        customer_phone: cart.customer_phone || '(603) 555-0144',
        capacity,
        exchange_type: exchangeType,
        delivery_address: address || cart.delivery_address || '875 Elm St, Manchester, NH',
        notes: notes || `BYO Pack Swap: ${capacity} mAh handover for full pack`
      });

      setBatteryExchanges(prev => [result, ...prev]);
      addToast(
        'Battery Swap Dispatched!',
        `Courier en route with full ${capacity} mAh pack. Hand over dead pack upon arrival.`,
        'success'
      );
      refreshData();
      return result;
    } catch (e: any) {
      addToast('Exchange Error', e.message || 'Failed to dispatch battery swap', 'error');
      throw e;
    }
  };

  const refreshBatteryHubs = async () => {
    try {
      const [hubs, resList] = await Promise.all([
        api.getBatteryHubs(),
        api.getBatteryReservations()
      ]);
      setBatteryHubs(hubs);
      setBatteryReservations(resList);
    } catch (e) {
      console.warn('Could not refresh battery hubs:', e);
    }
  };

  const reserveBatteryPack = async (
    hubId: string,
    capacity: BatteryCapacity,
    options?: {
      holdDuration?: number;
      pickupMode?: 'HUB_WALKUP' | 'COURIER_DISPATCH';
      notes?: string;
    }
  ): Promise<BatteryReservation> => {
    try {
      const res = await api.reserveBatteryPack({
        hub_id: hubId,
        capacity,
        hold_duration_minutes: options?.holdDuration || 30,
        pickup_mode: options?.pickupMode || 'HUB_WALKUP',
        notes: options?.notes,
        customer_name: activePass?.customer_name || cart.customer_name || 'Tesla Pass Member',
        customer_phone: cart.customer_phone || '(603) 555-0144'
      });

      setBatteryReservations(prev => [res.reservation, ...prev.filter(r => r.id !== res.reservation.id)]);
      setBatteryHubs(prev => prev.map(h => h.id === res.hub.id ? res.hub : h));

      addToast(
        'Battery Pack Reserved!',
        `${capacity} mAh pack held at ${res.reservation.hub_name}. Code: ${res.reservation.reservation_code}`,
        'success'
      );

      return res.reservation;
    } catch (e: any) {
      addToast('Reservation Error', e.message || 'Failed to reserve battery pack', 'error');
      throw e;
    }
  };

  const cancelBatteryReservation = async (reservationId: string) => {
    try {
      const res = await api.cancelBatteryReservation(reservationId);
      setBatteryReservations(prev => prev.map(r => r.id === reservationId ? res.reservation : r));
      await refreshBatteryHubs();
      addToast('Reservation Released', 'Your battery pack reservation has been cancelled.', 'info');
    } catch (e: any) {
      addToast('Error', e.message || 'Failed to cancel reservation', 'error');
      throw e;
    }
  };

  const claimBatteryReservation = async (reservationId: string) => {
    try {
      const res = await api.claimBatteryReservation(reservationId);
      setBatteryReservations(prev => prev.map(r => r.id === reservationId ? res.reservation : r));
      setBatteryExchanges(prev => [res.exchange, ...prev]);
      await refreshBatteryHubs();
      addToast(
        'Battery Swap Complete!',
        `Handover verified. Pack issued (${res.exchange.capacity} mAh).`,
        'success'
      );
    } catch (e: any) {
      addToast('Error', e.message || 'Failed to claim pack', 'error');
      throw e;
    }
  };

  const applyEssentialCredit = (amount: number) => {
    // credit handled in payment selector
  };

  const enableCleanBuild = async () => {
    localStorage.setItem('247_clean_build', 'true');
    localStorage.setItem('247_onboarding_completed', 'true');
    localStorage.setItem('trader24_clean_build', 'true');
    localStorage.setItem('trader24_onboarding_completed', 'true');
    setCleanBuild(true);
    setDemoMode(false);
    setOrders(prev => prev.filter(o => !o.id.includes('mock') && !o.notes?.toLowerCase().includes('mock')));
    addToast('Clean Build Active', 'All demo controls and synthetic mock data dismissed.', 'success');
  };

  const resetDemoState = async () => {
    await api.resetDemoData();
    clearCart();
    await refreshData();
    addToast('Demo Reset', '247 system reset to clean seed data.', 'info');
  };

  const addMockDelivery = async (params?: { status?: string; delivery_address?: string; customer_name?: string }) => {
    try {
      const order = await api.createMockOrder(params);
      setCurrentOrder(order);
      await refreshData();
      addToast(
        'Mock Delivery Dispatched',
        `${order.order_number} (${order.status.replace(/_/g, ' ')}) at ${order.delivery_address}`,
        'success'
      );
      return order;
    } catch (e: any) {
      addToast('Error', e.message || 'Failed to dispatch mock delivery', 'error');
      throw e;
    }
  };

  const seedMockDeliveries = async () => {
    try {
      const res = await api.seedMockDeliveries();
      await refreshData();
      addToast('Mock Deliveries Seeded', `Loaded ${res.count} mock deliveries into dispatch queue.`, 'success');
    } catch (e: any) {
      addToast('Error', e.message || 'Failed to seed deliveries', 'error');
    }
  };

  return (
    <StoreContext.Provider
      value={{
        role,
        setRole,
        demoMode,
        setDemoMode,
        cleanBuild,
        setCleanBuild,
        enableCleanBuild,
        products,
        approvedProducts,
        orders,
        currentOrder,
        setCurrentOrder,
        serviceZones,
        settings,
        freeSettings,
        riders,
        currentRider,
        setCurrentRider,
        activePass,
        batteryExchanges,
        batteryHubs,
        batteryReservations,
        hasBatteryPrivilege,
        hasDeliveryPrivilege,
        analytics,
        loading,
        error,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        selectFreeItem,
        setDeliveryAddress,
        setDeliveryZoneId,
        setDeliveryInstructions,
        setCustomerInfo,
        setPaymentMethod,
        setAgeVerified,
        clearCart,
        cartSubtotal,
        cartDeliveryFee,
        cartMemberDiscount,
        cartCreditApplied,
        cartTotal,
        cartItemCount,
        placeOrder,
        updateOrderStatus,
        toggleMemberPass,
        requestBatteryExchange,
        reserveBatteryPack,
        cancelBatteryReservation,
        claimBatteryReservation,
        refreshBatteryHubs,
        applyEssentialCredit,
        refreshData,
        resetDemoState,
        addMockDelivery,
        seedMockDeliveries,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
