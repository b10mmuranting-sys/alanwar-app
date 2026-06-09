// ============================================================
// login.js — Logika Login & Load Statistik
// ============================================================

(function () {
  'use strict';

  // --- Jika sudah login, langsung lempar ke dashboard ---
  if (sessionStorage.getItem('pengurus_active')) {
    window.location.href = 'index.html';
    return;
  }

  // --- Referensi DOM ---
  const form        = document.getElementById('loginForm');
  const inputUser   = document.getElementById('username');
  const inputPass   = document.getElementById('password');
  const btnLogin    = document.getElementById('btnLogin');
  const toggleBtn   = document.getElementById('togglePassword');
  const iconOpen    = document.getElementById('iconEyeOpen');
  const iconClosed  = document.getElementById('iconEyeClosed');

  // ==========================================
  // 1. FUNGSI TOAST NOTIFICATION
  // ==========================================
  function showToast(message, type = 'error') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconSVG = type === 'success' 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    toast.innerHTML = `${iconSVG}<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  }

  // ==========================================
  // 2. TOGGLE LIHAT PASSWORD
  // ==========================================
  toggleBtn.addEventListener('click', function () {
    const isPassword = inputPass.type === 'password';
    inputPass.type = isPassword ? 'text' : 'password';
    iconOpen.classList.toggle('hidden');
    iconClosed.classList.toggle('hidden');
  });

  // ==========================================
  // 3. LOAD STATISTIK SANTRI DARI SUPABASE
  // ==========================================
  async function loadStats() {
    try {
      const { data, error } = await db.from('santri').select('jenjang, jenis_kelamin');
      
      if (error) throw error;

      let stats = { SMP: 0, SMK: 0, SMA: 0, MTs: 0, MA: 0, Putra: 0, Putri: 0 };

      if (data && data.length > 0) {
        data.forEach(s => {
          if (stats.hasOwnProperty(s.jenjang)) {
            stats[s.jenjang]++;
          }
          if (s.jenis_kelamin === 'Laki-laki') stats.Putra++;
          if (s.jenis_kelamin === 'Perempuan') stats.Putri++;
        });
      }

      document.getElementById('statSMP').textContent = stats.SMP;
      document.getElementById('statSMK').textContent = stats.SMK;
      document.getElementById('statSMA').textContent = stats.SMA;
      document.getElementById('statMTs').textContent = stats.MTs;
      document.getElementById('statMA').textContent  = stats.MA;
      document.getElementById('statPutra').textContent = stats.Putra;
      document.getElementById('statPutri').textContent = stats.Putri;

    } catch (err) {
      console.warn('Gagal memuat statistik (mungkin tabel belum ada):', err.message);
    }
  }

  // Panggil saat halaman dimuat
  loadStats();

  // ==========================================
  // 4. HANDLER SUBMIT LOGIN
  // ==========================================
  function setLoading(state) {
    if (state) { btnLogin.classList.add('loading'); btnLogin.disabled = true; }
    else { btnLogin.classList.remove('loading'); btnLogin.disabled = false; }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = inputUser.value.trim();
    const password = inputPass.value;

    if (!username || !password) {
      showToast('Username dan password wajib diisi.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await db
        .from('pengurus')
        .select('id, username, nama_lengkap, role, password')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('no rows')) {
          showToast('Username tidak ditemukan dalam sistem.', 'error');
        } else {
          showToast('Terjadi kesalahan koneksi. Coba lagi.', 'error');
        }
        setLoading(false);
        return;
      }

      if (data.password !== password) {
        showToast('Password yang Anda masukkan salah.', 'error');
        setLoading(false);
        return;
      }

      // --- LOGIN BERHASIL ---
      showToast(`Login berhasil! Selamat datang, ${data.nama_lengkap}.`, 'success');

      const sessionData = {
        id: data.id,
        username: data.username,
        nama_lengkap: data.nama_lengkap,
        role: data.role,
        login_at: new Date().toISOString()
      };

      sessionStorage.setItem('pengurus_active', JSON.stringify(sessionData));

      setTimeout(() => { window.location.href = 'index.html'; }, 1200);

    } catch (err) {
      console.error('Login error:', err);
      showToast('Terjadi kesalahan tak terduga.', 'error');
      setLoading(false);
    }
  });

    // ==========================================
  // 5. MODAL LOGIN FORMULIR
  // ==========================================
  const btnOpenRegister = document.getElementById('btnOpenRegister');
  const modalFormLogin = document.getElementById('modalFormLogin');
  const formLoginModal = document.getElementById('formLoginModal');
  const btnTutupModalLogin = document.getElementById('btnTutupModalLogin');

  if(btnOpenRegister) {
    btnOpenRegister.addEventListener('click', (e) => {
      e.preventDefault();
      modalFormLogin.style.display = 'flex';
      document.getElementById('modalUsername').focus();
    });
  }

  if(btnTutupModalLogin) {
    btnTutupModalLogin.addEventListener('click', () => {
      modalFormLogin.style.display = 'none';
    });
  }

  // Tutup modal jika klik area gelap di luar box
  if(modalFormLogin) {
    modalFormLogin.addEventListener('click', (e) => {
      if (e.target === modalFormLogin) modalFormLogin.style.display = 'none';
    });
  }

  if(formLoginModal) {
    formLoginModal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('modalUsername').value.trim();
      const password = document.getElementById('modalPassword').value;
      
      if(!username || !password) { showToast('Username dan password wajib diisi.', 'error'); return; }

      try {
        // Cek ke tabel pengurus di DB Utama Al Anwar
        const { data, error } = await db.from('pengurus').select('id, username, nama_lengkap, role, password').eq('username', username).single();
        
        if (error || !data) {
          showToast('Username tidak ditemukan.', 'error');
          return;
        }

        if (data.password !== password) {
          showToast('Password yang Anda masukkan salah.', 'error');
          return;
        }

        // Login berhasil, buat session
        const sessionData = { id: data.id, username: data.username, nama_lengkap: data.nama_lengkap, role: data.role, login_at: new Date().toISOString() };
        sessionStorage.setItem('pengurus_active', JSON.stringify(sessionData));
        
        showToast('Login berhasil! Mengalihkan ke formulir...', 'success');
        
        // Arahkan ke file formulir di folder data-master
        setTimeout(() => { window.location.href = 'data-master/formulir.html'; }, 1200);

      } catch (err) {
        showToast('Terjadi kesalahan koneksi.', 'error');
      }
    });
  }

  inputUser.focus();

})();