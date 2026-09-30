// ============================================================
//  SELOSS STORE — Main Application Script v1.0// ============================================================

import { CFG, PMETHODS, STLBLS } from './config.js';
import { hs, gid, fmt, fdt, disc, esc, vEmail, vWA, nWA, $ } from './utils.js';
import { sampleProds, sampleBanners } from './sample-data.js';
import { DB } from './db.js';
import { Auth } from './auth.js';
import { St } from './store.js';

// Expose shared modules to window for inline HTML handlers
window.Auth = Auth;
window.DB = DB;
window.St = St;
window.fmt = fmt;
window.esc = esc;
window.disc = disc;

// ── TOAST ────────────────────────────────────────────────────
export function toast(msg, type = 'success', dur = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const cols = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const c = $('tc');
  if (!c) return;
  const id = 't_' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'ti';
  el.style.borderLeft = `4px solid ${cols[type]}`;
  el.innerHTML = `<span>${icons[type]}</span><span style="flex:1">${esc(msg)}</span><button class="tc-x" onclick="rmT('${id}')">×</button>`;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => rmT(id), dur);
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


// ── UPDATE NAV UI ────────────────────────────────────────────
function updNav(){
  const u=Auth.cu;if(!u)return;
  const av=$('nav-av');if(av)av.textContent=u.avatar||u.name[0];
  const isAdm=Auth.isAdm();
  ['sbi-adm','sb-admin-lbl'].forEach(id=>{const el=$(id);if(el)el.style.display=isAdm?'':'none'});
  const badm=$('bni-adm');if(badm)badm.style.display=isAdm?'':'none';
  const pg=R.cur;
  const map={home:['sbi-home','bni-home'],history:['sbi-hist','bni-hist'],profile:['sbi-prof','bni-prof'],admin:['sbi-adm','bni-adm']};
  document.querySelectorAll('.sb-item,.bn-it').forEach(el=>{el.classList.remove('act')});
  if(map[pg])map[pg].forEach(id=>{const el=$(id);if(el)el.classList.add('act')});
}

// ── SIDEBAR ──────────────────────────────────────────────────
function tglSB(){$('sb').classList.toggle('open');$('sb-ov').classList.toggle('show')}
function closeSB(){$('sb').classList.remove('open');$('sb-ov').classList.remove('show')}
function gocat(c){St.cat=c;R.go('home');closeSB()}
function openPriceModal(id){
  const p=DB.prods().find(pr=>pr.id===id);
  if(!p)return;
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
  St.co.step=3;
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
function tglMobSearch(){mobSrchOpen=!mobSrchOpen;$('mob-sb').classList.toggle('show',mobSrchOpen)}
function handleSearch(v){St.q=v}
function doSearch(){R.go('home');closeSB()}
function clearSrch(){St.q='';const si=$('srch-inp'),mi=$('mob-srch-inp');if(si)si.value='';if(mi)mi.value='';R.go('home')}

// ── STATUS BADGE ─────────────────────────────────────────────
function sbdg(status){
  const m={pending:['s-pend','⏳ Menunggu'],confirmed:['s-conf','✅ Dikonfirmasi'],processing:['s-proc','🔄 Diproses'],done:['s-done','🎉 Selesai'],cancelled:['s-canc','✕ Dibatalkan']};
  const[cls,lbl]=m[status]||['s-pend',status];
  return`<span class="stbdg ${cls}">${lbl}</span>`;
}

// ── WA MESSAGE ───────────────────────────────────────────────
function buildWA(p,v,cd){
  const f=cd.form,pm=PMETHODS.find(m=>m.id===cd.pm);
  let extra='';
  if(p.dynF)p.dynF.forEach(field=>{const val=f['f-'+field.id];if(val)extra+=`\n📌 ${field.lbl}: ${val}`});
  return`Halo Admin Seloss Store! 👋\n\n*Konfirmasi Pesanan Baru*\n━━━━━━━━━━━━━━━━━━━\n📦 Produk: ${p.name}\n📋 Paket: ${v.n}\n💰 Total: ${fmt(v.p)}\n━━━━━━━━━━━━━━━━━━━\n👤 Nama: ${f['f-name']||Auth.cu?.name||'-'}\n📱 WhatsApp: ${f['f-wa']||'-'}\n📧 Email: ${f['f-em']||'-'}${extra}\n━━━━━━━━━━━━━━━━━━━\n💳 Metode: ${pm?.name||cd.pm}\n━━━━━━━━━━━━━━━━━━━\n✅ Bukti transfer sudah diupload.\nMohon segera diproses. Terima kasih! 🙏`;
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
  const m={flash:{cls:'b-flash',lbl:'⚡ Flash'},promo:{cls:'b-promo',lbl:'🏷️ Promo'},lmt:{cls:'b-lmt',lbl:'🔴 Terbatas'},bestseller:{cls:'b-bs',lbl:'🔥 Best Seller'}};
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
  },

  loginH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">⚡ Seloss Store</span><span class="alo-s">Cepat &bull; Simple &bull; Tanpa Ribet</span></div>
    <div class="a-ttl">Masuk ke Akun</div>
    <div class="a-sub">Belum punya akun? <a href="#" class="a-lnk" onclick="R.go('register');return false">Daftar Sekarang</a></div>
    <div class="a-err" id="le"></div>
    <div class="aig"><label>Email</label><div class="aii-wrap"><i class="bi bi-envelope-fill aii-ico"></i><input class="aii" id="le-em" type="email" placeholder="email@kamu.com" autocomplete="email" onkeydown="if(event.key==='Enter')doLogin()"></div></div>
    <div class="aig"><label>Password</label><div class="aii-wrap"><i class="bi bi-lock-fill aii-ico"></i><input class="aii" id="le-pw" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"><button class="aii-pw" type="button" onclick="tglPw('le-pw',this)"><i class="bi bi-eye-fill"></i></button></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><label class="a-rem"><input type="checkbox" id="le-rem"> Ingat saya</label><a href="#" class="a-lnk" onclick="R.go('forgot');return false" style="font-size:.8rem">Lupa password?</a></div>
    <button class="a-btn pulse" onclick="doLogin()"><i class="bi bi-box-arrow-in-right"></i> Masuk Sekarang</button>
    <div class="a-divider">atau coba demo</div>
    <button class="a-btn ghost" onclick="demoLogin('user')">👤 Login sebagai User Demo</button>
    <button class="a-btn ghost" onclick="demoLogin('admin')" style="margin-top:8px">🛡️ Login sebagai Admin Demo</button>
  </div>`},

  regH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">⚡ Seloss Store</span><span class="alo-s">Cepat &bull; Simple &bull; Tanpa Ribet</span></div>
    <div class="a-ttl">Buat Akun Baru</div>
    <div class="a-sub">Sudah punya akun? <a href="#" class="a-lnk" onclick="R.go('login');return false">Masuk di sini</a></div>
    <div class="a-err" id="re"></div>
    <div class="aig"><label>Nama Lengkap</label><div class="aii-wrap"><i class="bi bi-person-fill aii-ico"></i><input class="aii" id="re-nm" type="text" placeholder="Nama kamu" autocomplete="name" onkeydown="if(event.key==='Enter')doReg()"></div></div>
    <div class="aig"><label>Email</label><div class="aii-wrap"><i class="bi bi-envelope-fill aii-ico"></i><input class="aii" id="re-em" type="email" placeholder="email@kamu.com" autocomplete="email" onkeydown="if(event.key==='Enter')doReg()"></div></div>
    <div class="aig"><label>Password <span style="font-size:.72rem;color:rgba(255,255,255,.3)">(min. 6 karakter)</span></label><div class="aii-wrap"><i class="bi bi-lock-fill aii-ico"></i><input class="aii" id="re-pw" type="password" placeholder="Buat password kuat" autocomplete="new-password" onkeydown="if(event.key==='Enter')doReg()"><button class="aii-pw" type="button" onclick="tglPw('re-pw',this)"><i class="bi bi-eye-fill"></i></button></div></div>
    <div class="aig"><label>Konfirmasi Password</label><div class="aii-wrap"><i class="bi bi-shield-lock-fill aii-ico"></i><input class="aii" id="re-cf" type="password" placeholder="Ulangi password" autocomplete="new-password" onkeydown="if(event.key==='Enter')doReg()"><button class="aii-pw" type="button" onclick="tglPw('re-cf',this)"><i class="bi bi-eye-fill"></i></button></div></div>
    <button class="a-btn pulse" onclick="doReg()"><i class="bi bi-person-plus-fill"></i> Daftar Sekarang</button>
    <div class="a-ft">Sudah punya akun? <a href="#" class="a-lnk" onclick="R.go('login');return false">Masuk</a></div>
  </div>`},

  forgH(){return`<div class="ac fade-in">
    <div class="alo"><span class="alo-t">⚡ Seloss Store</span></div>
    <div class="a-ttl">Reset Password</div>
    <div class="a-sub">Masukkan email terdaftar untuk verifikasi akun kamu.</div>
    <div class="a-err" id="fe"></div>
    <div class="a-ok" id="fo"></div>
    <div class="aig"><label>Email Terdaftar</label><div class="aii-wrap"><i class="bi bi-envelope-fill aii-ico"></i><input class="aii" id="fe-em" type="email" placeholder="email@kamu.com" onkeydown="if(event.key==='Enter')doForg()"></div></div>
    <button class="a-btn" onclick="doForg()"><i class="bi bi-search"></i> Cek Akun Saya</button>
    <div class="a-ft"><a href="#" class="a-lnk" onclick="R.go('login');return false">← Kembali ke Login</a></div>
  </div>`},

  // ── APP PAGES ────────────────────────────────────────────
  app(page,prms){
    const main=$('main');closeSB();
    if(page==='home')main.innerHTML=this.home();
    else if(page==='detail')main.innerHTML=this.detail(prms);
    else if(page==='checkout')main.innerHTML=this.checkout();
    else if(page==='history')main.innerHTML=this.hist();
    else if(page==='profile')main.innerHTML=this.profile();
    else if(page==='admin'){if(!Auth.isAdm()){toast('Akses ditolak','error');R.go('home');return}main.innerHTML=this.admin()}
    main.classList.remove('fade-in');void main.offsetWidth;main.classList.add('fade-in');
    if(page==='home')this.afterHome();
    if(page==='checkout')this.afterCo();
    if(page==='detail')this.afterDetail(prms);
  },

  // HOME
  home(){
    const prods=DB.prods(),banners=sampleBanners();
    let cat=St.cat,q=St.q.toLowerCase();
    const cats=[
      {id:'semuaan',lbl:'Semuaan'},
      {id:'larisann',lbl:'Larisann'},
      {id:'ngeditann',lbl:'Ngeditann'},
      {id:'streamingann',lbl:'Streamingann'},
      {id:'ai-ann',lbl:'AI-ann'}
    ];
    let filtered=prods;
    if(cat!=='semuaan')filtered=filtered.filter(p=>Array.isArray(p.cat)?p.cat.includes(cat):p.cat===cat);
    if(q)filtered=filtered.filter(p=>p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q));
    return`
    <div class="bsl"><div class="bsl-trk" id="bsl-trk"></div><div class="bsl-dots" id="bsl-dots"></div><button class="bsl-nav bsl-prev" onclick="goSl((BslIdx-1+${banners.length})%${banners.length})"><i class="bi bi-chevron-left"></i></button><button class="bsl-nav bsl-next" onclick="goSl((BslIdx+1)%${banners.length})"><i class="bi bi-chevron-right"></i></button></div>
    <div class="sh"><div class="sh-ttl"><span>📦</span>Kategori</div></div>
    <div class="cats">${cats.map(c=>`<button class="cat-tab${St.cat===c.id?' act':''}" onclick="filterCat('${c.id}')">${c.lbl}</button>`).join('')}</div>
    ${q?`<div style="margin-bottom:12px;font-size:.875rem;color:var(--gy)">Hasil pencarian "<strong>${esc(q)}</strong>" — ${filtered.length} produk <a href="#" style="color:var(--ac);font-size:.8rem;margin-left:6px" onclick="clearSrch();return false">✕ Hapus</a></div>`:''}
    <div class="sh"><div class="sh-ttl"><span>🛍️</span>${cats.find(c=>c.id===cat)?.lbl||'Semuaan'}</div><span style="font-size:.78rem;color:var(--gy)">${filtered.length} layanan</span></div>
    ${filtered.length===0?`<div class="empty-st"><span class="ei">🔍</span><h3>Produk tidak ditemukan</h3><p>Coba kata kunci lain atau kategori berbeda</p></div>`:`<div class="pgrid" id="pgrid">${skelCards(filtered.length)}</div>`}
    <div class="pl-modal" id="pl-modal" onclick="closePriceModal(event)"><div class="pl-sheet" id="pl-sheet"></div></div>`;
  },


  afterHome(){
    initBsl(sampleBanners());
    // Render actual products after skeleton
    setTimeout(()=>{
      const pg=$('pgrid');if(!pg)return;
      const filtered=this._filtered();
      pg.innerHTML=filtered.map(p=>this.pcard(p)).join('');
    },350);
  },

  _filtered(){
    const prods=DB.prods();let cat=St.cat,q=St.q.toLowerCase();
    let f=prods;
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
    if(!p)return`<div class="empty-st"><span class="ei">❌</span><h3>Produk tidak ditemukan</h3><button class="btn-pr" style="margin-top:14px" onclick="R.go('home')">Ke Beranda</button></div>`;
    St.co.prod=p;St.co.variant=p.vars[0];St.co.step=2;
    return`<div class="ph"><button class="back-btn" onclick="R.go('home')"><i class="bi bi-arrow-left"></i></button><div class="ph-ttl">Detail Produk</div></div>
    <div class="dt-hdr"><div class="dt-ico">📦</div><div class="dt-info"><div class="dt-nm">${esc(p.name)}</div>
    <div class="dt-rt"><span class="star">★</span>${p.rating} &nbsp;•&nbsp; <i class="bi bi-bag-check-fill"></i> ${p.sold?.toLocaleString('id-ID')} terjual${p.flash?` &nbsp;•&nbsp; <span style="color:#FFD700">⚡ Flash Sale!</span>`:''}</div>
    <div class="dt-desc">${esc(p.desc)}</div></div></div>
    ${p.flash?`<div style="background:linear-gradient(135deg,#10052a,#0a1628);border-radius:var(--r3);padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px"><span style="font-size:1.4rem">⏳</span><div><div style="font-size:.7rem;color:rgba(255,255,255,.45);margin-bottom:4px">FLASH SALE BERAKHIR DALAM</div><div id="dt-cd" class="cdbox" style="display:inline-flex"></div></div></div>`:''}
    <div class="scont" style="margin-bottom:14px"><div class="stttl"><i class="bi bi-grid-3x3-gap-fill" style="color:var(--pr)"></i> Pilih Paket</div>
    <div class="vars-grid" id="vg">${p.vars.map((v,i)=>`<div class="var-card${i===0?' sel':''}" id="vc-${v.id}" onclick="selVar('${p.id}','${v.id}')"><div class="var-nm">${esc(v.n)}</div><div class="var-pr">${fmt(v.p)}</div>${v.o>v.p?`<div class="var-og">${fmt(v.o)}</div><div class="var-disc">-${disc(v.o,v.p)}%</div>`:''} ${v.stk<=10?`<div class="var-low">⚠️ Sisa ${v.stk} slot!</div>`:''}</div>`).join('')}</div></div>
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
    if(!p)return`<div class="empty-st"><span class="ei">🛒</span><h3>Tidak ada produk dipilih</h3><p>Silakan pilih produk terlebih dahulu</p><button class="btn-pr" style="margin-top:14px" onclick="R.go('home')">Ke Beranda</button></div>`;
    const stH=STLBLS.map((lbl,i)=>{const n=i+1,done=n<step,act=n===step;return`${i>0?`<div class="stline${done?' done':''}"></div>`:''}
    <div class="st-it"><div class="st-c${done?' done':''}${act?' act':''}">${done?'<i class="bi bi-check-lg"></i>':n}</div><div class="st-lb${act?' act':''}">${lbl}</div></div>`}).join('');
    return`<div class="ph"><button class="back-btn" onclick="coBk()"><i class="bi bi-arrow-left"></i></button><div class="ph-ttl">Checkout — Step ${step}/7</div></div>
    <div class="stbar">${stH}</div><div id="step-c">${this.stepC(step,p,v,cd)}</div>`;
  },

  stepC(step,p,v,cd){
    if(step===2)return this.st2(p,v);
    if(step===3)return this.st3(p,v);
    if(step===4)return this.st4(cd);
    if(step===5)return this.st5(v,cd);
    if(step===6)return this.st6();
    if(step===7)return this.st7(p,v,cd);
    return'';
  },

  st2(p,v){return`<div class="stcont"><div class="stttl"><i class="bi bi-grid-3x3-gap-fill" style="color:var(--pr)"></i> Pilih Varian Produk</div>
    <div class="ibox" style="margin-bottom:16px"><span class="ibox-i">📦</span><div><strong>${esc(p.name)}</strong><br><span style="font-size:.8rem">Pilih paket yang kamu mau 👇</span></div></div>
    <div class="vars-grid" id="vg-co">${p.vars.map(vv=>`<div class="var-card${vv.id===v.id?' sel':''}" onclick="coSelVar('${vv.id}')"><div class="var-nm">${esc(vv.n)}</div><div class="var-pr">${fmt(vv.p)}</div></div>`).join('')}</div>
    <button class="btn-pr" style="width:100%;margin-top:8px" onclick="coNext()">Lanjutkan <i class="bi bi-arrow-right"></i></button></div>`},

  st3(p,v){
    const u=Auth.cu;
    return`<div class="stcont"><div class="stttl"><i class="bi bi-person-fill" style="color:var(--pr)"></i> Isi Data Pembeli</div>
    <div class="ibox" style="margin-bottom:18px"><span class="ibox-i">📦</span><div><strong>${esc(p.name)}</strong> — ${esc(v.n)}<br><span style="font-size:.8rem;font-weight:700;color:var(--pr)">${fmt(v.p)}</span></div></div>
    <div class="fg"><label class="flbl">Nama Lengkap <span class="req">*</span></label><input class="finp" id="f-name" type="text" placeholder="Nama kamu" value="${esc(u?.name||'')}"><div class="ferr" id="err-name">Nama tidak boleh kosong</div></div>
    <div class="fg"><label class="flbl">No. WhatsApp Aktif <span class="req">*</span></label><input class="finp" id="f-wa" type="tel" placeholder="08xxxxxxxxxx" value="${esc(u?.phone||'')}"><div class="fhint">Format: 08xxx atau 628xxx</div><div class="ferr" id="err-wa">Format nomor WA tidak valid</div></div>
    <div class="fg"><label class="flbl">Email Aktif <span class="req">*</span></label><input class="finp" id="f-em" type="email" placeholder="email@kamu.com" value="${esc(u?.email||'')}"><div class="ferr" id="err-em">Format email tidak valid</div></div>
    <button class="btn-pr" style="width:100%" onclick="coNext()">Lanjutkan <i class="bi bi-arrow-right"></i></button></div>`;
  },

  st4(cd){return`<div class="stcont"><div class="stttl"><i class="bi bi-wallet2" style="color:var(--pr)"></i> Pilih Metode Pembayaran</div>
    <div class="pay-grid">${PMETHODS.map(pm=>`<div class="pay-card${cd.pm===pm.id?' sel':''}" onclick="selPay('${pm.id}')"><span class="pay-ico">${pm.icon}</span><div class="pay-nm">${esc(pm.name)}</div></div>`).join('')}</div>
    <div id="pay-info" style="display:none" class="ibox" style="margin-bottom:14px"><span class="ibox-i">💡</span><div id="pay-info-t"></div></div>
    <button class="btn-pr" style="width:100%;margin-top:8px" id="btn-np" onclick="coNext()" disabled>Lanjutkan <i class="bi bi-arrow-right"></i></button></div>`},

  st5(v,cd){
    const pm=PMETHODS.find(m=>m.id===cd.pm)||PMETHODS[0];
    const isQR=pm.id==='qris';
    return`<div class="stcont"><div class="stttl"><i class="bi bi-credit-card-fill" style="color:var(--pr)"></i> Informasi Pembayaran</div>
    <div style="background:var(--gy5);border-radius:var(--r3);padding:20px;text-align:center;margin-bottom:14px">
      <div style="font-size:2.2rem;margin-bottom:6px">${pm.icon}</div>
      <div style="font-size:.95rem;font-weight:700;margin-bottom:10px">${esc(pm.name)}</div>
      ${isQR?`<div class="qr-ph"><svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none"><rect x="5" y="5" width="28" height="28" stroke="white" stroke-width="2.5" fill="none"/><rect x="10" y="10" width="18" height="18" fill="white" opacity=".3"/><rect x="47" y="5" width="28" height="28" stroke="white" stroke-width="2.5" fill="none"/><rect x="52" y="10" width="18" height="18" fill="white" opacity=".3"/><rect x="5" y="47" width="28" height="28" stroke="white" stroke-width="2.5" fill="none"/><rect x="10" y="52" width="18" height="18" fill="white" opacity=".3"/><rect x="47" y="47" width="6" height="6" fill="white" opacity=".5"/><rect x="56" y="47" width="6" height="6" fill="white" opacity=".5"/><rect x="65" y="47" width="10" height="6" fill="white" opacity=".5"/><rect x="47" y="56" width="12" height="6" fill="white" opacity=".5"/><rect x="62" y="56" width="13" height="6" fill="white" opacity=".5"/><rect x="47" y="65" width="6" height="10" fill="white" opacity=".5"/><rect x="56" y="65" width="10" height="10" fill="white" opacity=".5"/><rect x="69" y="65" width="6" height="10" fill="white" opacity=".5"/></svg><span style="font-size:.72rem">Scan QRIS di atas</span></div>`:
      `<div style="background:white;border-radius:var(--r2);padding:14px;font-size:.9rem;font-weight:600;color:var(--dk);white-space:pre-line">${esc(pm.info)}</div>`}
    </div>
    <div style="background:linear-gradient(135deg,var(--pr),var(--sc));border-radius:var(--r2);padding:16px;text-align:center;margin-bottom:14px">
      <div style="color:rgba(255,255,255,.7);font-size:.78rem;margin-bottom:4px">Total yang harus dibayar</div>
      <div style="color:#fff;font-size:1.8rem;font-weight:900">${fmt(v.p)}</div>
      <div style="color:rgba(255,255,255,.6);font-size:.78rem;margin-top:3px">Transfer tepat sesuai nominal di atas</div>
    </div>
    <div class="ibox" style="margin-bottom:14px"><span class="ibox-i">⚠️</span><div style="font-size:.82rem">Pastikan transfer tepat sesuai nominal. Jika nominal berbeda, pesanan bisa tertunda. Setelah transfer, klik tombol di bawah.</div></div>
    <button class="btn-pr" style="width:100%" onclick="coNext()">Sudah Transfer — Upload Bukti <i class="bi bi-arrow-right"></i></button></div>`;
  },

  st6(){return`<div class="stcont"><div class="stttl"><i class="bi bi-cloud-arrow-up-fill" style="color:var(--pr)"></i> Upload Bukti Pembayaran</div>
    <div class="ibox" style="margin-bottom:16px"><span class="ibox-i">📸</span><div style="font-size:.83rem">Upload foto/screenshot bukti transfer atau pembayaran kamu. Pastikan nomor tujuan dan nominal jelas terlihat.</div></div>
    <div class="upl" id="upl-area" onclick="trigUpload()">
      <span class="upl-ico" id="upl-ico">📤</span>
      <div class="upl-t" id="upl-t">Klik untuk pilih file atau drag & drop</div>
      <div class="upl-h" id="upl-h">PNG, JPG, JPEG, GIF • Maksimal 10MB</div>
      <img id="upl-prev" class="upl-prev" alt="Preview bukti">
    </div>
    <input type="file" id="file-inp" accept="image/*" style="display:none" onchange="handleFile(event)">
    <button class="btn-pr" style="width:100%;margin-top:18px" id="btn-nu" onclick="coNext()" disabled><i class="bi bi-send-check-fill"></i> Kirim & Lanjutkan</button></div>`;
  },

  st7(p,v,cd){
    const waMsg=buildWA(p,v,cd);
    const waLink=`https://wa.me/${CFG.adminWA}?text=${encodeURIComponent(waMsg)}`;
    if(!cd.txId){
      const tx={id:gid('tx'),userId:Auth.cu.id,userName:cd.form['f-name']||Auth.cu?.name||'',userWA:cd.form['f-wa']||'',userEmail:cd.form['f-em']||'',productId:p.id,productName:p.name,productIcon:p.image,variantId:v.id,variantName:v.n,amount:v.p,paymentMethod:cd.pm,formData:cd.form,proofImage:cd.proof?'uploaded':null,status:'pending',waMessage:waMsg,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      DB.upsertTx(tx);St.co.txId=tx.id;
    }
    const pm=PMETHODS.find(m=>m.id===cd.pm);
    return`<div class="succ-card"><div class="succ-ico">✅</div>
    <div class="succ-ttl">Hampir Selesai! 🎉</div>
    <div class="succ-sub">Bukti pembayaranmu berhasil diterima!<br>Hubungi admin via WhatsApp agar pesanan segera diproses ya.</div>
    <div style="background:var(--gy5);border-radius:var(--r2);padding:16px;text-align:left;margin-bottom:20px;font-size:.82rem">
      <div style="font-weight:700;margin-bottom:10px;color:var(--dk)">📋 Ringkasan Pesanan</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px">
        <span style="color:var(--gy)">Produk</span><span style="font-weight:600">${esc(p.name)}</span>
        <span style="color:var(--gy)">Paket</span><span style="font-weight:600">${esc(v.n)}</span>
        <span style="color:var(--gy)">Total</span><span style="font-weight:700;color:var(--pr)">${fmt(v.p)}</span>
        <span style="color:var(--gy)">Metode</span><span style="font-weight:600">${esc(pm?.name||cd.pm)}</span>
        <span style="color:var(--gy)">Status</span><span>${sbdg('pending')}</span>
      </div>
    </div>
    <a href="${waLink}" target="_blank" class="btn-wa" onclick="afterWA()">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Hubungi Admin via WhatsApp
    </a>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn-sec" style="flex:1" onclick="R.go('history')"><i class="bi bi-receipt"></i> Lihat Transaksi</button>
      <button class="btn-sec" style="flex:1" onclick="newCo()"><i class="bi bi-house"></i> Beranda</button>
    </div></div>`;
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
        if(icon)icon.textContent='✅';if(txt)txt.textContent='Bukti sudah terupload!';
        if(hint)hint.textContent='Klik Kirim & Lanjutkan untuk melanjutkan';if(nbtn)nbtn.disabled=false;
      }
    }
  },

  // HISTORY
  hist(){
    const allTxs=DB.txs();
    const myTxs=Auth.isAdm()?allTxs:allTxs.filter(t=>t.userId===Auth.cu.id);
    return`<div class="ph"><div class="ph-ttl">${Auth.isAdm()?'📋 Semua Transaksi':'📋 Riwayat Transaksi'}</div></div>
    ${myTxs.length===0?`<div class="empty-st"><span class="ei">🛍️</span><h3>Belum ada transaksi</h3><p>Yuk beli produk pertamamu!</p><button class="btn-pr" style="margin-top:14px" onclick="R.go('home')">Belanja Sekarang</button></div>`:`
    <div>${myTxs.map(tx=>`<div class="txcard" onclick="showTxD('${tx.id}')">
      <div class="tx-ico">${tx.productIcon?`<img src="${tx.productIcon}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`:'📦'}</div>
      <div class="tx-inf"><div class="tx-nm">${esc(tx.productName)}</div>
      <div class="tx-sub">${esc(tx.variantName)} • ${fdt(tx.createdAt)}</div>
      ${Auth.isAdm()?`<div class="tx-sub" style="color:var(--pr);font-weight:500">👤 ${esc(tx.userName)}</div>`:''}
      </div><div class="tx-rt"><div class="tx-amt">${fmt(tx.amount)}</div><div style="margin-top:4px">${sbdg(tx.status)}</div></div></div>`).join('')}</div>`}
    <div class="tx-modal" id="tx-modal"><div class="tx-mc" id="tx-mc"></div></div>`;
  },

  // PROFILE
  profile(){
    const u=Auth.cu;if(!u)return'';
    const myTxs=DB.txs().filter(t=>t.userId===u.id);
    return`<div class="ph"><div class="ph-ttl">👤 Profil Saya</div></div>
    <div class="pf-hdr"><div class="pf-av" id="pf-av">${u.avatar}</div><div class="pf-nm" id="pf-nm">${esc(u.name)}</div>
    <div class="pf-em">${esc(u.email)}</div><div class="pf-role">${u.role==='admin'?'🛡️ Administrator':'👤 Member'}</div></div>
    <div class="scont" style="margin-bottom:14px"><div class="stttl"><i class="bi bi-pencil-fill" style="color:var(--pr)"></i> Edit Profil</div>
    <div class="fg"><label class="flbl">Nama Lengkap</label><input class="finp" id="ep-nm" type="text" value="${esc(u.name)}"></div>
    <div class="fg"><label class="flbl">Email</label><input class="finp" type="email" value="${esc(u.email)}" disabled style="opacity:.55;cursor:not-allowed"><div class="fhint">Email tidak dapat diubah</div></div>
    <div class="fg"><label class="flbl">No. WhatsApp</label><input class="finp" id="ep-ph" type="tel" placeholder="08xxxxxxxxxx" value="${esc(u.phone||'')}"></div>
    <div style="border-top:1px solid var(--gy4);padding-top:14px;margin-top:4px"><div class="stttl" style="font-size:.95rem;margin-bottom:14px"><i class="bi bi-shield-lock-fill" style="color:var(--sc)"></i> Ganti Password</div>
    <div class="fg"><label class="flbl">Password Saat Ini</label><input class="finp" id="ep-pwc" type="password" placeholder="Password lama"></div>
    <div class="fg"><label class="flbl">Password Baru</label><input class="finp" id="ep-pwn" type="password" placeholder="Min. 6 karakter"></div></div>
    <button class="btn-pr" style="width:100%" onclick="saveProf()"><i class="bi bi-check-circle-fill"></i> Simpan Perubahan</button></div>
    <div class="scont" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center">
    <div><div style="font-weight:600;margin-bottom:2px">Riwayat Transaksi</div><div style="font-size:.78rem;color:var(--gy)">${myTxs.length} pesanan</div></div>
    <button class="btn-sec" onclick="R.go('history')" style="padding:8px 14px;font-size:.8rem">Lihat Semua</button></div></div>
    <button class="btn-sec" style="width:100%;color:var(--ac);border-color:var(--ac)" onclick="Auth.logout()"><i class="bi bi-box-arrow-left"></i> Logout dari Akun</button>`;
  },

  // ADMIN
  admin(){
    const txs=DB.txs();
    const rev=txs.filter(t=>t.status==='done').reduce((s,t)=>s+t.amount,0);
    const pend=txs.filter(t=>t.status==='pending').length;
    const done=txs.filter(t=>t.status==='done').length;
    const conf=txs.filter(t=>t.status==='confirmed').length;
    return`<div class="ph"><div class="ph-ttl">🛡️ Admin Panel</div></div>
    <div class="adm-stats">
      <div class="asc"><span class="asc-ico">📊</span><div class="asc-lbl">Total Order</div><div class="asc-val">${txs.length}</div></div>
      <div class="asc"><span class="asc-ico">⏳</span><div class="asc-lbl">Menunggu</div><div class="asc-val" style="color:var(--warn)">${pend}</div></div>
      <div class="asc"><span class="asc-ico">✅</span><div class="asc-lbl">Konfirmasi</div><div class="asc-val" style="color:var(--ok)">${conf}</div></div>
      <div class="asc"><span class="asc-ico">💰</span><div class="asc-lbl">Revenue Selesai</div><div class="asc-val" style="color:var(--pr);font-size:.95rem">${fmt(rev)}</div></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px">
      ${['Semua','Pending','Confirmed','Done','Cancelled'].map(s=>`<button onclick="fAdmTx('${s.toLowerCase()}')" id="atf-${s.toLowerCase()}" style="white-space:nowrap;padding:6px 14px;border-radius:50px;border:1.5px solid var(--gy3);background:var(--wh);font-family:var(--fn);font-size:.78rem;font-weight:600;cursor:pointer;transition:var(--tr)">${s}</button>`).join('')}
    </div>
    <div class="adm-tbl"><div class="adm-tbl-scroll"><table>
      <thead><tr><th>ID</th><th>Produk</th><th>Pembeli</th><th>Total</th><th>Bayar</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody id="adm-tbody">${this.admRows(txs)}</tbody>
    </table></div></div>
    <div class="tx-modal" id="tx-modal"><div class="tx-mc" id="tx-mc"></div></div>`;
  },

  admRows(txs){
    if(!txs.length)return'<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gy)">Belum ada transaksi</td></tr>';
    return txs.map(tx=>`<tr>
      <td style="font-size:.7rem;color:var(--gy);font-family:monospace">${tx.id.slice(-8)}</td>
      <td><div style="font-weight:600;font-size:.83rem">${tx.productIcon?`<img src="${tx.productIcon}" style="width:20px;height:20px;vertical-align:middle;border-radius:4px;margin-right:4px">`:'📦'} ${esc(tx.productName)}</div><div style="font-size:.73rem;color:var(--gy)">${esc(tx.variantName)}</div></td>
      <td><div style="font-size:.83rem;font-weight:500">${esc(tx.userName)}</div><div style="font-size:.73rem;color:var(--gy)">${esc(tx.userWA||'-')}</div></td>
      <td style="font-weight:700;color:var(--pr);font-size:.85rem">${fmt(tx.amount)}</td>
      <td style="font-size:.8rem">${PMETHODS.find(m=>m.id===tx.paymentMethod)?.name||tx.paymentMethod||'-'}</td>
      <td>${sbdg(tx.status)}</td>
      <td><div style="display:flex;gap:5px;flex-wrap:wrap">
        ${tx.status==='pending'?`<button class="adm-abtn ab-ok" onclick="updTx('${tx.id}','confirmed')">✅ Konfirmasi</button>`:''} 
        ${tx.status==='confirmed'?`<button class="adm-abtn ab-fin" onclick="updTx('${tx.id}','done')">🎉 Selesai</button>`:''} 
        ${tx.status!=='cancelled'&&tx.status!=='done'?`<button class="adm-abtn ab-del" onclick="updTx('${tx.id}','cancelled')">✕</button>`:''}
        <button class="adm-abtn" style="background:var(--pr-l);color:var(--pr-d)" onclick="admWA('${tx.id}')">💬</button>
      </div></td></tr>`).join('');
  },
};

// ============================================================
//  ACTION HANDLERS
// ============================================================

// ── AUTH ─────────────────────────────────────────────────────
function tglPw(id,btn){const i=$(id);i.type=i.type==='password'?'text':'password';btn.innerHTML=i.type==='password'?'<i class="bi bi-eye-fill"></i>':'<i class="bi bi-eye-slash-fill"></i>'}
function shAErr(id,msg){const el=$(id);if(el){el.textContent=msg;el.classList.add('show')}}
function hiAErr(id){const el=$(id);if(el)el.classList.remove('show')}

function doLogin(){
  const em=$('le-em')?.value.trim(),pw=$('le-pw')?.value,rem=$('le-rem')?.checked;
  hiAErr('le');
  try{Auth.login(em,pw,rem);toast('Selamat datang, '+Auth.cu.name+'! 👋','success');R.go('home')}
  catch(e){shAErr('le',e.message)}
}

function doReg(){
  const nm=$('re-nm')?.value,em=$('re-em')?.value,pw=$('re-pw')?.value,cf=$('re-cf')?.value;
  hiAErr('re');
  if(pw!==cf){shAErr('re','Password dan konfirmasi tidak cocok');return}
  try{Auth.reg(nm,em,pw);Auth.login(em,pw,false);toast('Akun berhasil dibuat! Selamat bergabung 🎉','success');R.go('home')}
  catch(e){shAErr('re',e.message)}
}

function doForg(){
  const em=$('fe-em')?.value.trim();
  hiAErr('fe');const ro=$('fo');if(ro)ro.classList.remove('show');
  if(!em||!vEmail(em)){shAErr('fe','Masukkan email yang valid');return}
  const u=DB.findU(em);
  if(!u){shAErr('fe','Email tidak ditemukan di sistem kami');return}
  if(ro){ro.classList.add('show');ro.innerHTML=`✅ Akun ditemukan! Nama: <strong>${esc(u.name)}</strong><br><span style="font-size:.78rem;opacity:.75">Silakan hubungi admin WA untuk reset password.</span><br><a href="https://wa.me/${CFG.adminWA}?text=${encodeURIComponent('Halo Admin, saya lupa password akun Seloss Store email: '+em)}" target="_blank" style="color:#34d399;font-weight:600">💬 Chat Admin WA</a>`}
}

function demoLogin(role){
  try{
    if(role==='admin'){Auth.login(CFG.adminEmail,'admin123',true)}
    else{if(!DB.findU('demo@seloss.com'))Auth.reg('Demo User','demo@seloss.com','demo123');Auth.login('demo@seloss.com','demo123',true)}
    toast('Login berhasil! Selamat menjelajah 🚀','success');R.go('home');
  }catch(e){toast(e.message,'error')}
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
  St.co.step=2;R.go('checkout');
}

// ── CHECKOUT ─────────────────────────────────────────────────
function coBk(){
  const cd=St.co;
  if(cd.step<=3)R.go('home');
  else{cd.step--;R.go('checkout')}
}

function coNext(){
  const cd=St.co;
  if(cd.step===2){if(!cd.variant){toast('Pilih varian dulu ya!','warning');return}cd.step=3;R.go('checkout');return}
  if(cd.step===3){
    const nm=$('f-name')?.value.trim(),wa=$('f-wa')?.value.trim(),em=$('f-em')?.value.trim();
    let err=false;
    if(!nm){$('err-name')?.classList.add('show');err=true}else $('err-name')?.classList.remove('show');
    if(!wa||!vWA(wa)){$('err-wa')?.classList.add('show');err=true}else $('err-wa')?.classList.remove('show');
    if(!em||!vEmail(em)){$('err-em')?.classList.add('show');err=true}else $('err-em')?.classList.remove('show');
    if(err){toast('Mohon lengkapi semua data yang diperlukan','warning');return}
    cd.form['f-name']=nm;cd.form['f-wa']=nWA(wa);cd.form['f-em']=em;
    cd.step=4;R.go('checkout');return;
  }
  if(cd.step===4){if(!cd.pm){toast('Pilih metode pembayaran dulu!','warning');return}cd.step=5;R.go('checkout');return}
  if(cd.step===5){cd.step=6;R.go('checkout');return}
  if(cd.step===6){if(!cd.proof){toast('Upload bukti pembayaran dulu!','warning');return}cd.step=7;R.go('checkout');return}
}

function coSelVar(vid){
  const v=St.co.prod?.vars.find(vr=>vr.id===vid);if(!v)return;
  St.co.variant=v;
  document.querySelectorAll('#vg-co .var-card').forEach(el=>el.classList.remove('sel'));
  document.querySelector(`#vg-co [onclick="coSelVar('${vid}')"]`)?.classList.add('sel');
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
    if(ico)ico.textContent='✅';if(txt)txt.textContent='Bukti berhasil diupload!';
    if(hint)hint.textContent=file.name;if(nb)nb.disabled=false;
    toast('Bukti pembayaran berhasil diupload!','success');
  };
  r.readAsDataURL(file);
}

function afterWA(){toast('Pesananmu sedang diproses admin! 🎉','success')}
function newCo(){St.resetCo();R.go('home')}

// ── HISTORY / TX DETAIL ───────────────────────────────────────
function showTxD(txId){
  const tx=DB.txs().find(t=>t.id===txId);if(!tx)return;
  const modal=$('tx-modal'),mc=$('tx-mc');if(!modal||!mc)return;
  const pm=PMETHODS.find(m=>m.id===tx.paymentMethod);
  mc.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div style="font-weight:700;font-size:1rem">📋 Detail Transaksi</div><button onclick="closeTxM()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--gy)">×</button></div>
  <div style="text-align:center;margin-bottom:10px">${tx.productIcon?`<img src="${tx.productIcon}" style="width:64px;height:64px;border-radius:12px;object-fit:cover">`:'<span style="font-size:2.5rem">📦</span>'}</div>
  <div style="text-align:center;margin-bottom:16px"><div style="font-weight:700;font-size:1rem">${esc(tx.productName)}</div><div style="font-size:.8rem;color:var(--gy)">${esc(tx.variantName)}</div><div style="margin-top:8px">${sbdg(tx.status)}</div></div>
  <div style="background:var(--gy5);border-radius:var(--r2);padding:14px;font-size:.83rem">
    ${[['ID Transaksi',`<span style="font-family:monospace;font-size:.72rem">${tx.id}</span>`],['Tanggal',fdt(tx.createdAt)],['Pembeli',esc(tx.userName)],['WhatsApp',esc(tx.userWA||'-')],['Email',esc(tx.userEmail||'-')],['Total',`<strong style="color:var(--pr)">${fmt(tx.amount)}</strong>`],['Metode',esc(pm?.name||tx.paymentMethod||'-')]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gy4)"><span style="color:var(--gy)">${k}</span><span style="text-align:right;max-width:60%">${v}</span></div>`).join('')}
  </div>
  ${Auth.isAdm()&&tx.status!=='done'&&tx.status!=='cancelled'?`<div style="display:flex;gap:8px;margin-top:16px">
    ${tx.status==='pending'?`<button class="btn-pr" style="flex:1;padding:10px;font-size:.85rem" onclick="updTx('${tx.id}','confirmed');closeTxM()">✅ Konfirmasi</button>`:''}
    ${tx.status==='confirmed'?`<button class="btn-pr" style="flex:1;padding:10px;font-size:.85rem" onclick="updTx('${tx.id}','done');closeTxM()">🎉 Selesai</button>`:''}
    <button style="padding:10px;background:var(--ac-l);color:#991b1b;border:none;border-radius:var(--r2);font-family:var(--fn);font-weight:600;cursor:pointer;font-size:.85rem" onclick="updTx('${tx.id}','cancelled');closeTxM()">✕ Batal</button>
  </div>`:''}`;
  modal.classList.add('show');
}
function closeTxM(){const m=$('tx-modal');if(m)m.classList.remove('show')}

// ── PROFILE ───────────────────────────────────────────────────
function saveProf(){
  const u=Auth.cu,nm=$('ep-nm')?.value.trim(),ph=$('ep-ph')?.value.trim(),pwc=$('ep-pwc')?.value,pwn=$('ep-pwn')?.value;
  if(!nm){toast('Nama tidak boleh kosong','error');return}
  if(pwc||pwn){
    if(!pwc){toast('Masukkan password saat ini','error');return}
    if(u.passwordHash!==hs(pwc)){toast('Password saat ini salah','error');return}
    if(!pwn||pwn.length<6){toast('Password baru minimal 6 karakter','error');return}
    u.passwordHash=hs(pwn);
  }
  u.name=nm;u.phone=ph;u.avatar=nm[0].toUpperCase();
  DB.upsertU(u);Auth.cu=u;
  const pav=$('pf-av'),pnm=$('pf-nm'),nav=$('nav-av');
  if(pav)pav.textContent=u.avatar;if(pnm)pnm.textContent=nm;if(nav)nav.textContent=u.avatar;
  toast('Profil berhasil disimpan! ✅','success');
}

// ── ADMIN ─────────────────────────────────────────────────────
function fAdmTx(st){
  document.querySelectorAll('[id^="atf-"]').forEach(b=>{b.style.background='var(--wh)';b.style.borderColor='var(--gy3)';b.style.color='var(--dk)'});
  const ab=$('atf-'+st);if(ab){ab.style.background='var(--pr)';ab.style.borderColor='var(--pr)';ab.style.color='#fff'}
  const all=DB.txs(),f=st==='semua'?all:all.filter(t=>t.status===st);
  const tb=$('adm-tbody');if(tb)tb.innerHTML=Pages.admRows(f);
}

function updTx(txId,newSt){
  const txs=DB.txs(),tx=txs.find(t=>t.id===txId);if(!tx)return;
  tx.status=newSt;tx.updatedAt=new Date().toISOString();DB.upsertTx(tx);
  const lbl={confirmed:'dikonfirmasi',done:'diselesaikan',cancelled:'dibatalkan'};
  toast(`Pesanan berhasil ${lbl[newSt]||newSt}! ✅`,'success');
  const tb=$('adm-tbody');if(tb)tb.innerHTML=Pages.admRows(DB.txs());
}

function admWA(txId){
  const tx=DB.txs().find(t=>t.id===txId);if(!tx)return;
  const wa=tx.userWA;if(!wa){toast('User tidak memiliki nomor WA','warning');return}
  const msg=`Halo ${tx.userName}! 👋\n\nPesanan kamu di *Seloss Store* sudah kami terima:\n📦 ${tx.productName} (${tx.variantName})\n💰 Total: ${fmt(tx.amount)}\n\nSegera diproses ya! Terima kasih sudah berbelanja di Seloss Store ✨`;
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`,'_blank');
}

// ── MOBILE SEARCH ────────────────────────────────────────────
// Show search icon button on small screens
window.addEventListener('resize',()=>{
  const msb=$('mob-srch-btn');
  if(msb)msb.style.display=window.innerWidth<=480?'flex':'none';
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
    const AUTH_PAGES  = ['login', 'register', 'forgot'];
    const APP_PAGES   = ['home', 'detail', 'checkout', 'history', 'profile', 'admin'];

    if (AUTH_PAGES.includes(page)) {
      // Show auth section
      if (authEl) authEl.style.display = 'flex';
      if (appEl)  appEl.style.display  = 'none';
      Pages.auth(page);
    } else if (APP_PAGES.includes(page)) {
      // Guard: must be logged in
      if (!Auth.check()) {
        if (authEl) authEl.style.display = 'flex';
        if (appEl)  appEl.style.display  = 'none';
        Pages.auth('login');
        return;
      }
      if (authEl) authEl.style.display = 'none';
      if (appEl)  appEl.style.display  = 'block';
      updNav();
      Pages.app(page, params);
    }
  }
};

// ============================================================
//  BANNER SLIDER
// ============================================================
let BslIdx = 0;
let BslTimer = null;

function initBsl(banners) {
  const trk = $('bsl-trk');
  const dots = $('bsl-dots');
  if (!trk || !dots || !banners.length) return;

  trk.innerHTML = banners.map((b, i) =>
    `<div class="bsl-sl" style="background:${b.bg||'linear-gradient(135deg,#1e3a8a,#3730a3)'}">
      <div class="bsl-tx"><div class="bsl-tt">${esc(b.title)}</div><div class="bsl-sb">${esc(b.sub)}</div>${b.btn?`<button class="bsl-btn" onclick="filterCat('${b.cat||'all'}')">${esc(b.btn)}</button>`:''}</div>
      <div class="bsl-ico">${b.icon||''}</div>
    </div>`
  ).join('');

  dots.innerHTML = banners.map((_, i) =>
    `<div class="bsl-dot${i===0?' act':''}" onclick="goSl(${i})"></div>`
  ).join('');

  goSl(0);
  BslTimer = setInterval(() => goSl((BslIdx + 1) % banners.length), 4000);
}

function goSl(idx) {
  const banners = sampleBanners();
  if (!banners.length) return;
  BslIdx = (idx + banners.length) % banners.length;
  const trk = $('bsl-trk');
  const dots = $('bsl-dots');
  if (trk) trk.style.transform = `translateX(-${BslIdx * 100}%)`;
  if (dots) dots.querySelectorAll('.bsl-dot').forEach((d, i) => d.classList.toggle('act', i === BslIdx));
}

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
//  COPY TO CLIPBOARD
// ============================================================
function copyT(text) {
  navigator.clipboard?.writeText(text)
    .then(() => toast('Disalin ke clipboard! 📋', 'success'))
    .catch(() => toast('Gagal menyalin teks', 'error'));
}

// ============================================================
//  INIT
// ============================================================
function initApp() {
  // Create default admin account
  if (!DB.findU(CFG.adminEmail)) {
    DB.upsertU({
      id: 'admin_001',
      name: 'Admin Seloss',
      email: CFG.adminEmail,
      passwordHash: hs('admin123'),
      phone: CFG.adminWA,
      avatar: 'A',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  // Seed products if not yet stored
  DB.prods();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('[SW] Registered'))
      .catch(() => {});
  }

  // Mobile search button visibility
  const msb = $('mob-srch-btn');
  if (msb) msb.style.display = window.innerWidth <= 480 ? 'flex' : 'none';

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
  window.demoLogin         = demoLogin;
  window.doLogin           = doLogin;
  window.doReg             = doReg;
  window.tglPw             = tglPw;
  window.doForg            = doForg;
  window.updTx             = updTx;
  window.admWA             = admWA;
  window.fAdmTx            = fAdmTx;
  window.showTxD           = showTxD;
  window.closeTxM          = closeTxM;
  window.saveProf          = saveProf;
  window.newCo             = newCo;
  window.afterWA           = afterWA;
  window.trigUpload        = trigUpload;
  window.handleFile        = handleFile;
  window.procFile          = procFile;
  window.copyT             = copyT;

  // Hide loading screen & navigate to home
  setTimeout(() => {
    $('ls')?.classList.add('hide');
    R.go('home');
  }, 1400);
}

// Single DOMContentLoaded — entry point
document.addEventListener('DOMContentLoaded', initApp);
