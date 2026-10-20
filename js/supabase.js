/**
 * ========================================================
 * SUPABASE CLIENT & HELPER SERVICE - SELOSS STORE
 * ========================================================
 * 
 * PANDUAN PENGISIAN:
 * 1. Buka https://supabase.com -> Buka Proyek Anda
 * 2. Masuk ke Project Settings -> API
 * 3. Salin "Project URL" dan "Project API keys (anon public)"
 * 4. Tempelkan ke konstanta SUPABASE_CONFIG di bawah ini.
 */

export const SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',   // Ganti dengan Project URL Anda
  anonKey: 'YOUR_SUPABASE_ANON_KEY',             // Ganti dengan anon public key Anda
};

/**
 * Cek apakah kredensial Supabase sudah diisi
 */
export function isSupabaseConfigured() {
  return (
    typeof SUPABASE_CONFIG.url === 'string' &&
    !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID') &&
    typeof SUPABASE_CONFIG.anonKey === 'string' &&
    !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE_ANON_KEY') &&
    SUPABASE_CONFIG.anonKey.length > 20
  );
}

// Instance cache Supabase client
let _supabase = null;

/**
 * Mendapatkan instance Supabase client (Singleton)
 */
export async function getSupabase() {
  if (_supabase) return _supabase;

  if (!isSupabaseConfigured()) {
    console.warn('[Supabase] URL atau Anon Key belum diatur. Menggunakan mode fallback offline/localStorage.');
    return null;
  }

  try {
    let createClientFn = null;

    // Cek jika script cdn global sudah dimuat di window
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
      createClientFn = window.supabase.createClient;
    } else {
      // Import dinamis ESM dari CDN
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      createClientFn = mod.createClient;
    }

    if (createClientFn) {
      _supabase = createClientFn(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      console.log('✅ [Supabase] Berhasil terhubung ke Supabase!');
      return _supabase;
    }
  } catch (err) {
    console.error('❌ [Supabase] Gagal inisialisasi Supabase client:', err);
  }

  return null;
}

/**
 * ========================================================
 * SUPABASE AUTH HELPER
 * ========================================================
 */
export const SupabaseAuth = {
  /**
   * Register pengguna baru
   */
  async register(name, email, password) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum siap / belum dikonfigurasi');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: cleanName,
          role: 'user',
        },
      },
    });

    if (error) throw error;

    // Ambil atau buat profil pengguna
    let profile = null;
    if (data.user) {
      const { data: profData } = await sb
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      profile = profData || {
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        role: 'user',
        avatar: cleanName[0]?.toUpperCase() || 'U',
      };
    }

    return { user: data.user, session: data.session, profile };
  },

  /**
   * Login dengan email & password
   */
  async login(email, password) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum siap / belum dikonfigurasi');

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await sb.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) throw error;

    // Ambil data profil dari tabel profiles
    let profile = null;
    if (data.user) {
      const { data: profData } = await sb
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      profile = profData || {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split('@')[0],
        role: data.user.user_metadata?.role || 'user',
        avatar: (data.user.user_metadata?.name || data.user.email)[0].toUpperCase(),
      };
    }

    return { user: data.user, session: data.session, profile };
  },

  /**
   * Logout user saat ini
   */
  async logout() {
    const sb = await getSupabase();
    if (!sb) return;
    const { error } = await sb.auth.signOut();
    if (error) console.error('[Supabase Auth] Gagal logout:', error);
  },

  /**
   * Dapatkan sesi aktif saat ini
   */
  async getSession() {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  },

  /**
   * Dapatkan profil lengkap pengguna berdasarkan userId
   */
  async getProfile(userId) {
    const sb = await getSupabase();
    if (!sb || !userId) return null;

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase Auth] Gagal mengambil profil:', error);
      return null;
    }
    return data;
  },

  /**
   * Update profil pengguna (nama, no HP, role, dll.)
   */
  async updateProfile(userId, profileData) {
    const sb = await getSupabase();
    if (!sb || !userId) return null;

    const { data, error } = await sb
      .from('profiles')
      .upsert({ id: userId, ...profileData })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

/**
 * ========================================================
 * SUPABASE DATABASE HELPER
 * ========================================================
 */
export const SupabaseDB = {
  // ------------------------------------------------------
  // PRODUK (PRODUCTS)
  // ------------------------------------------------------
  async getProducts() {
    const sb = await getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('popularity', { ascending: false });

    if (error) {
      console.error('[Supabase DB] Gagal mengambil produk:', error);
      return null;
    }

    // Normalisasi struktur data produk jika format kolom berbeda
    return data.map(p => ({
      id: p.id,
      name: p.name,
      cat: Array.isArray(p.category)
        ? p.category
        : (typeof p.category === 'string'
            ? p.category.split(',').map(c => c.trim()).filter(Boolean)
            : [p.category || 'semuaan']),
      badge: p.badge || '',
      image: p.image || '',
      desc: p.description || '',
      formType: p.form_type || 'game',
      formFields: p.form_fields || [],
      vars: p.vars || [],
      pop: p.popularity || 0,
      createdAt: p.created_at,
    }));
  },

  async upsertProduct(product) {
    const sb = await getSupabase();
    if (!sb) return false;

    const row = {
      id: product.id,
      name: product.name,
      category: Array.isArray(product.cat)
        ? product.cat.join(',')
        : (product.cat || 'semuaan'),
      badge: product.badge || '',
      image: product.image || '',
      description: product.desc || '',
      form_type: product.formType || 'game',
      form_fields: product.formFields || [],
      vars: product.vars || [],
      popularity: product.pop || 0,
    };

    const { error } = await sb.from('products').upsert(row);
    if (error) {
      console.error('[Supabase DB] Gagal menyimpan produk:', error);
      return false;
    }
    return true;
  },

  async deleteProduct(id) {
    const sb = await getSupabase();
    if (!sb) return false;

    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) {
      console.error('[Supabase DB] Gagal menghapus produk:', error);
      return false;
    }
    return true;
  },

  // ------------------------------------------------------
  // BANNER (BANNERS)
  // ------------------------------------------------------
  async getBanners() {
    const sb = await getSupabase();
    if (!sb) return null;

    const { data, error } = await sb
      .from('banners')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Supabase DB] Gagal mengambil banner:', error);
      return null;
    }

    return data.map(b => ({
      id: b.id,
      title: b.title || '',
      subtitle: b.subtitle || '',
      image: b.image,
      link: b.link || '',
      createdAt: b.created_at,
    }));
  },

  async saveBanners(banners) {
    const sb = await getSupabase();
    if (!sb || !Array.isArray(banners)) return false;

    // Bersihkan banner lama dan timpa dengan yang baru
    await sb.from('banners').delete().neq('id', '___keep_empty___');

    if (banners.length === 0) return true;

    const rows = banners.map(b => ({
      id: b.id,
      title: b.title || '',
      subtitle: b.subtitle || '',
      image: b.image,
      link: b.link || '',
    }));

    const { error } = await sb.from('banners').insert(rows);
    if (error) {
      console.error('[Supabase DB] Gagal menyimpan banner:', error);
      return false;
    }
    return true;
  },

  async deleteBanner(id) {
    const sb = await getSupabase();
    if (!sb) return false;

    const { error } = await sb.from('banners').delete().eq('id', id);
    if (error) {
      console.error('[Supabase DB] Gagal menghapus banner:', error);
      return false;
    }
    return true;
  },

  // ------------------------------------------------------
  // TRANSAKSI / PESANAN (TRANSACTIONS)
  // ------------------------------------------------------
  async getTransactions(userId = null) {
    const sb = await getSupabase();
    if (!sb) return null;

    let query = sb.from('transactions').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase DB] Gagal mengambil transaksi:', error);
      return null;
    }

    return data.map(t => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name,
      userEmail: t.user_email,
      userWA: t.user_wa,
      productId: t.product_id,
      productName: t.product_name,
      productIcon: t.product_icon,
      variantId: t.variant_id,
      variantName: t.variant_name,
      amount: Number(t.amount || 0),
      paymentMethod: t.payment_method,
      formData: t.form_data,
      proofImage: t.proof_image,
      status: t.status,
      waMessage: t.wa_message,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  },

  async upsertTransaction(tx) {
    const sb = await getSupabase();
    if (!sb) return false;

    const row = {
      id: tx.id,
      user_id: tx.userId,
      user_name: tx.userName || '',
      user_email: tx.userEmail || '',
      user_wa: tx.userWA || '',
      product_id: tx.productId,
      product_name: tx.productName,
      product_icon: tx.productIcon || '',
      variant_id: tx.variantId,
      variant_name: tx.variantName,
      amount: tx.amount,
      payment_method: tx.paymentMethod,
      form_data: tx.formData || {},
      proof_image: tx.proofImage || null,
      status: tx.status || 'pending',
      wa_message: tx.waMessage || '',
      created_at: tx.createdAt || new Date().toISOString(),
      updated_at: tx.updatedAt || new Date().toISOString(),
    };

    const { error } = await sb.from('transactions').upsert(row);
    if (error) {
      console.error('[Supabase DB] Gagal menyimpan transaksi:', error);
      return false;
    }
    return true;
  },

  async updateTransactionStatus(id, newStatus) {
    const sb = await getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from('transactions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Supabase DB] Gagal update status transaksi:', error);
      return false;
    }
    return true;
  },
};
