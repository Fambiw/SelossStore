export function sampleProds() {
  return [
    // ── LARISANN (Canva, Capcut, Netflix, ChatGPT) ─────────────────
    {
      id: 'canva', cat: ['semuaan', 'larisann', 'ngeditann'], name: 'Canva',
      desc: 'Canva Pro – akses semua template & aset premium. Desain profesional jadi gampang!',
      image: 'assett/canva.png',
      vars: [
        { id: 'canva-1', n: '1 Bulan', p: 5000 },
        { id: 'canva-3', n: '3 Bulan', p: 10000 },
      ]
    },
    {
      id: 'capcut', cat: ['semuaan', 'larisann', 'ngeditann'], name: 'Capcut',
      desc: 'CapCut Pro – semua fitur edit video unlocked. Edit profesional di genggamanmu!',
      image: 'assett/capcut.png',
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
      image: 'assett/netflix.png',
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
      image: 'assett/chatgpt.png',
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
      image: 'assett/disney.png',
      vars: [
        { id: 'ds-sh', n: '1 Bulan Sharing', p: 25000 },
        { id: 'ds-al', n: '1 Bulan Anti Limit', p: 35000 },
        { id: 'ds-pv', n: '1 Bulan Private', p: 100000 },
      ]
    },
    {
      id: 'wetv', cat: ['semuaan', 'streamingann'], name: 'Wetv',
      desc: 'WeTV VIP – nonton drama Asia, film & serial terbaru tanpa iklan!',
      image: 'assett/wetv.png',
      vars: [
        { id: 'wetv-sh', n: '1 Bulan Sharing', p: 15000 },
        { id: 'wetv-pv', n: '1 Bulan Private', p: 35000 },
      ]
    },
    {
      id: 'iqiyi', cat: ['semuaan', 'streamingann'], name: 'Iqiyi',
      desc: 'iQIYI VIP – drama China, Korea, film & anime terbaru streaming tanpa batas!',
      image: 'assett/iqiyi.png',
      vars: [
        { id: 'iq-sh', n: '1 Bulan Sharing', p: 15000 },
        { id: 'iq-pv', n: '1 Bulan Private', p: 40000 },
      ]
    },

    // ── NGEDITANN (Canva & Capcut sudah di atas) ──────────────────
    {
      id: 'alight', cat: ['semuaan', 'ngeditann'], name: 'Alight Motion',
      desc: 'Alight Motion Pro – edit video & animasi dengan efek visual profesional!',
      image: 'assett/alight.png',
      vars: [
        { id: 'am-1', n: '1 Bulan', p: 3000 },
        { id: 'am-12', n: '1 Tahun', p: 10000 },
      ]
    },
    {
      id: 'wink', cat: ['semuaan', 'ngeditann'], name: 'Wink',
      desc: 'Wink Pro – aplikasi edit foto & video dengan filter AI yang memukau!',
      image: 'assett/wink.png',
      vars: [
        { id: 'wink-7', n: '7 Hari Private', p: 13000 },
      ]
    },

    // ── AI-ANN (ChatGPT sudah di atas) ───────────────────────────
    {
      id: 'gemini', cat: ['semuaan', 'ai-ann'], name: 'Gemini',
      desc: 'Google Gemini Advanced – AI Google terbaru untuk kreativitas & produktivitas!',
      image: 'assett/gemini.png',
      vars: [
        { id: 'gemini-1', n: '1 Bulan Private', p: 15000 },
      ]
    },
  ];
}

export function sampleBanners() {
  return [
    { tag: '🔥 Paling Laris', title: 'Larisann!\nPilihan Terfavorit', sub: 'Canva, Capcut, Netflix & ChatGPT — harga terjangkau!', bg: 'linear-gradient(135deg,#10052a 0%,#0a1628 60%,#1a0a00 100%)' },
    { tag: '🎬 Streaming Premium', title: 'Netflix, Disney\n& WeTV Murah!', sub: 'Nonton tanpa batas mulai Rp15.000', bg: 'linear-gradient(135deg,#071a10 0%,#0a1628 60%,#0a1a10 100%)' },
    { tag: '✏️ Editing Tools', title: 'Canva, Capcut\n& Alight Motion!', sub: 'Edit konten profesional harga terjangkau', bg: 'linear-gradient(135deg,#1a0a33 0%,#0a0a28 100%)' },
    { tag: '🤖 AI Premium', title: 'ChatGPT & Gemini\nHarga Terbaik!', sub: 'AI canggih untuk produktivitas harianmu', bg: 'linear-gradient(135deg,#0a1a10 0%,#1a0a33 100%)' },
  ];
}
