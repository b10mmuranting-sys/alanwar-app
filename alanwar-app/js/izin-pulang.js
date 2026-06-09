// ============================================================
// izin-pulang.js — Logika CRUD Izin Pulang (Custom UI)
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

  const tbody             = document.getElementById('dataIzinBody');
  const searchInput       = document.getElementById('searchInput');
  const filterStatus      = document.getElementById('filterStatus');
  const modalIzin         = document.getElementById('modalIzin');
  const formIzin          = document.getElementById('formIzin');
  const modalIzinTitle    = document.getElementById('modalIzinTitle');
  const btnTambah         = document.getElementById('btnTambahIzin');
  const btnCloseModal     = document.getElementById('btnCloseIzin');
  const btnBatal          = document.getElementById('btnBatalIzin');
  const btnSimpan         = document.getElementById('btnSimpanIzin');
  const editIzinIdField   = document.getElementById('editIzinId');
  const selectSantri      = document.getElementById('selectSantriIzin');
  const tanggalBerangkatField = document.getElementById('tanggalBerangkat');
  const jenisIzinField    = document.getElementById('jenisIzin');
  const estimasiHariField = document.getElementById('estimasiHari');
  const groupEstimasi     = document.getElementById('groupEstimasiHari');
  const tanggalKembaliField = document.getElementById('tanggalKembali');
  const keperluanField    = document.getElementById('keperluanIzin');

  let dataIzinCache = [];

  // ==========================================
  // FUNGSI UI KUSTOM (TOAST & CONFIRM)
  // ==========================================
  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-exit'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
  }

  function customConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div'); overlay.className = 'confirm-overlay';
      overlay.innerHTML = `<div class="confirm-box"><div class="confirm-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/></svg></div><h3 class="confirm-title">${title}</h3><p class="confirm-msg">${message}</p><div class="confirm-actions"><button class="btn btn-outline btn-sm" id="cBtnBatal">Batal</button><button class="btn btn-primary btn-sm" id="cBtnYa">Ya, Lanjutkan</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#cBtnBatal').onclick = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('#cBtnYa').onclick = () => { overlay.remove(); resolve(true); };
      overlay.addEventListener('click', (e) => { if(e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  }

  // ==========================================
  // LOGICA KALKULASI OTOMATIS
  // ==========================================
  function hitungTanggalKembali() {
    const jenis = jenisIzinField.value;
    
    if (jenis === 'Sakit') {
      estimasiHariField.value = '';
      estimasiHariField.disabled = true;
      tanggalKembaliField.value = ''; // Kosongkan karena belum tentu kapan sembuh
    } else {
      estimasiHariField.disabled = false;
      const tglBerangkat = tanggalBerangkatField.value;
      const hari = parseInt(estimasiHariField.value) || 0;
      
      if (tglBerangkat && hari > 0) {
        const date = new Date(tglBerangkat);
        date.setDate(date.getDate() + hari); // Tambah estimasi hari
        tanggalKembaliField.value = date.toISOString().split('T')[0]; // Auto isi tanggal kembali
      } else {
        tanggalKembaliField.value = '';
      }
    }
  }

  // Event listener untuk auto kalkulasi
  tanggalBerangkatField.addEventListener('change', hitungTanggalKembali);
  estimasiHariField.addEventListener('input', hitungTanggalKembali);
  jenisIzinField.addEventListener('change', hitungTanggalKembali);

  // ==========================================
  // LOGICA CRUD
  // ==========================================
  async function loadSantriDropdown() {
    try {
      const { data, error } = await db.from('santri').select('id, id_murid, nama_lengkap')
        .eq('status', 'Aktif').order('nama_lengkap', { ascending: true });
      if (error) throw error;
      selectSantri.innerHTML = '<option value="">-- Pilih Santri --</option>';
      if (data) { data.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.id_murid} - ${s.nama_lengkap}`; selectSantri.appendChild(o); }); }
    } catch (err) { showToast('Gagal memuat data santri', 'error'); }
  }

  async function loadIzinPulang() {
    try {
      const { data, error } = await db.from('izin_pulang').select(`*, santri(nama_lengkap, id_murid)`)
        .order('tanggal_berangkat', { ascending: false }); 
      if (error) throw error;
      dataIzinCache = data || [];
      applyFilters();
    } catch (err) {
      console.error('Gagal memuat data:', err.message);
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty text-danger">Gagal memuat data dari server.<br><small>${err.message}</small></td></tr>`;
      showToast('Gagal memuat riwayat izin pulang', 'error');
    }
  }

  function renderTable(data) {
    if (data.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Tidak ada data izin pulang.</td></tr>`; return; }
    tbody.innerHTML = data.map((item, i) => {
      const tglBerangkat = new Date(item.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const tglKembali = item.tanggal_kembali ? new Date(item.tanggal_kembali).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum Ditentukan';
      
      // PERBAIKAN STATUS: Menggunakan istilah Berangkat & Sudah Kembali
      const badgeClass = item.status === 'Sudah Kembali' ? 'badge-success' : 'badge-warning';
      const statusText = item.status === 'Sudah Kembali' ? 'Sudah Kembali' : 'Berangkat';
      
      const idMurid = item.santri ? item.santri.id_murid : '-';
      const namaSantri = item.santri ? item.santri.nama_lengkap : '-';

      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${idMurid}</strong><br><small>${namaSantri}</small></td>
          <td>${tglBerangkat}</td>
          <td>${tglKembali}</td>
          <td>${item.keperluan}</td>
          <td><span class="badge ${badgeClass}">${statusText}</span></td>
          <td><div class="action-buttons">
            ${item.status === 'Berangkat' ? `<button class="btn-action btn-edit" onclick="window.tandaiKembaliPulang('${item.id}')" title="Tandai Sudah Kembali"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
            <button class="btn-action btn-delete" onclick="window.hapusIzinPulang('${item.id}')" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div></td>
        </tr>`;
    }).join('');
  }

  function applyFilters() {
    const s = filterStatus.value; const k = searchInput.value.toLowerCase();
    renderTable(dataIzinCache.filter(item => 
      (s ? item.status === s : true) && 
      ((item.santri?.id_murid || '').toLowerCase().includes(k) || (item.santri?.nama_lengkap || '').toLowerCase().includes(k))
    ));
  }
  searchInput.addEventListener('keyup', applyFilters); filterStatus.addEventListener('change', applyFilters);

  function openModal(isEdit = false) { 
    formIzin.reset(); 
    editIzinIdField.value = ''; 
    modalIzinTitle.textContent = isEdit ? 'Edit Izin Pulang' : 'Formulir Izin Pulang Baru'; 
    estimasiHariField.disabled = false; 
    
    if (!isEdit) {
      const sekarang = new Date();
      tanggalBerangkatField.value = sekarang.toISOString().split('T')[0]; 
      hitungTanggalKembali(); 
    }
    
    modalIzin.classList.add('active'); 
  }

  function closeModal() { modalIzin.classList.remove('active'); }
  btnTambah.addEventListener('click', () => openModal(false)); btnCloseModal.addEventListener('click', closeModal); btnBatal.addEventListener('click', closeModal); modalIzin.addEventListener('click', (e) => { if (e.target === modalIzin) closeModal(); });

  btnSimpan.addEventListener('click', async () => {
    const tanggal_berangkat = tanggalBerangkatField.value;
    const tanggal_kembali = tanggalKembaliField.value || null;
    const keperluan = `[${jenisIzinField.value}] ${keperluanField.value}`;

    const payload = {
      santri_id: selectSantri.value,
      tanggal_berangkat: tanggal_berangkat,
      tanggal_kembali: tanggal_kembali,
      keperluan: keperluan,
      status: 'Berangkat' // PERBAIKAN: Gunakan 'Berangkat' sesuai database
    };

    if (!payload.santri_id || !payload.tanggal_berangkat || !keperluanField.value) { 
      showToast('Harap lengkapi semua kolom wajib!', 'error'); 
      return; 
    }

    btnSimpan.disabled = true; btnSimpan.textContent = 'Menyimpan...';
    try {
      const editId = editIzinIdField.value; let error;
      if (editId) { const res = await db.from('izin_pulang').update(payload).eq('id', editId); error = res.error; } 
      else { const res = await db.from('izin_pulang').insert([payload]); error = res.error; }
      if (error) throw error;
      
      showToast(editId ? 'Data izin berhasil diperbarui!' : 'Izin pulang berhasil ditambahkan!'); 
      closeModal(); loadIzinPulang();
    } catch (err) { 
      showToast('Gagal menyimpan data: ' + err.message, 'error'); 
    } finally { 
      btnSimpan.disabled = false; btnSimpan.textContent = 'Simpan Izin'; 
    }
  });

  window.tandaiKembaliPulang = async function (id) {
    const isConfirmed = await customConfirm('Konfirmasi Kembali', 'Santri ini sudah kembali ke pondok hari ini?');
    if (!isConfirmed) return;
    
    const tanggalSekarang = new Date().toISOString().split('T')[0]; 
    
    try { 
      const { error } = await db.from('izin_pulang')
        .update({ 
          status: 'Sudah Kembali', // PERBAIKAN: Gunakan 'Sudah Kembali' sesuai database
          tanggal_kembali: tanggalSekarang 
        })
        .eq('id', id); 
        
      if (error) throw error; 
      showToast('Status berhasil diperbarui, santri sudah kembali.');
      loadIzinPulang(); 
    } catch (err) { 
      showToast('Gagal update status: ' + err.message, 'error'); 
    }
  };

  window.hapusIzinPulang = async function (id) {
    const isConfirmed = await customConfirm('Hapus Data Izin?', 'Data yang dihapus tidak dapat dikembalikan. Lanjutkan?');
    if (!isConfirmed) return;
    
    try { 
      const { error } = await db.from('izin_pulang').delete().eq('id', id); 
      if (error) throw error; 
      showToast('Data izin berhasil dihapus.');
      loadIzinPulang(); 
    } catch (err) { 
      showToast('Gagal menghapus data.', 'error'); 
    }
  };

  // ==========================================
  // PENYESUAIAN UI & ROLE
  // ==========================================
  const user = window.pengurusAktif;
  document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  document.getElementById('userRole').textContent = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan';
  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') { document.getElementById('menu-administrasi').style.display = 'none'; document.getElementById('menu-pelanggaran').style.display = 'none'; }
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });

  loadSantriDropdown();
  loadIzinPulang();
})();