// ─── Types ────────────────────────────────────────────────────────────────────

export type ZoneType =
  | 'village'
  | 'field_slime'
  | 'field_king'
  | 'forest'
  | 'beach'
  | 'capital'
  | 'military'
  | 'holy'
  | 'castle'
  | 'police';

export interface LocationDirections {
  north?: string;
  south?: string;
  east?: string;
  west?: string;
}

export interface WorldLocation {
  id: string;
  name: string;
  shortName: string;
  zone: ZoneType;
  levelRange: string;
  description: string;
  lore: string;
  directions: LocationDirections;
  route: string;
  bgImage: string;
  accentColor: string;
  bgFrom: string;
  bgTo: string;
  borderColor: string;
}

// ─── Direction metadata ───────────────────────────────────────────────────────

export const DIR_META: Record<string, { label: string; arrow: string; opposite: string }> = {
  north: { label: 'Utara',   arrow: '↑', opposite: 'south' },
  south: { label: 'Selatan', arrow: '↓', opposite: 'north' },
  east:  { label: 'Timur',   arrow: '→', opposite: 'west'  },
  west:  { label: 'Barat',   arrow: '←', opposite: 'east'  },
};

// ─── Image URLs ───────────────────────────────────────────────────────────────

const IMG = {
  grassland:        'https://images.unsplash.com/photo-1759821673387-61ca8b811583?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aWRlJTIwb3BlbiUyMGdyZWVuJTIwZ3Jhc3NsYW5kJTIwZmllbGQlMjByb2xsaW5nJTIwaGlsbHMlMjBuYXR1cmV8ZW58MXx8fHwxNzcyNjI3NTA5fDA&ixlib=rb-4.1.0&q=80&w=1080',
  village:          'https://images.unsplash.com/photo-1766519803915-5affe76e393b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMHZpbGxhZ2UlMjBkYXl0aW1lJTIwc3VubnklMjBjb2JibGVzdG9uZSUyMGhvdXNlc3xlbnwxfHx8fDE3NzI2Mjc1MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  forest:           'https://images.unsplash.com/photo-1762764473877-0d59637c2785?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlnaHQlMjBzcGFyc2UlMjBmb3Jlc3QlMjBzdW5saWdodCUyMHRocm91Z2glMjB0cmVlc3xlbnwxfHx8fDE3NzI2Mjc1MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  beach:            'https://images.unsplash.com/photo-1760119097349-2f2dbc0de62a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGJlYWNoJTIwY2xlYXIlMjB3YXRlciUyMHNhbmR5JTIwc2hvcmV8ZW58MXx8fHwxNzcyNjI3NTAzfDA&ixlib=rb-4.1.0&q=80&w=1080',
  capital:          'https://images.unsplash.com/photo-1764488782178-edf2023bd753?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGZhbnRhc3klMjBjYXBpdGFsJTIwY2l0eSUyMGdyYW5kJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3MjYyNzUwNHww&ixlib=rb-4.1.0&q=80&w=1080',
  courthouse:       'https://images.unsplash.com/photo-1663186867794-91e981d2053f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGNvdXJ0aG91c2UlMjBoYWxsJTIwb2YlMjBqdXN0aWNlJTIwc3RvbmUlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzI2Mjc1MDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  holyKnight:       'https://images.unsplash.com/photo-1633329859346-8c83cdbc9b75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2x5JTIwa25pZ2h0JTIwd2hpdGUlMjBhcm1vciUyMHBhbGFkaW4lMjBmYW50YXN5fGVufDF8fHx8MTc3MjYyNzUwNHww&ixlib=rb-4.1.0&q=80&w=1080',
  cathedral:        'https://images.unsplash.com/photo-1672656320069-f311216992b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFuZCUyMGdvdGhpYyUyMGNhdGhlZHJhbCUyMG1lZGlldmFsJTIwaW50ZXJpb3IlMjBtYWplc3RpY3xlbnwxfHx8fDE3NzI2Mjc1MDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  imperialKnight:   'https://images.unsplash.com/photo-1668261834846-eb10673033bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWx2ZXIlMjBhcm1vcmVkJTIwa25pZ2h0JTIwb24lMjBob3JzZWJhY2slMjBtZWRpZXZhbCUyMHdhcnxlbnwxfHx8fDE3NzI2Mjc1MDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
  imperialCastle:   'https://images.unsplash.com/photo-1760371908150-dfb9b9d7e409?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFuZCUyMHJveWFsJTIwbWVkaWV2YWwlMjBwYWxhY2UlMjBtYWplc3RpYyUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NzI2MzAwNTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
  capitalCity:      'https://images.unsplash.com/photo-1652189892506-6a72c063783e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXN5JTIwbWVkaWV2YWwlMjBjaXR5JTIwbWFya2V0JTIwY3Jvd2QlMjBwZW9wbGUlMjBzdHJlZXRzfGVufDF8fHx8MTc3MjYzMDA1MHww&ixlib=rb-4.1.0&q=80&w=1080',
  justiceStatue:    'https://images.unsplash.com/photo-1760172593315-33156db48b79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYWR5JTIwanVzdGljZSUyMHN0YXR1ZSUyMGJsaW5kZm9sZGVkJTIwc2NhbGVzJTIwbGF3fGVufDF8fHx8MTc3MjYzMDA1Nnww&ixlib=rb-4.1.0&q=80&w=1080',
};

// ─── Location registry ────────────────────────────────────────────────────────

export const LOCATIONS: WorldLocation[] = [

  // ══ STARTING AREA ══════════════════════════════════════════════════════════
  {
    id: 'desa-daun-hijau',
    name: 'Desa Daun Hijau',
    shortName: 'Desa Daun Hijau',
    zone: 'village',
    levelRange: 'Lv. 1+',
    description: 'Desa yang damai di kaki pegunungan, tempat petualanganmu dimulai.',
    lore: 'Desa Daun Hijau berdiri di kaki Pegunungan Hijau Abadi. Penduduknya hidup tenteram, namun kabar kebangkitan Raja Iblis mulai meresahkan seluruh penjuru kerajaan.',
    directions: {
      north: 'padang-rumput-slime-utara',
      south: 'padang-rumput-slime-selatan',
      east:  'padang-rumput-slime-timur',
      west:  'padang-rumput-king-slime',
    },
    route: '/game/village',
    bgImage: IMG.village,
    accentColor: '#4ade80',
    bgFrom: '#052e16',
    bgTo: '#0f172a',
    borderColor: '#4ade80',
  },

  // ══ PADANG RUMPUT ══════════════════════════════════════════════════════════
  {
    id: 'padang-rumput-slime-utara',
    name: 'Padang Rumput Slime Utara',
    shortName: 'Slime Utara',
    zone: 'field_slime',
    levelRange: 'Lv. 2–5',
    description: 'Padang rumput hijau subur di utara desa. Slime-Slime hijau kecil bergerak santai di antara rerumputan tinggi.',
    lore: 'Slime Utara adalah area favorit petarung pemula. Kadang muncul Slime Biru lebih agresif saat menjelang malam. Udara di sini selalu segar dengan aroma bunga liar.',
    directions: {
      south: 'desa-daun-hijau',
    },
    route: '/game/location/padang-rumput-slime-utara',
    bgImage: IMG.grassland,
    accentColor: '#4ade80',
    bgFrom: '#052e16',
    bgTo: '#0a1a0a',
    borderColor: '#4ade80',
  },
  {
    id: 'padang-rumput-slime-selatan',
    name: 'Padang Rumput Slime Selatan',
    shortName: 'Slime Selatan',
    zone: 'field_slime',
    levelRange: 'Lv. 3–6',
    description: 'Padang rumput selatan dengan Slime Merah yang lebih agresif. Hati-hati dengan enzim asam mereka.',
    lore: 'Slime Merah di selatan mengandung enzim asam yang menyengat kulit bila disentuh. Tanah di sini berwarna kemerahan akibat spora jamur kuno yang mengendap ribuan tahun.',
    directions: {
      north: 'desa-daun-hijau',
    },
    route: '/game/location/padang-rumput-slime-selatan',
    bgImage: IMG.grassland,
    accentColor: '#f87171',
    bgFrom: '#3b0f0f',
    bgTo: '#0a0505',
    borderColor: '#f87171',
  },
  {
    id: 'padang-rumput-slime-timur',
    name: 'Padang Rumput Slime Timur',
    shortName: 'Slime Timur',
    zone: 'field_slime',
    levelRange: 'Lv. 3–6',
    description: 'Padang rumput di timur desa yang dijaga Slime Ungu liar. Rumput berwarna keunguan akibat spora mistik kuno.',
    lore: 'Konon area timur ini pernah menjadi lokasi ritual sihir kuno kerajaan lama. Spora magis meresap ke tanah dan mengubah Slime di sini menjadi berwarna ungu dengan sedikit kemampuan sihir lemah.',
    directions: {
      west:  'desa-daun-hijau',
      north: 'hutan-umum',
      south: 'pantai-kepiting',
      east:  'ibukota-kekaisaran-senofia',
    },
    route: '/game/location/padang-rumput-slime-timur',
    bgImage: IMG.grassland,
    accentColor: '#c084fc',
    bgFrom: '#2e1065',
    bgTo: '#0a0515',
    borderColor: '#c084fc',
  },
  {
    id: 'padang-rumput-king-slime',
    name: 'Padang Rumput King Slime',
    shortName: 'King Slime',
    zone: 'field_king',
    levelRange: 'Lv. 5–8',
    description: 'Padang luas yang didominasi King Slime bertubuh besar berwarna kuning keemasan dengan mahkota kecil di kepalanya.',
    lore: 'King Slime jarang menyerang duluan, namun bila terganggu ratusan Slime kecil akan muncul dari tubuhnya. Mahkota kecil di kepalanya masih menjadi misteri para peneliti.',
    directions: {
      east: 'desa-daun-hijau',
    },
    route: '/game/location/padang-rumput-king-slime',
    bgImage: IMG.grassland,
    accentColor: '#fbbf24',
    bgFrom: '#3b2000',
    bgTo: '#100800',
    borderColor: '#fbbf24',
  },

  // ══ ALAM LIAR ══════════════════════════════════════════════════════════════
  {
    id: 'hutan-umum',
    name: 'Hutan Umum Setempat',
    shortName: 'Hutan Umum',
    zone: 'forest',
    levelRange: 'Lv. 4–7',
    description: 'Hutan dengan pepohonan yang cukup jarang dan cahaya matahari menembus dedaunan. Hewan liar banyak ditemukan di sini.',
    lore: 'Penduduk desa sekitar sering masuk ke hutan ini untuk berburu babi hutan atau mengumpulkan buah-buahan liar. Namun belakangan hewan-hewan di sini menjadi lebih agresif seiring meningkatnya energi sihir iblis.',
    directions: {
      south: 'padang-rumput-slime-timur',
    },
    route: '/game/location/hutan-umum',
    bgImage: IMG.forest,
    accentColor: '#86efac',
    bgFrom: '#052e16',
    bgTo: '#011208',
    borderColor: '#86efac',
  },
  {
    id: 'pantai-kepiting',
    name: 'Pantai Monster Kepiting',
    shortName: 'Pantai Kepiting',
    zone: 'beach',
    levelRange: 'Lv. 4–8',
    description: 'Pantai berpasir putih yang indah namun dihuni Kepiting Monster raksasa yang sangat teritorial.',
    lore: 'Dahulu pantai ini menjadi tempat rekreasi penduduk kerajaan. Sejak Kepiting Monster bermigrasi dari lautan dalam, tak ada yang berani mendekat. Cangkang mereka sangat keras dan bernilai tinggi sebagai bahan baku zirah.',
    directions: {
      north: 'padang-rumput-slime-timur',
    },
    route: '/game/location/pantai-kepiting',
    bgImage: IMG.beach,
    accentColor: '#22d3ee',
    bgFrom: '#0c4a6e',
    bgTo: '#020d14',
    borderColor: '#22d3ee',
  },

  // ══ KEKAISARAN SENOFIA ═════════════════════════════════════════════════════
  {
    id: 'ibukota-kekaisaran-senofia',
    name: 'Ibukota Kekaisaran Senofia',
    shortName: 'Ibukota Senofia',
    zone: 'capital',
    levelRange: 'Lv. 8+',
    description: 'Ibukota megah Kekaisaran Senofia, pusat kekuasaan, perdagangan, dan diplomasi terbesar di benua.',
    lore: 'Dibangun di atas bukit dengan tembok batu raksasa, Ibukota Senofia menjadi simbol kekuatan Kekaisaran selama berabad-abad. Kaisar Aldric VII memerintah dari sini dengan tangan besi namun bijaksana.',
    directions: {
      west:  'padang-rumput-slime-timur',
      east:  'pangkalan-militer-senofia',
      north: 'markas-polisi-senofia',
      south: 'pangkalan-ksatria-suci-altea',
    },
    route: '/game/location/ibukota-kekaisaran-senofia',
    bgImage: IMG.capitalCity,
    accentColor: '#f59e0b',
    bgFrom: '#451a03',
    bgTo: '#0f0700',
    borderColor: '#f59e0b',
  },
  {
    id: 'pangkalan-militer-senofia',
    name: 'Pangkalan Militer Kekaisaran Senofia',
    shortName: 'Pangkalan Militer',
    zone: 'military',
    levelRange: 'Lv. 10–14',
    description: 'Pangkalan militer terkuat di Kekaisaran, tempat Ksatria Senofia berlatih dan bersiap menghadapi ancaman.',
    lore: 'Ribuan ksatria terlatih berjaga di pangkalan ini siang dan malam. Hanya mereka yang memiliki izin resmi Kekaisaran boleh masuk. Pelanggar akan langsung ditangkap oleh pasukan elite penjaga gerbang.',
    directions: {
      west: 'ibukota-kekaisaran-senofia',
      east: 'kastil-kaisar-senofia',
    },
    route: '/game/location/pangkalan-militer-senofia',
    bgImage: IMG.imperialKnight,
    accentColor: '#94a3b8',
    bgFrom: '#1e293b',
    bgTo: '#0a0f1a',
    borderColor: '#94a3b8',
  },
  {
    id: 'kastil-kaisar-senofia',
    name: 'Kastil Inti Kaisar Senofia',
    shortName: 'Kastil Kaisar',
    zone: 'castle',
    levelRange: 'Lv. 14–20',
    description: 'Kastil megah tempat tinggal Kaisar Aldric VII beserta para penasihat dan pasukan penjaga elite.',
    lore: 'Kastil Inti tidak pernah sekalipun jatuh ke tangan musuh dalam sejarah 400 tahun Kekaisaran. Di sinilah keputusan tertinggi Kekaisaran dibuat — termasuk keputusan perang suci melawan kebangkitan iblis.',
    directions: {
      west: 'pangkalan-militer-senofia',
    },
    route: '/game/location/kastil-kaisar-senofia',
    bgImage: IMG.imperialCastle,
    accentColor: '#d97706',
    bgFrom: '#3b1a00',
    bgTo: '#0d0700',
    borderColor: '#d97706',
  },
  {
    id: 'markas-polisi-senofia',
    name: 'Markas Polisi Kekaisaran Senofia',
    shortName: 'Markas Polisi',
    zone: 'police',
    levelRange: 'Lv. 8–11',
    description: 'Markas besar penegak hukum Kekaisaran, tempat polisi mengadili pelanggar hukum dan menjaga ketertiban ibukota.',
    lore: 'Komisioner Darius memimpin Polisi Kekaisaran dengan tangan keras. Setiap pelanggaran hukum di wilayah Senofia akan berakhir di sini. Ruang pengadilan di lantai atas sering terdengar gema putusan hukuman.',
    directions: {
      south: 'ibukota-kekaisaran-senofia',
    },
    route: '/game/location/markas-polisi-senofia',
    bgImage: IMG.justiceStatue,
    accentColor: '#60a5fa',
    bgFrom: '#1e3a5f',
    bgTo: '#050d1a',
    borderColor: '#60a5fa',
  },

  // ══ ORDO SUCI ALTEA ════════════════════════════════════════════════════════
  {
    id: 'pangkalan-ksatria-suci-altea',
    name: 'Pangkalan Militer Ksatria Suci Dewi Altea',
    shortName: 'Ksatria Suci Altea',
    zone: 'holy',
    levelRange: 'Lv. 9–13',
    description: 'Markas besar Ordo Ksatria Suci yang bersumpah setia kepada Dewi Altea, pelindung cahaya dan kebenaran.',
    lore: 'Para Ksatria Suci Altea dipilih melalui ujian spiritual dan fisik yang sangat ketat. Zirah putih mereka ditempa di bawah sinar bulan purnama dan diberkati langsung oleh Pendeta Agung. Mereka adalah musuh bebuyutan para iblis.',
    directions: {
      north: 'ibukota-kekaisaran-senofia',
      south: 'katedral-suci-altea',
    },
    route: '/game/location/pangkalan-ksatria-suci-altea',
    bgImage: IMG.holyKnight,
    accentColor: '#fde68a',
    bgFrom: '#3d2e00',
    bgTo: '#100c00',
    borderColor: '#fde68a',
  },
  {
    id: 'katedral-suci-altea',
    name: 'Katedral Suci Dewi Altea',
    shortName: 'Katedral Altea',
    zone: 'holy',
    levelRange: 'Lv. 6+',
    description: 'Katedral megah tempat pemujaan Dewi Altea, dipenuhi cahaya ilahi dan aura penyembuhan yang kuat.',
    lore: 'Dibangun selama 80 tahun oleh ribuan pengrajin berbakat, Katedral Altea adalah karya arsitektur paling megah di dunia. Siapapun yang berdoa di sini dengan tulus akan merasakan berkah penyembuhan dari Sang Dewi.',
    directions: {
      north: 'pangkalan-ksatria-suci-altea',
    },
    route: '/game/location/katedral-suci-altea',
    bgImage: IMG.cathedral,
    accentColor: '#f0abfc',
    bgFrom: '#3b0764',
    bgTo: '#0d0215',
    borderColor: '#f0abfc',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getLocation(id: string): WorldLocation | undefined {
  if (id === 'greenleaf_village') return getLocation('desa-daun-hijau');
  return LOCATIONS.find(l => l.id === id);
}

export function getNeighborId(locationId: string, dir: string): string | undefined {
  const loc = getLocation(locationId);
  if (!loc) return undefined;
  return (loc.directions as Record<string, string | undefined>)[dir];
}