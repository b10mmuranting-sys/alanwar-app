// ============================================================
// supabase-config.js
// Konfigurasi pusat koneksi ke Supabase
// ============================================================

const SUPABASE_URL = 'https://tgtflddvpcodlnyaaeja.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u69f-gO2rVApBuVnz_xtrA_5TqPgfgI';

// Inisialisasi client Supabase (pastikan SDK sudah dimuat sebelum file ini)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);