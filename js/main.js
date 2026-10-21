// ============================================================
//  SELOSS STORE — Main Application Script v1.0// ============================================================

import { CFG, PMETHODS, STLBLS } from './config.js';
import { gid, fmt, fdt, disc, esc, vEmail, vWA, nWA, completedItemCount, $ } from './utils.js';
import { sampleBanners } from './sample-data.js';
import { DB } from './db.js';
import { Auth } from './auth.js';
import { St } from './store.js';
import { SupabaseDB, SupabaseAuth, getSupabase } from './supabase.js';

let historyTransactions = [];
let historyUserId = null;

// Expose shared modules to window for inline HTML handlers
window.Auth = Auth;
window.DB = DB;
window.St = St;
window.fmt = fmt;
window.esc = esc;
window.disc = disc;
window.SupabaseDB = SupabaseDB;
window.SupabaseAuth = SupabaseAuth;
window.getSupabase = getSupabase;
window.loginWithGoogle = loginWithGoogle;

// ── TOAST ────────────────────────────────────────────────────
export function toast(msg, type = 'success', dur = 3500) {
  const icons = { success: 'bi-check-circle', error: 'bi-x-circle', info: 'bi-info-circle', warning: 'bi-exclamation-triangle' };
  const cols = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const c = $('tc');
  if (!c) return;
  const id = 't_' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'ti';
  el.style.borderLeft = `4px solid ${cols[type]}`;
  el.innerHTML = `<i class="bi ${icons[type]}" aria-hidden="true"></i><span style="flex:1">${esc(msg)}</span><button class="tc-x" onclick="rmT('${id}')" aria-label="Tutup">×</button>`;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => rmT(id), dur);
}

function checkoutField(key, profileValue){
  return Object.prototype.hasOwnProperty.call(St.co.form,key)
    ? St.co.form[key]
    : (profileValue||'');
}

function prefillCheckoutForm(){
  const user=Auth.cu;
  if(!user)return;
  if(!Object.prototype.hasOwnProperty.call(St.co.form,'f-name'))St.co.form['f-name']=user.name||'';
  if(!Object.prototype.hasOwnProperty.call(St.co.form,'f-em'))St.co.form['f-em']=user.email||'';
  if(!Object.prototype.hasOwnProperty.call(St.co.form,'f-wa'))St.co.form['f-wa']=user.phone||'';
}
window.toast = toast;

export function rmT(id) {
  const el = $(id);
  if (el) {
    el.classList.remove('show');
    setTimeout(() => el?.remove(), 300);
  }
}
window.rmT = rmT;

const THEME_STORAGE_KEY = 'sl_theme';
const THEMES = new Set(['light', 'dark']);

function getSavedTheme() {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.has(theme) ? theme : 'light';
  } catch (err) {
    console.error('[Theme] Gagal membaca preferensi tema:', err);
    return 'light';
  }
}

function applyTheme(theme) {
  if (!THEMES.has(theme)) return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.error('[Theme] Gagal menyimpan preferensi tema:', err);
  }
  document.querySelectorAll('[data-theme-choice], #sidebar-theme-light, #sidebar-theme-dark').forEach(button => {
    const choice = button.dataset.themeChoice || (button.id.endsWith('-dark') ? 'dark' : 'light');
    const selected = choice === theme;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function selectTheme(theme) {
  applyTheme(theme);
  document.querySelectorAll('.topbar-menu[open], .theme-sidebar-menu[open]').forEach(menu => menu.removeAttribute('open'));
}


function updNav(){
  const u=Auth.cu;if(!u)return;
  const avatar=u.avatar||u.name?.[0]||'';
  const av=$('sb-avatar'),name=$('sb-user-name'),role=$('sb-user-role');
  if(av){
    if(typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://'))){
      av.innerHTML=`<img src="${esc(avatar)}" alt="${esc(u.name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='${esc((u.name?.[0]||'U').toUpperCase())}'">`;
    } else {
      av.textContent=avatar;
    }
  }
  if(name)name.textContent=u.name;
  if(role)role.textContent=Auth.isAdm()?'Administrator':'Member';
  const isAdm=Auth.isAdm();
  const adminGroup=$('sb-admin-group');if(adminGroup)adminGroup.style.display=isAdm?'':'none';
  const pg=R.cur;
  // Clear all active states
  document.querySelectorAll('.sb-item,.sb-profile,.category-item').forEach(el=>el.classList.remove('act'));
  // Set active based on page
  if(pg==='home'){$('sbi-home')?.classList.add('act')}
  else if(pg==='history'){$('sbi-hist')?.classList.add('act')}
  else if(pg==='reviews'){$('sbi-reviews')?.classList.add('act')}
  else if(pg==='profile'){$('sb-profile')?.classList.add('act')}
  else if(pg==='admin'){
    const sub=window._admSub||'dashboard';
    $(`sbi-adm-${sub}`)?.classList.add('act');
  }
  document.querySelector(`.category-item[data-category="${St.cat}"]`)?.classList.add('act');
  // Update search bar placeholder based on active admin sub-page
  const srch=$('srch-inp');
  if(srch){
    if(pg==='admin'){
      const sub=window._admSub||'dashboard';
      const ph={dashboard:'Dashboard — statistik penjualan',products:'Cari produk...',orders:'Cari pesanan, pembeli...',banners:'Kelola banner promosi...'};
      srch.placeholder=ph[sub]||'Cari...';
    } else {
      srch.placeholder='Cari produk...';
    }
  }
}


// ── SIDEBAR ──────────────────────────────────────────────────
function tglSB(){$('sb')?.classList.toggle('open');$('sb-ov')?.classList.toggle('show')}
function closeSB(){$('sb')?.classList.remove('open');$('sb-ov')?.classList.remove('show')}
function gocat(c){St.cat=c;R.go('home');closeSB()}
function openPriceModal(id){
  const p=DB.prods().find(pr=>pr.id===id);
  if(!p)return;
  if(p.available===false){toast('Produk ini sedang tidak tersedia','warning');return;}
  const sheet=$('pl-sheet');
  const modal=$('pl-modal');
  if(!sheet||!modal)return;
  const imgHtml = p.image
    ? `<img src="${p.image}" alt="${esc(p.name)}" class="pl-prod-img" onerror="this.src='';this.style.display='none'">`
    : `<div class="pl-prod-img-fb">${esc(p.name.charAt(0))}</div>`;
  sheet.innerHTML=`
    <div class="pl-hdr">
      <div class="pl-prod-info">
        <div class="pl-prod-thumb">${imgHtml}</div>
        <div class="pl-prod-ttl">${esc(p.name)}</div>
      </div>
      <button class="pl-close" onclick="closePriceModal()">×</button>
    </div>
    <div class="pl-title">Pilih Paket</div>
    <div class="pl-vars">
      ${p.vars.map(v=>`
        <div class="pl-var" onclick="selectPriceAndGo('${p.id}','${v.id}')">
          <div class="pl-var-name">${esc(v.n)}</div>
          <div class="pl-var-price">${fmt(v.p)}</div>
          <i class="bi bi-chevron-right pl-var-arrow"></i>
        </div>`).join('')}
    </div>`;
  modal.classList.add('show');
  requestAnimationFrame(()=>sheet.classList.add('slide-up'));
}
function closePriceModal(e){
  if(e&&e.target!==e.currentTarget)return;
  const modal=$('pl-modal'),sheet=$('pl-sheet');
  if(!modal)return;
  sheet?.classList.remove('slide-up');
  setTimeout(()=>modal.classList.remove('show'),280);
}
function selectPriceAndGo(pid,vid){
  const p=DB.prods().find(pr=>pr.id===pid);
  const v=p?.vars.find(vr=>vr.id===vid);
  if(!p||!v)return;
  St.resetCo();
  St.co.prod=p;
  St.co.variant=v;
  St.co.step=1;
  // Close modal then navigate
  const modal=$('pl-modal'),sheet=$('pl-sheet');
  sheet?.classList.remove('slide-up');
  setTimeout(()=>{
    if(modal)modal.classList.remove('show');
    R.go('checkout');
  },200);
}

// ── SEARCH ───────────────────────────────────────────────────
let mobSrchOpen=false;
function tglMobSearch(){mobSrchOpen=!mobSrchOpen;$('mob-sb')?.classList.toggle('show',mobSrchOpen)}
function handleSearch(v){St.q=v}
function doSearch(){R.go('home');closeSB()}
function clearSrch(){St.q='';const si=$('srch-inp'),mi=$('mob-srch-inp');if(si)si.value='';if(mi)mi.value='';R.go('home')}

// ── STATUS BADGE ─────────────────────────────────────────────
function sbdg(status){
  const m={pending:['s-pend','bi-hourglass-split','Menunggu'],confirmed:['s-conf','bi-check-circle','Dikonfirmasi'],processing:['s-proc','bi-arrow-repeat','Diproses'],done:['s-done','bi-check-circle-fill','Selesai'],cancelled:['s-canc','bi-x-circle','Dibatalkan']};
  const[cls,icon,label]=m[status]||['s-pend','bi-info-circle',status];
  return`<span class="stbdg ${cls}"><i class="bi ${icon}" aria-hidden="true"></i> ${label}</span>`;
}

// ── WA MESSAGE ───────────────────────────────────────────────
function buildWA(p, v, cd){
  const f = cd.form || {};
  const customerName = (f['f-name'] || Auth.cu?.name || '').trim() || 'Tidak ada nama';
  const appName = p?.name || 'Produk';
  const productDetail = v?.n || 'Detail produk tidak tersedia';
  const totalText = fmt(v?.p || 0);

  return [
    '𝕄𝕠𝕙𝕠𝕟 𝕓𝕒𝕟𝕥𝕦 𝕡𝕣𝕠𝕤𝕖𝕤 𝕡𝕖𝕤𝕒𝕟𝕒𝕟 𝕤𝕒𝕪𝕒 𝕪𝕒.',
    '',
    '📋 RINCIAN PESANAN',
    `Nᴀᴍᴀ: ${customerName}`,
    `Aᴘʟɪᴋᴀsɪ: ${appName}`,
    `Dᴜʀᴀsɪ: ${productDetail}`,
    '',
    `Tᴏᴛᴀʟ: ${totalText}`,
    '',
    '𝕋𝕖𝕣𝕚𝕞𝕒 𝕜𝕒𝕤𝕚𝕙, 𝔸𝕕𝕞𝕚𝕟. 𝔻𝕚𝕥𝕦𝕟𝕘𝕘𝕦 𝕡𝕣𝕠𝕤𝕖𝕤𝕟𝕪𝕒! 🙏'
  ].join('\n');
}

// ── PRICE SUMMARY HTML ───────────────────────────────────────
function priceSumHTML(v){
  if(!v)return'';
  const d=disc(v.o,v.p);
  return`<div class="price-sum" style="margin-bottom:10px"><span style="font-size:.875rem;color:var(--gy)">Paket dipilih</span><strong style="font-size:.875rem">${esc(v.n)}</strong></div>
  ${v.o>v.p?`<div class="price-sum" style="margin-bottom:4px"><span style="font-size:.875rem;color:var(--gy)">Harga normal</span><span style="text-decoration:line-through;color:var(--gy2);font-size:.875rem">${fmt(v.o)}</span></div><div class="price-sum" style="margin-bottom:10px"><span style="font-size:.875rem;color:var(--ac)">Diskon ${d}%</span><span style="color:var(--ac);font-size:.875rem">-${fmt(v.o-v.p)}</span></div>`:''}
  <div class="price-sum border-top-gray"><span style="font-weight:700">Total Bayar</span><span style="font-size:1.2rem;font-weight:800;color:var(--pr)">${fmt(v.p)}</span></div>`;
}

// ── BADGE MAP ────────────────────────────────────────────────
function getBadge(b){
  const m={flash:{cls:'b-flash',lbl:'Flash'},promo:{cls:'b-promo',lbl:'Promo'},lmt:{cls:'b-lmt',lbl:'Terbatas'},bestseller:{cls:'b-bs',lbl:'Best Seller'}};
  return m[b]||null;
}

// ── SKELETON LOADING ─────────────────────────────────────────
function skelCards(n=6){return Array(n).fill(0).map(()=>`<div class="sk-card"><div class="skel sk-img"></div><div class="sk-body"><div class="skel sk-ln sk-t"></div><div class="skel sk-ln sk-s"></div><div class="skel sk-ln sk-p"></div><div class="skel sk-btn"></div></div></div>`).join('')}

// ============================================================
//  PAGES
// ============================================================
const Pages={

  // ── AUTH PAGES ────────────────────────────────────────────
  auth(page){
    const c=$('auth');
    if(page==='login')c.innerHTML=this.loginH();
    else if(page==='register')c.innerHTML=this.regH();
    else if(page==='forgot')c.innerHTML=this.forgH();
    else if(page==='reset-password')c.innerHTML=this.resetPasswordH();
  },

  loginH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">Seloss Store</span><span class="alo-s">Cepat &bull; Simple &bull; Tanpa Ribet</span></div>
    <div class="a-ttl">Masuk ke Akun</div>
    <div class="a-sub">Belum punya akun? <a href="#" class="a-lnk" onclick="R.go('register');return false">Daftar Sekarang</a></div>
    <div class="a-err" id="le"></div>
    <div class="aig"><label>Email</label><div class="aii-wrap"><i class="bi bi-envelope-fill aii-ico"></i><input class="aii" id="le-em" type="email" placeholder="email@kamu.com" autocomplete="email" onkeydown="if(event.key==='Enter')doLogin()"></div></div>
    <div class="aig"><label>Password</label><div class="aii-wrap"><i class="bi bi-lock-fill aii-ico"></i><input class="aii" id="le-pw" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"><button class="aii-pw" type="button" onclick="tglPw('le-pw',this)"><i class="bi bi-eye-fill"></i></button></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><label class="a-rem"><input type="checkbox" id="le-rem"> Ingat saya</label><a href="#" class="a-lnk" onclick="R.go('forgot');return false" style="font-size:.8rem">Lupa password?</a></div>
    <button class="a-btn pulse" onclick="doLogin()"><i class="bi bi-box-arrow-in-right"></i> Masuk Sekarang</button>
    <div class="a-divider"><span>atau</span></div>
    <button class="a-btn-google" type="button" onclick="loginWithGoogle()"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Masuk dengan Google</span></button>
  </div>`},

  regH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">Seloss Store</span><span class="alo-s">Cepat &bull; Simple &bull; Tanpa Ribet</span></div>
    <div class="a-ttl">Buat Akun Baru</div>
    <div class="a-sub">Sudah punya akun? <a href="#" class="a-lnk" onclick="R.go('login');return false">Masuk di sini</a></div>
    <div class="a-err" id="re"></div>
    <div class="aig"><label>Nama Lengkap</label><div class="aii-wrap"><i class="bi bi-person-fill aii-ico"></i><input class="aii" id="re-nm" type="text" placeholder="Nama kamu" autocomplete="name" onkeydown="if(event.key==='Enter')doReg()"></div></div>
    <div class="aig"><label>Email</label><div class="aii-wrap"><i class="bi bi-envelope-fill aii-ico"></i><input class="aii" id="re-em" type="email" placeholder="email@kamu.com" autocomplete="email" onkeydown="if(event.key==='Enter')doReg()"></div></div>
    <div class="aig"><label>Nomor Telepon / WhatsApp</label><div class="aii-wrap"><i class="bi bi-telephone-fill aii-ico"></i><input class="aii" id="re-ph" type="tel" placeholder="08xxxxxxxxxx" autocomplete="tel" onkeydown="if(event.key==='Enter')doReg()"></div></div>
    <div class="aig"><label>Password <span style="font-size:.72rem;color:rgba(255,255,255,.3)">(min. 6 karakter)</span></label><div class="aii-wrap"><i class="bi bi-lock-fill aii-ico"></i><input class="aii" id="re-pw" type="password" placeholder="Buat password kuat" autocomplete="new-password" onkeydown="if(event.key==='Enter')doReg()"><button class="aii-pw" type="button" onclick="tglPw('re-pw',this)"><i class="bi bi-eye-fill"></i></button></div></div>
    <div class="aig"><label>Konfirmasi Password</label><div class="aii-wrap"><i class="bi bi-shield-lock-fill aii-ico"></i><input class="aii" id="re-cf" type="password" placeholder="Ulangi password" autocomplete="new-password" onkeydown="if(event.key==='Enter')doReg()"><button class="aii-pw" type="button" onclick="tglPw('re-cf',this)"><i class="bi bi-eye-fill"></i></button></div></div>
    <button class="a-btn pulse" onclick="doReg()"><i class="bi bi-person-plus-fill"></i> Daftar Sekarang</button>
    <div class="a-divider"><span>atau</span></div>
    <button class="a-btn-google" type="button" onclick="loginWithGoogle()"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Daftar dengan Google</span></button>
    <div class="a-ft">Sudah punya akun? <a href="#" class="a-lnk" onclick="R.go('login');return false">Masuk</a></div>
  </div>`},

  forgH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">Seloss Store</span></div>
    <div class="a-ttl">Reset Password</div>
    <div class="a-sub">Masukkan email akun. Kami akan mengirim tautan verifikasi untuk membuat password baru.</div>
    <div class="a-err" id="fe"></div>
    <div class="a-ok" id="fo"></div>
    <div class="aig"><label>Email Terdaftar</label><div class="aii-wrap"><i class="bi bi-envelope-fill aii-ico"></i><input class="aii" id="fe-em" type="email" placeholder="email@kamu.com" autocomplete="email" value="${esc(Auth.cu?.email||'')}" onkeydown="if(event.key==='Enter')doForg()"></div></div>
    <button class="a-btn" id="btn-forgot" onclick="doForg()"><i class="bi bi-envelope"></i> Kirim Tautan Reset</button>
    <div class="a-ft"><a href="#" class="a-lnk" onclick="R.go('login');return false">← Kembali ke Login</a></div>
  </div>`},

  resetPasswordH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">Seloss Store</span></div>
    <div class="a-ttl">Buat Password Baru</div>
    <div class="a-sub">Tautan verifikasi email berhasil digunakan. Buat password baru untuk akun ini.</div>
    <div class="a-err" id="rp-err"></div>
    <div class="aig"><label>Password baru <span style="font-size:.72rem;color:rgba(255,255,255,.6)">(minimal 8 karakter)</span></label><div class="aii-wrap"><i class="bi bi-lock-fill aii-ico"></i><input class="aii" id="rp-pw" type="password" placeholder="Buat password kuat" autocomplete="new-password"></div></div>
    <div class="aig"><label>Konfirmasi password baru</label><div class="aii-wrap"><i class="bi bi-shield-lock-fill aii-ico"></i><input class="aii" id="rp-confirm" type="password" placeholder="Ulangi password baru" autocomplete="new-password" onkeydown="if(event.key==='Enter')finishPasswordReset()"></div></div>
    <button class="a-btn" id="btn-reset-password" onclick="finishPasswordReset()"><i class="bi bi-shield-check"></i> Simpan Password Baru</button>
    <div class="a-ft">Setelah itu, lengkapi nama dan nomor kontak di halaman profil.</div>
  </div>`},

  completeProfile(){
    const user=Auth.cu;
    if(!user)return'';
    return`<section class="profile-page">
      <header class="profile-heading"><h1>Lengkapi Data Diri</h1><p>Lengkapi profil agar dapat menggunakan fitur Seloss Store.</p></header>
      <section class="profile-form" aria-label="Lengkapi profil">
        <div class="a-err" id="complete-profile-error"></div>
        <div class="profile-fields">
          <div class="profile-field full">
            <label for="cp-name">Nama lengkap</label>
            <input id="cp-name" type="text" autocomplete="name" value="${esc(user.name||'')}" required>
          </div>
          <div class="profile-field full">
            <label for="cp-email">Email akun</label>
            <input id="cp-email" type="email" value="${esc(user.email||'')}" readonly>
            <small class="profile-notice">Email berasal dari akun autentikasi dan tidak dapat diubah di sini.</small>
          </div>
          <div class="profile-field full">
            <label for="cp-phone">Nomor telepon / WhatsApp</label>
            <input id="cp-phone" type="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" value="${esc(user.phone||'')}" required>
            <small class="profile-notice">Nomor hanya divalidasi formatnya, belum diverifikasi dengan OTP.</small>
          </div>
        </div>
        <div class="profile-actions">
          <button type="button" onclick="doLogout()">Keluar</button>
          <button type="button" class="profile-save" id="complete-profile-save" onclick="saveCompleteProfile()">Simpan Data Diri</button>
        </div>
      </section>
    </section>`;
  },

  // ── APP PAGES ────────────────────────────────────────────
  app(page,prms){
    if(page!=='home'&&BslTimer){clearInterval(BslTimer);BslTimer=null;}
    const main=$('main');closeSB();
    if(page==='home')main.innerHTML=this.home();
    else if(page==='detail')main.innerHTML=this.detail(prms);
    else if(page==='checkout')main.innerHTML=this.checkout();
    else if(page==='history')main.innerHTML=this.hist();
    else if(page==='reviews')main.innerHTML=this.reviews();
    else if(page==='profile')main.innerHTML=this.profile();
    else if(page==='complete-profile')main.innerHTML=this.completeProfile();
    else if(page==='admin'){
      if(!Auth.isAdm()){toast('Akses ditolak','error');R.go('home');return;}
      if(!window._admSub) window._admSub='dashboard';
      main.innerHTML=this.admin();
    }
    main.classList.remove('fade-in');void main.offsetWidth;main.classList.add('fade-in');
    if(page==='home')this.afterHome();
    if(page==='checkout')this.afterCo();
    if(page==='detail')this.afterDetail(prms);
    if(page==='reviews')loadReviews();
  },

  reviews(){
    if(ReviewState.loading)return`<section class="review-page"><div class="empty-st" role="status"><span class="ei"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span><h3>Memuat ulasan...</h3></div></section>`;
    if(ReviewState.error)return`<section class="review-page"><header class="review-heading"><h1>Ulasan Pengguna</h1><p>Pendapat pengguna tentang pengalaman mereka menggunakan Seloss Store.</p></header><div class="empty-st" role="alert"><span class="ei"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></span><h3>Ulasan tidak dapat dimuat</h3><p>${esc(ReviewState.error)}</p><button class="btn-pr" type="button" onclick="loadReviews()">Coba lagi</button></div></section>`;
    if(ReviewState.mode==='form')return reviewFormHTML();
    return`<section class="review-page">
      <header class="review-heading">
        <div><h1>Ulasan Pengguna</h1><p>Pendapat pengguna tentang pengalaman mereka menggunakan Seloss Store.</p></div>
        <button class="btn-pr review-add" type="button" onclick="openReviewForm()"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add Review</button>
      </header>
      ${ReviewState.reviews.length?`<div class="review-grid">${ReviewState.reviews.map(renderReviewCard).join('')}</div>`:
        `<div class="empty-st review-empty"><span class="ei"><i class="bi bi-chat-square-heart" aria-hidden="true"></i></span><h3>Belum ada ulasan</h3><p>Belum ada ulasan. Jadilah yang pertama membagikan pengalamanmu menggunakan Seloss Store.</p></div>`}
    </section>`;
  },

  // HOME
  home(){
    const prods=DB.prods(),banners=DB.banners().filter(b=>b&&typeof b.image==='string'&&b.image.trim());
    let cat=St.cat,q=St.q.toLowerCase();
    const cats=[
      {id:'semuaan',lbl:'Semuaan'},
      {id:'larisann',lbl:'Larisann'},
      {id:'ngeditann',lbl:'Ngeditann'},
      {id:'streamingann',lbl:'Streamingann'},
      {id:'ai-ann',lbl:'AI-ann'}
    ];
    let filtered=prods.filter(p=>p.available!==false);
    if(cat!=='semuaan')filtered=filtered.filter(p=>Array.isArray(p.cat)?p.cat.includes(cat):p.cat===cat);
    if(q)filtered=filtered.filter(p=>p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q));
    return`
    ${banners && banners.length > 0 ? `
    <div class="bsl" id="home-bsl">
      <div class="bsl-viewport">
        <div class="bsl-trk" id="bsl-trk"></div>
        ${banners.length > 1 ? `
        <button class="bsl-nav bsl-prev" onclick="prevBanner()" aria-label="Banner Sebelumnya"><i class="bi bi-chevron-left"></i></button>
        <button class="bsl-nav bsl-next" onclick="nextBanner()" aria-label="Banner Berikutnya"><i class="bi bi-chevron-right"></i></button>
        ` : ''}
      </div>
      <div class="bsl-dots" id="bsl-dots"></div>
    </div>` : ''}
    <div class="sh"><div class="sh-ttl"><i class="bi bi-grid" aria-hidden="true"></i>Kategori</div></div>
    <div class="cats">${cats.map(c=>`<button class="cat-tab${St.cat===c.id?' act':''}" onclick="filterCat('${c.id}')">${c.lbl}</button>`).join('')}</div>
    ${q?`<div style="margin-bottom:12px;font-size:.875rem;color:var(--gy)">Hasil pencarian "<strong>${esc(q)}</strong>" — ${filtered.length} produk <a href="#" style="color:var(--ac);font-size:.8rem;margin-left:6px" onclick="clearSrch();return false"><i class="bi bi-x-lg" aria-hidden="true"></i> Hapus</a></div>`:''}
    <div class="sh"><div class="sh-ttl"><i class="bi bi-bag" aria-hidden="true"></i>${cats.find(c=>c.id===cat)?.lbl||'Semuaan'}</div><span style="font-size:.78rem;color:var(--gy)">${filtered.length} layanan</span></div>
    ${filtered.length===0?`<div class="empty-st"><span class="ei"><i class="bi bi-search" aria-hidden="true"></i></span><h3>Produk tidak ditemukan</h3><p>Coba kata kunci lain atau kategori berbeda</p></div>`:`<div class="pgrid" id="pgrid">${skelCards(filtered.length)}</div>`}
    <div class="pl-modal" id="pl-modal" onclick="closePriceModal(event)"><div class="pl-sheet" id="pl-sheet"></div></div>`;
  },


  afterHome(){
    initBsl(DB.banners());
    // Render actual products after skeleton
    setTimeout(()=>{
      const pg=$('pgrid');if(!pg)return;
      const filtered=this._filtered();
      pg.innerHTML=filtered.map(p=>this.pcard(p)).join('');
    },350);
  },

  _filtered(){
    const prods=DB.prods();let cat=St.cat,q=St.q.toLowerCase();
    let f=prods.filter(p=>p.available!==false);
    if(cat!=='semuaan')f=f.filter(p=>Array.isArray(p.cat)?p.cat.includes(cat):p.cat===cat);
    if(q)f=f.filter(p=>p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q));
    return f;
  },

  pcard(p){
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${esc(p.name)}" class="pc-img-file" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="pc-img-fb" style="display:none">${esc(p.name.charAt(0))}</div>`
      : `<div class="pc-img-fb">${esc(p.name.charAt(0))}</div>`;
    return`<div class="pcard" onclick="openPriceModal('${p.id}')">
      <div class="pc-img-wrap">${imgHtml}</div>
      <div class="pc-name">${esc(p.name)}</div>
    </div>`;
  },

  // DETAIL
  detail(prms){
    const p=DB.prods().find(pr=>pr.id===prms.productId);
    if(!p)return`<div class="empty-st"><span class="ei"><i class="bi bi-exclamation-circle" aria-hidden="true"></i></span><h3>Produk tidak ditemukan</h3><button class="btn-pr" style="margin-top:14px" onclick="R.go('home')">Ke Beranda</button></div>`;
    St.co.prod=p;St.co.variant=p.vars[0];St.co.step=1;
    prefillCheckoutForm();
    return`<div class="ph"><button class="back-btn" onclick="R.go('home')"><i class="bi bi-arrow-left"></i></button><div class="ph-ttl">Detail Produk</div></div>
    <div class="dt-hdr"><div class="dt-ico"><i class="bi bi-box-seam" aria-hidden="true"></i></div><div class="dt-info"><div class="dt-nm">${esc(p.name)}</div>
    <div class="dt-rt"><i class="bi bi-star-fill star" aria-hidden="true"></i> ${p.rating} &nbsp;•&nbsp; <i class="bi bi-bag-check-fill"></i> ${p.sold?.toLocaleString('id-ID')} terjual${p.flash?` &nbsp;•&nbsp; <span><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> Flash Sale!</span>`:''}</div>
    <div class="dt-desc">${esc(p.desc)}</div></div></div>
    ${p.flash?`<div style="background:linear-gradient(135deg,#10052a,#0a1628);border-radius:var(--r3);padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px"><span style="font-size:1.4rem">⏳</span><div><div style="font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:4px">FLASH SALE BERAKHIR DALAM</div><div id="dt-cd" class="cdbox" style="display:inline-flex"></div></div></div>`:''}
    <div class="scont" style="margin-bottom:14px"><div class="stttl"><i class="bi bi-grid-3x3-gap-fill" style="color:var(--pr)"></i> Pilih Paket</div>
    <div class="vars-grid" id="vg">${p.vars.map((v,i)=>`<div class="var-card${i===0?' sel':''}" id="vc-${v.id}" onclick="selVar('${p.id}','${v.id}')"><div class="var-nm">${esc(v.n)}</div><div class="var-pr">${fmt(v.p)}</div>${v.o>v.p?`<div class="var-og">${fmt(v.o)}</div><div class="var-disc">-${disc(v.o,v.p)}%</div>`:''} ${v.stk<=10?`<div class="var-low"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Sisa ${v.stk} slot!</div>`:''}</div>`).join('')}</div></div>
    <div class="scont" style="margin-bottom:14px" id="ps">${priceSumHTML(p.vars[0])}</div>
    <button class="btn-pr" style="width:100%;font-size:.95rem;padding:15px" onclick="startCo()"><i class="bi bi-cart-fill"></i> Lanjut Beli Sekarang</button>`;
  },

  afterDetail(prms){
    const p=DB.prods().find(pr=>pr.id===prms?.productId);
    if(p&&p.flash)startCD(p.flashEnd,'dt-cd');
  },

  // CHECKOUT
  checkout(){
    const cd=St.co,p=cd.prod,v=cd.variant,step=cd.step;
    if(!p)return`<div class="empty-st"><span class="ei"><i class="bi bi-cart" aria-hidden="true"></i></span><h3>Tidak ada produk dipilih</h3><p>Silakan pilih produk terlebih dahulu</p><button class="btn-pr" style="margin-top:14px" onclick="R.go('home')">Ke Beranda</button></div>`;

    return `
      <div class="checkout-shell">
        <div class="checkout-head">
          <button class="back-btn" onclick="coBk()"><i class="bi bi-arrow-left"></i></button>
          <div class="checkout-head-title">Seloss Store</div>
        </div>
        <div class="checkout-stepper">
          ${STLBLS.map((label, idx) => {
            const stepNo = idx + 1;
            const done = stepNo < step;
            const active = stepNo === step;
            return `
              ${idx > 0 ? `<div class="checkout-step-line ${done ? 'done' : ''}"></div>` : ''}
              <div class="checkout-step-item ${active ? 'active' : ''} ${done ? 'done' : ''}">
                <div class="checkout-step-badge">${done ? '<i class="bi bi-check-lg"></i>' : stepNo}</div>
                <span>${label}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="checkout-body">${this.stepC(step,p,v,cd)}</div>
      </div>
    `;
  },

  stepC(step,p,v,cd){
    if(step===1)return renderFormatStep();
    if(step===2)return renderPaymentStep();
    if(step===3)return renderFinishStep();
    return'';
  },

  st2(p,v){return`<div class="stcont"><div class="stttl"><i class="bi bi-grid-3x3-gap-fill" style="color:var(--pr)"></i> Pilih Varian Produk</div>
    <div class="ibox" style="margin-bottom:16px"><span class="ibox-i"><i class="bi bi-box-seam" aria-hidden="true"></i></span><div><strong>${esc(p.name)}</strong><br><span style="font-size:.8rem">Pilih paket yang kamu mau</span></div></div>
    <div class="vars-grid" id="vg-co">${p.vars.map(vv=>`<div class="var-card${vv.id===v.id?' sel':''}" onclick="coSelVar('${vv.id}')"><div class="var-nm">${esc(vv.n)}</div><div class="var-pr">${fmt(vv.p)}</div></div>`).join('')}</div>
    <button class="btn-pr" style="width:100%;margin-top:8px" onclick="coNext()">Lanjutkan <i class="bi bi-arrow-right"></i></button></div>`},

  st3(p,v){
    const u=Auth.cu;
    return`<div class="stcont"><div class="stttl"><i class="bi bi-person-fill" style="color:var(--pr)"></i> Isi Data Pembeli</div>
    <div class="ibox" style="margin-bottom:18px"><span class="ibox-i"><i class="bi bi-box-seam" aria-hidden="true"></i></span><div><strong>${esc(p.name)}</strong> — ${esc(v.n)}<br><span style="font-size:.8rem;font-weight:700;color:var(--pr)">${fmt(v.p)}</span></div></div>
    <div class="fg"><label class="flbl">Nama Lengkap <span class="req">*</span></label><input class="finp" id="f-name" type="text" placeholder="Nama kamu" value="${esc(u?.name||'')}"><div class="ferr" id="err-name">Nama tidak boleh kosong</div></div>
    <div class="fg"><label class="flbl">No. WhatsApp Aktif <span class="req">*</span></label><input class="finp" id="f-wa" type="tel" placeholder="08xxxxxxxxxx" value="${esc(u?.phone||'')}"><div class="fhint">Format: 08xxx atau 628xxx</div><div class="ferr" id="err-wa">Format nomor WA tidak valid</div></div>
    <div class="fg"><label class="flbl">Email Aktif <span class="req">*</span></label><input class="finp" id="f-em" type="email" placeholder="email@kamu.com" value="${esc(u?.email||'')}"><div class="ferr" id="err-em">Format email tidak valid</div></div>
    <button class="btn-pr" style="width:100%" onclick="coNext()">Lanjutkan <i class="bi bi-arrow-right"></i></button></div>`;
  },

 st4(cd) {
  const card = pm =>
    `<div class="pay-card${cd.pm === pm.id ? ' sel' : ''}"
      onclick="selPay('${pm.id}')">
      <span class="pay-ico">${pm.icon}</span>
      <div class="pay-nm">${esc(pm.name)}</div>
    </div>`;

  return `<div class="stcont">
    <div class="stttl"><i class="bi bi-wallet2" style="color:var(--pr)"></i> Pilih Metode Pembayaran</div>
    <div class="pay-section-title">QRIS</div>
    <div class="pay-grid pay-grid-qris">
      ${PMETHODS.filter(pm => pm.id === 'qris').map(card).join('')}
    </div>
    <div class="pay-section-title">E-Wallet</div>
    <div class="pay-grid pay-grid-ewallet">
      ${PMETHODS.filter(pm => pm.id !== 'qris').map(card).join('')}
    </div>
    <div id="pay-info" class="ibox" style="display:none;margin-bottom:14px">
      <span class="ibox-i"><i class="bi bi-lightbulb" aria-hidden="true"></i></span><div id="pay-info-t"></div>
    </div>
    <button class="btn-pr" style="width:100%;margin-top:8px"
      id="btn-np" onclick="coNext()" ${cd.pm ? '' : 'disabled'}>
      Lanjutkan <i class="bi bi-arrow-right"></i>
    </button>
  </div>`;
},

  st5(v, cd) {
  const pm = PMETHODS.find(m => m.id === cd.pm) || PMETHODS[0];

  return `<div class="stcont">
    <div class="stttl"><i class="bi bi-credit-card-fill" style="color:var(--pr)"></i> Informasi Pembayaran</div>
    <div class="pay-section-title">${esc(pm.name)}</div>
    <div class="qr-ph">
      <img src="${esc(pm.qrImage)}" alt="Kode QR ${esc(pm.name)}">
    </div>
    <div class="fhint" style="text-align:center;margin:10px 0 16px">
      Scan QR menggunakan ${esc(pm.name)}
    </div>
    <div style="background:linear-gradient(135deg,var(--pr),var(--sc));border-radius:var(--r2);padding:16px;text-align:center;margin-bottom:14px">
      <div style="color:rgba(255,255,255,.7);font-size:.78rem;margin-bottom:4px">Total yang harus dibayar</div>
      <div style="color:#fff;font-size:1.8rem;font-weight:900">${fmt(v.p)}</div>
      <div style="color:rgba(255,255,255,.6);font-size:.78rem;margin-top:3px">Transfer tepat sesuai nominal di atas</div>
    </div>
    <div class="ibox" style="margin-bottom:14px"><span class="ibox-i"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></span><div style="font-size:.82rem">Pastikan transfer tepat sesuai nominal. Setelah membayar, klik tombol di bawah.</div></div>
    <button class="btn-pr" style="width:100%" onclick="coNext()">Sudah Transfer — Upload Bukti <i class="bi bi-arrow-right"></i></button>
  </div>`;
},

  st6(){return`<div class="stcont"><div class="stttl"><i class="bi bi-cloud-arrow-up-fill" style="color:var(--pr)"></i> Upload Bukti Pembayaran</div>
    <div class="ibox" style="margin-bottom:16px"><span class="ibox-i"><i class="bi bi-image" aria-hidden="true"></i></span><div style="font-size:.83rem">Upload foto/screenshot bukti transfer atau pembayaran kamu. Pastikan nomor tujuan dan nominal jelas terlihat.</div></div>
    <div class="upl" id="upl-area" onclick="trigUpload()">
      <span class="upl-ico" id="upl-ico"><i class="bi bi-cloud-upload" aria-hidden="true"></i></span>
      <div class="upl-t" id="upl-t">Klik untuk pilih file atau drag & drop</div>
      <div class="upl-h" id="upl-h">PNG, JPG, JPEG, GIF • Maksimal 10MB</div>
      <img id="upl-prev" class="upl-prev" alt="Preview bukti">
    </div>
    <input type="file" id="file-inp" accept="image/*" style="display:none" onchange="handleFile(event)">
    <button class="btn-pr" style="width:100%;margin-top:18px" id="btn-nu" onclick="coNext()" disabled><i class="bi bi-send-check-fill"></i> Kirim & Lanjutkan</button></div>`;
  },

  afterCo(){
    const cd=St.co;if(!cd.prod)return;
    if(cd.step===6){
      const area=$('upl-area');
      if(area){
        area.addEventListener('dragover',e=>{e.preventDefault();area.classList.add('drag')});
        area.addEventListener('dragleave',()=>area.classList.remove('drag'));
        area.addEventListener('drop',e=>{e.preventDefault();area.classList.remove('drag');const f=e.dataTransfer.files[0];if(f)procFile(f)});
      }
      if(cd.proof){
        const prev=$('upl-prev'),icon=$('upl-ico'),txt=$('upl-t'),hint=$('upl-h'),nbtn=$('btn-nu'),a=$('upl-area');
        if(a)a.classList.add('ok');if(prev){prev.src=cd.proof;prev.style.display='block'}
        if(icon)icon.innerHTML='<i class="bi bi-check-lg" aria-hidden="true"></i>';if(txt)txt.textContent='Bukti sudah terupload!';
        if(hint)hint.textContent='Klik Kirim & Lanjutkan untuk melanjutkan';if(nbtn)nbtn.disabled=false;
      }
    }
  },

  // HISTORY
  hist(){
    const myTxs=historyTransactions.filter(t=>t.userId===Auth.cu?.id);
    const loadState=window._historyState||'loading';
    return`<div class="ph"><div class="ph-ttl"><i class="bi bi-receipt" aria-hidden="true"></i> Riwayat Transaksi</div></div>
    ${loadState==='loading'?`<div class="empty-st" role="status"><span class="ei"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span><h3>Memuat transaksi...</h3></div>`:
    loadState==='error'?`<div class="empty-st" role="alert"><span class="ei"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></span><h3>Transaksi tidak dapat dimuat</h3><p>${esc(window._historyError||'Periksa koneksi dan akses database.')}</p><button class="btn-pr" style="margin-top:14px" onclick="refreshUserTransactions()">Coba lagi</button></div>`:
    myTxs.length===0?`<div class="empty-st"><span class="ei"><i class="bi bi-bag" aria-hidden="true"></i></span><h3>Belum ada transaksi</h3><p>Yuk beli produk pertamamu!</p><button class="btn-pr" style="margin-top:14px" onclick="R.go('home')">Belanja Sekarang</button></div>`:`
    <div>${myTxs.map(tx=>`<div class="txcard" onclick="showTxD('${tx.id}')">
      <div class="tx-ico">${tx.productIcon?`<img src="${tx.productIcon}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`:'<i class="bi bi-box-seam" aria-hidden="true"></i>'}</div>
      <div class="tx-inf"><div class="tx-nm">${esc(tx.productName)}</div>
      <div class="tx-sub">${esc(tx.variantName)} • ${fdt(tx.createdAt)}</div>
      </div><div class="tx-rt"><div class="tx-amt">${fmt(tx.amount)}</div><div style="margin-top:4px">${sbdg(tx.status)}</div></div></div>`).join('')}</div>`}
    <div class="tx-modal" id="tx-modal"><div class="tx-mc" id="tx-mc"></div></div>`;
  },

  // PROFILE
  profile(){
    const u=Auth.cu;if(!u)return'';
    return`<section class="profile-page">
      <header class="profile-heading"><h1>Edit Profil</h1><p>Perbarui informasi akun dan keamanan Anda.</p></header>
      <div class="profile-identity">
        <div class="pf-av" id="pf-av">${typeof u.avatar === 'string' && (u.avatar.startsWith('http://') || u.avatar.startsWith('https://')) ? `<img src="${esc(u.avatar)}" alt="${esc(u.name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='${esc((u.name?.[0]||'U').toUpperCase())}'">` : esc(u.avatar||u.name.charAt(0).toUpperCase())}</div>
        <div class="pf-nm" id="pf-nm">${esc(u.name)}</div>
        <div class="pf-em" id="pf-em">${esc(u.email)}</div>
        <div class="profile-notice">Foto profil belum dapat diganti dari website.</div>
      </div>
      <section class="profile-form" aria-label="Informasi profil">
        <h2 class="profile-form-title">Informasi Pengguna</h2>
        <div class="profile-fields">
          <div class="profile-field">
            <label for="ep-nm">Nama pengguna</label>
            <input id="ep-nm" type="text" autocomplete="name" value="${esc(u.name)}" required>
          </div>
          <div class="profile-field">
            <label for="ep-ph">Nomor kontak</label>
            <input id="ep-ph" type="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" value="${esc(u.phone||'')}" required>
          </div>
          <div class="profile-field full">
            <label for="ep-em">Email</label>
            <input id="ep-em" type="email" autocomplete="email" value="${esc(u.email)}" readonly aria-describedby="profile-email-note">
            <small id="profile-email-note" class="profile-notice">Email akun tidak dapat diganti dari profil.</small>
          </div>
        </div>
        <div class="profile-password-section">
          <h2>Ganti Password</h2>
          <p class="profile-notice">Untuk keamanan, password diubah melalui tautan verifikasi yang dikirim ke email akun.</p>
          <button type="button" class="profile-save" onclick="R.go('forgot')">Kirim tautan reset password</button>
        </div>
        <div class="profile-actions">
          <button type="button" onclick="R.go('home')">Batal</button>
          <button type="button" class="profile-save" onclick="saveProf()">Simpan Perubahan</button>
        </div>
      </section>
    </section>`;
  },

  // ADMIN — 4-menu panel
  admin(){
    if(!Auth.isAdm()){return''}
    const sub = window._admSub || 'dashboard';
    if(sub === 'products') return this.adminProducts();
    if(sub === 'orders')   return this.adminOrders();
    if(sub === 'banners')  return this.adminBanners();
    return this.adminDashboard();
  },

  // ── ADMIN DASHBOARD ────────────────────────────────────────
  adminDashboard(){
    const txs = DB.txs();
    const now = new Date();
    const ymOf = (d)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const thisMonth = ymOf(now);

    const unitsIn = tx => Number.isInteger(Number(tx.qty)) && Number(tx.qty) > 0 ? Number(tx.qty) : 1;
    const soldTxs = txs.filter(t => t.status === 'done');
    const totalSold = completedItemCount(txs);

    const pendTxs = txs.filter(t => t.status === 'pending');
    const pendItems = pendTxs.reduce((sum, tx) => sum + unitsIn(tx), 0);

    const doneTxs = txs.filter(t => t.status === 'done');
    const doneItems = doneTxs.reduce((sum, tx) => sum + unitsIn(tx), 0);

    const monthRev = doneTxs
      .filter(t => ymOf(new Date(t.createdAt)) === thisMonth)
      .reduce((s,t)=> s + t.amount, 0);

    const months = [];
    for(let i=7; i>=0; i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = ymOf(d);
      const label = d.toLocaleDateString('id-ID', {month:'short', year:'2-digit'});
      const mTxs = doneTxs.filter(t => ymOf(new Date(t.createdAt)) === key);
      const rev = mTxs.reduce((s,t)=>s+t.amount,0);
      const items = mTxs.reduce((sum, tx) => sum + unitsIn(tx), 0);
      months.push({key, label, rev, items});
    }
    const maxRev = Math.max(...months.map(m=>m.rev), 1);

    const prodMap = {};
    soldTxs.forEach(t => {
      const k = t.productId || t.productName;
      if(!prodMap[k]) prodMap[k] = {name: t.productName, icon: t.productIcon, units: 0};
      prodMap[k].units += unitsIn(t);
    });
    const topProds = Object.values(prodMap).sort((a,b)=>b.units-a.units).slice(0,6);
    const maxUnits = Math.max(...topProds.map(p=>p.units), 1);
    const hasChart = months.some(m=>m.rev>0);

    return `<div class="adm-page">
      <div class="adm-page-hdr">
        <div class="adm-page-hdr-left">
          <button class="adm-mob-toggle" onclick="tglSB()" aria-label="Buka menu"><i class="bi bi-list"></i></button>
          <h1 class="adm-page-title"><i class="bi bi-speedometer2"></i> Dashboard</h1>
        </div>
      </div>
      <div class="adm-stats4">
        <div class="asc4 asc4-blue"><div class="asc4-icon"><i class="bi bi-bag-check-fill"></i></div><div class="asc4-body"><div class="asc4-lbl">Total Item Terjual</div><div class="asc4-val">${totalSold.toLocaleString('id-ID')}</div><div class="asc4-sub">Unit dari pesanan selesai</div></div></div>
        <div class="asc4 asc4-warn"><div class="asc4-icon"><i class="bi bi-hourglass-split"></i></div><div class="asc4-body"><div class="asc4-lbl">Item Menunggu</div><div class="asc4-val">${pendItems.toLocaleString('id-ID')}</div><div class="asc4-sub">${pendTxs.length} pesanan menunggu</div></div></div>
        <div class="asc4 asc4-ok"><div class="asc4-icon"><i class="bi bi-check-circle-fill"></i></div><div class="asc4-body"><div class="asc4-lbl">Item Selesai</div><div class="asc4-val">${doneItems.toLocaleString('id-ID')}</div><div class="asc4-sub">${doneTxs.length} pesanan selesai</div></div></div>
        <div class="asc4 asc4-rev"><div class="asc4-icon"><i class="bi bi-wallet2"></i></div><div class="asc4-body"><div class="asc4-lbl">Pendapatan Bulan Ini</div><div class="asc4-val asc4-val-sm">${fmt(monthRev)}</div><div class="asc4-sub">${now.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</div></div></div>
      </div>
      <div class="adm-analytics-row">
        <div class="adm-card adm-chart-card">
          <div class="adm-card-hdr"><span class="adm-card-title"><i class="bi bi-bar-chart-line"></i> Pendapatan Bulanan</span></div>
          ${!hasChart
            ? `<div class="adm-empty"><i class="bi bi-bar-chart" style="font-size:2.5rem;color:var(--gy3)"></i><p>Belum ada data pendapatan</p></div>`
            : `<div class="adm-bar-chart">${months.map((m,i)=>`
                <div class="adm-bar-col" onclick="admChartClick(${i})" id="adm-bc-${i}">
                  <div class="adm-bar-tooltip" id="adm-btt-${i}"><strong>${m.label}</strong><br><span>${fmt(m.rev)}</span><br><small>${m.items} item</small></div>
                  <div class="adm-bar-wrap"><div class="adm-bar" style="height:${m.rev>0?Math.max(Math.round((m.rev/maxRev)*100),4):0}%"></div></div>
                  <div class="adm-bar-lbl">${m.label}</div>
                </div>`).join('')}</div>
              <div class="adm-chart-detail" id="adm-chart-detail" style="display:none"></div>`}
        </div>
        <div class="adm-card adm-top-card">
          <div class="adm-card-hdr"><span class="adm-card-title"><i class="bi bi-trophy"></i> Top Produk</span></div>
          ${topProds.length === 0
            ? `<div class="adm-empty"><i class="bi bi-trophy" style="font-size:2.5rem;color:var(--gy3)"></i><p>Belum ada transaksi</p></div>`
            : `<div class="adm-top-list">${topProds.map((p,i)=>`
                <div class="adm-top-item">
                  <div class="adm-top-rank">${i+1}</div>
                  <div class="adm-top-thumb">${p.icon?`<img src="${esc(p.icon)}" alt="${esc(p.name)}" onerror="this.style.display='none'">`:`<span>${esc((p.name||'?').charAt(0))}</span>`}</div>
                  <div class="adm-top-info"><div class="adm-top-name">${esc(p.name)}</div><div class="adm-top-bar-wrap"><div class="adm-top-bar" style="width:${Math.round((p.units/maxUnits)*100)}%"></div></div></div>
                  <div class="adm-top-units">${p.units} unit</div>
                </div>`).join('')}</div>`}
        </div>
      </div>
    </div>`;
  },

  // ── ADMIN EDIT PRODUK ───────────────────────────────────────
  adminProducts(){
    const prods = DB.prods();
    const q = (window._admProdQ||'').toLowerCase();
    const sf = window._admProdFilter || 'all';
    let filtered = prods;
    if(q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q));
    if(sf === 'available') filtered = filtered.filter(p => p.available !== false);
    if(sf === 'unavailable') filtered = filtered.filter(p => p.available === false);

    return `<div class="adm-page">
      <div class="adm-page-hdr">
        <div class="adm-page-hdr-left">
          <button class="adm-mob-toggle" onclick="tglSB()" aria-label="Buka menu"><i class="bi bi-list"></i></button>
          <h1 class="adm-page-title"><i class="bi bi-box-seam"></i> Edit Produk</h1>
        </div>
        <button class="adm-btn-primary" onclick="admProdNew()"><i class="bi bi-plus-lg"></i> Tambah Produk</button>
      </div>
      <div class="adm-toolbar">
        <div class="adm-srch-wrap">
          <i class="bi bi-search"></i>
          <input type="search" id="adm-prod-q" class="adm-srch-inp" placeholder="Cari produk..." value="${esc(window._admProdQ||'')}" oninput="admProdSearch(this.value)">
        </div>
        <div class="adm-filter-tabs">
          <button class="adm-ftab${sf==='all'?' act':''}" onclick="admProdFilter('all')">Semua (${prods.length})</button>
          <button class="adm-ftab${sf==='available'?' act':''}" onclick="admProdFilter('available')">Tersedia</button>
          <button class="adm-ftab${sf==='unavailable'?' act':''}" onclick="admProdFilter('unavailable')">Tidak Tersedia</button>
        </div>
      </div>
      <div class="adm-card" style="padding:0;overflow:hidden">
        ${filtered.length === 0
          ? `<div class="adm-empty"><i class="bi bi-search" style="font-size:2.5rem;color:var(--gy3)"></i><p>${q?'Produk tidak ditemukan':'Belum ada produk'}</p></div>`
          : `<div class="adm-tbl-scroll"><table class="adm-table">
              <thead><tr><th>Produk</th><th>Varian</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>${filtered.map(p => {
                const prices = p.vars.map(v=>v.p);
                const minP = Math.min(...prices);
                const maxP = Math.max(...prices);
                const available = p.available !== false;
                return `<tr>
                  <td><div class="adm-prod-cell">
                    <div class="adm-prod-thumb">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none">${esc(p.name.charAt(0))}</span>`:`<span>${esc(p.name.charAt(0))}</span>`}</div>
                    <div><div class="adm-prod-name">${esc(p.name)}</div><div class="adm-prod-desc">${esc((p.desc||'').slice(0,55))}${(p.desc||'').length>55?'…':''}</div></div>
                  </div></td>
                  <td style="font-size:.78rem;color:var(--gy)">${p.vars.length} paket</td>
                  <td style="font-size:.83rem;font-weight:600;color:var(--pr)">${minP===maxP?fmt(minP):fmt(minP)+'–'+fmt(maxP)}</td>
                  <td><button class="adm-toggle-btn ${available?'avail':'unavail'}" onclick="admProdToggle('${p.id}')"><i class="bi bi-${available?'check-circle-fill':'x-circle-fill'}"></i> ${available?'Tersedia':'Nonaktif'}</button></td>
                  <td><div class="adm-act-btns"><button class="adm-abtn ab-ok" onclick="admProdEdit('${p.id}')"><i class="bi bi-pencil"></i> Edit</button><button class="adm-abtn ab-del" onclick="admProdDel('${p.id}')"><i class="bi bi-trash"></i></button></div></td>
                </tr>`;}).join('')}
              </tbody></table></div>`}
      </div>
    </div>
    <div class="adm-modal-ov" id="adm-prod-modal" style="display:none" onclick="if(event.target===this)admCloseProdModal()"><div class="adm-modal" id="adm-prod-modal-inner"></div></div>
    <div class="adm-modal-ov" id="adm-del-modal" style="display:none" onclick="if(event.target===this)admCloseDelModal()"><div class="adm-modal adm-modal-sm" id="adm-del-modal-inner"></div></div>`;
  },

  // ── ADMIN PESANAN ───────────────────────────────────────────
  adminOrders(){
    const allTxs = DB.txs();
    const loadState = window._admOrdersState || 'loading';
    const q = (window._admOrdQ||'').toLowerCase();
    const sf = window._admOrdFilter || 'all';
    let filtered = allTxs;
    if(q) filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(q) ||
      (t.userName||'').toLowerCase().includes(q) ||
      (t.productName||'').toLowerCase().includes(q) ||
      (t.userEmail||'').toLowerCase().includes(q) ||
      (t.userWA||'').includes(q)
    );
    if(sf !== 'all') filtered = filtered.filter(t => t.status === sf);
    const statusOpts = [{v:'all',l:'Semua Status'},{v:'pending',l:'Menunggu'},{v:'confirmed',l:'Dikonfirmasi'},{v:'processing',l:'Diproses'},{v:'done',l:'Selesai'},{v:'cancelled',l:'Dibatalkan'}];

    return `<div class="adm-page">
      <div class="adm-page-hdr">
        <div class="adm-page-hdr-left">
          <button class="adm-mob-toggle" onclick="tglSB()" aria-label="Buka menu"><i class="bi bi-list"></i></button>
          <h1 class="adm-page-title"><i class="bi bi-receipt"></i> Pesanan</h1>
        </div>
        <div class="adm-ord-count">${filtered.length} pesanan</div>
      </div>
      <div class="adm-toolbar adm-toolbar-wrap">
        <div class="adm-srch-wrap">
          <i class="bi bi-search"></i>
          <input type="search" id="adm-ord-q" class="adm-srch-inp" placeholder="Cari ID, nama, produk..." value="${esc(window._admOrdQ||'')}" oninput="admOrdSearch(this.value)">
        </div>
        <select class="adm-select" onchange="admOrdFilter(this.value)">
          ${statusOpts.map(o=>`<option value="${o.v}" ${sf===o.v?'selected':''}>${o.l}</option>`).join('')}
        </select>
        <button class="adm-btn-sec" type="button" onclick="refreshAdminOrders()" ${loadState==='loading'?'disabled':''}>
          <i class="bi bi-arrow-clockwise"></i> Muat ulang
        </button>
      </div>
      <div class="adm-card" style="padding:0;overflow:hidden">
        ${loadState==='loading'
          ? `<div class="adm-empty" role="status"><i class="bi bi-arrow-repeat" style="font-size:2.5rem;color:var(--pr)"></i><p>Memuat pesanan dari database…</p></div>`
          : loadState==='error'
            ? `<div class="adm-empty" role="alert"><i class="bi bi-exclamation-triangle" style="font-size:2.5rem;color:var(--ac)"></i><p>${esc(window._admOrdersError||'Gagal memuat pesanan dari database.')}</p><button class="adm-btn-primary" type="button" onclick="refreshAdminOrders()">Coba lagi</button></div>`
            : filtered.length === 0
          ? `<div class="adm-empty"><i class="bi bi-receipt" style="font-size:2.5rem;color:var(--gy3)"></i><p>${allTxs.length===0?'Belum ada pesanan':'Tidak ada pesanan yang cocok'}</p></div>`
          : `<div class="adm-tbl-scroll"><table class="adm-table">
              <thead><tr><th>ID</th><th>Produk</th><th>Pembeli</th><th>Email</th><th>Metode</th><th>Total</th><th>Pembayaran</th><th>Status Pesanan</th><th>Tgl</th><th>Aksi</th></tr></thead>
              <tbody>${filtered.map(tx => {
                const pm = PMETHODS.find(m=>m.id===tx.paymentMethod);
                return `<tr>
                  <td style="font-family:monospace;font-size:.7rem;color:var(--gy);white-space:nowrap">${esc(tx.id)}</td>
                  <td><div style="display:flex;align-items:center;gap:8px">
                    ${tx.productIcon?`<img src="${esc(tx.productIcon)}" style="width:28px;height:28px;border-radius:6px;object-fit:cover" onerror="this.style.display='none'">`:`<span style="width:28px;height:28px;border-radius:6px;background:var(--pr-l);color:var(--pr-d);display:inline-flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">${esc((tx.productName||'?').charAt(0))}</span>`}
                    <div><div style="font-weight:600;font-size:.82rem">${esc(tx.productName||'-')}</div><div style="font-size:.7rem;color:var(--gy)">${esc(tx.variantName||'-')}</div></div>
                  </div></td>
                  <td><div style="font-size:.83rem;font-weight:500">${esc(tx.userName||'-')}</div><div style="font-size:.7rem;color:var(--gy)">${esc(tx.userWA||'-')}</div></td>
                  <td style="font-size:.75rem">${esc(tx.userEmail||'-')}</td>
                  <td style="font-size:.8rem">${esc(pm?.name||tx.paymentMethod||'-')}</td>
                  <td style="font-weight:700;color:var(--pr);font-size:.85rem">${fmt(tx.amount)}</td>
                  <td>${esc(tx.paymentStatus||'pending')}</td>
                  <td>${sbdg(tx.status)}</td>
                  <td style="font-size:.73rem;color:var(--gy);white-space:nowrap">${fdt(tx.createdAt)}</td>
                  <td><div class="adm-act-btns">
                    <button class="adm-abtn" style="background:var(--pr-l);color:var(--pr-d)" onclick="admOrdDetail('${tx.id}')"><i class="bi bi-eye"></i></button>
                    <button class="adm-abtn" style="background:#dcfce7;color:#166534" onclick="admWA('${tx.id}')" title="WhatsApp"><i class="bi bi-whatsapp"></i></button>
                  </div></td>
                </tr>`;}).join('')}
              </tbody></table></div>`}
      </div>
    </div>
    <div class="adm-modal-ov" id="adm-ord-modal" style="display:none" onclick="if(event.target===this)admCloseOrdModal()"><div class="adm-modal" id="adm-ord-modal-inner"></div></div>
    <div class="adm-modal-ov" id="adm-confirm-modal" style="display:none" onclick="if(event.target===this)admCloseConfirmModal()"><div class="adm-modal adm-modal-sm" id="adm-confirm-modal-inner"></div></div>`;
  },

  // ── ADMIN EDIT BANNER ───────────────────────────────────────
  adminBanners(){
    const banners = DB.banners();
    const maxReached = banners.length >= 5;

    return `<div class="adm-page">
      <div class="adm-page-hdr">
        <div class="adm-page-hdr-left">
          <button class="adm-mob-toggle" onclick="tglSB()" aria-label="Buka menu"><i class="bi bi-list"></i></button>
          <div>
            <h1 class="adm-page-title"><i class="bi bi-images"></i> Edit Banner</h1>
            <p style="margin:4px 0 0;font-size:.82rem;color:var(--gy)">Kelola banner iklan dan promosi yang tampil di halaman utama Seloss Store.</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${maxReached
            ? `<span class="adm-badge-max"><i class="bi bi-info-circle"></i> Maksimal 5 banner tercapai</span>`
            : `<button class="adm-btn-primary" onclick="admBannerNew()"><i class="bi bi-plus-lg"></i> Tambahkan Banner</button>`}
        </div>
      </div>

      <div class="adm-card" style="padding:0;overflow:hidden">
        ${banners.length === 0
          ? `<div class="adm-empty"><i class="bi bi-images" style="font-size:2.5rem;color:var(--gy3)"></i><p>Belum ada banner aktif. Halaman utama saat ini tidak menampilkan carousel.</p></div>`
          : `<div class="adm-tbl-scroll"><div class="adm-bnr-list">
              ${banners.map((b, idx) => `
                <div class="adm-bnr-card">
                  <div class="adm-bnr-order" title="Urutan ke-${idx+1}">#${idx+1}</div>
                  <div class="adm-bnr-thumb">
                    ${b.image ? `<img src="${esc(b.image)}" alt="${esc(b.title||'Banner')}">` : `<div style="padding:10px;color:rgba(255,255,255,.5);font-size:.75rem">Tanpa Gambar</div>`}
                  </div>
                  <div class="adm-bnr-info">
                    <div class="adm-bnr-name">${esc(b.title || 'Banner Promosi')}</div>
                    <div class="adm-bnr-meta">
                      <span><i class="bi bi-aspect-ratio"></i> Rasio 3:1</span>
                      <span><i class="bi bi-calendar-event"></i> ${b.createdAt ? fdt(b.createdAt) : 'Aktif'}</span>
                    </div>
                  </div>
                  <div class="adm-act-btns">
                    <button class="adm-abtn ab-del" onclick="admBannerDel('${b.id}')" title="Hapus banner"><i class="bi bi-trash"></i> Hapus</button>
                  </div>
                </div>
              `).join('')}
            </div></div>`}
      </div>
    </div>
    <div class="adm-modal-ov" id="adm-bnr-modal" style="display:none" onclick="if(event.target===this)admCloseBnrModal()"><div class="adm-modal" id="adm-bnr-modal-inner"></div></div>
    <div class="adm-modal-ov" id="adm-bnr-del-modal" style="display:none" onclick="if(event.target===this)admCloseBnrDelModal()"><div class="adm-modal adm-modal-sm" id="adm-bnr-del-modal-inner"></div></div>`;
  },

};


// ============================================================
//  ACTION HANDLERS
// ============================================================

// ── AUTH ─────────────────────────────────────────────────────
function tglPw(id,btn){const i=$(id);i.type=i.type==='password'?'text':'password';btn.innerHTML=i.type==='password'?'<i class="bi bi-eye-fill"></i>':'<i class="bi bi-eye-slash-fill"></i>'}
function shAErr(id,msg){const el=$(id);if(el){el.textContent=msg;el.classList.add('show')}}
function hiAErr(id){const el=$(id);if(el)el.classList.remove('show')}

async function doLogin(){
  const em=$('le-em')?.value.trim(),pw=$('le-pw')?.value,rem=$('le-rem')?.checked;
  hiAErr('le');
  try{
    await Auth.login(em,pw,rem);
    toast('Selamat datang, '+(Auth.cu?.name || 'Pelanggan'),'success');
    R.go('home');
  }
  catch(e){shAErr('le',e.message)}
}

async function doReg(){
  const nm=$('re-nm')?.value,em=$('re-em')?.value,phone=$('re-ph')?.value,pw=$('re-pw')?.value,cf=$('re-cf')?.value;
  hiAErr('re');
  if(!phone?.trim()){shAErr('re','Nomor telepon atau WhatsApp wajib diisi');return}
  if(!vWA(phone)){shAErr('re','Format nomor telepon tidak valid. Gunakan 08xxx atau 628xxx');return}
  if(pw!==cf){shAErr('re','Password dan konfirmasi tidak cocok');return}
  try{
    await Auth.reg(nm,em,phone,pw);
    await Auth.login(em,pw,false);
    toast('Akun berhasil dibuat! Selamat bergabung','success');
    R.go('home');
  }
  catch(e){shAErr('re',e.message)}
}

async function loginWithGoogle(){
  try{
    toast('Menghubungkan ke Google...', 'info');
    await SupabaseAuth.signInWithGoogle();
  }catch(e){
    toast('Gagal login Google: ' + e.message, 'error');
  }
}

async function doForg(){
  const em=$('fe-em')?.value.trim();
  hiAErr('fe');const ro=$('fo');if(ro)ro.classList.remove('show');
  if(!em||!vEmail(em)){shAErr('fe','Masukkan email yang valid');return}
  const button=$('btn-forgot');
  if(button)button.disabled=true;
  try{
    await SupabaseAuth.requestPasswordReset(em);
    if(ro){
      ro.classList.add('show');
      ro.textContent='Jika email tersebut terdaftar, tautan untuk membuat password baru akan dikirim. Periksa inbox dan folder spam.';
    }
  }catch(err){
    console.error('[Auth] Gagal mengirim tautan reset password:',err);
    shAErr('fe','Tautan reset tidak dapat dikirim. Periksa koneksi dan konfigurasi Supabase, lalu coba lagi.');
  }finally{
    if(button)button.disabled=false;
  }
}

async function finishPasswordReset(){
  hiAErr('rp-err');
  const password=$('rp-pw')?.value||'';
  const confirmation=$('rp-confirm')?.value||'';
  if(password.length<8){shAErr('rp-err','Password baru minimal 8 karakter');return}
  if(password!==confirmation){shAErr('rp-err','Konfirmasi password baru tidak cocok');return}

  const button=$('btn-reset-password');
  if(button)button.disabled=true;
  try{
    const user=await SupabaseAuth.updatePassword(password);
    const localUser=Auth.cu;
    if(!localUser||localUser.id!==user.id)throw new Error('Sesi akun berubah. Silakan login kembali.');
    DB.upsertU({...localUser,email:user.email?.trim().toLowerCase()||localUser.email,passwordHash:''});
    window.history.replaceState(null,'',window.location.pathname);
    toast('Password berhasil diperbarui. Lengkapi data profil Anda.','success');
    R.go('profile');
  }catch(err){
    console.error('[Auth] Gagal memperbarui password:',err);
    shAErr('rp-err',err.message||'Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta tautan reset yang baru.');
  }finally{
    if(button)button.disabled=false;
  }
}

const ReviewState = {
  loading: false,
  error: '',
  reviews: [],
  mode: 'list',
  rating: 0,
  description: '',
  editingId: null,
  saving: false,
  replyingId: null,
  replyDraft: '',
  replySaving: false,
};

function renderReviewStars(rating) {
  return `<span class="review-stars" aria-label="${Number(rating)} dari 5 bintang">${[1, 2, 3, 4, 5]
    .map(value => `<i class="bi ${value <= Number(rating) ? 'bi-star-fill is-filled' : 'bi-star'}" aria-hidden="true"></i>`)
    .join('')}</span>`;
}

function renderReviewCard(review) {
  const admin = Auth.isAdm();
  const replyEditor = admin && ReviewState.replyingId === review.review_id;
  return `<article class="review-card">
    <header class="review-card-head">
      <div><strong class="review-author">${esc(review.reviewer_name)}</strong>${renderReviewStars(review.rating)}</div>
      <time datetime="${esc(review.created_at)}">${esc(fdt(review.created_at))}</time>
    </header>
    <p class="review-copy">${esc(review.description)}</p>
    ${review.reply?`<section class="review-reply"><strong>${esc(review.reply_admin_name||'Admin Seloss Store')}</strong><p>${esc(review.reply)}</p></section>`:''}
    ${admin?`<div class="review-card-actions"><button class="review-link" type="button" onclick="beginReviewReply('${review.review_id}')"><i class="bi ${review.reply?'bi-pencil':'bi-reply'}" aria-hidden="true"></i> ${review.reply?'Edit Balasan':'Balas Review'}</button></div>`:''}
    ${replyEditor?`<form class="review-reply-form" onsubmit="submitReviewReply(event,'${review.review_id}')">
      <label for="review-reply-${review.review_id}">${review.reply?'Edit Balasan':'Balasan Admin'}</label>
      <textarea id="review-reply-${review.review_id}" maxlength="1000" oninput="updateReplyDraft(this.value)" placeholder="Tulis balasan untuk review ini...">${esc(ReviewState.replyDraft)}</textarea>
      <div class="review-form-error" id="review-reply-error" role="alert"></div>
      <div class="review-reply-actions"><button class="btn-pr" type="submit" ${ReviewState.replySaving?'disabled':''}>${ReviewState.replySaving?'Mengirim...':'Kirim Balasan'}</button><button class="review-back" type="button" onclick="cancelReviewReply()" ${ReviewState.replySaving?'disabled':''}>Batal</button></div>
    </form>`:''}
  </article>`;
}

function reviewFormHTML() {
  const editing = Boolean(ReviewState.editingId);
  return `<section class="review-form-page">
    <button class="review-back review-back-top" type="button" onclick="backToReviews()"><i class="bi bi-arrow-left" aria-hidden="true"></i> Kembali ke ulasan</button>
    <form class="review-form-card" onsubmit="submitReview(event)">
      <div class="review-brand"><img src="icon.svg" alt="Logo Seloss Store"><span>Seloss Store</span><small>Cepat • Simple • Tanpa Ribet</small></div>
      <h1>Bagaimana pengalamanmu menggunakan Seloss Store?</h1>
      <p class="review-form-intro">Bagikan pendapatmu tentang fitur, tampilan, dan kemudahan penggunaan Seloss Store agar kami dapat terus berkembang menjadi lebih baik.</p>
      <div class="review-rating-input" role="radiogroup" aria-label="Pilih rating" aria-describedby="review-rating-error">
        ${[1, 2, 3, 4, 5].map(value => `<button type="button" class="review-star-button${value<=ReviewState.rating?' selected':''}" role="radio" aria-checked="${ReviewState.rating===value}" aria-label="${value} bintang" onclick="setReviewRating(${value})"><i class="bi ${value<=ReviewState.rating?'bi-star-fill':'bi-star'}" aria-hidden="true"></i></button>`).join('')}
      </div>
      <div class="review-form-error" id="review-rating-error" role="alert"></div>
      <label class="review-label" for="review-description">Bagikan pengalamanmu</label>
      <textarea id="review-description" maxlength="500" oninput="updateReviewDescription(this.value)" placeholder="Ceritakan pengalaman, pendapat, atau saranmu untuk Seloss Store...">${esc(ReviewState.description)}</textarea>
      <div class="review-field-footer"><span class="review-form-error" id="review-description-error" role="alert"></span><span id="review-char-count">${ReviewState.description.length}/500</span></div>
      <button class="btn-pr review-submit" type="submit" ${ReviewState.saving?'disabled':''}><i class="bi ${ReviewState.saving?'bi-arrow-repeat':'bi-send'}" aria-hidden="true"></i> ${ReviewState.saving?'Menyimpan...':editing?'Simpan Perubahan':'Submit Review'}</button>
      <button class="review-back review-back-bottom" type="button" onclick="backToReviews()" ${ReviewState.saving?'disabled':''}>Kembali ke daftar ulasan</button>
    </form>
  </section>`;
}

function renderReviewsPage() {
  const main = $('main');
  if (!main || R.cur !== 'reviews') return;
  main.innerHTML = Pages.reviews();
}

async function loadReviews() {
  if (R.cur !== 'reviews' || ReviewState.loading) return;
  ReviewState.loading = true;
  ReviewState.error = '';
  renderReviewsPage();
  try {
    await Auth.verifyAdmin();
    ReviewState.reviews = await SupabaseDB.getReviews();
  } catch (err) {
    console.error('[Reviews] Gagal memuat ulasan:', err);
    ReviewState.error = err.message || 'Periksa koneksi dan akses database.';
  } finally {
    ReviewState.loading = false;
    renderReviewsPage();
    updNav();
  }
}

function openReviewForm() {
  const mine = ReviewState.reviews.find(review => review.is_mine);
  ReviewState.mode = 'form';
  ReviewState.editingId = mine?.review_id || null;
  ReviewState.rating = mine ? Number(mine.rating) : 0;
  ReviewState.description = mine?.description || '';
  ReviewState.saving = false;
  renderReviewsPage();
}

function backToReviews() {
  if (ReviewState.saving) return;
  ReviewState.mode = 'list';
  ReviewState.rating = 0;
  ReviewState.description = '';
  ReviewState.editingId = null;
  renderReviewsPage();
}

function setReviewRating(rating) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  ReviewState.rating = rating;
  document.querySelectorAll('.review-star-button').forEach((button, index) => {
    const selected = index < rating;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-checked', String(index + 1 === rating));
    button.querySelector('i').className = `bi ${selected?'bi-star-fill':'bi-star'}`;
  });
  const error = $('review-rating-error');
  if (error) error.textContent = '';
}

function updateReviewDescription(description) {
  ReviewState.description = description;
  const count = $('review-char-count');
  if (count) count.textContent = `${description.length}/500`;
}

async function submitReview(event) {
  event.preventDefault();
  if (ReviewState.saving) return;
  const ratingError = $('review-rating-error');
  const descriptionError = $('review-description-error');
  const description = $('review-description')?.value || '';
  const validRating = Number.isInteger(ReviewState.rating) && ReviewState.rating >= 1 && ReviewState.rating <= 5;
  const validDescription = description.trim().length > 0 && description.length <= 500;
  if (ratingError) ratingError.textContent = validRating ? '' : 'Pilih rating bintang terlebih dahulu.';
  if (descriptionError) descriptionError.textContent = validDescription ? '' : description.trim() ? 'Review maksimal 500 karakter.' : 'Deskripsi review tidak boleh kosong.';
  if (!validRating || !validDescription) return;

  ReviewState.description = description.trim();
  ReviewState.saving = true;
  renderReviewsPage();
  try {
    if (ReviewState.editingId) {
      await SupabaseDB.updateReview(ReviewState.editingId, ReviewState.rating, ReviewState.description);
    } else {
      await SupabaseDB.submitReview(ReviewState.rating, ReviewState.description);
    }
    ReviewState.mode = 'list';
    ReviewState.editingId = null;
    ReviewState.saving = false;
    await loadReviews();
    toast('Review berhasil disimpan');
  } catch (err) {
    console.error('[Reviews] Gagal menyimpan review:', err);
    ReviewState.saving = false;
    renderReviewsPage();
    toast(err.message || 'Review gagal disimpan. Silakan coba lagi.', 'error');
  }
}

function beginReviewReply(reviewId) {
  const review = ReviewState.reviews.find(item => item.review_id === reviewId);
  if (!Auth.isAdm() || !review) return;
  ReviewState.replyingId = reviewId;
  ReviewState.replyDraft = review.reply || '';
  ReviewState.replySaving = false;
  renderReviewsPage();
  $('review-reply-' + reviewId)?.focus();
}

function updateReplyDraft(value) {
  ReviewState.replyDraft = value;
}

function cancelReviewReply() {
  if (ReviewState.replySaving) return;
  ReviewState.replyingId = null;
  ReviewState.replyDraft = '';
  renderReviewsPage();
}

async function submitReviewReply(event, reviewId) {
  event.preventDefault();
  if (!Auth.isAdm() || ReviewState.replySaving) return;
  const input = $('review-reply-' + reviewId);
  const reply = input?.value || '';
  const error = $('review-reply-error');
  if (!reply.trim() || reply.length > 1000) {
    if (error) error.textContent = reply.trim() ? 'Balasan maksimal 1.000 karakter.' : 'Balasan tidak boleh kosong.';
    return;
  }
  ReviewState.replyDraft = reply.trim();
  ReviewState.replySaving = true;
  renderReviewsPage();
  try {
    await SupabaseDB.saveReviewReply(reviewId, ReviewState.replyDraft);
    ReviewState.replyingId = null;
    ReviewState.replyDraft = '';
    ReviewState.replySaving = false;
    await loadReviews();
    toast('Balasan berhasil disimpan');
  } catch (err) {
    console.error('[Reviews] Gagal menyimpan balasan:', err);
    ReviewState.replySaving = false;
    renderReviewsPage();
    toast(err.message || 'Balasan gagal disimpan. Silakan coba lagi.', 'error');
  }
}

// ── HOME ─────────────────────────────────────────────────────
function filterCat(c){St.cat=c;R.go('home')}
function openProd(id){openPriceModal(id)}
function selVar(pid,vid){
  const p=DB.prods().find(pr=>pr.id===pid),v=p?.vars.find(vr=>vr.id===vid);
  if(!p||!v)return;
  St.co.prod=p;St.co.variant=v;
  document.querySelectorAll('.var-card').forEach(el=>el.classList.remove('sel'));
  $('vc-'+vid)?.classList.add('sel');
  const ps=$('ps');if(ps)ps.innerHTML=priceSumHTML(v);
}
function startCo(){
  if(!St.co.prod||!St.co.variant){toast('Pilih varian terlebih dahulu','warning');return}
  St.co.step=1;R.go('checkout');
}

function openConfirmOrder(){
  const cd=St.co;
  const nm=$('co-name')?.value.trim();
  const wa=$('co-wa')?.value.trim();
  const em=$('co-email')?.value.trim();
  cd.form['f-name']=nm||'';
  cd.form['f-wa']=wa||'';
  cd.form['f-em']=em||'';
  let err=false;

  if(!nm){$('co-err-name')?.classList.add('show');err=true}else $('co-err-name')?.classList.remove('show');
  if(!wa||!vWA(wa)){$('co-err-wa')?.classList.add('show');err=true}else $('co-err-wa')?.classList.remove('show');
  if(!em||!vEmail(em)){$('co-err-email')?.classList.add('show');err=true}else $('co-err-email')?.classList.remove('show');
  if(!cd.pm){toast('Pilih metode pembayaran dulu!','warning');return}
  if(err){toast('Mohon lengkapi data pemesanan sebelum lanjut','warning');return}

  cd.form['f-name']=nm;
  cd.form['f-wa']=wa;
  cd.form['f-em']=em;
  cd.confirmOpen=true;

  const modal=$('checkout-confirm-modal');
  if(modal) modal.classList.add('show');
}

function closeConfirmOrder(){
  St.co.confirmOpen=false;
  const modal=$('checkout-confirm-modal');
  if(modal) modal.classList.remove('show');
}

function confirmOrder(){
  const cd=St.co;
  cd.confirmOpen=false;
  const modal=$('checkout-confirm-modal');
  if(modal) modal.classList.remove('show');
  cd.step=2;
  R.go('checkout');
}

// ── CHECKOUT ─────────────────────────────────────────────────
function coBk(){
  const cd=St.co;
  if(cd.step<=1)R.go('home');
  else{cd.step--;R.go('checkout')}
}

function coNext(){
  const cd=St.co;
  if(cd.step===1){
    const nm=$('co-name')?.value.trim(),wa=$('co-wa')?.value.trim(),em=$('co-email')?.value.trim();
    cd.form['f-name']=nm||'';
    cd.form['f-wa']=wa||'';
    cd.form['f-em']=em||'';
    let err=false;
    if(!nm){$('co-err-name')?.classList.add('show');err=true}else $('co-err-name')?.classList.remove('show');
    if(!wa||!vWA(wa)){$('co-err-wa')?.classList.add('show');err=true}else $('co-err-wa')?.classList.remove('show');
    if(!em||!vEmail(em)){$('co-err-email')?.classList.add('show');err=true}else $('co-err-email')?.classList.remove('show');
    if(!cd.pm){toast('Pilih metode pembayaran dulu!','warning');return}
    if(err){toast('Mohon lengkapi semua data yang diperlukan','warning');return}
    cd.form['f-wa']=nWA(wa);
    openConfirmOrder();
    return;
  }
  if(cd.step===2){
    cd.step=3;R.go('checkout');
    return;
  }
}

function coSelVar(vid){
  const v=St.co.prod?.vars.find(vr=>vr.id===vid);if(!v)return;
  St.co.variant=v;
  document.querySelectorAll('#vg-co .var-card').forEach(el=>el.classList.remove('sel'));
  document.querySelector(`#vg-co [onclick="coSelVar('${vid}')"]`)?.classList.add('sel');
}

function renderPaymentOptions(pmId){
  const cd=St.co;
  return PMETHODS.map(pm => `
    <button type="button" class="pay-card co-pay-option ${cd.pm === pm.id ? 'sel' : ''}" onclick="selPay('${pm.id}')">
      <span class="pay-ico">${pm.icon}</span>
      <span class="pay-nm">${esc(pm.name)}</span>
    </button>
  `).join('');
}

function renderOrderSummary(){
  const cd=St.co;
  const p=cd.prod;
  const v=cd.variant;
  if(!p||!v) return '';
  return `
    <div class="co-order-box">
      <div class="co-order-top">
        <div class="co-order-thumb">
          <img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\'co-thumb-fallback\'>${esc(p.name.charAt(0))}</span>'">
        </div>
        <div class="co-order-meta">
          <div class="co-order-name">${esc(p.name)}</div>
          <div class="co-order-duration">${esc(v.n)}</div>
        </div>
      </div>
      <div class="co-detail-row">
        <span>Detail produk</span>
        <strong>${esc(v.n)}</strong>
      </div>
      <div class="co-detail-row total-row">
        <span>Harga</span>
        <strong>${fmt(v.p)}</strong>
      </div>
    </div>
  `;
}

function renderFormatStep(){
  const cd=St.co,p=cd.prod,v=cd.variant;
  if(!p||!v) return '<div class="empty-st"><span class="ei"><i class="bi bi-cart" aria-hidden="true"></i></span><h3>Tidak ada produk dipilih</h3></div>';

  return `
    <div class="checkout-format">
      <div class="checkout-panel checkout-panel-left">
        <div class="co-product-head">
          <div class="co-product-logo"><img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\'co-thumb-fallback\'>${esc(p.name.charAt(0))}</span>'"></div>
          <div>
            <div class="co-product-name">${esc(p.name)}</div>
            <div class="co-product-duration">${esc(v.n)}</div>
          </div>
        </div>
        <div class="co-summary-wrap">
          ${renderOrderSummary()}
        </div>
      </div>

      <div class="checkout-panel checkout-panel-right">
        <div class="co-form-block">
          <div class="co-input-group">
            <label>Nama pelanggan</label>
            <input id="co-name" class="co-input" type="text" value="${esc(checkoutField('f-name',Auth.cu?.name))}" placeholder="Masukkan nama Anda" />
            <div class="co-error" id="co-err-name">Nama tidak boleh kosong</div>
          </div>

          <div class="co-input-group">
            <label>Nomor WhatsApp aktif</label>
            <input id="co-wa" class="co-input" type="tel" value="${esc(checkoutField('f-wa',Auth.cu?.phone))}" placeholder="08xxxxxxxxxx" />
            <div class="co-error" id="co-err-wa">Format nomor WA tidak valid</div>
          </div>

          <div class="co-input-group">
            <label>Email</label>
            <input id="co-email" class="co-input" type="email" value="${esc(checkoutField('f-em',Auth.cu?.email))}" placeholder="nama@email.com" />
            <div class="co-error" id="co-err-email">Format email tidak valid</div>
          </div>

          <div class="co-payment-group">
            <label>Metode pembayaran</label>
            <div class="co-payment-grid">
              ${renderPaymentOptions(cd.pm)}
            </div>
          </div>
        </div>

        <button class="co-primary-btn" onclick="openConfirmOrder()">Lanjutkan</button>
      </div>
    </div>

    <div class="co-confirm-overlay" id="checkout-confirm-modal" aria-hidden="true">
      <div class="co-confirm-modal">
        <button class="co-close-btn" type="button" onclick="closeConfirmOrder()" aria-label="Tutup">×</button>
        <div class="co-modal-header">
          <div class="co-modal-logo"><img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\'co-thumb-fallback\'>${esc(p.name.charAt(0))}</span>'"></div>
          <div class="co-modal-title">Detail Pesanan</div>
        </div>

        <div class="co-modal-body">
          <div class="co-modal-row"><span>Nama</span><strong>${esc(cd.form['f-name'] || Auth.cu?.name || '-')}</strong></div>
          <div class="co-modal-row"><span>WhatsApp</span><strong>${esc(cd.form['f-wa'] || Auth.cu?.phone || '-')}</strong></div>
          <div class="co-modal-row"><span>Email</span><strong>${esc(cd.form['f-em'] || Auth.cu?.email || '-')}</strong></div>
          <div class="co-modal-row"><span>Aplikasi</span><strong>${esc(p.name)}</strong></div>
          <div class="co-modal-row"><span>Durasi</span><strong>${esc(v.n)}</strong></div>
          <div class="co-modal-row"><span>Metode</span><strong>${esc(PMETHODS.find(m=>m.id===cd.pm)?.name || cd.pm || '-')}</strong></div>
          <div class="co-modal-row total"><span>Total</span><strong>${fmt(v.p)}</strong></div>
        </div>

        <button class="co-primary-btn full" type="button" onclick="confirmOrder()">Lanjutkan</button>
      </div>
    </div>
  `;
}

function renderPaymentStep(){
  const cd=St.co;
  const pm=PMETHODS.find(m=>m.id===cd.pm) || PMETHODS[0];
  const proofName = cd.proof && typeof cd.proof === 'object' && cd.proof.name ? cd.proof.name : (cd.proof ? 'Bukti terpilih' : 'Belum ada file dipilih');

  return `
    <div class="checkout-payment-wrap">
      <div class="checkout-panel checkout-panel-left">
        <div class="co-qr-box">
          <img src="${esc(pm.qrImage)}" alt="QR ${esc(pm.name)}" />
        </div>
        <button class="co-download-btn" type="button" onclick="downloadCurrentQr()">Unduh QR</button>
      </div>
      <div class="checkout-panel checkout-panel-right">
        <div class="co-payment-total">
          <span>Total Pembayaran</span>
          <strong>${fmt(cd.variant?.p || 0)}</strong>
        </div>
        <p class="co-payment-text">Scan QR dan bayar sesuai nominal yang tertera.</p>

        <div class="co-proof-box">
          <label class="co-proof-label">Upload Bukti Transfer</label>
          <div class="co-proof-drop" onclick="triggerProofUpload()">
            <span class="co-proof-icon"><i class="bi bi-image" aria-hidden="true"></i></span>
            <div class="co-proof-text">Pilih gambar bukti transfer</div>
            <div class="co-proof-sub">PNG, JPG, JPEG • Maksimal 10MB</div>
          </div>
          <div class="co-proof-filename" id="co-proof-name">${proofName}</div>
          <input type="file" id="proof-inp" accept="image/*" style="display:none" onchange="handleProofFile(event)">
          <button class="co-primary-btn light" type="button" onclick="submitProofAndContinue()">Lanjutkan</button>
        </div>
      </div>
    </div>
  `;
}

function renderFinishStep(){
  const cd = St.co;
  const p = cd.prod;
  const v = cd.variant;
  const savedOrder = DB.txs().find(tx => tx.id === cd.txId);
  const customerName = (cd.form['f-name'] || Auth.cu?.name || '').trim() || 'Customer';
  const adminNumber = CFG.adminWA || '6285111232205';
  const waMessage = buildWA(p, v, cd);
  const waLink = `https://wa.me/${adminNumber}?text=${encodeURIComponent(waMessage)}`;

  return `
    <div class="checkout-finish">
      <div class="co-finish-card">
        <div class="co-finish-icon"><i class="bi bi-check-lg" aria-hidden="true"></i></div>
        <h3>Selamat, pesananmu berhasil dibuat!</h3>
        <p>Pesanan tersimpan dengan status pembayaran pending. Pembayaran akan diverifikasi admin secara terpisah.</p>
        <p>ID Pesanan: <strong>${esc(savedOrder?.id || cd.txId || '-')}</strong> · Pembayaran: <strong>${esc(savedOrder?.paymentStatus || 'pending')}</strong></p>
        <div class="co-finish-summary">
          <div><span>Nama</span><strong>${esc(customerName)}</strong></div>
          <div><span>Aplikasi</span><strong>${esc(p?.name || '-')}</strong></div>
          <div><span>Detail</span><strong>${esc(v?.n || '-')}</strong></div>
          <div><span>Total</span><strong>${fmt(v?.p || 0)}</strong></div>
        </div>
        <button class="co-primary-btn full" type="button" onclick="window.open('${waLink}','_blank')">Hubungi Admin via WhatsApp</button>
      </div>
    </div>
  `;
}

function selPay(id){
  St.co.pm=id;
  document.querySelectorAll('.pay-card').forEach(el=>el.classList.remove('sel'));
  document.querySelector(`[onclick="selPay('${id}')"]`)?.classList.add('sel');
  const pm=PMETHODS.find(m=>m.id===id);
  const pi=$('pay-info'),pit=$('pay-info-t'),nb=$('btn-np');
  if(pm&&pi&&pit){pi.style.display='flex';pit.innerHTML=`<strong>${esc(pm.name)}</strong><br><span style="white-space:pre-line;font-size:.8rem">${esc(pm.info)}</span>`}
  if(nb)nb.disabled=false;
}

function trigUpload(){$('file-inp')?.click()}
function handleFile(ev){const f=ev.target.files[0];if(f)procFile(f)}
function procFile(file){
  if(!file.type.startsWith('image/')){toast('File harus berupa gambar','error');return}
  if(file.size>10*1024*1024){toast('Ukuran file maksimal 10MB','error');return}
  const r=new FileReader();
  r.onload=e=>{
    St.co.proof=e.target.result;
    const area=$('upl-area'),prev=$('upl-prev'),ico=$('upl-ico'),txt=$('upl-t'),hint=$('upl-h'),nb=$('btn-nu');
    if(area)area.classList.add('ok');
    if(prev){prev.src=e.target.result;prev.style.display='block'}
    if(ico)ico.innerHTML='<i class="bi bi-check-lg" aria-hidden="true"></i>';if(txt)txt.textContent='Bukti berhasil diupload!';
    if(hint)hint.textContent=file.name;if(nb)nb.disabled=false;
    toast('Bukti pembayaran berhasil diupload!','success');
  };
  r.readAsDataURL(file);
}

function triggerProofUpload(){
  $('proof-inp')?.click();
}

function handleProofFile(ev){
  const file = ev.target.files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){toast('File harus berupa gambar','error');return}
  if(file.size > 10 * 1024 * 1024){toast('Ukuran file maksimal 10MB','error');return}

  St.co.proof = file;
  const nameEl = $('co-proof-name');
  if(nameEl) nameEl.textContent = file.name;
  toast('Bukti transfer berhasil dipilih','success');
}

async function submitProofAndContinue(){
  if(!St.co.proof){
    toast('Upload bukti transfer dulu sebelum lanjut','warning');
    return;
  }
  const cd = St.co;
  const user = Auth.cu;
  if (!user?.id || !cd.prod?.id || !cd.variant?.id || !cd.pm) {
    toast('Data pesanan belum lengkap. Silakan periksa kembali checkout.','error');
    return;
  }
  if (cd.txSubmitting) return;

  cd.txSubmitting = true;
  const submitButton = document.querySelector('#main button[onclick="submitProofAndContinue()"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Menyimpan pesanan...';
  }

  try {
    const createdAt = new Date().toISOString();
    const tx = await DB.createTx({
      userId: user.id,
      userName: cd.form['f-name'] || user.name || '',
      userWA: nWA(cd.form['f-wa'] || ''),
      userEmail: cd.form['f-em'] || '',
      productId: cd.prod.id,
      productName: cd.prod.name,
      productIcon: cd.prod.image || '',
      variantId: cd.variant.id,
      variantName: cd.variant.n,
      amount: cd.variant.p,
      paymentMethod: cd.pm,
      formData: cd.form,
      proofImage: cd.proof,
      status: 'pending',
      paymentStatus: 'pending',
      waMessage: buildWA(cd.prod, cd.variant, cd),
      createdAt,
      updatedAt: createdAt,
    });
    cd.txId = tx.id;
    cd.step = 3;
    R.go('checkout');
  } catch (err) {
    console.error('[Orders] Gagal membuat pesanan:', err);
    toast(`Pesanan gagal disimpan. Silakan coba lagi. ${err.message || ''}`,'error',6000);
  } finally {
    cd.txSubmitting = false;
    if (submitButton && cd.step === 2) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Lanjutkan';
    }
  }
}

function downloadCurrentQr(){
  const pm = PMETHODS.find(m => m.id === St.co.pm) || PMETHODS[0];
  const link = document.createElement('a');
  link.href = pm.qrImage;
  link.download = `qr-${pm.name.toLowerCase()}.png`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function afterWA(){toast('Pesananmu sedang diproses admin','success')}
function newCo(){St.resetCo();R.go('home')}

// ── HISTORY / TX DETAIL ───────────────────────────────────────
function showTxD(txId){
  const tx=historyTransactions.find(t=>t.id===txId&&t.userId===Auth.cu?.id);if(!tx)return;
  const modal=$('tx-modal'),mc=$('tx-mc');if(!modal||!mc)return;
  const pm=PMETHODS.find(m=>m.id===tx.paymentMethod);
  mc.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div style="font-weight:700;font-size:1rem"><i class="bi bi-receipt" aria-hidden="true"></i> Detail Transaksi</div><button onclick="closeTxM()" aria-label="Tutup" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--gy)"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>
  <div style="text-align:center;margin-bottom:10px">${tx.productIcon?`<img src="${tx.productIcon}" style="width:64px;height:64px;border-radius:12px;object-fit:cover">`:'<span style="font-size:2.5rem"><i class="bi bi-box-seam" aria-hidden="true"></i></span>'}</div>
  <div style="text-align:center;margin-bottom:16px"><div style="font-weight:700;font-size:1rem">${esc(tx.productName)}</div><div style="font-size:.8rem;color:var(--gy)">${esc(tx.variantName)}</div><div style="margin-top:8px">${sbdg(tx.status)}</div></div>
  <div style="background:var(--gy5);border-radius:var(--r2);padding:14px;font-size:.83rem">
    ${[['ID Transaksi',`<span style="font-family:monospace;font-size:.72rem">${tx.id}</span>`],['Tanggal',fdt(tx.createdAt)],['Pembeli',esc(tx.userName)],['WhatsApp',esc(tx.userWA||'-')],['Email',esc(tx.userEmail||'-')],['Total',`<strong style="color:var(--pr)">${fmt(tx.amount)}</strong>`],['Metode',esc(pm?.name||tx.paymentMethod||'-')],['Status Pembayaran',esc(tx.paymentStatus||'pending')],['Status Pesanan',esc(tx.status||'pending')]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gy4)"><span style="color:var(--gy)">${k}</span><span style="text-align:right;max-width:60%">${v}</span></div>`).join('')}
  </div>
  `;
  modal.classList.add('show');
}
function closeTxM(){const m=$('tx-modal');if(m)m.classList.remove('show')}

// ── PROFILE ───────────────────────────────────────────────────
async function saveProf(){
  const user=Auth.cu;
  if(!user){R.go('login');return}
  const name=$('ep-nm')?.value.trim()||'';
  const phoneInput=$('ep-ph')?.value.trim()||'';

  if(!name||!phoneInput){toast('Nama dan nomor kontak wajib diisi','error');return}
  if(!vWA(phoneInput)){toast('Format nomor kontak tidak valid','error');return}

  try{
    const profile=await SupabaseAuth.updateProfile(user.id,{name,phone:nWA(phoneInput)});
    const savedUser={
      ...user,
      name:profile.name||name,
      phone:profile.phone||nWA(phoneInput),
      avatar:(profile.name||name)[0].toUpperCase(),
      role:profile.role==='admin'?'admin':user.role,
    };
    DB.upsertU(savedUser);
    Auth.cu=savedUser;
    toast('Informasi profil berhasil disimpan dengan aman.','success');
    R.go('profile');
  }catch(err){
    console.error('[Auth] Gagal menyimpan profil ke Supabase:',err);
    toast('Profil gagal disimpan ke server. Periksa koneksi dan kebijakan akses Supabase.','error');
  }
}

async function saveCompleteProfile(){
  const user=Auth.cu;
  if(!user?.id){R.go('login');return}
  const name=$('cp-name')?.value.trim()||'';
  const phone=$('cp-phone')?.value.trim()||'';
  const email=$('cp-email')?.value.trim().toLowerCase()||'';
  const errorElement=$('complete-profile-error');
  if(errorElement){errorElement.textContent='';errorElement.classList.remove('show')}
  if(!name){
    if(errorElement){errorElement.textContent='Nama lengkap wajib diisi';errorElement.classList.add('show')}
    return;
  }
  if(!phone){
    if(errorElement){errorElement.textContent='Nomor telepon atau WhatsApp wajib diisi';errorElement.classList.add('show')}
    return;
  }
  if(!vWA(phone)){
    if(errorElement){errorElement.textContent='Format nomor tidak valid. Gunakan 08xxx atau 628xxx';errorElement.classList.add('show')}
    return;
  }
  if(email!==user.email?.trim().toLowerCase()){
    if(errorElement){errorElement.textContent='Email harus sesuai dengan akun yang terautentikasi';errorElement.classList.add('show')}
    return;
  }

  const button=$('complete-profile-save');
  if(button)button.disabled=true;
  try{
    const profile=await SupabaseAuth.updateProfile(user.id,{name,phone:nWA(phone)});
    const savedUser={
      ...user,
      name:profile.name||name,
      phone:profile.phone||nWA(phone),
      avatar:(profile.name||name)[0].toUpperCase(),
      role:profile.role==='admin'?'admin':'user',
    };
    DB.upsertU(savedUser);
    Auth.cu=savedUser;
    toast('Data diri berhasil disimpan. Selamat datang di Seloss Store!','success');
    R.go('home');
  }catch(err){
    console.error('[Auth] Gagal menyimpan data diri:',err);
    if(errorElement){
      errorElement.textContent='Data diri gagal disimpan ke server. Periksa koneksi atau coba lagi.';
      errorElement.classList.add('show');
    }
  }finally{
    if(button)button.disabled=false;
  }
}

function doLogout(){
  document.body.classList.remove('adm-layout');
  Auth.logout();
  St.resetCo();
  closeSB();
  R.go('login');
}

// ── ADMIN ─────────────────────────────────────────────────────
function renderAdminAfterOrderUpdate(){
  const main=$('main');
  if(R.cur==='admin'&&main)main.innerHTML=Pages.admin();
}

function admWA(txId){
  const tx=DB.txs().find(t=>t.id===txId);if(!tx)return;
  const raw=tx.userWA;if(!raw){toast('Nomor WhatsApp pelanggan tidak tersedia','warning');return;}
  const wa=nWA(raw);
  const msg=`Halo ${tx.userName||'Kak'}!\n\nUpdate pesanan kamu di *Seloss Store*:\n📦 ${tx.productName} (${tx.variantName})\n💰 Total: ${fmt(tx.amount)}\n📋 Status: ${tx.status}\n\nAda yang bisa kami bantu? Terima kasih!`;
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`,'_blank');
}

async function refreshUserTransactions(){
  const userId = Auth.cu?.id;
  if (!userId) {
    R.go('login');
    return;
  }

  window._historyState = 'loading';
  window._historyError = '';
  if (historyUserId !== userId) historyTransactions = [];
  historyUserId = userId;
  const renderHistory = () => {
    const main = $('main');
    if (main && R.cur === 'history') main.innerHTML = Pages.hist();
  };
  renderHistory();

  try {
    const transactions = await SupabaseDB.getUserTransactions();
    if (Auth.cu?.id !== userId || R.cur !== 'history') return;
    historyTransactions = transactions;
    window._historyState = 'ready';
  } catch (err) {
    console.error('[Orders] Gagal memuat riwayat transaksi:', err);
    if (Auth.cu?.id !== userId || R.cur !== 'history') return;
    historyTransactions = [];
    window._historyState = 'error';
    window._historyError = 'Periksa koneksi, autentikasi, dan kebijakan akses Supabase.';
  }
  renderHistory();
}

async function refreshAdminOrders(){
  const expectedUserId = Auth.cu?.id;
  if (!expectedUserId) {
    toast('Sesi admin tidak tersedia','error');
    return;
  }

  window._admOrdersState = 'loading';
  window._admOrdersError = '';
  const main = $('main');
  if (main && R.cur === 'admin' && window._admSub === 'orders') {
    main.innerHTML = Pages.admin();
  }

  let isAdmin;
  try {
    isAdmin = await Auth.verifyAdmin();
  } catch (err) {
    console.error('[Auth] Gagal memverifikasi sesi admin:', err);
    if (Auth.cu?.id === expectedUserId && R.cur === 'admin') {
      Auth.cu = { ...Auth.cu, role: 'user' };
      toast('Hak akses admin tidak dapat diverifikasi','error');
      R.go('home');
    }
    return;
  }
  if (!isAdmin) {
    if (Auth.cu?.id === expectedUserId && R.cur === 'admin') {
      toast('Akses admin ditolak','error');
      R.go('home');
    }
    return;
  }

  try {
    const transactions = await SupabaseDB.getAdminTransactions();
    if (Auth.cu?.id !== expectedUserId || R.cur !== 'admin') return;
    DB.setTxs(transactions);
    window._admOrdersState = 'ready';
  } catch (err) {
    console.error('[Orders] Gagal memuat pesanan:', err);
    if (Auth.cu?.id !== expectedUserId || R.cur !== 'admin') return;
    DB.hideTxCache();
    window._admOrdersState = 'error';
    window._admOrdersError = 'Pesanan tidak dapat dimuat dari database. Periksa koneksi, autentikasi, dan kebijakan akses Supabase.';
  }

  if (main && R.cur === 'admin') {
    if (window._admSub === 'orders') main.innerHTML = Pages.admin();
    else if (window._admSub === 'dashboard') main.innerHTML = Pages.admin();
  }
}

// ── MOBILE SEARCH ────────────────────────────────────────────
// Show search icon button on small screens
window.addEventListener('resize',()=>{
});

// ============================================================
//  ROUTER
// ============================================================
const R = {
  cur: null,
  prms: {},

  go(page, params = {}) {
    this.cur = page;
    this.prms = params;

    const authEl = $('auth');
    const appEl  = $('app');
    const AUTH_PAGES  = ['login', 'register', 'forgot', 'reset-password'];
    const APP_PAGES   = ['home', 'detail', 'checkout', 'history', 'reviews', 'profile', 'admin', 'complete-profile'];

    if (AUTH_PAGES.includes(page)) {
      document.body.classList.remove('adm-layout');
      // Show auth section
      if (authEl) authEl.style.display = 'flex';
      if (appEl)  appEl.style.display  = 'none';
      Pages.auth(page);
    } else if (APP_PAGES.includes(page)) {
      // Guard: must be logged in
      if (!Auth.check()) {
        document.body.classList.remove('adm-layout');
        if (authEl) authEl.style.display = 'flex';
        if (appEl)  appEl.style.display  = 'none';
        Pages.auth('login');
        return;
      }
      const profileIsComplete=Auth.hasCompleteProfile();
      if(!profileIsComplete&&page!=='complete-profile'){
        this.go('complete-profile');
        return;
      }
      if(profileIsComplete&&page==='complete-profile'){
        this.go('home');
        return;
      }
      if (page === 'admin') {
        document.body.classList.remove('adm-layout');
        if (authEl) authEl.style.display = 'none';
        if (appEl) appEl.style.display = 'flex';
        const main = $('main');
        if (main) main.innerHTML = '<div role="status" style="padding:24px">Memverifikasi hak akses admin…</div>';
        Auth.verifyAdmin().then(isAdmin => {
          if (this.cur !== 'admin') return;
          if (!isAdmin) {
            toast('Akses admin tidak diberikan','error');
            this.go('home');
            return;
          }
          document.body.classList.add('adm-layout');
          updNav();
          DB.hideTxCache();
          if (window._admSub === 'orders') window._admOrdersState = 'loading';
          Pages.app(page, params);
          refreshAdminOrders();
        }).catch(err => {
          console.error('[Auth] Gagal memverifikasi hak akses admin:', err);
          toast('Hak akses admin tidak dapat diverifikasi. Silakan coba lagi.','error');
          this.go('home');
        });
        return;
      }
      if (page === 'history') {
        window._historyState = 'loading';
        historyTransactions = [];
        historyUserId = Auth.cu?.id || null;
      }
      if (page === 'reviews') {
        Object.assign(ReviewState, {
          loading: false, error: '', reviews: [], mode: 'list', rating: 0,
          description: '', editingId: null, saving: false, replyingId: null,
          replyDraft: '', replySaving: false,
        });
      }
      if (authEl) authEl.style.display = 'none';
      if (appEl)  appEl.style.display  = 'flex';
      document.body.classList.toggle('adm-layout', page === 'admin');
      updNav();
      Pages.app(page, params);
      if (page === 'history') refreshUserTransactions();
    }
  }
};

window.addEventListener('pageshow', (event) => {
  if (event.persisted && !Auth.check()) R.go('login');
});

// ============================================================
//  BANNER SLIDER (Auto-play 5s & Center Focused)
// ============================================================
let BslIdx = 0;
let BslTimer = null;
let BslBanners = [];

function initBsl(banners) {
  if (BslTimer) { clearInterval(BslTimer); BslTimer = null; }
  const trk = $('bsl-trk');
  const dots = $('bsl-dots');
  const bslBox = $('home-bsl');
  if (!trk) {
    BslBanners = [];
    BslIdx = 0;
    return;
  }

  const activeId = BslBanners[BslIdx]?.id;
  BslBanners = Array.isArray(banners) ? banners.filter(b => b && typeof b.image === 'string' && b.image.trim()) : [];
  if (!BslBanners.length) {
    BslIdx = 0;
    trk.innerHTML = '';
    if (dots) dots.innerHTML = '';
    return;
  }

  const activeIndex = BslBanners.findIndex(b => b.id === activeId);
  BslIdx = activeIndex >= 0 ? activeIndex : Math.min(BslIdx, BslBanners.length - 1);

  trk.innerHTML = BslBanners.map((b, i) =>
    `<div class="bsl-sl${i === 0 ? ' is-active' : ''}" id="bsl-sl-${i}">
      ${b.image ? `<img src="${esc(b.image)}" alt="Banner Promosi" class="bsl-img">` : ''}
    </div>`
  ).join('');

  if (dots) {
    dots.innerHTML = BslBanners.length <= 1 ? '' : BslBanners.map((_, i) =>
      `<button type="button" class="bsl-dot${i===BslIdx?' act':''}" onclick="goSl(${i})" aria-label="Slide ${i+1}" aria-current="${i===BslIdx?'true':'false'}"></button>`
    ).join('');
  }

  goSl(BslIdx, false);

  if (BslBanners.length > 1) {
    BslTimer = setInterval(() => {
      goSl(BslIdx + 1, true);
    }, 5000);
  }

  // Touch swipe support for mobile
  if (bslBox && !bslBox.dataset.swipeBound) {
    bslBox.dataset.swipeBound = '1';
    let startX = 0;
    bslBox.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    bslBox.addEventListener('touchend', (e) => {
      const diffX = startX - e.changedTouches[0].clientX;
      if (Math.abs(diffX) > 35) {
        if (diffX > 0) {
          goSl(BslIdx + 1);
        } else {
          goSl(BslIdx - 1);
        }
      }
    }, { passive: true });
  }
}

function goSl(idx, isAuto = false) {
  const count = BslBanners.length;
  if (!count) return;

  if (!isAuto && BslTimer && count > 1) {
    clearInterval(BslTimer);
    BslTimer = setInterval(() => {
      goSl(BslIdx + 1, true);
    }, 5000);
  }

  BslIdx = ((Math.trunc(idx) % count) + count) % count;
  const trk = $('bsl-trk');
  const dots = $('bsl-dots');
  if (trk) {
    const slides = trk.querySelectorAll('.bsl-sl');
    slides.forEach((slide, i) => {
      const active = i === BslIdx;
      const previous = count >= 3 && i === (BslIdx + count - 1) % count;
      const next = count > 1 && i === (BslIdx + 1) % count;
      slide.classList.toggle('is-active', active);
      slide.classList.toggle('is-prev', previous);
      slide.classList.toggle('is-next', next);
      slide.classList.toggle('is-hidden', !active && !previous && !next);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
  }
  if (dots) {
    dots.querySelectorAll('.bsl-dot').forEach((dot, i) => {
      const active = i === BslIdx;
      dot.classList.toggle('act', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }
}

function prevBanner(){goSl(BslIdx-1)}
function nextBanner(){goSl(BslIdx+1)}

// ============================================================
//  COUNTDOWN TIMER
// ============================================================
function startCD(endMs, elId) {
  function tick() {
    const el = $(elId);
    if (!el) return;
    const diff = endMs - Date.now();
    if (diff <= 0) { el.innerHTML = '<span style="color:#ff4d4d">HABIS</span>'; return; }
    const h = Math.floor(diff / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    const s = Math.floor((diff % 6e4) / 1e3);
    const pad = n => String(n).padStart(2, '0');
    el.querySelectorAll('.cdn')[0]?.setAttribute('data-v', pad(h));
    el.querySelectorAll('.cdn')[1]?.setAttribute('data-v', pad(m));
    el.querySelectorAll('.cdn')[2]?.setAttribute('data-v', pad(s));
    el.querySelectorAll('.cdn').forEach(d => d.textContent = d.getAttribute('data-v'));
    setTimeout(tick, 1000);
  }
  tick();
}

// ============================================================
//  INIT
// ============================================================
function initApp() {
  applyTheme(getSavedTheme());
  try {
    DB.removeDemoUsers();
  } catch (err) {
    console.error('[Auth] Gagal membersihkan akun demo lokal:', err);
    DB.clrSes();
  }

  // Seed products if not yet stored
  DB.prods();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => {
        reg.update();
      })
      .catch(() => {});
  }

  // ── Expose ALL functions to window for inline HTML event handlers ──
  window.R                 = R;
  window.tglSB             = tglSB;
  window.closeSB           = closeSB;
  window.gocat             = gocat;
  window.tglMobSearch      = tglMobSearch;
  window.handleSearch      = handleSearch;
  window.doSearch          = doSearch;
  window.clearSrch         = clearSrch;
  window.goSl              = goSl;
  window.prevBanner        = prevBanner;
  window.nextBanner        = nextBanner;
  window.filterCat         = filterCat;
  window.openProd          = openProd;
  window.openPriceModal    = openPriceModal;
  window.closePriceModal   = closePriceModal;
  window.selectPriceAndGo  = selectPriceAndGo;
  window.selVar            = selVar;
  window.startCo           = startCo;
  window.coBk              = coBk;
  window.coSelVar          = coSelVar;
  window.coNext            = coNext;
  window.selPay            = selPay;
  window.openConfirmOrder       = openConfirmOrder;
  window.closeConfirmOrder      = closeConfirmOrder;
  window.confirmOrder           = confirmOrder;
  window.triggerProofUpload     = triggerProofUpload;
  window.handleProofFile        = handleProofFile;
  window.submitProofAndContinue = submitProofAndContinue;
  window.downloadCurrentQr      = downloadCurrentQr;
  window.doLogin           = doLogin;
  window.doReg             = doReg;
  window.tglPw             = tglPw;
  window.doForg            = doForg;
  window.finishPasswordReset = finishPasswordReset;
  window.saveCompleteProfile = saveCompleteProfile;
  window.refreshAdminOrders = refreshAdminOrders;
  window.selectTheme      = selectTheme;
  window.admWA             = admWA;
  window.showTxD           = showTxD;
  window.closeTxM          = closeTxM;
  window.saveProf          = saveProf;
  window.loadReviews       = loadReviews;
  window.openReviewForm    = openReviewForm;
  window.backToReviews     = backToReviews;
  window.setReviewRating   = setReviewRating;
  window.updateReviewDescription = updateReviewDescription;
  window.submitReview     = submitReview;
  window.beginReviewReply  = beginReviewReply;
  window.updateReplyDraft  = updateReplyDraft;
  window.cancelReviewReply = cancelReviewReply;
  window.submitReviewReply = submitReviewReply;
  window.doLogout          = doLogout;
  window.newCo             = newCo;
  window.afterWA           = afterWA;
  window.trigUpload        = trigUpload;
  window.handleFile        = handleFile;
  window.procFile          = procFile;
// ── ADMIN NAVIGATION ─────────────────────────────────────────
function goAdmSub(sub){
  window._admSub = sub;
  if(!Auth.isAdm()){toast('Akses ditolak','error');R.go('home');return;}
  R.go('admin');
  closeSB();
}

// ── ADMIN DASHBOARD CHART ─────────────────────────────────────
function admChartClick(idx){
  document.querySelectorAll('.adm-bar-col').forEach((el,i)=>{
    el.classList.toggle('active', i===idx);
  });
  const col = document.getElementById(`adm-bc-${idx}`);
  const det = $('adm-chart-detail');
  if(!col||!det) return;
  const lbl = col.querySelector('.adm-bar-lbl')?.textContent || '';
  // Read from data stored in tooltip
  const tt = document.getElementById(`adm-btt-${idx}`);
  if(!tt||!det) return;
  const strong = tt.querySelector('strong')?.textContent||lbl;
  const span = tt.querySelector('span')?.textContent||'Rp 0';
  const small = tt.querySelector('small')?.textContent||'0 item';
  det.style.display='block';
  det.innerHTML=`<div class="adm-chart-det-box"><i class="bi bi-calendar3"></i> <strong>${strong}</strong> — Pendapatan: <strong>${span}</strong> &nbsp;•&nbsp; ${small}</div>`;
}

// ── ADMIN PRODUCT HANDLERS ────────────────────────────────────
function admProdSearch(q){
  window._admProdQ = q;
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

function admProdFilter(f){
  window._admProdFilter = f;
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

function admProdToggle(id){
  const prods=DB.prods();
  const p=prods.find(p=>p.id===id);
  if(!p)return;
  p.available = p.available === false ? true : false;
  DB.setProds(prods);
  toast(`Produk "${p.name}" ${p.available?'diaktifkan':'dinonaktifkan'}`,'success');
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

function admProdDel(id){
  const p=DB.prods().find(p=>p.id===id);
  if(!p)return;
  const modal=$('adm-del-modal');
  const inner=$('adm-del-modal-inner');
  if(!modal||!inner)return;
  inner.innerHTML=`
    <div class="adm-modal-hdr"><span class="adm-modal-title"><i class="bi bi-trash"></i> Hapus Produk</span><button class="adm-modal-close" onclick="admCloseDelModal()">×</button></div>
    <div style="padding:20px">
      <p style="color:var(--dk3);margin-bottom:12px">Anda akan menghapus produk <strong>${esc(p.name)}</strong>.</p>
      <div class="adm-info-box"><i class="bi bi-info-circle"></i> Riwayat pesanan yang menggunakan produk ini tidak akan terhapus.</div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
        <button class="adm-btn-sec" onclick="admCloseDelModal()">Batal</button>
        <button class="adm-btn-danger" onclick="admProdDelConfirm('${id}')"><i class="bi bi-trash"></i> Hapus</button>
      </div>
    </div>`;
  modal.style.display='flex';
}

function admProdDelConfirm(id){
  const p=DB.prods().find(p=>p.id===id);
  if(!p)return;
  DB.delProd(id);
  toast(`Produk "${p.name}" berhasil dihapus`,'success');
  admCloseDelModal();
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

function admCloseDelModal(){const m=$('adm-del-modal');if(m)m.style.display='none';}
function admCloseProdModal(){const m=$('adm-prod-modal');if(m)m.style.display='none';}
function admCloseOrdModal(){const m=$('adm-ord-modal');if(m)m.style.display='none';}
function admCloseConfirmModal(){const m=$('adm-confirm-modal');if(m)m.style.display='none';}

function admProdNew(){
  const modal=$('adm-prod-modal');
  const inner=$('adm-prod-modal-inner');
  if(!modal||!inner)return;
  inner.innerHTML=admProdFormHtml(null);
  modal.style.display='flex';
}

function admProdEdit(id){
  const p=DB.prods().find(p=>p.id===id);
  if(!p)return;
  const modal=$('adm-prod-modal');
  const inner=$('adm-prod-modal-inner');
  if(!modal||!inner)return;
  inner.innerHTML=admProdFormHtml(p);
  modal.style.display='flex';
}

function admProdFormHtml(p){
  const isNew=!p;
  const vars = p?.vars||[{id:'var_'+Date.now(),n:'',p:0}];
  return `
    <div class="adm-modal-hdr">
      <span class="adm-modal-title"><i class="bi bi-${isNew?'plus-lg':'pencil'}"></i> ${isNew?'Tambah':'Edit'} Produk</span>
      <button class="adm-modal-close" onclick="admCloseProdModal()">×</button>
    </div>
    <div class="adm-modal-body">
      <div class="adm-form-row">
        <label class="adm-form-lbl">Nama Produk <span style="color:var(--ac)">*</span></label>
        <input class="adm-form-inp" id="apf-name" type="text" value="${esc(p?.name||'')}" placeholder="Contoh: Netflix Premium">
        <div class="adm-form-err" id="apf-name-err">Nama tidak boleh kosong</div>
      </div>
      <div class="adm-form-row">
        <label class="adm-form-lbl">Deskripsi</label>
        <textarea class="adm-form-inp" id="apf-desc" rows="3" placeholder="Deskripsi singkat produk">${esc(p?.desc||'')}</textarea>
      </div>
      <div class="adm-form-row">
        <label class="adm-form-lbl">URL Gambar (opsional)</label>
        <input class="adm-form-inp" id="apf-image" type="text" value="${esc(p?.image||'')}" placeholder="assett/nama-logo.png">
      </div>
      <div class="adm-form-row">
        <label class="adm-form-lbl">Kategori (pisah koma)</label>
        <input class="adm-form-inp" id="apf-cat" type="text" value="${esc(Array.isArray(p?.cat)?p.cat.join(','):p?.cat||'semuaan')}" placeholder="semuaan,larisann">
      </div>
      <div class="adm-form-row">
        <label class="adm-form-lbl">Status Ketersediaan</label>
        <select class="adm-form-inp" id="apf-avail">
          <option value="true" ${p?.available!==false?'selected':''}>Tersedia</option>
          <option value="false" ${p?.available===false?'selected':''}>Tidak Tersedia</option>
        </select>
      </div>
      <div class="adm-form-row">
        <label class="adm-form-lbl">Paket / Varian <span style="color:var(--ac)">*</span></label>
        <div id="apf-vars">
          ${vars.map((v,i)=>`
            <div class="apf-var-row" id="apf-var-${i}" data-idx="${i}">
              <input class="adm-form-inp apf-var-name" type="text" placeholder="Nama paket (cth: 1 Bulan)" value="${esc(v.n)}" style="flex:2">
              <input class="adm-form-inp apf-var-price" type="number" min="0" placeholder="Harga (Rp)" value="${v.p||''}" style="flex:1">
              <button type="button" class="adm-abtn ab-del" onclick="apfRemVar(${i})" style="flex-shrink:0;padding:8px 10px"><i class="bi bi-trash"></i></button>
            </div>`).join('')}
        </div>
        <button type="button" class="adm-btn-sec" onclick="apfAddVar()" style="margin-top:8px;font-size:.8rem"><i class="bi bi-plus-lg"></i> Tambah Varian</button>
        <div class="adm-form-err" id="apf-vars-err">Minimal satu varian dengan nama dan harga valid</div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--gy4);margin-top:4px">
        <button class="adm-btn-sec" onclick="admCloseProdModal()">Batal</button>
        <button class="adm-btn-primary" onclick="admProdSave('${p?.id||''}')"><i class="bi bi-save"></i> Simpan</button>
      </div>
    </div>`;
}

function apfAddVar(){
  const cont=$('apf-vars');if(!cont)return;
  const rows=cont.querySelectorAll('.apf-var-row');
  const i=rows.length;
  const div=document.createElement('div');
  div.className='apf-var-row';div.id=`apf-var-${i}`;div.dataset.idx=i;
  div.innerHTML=`<input class="adm-form-inp apf-var-name" type="text" placeholder="Nama paket" style="flex:2"><input class="adm-form-inp apf-var-price" type="number" min="0" placeholder="Harga (Rp)" style="flex:1"><button type="button" class="adm-abtn ab-del" onclick="apfRemVar(${i})" style="flex-shrink:0;padding:8px 10px"><i class="bi bi-trash"></i></button>`;
  cont.appendChild(div);
}

function apfRemVar(idx){
  const row=document.querySelector(`[data-idx="${idx}"]`);
  if(row)row.remove();
}

function admProdSave(existingId){
  const name=$('apf-name')?.value.trim();
  const desc=$('apf-desc')?.value.trim()||'';
  const image=$('apf-image')?.value.trim()||'';
  const catRaw=$('apf-cat')?.value.trim()||'semuaan';
  const available=$('apf-avail')?.value==='true';
  const cat=catRaw.split(',').map(c=>c.trim()).filter(Boolean);

  // Validate name
  const nameErr=$('apf-name-err');
  if(!name){if(nameErr)nameErr.style.display='block';return;}
  if(nameErr)nameErr.style.display='none';

  // Collect vars
  const varRows=document.querySelectorAll('#apf-vars .apf-var-row');
  const vars=[];
  varRows.forEach((row,i)=>{
    const n=row.querySelector('.apf-var-name')?.value.trim();
    const p=Number(row.querySelector('.apf-var-price')?.value)||0;
    if(n&&p>=0){
      const existProd=existingId?DB.prods().find(p=>p.id===existingId):null;
      const existVar=existProd?.vars[i];
      vars.push({id:existVar?.id||gid('var'),n,p});
    }
  });

  const varsErr=$('apf-vars-err');
  if(vars.length===0){if(varsErr)varsErr.style.display='block';return;}
  if(varsErr)varsErr.style.display='none';

  const prods=DB.prods();
  if(existingId){
    // Edit
    const idx=prods.findIndex(p=>p.id===existingId);
    if(idx<0){toast('Produk tidak ditemukan','error');return;}
    prods[idx]={...prods[idx],name,desc,image,cat,available,vars,updatedAt:new Date().toISOString()};
    DB.setProds(prods);
    toast(`Produk "${name}" berhasil diperbarui`,'success');
  } else {
    // New
    const id=gid('prod').replace('prod_','').slice(0,12);
    const newProd={id,name,desc,image,cat,available,vars,createdAt:new Date().toISOString()};
    prods.push(newProd);
    DB.setProds(prods);
    toast(`Produk "${name}" berhasil ditambahkan`,'success');
  }

  admCloseProdModal();
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

// ── ADMIN ORDER HANDLERS ──────────────────────────────────────
function admOrdSearch(q){
  window._admOrdQ=q;
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

function admOrdFilter(f){
  window._admOrdFilter=f;
  const main=$('main');if(!main)return;
  main.innerHTML=Pages.admin();
}

async function admOrdDetail(txId){
  const tx=DB.txs().find(t=>t.id===txId);if(!tx)return;
  const requestingUserId = Auth.cu?.id;
  const modal=$('adm-ord-modal');
  const inner=$('adm-ord-modal-inner');
  if(!modal||!inner)return;
  let proofDetails = 'Tidak ada bukti tersimpan';
  if (tx.proofImage) {
    try {
      const proofUrl = await SupabaseDB.getOrderProofUrl(tx.proofImage);
      proofDetails = `<a href="${esc(proofUrl)}" target="_blank" rel="noopener noreferrer">Lihat bukti pembayaran</a>`;
    } catch (err) {
      console.error('[Orders] Gagal membuka bukti pembayaran:', err);
      proofDetails = 'Bukti tersedia, tetapi tidak dapat dibuka';
    }
  }
  if (Auth.cu?.id !== requestingUserId || R.cur !== 'admin') return;
  const pm=PMETHODS.find(m=>m.id===tx.paymentMethod);
  const wa=tx.userWA&&nWA(tx.userWA);
  const waValid=wa&&vWA(tx.userWA);
  const waMsg=`Halo ${tx.userName||'Kak'}!\n\nUpdate pesanan kamu di *Seloss Store*:\n📦 ${tx.productName} (${tx.variantName})\n💰 Total: ${fmt(tx.amount)}\n📋 Status: ${tx.status}\n\nAda yang bisa kami bantu?`;
  const waLink=waValid?`https://wa.me/${wa}?text=${encodeURIComponent(waMsg)}`:null;

  // Valid status transitions
  const canConfirm = tx.status==='pending';
  const canProcess = tx.status==='confirmed';
  const canDone    = tx.status==='processing'||tx.status==='confirmed';
  const canCancel  = !['done','cancelled'].includes(tx.status);

  inner.innerHTML=`
    <div class="adm-modal-hdr">
      <span class="adm-modal-title"><i class="bi bi-receipt"></i> Detail Pesanan</span>
      <button class="adm-modal-close" onclick="admCloseOrdModal()">×</button>
    </div>
    <div class="adm-modal-body" style="max-height:75vh;overflow-y:auto">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--gy4)">
        ${tx.productIcon?`<img src="${esc(tx.productIcon)}" style="width:56px;height:56px;border-radius:12px;object-fit:cover">`:`<span style="width:56px;height:56px;border-radius:12px;background:var(--pr-l);color:var(--pr-d);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800">${esc((tx.productName||'?').charAt(0))}</span>`}
        <div>
          <div style="font-weight:700;font-size:1rem">${esc(tx.productName)}</div>
          <div style="font-size:.8rem;color:var(--gy)">${esc(tx.variantName)}</div>
          <div style="margin-top:6px">${sbdg(tx.status)}</div>
        </div>
      </div>
      <div class="adm-detail-grid">
        ${[
          ['ID Pesanan',`<code style="font-size:.72rem">${tx.id}</code>`],
          ['Pembeli',esc(tx.userName||'-')],
          ['WhatsApp',esc(tx.userWA||'-')],
          ['Email',esc(tx.userEmail||'-')],
          ['Tanggal',fdt(tx.createdAt)],
          ['Diperbarui',fdt(tx.updatedAt||tx.createdAt)],
          ['Metode Bayar',esc(pm?.name||tx.paymentMethod||'-')],
          ['Total',`<strong style="color:var(--pr)">${fmt(tx.amount)}</strong>`],
          ['Status Pembayaran',esc(tx.paymentStatus||'pending')],
          ['Status Pesanan',esc(tx.status||'pending')],
          ['Bukti Pembayaran',proofDetails],
        ].map(([k,v])=>`<div class="adm-det-row"><span>${k}</span><span>${v}</span></div>`).join('')}
      </div>
      ${waValid?`<a href="${waLink}" target="_blank" class="adm-btn-wa"><i class="bi bi-whatsapp"></i> Hubungi via WhatsApp</a>`:`<div class="adm-info-box" style="margin-top:14px"><i class="bi bi-exclamation-triangle"></i> Nomor WhatsApp tidak tersedia atau tidak valid</div>`}
      ${canConfirm||canDone||canCancel?`
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--gy4)">
        ${canConfirm?`<button class="adm-btn-ok" onclick="admOrdUpdate('${tx.id}','confirmed')"><i class="bi bi-check-circle"></i> Konfirmasi</button>`:''}
        ${canProcess?`<button class="adm-btn-ok" onclick="admOrdUpdate('${tx.id}','processing')"><i class="bi bi-arrow-repeat"></i> Proses</button>`:''}
        ${canDone?`<button class="adm-btn-ok" onclick="admOrdUpdate('${tx.id}','done')"><i class="bi bi-check-all"></i> Selesaikan</button>`:''}
        ${canCancel?`<button class="adm-btn-danger" onclick="admOrdCancelConfirm('${tx.id}')"><i class="bi bi-x-lg"></i> Batalkan</button>`:''}
      </div>`:''}
    </div>`;
  modal.style.display='flex';
}

async function admOrdUpdate(txId, newSt){
  if (window._admOrderUpdatingId) return;
  const txs=DB.txs(),tx=txs.find(t=>t.id===txId);if(!tx)return;
  // Validate transition
  const allowed = {
    pending:['confirmed','cancelled'],
    confirmed:['processing','done','cancelled'],
    processing:['done','cancelled'],
    done:[],
    cancelled:[]
  };
  if(!allowed[tx.status]?.includes(newSt)){toast('Transisi status tidak valid','error');return;}
  window._admOrderUpdatingId = txId;
  const statusButtons = document.querySelectorAll('#adm-ord-modal-inner button, #adm-confirm-modal-inner button');
  statusButtons.forEach(button => {
    button.dataset.wasDisabled = String(button.disabled);
    button.disabled = true;
    if (button.getAttribute('onclick')?.includes('admOrdUpdate(')) {
      button.dataset.previousHtml = button.innerHTML;
      button.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i> Menyimpan...';
    }
  });
  try {
    await DB.updateTxStatus(txId,newSt);
  } catch (err) {
    console.error('[Orders] Gagal memperbarui status pesanan:', err);
    statusButtons.forEach(button => {
      button.disabled = button.dataset.wasDisabled === 'true';
      if (button.dataset.previousHtml) button.innerHTML = button.dataset.previousHtml;
      delete button.dataset.wasDisabled;
      delete button.dataset.previousHtml;
    });
    window._admOrderUpdatingId = null;
    toast('Perubahan status gagal disimpan ke database','error');
    return;
  }
  window._admOrderUpdatingId = null;
  const lbl={confirmed:'dikonfirmasi',processing:'diproses',done:'diselesaikan',cancelled:'dibatalkan'};
  toast(`Pesanan berhasil ${lbl[newSt]||newSt}`,'success');
  admCloseOrdModal();admCloseConfirmModal();
  renderAdminAfterOrderUpdate();
}

function admOrdCancelConfirm(txId){
  const confirmModal=$('adm-confirm-modal');
  const confirmInner=$('adm-confirm-modal-inner');
  if(!confirmModal||!confirmInner)return;
  confirmInner.innerHTML=`
    <div class="adm-modal-hdr"><span class="adm-modal-title"><i class="bi bi-exclamation-triangle"></i> Batalkan Pesanan</span><button class="adm-modal-close" onclick="admCloseConfirmModal()">×</button></div>
    <div style="padding:20px">
      <p style="color:var(--dk3);margin-bottom:12px">Apakah Anda yakin ingin membatalkan pesanan ini?</p>
      <div class="adm-info-box"><i class="bi bi-info-circle"></i> Pembatalan tidak otomatis melakukan refund. Hubungi pelanggan jika diperlukan.</div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
        <button class="adm-btn-sec" onclick="admCloseConfirmModal()">Kembali</button>
        <button class="adm-btn-danger" onclick="admOrdUpdate('${txId}','cancelled')"><i class="bi bi-x-lg"></i> Batalkan Pesanan</button>
      </div>
    </div>`;
  admCloseOrdModal();
  confirmModal.style.display='flex';
}

// ── ADMIN BANNER HANDLERS ─────────────────────────────────────
function trigBannerUpload(){$('abf-file')?.click()}
function admCloseBnrModal(){ const m=$('adm-bnr-modal'); if(m) m.style.display='none'; window._admBnrImgData = null; }
function admCloseBnrDelModal(){ const m=$('adm-bnr-del-modal'); if(m) m.style.display='none'; }

function admBannerNew(){
  if(!Auth.isAdm()){ toast('Hanya admin yang dapat mengelola banner','error'); return; }
  const banners = DB.banners();
  if(banners.length >= 5){
    toast('Maksimal 5 banner aktif sudah tercapai','warning');
    return;
  }
  const modal = $('adm-bnr-modal');
  const inner = $('adm-bnr-modal-inner');
  if(!modal || !inner) return;

  window._admBnrImgData = null;
  inner.innerHTML = `
    <div class="adm-modal-hdr">
      <span class="adm-modal-title"><i class="bi bi-plus-lg"></i> Tambahkan Banner Baru</span>
      <button class="adm-modal-close" onclick="admCloseBnrModal()">×</button>
    </div>
    <div class="adm-modal-body">
      <div class="adm-form-row">
        <label class="adm-form-lbl">Judul Banner (Internal) <span style="color:var(--ac)">*</span></label>
        <input class="adm-form-inp" id="abf-title" type="text" placeholder="Contoh: Promo Canva Oktober, Promo Spesial Akhir Tahun">
        <div class="adm-form-err" id="abf-title-err">Judul banner tidak boleh kosong</div>
        <div style="font-size:.73rem;color:var(--gy);margin-top:4px"><i class="bi bi-info-circle"></i> Hanya digunakan di panel admin dan tidak ditampilkan di halaman utama.</div>
      </div>

      <div class="adm-form-row">
        <label class="adm-form-lbl">Upload Gambar Banner <span style="color:var(--ac)">*</span></label>
        <div class="adm-upload-zone" id="abf-dropzone" onclick="trigBannerUpload()">
          <i class="bi bi-cloud-arrow-up" style="font-size:2rem;color:var(--pr);display:block;margin-bottom:6px"></i>
          <span style="font-size:.85rem;font-weight:600;color:var(--dk)">Klik untuk pilih gambar atau seret file ke sini</span>
          <div style="font-size:.73rem;color:var(--gy);margin-top:4px">Format: PNG, JPG, JPEG, WebP (Maks. 10MB; gambar dikompres otomatis)</div>
        </div>
        <input type="file" id="abf-file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="admBnrFileSelected(this)">
        <div class="adm-sample-label">Atau pilih gambar contoh</div>
        <div class="adm-samples-grid">
          ${sampleBanners().map((banner, index) => `
            <button type="button" class="adm-sample-btn" onclick="admBnrUseSample('${banner.id}')">
              <img src="${esc(banner.image)}" alt="${esc(banner.title)}">
              <span>Contoh ${index + 1}</span>
            </button>
          `).join('')}
        </div>
        <div class="adm-ratio-notice">
          <strong>Rekomendasi Standar:</strong> 1440 × 480 piksel (Rasio Aspek <strong>3:1</strong>).<br>
          <em>Tips:</em> Letakkan konten penting di tengah dan hindari teks terlalu dekat dengan tepi.
        </div>
        <div id="abf-ratio-warn" style="display:none;margin-top:6px;padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:var(--r1);font-size:.75rem;color:#92400e">
          <i class="bi bi-exclamation-triangle"></i> Gambar yang dipilih memiliki rasio aspek berbeda dari rekomendasi 3:1. Gambar tetap akan ditampilkan utuh (proporsional).
        </div>
        <div class="adm-form-err" id="abf-file-err">Silakan pilih file gambar banner</div>

        <div id="abf-preview-container" style="display:none;margin-top:10px">
          <label class="adm-form-lbl">Preview Banner:</label>
          <div class="adm-preview-wrap">
            <img id="abf-preview-img" src="" alt="Preview Banner">
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:12px;border-top:1px solid var(--gy4);margin-top:14px">
        <button class="adm-btn-sec" onclick="admCloseBnrModal()">Batal</button>
        <button class="adm-btn-primary" onclick="admBannerSave()"><i class="bi bi-save"></i> Simpan Banner</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  // Setup drag & drop
  const dz = $('abf-dropzone');
  if(dz){
    ['dragenter','dragover'].forEach(evt => dz.addEventListener(evt, (e)=>{ e.preventDefault(); dz.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(evt => dz.addEventListener(evt, (e)=>{ e.preventDefault(); dz.classList.remove('dragover'); }));
    dz.addEventListener('drop', (e)=>{
      const f = e.dataTransfer?.files?.[0];
      if(f) admBnrProcessFile(f);
    });
  }
}

function admBnrFileSelected(input){
  const f = input?.files?.[0];
  if(f) admBnrProcessFile(f);
}

function admBnrUseSample(id){
  if(!Auth.isAdm()){ toast('Akses ditolak','error'); return; }
  const banner = sampleBanners().find(item => item.id === id);
  if(!banner)return;
  window._admBnrImgData = banner.image;
  const titleInput = $('abf-title');
  if(titleInput&&!titleInput.value.trim())titleInput.value = banner.title;
  const preview = $('abf-preview-container');
  const previewImg = $('abf-preview-img');
  if(preview&&previewImg){
    previewImg.src = banner.image;
    preview.style.display = 'block';
  }
  const fileError = $('abf-file-err');
  if(fileError)fileError.style.display = 'none';
  const ratioWarning = $('abf-ratio-warn');
  if(ratioWarning)ratioWarning.style.display = 'none';
}

function admBnrProcessFile(file){
  const err = $('abf-file-err');
  const warn = $('abf-ratio-warn');
  window._admBnrImgData = null;
  if(err) err.style.display = 'none';
  const preview = $('abf-preview-container');
  if(preview) preview.style.display = 'none';

  // Validate type
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if(!allowed.includes(file.type)){
    if(err){ err.textContent = 'Format file tidak valid. Gunakan PNG, JPG, JPEG, atau WebP.'; err.style.display = 'block'; }
    return;
  }
  // Validate size (max 10MB before browser-side compression)
  if(file.size > 10 * 1024 * 1024){
    if(err){ err.textContent = 'Ukuran gambar terlalu besar (maksimal 10MB).'; err.style.display = 'block'; }
    return;
  }

  const reader = new FileReader();
  reader.onerror = function(){
    if(err){ err.textContent = 'Gambar gagal dibaca. Silakan pilih file lain.'; err.style.display = 'block'; }
  };
  reader.onload = function(e){
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = function(){
      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;
      const ratio = sourceWidth / sourceHeight;
      if(warn){
        // Ideal ratio is around 3.0 (between 2.6 and 3.4)
        warn.style.display = (ratio < 2.5 || ratio > 3.5) ? 'block' : 'none';
      }
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if(!context){
        if(err){ err.textContent = 'Browser tidak dapat memproses gambar ini.'; err.style.display = 'block'; }
        return;
      }
      let outputWidth = Math.min(sourceWidth, 1920);
      let quality = 0.86;
      let compressedData = '';
      for(let attempt = 0; attempt < 10; attempt++){
        canvas.width = outputWidth;
        canvas.height = Math.max(1, Math.round(sourceHeight * outputWidth / sourceWidth));
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        compressedData = canvas.toDataURL('image/webp', quality);
        if(compressedData.length <= 450000)break;
        if(quality > 0.62)quality -= 0.08;
        else { outputWidth = Math.max(320, Math.round(outputWidth * 0.82)); quality = 0.78; }
      }
      if(compressedData.length > 450000){
        if(err){ err.textContent = 'Gambar masih terlalu besar setelah dikompres. Coba file dengan dimensi lebih kecil.'; err.style.display = 'block'; }
        return;
      }
      window._admBnrImgData = compressedData;
      const prevCont = $('abf-preview-container');
      const prevImg = $('abf-preview-img');
      if(prevCont && prevImg){
        prevImg.src = compressedData;
        prevCont.style.display = 'block';
      }
    };
    img.onerror = function(){
      if(err){ err.textContent = 'File tidak dapat dibaca sebagai gambar.'; err.style.display = 'block'; }
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function admBannerSave(){
  if(!Auth.isAdm()){ toast('Akses ditolak','error'); return; }
  const title = $('abf-title')?.value.trim();
  const titleErr = $('abf-title-err');
  const fileErr = $('abf-file-err');

  let valid = true;
  if(!title){
    if(titleErr) titleErr.style.display = 'block';
    valid = false;
  } else if(titleErr) titleErr.style.display = 'none';

  if(!window._admBnrImgData){
    if(fileErr){ fileErr.textContent = 'Silakan pilih gambar banner terlebih dahulu'; fileErr.style.display = 'block'; }
    valid = false;
  } else if(fileErr) fileErr.style.display = 'none';

  if(!valid) return;

  const banners = DB.banners();
  if(banners.length >= 5){
    toast('Maksimal 5 banner aktif sudah tercapai','error');
    return;
  }

  const newBanner = {
    id: gid('bnr'),
    title: title,
    image: window._admBnrImgData,
    order: banners.length,
    createdAt: new Date().toISOString()
  };

  if(!DB.setBanners([...banners, newBanner])){
    toast('Banner gagal disimpan. Penyimpanan browser mungkin penuh; coba gambar yang lebih kecil.','error');
    return;
  }
  toast(`Banner "${title}" berhasil ditambahkan`,'success');

  admCloseBnrModal();
  const main = $('main');
  if(main) main.innerHTML = Pages.admin();
}

function admBannerDel(id){
  if(!Auth.isAdm()){ toast('Akses ditolak','error'); return; }
  const banners = DB.banners();
  const b = banners.find(item => item.id === id);
  if(!b) return;

  const modal = $('adm-bnr-del-modal');
  const inner = $('adm-bnr-del-modal-inner');
  if(!modal || !inner) return;

  inner.innerHTML = `
    <div class="adm-modal-hdr">
      <span class="adm-modal-title"><i class="bi bi-trash"></i> Hapus Banner</span>
      <button class="adm-modal-close" onclick="admCloseBnrDelModal()">×</button>
    </div>
    <div style="padding:20px">
      <p style="color:var(--dk3);margin-bottom:12px">Apakah Anda yakin ingin menghapus banner <strong>"${esc(b.title||'Banner')}"</strong>?</p>
      <div class="adm-info-box"><i class="bi bi-info-circle"></i> Banner akan langsung dihapus dari carousel halaman utama.</div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
        <button class="adm-btn-sec" onclick="admCloseBnrDelModal()">Batal</button>
        <button class="adm-btn-danger" onclick="admBannerDelConfirm('${id}')"><i class="bi bi-trash"></i> Hapus Banner</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function admBannerDelConfirm(id){
  if(!Auth.isAdm()){ toast('Akses ditolak','error'); return; }
  const banners = DB.banners();
  const b = banners.find(item => item.id === id);
  if(!b)return;
  if(!DB.delBanner(id)){
    toast('Banner gagal dihapus dari penyimpanan browser.','error');
    return;
  }
  toast(`Banner "${b?.title||'Promosi'}" berhasil dihapus`,'success');
  admCloseBnrDelModal();

  const main = $('main');
  if(main) main.innerHTML = Pages.admin();
}

  window.goAdmSub          = goAdmSub;
  window.admChartClick     = admChartClick;
  window.admProdSearch     = admProdSearch;
  window.admProdFilter     = admProdFilter;
  window.admProdToggle     = admProdToggle;
  window.admProdDel        = admProdDel;
  window.admProdDelConfirm = admProdDelConfirm;
  window.admCloseDelModal  = admCloseDelModal;
  window.admCloseProdModal = admCloseProdModal;
  window.admCloseOrdModal  = admCloseOrdModal;
  window.admCloseConfirmModal = admCloseConfirmModal;
  window.admProdNew        = admProdNew;
  window.admProdEdit       = admProdEdit;
  window.admProdSave       = admProdSave;
  window.apfAddVar         = apfAddVar;
  window.apfRemVar         = apfRemVar;
  window.admOrdSearch      = admOrdSearch;
  window.admOrdFilter      = admOrdFilter;
  window.admOrdDetail      = admOrdDetail;
  window.admOrdUpdate      = admOrdUpdate;
  window.admOrdCancelConfirm = admOrdCancelConfirm;
  window.admCloseBnrModal    = admCloseBnrModal;
  window.admCloseBnrDelModal = admCloseBnrDelModal;
  window.trigBannerUpload    = trigBannerUpload;
  window.admBannerNew        = admBannerNew;
  window.admBnrFileSelected  = admBnrFileSelected;
  window.admBnrUseSample     = admBnrUseSample;
  window.admBannerSave       = admBannerSave;
  window.admBannerDel        = admBannerDel;
  window.admBannerDelConfirm = admBannerDelConfirm;

  checkOAuthCallback().then(result => {
    $('ls')?.classList.add('hide');
    DB.syncWithSupabase().catch(err => console.warn('[Supabase Sync Error]', err));
    if (result?.recovery) {
      R.go('reset-password');
    } else if (result?.user) {
      toast(`Selamat datang, ${result.user.name}!`, 'success');
      R.go('home');
    } else {
      R.go('home');
    }
  }).catch(err => {
    console.error('[Auth] Gagal memproses tautan autentikasi:', err);
    $('ls')?.classList.add('hide');
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    if (params.get('auth') === 'reset-password' || params.get('type') === 'recovery' || hashParams.get('type') === 'recovery') {
      toast('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.','error',6000);
      R.go('forgot');
    } else {
      toast('Login tidak dapat diselesaikan. Silakan coba lagi.','error',6000);
      R.go('login');
    }
  });
}

// ── OAuth Callback Handler ──────────────────────────────────
async function checkOAuthCallback() {
  const hash = window.location.hash || '';
  const queryParams = new URLSearchParams(window.location.search || '');
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const isRecovery = queryParams.get('auth') === 'reset-password'
    || queryParams.get('type') === 'recovery'
    || hashParams.get('type') === 'recovery';
  const hasOAuthResponse = hashParams.has('access_token') || queryParams.has('code');

  if (queryParams.get('error_description') || queryParams.get('error')) {
    throw new Error(queryParams.get('error_description') || queryParams.get('error'));
  }

  if (hasOAuthResponse || isRecovery) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Koneksi Supabase tidak tersedia untuk memproses callback');

    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const sessionUser = sessionData?.session?.user;
    if (!sessionUser?.id || !sessionUser.email) {
      throw new Error('Callback autentikasi tidak menghasilkan sesi pengguna');
    }

    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError) throw userError;
    if (userData?.user?.id !== sessionUser.id) {
      throw new Error('Identitas sesi OAuth tidak dapat diverifikasi');
    }
  }

  const user = await Auth.restoreSupabaseSession();
  if (isRecovery) {
    window.history.replaceState(null, '', `${window.location.pathname}?auth=reset-password`);
    return { recovery: true, user };
  }
  if (hasOAuthResponse) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  return user ? { user } : null;
}

// Single DOMContentLoaded — entry point
document.addEventListener('DOMContentLoaded', initApp);
