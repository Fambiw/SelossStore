import { sampleProds } from './sample-data.js';
import { SupabaseDB, isSupabaseConfigured } from './supabase.js';

const DEMO_USER_IDS = new Set([
  'admin_001',
  'user_001',
  'user_002',
  'user_003',
  'user_004',
  'user_005',
  'user_006',
  'user_007',
  'user_008',
  'user_009',
  'user_010',
]);

let transactionCache = null;

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
  removeDemoUsers() {
    const users = this.users();
    const remainingUsers = users.filter(user => !user || !DEMO_USER_IDS.has(user.id));
    if (DEMO_USER_IDS.has(this.ses()?.userId)) this.clrSes();
    if (remainingUsers.length !== users.length && !this.s('sl_users', remainingUsers)) {
      throw new Error('Gagal membersihkan akun demo dari penyimpanan lokal');
    }
    return users.length - remainingUsers.length;
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
  
  txs() { return transactionCache || this.g('sl_txs', []); },
  setTxs(txs) {
    if (!Array.isArray(txs)) throw new Error('Data pesanan tidak valid');
    transactionCache = txs;
  },
  resetTxCache() {
    transactionCache = null;
  },
  hideTxCache() {
    transactionCache = [];
  },
  clearTxCache() {
    transactionCache = [];
  },
  async createTx(tx) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi; pesanan tidak dapat disimpan');
    const savedTx = await SupabaseDB.createOrder(tx);
    const ts = this.txs();
    this.setTxs([savedTx, ...ts.filter(item => item.id !== savedTx.id)]);
    return savedTx;
  },
  async refreshTxs(userId) {
    const transactions = await SupabaseDB.getTransactions(userId);
    this.setTxs(transactions);
    return transactions;
  },
  async updateTxStatus(id, status) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi; status pesanan tidak dapat disimpan');
    await SupabaseDB.updateTransactionStatus(id, status);
    this.setTxs(this.txs().map(tx => tx.id === id
      ? { ...tx, status, updatedAt: new Date().toISOString() }
      : tx));
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
      }

      // 2. Sinkronisasi Banner
      const cloudBanners = await SupabaseDB.getBanners();
      if (cloudBanners && cloudBanners.length > 0) {
        this.s('sl_banners', cloudBanners);
      }

      // 3. Sinkronisasi Transaksi
      const cloudTxs = await SupabaseDB.getTransactions();
      this.setTxs(cloudTxs);

      console.log('✅ [Supabase Sync] Sinkronisasi data cloud selesai!');
    } catch (err) {
      console.warn('⚠️ [Supabase Sync] Gagal sinkronisasi data cloud:', err);
    }
  }
};
