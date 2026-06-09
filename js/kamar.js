// ============================================================
// kamar.js — Logika CRUD Kamar, Anggota, & Ketua (CLEAN CODE)
// ============================================================

(function () {
  'use strict';

  if (!window.pengurusAktif) return;
  const role = window.pengurusAktif.role;
  if (role !== 'administrator' && role !== 'operator') {
    alert('Akses ditolak!');
    window.location.href = '../index.html';
    return;
  }

  // === REFERENSI DOM KAMAR ===
  const tbody = document.getElementById('dataKamarBody');
  const searchInput = document.getElementById('searchInput');
  const filterTipe = document.getElementById('filterTipe');
  const modalKamar = document.getElementById('modalKamar');
  const formKamar = document.getElementById('formKamar');
  const modalTitle = document.getElementById('modalKamarTitle');
  const btnTambah = document.getElementById('btnTambahKamar');
  const btnClose = document.getElementById('btnCloseKamar');
  const btnBatal = document.getElementById('btnBatalKamar');
  const btnSimpan = document.getElementById('btnSimpanKamar');

  const editIdField = document.getElementById('editKamarId');
  const namaKamarField = document.getElementById('namaKamar');
  const tipeKamarField = document.getElementById('tipeKamar');
  const kapasitasField = document.getElementById('kapasitasKamar');

  // === REFERENSI DOM ANGGOTA ===
  const modalAnggota = document.getElementById('modalAnggota');
  const modalAnggotaTitle = document.getElementById('modalAnggotaTitle');
  const btnCloseAnggota = document.getElementById('btnCloseAnggota');
  const selectSantri = document.getElementById('selectSantriKamar');
  const btnMasukkan = document.getElementById('btnMasukkanKamar');
  const dataAnggotaBody = document.getElementById('dataAnggotaBody');

  let dataKamarCache = [];
  let activeKamarNama = '';
  let activeKamarTipe = '';
  let ketuaKamarMap = {};

  // ==========================================
  // FUNGSI BANTUAN (CUSTOM CONFIRM & TOAST)
  // ==========================================
  function customConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-box">
          <div class="confirm-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/>
            </svg>
          </div>
          <h3 class="confirm-title">${title}</h3>
          <p class="confirm-msg">${message}</p>
          <div class="confirm-actions">
            <button class="btn btn-outline btn-sm" id="cBtnBatal">Batal</button>
            <button class="btn btn-danger btn-sm" id="cBtnYa">Ya, Lanjutkan</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      overlay.querySelector('#cBtnBatal').onclick = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('#cBtnYa').onclick = () => { overlay.remove(); resolve(true); };
      overlay.addEventListener('click', (e) => { 
        if (e.target === overlay) { overlay.remove(); resolve(false); } 
      });
    });
  }

  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  // ==========================================
  // LOGIKA CRUD KAMAR
  // ==========================================
  async function loadKamar() {
    try {
      const { data, error } = await db.from('kamar').select('*').order('tipe', { ascending: true });
      if (error) throw error;
      
      dataKamarCache = data || [];
      
      // Fetch ketua kamar
      const { data: ketuaData, error: ketuaError } = await db.from('santri')
        .select('nama_lengkap, kamar')
        .eq('is_ketua', true)
        .not('kamar', 'is', null);
        
      if (!ketuaError && ketuaData) {
        ketuaKamarMap = {};
        ketuaData.forEach(s => { ketuaKamarMap[s.kamar] = s.nama_lengkap; });
      }

      applyFilters();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty text-danger">Gagal memuat data kamar.</td></tr>`;
    }
  }

  async function countPenghuni(namaKamar) {
    try {
      const { count, error } = await db.from('santri')
        .select('*', { count: 'exact', head: true })
        .eq('kamar', namaKamar)
        .eq('status', 'Aktif'); // Hanya hitung santri aktif
      if (error) throw error;
      return count || 0;
    } catch (err) { 
      return 0; 
    }
  }

  async function renderTable(data) {
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Tidak ada data kamar ditemukan.</td></tr>`;
      return;
    }

    const tipeBadge = (tipe) => {
      if (tipe === 'Putra') return '<span class="badge badge-info">Putra</span>';
      if (tipe === 'Putri') return '<span class="badge badge-warning">Putri</span>';
      return '<span class="badge">Unknown</span>';
    };

    let rows = '';
    for (let i = 0; i < data.length; i++) {
      const k = data[i];
      const terisi = await countPenghuni(k.nama_kamar);
      const isFull = k.kapasitas && terisi >= k.kapasitas ? 'text-danger font-bold' : '';
      const namaKetua = ketuaKamarMap[k.nama_kamar] || '-';
      
      rows += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${k.nama_kamar}</strong></td>
          <td>${tipeBadge(k.tipe)}</td>
          <td>${k.kapasitas || '-'}</td>
          <td class="${isFull}">${terisi}</td>
          <td><span class="badge badge-success">${namaKetua}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="window.editKamar('${k.id}')" title="Edit Kamar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-action btn-delete" onclick="window.hapusKamar('${k.id}', '${k.nama_kamar}')" title="Hapus Kamar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
              <button class="btn-action" style="background: var(--success-light); color: var(--success);" onclick="window.lihatAnggota('${k.id}', '${k.nama_kamar}', '${k.tipe}')" title="Lihat Anggota">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    tbody.innerHTML = rows;
  }

  function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const tipe = filterTipe.value;
    const filtered = dataKamarCache.filter(k => {
      const matchKeyword = k.nama_kamar.toLowerCase().includes(keyword);
      const matchTipe = tipe ? k.tipe === tipe : true;
      return matchKeyword && matchTipe;
    });
    renderTable(filtered);
  }

  searchInput.addEventListener('keyup', applyFilters);
  filterTipe.addEventListener('change', applyFilters);

  // Modal Kamar
  function openModal(isEdit = false) { 
    formKamar.reset(); 
    editIdField.value = ''; 
    modalTitle.textContent = isEdit ? 'Edit Data Kamar' : 'Tambah Kamar Baru'; 
    modalKamar.classList.add('active'); 
  }
  
  function closeModal() { modalKamar.classList.remove('active'); }

  btnTambah.addEventListener('click', () => openModal(false));
  btnClose.addEventListener('click', closeModal); 
  btnBatal.addEventListener('click', closeModal); 
  modalKamar.addEventListener('click', (e) => { if(e.target === modalKamar) closeModal(); });

  btnSimpan.addEventListener('click', async () => {
    const payload = { 
      nama_kamar: namaKamarField.value.trim().toUpperCase(), // UPPERCASE
      tipe: tipeKamarField.value, 
      kapasitas: kapasitasField.value ? parseInt(kapasitasField.value) : null 
    };
    
    if (!payload.nama_kamar || !payload.tipe) { showToast('Harap isi Nama dan Tipe Kamar!', 'error'); return; }
    
    btnSimpan.disabled = true; 
    btnSimpan.textContent = 'Menyimpan...';
    try {
      const editId = editIdField.value; 
      let error;
      if (editId) { 
        const res = await db.from('kamar').update(payload).eq('id', editId); 
        error = res.error; 
      } else { 
        const res = await db.from('kamar').insert([payload]); 
        error = res.error; 
      }
      if (error) throw error;
      showToast(editId ? 'Kamar berhasil diperbarui!' : 'Kamar baru berhasil ditambahkan!');
      closeModal(); 
      loadKamar();
    } catch (err) { 
      showToast(err.message || 'Gagal menyimpan data.', 'error'); 
    } finally { 
      btnSimpan.disabled = false; 
      btnSimpan.textContent = 'Simpan Kamar'; 
    }
  });

  window.editKamar = async function(id) {
    try {
      const { data, error } = await db.from('kamar').select('*').eq('id', id).single();
      if (error) throw error;
      openModal(true);
      editIdField.value = data.id; 
      namaKamarField.value = data.nama_kamar; 
      tipeKamarField.value = data.tipe; 
      kapasitasField.value = data.kapasitas || '';
    } catch (err) { 
      showToast('Gagal mengambil data kamar.', 'error'); 
    }
  };

  window.hapusKamar = async function(id, nama) {
    const isConfirmed = await customConfirm('Hapus Kamar?', `Apakah Anda yakin ingin menghapus kamar <strong>${nama}</strong>?`);
    if (!isConfirmed) return;
    try { 
      const { error } = await db.from('kamar').delete().eq('id', id); 
      if (error) throw error; 
      showToast('Kamar berhasil dihapus.'); 
      loadKamar(); 
    } catch (err) { 
      showToast('Gagal menghapus.', 'error'); 
    }
  };

  // ==========================================
  // LOGIKA MANAJEMEN ANGGOTA & KETUA KAMAR
  // ==========================================
  
  function openAnggotaModal() { modalAnggota.classList.add('active'); }
  function closeAnggotaModal() { modalAnggota.classList.remove('active'); activeKamarNama = ''; activeKamarTipe = ''; }
  
  btnCloseAnggota.addEventListener('click', closeAnggotaModal);
  modalAnggota.addEventListener('click', (e) => { if(e.target === modalAnggota) closeAnggotaModal(); });

  window.lihatAnggota = async function(id, namaKamar, tipeKamar) {
    activeKamarNama = namaKamar;
    activeKamarTipe = tipeKamar;
    modalAnggotaTitle.textContent = `Anggota Kamar: ${namaKamar} (${tipeKamar})`;
    
    await loadAnggotaKamar();
    await populateSantriTanpaKamar();
    
    openAnggotaModal();
  };

  async function loadAnggotaKamar() {
    try {
      const { data, error } = await db.from('santri')
        .select('id, id_murid, nama_lengkap, is_ketua')
        .eq('kamar', activeKamarNama)
        .eq('status', 'Aktif') // Hanya tampilkan santri aktif di kamar
        .order('jenis_kelamin', { ascending: true }) // Laki-laki dulu
        .order('nama_lengkap', { ascending: true });  // Lalu abjad
        
      if (error) throw error;

      if (data.length === 0) {
        dataAnggotaBody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada santri di kamar ini.</td></tr>`;
        return;
      }

      dataAnggotaBody.innerHTML = data.map((s, i) => {
        const jabatanBadge = s.is_ketua 
          ? '<span class="badge badge-success">Ketua Kamar</span>' 
          : '<span class="badge" style="background: #f1f5f9; color: #94a3b8;">Anggota</span>';

        let btnKetua = s.is_ketua 
          ? `<button class="btn-action" style="background: var(--warning-light); color: var(--warning);" onclick="window.hapusStatusKetua('${s.id}')" title="Turunkan Jabatan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>` 
          : `<button class="btn-action" style="background: var(--gold-light); color: var(--gold-dark);" onclick="window.jadikanKetua('${s.id}')" title="Jadikan Ketua"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>`;

        return `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${s.id_murid}</strong></td>
            <td>${s.nama_lengkap}</td>
            <td>${jabatanBadge}</td>
            <td>
              <div class="action-buttons">
                ${btnKetua}
                <button class="btn-action btn-delete" onclick="window.keluarkanKamar('${s.id}', '${s.nama_lengkap}')" title="Keluarkan dari Kamar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      showToast('Gagal memuat anggota kamar.', 'error');
    }
  }

  async function populateSantriTanpaKamar() {
    try {
      const jenisKelamin = activeKamarTipe === 'Putra' ? 'Laki-laki' : 'Perempuan';
      const { data, error } = await db.from('santri')
        .select('id, id_murid, nama_lengkap')
        .eq('jenis_kelamin', jenisKelamin)
        .eq('status', 'Aktif') // HANYA TAMPILKAN SANTRI AKTIF
        .or('kamar.is.null,kamar.eq.') 
        .order('nama_lengkap');

      if (error) throw error;

      selectSantri.innerHTML = '<option value="">-- Pilih Santri --</option>';
      if (data && data.length > 0) {
        data.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.id_murid} - ${s.nama_lengkap}`;
          selectSantri.appendChild(opt);
        });
      } else {
        selectSantri.innerHTML = '<option value="">Tidak ada santri yang belum punya kamar</option>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  btnMasukkan.addEventListener('click', async () => {
    const santriId = selectSantri.value;
    if (!santriId) { showToast('Pilih santri terlebih dahulu!', 'error'); return; }

    btnMasukkan.disabled = true; 
    btnMasukkan.textContent = 'Memasukkan...';
    try {
      const { error } = await db.from('santri').update({ kamar: activeKamarNama, is_ketua: false }).eq('id', santriId);
      if (error) throw error;

      showToast('Santri berhasil dimasukkan ke kamar!');
      await loadAnggotaKamar();
      await populateSantriTanpaKamar();
      loadKamar(); 
    } catch (err) { 
      showToast('Gagal memasukkan santri.', 'error'); 
    } finally { 
      btnMasukkan.disabled = false; 
      btnMasukkan.textContent = 'Masukkan ke Kamar'; 
    }
  });

  window.jadikanKetua = async function(santriId) {
    try {
      const { error: errRevoke } = await db.from('santri')
        .update({ is_ketua: false })
        .eq('kamar', activeKamarNama)
        .eq('is_ketua', true);
      if (errRevoke) throw errRevoke;

      const { error: errAssign } = await db.from('santri')
        .update({ is_ketua: true })
        .eq('id', santriId);
      if (errAssign) throw errAssign;

      showToast('Berhasil mengangkat Ketua Kamar baru!');
      await loadAnggotaKamar();
      loadKamar();              
    } catch (err) {
      showToast('Gagal mengubah status ketua kamar.', 'error');
    }
  };

  window.hapusStatusKetua = async function(santriId) {
    const isConfirmed = await customConfirm('Turunkan Jabatan?', 'Cabut status Ketua Kamar? Ia akan kembali menjadi anggota biasa.');
    if (!isConfirmed) return;
    
    try {
      const { error } = await db.from('santri')
        .update({ is_ketua: false })
        .eq('id', santriId);
      if (error) throw error;

      showToast('Status Ketua Kamar berhasil dicabut.');
      await loadAnggotaKamar();
      loadKamar();
    } catch (err) {
      showToast('Gagal mencabut status ketua.', 'error');
    }
  };

  window.keluarkanKamar = async function(santriId, namaSantri) {
    const isConfirmed = await customConfirm('Keluarkan Santri?', `Keluarkan <strong>${namaSantri}</strong> dari kamar ini?`);
    if (!isConfirmed) return;
    
    try {
      const { error } = await db.from('santri').update({ kamar: null, is_ketua: false }).eq('id', santriId);
      if (error) throw error;

      showToast('Santri berhasil dikeluarkan dari kamar.');
      await loadAnggotaKamar();
      await populateSantriTanpaKamar();
      loadKamar();
    } catch (err) { 
      showToast('Gagal mengeluarkan santri.', 'error'); 
    }
  };

  // ==========================================
  // INISIASI HALAMAN
  // ==========================================
  const user = window.pengurusAktif;
  document.getElementById('userName').textContent = user.nama_lengkap;
  document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  
  let roleLabel = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan'; 
  document.getElementById('userRole').textContent = roleLabel;

  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') {
    document.getElementById('menu-administrasi').style.display = 'none';
    document.getElementById('menu-pelanggaran').style.display = 'none';
  }

  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('btnToggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  });
  
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  });

  loadKamar();

})();