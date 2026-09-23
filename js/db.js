import { sampleProds } from './sample-data.js';

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
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
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
    let p = this.g('sl_prods'); 
    if (!p) {
      p = sampleProds();
      this.s('sl_prods', p);
    }
    return p;
  },
  setProds(p) { this.s('sl_prods', p); },
  
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
    return tx;
  }
};
