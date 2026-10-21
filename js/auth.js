import { DB } from './db.js';
import { hs, gid, vEmail, vWA, nWA } from './utils.js';
import { SupabaseAuth, isSupabaseConfigured } from './supabase.js';

function isLocalAuthTest() {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
}

const PRIMARY_ADMIN_EMAIL = 'swalloww32@gmail.com';

export const Auth = {
  cu: null, // Current user
  
  reg(name, email, phone, pw) {
    const safeName = String(name ?? '').trim();
    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const safePhone = typeof phone === 'string' ? phone.trim() : '';
    const safePw = typeof pw === 'string' ? pw : '';

    if (!safeName) throw new Error('Nama tidak boleh kosong');
    if (!vEmail(safeEmail)) throw new Error('Format email tidak valid');
    if (!safePhone) throw new Error('Nomor telepon atau WhatsApp wajib diisi');
    if (!vWA(safePhone)) throw new Error('Format nomor telepon tidak valid. Gunakan 08xxx atau 628xxx');
    if (safePw.length < 6) throw new Error('Password minimal 6 karakter');
    if (DB.findU(safeEmail)) throw new Error('Email sudah terdaftar');

    if (!isSupabaseConfigured() && !isLocalAuthTest()) {
      throw new Error('Autentikasi Supabase belum dikonfigurasi');
    }

    // Jika Supabase aktif, daftarkan akun langsung ke Supabase Auth
    if (isSupabaseConfigured()) {
      return SupabaseAuth.register(safeName, safeEmail, nWA(safePhone), safePw).then(({ user }) => {
        const u = {
          id: user?.id,
          name: safeName,
          email: safeEmail,
          passwordHash: '',
          phone: nWA(safePhone),
          avatar: safeName[0].toUpperCase(),
          role: 'user',
          createdAt: new Date().toISOString()
        };
        if (!u.id) throw new Error('Supabase tidak mengembalikan ID akun');
        DB.upsertU(u);
        return u;
      }).catch(err => {
        console.error('❌ [Supabase Auth] Error register:', err);
        const msg = err.message || '';
        if (msg.includes('already registered') || msg.includes('User already registered')) {
          throw new Error('Email sudah terdaftar di Supabase');
        }
        throw new Error(msg || 'Gagal mendaftar akun di Supabase');
      });
    }

    const u = {
      id: gid('u'),
      name: safeName,
      email: safeEmail,
      passwordHash: hs(safePw),
      phone: nWA(safePhone),
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

    if (isLocalAuthTest()) {
      const localU = DB.findU(safeEmail);
      if (!localU) throw new Error('Email tidak terdaftar');
      if (localU.passwordHash !== hs(safePw)) throw new Error('Password salah');

      const session = {
        userId: localU.id,
        token: gid('tok'),
        rememberMe: rem,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (rem ? 7 : 1) * 864e5).toISOString()
      };

      DB.setSes(session);
      this.cu = localU;
      return localU;
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Autentikasi Supabase belum dikonfigurasi');
    }

    return SupabaseAuth.login(safeEmail, safePw).then(async ({ user }) => {
      if (!user) throw new Error('Email tidak terdaftar');
      const profile = await SupabaseAuth.getProfile(user.id);
      const displayName = profile?.name || user.user_metadata?.name || safeEmail.split('@')[0];
      const u = {
        id: user.id,
        name: displayName,
        email: safeEmail,
        passwordHash: '',
        phone: profile?.phone || user.user_metadata?.phone || '',
        avatar: (profile?.name || safeEmail)[0].toUpperCase(),
        role: profile?.role === 'admin' ? 'admin' : 'user',
        createdAt: user.created_at || new Date().toISOString()
      };
      DB.upsertU(u);
      const appSession = {
        userId: u.id,
        rememberMe: rem,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (rem ? 7 : 1) * 864e5).toISOString()
      };
      DB.setSes(appSession);
      DB.clearTxCache();
      this.cu = u;
      return u;
    }).catch(err => {
      const msg = err.message || '';
      if (msg.includes('Email not confirmed')) {
        throw new Error('Email belum dikonfirmasi. Silakan periksa inbox email Anda, atau matikan "Confirm email" di dashboard Supabase -> Authentication -> Providers -> Email.');
      }
      if (msg.includes('Invalid login credentials')) {
        throw new Error('Email atau password salah');
      }
      throw new Error(msg || 'Email tidak terdaftar');
    });
  },
  
  logout() {
    if (isSupabaseConfigured()) {
      SupabaseAuth.logout().catch(err => {
        console.error('[Supabase Auth] Gagal logout:', err);
      });
    }
    DB.clrSes();
    DB.clearTxCache();
    this.cu = null;
  },

  async verifyAdmin() {
    if (!isSupabaseConfigured()) return false;

    const session = await SupabaseAuth.getSession();
    const authenticatedEmail = session?.user?.email?.trim().toLowerCase();
    if (!session?.user?.id || authenticatedEmail !== PRIMARY_ADMIN_EMAIL) {
      if (this.cu) this.cu = { ...this.cu, role: 'user' };
      return false;
    }

    if (this.cu?.id !== session.user.id) return false;

    const profile = await SupabaseAuth.getProfile(session.user.id);
    const isAdmin = profile?.role === 'admin';
    this.cu = { ...this.cu, role: isAdmin ? 'admin' : 'user' };
    DB.upsertU(this.cu);
    return isAdmin;
  },
  
  check() {
    const s = DB.ses();
    if (!s) {
      this.cu = null;
      return false;
    }
    
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
  },

  hasCompleteProfile(user = this.cu) {
    return Boolean(
      user &&
      typeof user.name === 'string' &&
      user.name.trim() &&
      vWA(user.phone)
    );
  }
};
