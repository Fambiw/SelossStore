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
  url: 'https://qpelzuygbeczlrsamyjr.supabase.co',   // Project URL Supabase Anda
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWx6dXlnYmVjemxyc2FteWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NzcyOTQsImV4cCI6MjEwODA1MzI5NH0.EBWhAkIzOgMSPAKsHjkkxjMxQ5EgzgDwBTDT_x0QFLE',             // Anon public key Anda
};

/**
 * Cek apakah kredensial Supabase sudah diisi
 */
export function isSupabaseConfigured() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return false; // Di unit test (Jest) gunakan mock lokal agar test cepat & terisolasi
  }
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
    return null;
  }

  try {
    let createClientFn = null;

    if (typeof window !== 'undefined' && window.supabase?.createClient) {
      createClientFn = window.supabase.createClient;
    } else {
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
      console.log('✅ [Supabase] SDK client aktif');
      return _supabase;
    }
  } catch (err) {
    // Abaikan jika CDN gagal, direct REST fetch tetap berjalan 100%
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
   * Register pengguna baru ke Supabase Authentication
   */
  async register(name, email, password) {
    if (!isSupabaseConfigured()) throw new Error('Supabase client belum dikonfigurasi');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Coba lewat Supabase SDK jika tersedia
    try {
      const sb = await getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: cleanName,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          return { user: data.user, session: data.session };
        }
      }
    } catch (sdkErr) {
      console.warn('[Supabase SDK Notice, using direct REST]:', sdkErr.message);
    }

    // 2. Direct REST API (Ultra cepat, tanpa tergantung CDN eksternal)
    const res = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
        data: {
          name: cleanName,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.msg || data.message || data.error_description || 'Gagal mendaftar di Supabase');
    }

    return { user: data.user || data, session: data.session || null };
  },

  /**
   * Login dengan email & password ke Supabase
   */
  async login(email, password) {
    if (!isSupabaseConfigured()) throw new Error('Supabase client belum dikonfigurasi');

    const cleanEmail = email.trim().toLowerCase();

    // 1. Coba via SDK jika tersedia
    try {
      const sb = await getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });
        if (error) throw error;
        return { user: data.user, session: data.session };
      }
    } catch (sdkErr) {
      console.warn('[Supabase SDK Notice, using direct REST]:', sdkErr.message);
    }

    // 2. Direct REST API
    const res = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || 'Email atau password salah');
    }

    return { user: data.user, session: data };
  },

  async requestPasswordReset(email) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi');
    const sb = await getSupabase();
    if (!sb) throw new Error('Koneksi Supabase tidak tersedia. Silakan coba lagi.');

    const redirectTo = `${window.location.origin}${window.location.pathname}?auth=reset-password`;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) throw error;
  },

  async updatePassword(password) {
    if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi');
    const sb = await getSupabase();
    if (!sb) throw new Error('Koneksi Supabase tidak tersedia. Silakan coba lagi.');

    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session?.user) {
      throw new Error('Sesi verifikasi tidak tersedia. Minta tautan reset password yang baru.');
    }

    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;
    if (!data?.user) throw new Error('Supabase tidak mengonfirmasi perubahan password');
    return data.user;
  },

  /**
   * Login atau Register via Google OAuth
   */
  async signInWithGoogle() {
    if (!isSupabaseConfigured()) throw new Error('Supabase client belum dikonfigurasi');

    const redirectTo = window.location.href.split('#')[0].split('?')[0];

    try {
      const sb = await getSupabase();
      if (sb) {
        const { data, error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch (sdkErr) {
      console.warn('[Supabase SDK Google OAuth Notice, using direct endpoint]:', sdkErr.message);
    }

    const authUrl = `${SUPABASE_CONFIG.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    window.location.href = authUrl;
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
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  },

  /**
   * Dapatkan profil lengkap pengguna berdasarkan userId
   */
  async getProfile(userId) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum tersedia');
    if (!userId) throw new Error('ID pengguna tidak tersedia');

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Update profil pengguna (nama, no HP, role, dll.)
   */
  async updateProfile(userId, profileData) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum tersedia');
    if (!userId) throw new Error('ID pengguna tidak tersedia');

    const allowedProfileData = {
      ...(typeof profileData.name === 'string' ? { name: profileData.name } : {}),
      ...(typeof profileData.phone === 'string' ? { phone: profileData.phone } : {}),
    };
    if (Object.keys(allowedProfileData).length === 0) return null;

    const { data, error } = await sb
      .from('profiles')
      .update(allowedProfileData)
      .eq('id', userId)
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
    if (!sb) throw new Error('Supabase client belum tersedia');

    let query = sb.from('transactions').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(t => ({
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
      paymentStatus: t.payment_status || 'pending',
      waMessage: t.wa_message,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  },

  async createOrder(tx) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum tersedia');

    let proofPath = null;
    if (tx.proofImage) {
      const file = tx.proofImage;
      if (!file.type?.startsWith('image/') || file.size > 10 * 1024 * 1024) {
        throw new Error('Bukti pembayaran harus berupa gambar maksimal 10MB');
      }
      const extensionByType = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const extension = extensionByType[file.type];
      if (!extension) throw new Error('Format bukti pembayaran tidak didukung');
      proofPath = `${tx.userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await sb.storage
        .from('order-proofs')
        .upload(proofPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
    }

    let data;
    try {
      const result = await sb.rpc('create_order', {
        p_product_id: tx.productId,
        p_variant_id: tx.variantId,
        p_user_name: tx.userName,
        p_user_wa: tx.userWA,
        p_payment_method: tx.paymentMethod,
        p_form_data: tx.formData || {},
        p_proof_image: proofPath,
        p_wa_message: tx.waMessage || '',
      });
      if (result.error) throw result.error;
      data = result.data;
    } catch (err) {
      if (proofPath) {
        const { error: cleanupError } = await sb.storage.from('order-proofs').remove([proofPath]);
        if (cleanupError) {
          console.error('[Supabase Storage] Gagal membersihkan bukti pesanan yang tidak tersimpan:', cleanupError);
        }
      }
      throw err;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Database tidak mengembalikan pesanan yang tersimpan');
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userWA: row.user_wa,
      productId: row.product_id,
      productName: row.product_name,
      productIcon: row.product_icon,
      variantId: row.variant_id,
      variantName: row.variant_name,
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      formData: row.form_data || {},
      proofImage: row.proof_image,
      status: row.status,
      paymentStatus: row.payment_status || 'pending',
      waMessage: row.wa_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async getOrderProofUrl(path) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum tersedia');
    const { data, error } = await sb.storage
      .from('order-proofs')
      .createSignedUrl(path, 300);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Tautan bukti pembayaran tidak tersedia');
    return data.signedUrl;
  },

  async updateTransactionStatus(id, newStatus) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Supabase client belum tersedia');

    const { data, error } = await sb
      .from('transactions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');

    if (error) throw error;
    if (!data?.length) throw new Error('Pesanan tidak ditemukan atau akses ditolak');
    return true;
  },
};
