// ============================================================
// dashboard.js — Logika Dashboard & Role-Based Sidebar
// ============================================================

(function () {
  'use strict';

  // Pastikan user sudah login (dari auth.js)
  if (!window.pengurusAktif) return;

  const user = window.pengurusAktif;

  // ==========================================
  // 1. SET IDENTITAS USER DI SIDEBAR
  // ==========================================
  const userNameEl   = document.getElementById('userName');
  const userRoleEl   = document.getElementById('userRole');
  const userAvatarEl = document.getElementById('userAvatar');
  const welcomeText  = document.getElementById('welcomeText');

  if (userNameEl) userNameEl.textContent = user.nama_lengkap;
  
  if (userRoleEl) {
    let roleLabel = user.role;
    if (user.role === 'administrator') roleLabel = 'Administrator';
    if (user.role === 'operator') roleLabel = 'Operator Data';
    if (user.role === 'perizinan') roleLabel = 'Divisi Perizinan';
    userRoleEl.textContent = roleLabel;
  }

  if (userAvatarEl) {
    const names = user.nama_lengkap.split(' ');
    userAvatarEl.textContent = names[0].charAt(0).toUpperCase();
  }

  if (welcomeText) {
    const hour = new Date().getHours();
    let salam = "Assalamu'alaikum";
    if (hour < 10) salam = "Selamat Pagi";
    else if (hour < 15) salam = "Selamat Siang";
    else if (hour < 18) salam = "Selamat Sore";
    else salam = "Selamat Malam";
    
    welcomeText.textContent = `${salam}, ${user.nama_lengkap.split(' ')[0]}!`;
  }

  // ==========================================
  // 2. SET TANGGAL DI NAVBAR
  // ==========================================
  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('id-ID', options);
  }

  // ==========================================
  // 3. LOGIKA ROLE-BASED SIDEBAR (PENTING!)
  // ==========================================
  const menuDataMaster   = document.getElementById('menu-data-master');
  const menuKesantrian   = document.getElementById('menu-kesantrian');
  const menuAdministrasi = document.getElementById('menu-administrasi');
  const menuPelanggaran  = document.getElementById('menu-pelanggaran');
  const menuPengaturan   = document.getElementById('menu-pengaturan'); // Ditambahkan
  const navPengurus      = document.getElementById('nav-pengurus');

  // Sembunyikan semua menu dulu
  const allMenus = [menuDataMaster, menuKesantrian, menuAdministrasi, menuPelanggaran, menuPengaturan];
  allMenus.forEach(menu => { if(menu) menu.style.display = 'none'; });
  if(navPengurus) navPengurus.style.display = 'none';

  // Tampilkan berdasarkan role
  if (user.role === 'administrator') {
    // Admin: Tampil semua
    allMenus.forEach(menu => { if(menu) menu.style.display = 'block'; });
    if(navPengurus) navPengurus.style.display = 'flex'; 
  } 
  else if (user.role === 'operator') {
    // Operator: Hanya Data Master & Kesantrian
    if(menuDataMaster) menuDataMaster.style.display = 'block';
    if(menuKesantrian) menuKesantrian.style.display = 'block';
  } 
  else if (user.role === 'perizinan') {
    // Perizinan: Hanya Administrasi & Pelanggaran
    if(menuAdministrasi) menuAdministrasi.style.display = 'block';
    if(menuPelanggaran) menuPelanggaran.style.display = 'block';
  }

  // ==========================================
  // 4. TOGGLE SIDEBAR MOBILE
  // ==========================================
  const btnToggle     = document.getElementById('btnToggleSidebar');
  const sidebar       = document.getElementById('sidebar');
  const sidebarOverlay= document.getElementById('sidebarOverlay');

  if (btnToggle && sidebar && sidebarOverlay) {
    btnToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // ==========================================
  // 5. LOAD STATISTIK RINGKAS DASHBOARD
  // ==========================================
  async function loadDashboardStats() {
    try {
      // Total Santri Aktif
      const { count: totalSantri } = await db
        .from('santri')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Aktif'); // Hanya hitung yang statusnya Aktif
      
      document.getElementById('dashTotalSantri').textContent = totalSantri || 0;

      // Total Kamar
      const { count: totalKamar } = await db
        .from('kamar')
        .select('*', { count: 'exact', head: true });
      
      document.getElementById('dashTotalKamar').textContent = totalKamar || 0;

    } catch (err) {
      console.warn('Statistik dashboard gagal dimuat (tabel mungkin belum ada):', err.message);
    }
  }

  loadDashboardStats();

})();