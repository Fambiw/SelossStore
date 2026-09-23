import { DB } from './db.js';
import { hs, gid, vEmail } from './utils.js';

export const Auth = {
  cu: null, // Current user
  
  reg(name, email, pw) {
    const safeName = String(name ?? '').trim();
    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const safePw = typeof pw === 'string' ? pw : '';

    if (!safeName) throw new Error('Nama tidak boleh kosong');
    if (!vEmail(safeEmail)) throw new Error('Format email tidak valid');
    if (safePw.length < 6) throw new Error('Password minimal 6 karakter');
    if (DB.findU(safeEmail)) throw new Error('Email sudah terdaftar');
    
    const u = {
      id: gid('u'),
      name: safeName,
      email: safeEmail,
      passwordHash: hs(safePw),
      phone: '',
      avatar: safeName[0].toUpperCase(),
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    DB.upsertU(u);
    return u;
  },
  
  login(email, pw, rem = false) {
    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const safePw = typeof pw === 'string' ? pw : '';
    const u = DB.findU(safeEmail);
    if (!u) throw new Error('Email tidak terdaftar');
    if (u.passwordHash !== hs(safePw)) throw new Error('Password salah');
    
    const session = {
      userId: u.id,
      token: gid('tok'),
      rememberMe: rem,
      loginAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (rem ? 7 : 1) * 864e5).toISOString()
    };
    
    DB.setSes(session);
    this.cu = u;
    return u;
  },
  
  logout() {
    DB.clrSes();
    this.cu = null;
  },
  
  check() {
    if (this.cu) return true;
    const s = DB.ses();
    if (!s) return false;
    
    if (new Date() > new Date(s.expiresAt)) {
      this.logout();
      return false;
    }
    
    const u = DB.findById(s.userId);
    if (!u) {
      this.logout();
      return false;
    }
    
    this.cu = u;
    return true;
  },
  
  isAdm() {
    return this.cu?.role === 'admin';
  }
};
