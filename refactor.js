const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'js', 'main.js');
const lines = fs.readFileSync(mainJsPath, 'utf-8').split('\n');

// Find the end of sampleBanners
let endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function sampleBanners()')) {
    // find the closing brace of sampleBanners
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '}') {
        endIndex = j;
        break;
      }
    }
    break;
  }
}

if (endIndex !== -1) {
  const imports = `import { CFG, PMETHODS, STLBLS } from './config.js';
import { hs, gid, fmt, fdt, disc, esc, vEmail, vWA, nWA, $ } from './utils.js';
import { sampleProds, sampleBanners } from './sample-data.js';
import { DB } from './db.js';
import { Auth } from './auth.js';
import { St } from './store.js';

// Expose to window for inline HTML handlers
window.R = null; // Will be defined below
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
  el.style.borderLeft = \`4px solid \${cols[type]}\`;
  el.innerHTML = \`<span>\${icons[type]}</span><span style="flex:1">\${esc(msg)}</span><button class="tc-x" onclick="rmT('\${id}')">×</button>\`;
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
`;

  // We also need to remove toast and rmT from the original file if they exist between line 1 and endIndex
  // Let's just filter out the config, utils, db, auth, app state, sample data
  // The first 200 lines are mostly this. We'll replace from line 3 to endIndex
  
  lines.splice(3, endIndex - 2, imports);
  
  // Now we need to expose everything else that HTML inline scripts use
  // We can just add window.xxx = xxx; at the end of the file for all functions.
  const exports = `
// Expose global functions for inline HTML event handlers
window.tglSB = typeof tglSB !== 'undefined' ? tglSB : null;
window.closeSB = typeof closeSB !== 'undefined' ? closeSB : null;
window.gocat = typeof gocat !== 'undefined' ? gocat : null;
window.tglMobSearch = typeof tglMobSearch !== 'undefined' ? tglMobSearch : null;
window.handleSearch = typeof handleSearch !== 'undefined' ? handleSearch : null;
window.doSearch = typeof doSearch !== 'undefined' ? doSearch : null;
window.clearSrch = typeof clearSrch !== 'undefined' ? clearSrch : null;
window.goSl = typeof goSl !== 'undefined' ? goSl : null;
window.openProd = typeof openProd !== 'undefined' ? openProd : null;
window.selVar = typeof selVar !== 'undefined' ? selVar : null;
window.startCo = typeof startCo !== 'undefined' ? startCo : null;
window.coBk = typeof coBk !== 'undefined' ? coBk : null;
window.coSelVar = typeof coSelVar !== 'undefined' ? coSelVar : null;
window.coNext = typeof coNext !== 'undefined' ? coNext : null;
window.demoLogin = typeof demoLogin !== 'undefined' ? demoLogin : null;
window.doLogin = typeof doLogin !== 'undefined' ? doLogin : null;
window.doReg = typeof doReg !== 'undefined' ? doReg : null;
window.tglPw = typeof tglPw !== 'undefined' ? tglPw : null;
window.doForg = typeof doForg !== 'undefined' ? doForg : null;
window.selPm = typeof selPm !== 'undefined' ? selPm : null;
window.doUpload = typeof doUpload !== 'undefined' ? doUpload : null;
window.delTx = typeof delTx !== 'undefined' ? delTx : null;
window.updTx = typeof updTx !== 'undefined' ? updTx : null;
window.R = typeof R !== 'undefined' ? R : null;
window.copyT = typeof copyT !== 'undefined' ? copyT : null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  R.go('home');
});
`;
  
  fs.writeFileSync(mainJsPath, lines.join('\n') + exports);
  console.log('Successfully refactored main.js');
} else {
  console.log('Could not find sampleBanners to splice');
}
