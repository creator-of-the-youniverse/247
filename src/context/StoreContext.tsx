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
  PaymentMethod
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

  // Actions
  placeOrder: () => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string, notes?: string) => Promise<Order>;
  toggleMemberPass: () => Promise<void>;
  applyEssentialCredit: (amount: number) => void;
  refreshData: () => Promise<void>;
  resetDemoState: () => Promise<void>;
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
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_SETTINGS);
  const [freeSettings, setFreeSettings] = useState<FreeEssentialSettings>(DEFAULT_FREE_SETTINGS);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [currentRider, setCurrentRider] = useState<Rider | null>(null);
  const [activePass, setActivePass] = useState<TraderPassSubscription | null>(null);
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
        analyticsData
      ] = await Promise.all([
        api.getProducts(),
        api.getOrders(),
        api.getZones(),
        api.getSettings(),
        api.getFreeEssentials(),
        api.getTraderPass(),
        api.getRiders(),
        api.getAnalytics()
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

  // Calculate pricing
  const isMember = activePass?.subscription_status === 'ACTIVE';

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
      throw new Error(`24 is currently ${settings.service_status}. Orders paused for rider safety.`);
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

    addToast('Order Placed!', `Trader rolling for ${newOrder.order_number}. Target arrival ≤60 min.`, 'success');
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

  const toggleMemberPass = async () => {
    if (activePass && activePass.subscription_status === 'ACTIVE') {
      const updated = await api.updateTraderPass(activePass.id, 'PAUSED');
      setActivePass(updated);
      addToast('Trader Pass Paused', 'Your pass is paused.', 'info');
    } else if (activePass) {
      const updated = await api.updateTraderPass(activePass.id, 'ACTIVE');
      setActivePass(updated);
      addToast('Trader Pass Active!', '$20 Monthly Essential Credit & Free Delivery active.', 'success');
    } else {
      const newSub = await api.subscribeTraderPass({
        customer_id: 'cust-current',
        customer_name: cart.customer_name || 'Alex J.',
        customer_email: 'alex.j@manchester.net'
      });
      setActivePass(newSub);
      addToast('Welcome to Trader Pass!', '$20 Essential Credit loaded to your wallet.', 'success');
    }
    refreshData();
  };

  const applyEssentialCredit = (amount: number) => {
    // credit handled in payment selector
  };

  const resetDemoState = async () => {
    await api.resetDemoData();
    clearCart();
    await refreshData();
    addToast('Demo Reset', '24 system reset to clean seed data.', 'info');
  };

  return (
    <StoreContext.Provider
      value={{
        role,
        setRole,
        demoMode,
        setDemoMode,
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
        applyEssentialCredit,
        refreshData,
        resetDemoState,
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
