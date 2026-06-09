// ============================================================
// izin-keluar.js — Logika CRUD Izin Keluar (Custom UI)
// ============================================================

(function () {
  'use strict';

  if (!window.pengurusAktif) return;
  const role = window.pengurusAktif.role;
  if (role !== 'administrator' && role !== 'operator' && role !== 'Divisi Perizinan') {
    showToast('Akses ditolak!', 'error'); 
    setTimeout(() => window.location.href = '../index.html', 1000); 
    return;
  }

  const tbody           = document.getElementById('dataIzinBody');
  const filterStatus    = document.getElementById('filterStatus');
  const modalIzin       = document.getElementById('modalIzin');
  const formIzin        = document.getElementById('formIzin');
  const modalIzinTitle  = document.getElementById('modalIzinTitle');
  const btnTambah       = document.getElementById('btnTambahIzin');
  const btnCloseModal   = document.getElementById('btnCloseIzin');
  const btnBatal        = document.getElementById('btnBatalIzin');
  const btnSimpan       = document.getElementById('btnSimpanIzin');
  const editIzinIdField = document.getElementById('editIzinId');
  const selectSantri    = document.getElementById('selectSantriIzin');
  const tanggalIzinField= document.getElementById('tanggalIzin');
  const jamKeluarField  = document.getElementById('jamKeluar');
  const jamKembaliField = document.getElementById('jamKembali');
  const keperluanField  = document.getElementById('keperluanIzin');

  let dataIzinCache = [];

  // ==========================================
  // FUNGSI UI KUSTOM (TOAST & CONFIRM)
  // ==========================================

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
            <button class="btn btn-primary btn-sm" id="cBtnYa">Ya, Lanjutkan</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      
      overlay.querySelector('#cBtnBatal').onclick = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('#cBtnYa').onclick = () => { overlay.remove(); resolve(true); };
      overlay.addEventListener('click', (e) => { 
        if(e.target === overlay) { overlay.remove(); resolve(false); } 
      });
    });
  }

  // ==========================================
  // LOGICA CRUD
  // ==========================================

  async function loadSantriDropdown() {
    try {
      const { data, error } = await db.from('santri').select('id, id_murid, nama_lengkap')
        .eq('status', 'Aktif')
        .order('nama_lengkap', { ascending: true });
        
      if (error) throw error;
      selectSantri.innerHTML = '<option value="">-- Pilih Santri --</option>';
      if (data) { data.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.id_murid} - ${s.nama_lengkap}`; selectSantri.appendChild(o); }); }
    } catch (err) { 
      showToast('Gagal memuat data santri: ' + err.message, 'error'); 
    }
  }

  async function loadIzinKeluar() {
    try {
      const { data, error } = await db.from('izin_keluar').select(`*, santri(nama_lengkap, id_murid)`)
        .order('tanggal_izin', { ascending: false });
        
      if (error) throw error;
      dataIzinCache = data || [];
      applyFilters();
    } catch (err) {
      console.error('Gagal memuat data:', err.message);
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty text-danger">Gagal memuat data dari server.</td></tr>`;
      showToast('Gagal memuat riwayat izin keluar', 'error');
    }
  }

  function renderTable(data) {
    if (data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Tidak ada data izin keluar.</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => {
      const tglIzin = new Date(item.tanggal_izin).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const badgeClass = item.status === 'Sudah Kembali' ? 'badge-success' : 'badge-warning';
      
      const idMurid = item.santri ? item.santri.id_murid : '-';
      const namaSantri = item.santri ? item.santri.nama_lengkap : '-';

      const jamKeluar = item.jam_keluar ? item.jam_keluar.substring(0, 5) : '-';
      const jamKembali = item.jam_kembali ? item.jam_kembali.substring(0, 5) : '-';

      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${idMurid}</strong><br><small>${namaSantri}</small></td>
          <td>${tglIzin}</td>
          <td>${jamKeluar}</td>
          <td>${jamKembali}</td>
          <td>${item.keperluan}</td>
          <td><span class="badge ${badgeClass}">${item.status}</span></td>
          <td><div class="action-buttons">
            ${item.status === 'Belum Kembali' ? `<button class="btn-action btn-edit" onclick="window.tandaiKembaliKeluar('${item.id}')" title="Tandai Kembali"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
            <button class="btn-action btn-delete" onclick="window.hapusIzinKeluar('${item.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div></td>
        </tr>`;
    }).join('');
  }

  function applyFilters() { const s = filterStatus.value; renderTable(dataIzinCache.filter(item => s ? item.status === s : true)); }
  filterStatus.addEventListener('change', applyFilters);

  function openModal(isEdit = false) { 
    formIzin.reset(); 
    editIzinIdField.value = ''; 
    modalIzinTitle.textContent = isEdit ? 'Edit Izin Keluar' : 'Formulir Izin Keluar Baru'; 
    
    if (!isEdit) {
      const sekarang = new Date();
      tanggalIzinField.value = sekarang.toISOString().split('T')[0]; 
      jamKeluarField.value = sekarang.toTimeString().slice(0, 5);   
    }

    modalIzin.classList.add('active'); 
  }

  function closeModal() { modalIzin.classList.remove('active'); }
  btnTambah.addEventListener('click', () => openModal(false)); btnCloseModal.addEventListener('click', closeModal); btnBatal.addEventListener('click', closeModal); modalIzin.addEventListener('click', (e) => { if (e.target === modalIzin) closeModal(); });

  btnSimpan.addEventListener('click', async () => {
    const payload = {
      santri_id: selectSantri.value,
      tanggal_izin: tanggalIzinField.value, 
      jam_keluar: jamKeluarField.value,
      jam_kembali: jamKembaliField.value || null, 
      keperluan: keperluanField.value, 
      status: 'Belum Kembali'
    };
    
    if (!payload.santri_id || !payload.tanggal_izin || !payload.jam_keluar || !payload.keperluan) { 
      showToast('Harap lengkapi semua kolom wajib!', 'error'); 
      return; 
    }

    btnSimpan.disabled = true; btnSimpan.textContent = 'Menyimpan...';
    try {
      const editId = editIzinIdField.value; let error;
      if (editId) { const res = await db.from('izin_keluar').update(payload).eq('id', editId); error = res.error; } 
      else { const res = await db.from('izin_keluar').insert([payload]); error = res.error; }
      if (error) throw error;
      
      showToast(editId ? 'Data izin berhasil diperbarui!' : 'Izin keluar berhasil ditambahkan!'); 
      closeModal(); 
      loadIzinKeluar();
    } catch (err) { 
      showToast('Gagal menyimpan data: ' + err.message, 'error'); 
    } finally { 
      btnSimpan.disabled = false; 
      btnSimpan.textContent = 'Simpan Izin'; 
    }
  });

  window.tandaiKembaliKeluar = async function (id) {
    const isConfirmed = await customConfirm('Konfirmasi Kembali', 'Santri ini sudah kembali ke pondok sekarang?');
    if (!isConfirmed) return;
    
    const jamSekarang = new Date().toTimeString().slice(0, 5);
    
    try { 
      const { error } = await db.from('izin_keluar')
        .update({ 
          status: 'Sudah Kembali', 
          jam_kembali: jamSekarang   
        })
        .eq('id', id); 
        
      if (error) throw error; 
      showToast('Status berhasil diperbarui, santri sudah kembali.');
      loadIzinKeluar(); 
    } catch (err) { 
      showToast('Gagal update status: ' + err.message, 'error'); 
    }
  };

  window.hapusIzinKeluar = async function (id) {
    const isConfirmed = await customConfirm('Hapus Data Izin?', 'Data yang dihapus tidak dapat dikembalikan. Lanjutkan?');
    if (!isConfirmed) return;
    
    try { 
      const { error } = await db.from('izin_keluar').delete().eq('id', id); 
      if (error) throw error; 
      showToast('Data izin berhasil dihapus.');
      loadIzinKeluar(); 
    } catch (err) { 
      showToast('Gagal menghapus data.', 'error'); 
    }
  };

  // ==========================================
  // PENYESUAIAN UI & ROLE
  // ==========================================
  const user = window.pengurusAktif;
  document.getElementById('userName').textContent = user.nama_lengkap; 
  document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  document.getElementById('userRole').textContent = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan';
  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') { document.getElementById('menu-administrasi').style.display = 'none'; document.getElementById('menu-pelanggaran').style.display = 'none'; }
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });

  loadSantriDropdown();
  loadIzinKeluar();
})();