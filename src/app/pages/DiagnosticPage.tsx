import { useState } from 'react';
import { getSupabaseClient } from '../../utils/supabase-client';
import { projectId } from '/utils/supabase/info';

export default function DiagnosticPage() {
  const [logs, setLogs]     = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runTests = async () => {
    setLogs([]);
    setTesting(true);

    try {
      addLog('🔍 Memulai diagnostic...');
      addLog('');

      // ── TEST 1: Supabase client ────────────────────────────────────────────
      addLog('=== TEST 1: Supabase Client ===');
      const supabase = getSupabaseClient();
      addLog(`✅ Supabase client OK`);
      addLog(`   Project ID: ${projectId}`);
      addLog('');

      // ── TEST 2: Auth session ────────────────────────────────────────────────
      addLog('=== TEST 2: Session ===');
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();

      if (sessErr) {
        addLog(`❌ Session error: ${sessErr.message}`);
        return;
      }
      if (!session) {
        addLog('⚠️ Tidak ada sesi aktif. Login terlebih dahulu di /login');
        return;
      }

      addLog(`✅ Sesi ditemukan`);
      addLog(`   User ID : ${session.user.id}`);
      addLog(`   Email   : ${session.user.email}`);
      addLog(`   Token   : ${session.access_token.substring(0, 40)}...`);
      addLog(`   Expires : ${new Date(session.expires_at! * 1000).toLocaleString()}`);
      addLog('');

      // ── TEST 3: getUser() — validasi JWT ke Supabase Auth API ──────────────
      addLog('=== TEST 3: getUser() — Supabase Auth API (jalur utama) ===');
      const { data: { user }, error: userErr } = await supabase.auth.getUser();

      if (userErr || !user) {
        addLog(`❌ getUser() gagal: ${userErr?.message}`);
        addLog('   Ini berarti JWT tidak valid di Supabase Auth API.');
        addLog('   Solusi: logout lalu login kembali.');
      } else {
        addLog(`✅ getUser() berhasil!`);
        addLog(`   User ID : ${user.id}`);
        addLog(`   Email   : ${user.email}`);
        addLog(`   Metadata: ${JSON.stringify(user.user_metadata).substring(0, 100)}...`);
        addLog('');

        // ── TEST 4: Baca player data dari metadata ─────────────────────────
        addLog('=== TEST 4: Player data dari user_metadata ===');
        const playerData = user.user_metadata?.playerData;

        if (!playerData) {
          addLog('⚠️ Tidak ada playerData di metadata — akan dibuat otomatis saat masuk game');
        } else {
          addLog(`✅ Player data ditemukan!`);
          addLog(`   Nama     : ${playerData.name}`);
          addLog(`   Level    : ${playerData.level}`);
          addLog(`   Role     : ${playerData.role}`);
          addLog(`   Gold     : ${playerData.gold}`);
          addLog(`   Faction  : ${playerData.faction}`);
          addLog(`   Karma    : ${playerData.karma}`);
          addLog(`   Location : ${playerData.location}`);
        }
        addLog('');

        // ── TEST 5: updateUser() — tulis ke metadata ───────────────────────
        addLog('=== TEST 5: updateUser() — simpan ke user_metadata ===');
        const testPayload = { _diagnosticPing: new Date().toISOString() };
        const { error: updateErr } = await supabase.auth.updateUser({ data: testPayload });

        if (updateErr) {
          addLog(`❌ updateUser() gagal: ${updateErr.message}`);
        } else {
          addLog('✅ updateUser() berhasil — data dapat disimpan!');
        }
      }

      addLog('');
      addLog('=== TEST 6: Edge function (opsional) ===');
      const edgeUrl = `https://${projectId}.supabase.co/functions/v1/make-server-f8fa42fe/health`;
      try {
        const r = await fetch(edgeUrl, { signal: AbortSignal.timeout(5000) });
        addLog(`   Status: ${r.status} ${r.ok ? '✅' : '❌'}`);
        if (r.ok) {
          const body = await r.json();
          addLog(`   Response: ${JSON.stringify(body)}`);
          addLog('   Edge function aktif (bonus, bukan jalur utama)');
        } else {
          const txt = await r.text();
          addLog(`   Response: ${txt.substring(0, 100)}`);
          addLog('   ⚠️ Edge function tidak aktif — game tetap berjalan via user_metadata');
        }
      } catch (e: any) {
        addLog(`   ⚠️ Edge function tidak dapat dijangkau: ${e.message}`);
        addLog('   Game tetap berjalan via user_metadata (tidak memerlukan edge function)');
      }

      addLog('');
      addLog('═══════════════════════════');
      addLog('🎉 DIAGNOSTIC SELESAI');
      addLog('═══════════════════════════');
    } catch (err: any) {
      addLog(`❌ ERROR TIDAK TERDUGA: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900/80 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-2">
            🔬 Diagnostic
          </h1>
          <p className="text-gray-400 mb-2 text-sm">
            Sistem sekarang menggunakan <span className="text-purple-300 font-semibold">Supabase Auth user_metadata</span> sebagai penyimpanan data — 
            tidak bergantung pada edge function yang gagal deploy.
          </p>
          <p className="text-gray-500 text-xs mb-4">
            Data pemain disimpan via <code className="text-purple-400">supabase.auth.updateUser()</code> dan dibaca via <code className="text-purple-400">supabase.auth.getUser()</code>.
          </p>
          <button
            onClick={runTests}
            disabled={testing}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 rounded-lg transition-all duration-300 font-semibold shadow-lg"
          >
            {testing ? '⏳ Menguji...' : '▶️ Jalankan Diagnostic'}
          </button>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
          <h2 className="text-xl font-bold text-purple-300 mb-4">📋 Log</h2>
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">Belum ada log. Klik tombol di atas untuk mulai.</p>
          ) : (
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-1 max-h-[600px] overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className={
                  log.includes('❌') ? 'text-red-400' :
                  log.includes('✅') ? 'text-green-400' :
                  log.includes('⚠️') ? 'text-yellow-400' :
                  log.includes('🎉') ? 'text-purple-400 font-bold' :
                  log.includes('═') ? 'text-purple-500' :
                  'text-gray-400'
                }>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <a href="/login" className="text-purple-400 hover:text-purple-300 underline text-sm">Login</a>
          <a href="/game/village" className="text-purple-400 hover:text-purple-300 underline text-sm">← Kembali ke Game</a>
        </div>
      </div>
    </div>
  );
}
