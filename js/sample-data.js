export function sampleProds() {
  const now = Date.now();
  return [
    {
      id: 'ml', cat: 'lagiramee', name: 'Mobile Legends Diamond', desc: 'Top up Diamond ML langsung ke akun. Proses instan, aman, dan terpercaya!', icon: '💎', badge: 'flash', rating: 4.9, sold: 1240, flash: true, flashEnd: now + 5 * 3600000,
      vars: [{ id: 'ml-86', n: '86 Diamond', p: 22000, o: 28000, stk: 100 }, { id: 'ml-172', n: '172 Diamond', p: 42000, o: 55000, stk: 85 }, { id: 'ml-257', n: '257 Diamond', p: 62000, o: 78000, stk: 50 }, { id: 'ml-343', n: '343 Diamond', p: 82000, o: 102000, stk: 30 }, { id: 'ml-514', n: '514 Diamond', p: 122000, o: 155000, stk: 20 }, { id: 'ml-706', n: '706 Diamond', p: 159000, o: 199000, stk: 10 }],
      dynF: [{ id: 'uid', lbl: 'User ID (ML)', ph: '123456789', req: true }, { id: 'zid', lbl: 'Zone ID (ML)', ph: '1234', req: true }]
    },
    {
      id: 'ff', cat: 'lagiramee', name: 'Free Fire Diamond', desc: 'Top up Diamond FF instan. Langsung masuk ke akun game kamu.', icon: '🔥', badge: 'promo', rating: 4.8, sold: 980, flash: false,
      vars: [{ id: 'ff-140', n: '140 Diamond', p: 22000, o: 28000, stk: 200 }, { id: 'ff-355', n: '355 Diamond', p: 53000, o: 67000, stk: 150 }, { id: 'ff-720', n: '720 Diamond', p: 105000, o: 132000, stk: 100 }, { id: 'ff-1450', n: '1450 Diamond', p: 208000, o: 260000, stk: 60 }],
      dynF: [{ id: 'uid', lbl: 'User ID Free Fire', ph: '123456789012', req: true }]
    },
    {
      id: 'pubg', cat: 'lagiramee', name: 'PUBG Mobile UC', desc: 'Top up Unknown Cash PUBG Mobile murah. Proses cepat & aman.', icon: '🎯', badge: 'bestseller', rating: 4.7, sold: 756, flash: false,
      vars: [{ id: 'pu-60', n: '60 UC', p: 15000, o: 20000, stk: 300 }, { id: 'pu-325', n: '325 UC', p: 75000, o: 95000, stk: 200 }, { id: 'pu-660', n: '660 UC', p: 148000, o: 185000, stk: 100 }, { id: 'pu-1800', n: '1800 UC', p: 395000, o: 495000, stk: 50 }],
      dynF: [{ id: 'uid', lbl: 'Player ID PUBG', ph: '123456789012', req: true }, { id: 'svr', lbl: 'Server', ph: 'ASIA / KRJP / EUROPE', req: true }]
    },
    {
      id: 'genshin', cat: 'lagiramee', name: 'Genshin Impact Genesis', desc: 'Top up Genesis Crystal Genshin Impact. Server Asia, America, Europe.', icon: '⭐', badge: 'promo', rating: 4.7, sold: 523, flash: false,
      vars: [{ id: 'gi-60', n: '60 Genesis', p: 14000, o: 18000, stk: 200 }, { id: 'gi-300', n: '300+30 Genesis', p: 68000, o: 85000, stk: 150 }, { id: 'gi-980', n: '980+110 Genesis', p: 218000, o: 270000, stk: 80 }],
      dynF: [{ id: 'uid', lbl: 'UID Genshin', ph: '123456789', req: true }, { id: 'svr', lbl: 'Server', ph: 'Asia / America / Europe', req: true }]
    },
    {
      id: 'nf', cat: 'streaming', name: 'Netflix Premium', desc: 'Akun Netflix sharing private 4K UHD. Tanpa iklan, nonton sepuasnya!', icon: '🎬', badge: 'promo', rating: 4.9, sold: 2100, flash: true, flashEnd: now + 8 * 3600000,
      vars: [{ id: 'nf-1', n: '1 Bulan', p: 45000, o: 59000, stk: 50 }, { id: 'nf-3', n: '3 Bulan', p: 120000, o: 165000, stk: 30 }, { id: 'nf-6', n: '6 Bulan', p: 220000, o: 310000, stk: 15 }],
      dynF: [{ id: 'ep', lbl: 'Email untuk pengiriman akun', ph: 'email@gmail.com', req: true }]
    },
    {
      id: 'sp', cat: 'streaming', name: 'Spotify Premium', desc: 'Spotify Premium Individual / Family. Musik tanpa batas, tanpa iklan!', icon: '🎵', badge: 'bestseller', rating: 4.8, sold: 1850, flash: false,
      vars: [{ id: 'sp-1', n: '1 Bulan Individual', p: 25000, o: 32000, stk: 100 }, { id: 'sp-3', n: '3 Bulan Individual', p: 65000, o: 89000, stk: 80 }, { id: 'sp-f', n: '1 Bln Family (6 akun)', p: 55000, o: 79000, stk: 40 }],
      dynF: [{ id: 'ep', lbl: 'Email untuk invite', ph: 'email@gmail.com', req: true }]
    },
    {
      id: 'yt', cat: 'streaming', name: 'YouTube Premium', desc: 'YouTube Premium: tanpa iklan, background play, YouTube Music included!', icon: '▶️', badge: 'promo', rating: 4.7, sold: 920, flash: false,
      vars: [{ id: 'yt-1', n: '1 Bulan', p: 28000, o: 35000, stk: 100 }, { id: 'yt-3', n: '3 Bulan', p: 75000, o: 99000, stk: 60 }],
      dynF: [{ id: 'ep', lbl: 'Email Google', ph: 'email@gmail.com', req: true }]
    },
    {
      id: 'disney', cat: 'streaming', name: 'Disney+ Hotstar', desc: 'Disney+ Hotstar Premium. Nonton film, serial, olahraga langsung!', icon: '🏰', badge: 'promo', rating: 4.6, sold: 410, flash: false,
      vars: [{ id: 'ds-1', n: '1 Bulan', p: 35000, o: 49000, stk: 80 }, { id: 'ds-3', n: '3 Bulan', p: 90000, o: 130000, stk: 50 }],
      dynF: [{ id: 'ep', lbl: 'Email untuk akun', ph: 'email@gmail.com', req: true }]
    },
    {
      id: 'cv', cat: 'editing', name: 'Canva Pro', desc: 'Canva Pro team sharing. Akses semua template & aset premium unlimited!', icon: '🎨', badge: 'promo', rating: 4.9, sold: 1560, flash: true, flashEnd: now + 3 * 3600000,
      vars: [{ id: 'cv-1', n: '1 Bulan', p: 35000, o: 49000, stk: 30 }, { id: 'cv-3', n: '3 Bulan', p: 90000, o: 135000, stk: 20 }, { id: 'cv-12', n: '1 Tahun', p: 320000, o: 490000, stk: 10 }],
      dynF: [{ id: 'ep', lbl: 'Email Canva', ph: 'email@gmail.com', req: true }]
    },
    {
      id: 'cc', cat: 'editing', name: 'CapCut Pro', desc: 'CapCut Pro semua fitur unlocked. Edit video profesional di genggamanmu!', icon: '🎞️', badge: 'bestseller', rating: 4.8, sold: 880, flash: false,
      vars: [{ id: 'cc-1', n: '1 Bulan', p: 22000, o: 29000, stk: 80 }, { id: 'cc-3', n: '3 Bulan', p: 55000, o: 79000, stk: 50 }],
      dynF: [{ id: 'ep', lbl: 'Email CapCut', ph: 'email@gmail.com', req: true }, { id: 'dv', lbl: 'Tipe HP (opsional)', ph: 'Samsung A54', req: false }]
    },
    {
      id: 'ac', cat: 'editing', name: 'Adobe Creative Cloud', desc: 'Adobe CC All Apps: Photoshop, Premiere Pro, After Effects & lebih!', icon: '🅰️', badge: 'lmt', rating: 4.6, sold: 340, flash: false,
      vars: [{ id: 'ac-1', n: '1 Bulan All Apps', p: 180000, o: 250000, stk: 5 }, { id: 'ac-3', n: '3 Bulan All Apps', p: 480000, o: 730000, stk: 3 }],
      dynF: [{ id: 'ep', lbl: 'Email Adobe', ph: 'email@gmail.com', req: true }, { id: 'ig', lbl: 'Username IG (opsional)', ph: '@username', req: false }]
    },
    {
      id: 'figma', cat: 'editing', name: 'Figma Professional', desc: 'Figma Pro unlimited projects, version history & advanced features!', icon: '🖌️', badge: 'promo', rating: 4.7, sold: 290, flash: false,
      vars: [{ id: 'fg-1', n: '1 Bulan', p: 65000, o: 89000, stk: 40 }, { id: 'fg-3', n: '3 Bulan', p: 170000, o: 240000, stk: 20 }],
      dynF: [{ id: 'ep', lbl: 'Email Figma', ph: 'email@gmail.com', req: true }]
    }
  ];
}

export function sampleBanners() {
  return [
    { tag: '⚡ Flash Sale Spesial', title: 'Terbatass!\nDiskon s/d 40%', sub: 'Top up game favoritmu lebih hemat sekarang!', bg: 'linear-gradient(135deg,#10052a 0%,#0a1628 60%,#1a0a00 100%)' },
    { tag: '🎬 Streaming Murah', title: 'Netflix & Spotify\nHarga Terbaik!', sub: 'Streaming tanpa batas mulai Rp 25.000', bg: 'linear-gradient(135deg,#071a10 0%,#0a1628 60%,#0a1a10 100%)' },
    { tag: '🎨 Editing Tools', title: 'Canva Pro\nBulan Ini Mulai Rp35K!', sub: 'Desain profesional gampang & murah', bg: 'linear-gradient(135deg,#1a0a33 0%,#0a0a28 100%)' },
    { tag: '🎮 Game Top Up', title: 'Top Up ML, FF, PUBG\nPaling Murah!', sub: 'Instan, aman, dan terpercaya sejak 2024', bg: 'linear-gradient(135deg,#1a1008 0%,#0a1628 100%)' },
  ];
}
