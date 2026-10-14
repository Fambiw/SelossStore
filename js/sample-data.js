import { hs } from './utils.js';

export function sampleProds() {
  return [
    // ── LARISANN (Canva, Capcut, Netflix, ChatGPT) ─────────────────
    {
      id: 'canva', cat: ['semuaan', 'larisann', 'ngeditann'], name: 'Canva',
      desc: 'Canva Pro – akses semua template & aset premium. Desain profesional jadi gampang!',
      image: 'assett/canva logo.png',
      vars: [
        { id: 'canva-1', n: '1 Bulan', p: 5000 },
        { id: 'canva-3', n: '3 Bulan', p: 10000 },
      ]
    },
    {
      id: 'capcut', cat: ['semuaan', 'larisann', 'ngeditann'], name: 'Capcut',
      desc: 'CapCut Pro – semua fitur edit video unlocked. Edit profesional di genggamanmu!',
      image: 'assett/capcut logo.png',
      vars: [
        { id: 'capcut-sh7', n: 'Sharing: 7 Hari', p: 12000 },
        { id: 'capcut-sh30', n: 'Sharing: 1 Bulan', p: 30000 },
        { id: 'capcut-pv7', n: 'Private: 7 Hari', p: 15000 },
        { id: 'capcut-pv30', n: 'Private: 1 Bulan', p: 37000 },
      ]
    },
    {
      id: 'netflix', cat: ['semuaan', 'larisann', 'streamingann'], name: 'Netflix',
      desc: 'Netflix Premium – nonton film & serial favorit tanpa batas, kualitas 4K UHD!',
      image: 'assett/netflix logo.png',
      vars: [
        { id: 'nf-1p1u', n: '1 Bulan 1P1U', p: 30000 },
        { id: 'nf-1p2u', n: '1 Bulan 1P2U', p: 25000 },
        { id: 'nf-sempriv', n: '1 Bulan Sempriv', p: 40000 },
        { id: 'nf-antilimit', n: '1 Bulan Anti Limit', p: 60000 },
      ]
    },
    {
      id: 'chatgpt', cat: ['semuaan', 'larisann', 'ai-ann'], name: 'ChatGPT PlanGo',
      desc: 'ChatGPT Plus – AI paling canggih untuk nulis, coding, belajar & kreativitasmu!',
      image: 'assett/chatgpt logo.png',
      vars: [
        { id: 'gpt-sh3ng', n: '1 Bulan Sharing 3u nogar', p: 25000 },
        { id: 'gpt-sh3fg', n: '1 Bulan Sharing 3u fullgar', p: 33000 },
        { id: 'gpt-sh2g1', n: '1 Bulan Sharing 2u garansi 1x', p: 52000 },
        { id: 'gpt-pv', n: '1 Bulan Private', p: 90000 },
      ]
    },

    // ── STREAMINGANN (Netflix sudah di atas) ──────────────────────
    {
      id: 'disney', cat: ['semuaan', 'streamingann'], name: 'Disney',
      desc: 'Disney+ Hotstar Premium – film, serial, olahraga, dan konten eksklusif Disney!',
      image: 'assett/disney logo.jpeg',
      vars: [
        { id: 'ds-sh', n: '1 Bulan Sharing', p: 25000 },
        { id: 'ds-al', n: '1 Bulan Anti Limit', p: 35000 },
        { id: 'ds-pv', n: '1 Bulan Private', p: 100000 },
      ]
    },
    {
      id: 'wetv', cat: ['semuaan', 'streamingann'], name: 'Wetv',
      desc: 'WeTV VIP – nonton drama Asia, film & serial terbaru tanpa iklan!',
      image: 'assett/wetv logo.jpeg',
      vars: [
        { id: 'wetv-sh', n: '1 Bulan Sharing', p: 15000 },
        { id: 'wetv-pv', n: '1 Bulan Private', p: 35000 },
      ]
    },
    {
      id: 'iqiyi', cat: ['semuaan', 'streamingann'], name: 'Iqiyi',
      desc: 'iQIYI VIP – drama China, Korea, film & anime terbaru streaming tanpa batas!',
      image: 'assett/iqiyi logo.png',
      vars: [
        { id: 'iq-sh', n: '1 Bulan Sharing', p: 15000 },
        { id: 'iq-pv', n: '1 Bulan Private', p: 40000 },
      ]
    },

    // ── NGEDITANN (Canva & Capcut sudah di atas) ──────────────────
    {
      id: 'alight', cat: ['semuaan', 'ngeditann'], name: 'Alight Motion',
      desc: 'Alight Motion Pro – edit video & animasi dengan efek visual profesional!',
      image: 'assett/alight motion logo.jpeg',
      vars: [
        { id: 'am-1', n: '1 Bulan', p: 3000 },
        { id: 'am-12', n: '1 Tahun', p: 10000 },
      ]
    },
    {
      id: 'wink', cat: ['semuaan', 'ngeditann'], name: 'Wink',
      desc: 'Wink Pro – aplikasi edit foto & video dengan filter AI yang memukau!',
      image: 'assett/wink logo.png',
      vars: [
        { id: 'wink-7', n: '7 Hari Private', p: 13000 },
      ]
    },

    // ── AI-ANN (ChatGPT sudah di atas) ───────────────────────────
    {
      id: 'gemini', cat: ['semuaan', 'ai-ann'], name: 'Gemini',
      desc: 'Google Gemini Advanced – AI Google terbaru untuk kreativitas & produktivitas!',
      image: 'assett/gemini ai logo.jpeg',
      vars: [
        { id: 'gemini-1', n: '1 Bulan Private', p: 15000 },
      ]
    },
  ];
}

export function sampleBanners() {
  return [
    {
      id: 'bnr_1',
      title: 'Contoh Banner 1',
      image: 'assett/Contoh_Banner_1.png',
      order: 0,
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 'bnr_2',
      title: 'Contoh Banner 2',
      image: 'assett/Contoh_Banner_2.png',
      order: 1,
      createdAt: '2025-01-02T00:00:00.000Z'
    },
    {
      id: 'bnr_3',
      title: 'Contoh Banner 3',
      image: 'assett/Contoh_Banner_3.png',
      order: 2,
      createdAt: '2025-01-03T00:00:00.000Z'
    }
  ];
}

export function sampleUsers() {
  return [
    {
      id: 'admin_001',
      name: 'Admin Seloss',
      email: 'adminseloss@jimail.com',
      passwordHash: hs('Hanyaadmin123'),
      phone: '6281234567890',
      avatar: 'A',
      role: 'admin',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 'user_001',
      name: 'User 1 Seloss',
      email: 'user1seloss@jimail.com',
      passwordHash: hs('Masuk123'),
      phone: '081234560001',
      avatar: 'U1',
      role: 'user',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 'user_002',
      name: 'User 2 Seloss',
      email: 'user2seloss@jimail.com',
      passwordHash: hs('Masuk123'),
      phone: '081234560002',
      avatar: 'U2',
      role: 'user',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 'user_003',
      name: 'User 3 Seloss',
      email: 'user3seloss@jimail.com',
      passwordHash: hs('Masuk123'),
      phone: '081234560003',
      avatar: 'U3',
      role: 'user',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 'user_004',
      name: 'User 4 Seloss',
      email: 'user4seloss@jimail.com',
      passwordHash: hs('Masuk123'),
      phone: '081234560004',
      avatar: 'U4',
      role: 'user',
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    {
      id: 'user_005',
      name: 'User 5 Seloss',
      email: 'user5seloss@jimail.com',
      passwordHash: hs('Masuk123'),
      phone: '081234560005',
      avatar: 'U5',
      role: 'user',
      createdAt: '2025-01-01T00:00:00.000Z'
    }
  ];
}
