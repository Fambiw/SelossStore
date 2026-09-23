/**
 * Utility functions for Seloss Web
 */

// Simple hash string
export function hs(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// Generate unique ID
export function gid(p = 'id') {
  return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Format Rupiah currency
export function fmt(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// Format Date
export function fdt(d) {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Calculate discount percentage
export function disc(o, c) {
  return (!o || o <= c) ? 0 : Math.round((1 - c / o) * 100);
}

// Escape HTML to prevent XSS
export function esc(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(s)));
  return d.innerHTML;
}

// Validate Email
export function vEmail(e) {
  const email = String(e ?? '').trim();
  return email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate WhatsApp Number (starts with 08 or 628, 10-15 chars)
export function vWA(w) {
  const phone = String(w ?? '').replace(/[\s\-()]/g, '').replace(/^\+/, '');
  return /^(08|628)\d{8,12}$/.test(phone);
}

// Normalize WhatsApp Number (change 08 to 628)
export function nWA(w) {
  const phone = String(w ?? '').replace(/[\s\-()]/g, '');
  const normalized = phone.startsWith('+') ? phone.slice(1) : phone;

  if (!normalized) return '';
  if (normalized.startsWith('0')) return '62' + normalized.slice(1);
  if (normalized.startsWith('62')) return normalized;
  return normalized;
}

// DOM Selector shortcut
export function $(id) {
  return document.getElementById(id);
}
