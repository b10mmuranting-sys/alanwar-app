// ============================================================
// auth.js — Satpam Session
// Cek apakah pengurus sudah login. Jika belum, tendang ke login.html
// WAJIB dipanggil paling atas di setiap halaman proteksi.
// ============================================================

(function () {
  'use strict';

  const session = sessionStorage.getItem('pengurus_active');

  if (!session) {
    // Tidak ada session → lempar ke login
    window.location.href =
      window.location.pathname.includes('/data-master/') ||
      window.location.pathname.includes('/kesantrian/') ||
      window.location.pathname.includes('/administrasi/') ||
      window.location.pathname.includes('/pelanggaran/')
        ? '../login.html'
        : 'login.html';
    return;
  }

  // Jika session ada, parse datanya ke global supaya bisa dipakai halaman
  try {
    window.pengurusAktif = JSON.parse(session);
  } catch (e) {
    sessionStorage.removeItem('pengurus_active');
    window.location.href = 'login.html';
  }

  // Fungsi logout global
  window.logout = function () {
    sessionStorage.removeItem('pengurus_active');
    window.location.href =
      window.location.pathname.includes('/data-master/') ||
      window.location.pathname.includes('/kesantrian/') ||
      window.location.pathname.includes('/administrasi/') ||
      window.location.pathname.includes('/pelanggaran/')
        ? '../login.html'
        : 'login.html';
  };
})();