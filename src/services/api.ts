import {
  Product,
  Order,
  TraderPassSubscription,
  SponsorContribution,
  ServiceZone,
  CommunityResource,
  Rider,
  DeliverySettings,
  FreeEssentialSettings,
  AuditLogEntry,
  BusinessMetrics,
  CartLoadoutRecommendation,
  UserProfile
} from '../types';

let currentAuthToken: string | null = null;

export const api = {
  setAuthToken(token: string | null) {
    currentAuthToken = token;
  },

  getAuthToken(): string | null {
    return currentAuthToken;
  },

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (currentAuthToken) {
      headers['Authorization'] = `Bearer ${currentAuthToken}`;
    }

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(url, {
      ...options,
      headers
    });
  },

  // User Profile & Authentication
  async getCurrentUserProfile(): Promise<UserProfile> {
    const res = await this.fetchWithAuth('/api/auth/me');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch user profile');
    }
    return res.json();
  },

  async registerUserProfile(data: { email: string; display_name: string; phone?: string; role?: string }): Promise<UserProfile> {
    const res = await this.fetchWithAuth('/api/auth/register-profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register profile');
    }
    return res.json();
  },

  // Products
  async getProducts(params?: { category?: string; compliance_status?: string; customer_view?: boolean; search?: string }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.compliance_status) query.append('compliance_status', params.compliance_status);
    if (params?.customer_view !== undefined) query.append('customer_view', String(params.customer_view));
    if (params?.search) query.append('search', params.search);
    
    const res = await this.fetchWithAuth(`/api/products?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await this.fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create product');
    }
    return res.json();
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await this.fetchWithAuth(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update product');
    }
    return res.json();
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await this.fetchWithAuth(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete product');
    }
  },

  // Inventory
  async getInventory(): Promise<{ products: Product[]; transactions: any[]; locations: string[] }> {
    const res = await this.fetchWithAuth('/api/inventory');
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async transferInventory(data: { product_id: string; quantity: number; from_location: string; to_location: string; reason?: string; user?: string }): Promise<any> {
    const res = await this.fetchWithAuth('/api/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to transfer inventory');
    }
    return res.json();
  },

  async adjustInventory(data: { product_id: string; type: string; quantity: number; reason?: string; user?: string }): Promise<any> {
    const res = await this.fetchWithAuth('/api/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to adjust inventory');
    }
    return res.json();
  },

  // Loadout
  async getCartLoadout(): Promise<{ recommendations: CartLoadoutRecommendation[]; cart_stats: any }> {
    const res = await this.fetchWithAuth('/api/loadout');
    if (!res.ok) throw new Error('Failed to fetch cart loadout');
    return res.json();
  },

  // Orders
  async getOrders(params?: { status?: string; customer_id?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.customer_id) query.append('customer_id', params.customer_id);
    const res = await this.fetchWithAuth(`/api/orders?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch orders');
    }
    return res.json();
  },

  async createOrder(orderData: any): Promise<Order> {
    const res = await this.fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to place order');
    }
    return res.json();
  },

  async updateOrderStatus(id: string, update: { status: string; rider_id?: string; rider_name?: string; rider_notes?: string }): Promise<Order> {
    const res = await this.fetchWithAuth(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(update)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  // Free Essentials
  async getFreeEssentials(): Promise<{ settings: FreeEssentialSettings; metrics: any; distributions: any[] }> {
    const res = await this.fetchWithAuth('/api/free-essentials');
    if (!res.ok) throw new Error('Failed to fetch free essentials');
    return res.json();
  },

  async updateFreeSettings(settings: Partial<FreeEssentialSettings>): Promise<FreeEssentialSettings> {
    const res = await this.fetchWithAuth('/api/free-essentials/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update free essential settings');
    }
    return res.json();
  },

  // Trader Pass
  async getTraderPass(): Promise<{ price_monthly: number; subscribers: TraderPassSubscription[]; active_count: number }> {
    const res = await this.fetchWithAuth('/api/trader-pass');
    if (!res.ok) throw new Error('Failed to fetch Trader Pass data');
    return res.json();
  },

  async subscribeTraderPass(data: { customer_id: string; customer_name: string; customer_email: string }): Promise<TraderPassSubscription> {
    const res = await this.fetchWithAuth('/api/trader-pass/subscribe', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to subscribe');
    }
    return res.json();
  },

  async updateTraderPass(id: string, status: string): Promise<TraderPassSubscription> {
    const res = await this.fetchWithAuth(`/api/trader-pass/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ subscription_status: status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update subscription');
    }
    return res.json();
  },

  // Sponsors & Community Supply Fund
  async getSponsors(): Promise<{ contributions: SponsorContribution[]; fund_balance: number; total_raised: number; total_funded_items: number; public_impact_statement: string }> {
    const res = await this.fetchWithAuth('/api/sponsors');
    if (!res.ok) throw new Error('Failed to fetch sponsors');
    return res.json();
  },

  async contributeSponsor(data: { sponsor_name?: string; is_anonymous?: boolean; amount: number; campaign?: string; message?: string }): Promise<SponsorContribution> {
    const res = await this.fetchWithAuth('/api/sponsors/contribute', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to contribute to Community Supply Fund');
    }
    return res.json();
  },

  // Zones & Settings
  async getZones(): Promise<ServiceZone[]> {
    const res = await this.fetchWithAuth('/api/zones');
    if (!res.ok) throw new Error('Failed to fetch zones');
    return res.json();
  },

  async updateZone(id: string, zone: Partial<ServiceZone>): Promise<ServiceZone> {
    const res = await this.fetchWithAuth(`/api/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(zone)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update zone');
    }
    return res.json();
  },

  async getSettings(): Promise<DeliverySettings> {
    const res = await this.fetchWithAuth('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<DeliverySettings>): Promise<DeliverySettings> {
    const res = await this.fetchWithAuth('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }
    return res.json();
  },

  // Resources
  async getResources(): Promise<CommunityResource[]> {
    const res = await this.fetchWithAuth('/api/resources');
    if (!res.ok) throw new Error('Failed to fetch resources');
    return res.json();
  },

  async createResource(resource: Partial<CommunityResource>): Promise<CommunityResource> {
    const res = await this.fetchWithAuth('/api/resources', {
      method: 'POST',
      body: JSON.stringify(resource)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create resource');
    }
    return res.json();
  },

  async updateResource(id: string, resource: Partial<CommunityResource>): Promise<CommunityResource> {
    const res = await this.fetchWithAuth(`/api/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(resource)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update resource');
    }
    return res.json();
  },

  // Riders
  async getRiders(): Promise<Rider[]> {
    const res = await this.fetchWithAuth('/api/riders');
    if (!res.ok) throw new Error('Failed to fetch riders');
    return res.json();
  },

  async updateRiderStatus(id: string, status: string): Promise<Rider> {
    const res = await this.fetchWithAuth(`/api/riders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update rider status');
    }
    return res.json();
  },

  // Compliance
  async getCompliance(): Promise<any> {
    const res = await this.fetchWithAuth('/api/compliance');
    if (!res.ok) throw new Error('Failed to fetch compliance');
    return res.json();
  },

  async reviewCompliance(data: { product_id: string; compliance_status: string; minimum_age?: number; requires_id?: boolean; notes?: string }): Promise<Product> {
    const res = await this.fetchWithAuth('/api/compliance/review', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit compliance review');
    }
    return res.json();
  },

  // Analytics & Audit Logs
  async getAnalytics(): Promise<BusinessMetrics> {
    const res = await this.fetchWithAuth('/api/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // PHASE 3A: ECONOMICS ENGINE & CART OPTIMIZER
  async getEconomicsConfig(): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/config');
    if (!res.ok) throw new Error('Failed to fetch economics config');
    return res.json();
  },

  async updateEconomicsConfig(config: any): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update economics config');
    }
    return res.json();
  },

  async getProductEconomics(): Promise<any[]> {
    const res = await this.fetchWithAuth('/api/economics/products');
    if (!res.ok) throw new Error('Failed to fetch product economics');
    return res.json();
  },

  async getOrderEconomics(): Promise<any[]> {
    const res = await this.fetchWithAuth('/api/economics/orders');
    if (!res.ok) throw new Error('Failed to fetch order economics');
    return res.json();
  },

  async getTraderPassEconomics(): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/trader-pass');
    if (!res.ok) throw new Error('Failed to fetch Trader Pass economics');
    return res.json();
  },

  async getFreeEssentialEconomics(): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/free-essentials');
    if (!res.ok) throw new Error('Failed to fetch free essential economics');
    return res.json();
  },

  async getCartOptimizer(): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/cart-optimizer');
    if (!res.ok) throw new Error('Failed to fetch cart optimizer results');
    return res.json();
  },

  async applyCartOptimization(): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/cart-optimizer/apply', {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to apply cart optimizer recommendations');
    }
    return res.json();
  },

  async getEconomicsDashboard(): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/dashboard');
    if (!res.ok) throw new Error('Failed to fetch economics dashboard');
    return res.json();
  },

  async getEconomicsAlerts(): Promise<any[]> {
    const res = await this.fetchWithAuth('/api/economics/alerts');
    if (!res.ok) throw new Error('Failed to fetch economics alerts');
    return res.json();
  },

  async runScenarioSimulation(inputs: any): Promise<any> {
    const res = await this.fetchWithAuth('/api/economics/scenario', {
      method: 'POST',
      body: JSON.stringify(inputs)
    });
    if (!res.ok) throw new Error('Failed to run scenario simulation');
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await this.fetchWithAuth('/api/audit-logs');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch audit logs');
    }
    return res.json();
  },

  // Demo Reset & Seeding
  async resetDemoData(): Promise<void> {
    const res = await this.fetchWithAuth('/api/demo/reset', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset demo data');
    }
  },

  // AI Endpoints
  async sendTraderAI(prompt: string): Promise<{
    interpretation: string;
    suggestedProducts: Product[];
    explanation: string;
    isEmergencyAlert: boolean;
    emergencyAdvice: string | null;
    relevantResources: CommunityResource[];
  }> {
    const res = await this.fetchWithAuth('/api/ai/send-trader', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('Send Trader AI error');
    return res.json();
  },

  async askTraderAI(question: string): Promise<{ answer: string }> {
    const res = await this.fetchWithAuth('/api/ai/ask-trader', {
      method: 'POST',
      body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error('Ask Trader AI error');
    return res.json();
  }
};
