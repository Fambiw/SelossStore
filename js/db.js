import { sampleProds, sampleBanners } from './sample-data.js';
import { SupabaseDB, isSupabaseConfigured } from './supabase.js';

export const DB = {
  g(k, d = null) {
    try { 
      const item = localStorage.getItem(k);
      return item ? JSON.parse(item) : d;
    } catch { 
      return d;
    }
  },
  s(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
  d(k) {
    localStorage.removeItem(k);
  },
  
  users() { return this.g('sl_users', []); },
  saveUsers(u) { this.s('sl_users', u); },
  findU(email) {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    return this.users().find(u => typeof u?.email === 'string' && u.email.toLowerCase() === normalized);
  },
  findById(id) { return this.users().find(u => u.id === id); },
  upsertU(user) {
    const us = this.users();
    const i = us.findIndex(u => u.id === user.id);
    if (i >= 0) {
      us[i] = user;
    } else {
      us.push(user);
    }
    this.saveUsers(us);
  },
  
  ses() { return this.g('sl_ses'); },
  setSes(s) { this.s('sl_ses', s); },
  clrSes() { this.d('sl_ses'); },
  
  prods() {
    // Read from localStorage first; seed from sample data only on first run
    const stored = this.g('sl_prods', null);
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
    const p = sampleProds();
    this.s('sl_prods', p);
    return p;
  },
  setProds(p) {
    const res = this.s('sl_prods', p);
    if (isSupabaseConfigured() && Array.isArray(p)) {
      p.forEach(item => SupabaseDB.upsertProduct(item).catch(() => {}));
    }
    return res;
  },
  delProd(id) {
    const ps = this.prods().filter(p => p.id !== id);
    this.s('sl_prods', ps);
    if (isSupabaseConfigured()) {
      SupabaseDB.deleteProduct(id).catch(() => {});
    }
    return ps;
  },

  banners() {
    const stored = this.g('sl_banners', null);
    if (stored && Array.isArray(stored)) return stored;
    return [];
  },
  setBanners(b) {
    if (!Array.isArray(b) || b.length > 5) return false;
    const res = this.s('sl_banners', b);
    if (res && isSupabaseConfigured()) {
      SupabaseDB.saveBanners(b).catch(() => {});
    }
    return res;
  },
  delBanner(id) {
    const bs = this.banners().filter(b => b.id !== id);
    const res = this.setBanners(bs);
    if (res && isSupabaseConfigured()) {
      SupabaseDB.deleteBanner(id).catch(() => {});
    }
    return res ? bs : null;
  },
  
  txs() { return this.g('sl_txs', []); },
  upsertTx(tx) {
    const ts = this.txs();
    const i = ts.findIndex(t => t.id === tx.id);
    if (i >= 0) {
      ts[i] = tx;
    } else {
      ts.unshift(tx);
    }
    this.s('sl_txs', ts);
    if (isSupabaseConfigured()) {
      SupabaseDB.upsertTransaction(tx).catch(() => {});
    }
    return tx;
  },

  /**
   * Sinkronisasi data cloud dengan Supabase (Produk, Banner, Transaksi)
   */
  async syncWithSupabase() {
    if (!isSupabaseConfigured()) return;
    try {
      console.log('🔄 [Supabase Sync] Memulai sinkronisasi cloud...');

      // 1. Sinkronisasi Produk
      const cloudProds = await SupabaseDB.getProducts();
      if (cloudProds && cloudProds.length > 0) {
        this.s('sl_prods', cloudProds);
        console.log(`✅ [Supabase Sync] ${cloudProds.length} produk disinkronkan dari Supabase`);
      } else if (cloudProds && cloudProds.length === 0) {
        // Jika database Supabase masih kosong, seed produk awal ke cloud
        const initialProds = sampleProds();
        console.log('🌱 [Supabase Sync] Seeding produk awal ke Supabase...');
        for (const prod of initialProds) {
          await SupabaseDB.upsertProduct(prod);
        }
        this.s('sl_prods', initialProds);
        console.log(`✅ [Supabase Sync] ${initialProds.length} produk berhasil di-seed ke Supabase!`);
      }

      // 2. Sinkronisasi Banner
      const cloudBanners = await SupabaseDB.getBanners();
      if (cloudBanners && cloudBanners.length > 0) {
        this.s('sl_banners', cloudBanners);
      } else if (cloudBanners && cloudBanners.length === 0) {
        const initialBanners = sampleBanners();
        if (initialBanners && initialBanners.length > 0) {
          await SupabaseDB.saveBanners(initialBanners);
          this.s('sl_banners', initialBanners);
        }
      }

      // 3. Sinkronisasi Transaksi
      const cloudTxs = await SupabaseDB.getTransactions();
      if (cloudTxs && Array.isArray(cloudTxs)) {
        const localTxs = this.txs();
        const map = new Map();
        cloudTxs.forEach(t => map.set(t.id, t));
        localTxs.forEach(t => {
          if (!map.has(t.id)) {
            map.set(t.id, t);
            SupabaseDB.upsertTransaction(t).catch(() => {});
          }
        });
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        this.s('sl_txs', merged);
      }

      console.log('✅ [Supabase Sync] Sinkronisasi data cloud selesai!');
    } catch (err) {
      console.warn('⚠️ [Supabase Sync] Gagal sinkronisasi data cloud:', err);
    }
  }
};
