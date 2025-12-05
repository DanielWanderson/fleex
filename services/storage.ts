import { UserProfile, LinkItem, Product, Service, PlanType, StatPoint, Category, Order, CartItem, Coupon, AbandonedCart, ActivityLog } from '../types';
import { db, fs } from './firebase';

// Helper to handle both Firebase and LocalStorage with a TIMEOUT
// If Firebase hangs for > 2 seconds, we force fallback to LocalStorage
const tryFirestore = async <T>(operation: () => Promise<T>, fallback: () => T): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firebase Timeout")), 2500)
    );

    try {
        // Race the operation against the timeout
        return await Promise.race([operation(), timeout]);
    } catch (e) {
        console.warn("Firebase operation failed or timed out (using fallback):", e);
        return fallback();
    }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const INITIAL_STATS: StatPoint[] = Array.from({ length: 7 }).map((_, i) => ({
  date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { weekday: 'short' }),
  views: 0,
  clicks: 0,
  sales: 0,
  revenue: 0
}));

let CURRENT_USER_ID = localStorage.getItem('fleex_current_uid') || '';

const getUserId = () => {
    if (!CURRENT_USER_ID) throw new Error("No user logged in");
    return CURRENT_USER_ID;
};

// LOCAL STORAGE HELPERS (Fallback)
const ls = {
    get: <T>(key: string): T | null => {
        const d = localStorage.getItem(key);
        return d ? JSON.parse(d) : null;
    },
    set: (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val))
};

export const api = {
  getUser: async (): Promise<UserProfile | null> => {
    if (!CURRENT_USER_ID) return null;
    
    return tryFirestore(
        async () => {
            const docRef = fs.doc(db, "users", CURRENT_USER_ID);
            const docSnap = await fs.getDoc(docRef);
            if (docSnap.exists()) return docSnap.data() as UserProfile;
            return null;
        },
        () => ls.get<UserProfile>(`user_${CURRENT_USER_ID}`)
    );
  },

  registerUser: async (data: { name: string, slug: string, email: string }) => {
     const newUserId = `user_${Date.now()}`;
     const newUser: UserProfile = {
       id: newUserId,
       name: data.name,
       slug: data.slug,
       email: data.email,
       bio: `Bem vindo à loja de ${data.name}`,
       avatarUrl: 'https://picsum.photos/200',
       plan: PlanType.PROFESSIONAL, 
       themeId: 'minimal-light',
       primaryColor: '#0ea5e9',
       phone: '',
       pixKey: '',
       storeCep: '',
       autoPaymentActive: false,
       subAccounts: [],
       activityLogs: [{ id: 'log_init', actorName: 'System', action: 'Conta Criada', timestamp: new Date().toISOString() }]
     };
     
     // Use tryFirestore logic manually here to handle the creation flow
     try {
         const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
         await Promise.race([
             fs.setDoc(fs.doc(db, "users", newUserId), newUser),
             timeout
         ]);
         console.log("User created in Firestore");
     } catch (e) {
         console.warn("Firestore write failed, saving locally.", e);
         ls.set(`user_${newUserId}`, newUser);
         // Initialize Mock Data Locally
         ls.set(`links_${newUserId}`, []);
         ls.set(`products_${newUserId}`, []);
     }
     
     CURRENT_USER_ID = newUserId;
     localStorage.setItem('fleex_current_uid', newUserId);
     return newUser;
  },

  loginMock: async (email: string, password: string): Promise<UserProfile> => {
    // 1. Try Firestore Query
    try {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
        const q = fs.query(fs.collection(db, "users"), fs.where("email", "==", email));
        const querySnapshot = await Promise.race([fs.getDocs(q), timeout]) as any;
        
        if (!querySnapshot.empty) {
            const user = querySnapshot.docs[0].data() as UserProfile;
            CURRENT_USER_ID = user.id;
            localStorage.setItem('fleex_current_uid', user.id);
            return user;
        }
    } catch (e) { console.warn("Firestore Login failed", e); }

    // 2. Fallback: Search LocalStorage keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('user_')) {
            const user = ls.get<UserProfile>(key);
            if (user && user.email === email) {
                 CURRENT_USER_ID = user.id;
                 localStorage.setItem('fleex_current_uid', user.id);
                 return user;
            }
        }
    }
    
    throw new Error("Usuário não encontrado.");
  },

  loginSubAccountMock: async (slug: string, name: string, password: string): Promise<{user: UserProfile, actorName: string} | null> => {
      // 1. Try Firestore
      try {
          const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
          const q = fs.query(fs.collection(db, "users"), fs.where("slug", "==", slug));
          const snap = await Promise.race([fs.getDocs(q), timeout]) as any;
          
          if(!snap.empty) {
              const user = snap.docs[0].data() as UserProfile;
              const sub = user.subAccounts?.find(s => s.name === name && s.password === password);
              if(sub) {
                  CURRENT_USER_ID = user.id;
                  localStorage.setItem('fleex_current_uid', user.id);
                  return { user, actorName: sub.name };
              }
          }
      } catch(e) {}

      // 2. Fallback
       for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('user_')) {
            const user = ls.get<UserProfile>(key);
            if (user && user.slug === slug) {
                 const sub = user.subAccounts?.find(s => s.name === name && s.password === password);
                 if(sub) {
                     CURRENT_USER_ID = user.id;
                     localStorage.setItem('fleex_current_uid', user.id);
                     return { user, actorName: sub.name };
                 }
            }
        }
      }
      return null;
  },
  
  updateUser: async (updates: Partial<UserProfile>) => {
    const uid = getUserId();
    
    // Optimistic Update
    const current = await api.getUser();
    const updated = { ...current, ...updates } as UserProfile;
    
    // Always update local cache first for speed
    ls.set(`user_${uid}`, updated);

    // Try background update to Firestore
    try {
        await fs.updateDoc(fs.doc(db, "users", uid), updates);
    } catch (e) {
        console.warn("Failed to sync update to Firestore");
    }
    
    return updated;
  },

  logActivity: async (actorName: string, action: string, details?: string) => {
      const uid = getUserId();
      const newLog: ActivityLog = {
          id: Date.now().toString(),
          actorName,
          action,
          details,
          timestamp: new Date().toISOString()
      };
      
      try {
          const docRef = fs.doc(db, "users", uid);
          const snap = await fs.getDoc(docRef);
          if (snap.exists()) {
             const user = snap.data() as UserProfile;
             const logs = [newLog, ...(user.activityLogs || [])].slice(0, 50);
             await fs.updateDoc(docRef, { activityLogs: logs });
          }
      } catch (e) {
          const user = ls.get<UserProfile>(`user_${uid}`);
          if (user) {
              user.activityLogs = [newLog, ...(user.activityLogs || [])].slice(0, 50);
              ls.set(`user_${uid}`, user);
          }
      }
  },

  // --- GENERIC COLLECTION HANDLERS (Hybrid) ---
  _getCollection: async <T>(colName: string): Promise<T[]> => {
      const uid = getUserId();
      return tryFirestore(
          async () => {
             const snap = await fs.getDocs(fs.collection(db, "users", uid, colName));
             return snap.docs.map(d => d.data() as T);
          },
          () => ls.get<T[]>(`${colName}_${uid}`) || []
      );
  },

  _saveCollection: async <T extends {id: string}>(colName: string, items: T[]) => {
      const uid = getUserId();
      
      // Always save local first
      ls.set(`${colName}_${uid}`, items);

      try {
          // Firestore Batch write is complex in generic func, doing parallel sets
          // This is "fire and forget" mostly
          Promise.all(items.map(i => fs.setDoc(fs.doc(db, "users", uid, colName, i.id), i))).catch(e => console.warn("Sync failed"));
      } catch (e) {
         // Ignore
      }
  },

  getLinks: async () => api._getCollection<LinkItem>('links'),
  setLinks: async (links: LinkItem[]) => api._saveCollection('links', links),

  getCategories: async () => api._getCollection<Category>('categories'),
  setCategories: async (cats: Category[]) => api._saveCollection('categories', cats),

  getProducts: async () => {
      const products = await api._getCollection<Product>('products');
      return products.map(p => ({ ...p, stock: p.stock ?? 0, variants: p.variants ?? [] }));
  },
  setProducts: async (products: Product[]) => api._saveCollection('products', products),

  getServices: async () => api._getCollection<Service>('services'),
  setServices: async (services: Service[]) => api._saveCollection('services', services),

  getCoupons: async () => api._getCollection<Coupon>('coupons'),
  setCoupons: async (coupons: Coupon[]) => api._saveCollection('coupons', coupons),

  getStats: async () => INITIAL_STATS, // Mock for now
  
  getOrders: async () => {
      const orders = await api._getCollection<Order>('orders');
      return orders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  
  addOrder: async (order: Order) => {
    const uid = getUserId();
    
    // Save local
    const orders = ls.get<Order[]>(`orders_${uid}`) || [];
    ls.set(`orders_${uid}`, [...orders, order]);

    try {
        await fs.setDoc(fs.doc(db, "users", uid, "orders", order.id), order);
    } catch (e) {
       console.warn("Order sync failed");
    }
  },

  updateStock: async (cartItems: CartItem[]) => {
    // Optimistic stock update not fully implemented for fallback in this snippet
    // Assumed dashboard refresh will handle it
  },

  updateOrder: async (orderId: string, updates: Partial<Order>) => {
      const uid = getUserId();
      
      // Update local
      const orders = ls.get<Order[]>(`orders_${uid}`) || [];
      const updated = orders.map(o => o.id === orderId ? { ...o, ...updates } : o);
      ls.set(`orders_${uid}`, updated);

      try {
          await fs.updateDoc(fs.doc(db, "users", uid, "orders", orderId), updates);
      } catch (e) {}
      
      return updated;
  },

  getAbandonedCarts: async () => api._getCollection<AbandonedCart>('abandoned_carts'),
  saveAbandonedCart: async (cart: AbandonedCart) => {
      const uid = getUserId();
      
      const carts = ls.get<AbandonedCart[]>(`abandoned_carts_${uid}`) || [];
      ls.set(`abandoned_carts_${uid}`, [...carts, cart]);

      try {
          await fs.setDoc(fs.doc(db, "users", uid, "abandoned_carts", cart.id), cart);
      } catch (e) {}
  },

  exportCustomersToCSV: async () => {
    const orders = await api.getOrders();
    let csv = "Nome,Telefone,Data do Pedido,Produto,Valor\n";
    orders.forEach(order => {
        const line = `"${order.customerName}","${order.customerPhone}","${new Date(order.date).toLocaleDateString()}","${order.productTitle}","${order.productPrice}"`;
        csv += line + "\n";
    });
    return csv;
  },

  calculateFreight: async (cep: string): Promise<{service: string, price: number, days: number}[]> => {
      await new Promise(r => setTimeout(r, 1000)); 
      
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) throw new Error("CEP inválido. O CEP deve conter 8 números.");
      if (/^0+$/.test(cleanCep)) throw new Error("CEP não encontrado.");
      
      const lastDigit = parseInt(cleanCep.slice(-1));
      const basePrice = 18 + lastDigit; 
      return [
          { service: 'PAC (Correios)', price: basePrice, days: 5 + (lastDigit % 3) },
          { service: 'SEDEX (Correios)', price: basePrice * 1.6, days: 1 + (lastDigit % 2) },
          { service: 'JadLog .Com', price: basePrice * 0.9, days: 7 }
      ];
  },

  getDemoData: async () => {
     return {
      user: {
        id: 'demo',
        name: 'Demo Store',
        slug: 'demo',
        email: 'demo@fleex.com',
        plan: PlanType.PRO,
        themeId: 'midnight',
        avatarUrl: 'https://picsum.photos/200',
        bio: 'Loja demonstração',
        primaryColor: '#000',
        phone: '',
        pixKey: ''
      } as UserProfile,
      links: [],
      products: [],
      categories: [],
      services: [] as Service[]
    };
  }
};