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

export interface DocSnapshot {
  id: string;
  exists: boolean;
  data(): any;
}

export interface QuerySnapshot {
  docs: DocSnapshot[];
  empty: boolean;
  size: number;
}

export interface DocReference {
  id: string;
  collectionName: string;
  get(): Promise<DocSnapshot>;
  set(data: any, options?: { merge?: boolean }): Promise<void>;
  delete(): Promise<void>;
}

export class InMemoryCollection {
  name: string;
  docs: Map<string, any> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  doc(id: string): DocReference {
    return {
      id,
      collectionName: this.name,
      get: async (): Promise<DocSnapshot> => {
        const item = this.docs.get(id);
        return {
          id,
          exists: item !== undefined,
          data: () => (item ? JSON.parse(JSON.stringify(item)) : undefined)
        };
      },
      set: async (data: any, options?: { merge?: boolean }): Promise<void> => {
        if (options?.merge && this.docs.has(id)) {
          const existing = this.docs.get(id);
          this.docs.set(id, { ...existing, ...data });
        } else {
          this.docs.set(id, { ...data, id: id || data.id });
        }
      },
      delete: async (): Promise<void> => {
        this.docs.delete(id);
      }
    };
  }

  where(field: string, op: string, val: any): CollectionQuery {
    return new CollectionQuery(this).where(field, op, val);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): CollectionQuery {
    return new CollectionQuery(this).orderBy(field, dir);
  }

  limit(count: number): CollectionQuery {
    return new CollectionQuery(this).limit(count);
  }

  async get(): Promise<QuerySnapshot> {
    return new CollectionQuery(this).get();
  }
}

export class CollectionQuery {
  collection: InMemoryCollection;
  filters: Array<{ field: string; op: string; val: any }> = [];
  sortField?: string;
  sortDirection: 'asc' | 'desc' = 'asc';
  limitCount?: number;

  constructor(collection: InMemoryCollection) {
    this.collection = collection;
  }

  where(field: string, op: string, val: any): CollectionQuery {
    this.filters.push({ field, op, val });
    return this;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): CollectionQuery {
    this.sortField = field;
    this.sortDirection = dir;
    return this;
  }

  limit(count: number): CollectionQuery {
    this.limitCount = count;
    return this;
  }

  async get(): Promise<QuerySnapshot> {
    let items = Array.from(this.collection.docs.entries()).map(([id, data]) => ({
      id,
      data
    }));

    for (const filter of this.filters) {
      items = items.filter(item => {
        const itemVal = item.data[filter.field];
        if (filter.op === '==' || filter.op === '===') {
          return itemVal === filter.val;
        }
        if (filter.op === '!=') {
          return itemVal !== filter.val;
        }
        if (filter.op === '>') {
          return itemVal > filter.val;
        }
        if (filter.op === '>=') {
          return itemVal >= filter.val;
        }
        if (filter.op === '<') {
          return itemVal < filter.val;
        }
        if (filter.op === '<=') {
          return itemVal <= filter.val;
        }
        if (filter.op === 'array-contains') {
          return Array.isArray(itemVal) && itemVal.includes(filter.val);
        }
        if (filter.op === 'in') {
          return Array.isArray(filter.val) && filter.val.includes(itemVal);
        }
        return true;
      });
    }

    if (this.sortField) {
      const field = this.sortField;
      const factor = this.sortDirection === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        const valA = a.data[field] ?? '';
        const valB = b.data[field] ?? '';
        if (valA < valB) return -1 * factor;
        if (valA > valB) return 1 * factor;
        return 0;
      });
    }

    if (this.limitCount !== undefined && this.limitCount > 0) {
      items = items.slice(0, this.limitCount);
    }

    const docs: DocSnapshot[] = items.map(item => ({
      id: item.id,
      exists: true,
      data: () => JSON.parse(JSON.stringify(item.data))
    }));

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length
    };
  }
}

export class WriteBatch {
  operations: Array<() => Promise<void>> = [];

  set(docRef: DocReference, data: any, options?: { merge?: boolean }) {
    this.operations.push(async () => {
      await docRef.set(data, options);
    });
    return this;
  }

  delete(docRef: DocReference) {
    this.operations.push(async () => {
      await docRef.delete();
    });
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.operations) {
      await op();
    }
  }
}

export class StoreDb {
  private collections: Map<string, InMemoryCollection> = new Map();

  constructor() {
    this.initDefaultData();
  }

  private initDefaultData() {
    // 1. Products
    const productsCol = this.getOrCreateCol('products');
    INITIAL_PRODUCTS.forEach(p => productsCol.docs.set(p.id, JSON.parse(JSON.stringify(p))));

    // 2. Service Zones
    const zonesCol = this.getOrCreateCol('serviceZones');
    INITIAL_SERVICE_ZONES.forEach(z => zonesCol.docs.set(z.id, JSON.parse(JSON.stringify(z))));

    // 3. Resources
    const resCol = this.getOrCreateCol('resources');
    INITIAL_RESOURCES.forEach(r => resCol.docs.set(r.id, JSON.parse(JSON.stringify(r))));

    // 4. Riders
    const ridersCol = this.getOrCreateCol('riders');
    INITIAL_RIDERS.forEach(r => ridersCol.docs.set(r.id, JSON.parse(JSON.stringify(r))));

    // 5. Settings
    const settingsCol = this.getOrCreateCol('settings');
    settingsCol.docs.set('global', JSON.parse(JSON.stringify(INITIAL_SETTINGS)));

    // 6. Free Essential Settings
    const freeCol = this.getOrCreateCol('freeSettings');
    freeCol.docs.set('global', JSON.parse(JSON.stringify(INITIAL_FREE_SETTINGS)));

    // 7. Economics Config
    const econCol = this.getOrCreateCol('economicsConfig');
    econCol.docs.set('global', JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG)));

    // 8. Subscribers
    const subsCol = this.getOrCreateCol('traderPassSubscriptions');
    INITIAL_SUBSCRIBERS.forEach(s => subsCol.docs.set(s.id, JSON.parse(JSON.stringify(s))));

    // 9. Orders
    const ordersCol = this.getOrCreateCol('orders');
    INITIAL_ORDERS.forEach(o => ordersCol.docs.set(o.id, JSON.parse(JSON.stringify(o))));

    // 10. Free Distributions
    const distCol = this.getOrCreateCol('freeDistributions');
    INITIAL_FREE_DISTRIBUTIONS.forEach(d => distCol.docs.set(d.id, JSON.parse(JSON.stringify(d))));

    // 11. Sponsors
    const spCol = this.getOrCreateCol('sponsors');
    INITIAL_SPONSORS.forEach(s => spCol.docs.set(s.id, JSON.parse(JSON.stringify(s))));

    // 12. Inventory Transactions
    const txCol = this.getOrCreateCol('inventoryTransactions');
    INITIAL_INVENTORY_TRANSACTIONS.forEach(t => txCol.docs.set(t.id, JSON.parse(JSON.stringify(t))));

    // 13. Audit Logs
    const logCol = this.getOrCreateCol('auditLogs');
    INITIAL_AUDIT_LOGS.forEach(l => logCol.docs.set(l.id, JSON.parse(JSON.stringify(l))));

    // 14. Users
    const usersCol = this.getOrCreateCol('users');
    usersCol.docs.set('admin-default', {
      id: 'admin-default',
      email: 'admin@trader24.net',
      display_name: '24 Admin',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true
    });
  }

  private getOrCreateCol(name: string): InMemoryCollection {
    let col = this.collections.get(name);
    if (!col) {
      col = new InMemoryCollection(name);
      this.collections.set(name, col);
    }
    return col;
  }

  collection(name: string): InMemoryCollection {
    return this.getOrCreateCol(name);
  }

  batch(): WriteBatch {
    return new WriteBatch();
  }

  async runTransaction<T>(updateFunction: (transaction: {
    get: (ref: DocReference) => Promise<DocSnapshot>;
    set: (ref: DocReference, data: any, options?: { merge?: boolean }) => void;
    delete: (ref: DocReference) => void;
  }) => Promise<T>): Promise<T> {
    const sets: Array<() => Promise<void>> = [];

    const transactionWrapper = {
      get: async (ref: DocReference) => ref.get(),
      set: (ref: DocReference, data: any, options?: { merge?: boolean }) => {
        sets.push(async () => {
          await ref.set(data, options);
        });
      },
      delete: (ref: DocReference) => {
        sets.push(async () => {
          await ref.delete();
        });
      }
    };

    const result = await updateFunction(transactionWrapper);
    for (const op of sets) {
      await op();
    }
    return result;
  }
}

let storeInstance: StoreDb | null = null;

export function getFirestoreDb(): any {
  if (!storeInstance) {
    storeInstance = new StoreDb();
  }
  return storeInstance;
}

