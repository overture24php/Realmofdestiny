import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, CheckCircle, Swords, Shield, Sparkles, Star, Gift } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

// ─── Rune particle ────────────────────────────────────────────────────────────

function RuneParticle({ index }: { index: number }) {
  const runes = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','⚔','🛡','✦'];
  const x     = 5 + (index * 9.3) % 90;
  const dur   = 7 + (index % 5) * 2;
  const delay = (index * 0.5) % 5;
  return (
    <motion.div className="absolute pointer-events-none select-none"
      style={{ left:`${x}%`, top:-20, fontSize: 10 + (index % 3) * 5, color:'#a855f788', fontFamily:'serif' }}
      initial={{ y:-30, opacity:0 }}
      animate={{ y:'110vh', opacity:[0,0.3,0.2,0] }}
      transition={{ duration:dur, delay, repeat:Infinity, ease:'linear' }}>
      {runes[index % runes.length]}
    </motion.div>
  );
}

// ─── Mission Card ─────────────────────────────────────────────────────────────

interface MissionCardProps {
  number  : number;
  title   : string;
  desc    : string;
  reward  : string;
  done    : boolean;
  active  : boolean;
  icon    : React.ReactNode;
}

function MissionCard({ number, title, desc, reward, done, active, icon }: MissionCardProps) {
  return (
    <motion.div
      initial={{ opacity:0, x:-16 }}
      animate={{ opacity:1, x:0 }}
      transition={{ delay: number * 0.06 }}
      className="flex items-start gap-4 p-4 rounded-xl border relative overflow-hidden"
      style={{
        background: done
          ? 'rgba(20,83,45,0.25)'
          : active
            ? 'rgba(88,28,135,0.25)'
            : 'rgba(5,5,20,0.4)',
        borderColor: done ? 'rgba(74,222,128,0.4)' : active ? 'rgba(168,85,247,0.5)' : 'rgba(75,85,99,0.25)',
        boxShadow: active ? '0 0 20px rgba(168,85,247,0.1)' : 'none',
      }}
    >
      {/* Active glow */}
      {active && (
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse at 0% 50%, rgba(168,85,247,0.08) 0%, transparent 60%)' }}
          animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2, repeat:Infinity }} />
      )}

      {/* Number badge */}
      <div className="flex-shrink-0 relative">
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: done ? 'linear-gradient(135deg, #166534, #22c55e)' : active ? 'linear-gradient(135deg, #4c1d95, #7c3aed)' : 'rgba(30,20,60,0.8)',
            border: `2px solid ${done ? '#4ade80' : active ? '#a855f7' : '#374151'}`,
            boxShadow: done ? '0 0 10px #4ade8066' : active ? '0 0 10px #a855f766' : 'none',
          }}>
          {done
            ? <CheckCircle className="w-4 h-4 text-green-300" />
            : <span style={{ fontFamily:'serif', fontWeight:900, color: active ? '#e9d5ff' : '#4b5563', fontSize:'0.8rem' }}>{number}</span>
          }
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <h4 style={{ fontFamily:'serif', fontWeight:700, color: done ? '#86efac' : active ? '#e9d5ff' : '#6b7280', fontSize:'0.88rem', letterSpacing:'0.03em' }}>
              {title}
            </h4>
          </div>
          {done && (
            <span style={{ fontSize:'0.6rem', color:'#4ade80', background:'rgba(20,83,45,0.5)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:20, padding:'1px 8px', flexShrink:0 }}>
              SELESAI
            </span>
          )}
          {active && !done && (
            <motion.span
              animate={{ opacity:[0.6,1,0.6] }} transition={{ duration:1.5, repeat:Infinity }}
              style={{ fontSize:'0.6rem', color:'#c084fc', background:'rgba(88,28,135,0.4)', border:'1px solid rgba(168,85,247,0.3)', borderRadius:20, padding:'1px 8px', flexShrink:0 }}>
              AKTIF
            </motion.span>
          )}
        </div>
        <p style={{ fontSize:'0.72rem', color: done ? '#6b7280' : active ? '#a78bfa' : '#4b5563', lineHeight:1.5, marginBottom: reward ? 6 : 0 }}>{desc}</p>
        {reward && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Gift className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <span style={{ fontSize:'0.62rem', color:'#fbbf24', letterSpacing:'0.04em' }}>{reward}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chief Dialog ─────────────────────────────────────────────────────────────

function ChiefDialog({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6"
      style={{ background:'rgba(5,5,25,0.7)', border:'1px solid rgba(124,58,237,0.3)', backdropFilter:'blur(12px)' }}>
      <div className="h-px" style={{ background:'linear-gradient(90deg, transparent, #7c3aed55, transparent)' }} />
      <div className="flex items-start gap-4 p-5">
        {/* Chief avatar */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden" style={{ border:'2px solid rgba(124,58,237,0.4)' }}>
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1566753323558-f4e0952af115?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwd2lzZSUyMG9sZCUyMG1hbiUyMHNhZ2UlMjBtZWRpZXZhbHxlbnwxfHx8fDE3NzI2MjQxNTJ8MA&ixlib=rb-4.1.0&q=80&w=200"
            alt="Kepala Desa" className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <p style={{ fontSize:'0.62rem', color:'#7c3aed', letterSpacing:'0.15em', marginBottom:4 }}>KEPALA DESA ELDRIN</p>
          <AnimatePresence mode="wait">
            <motion.p key={idx}
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.25 }}
              style={{ color:'#e2e8f0', fontSize:'0.82rem', lineHeight:1.6 }}>
              {texts[idx]}
            </motion.p>
          </AnimatePresence>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1">
              {texts.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === idx ? '#a855f7' : '#374151' }} />
              ))}
            </div>
            {idx < texts.length - 1 ? (
              <motion.button onClick={() => setIdx(i => i + 1)}
                whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                className="ml-auto text-xs px-3 py-1 rounded-lg"
                style={{ background:'rgba(124,58,237,0.3)', border:'1px solid rgba(168,85,247,0.4)', color:'#c084fc', cursor:'pointer' }}>
                Lanjut →
              </motion.button>
            ) : (
              <div className="ml-auto">
                <motion.div animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:1.2, repeat:Infinity }}>
                  <span style={{ fontSize:'0.62rem', color:'#4b5563' }}>Lihat misi di bawah ↓</span>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChiefHousePage() {
  const { player, updatePlayer, grantExp, addItemToInventory, completeTutorialStep } = useGame();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [claimed,  setClaimed]  = useState(false);

  if (!player) return null;

  const tp = player.tutorialProgress;
  const tutorialDone = tp.completed;

  // Calculate mission states
  const m1Done = tp.gotWeapon;
  const m2Done = (tp.defeatedDummies ?? 0) >= 3;
  const m3Done = (tp.defeatedGuards ?? 0) >= 5;
  const m4Done = tp.meditated;
  const m5Done = tp.reachedLevel5 || (player.level ?? 1) >= 5;
  const allDone = m1Done && m2Done && m3Done && m4Done && m5Done;

  // Current active mission number
  const activeMission = !m1Done ? 1 : !m2Done ? 2 : !m3Done ? 3 : !m4Done ? 4 : !m5Done ? 5 : 0;

  // Claim mission 5 reward and complete tutorial
  const handleClaimTutorialComplete = async () => {
    if (claiming || claimed || tutorialDone) return;
    setClaiming(true);
    try {
      await grantExp(300);
      const fresh = player;
      await updatePlayer({ gold: (fresh?.gold ?? 0) + 500 });
      await addItemToInventory('leather_boots');
      await completeTutorialStep('reached_level5');
      setClaimed(true);
    } finally {
      setClaiming(false);
    }
  };

  // Dialog texts based on active mission
  const chiefDialogs: Record<number, string[]> = {
    1: [
      `Selamat datang di Desa Daun Hijau, ${player.name}! Aku adalah Eldrin, kepala desa ini.`,
      'Sebelum kamu siap berpetualang ke dunia luar yang berbahaya, ada 5 misi yang harus kamu selesaikan.',
      'Misi pertama: kunjungi pandai besi kami, Thorin. Dia menyediakan senjata kayu untuk petualang baru.',
    ],
    2: [
      `Bagus! Kamu sudah mendapatkan senjata, ${player.name}.`,
      'Sekarang pergi ke Arena Latihan dan uji senjata barumu melawan 3 Boneka Kayu yang ada di sana.',
      'Boneka kayu tidak berbahaya, tapi akan mengajarkanmu cara berayun dengan benar!',
    ],
    3: [
      'Luar biasa! Kamu sudah menguasai teknik dasar serangan.',
      'Misi selanjutnya lebih menantang: kalahkan 5 Pasukan Penjaga Pemula (Level 1) di Arena!',
      'Mereka akan melawan balik. Gunakan strategi yang baik dan perhatikan giliran serangmu!',
    ],
    4: [
      `Kamu sudah membuktikan kemampuan tempurmu, ${player.name}!`,
      'Tapi kekuatan sejati bukan hanya fisik. Kunjungi Kuil Desa dan bermeditasilah.',
      'Meditasi akan mengangkat jiwa dan ragamu — dapatkan +10 HP permanen dari sana!',
    ],
    5: [
      `Hampir waktunya, ${player.name}! Hanya satu langkah lagi.`,
      'Kembali ke Arena dan terus berlatih sampai kamu mencapai Level 5.',
      'Level 5 adalah ambang batas kelayakan untuk berpetualang di dunia luar. Buktikan dirimu!',
    ],
    0: allDone && !tutorialDone ? [
      `LUAR BIASA, ${player.name}!! Kamu telah menyelesaikan semua misi!`,
      'Kamu telah membuktikan dirimu layak sebagai petualang sejati Realm of Destiny.',
      'Klaim hadiahmu dan BUKA AKSES KE DUNIA LUAR! Petualangan sesungguhnya baru saja dimulai!',
    ] : tutorialDone ? [
      `Selamat datang kembali, ${player.name}! Petualanganmu sudah dimulai.`,
      'Dunia luar menunggumu. Jika membutuhkan nasihat, jangan ragu untuk kembali ke sini.',
    ] : [
      `Selamat datang, ${player.name}. Masih ada misi yang menunggumu!`,
    ],
  };

  const currentTexts = chiefDialogs[activeMission] ?? chiefDialogs[0];

  const missions = [
    {
      number : 1,
      title  : 'Klaim Senjata dari Pandai Besi',
      desc   : 'Kunjungi Pandai Besi Thorin dan ambil senjata kayu pertamamu. Setiap pahlawan membutuhkan senjata!',
      reward : 'Tutorial Progress',
      done   : m1Done,
      active : activeMission === 1,
      icon   : '⚔️',
    },
    {
      number : 2,
      title  : 'Kalahkan 3 Boneka Kayu',
      desc   : 'Pergi ke Arena Latihan dan uji senjata barumu melawan 3 Boneka Kayu. Boneka tidak melawan balik!',
      reward : '20 EXP + 100 Gold + 1 Helm Kulit',
      done   : m2Done,
      active : activeMission === 2,
      icon   : '🪆',
    },
    {
      number : 3,
      title  : 'Kalahkan 5 Pasukan Penjaga Pemula',
      desc   : 'Latih kemampuan tempurmu melawan 5 Penjaga Desa Pemula (Lv.1) di Arena. Mereka akan melawan balik!',
      reward : '100 EXP + 200 Gold + 1 Armor Kulit',
      done   : m3Done,
      active : activeMission === 3,
      icon   : '🛡️',
    },
    {
      number : 4,
      title  : 'Meditasi di Kuil Desa (+10 HP)',
      desc   : 'Kunjungi Kuil Desa dan meditasikan jiwamu. Dapatkan bonus +10 HP permanen sebagai hasil meditasi!',
      reward : '100 EXP + 200 Gold + 1 Celana Kulit',
      done   : m4Done,
      active : activeMission === 4,
      icon   : '🕯️',
    },
    {
      number : 5,
      title  : 'Capai Level 5 & Mulai Petualangan!',
      desc   : 'Latihan di Arena pelatihan desa hingga mencapai Level 5. Setelah itu, gerbang dunia luar akan terbuka!',
      reward : '300 EXP + 500 Gold + 1 Sepatu Kulit + AKSES PETA DUNIA',
      done   : m5Done,
      active : activeMission === 5,
      icon   : '🌍',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto relative">
      {/* Background rune particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 10 }).map((_, i) => <RuneParticle key={i} index={i} />)}
      </div>

      {/* Back button */}
      <motion.button
        onClick={() => navigate('/game/village')}
        className="mb-5 flex items-center gap-2 transition-colors relative z-10"
        style={{ color:'#a78bfa' }}
        whileHover={{ x:-3, color:'#c4b5fd' } as any}
      >
        <ArrowLeft className="w-4 h-4" />
        <span style={{ fontSize:'0.85rem' }}>Kembali ke Desa</span>
      </motion.button>

      <div className="relative z-10">

        {/* ── Header image + title ── */}
        <div className="rounded-2xl overflow-hidden mb-6 relative"
          style={{ border:'1px solid rgba(124,58,237,0.35)', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
          <div className="relative h-52 overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1720129766483-e3554ee97d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMHZpbGxhZ2UlMjBob3VzZXN8ZW58MXx8fHwxNzcyNTI3ODUyfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Rumah Kepala Desa" className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background:'linear-gradient(to top, rgba(3,1,15,0.97) 0%, rgba(3,1,15,0.6) 50%, rgba(3,1,15,0.2) 100%)' }} />
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background:'linear-gradient(90deg, transparent, #7c3aed, #ec4899, #7c3aed, transparent)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <motion.div className="flex items-center gap-2 mb-2"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
                <div className="h-px flex-1 max-w-16" style={{ background:'linear-gradient(to right, transparent, #7c3aed55)' }} />
                <span style={{ fontSize:'0.6rem', color:'#7c3aed', letterSpacing:'0.3em' }}>RUMAH KEPALA DESA</span>
                <div className="h-px flex-1 max-w-16" style={{ background:'linear-gradient(to left, transparent, #7c3aed55)' }} />
              </motion.div>
              <motion.h1 initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                style={{ fontFamily:'serif', fontWeight:900, fontSize:'2rem', background:'linear-gradient(135deg, #fff, #c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'0.04em' }}>
                Kepala Desa Eldrin
              </motion.h1>
              <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
                style={{ color:'#a78bfa', fontSize:'0.75rem', letterSpacing:'0.12em' }}>
                🏰 Panduan Tutorial & Misi Awal
              </motion.p>
            </div>
          </div>
        </div>

        {/* ── Tutorial complete state ── */}
        {tutorialDone && (
          <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
            className="rounded-2xl p-6 text-center mb-6"
            style={{ background:'linear-gradient(135deg, rgba(20,83,45,0.4), rgba(120,53,15,0.3))', border:'1.5px solid rgba(251,191,36,0.5)', boxShadow:'0 0 30px rgba(251,191,36,0.1)' }}>
            <motion.div animate={{ rotate:[0,10,-10,0], scale:[1,1.1,1] }} transition={{ duration:3, repeat:Infinity }} className="inline-block mb-3 text-5xl">
              🏆
            </motion.div>
            <h2 style={{ fontFamily:'serif', fontWeight:900, fontSize:'1.5rem', color:'#fbbf24', marginBottom:8 }}>Tutorial Selesai!</h2>
            <p style={{ color:'#86efac', fontSize:'0.85rem', lineHeight:1.6, marginBottom:20 }}>
              Kamu telah menyelesaikan semua misi dan membuka akses peta dunia. Petualanganmu sesungguhnya telah dimulai!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <motion.button onClick={() => navigate('/game/village')} whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                className="px-6 py-3 rounded-xl"
                style={{ background:'linear-gradient(135deg, #166534, #15803d)', color:'#fff', fontFamily:'serif', fontWeight:700, border:'none', cursor:'pointer' }}>
                🌿 Kembali ke Desa
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Chief dialog (only when tutorial not done) ── */}
        {!tutorialDone && <ChiefDialog texts={currentTexts} />}

        {/* ── Mission list ── */}
        <div className="rounded-2xl overflow-hidden mb-6"
          style={{ background:'rgba(5,3,20,0.85)', backdropFilter:'blur(16px)', border:'1px solid rgba(124,58,237,0.25)', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
          <div className="h-px" style={{ background:'linear-gradient(90deg, transparent, #7c3aed55, transparent)' }} />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-4 h-4 text-yellow-400" />
              <h3 style={{ fontFamily:'serif', fontWeight:900, fontSize:'1rem', color:'#e2e8f0', letterSpacing:'0.05em' }}>
                Misi Tutorial (5/{5})
              </h3>
              <div className="flex-1 h-px" style={{ background:'linear-gradient(to right, #7c3aed40, transparent)' }} />
              {/* Progress chips */}
              <span style={{ fontSize:'0.65rem', color:'#a78bfa', background:'rgba(88,28,135,0.3)', border:'1px solid rgba(168,85,247,0.35)', borderRadius:20, padding:'2px 10px' }}>
                {[m1Done,m2Done,m3Done,m4Done,m5Done].filter(Boolean).length}/5 selesai
              </span>
            </div>

            <div className="space-y-3">
              {missions.map(m => (
                <MissionCard key={m.number} {...m} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Claim tutorial complete reward ── */}
        {!tutorialDone && allDone && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity:0, y:20, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              className="rounded-2xl overflow-hidden mb-6"
              style={{ border:'2px solid rgba(251,191,36,0.6)', boxShadow:'0 0 40px rgba(251,191,36,0.15)' }}
            >
              <div className="h-1" style={{ background:'linear-gradient(90deg, #7c3aed, #fbbf24, #ec4899, #fbbf24, #7c3aed)' }} />
              <div className="p-6 text-center" style={{ background:'linear-gradient(135deg, rgba(120,53,15,0.35), rgba(20,83,45,0.35))' }}>
                <motion.div animate={{ scale:[1,1.15,1], rotate:[0,8,-8,0] }} transition={{ duration:2.5, repeat:Infinity }} className="inline-block mb-3 text-5xl">
                  🎉
                </motion.div>
                <h3 style={{ fontFamily:'serif', fontWeight:900, fontSize:'1.5rem', color:'#fbbf24', marginBottom:8 }}>
                  Semua Misi Selesai!
                </h3>
                <p style={{ color:'#86efac', fontSize:'0.85rem', lineHeight:1.6, marginBottom:16 }}>
                  Kamu telah membuktikan dirimu sebagai petualang sejati. Klaim hadiahmu dan buka akses peta dunia!
                </p>
                <div className="flex items-center justify-center gap-4 mb-5 flex-wrap">
                  {[{ icon:'⚡', label:'300 EXP' }, { icon:'🪙', label:'500 Gold' }, { icon:'👟', label:'Sepatu Kulit' }, { icon:'🗺️', label:'Peta Dunia!' }].map(r => (
                    <div key={r.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                      style={{ background:'rgba(120,53,15,0.4)', border:'1px solid rgba(251,191,36,0.3)' }}>
                      <span>{r.icon}</span>
                      <span style={{ fontSize:'0.75rem', color:'#fbbf24', fontWeight:700 }}>{r.label}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={handleClaimTutorialComplete}
                  disabled={claiming || claimed}
                  whileHover={claiming || claimed ? {} : { scale:1.04, boxShadow:'0 0 40px rgba(251,191,36,0.5)' }}
                  whileTap={claiming || claimed ? {} : { scale:0.97 }}
                  className="w-full py-4 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: claimed ? 'rgba(20,83,45,0.6)' : 'linear-gradient(135deg, #92400e, #d97706, #fbbf24)',
                    fontFamily:'serif', fontWeight:900, fontSize:'1rem', border:'none',
                    cursor: claiming || claimed ? 'not-allowed' : 'pointer',
                    boxShadow: claimed ? 'none' : '0 8px 30px rgba(251,191,36,0.4)',
                    opacity: claiming ? 0.7 : 1,
                  }}
                >
                  {claiming ? (
                    <>
                      <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
                      Mengklaim...
                    </>
                  ) : claimed ? (
                    <><CheckCircle className="w-5 h-5" /> Berhasil Diklaim!</>
                  ) : (
                    <><Gift className="w-5 h-5" /> Klaim Reward & Buka Peta Dunia!</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Quick nav buttons ── */}
        {!tutorialDone && (
          <div className="rounded-2xl p-5 mb-4"
            style={{ background:'rgba(5,3,20,0.7)', border:'1px solid rgba(124,58,237,0.2)', backdropFilter:'blur(12px)' }}>
            <p style={{ fontSize:'0.65rem', color:'#6b7280', letterSpacing:'0.15em', marginBottom:12 }}>✦ NAVIGASI CEPAT</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'⚒️ Pandai Besi', route:'/game/village/blacksmith', active: activeMission === 1 },
                { label:'⚔️ Arena Latihan', route:'/game/village/arena',      active: activeMission === 2 || activeMission === 3 || activeMission === 5 },
                { label:'🕯️ Kuil Desa',    route:'/game/village/temple',      active: activeMission === 4 },
                { label:'🏘️ Desa',          route:'/game/village',            active: false },
              ].map(nav => (
                <motion.button key={nav.route} onClick={() => navigate(nav.route)}
                  whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.97 }}
                  className="py-3 rounded-xl text-center"
                  style={{
                    background: nav.active ? 'rgba(88,28,135,0.35)' : 'rgba(20,15,40,0.6)',
                    border: `1px solid ${nav.active ? 'rgba(168,85,247,0.5)' : 'rgba(75,85,99,0.25)'}`,
                    cursor:'pointer', boxShadow: nav.active ? '0 0 16px rgba(168,85,247,0.15)' : 'none',
                  }}>
                  <span style={{ fontSize:'0.75rem', color: nav.active ? '#e9d5ff' : '#6b7280', fontFamily:'serif' }}>
                    {nav.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
