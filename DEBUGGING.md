# 🔧 DEBUGGING GUIDE

## Error: "Gagal mengambil data pemain"

Jika Anda mendapat error ini, ikuti langkah debugging berikut:

### 1. Gunakan Diagnostic Page
Buka halaman: `/diagnostic`

Halaman ini akan menjalankan test lengkap:
- ✅ Supabase client initialization
- ✅ Auth session check
- ✅ Backend health endpoint
- ✅ Player data endpoint

### 2. Check Browser Console
Buka Developer Tools (F12) dan lihat console untuk logs:
- `[GameContext]` - Logs dari frontend context
- `[GET PLAYER]` - Logs dari backend endpoint

### 3. Check Backend Logs di Supabase Dashboard
1. Buka Supabase Dashboard: https://supabase.com/dashboard
2. Pilih project Anda
3. Klik "Edge Functions" di sidebar
4. Klik function "server"
5. Klik tab "Logs"
6. Lihat logs real-time saat Anda mencoba login

### 4. Common Issues & Solutions

#### Issue: "Unauthorized - No token"
**Solusi:** Session tidak valid. Logout dan login ulang.

#### Issue: "Failed to create player data"
**Solusi:** KV store mungkin bermasalah. Check backend logs di Supabase.

#### Issue: "Server configuration error"
**Solusi:** Environment variables tidak diset. Check:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Di Supabase Dashboard → Edge Functions → server → Settings

#### Issue: Network error / CORS
**Solusi:** Backend function mungkin tidak deployed atau down. Check:
1. Health endpoint: `https://[PROJECT_ID].supabase.co/functions/v1/make-server-f8fa42fe/health`
2. Re-deploy function jika perlu

### 5. Manual Backend Deploy
Jika backend perlu di-deploy ulang:

```bash
# Di terminal Figma Make, backend auto-deploys ketika file berubah
# Atau manual deploy via Supabase CLI:
supabase functions deploy server
```

### 6. Test dengan cURL
Test backend langsung dengan cURL:

```bash
# Health check
curl https://[PROJECT_ID].supabase.co/functions/v1/make-server-f8fa42fe/health

# Player data (ganti [TOKEN] dengan access_token dari session)
curl -H "Authorization: Bearer [TOKEN]" \
  https://[PROJECT_ID].supabase.co/functions/v1/make-server-f8fa42fe/player
```

### 7. Reset Player Data
Jika player data corrupt, backend akan auto-create data baru saat fetch.
Untuk force reset, hapus session dan login ulang.

---

## Auto-Create Mechanism

Backend sekarang punya **auto-create** mechanism:
- ✅ Jika player data tidak ditemukan saat GET request
- ✅ Backend otomatis membuat data baru dari user info
- ✅ Retry 3x dengan delay 300ms
- ✅ Tidak akan return 404 lagi!

## Detailed Logging

Semua request sekarang punya detailed logging:
- Frontend: `[GameContext]` prefix
- Backend: `[GET PLAYER]` prefix
- Registration: `[REGISTER]` prefix
- Login: `[LOGIN]` prefix

Check browser console dan Supabase Edge Function logs untuk detail lengkap.
