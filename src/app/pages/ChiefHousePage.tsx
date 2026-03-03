import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function ChiefHousePage() {
  const { player, completeTutorialStep } = useGame();
  const navigate = useNavigate();
  const [currentDialog, setCurrentDialog] = useState(0);

  if (!player) return null;

  const progress = player.tutorialProgress;
  const tutorialCompleted = progress.completed;

  // Determine which tutorial dialog to show
  let dialogStage = 'welcome';
  if (tutorialCompleted) {
    dialogStage = 'completed';
  } else if (progress.meditated) {
    dialogStage = 'final_report';
  } else if (progress.defeatedBoars >= 4) {
    dialogStage = 'meditate';
  } else if (progress.trainedAtArena) {
    dialogStage = 'hunt_boars';
  } else if (progress.gotWeapon) {
    dialogStage = 'train';
  } else {
    dialogStage = 'get_weapon';
  }

  const dialogs: Record<string, any> = {
    welcome: {
      title: 'Selamat Datang, Petualang!',
      texts: [
        `Selamat datang di Desa Daun Hijau, ${player.name}. Aku adalah Eldrin, kepala desa ini.`,
        'Aku senang melihat wajah baru yang bersemangat. Desa kami mungkin kecil, tapi ini adalah tempat yang sempurna untuk memulai petualanganmu.',
        'Sebelum kamu menjelajahi dunia luar, ada beberapa hal yang perlu kamu pelajari. Aku akan membimbingmu melalui beberapa tutorial dasar.',
        'Mari kita mulai dengan hal paling penting: senjata!'
      ],
      actions: [
        {
          label: 'Mengerti, Kepala Desa',
          action: () => setCurrentDialog(currentDialog + 1)
        }
      ]
    },
    get_weapon: {
      title: 'Tutorial 1: Dapatkan Senjata',
      texts: [
        'Petualangan tanpa senjata adalah bunuh diri, percayalah!',
        'Kunjungi pandai besi kami, Thorin. Dia telah menyiapkan beberapa senjata kayu untuk petualang baru.',
        'Pilih senjata yang sesuai dengan gaya bertarungmu. Setelah itu, kembali ke sini untuk instruksi selanjutnya.'
      ],
      quest: {
        objective: 'Ambil senjata dari Pandai Besi',
        reward: 'Tutorial progress',
        status: progress.gotWeapon ? 'Selesai' : 'Aktif'
      },
      actions: [
        {
          label: 'Pergi ke Pandai Besi',
          action: () => navigate('/game/village/blacksmith')
        },
        {
          label: 'Kembali ke Desa',
          action: () => navigate('/game/village')
        }
      ]
    },
    train: {
      title: 'Tutorial 2: Latihan Bertarung',
      texts: [
        `Bagus! Aku lihat kamu sudah mendapatkan senjata. Sekarang kamu perlu belajar cara menggunakannya.`,
        'Pergi ke Arena Latihan Pasukan Penjaga. Disana kamu bisa berlatih melawan boneka kayu atau bahkan sparring dengan pasukan penjaga kami.',
        'Jangan takut untuk memulai dengan boneka kayu dulu. Tidak ada yang akan menertawaimu!'
      ],
      quest: {
        objective: 'Berlatih di Arena',
        reward: 'Tutorial progress',
        status: progress.trainedAtArena ? 'Selesai' : 'Aktif'
      },
      actions: [
        {
          label: 'Pergi ke Arena',
          action: () => navigate('/game/village/arena')
        },
        {
          label: 'Kembali ke Desa',
          action: () => navigate('/game/village')
        }
      ]
    },
    hunt_boars: {
      title: 'Tutorial 3: Berburu Babi Hutan',
      texts: [
        'Luar biasa! Kamu sudah mahir mengayunkan senjata. Sekarang saatnya menghadapi musuh sungguhan.',
        'Di hutan luar desa, ada babi hutan yang sering mengacaukan ladang kami. Bantu kami dengan mengalahkan 4 babi hutan.',
        'Hati-hati, mereka mungkin terlihat lucu tapi bisa berbahaya jika diremehkan!',
        '(Fitur ini akan dibuat nanti. Untuk sekarang, anggap kamu sudah menyelesaikannya.)'
      ],
      quest: {
        objective: 'Kalahkan 4 Babi Hutan',
        reward: '50 EXP, 20 Gold',
        status: progress.defeatedBoars >= 4 ? 'Selesai' : `Aktif (${progress.defeatedBoars}/4)`
      },
      actions: [
        {
          label: '[DEMO] Selesaikan Quest',
          action: async () => {
            await completeTutorialStep('boars');
          },
          demo: true
        },
        {
          label: 'Kembali ke Desa',
          action: () => navigate('/game/village')
        }
      ]
    },
    meditate: {
      title: 'Tutorial 4: Meditasi untuk Kekuatan',
      texts: [
        'Fantastis! Kamu telah membuktikan kemampuan tempurmu. Tapi kekuatan fisik saja tidak cukup.',
        'Kunjungi Kuil Desa dan bermeditasi. Meditasi akan meningkatkan HP-mu secara permanen.',
        'Ingat, HP yang kamu miliki itu permanen dan fleksibel. Tidak ada batas maksimal!',
        'Bermeditasi selama cukup lama untuk mendapatkan minimal 10 point HP tambahan.'
      ],
      quest: {
        objective: 'Bermeditasi di Kuil (+10 HP)',
        reward: '+10 HP Permanent',
        status: progress.meditated ? 'Selesai' : 'Aktif'
      },
      actions: [
        {
          label: 'Pergi ke Kuil',
          action: () => navigate('/game/village/temple')
        },
        {
          label: 'Kembali ke Desa',
          action: () => navigate('/game/village')
        }
      ]
    },
    final_report: {
      title: 'Laporan Akhir Tutorial',
      texts: [
        `Sempurna, ${player.name}! Kamu telah menyelesaikan semua tutorial dasar.`,
        'Sekarang kamu sudah siap untuk menjelajahi dunia yang lebih luas.',
        'Ingat, setiap tindakanmu memiliki konsekuensi. Melindungi yang lemah akan membuatmu menjadi pahlawan, tapi menyerang mereka akan membawamu ke jalan kegelapan.',
        'Pilihanmu akan menentukan takdirmu. Semoga keberuntungan selalu bersamamu!'
      ],
      actions: [
        {
          label: 'Terima Kasih, Kepala Desa!',
          action: () => {
            // Tutorial completed
            navigate('/game/village');
          }
        }
      ]
    },
    completed: {
      title: 'Selamat Datang Kembali',
      texts: [
        `Ah, ${player.name}! Senang melihatmu lagi.`,
        'Bagaimana petualanganmu? Semoga dunia luar memperlakukanmu dengan baik.',
        'Jika kamu memerlukan nasihat atau bantuan, jangan ragu untuk datang ke sini kapan saja.'
      ],
      actions: [
        {
          label: 'Terima kasih',
          action: () => navigate('/game/village')
        }
      ]
    }
  };

  const dialog = dialogs[dialogStage];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/game/village')}
        className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Kembali ke Desa</span>
      </button>

      <div className="bg-gradient-to-br from-purple-900/40 to-black/60 backdrop-blur-sm border-2 border-purple-500/30 rounded-xl overflow-hidden">
        {/* House Image */}
        <div className="relative h-64">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1720129766483-e3554ee97d11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMHZpbGxhZ2UlMjBob3VzZXN8ZW58MXx8fHwxNzcyNTI3ODUyfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Chief House"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-bold text-white mb-1">Rumah Kepala Desa</h1>
            <p className="text-purple-200">Kepala Desa Eldrin</p>
          </div>
        </div>

        {/* Dialog Content */}
        <div className="p-8">
          {/* Dialog Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-purple-300 mb-2">{dialog.title}</h2>
            {dialog.quest && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                dialog.quest.status.includes('Selesai') 
                  ? 'bg-green-900/30 border border-green-500/50' 
                  : 'bg-yellow-900/30 border border-yellow-500/50'
              }`}>
                <CheckCircle className={`w-4 h-4 ${
                  dialog.quest.status.includes('Selesai') ? 'text-green-400' : 'text-yellow-400'
                }`} />
                <span className={`text-sm font-semibold ${
                  dialog.quest.status.includes('Selesai') ? 'text-green-300' : 'text-yellow-300'
                }`}>
                  Quest: {dialog.quest.status}
                </span>
              </div>
            )}
          </div>

          {/* Dialog Texts */}
          <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6 mb-6 space-y-4">
            {dialog.texts.map((text: string, index: number) => (
              <p key={index} className="text-gray-300 leading-relaxed">
                {text}
              </p>
            ))}
          </div>

          {/* Quest Info */}
          {dialog.quest && (
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Objektif</p>
                  <p className="text-purple-200 font-semibold">{dialog.quest.objective}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Reward</p>
                  <p className="text-yellow-300 font-semibold">{dialog.quest.reward}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {dialog.actions.map((action: any, index: number) => (
              <button
                key={index}
                onClick={action.action}
                className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                  action.demo
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white'
                    : index === 0
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
