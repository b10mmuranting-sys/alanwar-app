// ============================================================
// santri.js — Logika CRUD Data Santri (UPGRADED KK & Auto ID)
// ============================================================

(function () {
  'use strict';

  if (!window.pengurusAktif) return;
  const role = window.pengurusAktif.role;
  if (role !== 'administrator' && role !== 'operator') {
    alert('Akses ditolak!'); window.location.href = '../index.html'; return;
  }

  const tbody          = document.getElementById('dataSantriBody');
  const searchInput    = document.getElementById('searchInput');
  const filterAngkatan= document.getElementById('filterAngkatan');
  const modalSantri    = document.getElementById('modalSantri');
  const formSantri     = document.getElementById('formSantri');
  const modalTitle     = document.getElementById('modalTitle');
  const btnTambah      = document.getElementById('btnTambahSantri');
  const btnCloseModal  = document.getElementById('btnCloseModal');
  const btnBatal       = document.getElementById('btnBatal');
  const btnSimpan      = document.getElementById('btnSimpan');
  const btnExport      = document.getElementById('btnExportExcel');

  const editIdField      = document.getElementById('editId');
  const idMuridField     = document.getElementById('idMurid');
  const nikField         = document.getElementById('nikSantri');
  const namaField        = document.getElementById('namaLengkap');
  const tempatLahirField = document.getElementById('tempatLahir');
  const tanggalLahirField= document.getElementById('tanggalLahir');
  const genderField      = document.getElementById('jenisKelamin');
  const agamaField       = document.getElementById('agama');
  const anakKeField      = document.getElementById('anakKe');
  const jumlahSaudaraField = document.getElementById('jumlahSaudara');
  const alamatField      = document.getElementById('alamat');
  const rtRwField        = document.getElementById('rtRw');
  const desaField        = document.getElementById('desaKelurahan');
  const kecamatanField   = document.getElementById('kecamatan');
  const kabupatenField   = document.getElementById('kabupatenKota');
  const provinsiField    = document.getElementById('provinsi');
  const jenjangField     = document.getElementById('jenjang');
  const asalSekolahField = document.getElementById('asalSekolah');
  const tahunAngkatanField = document.getElementById('tahunAngkatan');
  const kelasFormalField = document.getElementById('kelasFormal');
  const kelasDiniyahField= document.getElementById('kelasDiniyah');
  const kamarField       = document.getElementById('kamarSantri');
  const statusField      = document.getElementById('statusSantri');
  const namaAyahField    = document.getElementById('namaAyah');
  const pekerjaanAyahField = document.getElementById('pekerjaanAyah');
  const namaIbuField     = document.getElementById('namaIbu');
  const pekerjaanIbuField = document.getElementById('pekerjaanIbu');
  const namaWaliField    = document.getElementById('namaWali');
  const noHpWaliField    = document.getElementById('noHpWali');

  let dataSantriCache = [];

  // FUNGSI CUSTOM CONFIRM & TOAST
  function customConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div'); overlay.className = 'confirm-overlay';
      overlay.innerHTML = `<div class="confirm-box"><div class="confirm-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/></svg></div><h3 class="confirm-title">${title}</h3><p class="confirm-msg">${message}</p><div class="confirm-actions"><button class="btn btn-outline btn-sm" id="cBtnBatal">Batal</button><button class="btn btn-danger btn-sm" id="cBtnYa">Ya, Lanjutkan</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#cBtnBatal').onclick = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('#cBtnYa').onclick = () => { overlay.remove(); resolve(true); };
      overlay.addEventListener('click', (e) => { if(e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  }

  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-exit'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
  }

  // ==========================================
  // LOGIC AUTO GENERATE ID MURID
  // ==========================================
  async function generateIdMurid(tahun) {
    if (!tahun) { idMuridField.value = ''; return; }
    try {
      const prefix = tahun.toString();
      const { data, error } = await db.from('santri')
        .select('id_murid')
        .like('id_murid', `${prefix}%`)
        .order('id_murid', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastIdStr = data[0].id_murid;
        const lastNumStr = lastIdStr.substring(prefix.length);
        const nextNum = parseInt(lastNumStr) + 1;
        idMuridField.value = prefix + nextNum.toString().padStart(3, '0');
      } else {
        idMuridField.value = prefix + "001";
      }
    } catch (err) {
      console.error('Gagal generate ID:', err.message);
      showToast('Gagal generate ID otomatis', 'error');
    }
  }

  // Panggil saat tahun angkatan berubah (hanya saat tambah baru)
  tahunAngkatanField.addEventListener('change', () => {
    if (!editIdField.value) { generateIdMurid(tahunAngkatanField.value); }
  });

  // ==========================================
  // LOGIC LOAD DATA
  // ==========================================
  async function loadSantri() {
    try {
      const { data, error } = await db.from('santri').select('*')
        .eq('status', 'Aktif')
        .order('jenis_kelamin', { ascending: true }) 
        .order('nama_lengkap', { ascending: true });  
        
      if (error) throw error;
      dataSantriCache = data || [];
      await populateFilterAngkatan(); 
      await populateKelasDropdowns();  
      await populateKamarDropdown();   
      applyFilters();           
    } catch (err) {
      console.error('Gagal memuat data:', err.message);
      tbody.innerHTML = `<tr><td colspan="10" class="table-empty text-danger">Gagal memuat data dari server.</td></tr>`;
    }
  }

  async function populateFilterAngkatan() {
    try {
      const { data, error } = await db.from('tahun_angkatan').select('*').order('tahun', { ascending: true });
      if (error) throw error; const currentFilterVal = filterAngkatan.value;
      filterAngkatan.innerHTML = '<option value="">Semua Angkatan</option>'; tahunAngkatanField.innerHTML = '<option value="">-- Pilih Angkatan --</option>';
      if (data) { data.forEach(y => { const o1 = document.createElement('option'); o1.value = y.tahun; o1.textContent = `Angkatan ${y.tahun}`; filterAngkatan.appendChild(o1); const o2 = document.createElement('option'); o2.value = y.tahun; o2.textContent = y.tahun; if(y.status==='Ditutup'){o2.disabled=true; o2.textContent+=' (Ditutup)';} tahunAngkatanField.appendChild(o2); }); }
      if (currentFilterVal) filterAngkatan.value = currentFilterVal;
    } catch (err) {}
  }

  async function populateKelasDropdowns() {
    try {
      const { data, error } = await db.from('kelas').select('*').order('nama_kelas', { ascending: true });
      if (error) throw error; kelasFormalField.innerHTML = '<option value="">-- Pilih Kelas Formal --</option>'; kelasDiniyahField.innerHTML = '<option value="">-- Pilih Kelas Diniyah --</option>';
      if (data) { data.forEach(k => { const o = document.createElement('option'); o.value = k.nama_kelas; o.textContent = k.nama_kelas; if(k.tipe==='Formal') kelasFormalField.appendChild(o); else if(k.tipe==='Diniyah') kelasDiniyahField.appendChild(o); }); }
    } catch (err) {}
  }

  async function populateKamarDropdown() {
    try {
      const { data, error } = await db.from('kamar').select('*').order('tipe', { ascending: true });
      if (error) throw error; kamarField.innerHTML = '<option value="">-- Belum Ada Kamar --</option>';
      if (data) { data.forEach(k => { const o = document.createElement('option'); o.value = k.nama_kamar; o.textContent = `${k.nama_kamar} (${k.tipe})`; kamarField.appendChild(o); }); }
    } catch (err) {}
  }

  function renderTable(data) {
    if (data.length === 0) { tbody.innerHTML = `<tr><td colspan="10" class="table-empty">Tidak ada data santri ditemukan.</td></tr>`; return; }
    tbody.innerHTML = data.map((s, i) => `
      <tr>
        <td>${i + 1}</td><td><strong>${s.id_murid}</strong></td><td>${s.nama_lengkap}</td>
        <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.alamat || '-'}">${s.alamat || '-'}</td>
        <td>${s.nama_ayah || '-'} / ${s.nama_ibu || '-'}</td><td><span class="badge badge-info">${s.tahun_angkatan || '-'}</span></td>
        <td>${s.kelas_formal || '-'}</td><td>${s.kelas_diniyah || '-'}</td><td>${s.kamar || '-'}</td>
        <td><div class="action-buttons">
          <button class="btn-action btn-edit" onclick="window.editSantri('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-action btn-delete" onclick="window.hapusSantri('${s.id}', '${s.nama_lengkap}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div></td>
      </tr>`).join('');
  }

  function applyFilters() { const k = searchInput.value.toLowerCase(); const a = filterAngkatan.value; renderTable(dataSantriCache.filter(s => (s.nama_lengkap.toLowerCase().includes(k) || s.id_murid.toLowerCase().includes(k)) && (a ? String(s.tahun_angkatan) === a : true))); }
  searchInput.addEventListener('keyup', applyFilters); filterAngkatan.addEventListener('change', applyFilters);

  function openModal(isEdit = false) { 
    formSantri.reset(); 
    editIdField.value = ''; 
    modalTitle.textContent = isEdit ? 'Edit Data Santri' : 'Formulir Santri Baru'; 
    if (!isEdit) { idMuridField.value = ''; }
    modalSantri.classList.add('active'); 
  }

  function closeModal() { modalSantri.classList.remove('active'); }
  btnTambah.addEventListener('click', () => openModal(false)); btnCloseModal.addEventListener('click', closeModal); btnBatal.addEventListener('click', closeModal); modalSantri.addEventListener('click', (e) => { if (e.target === modalSantri) closeModal(); });

  btnSimpan.addEventListener('click', async () => {
    const payload = {
      id_murid: idMuridField.value.trim(), 
      nik: nikField.value.trim() || null,
      nama_lengkap: namaField.value.trim().toUpperCase(), 
      tempat_lahir: tempatLahirField.value.trim().toUpperCase(), 
      tanggal_lahir: tanggalLahirField.value || null,
      jenis_kelamin: genderField.value, 
      agama: agamaField.value,
      anak_ke: anakKeField.value ? parseInt(anakKeField.value) : null,
      jumlah_saudara: jumlahSaudaraField.value ? parseInt(jumlahSaudaraField.value) : null,
      alamat: alamatField.value.trim().toUpperCase(), 
      rt_rw: rtRwField.value.trim() || null,
      desa_kelurahan: desaField.value.trim().toUpperCase() || null,
      kecamatan: kecamatanField.value.trim().toUpperCase() || null,
      kabupaten_kota: kabupatenField.value.trim().toUpperCase() || null,
      provinsi: provinsiField.value.trim().toUpperCase() || null,
      jenjang: jenjangField.value, 
      asal_sekolah: asalSekolahField.value.trim().toUpperCase() || null,
      tahun_angkatan: tahunAngkatanField.value ? parseInt(tahunAngkatanField.value) : null,
      kelas_formal: kelasFormalField.value, 
      kelas_diniyah: kelasDiniyahField.value, 
      kamar: kamarField.value || null, 
      status: statusField.value,
      nama_ayah: namaAyahField.value.trim().toUpperCase() || null,
      pekerjaan_ayah: pekerjaanAyahField.value.trim().toUpperCase() || null,
      nama_ibu: namaIbuField.value.trim().toUpperCase() || null,
      pekerjaan_ibu: pekerjaanIbuField.value.trim().toUpperCase() || null,
      nama_wali: namaWaliField.value.trim().toUpperCase() || null,
      no_hp_wali: noHpWaliField.value.trim() || null, 
    };
    
    // VALIDASI WAJIB DEBUG SPESIFIK
    let missingFields = [];
    if (!payload.id_murid) missingFields.push("ID Murid (Pilih Tahun Angkatan dulu!)");
    if (!payload.nama_lengkap) missingFields.push("Nama Lengkap");
    if (!payload.jenis_kelamin) missingFields.push("Jenis Kelamin");
    if (!payload.jenjang) missingFields.push("Jenjang");
    if (!payload.tahun_angkatan) missingFields.push("Tahun Angkatan");
    if (!payload.nama_ayah) missingFields.push("Nama Ayah");
    if (!payload.nama_ibu) missingFields.push("Nama Ibu");
    if (!payload.no_hp_wali) missingFields.push("No HP Wali/Ortu");

    if (missingFields.length > 0) { 
      showToast('Wajib diisi: ' + missingFields.join(', '), 'error'); 
      return; 
    }

    btnSimpan.disabled = true; btnSimpan.textContent = 'Menyimpan...';
    try {
      const editId = editIdField.value; let error;
      if (editId) { const res = await db.from('santri').update(payload).eq('id', editId); error = res.error; } else { const res = await db.from('santri').insert([payload]); error = res.error; }
      if (error) { if (error.code === '23505') throw new Error('ID Murid sudah digunakan!'); throw error; }
      showToast(editId ? 'Data santri berhasil diperbarui!' : 'Santri baru berhasil ditambahkan!'); closeModal(); loadSantri();
    } catch (err) { showToast(err.message || 'Gagal menyimpan data.', 'error'); } finally { btnSimpan.disabled = false; btnSimpan.textContent = 'Simpan Data'; }
  });

  window.editSantri = async function (id) {
    try {
      const { data, error } = await db.from('santri').select('*').eq('id', id).single(); if (error) throw error; openModal(true);
      editIdField.value = data.id; 
      idMuridField.value = data.id_murid; 
      nikField.value = data.nik || '';
      namaField.value = data.nama_lengkap; 
      tempatLahirField.value = data.tempat_lahir || '';
      tanggalLahirField.value = data.tanggal_lahir || ''; 
      genderField.value = data.jenis_kelamin; 
      agamaField.value = data.agama || 'Islam';
      anakKeField.value = data.anak_ke || '';
      jumlahSaudaraField.value = data.jumlah_saudara || '';
      alamatField.value = data.alamat || '';
      rtRwField.value = data.rt_rw || '';
      desaField.value = data.desa_kelurahan || '';
      kecamatanField.value = data.kecamatan || '';
      kabupatenField.value = data.kabupaten_kota || '';
      provinsiField.value = data.provinsi || '';
      jenjangField.value = data.jenjang; 
      asalSekolahField.value = data.asal_sekolah || '';
      tahunAngkatanField.value = data.tahun_angkatan || '';
      kelasFormalField.value = data.kelas_formal || ''; 
      kelasDiniyahField.value = data.kelas_diniyah || ''; 
      kamarField.value = data.kamar || ''; 
      statusField.value = data.status;
      namaAyahField.value = data.nama_ayah || '';
      pekerjaanAyahField.value = data.pekerjaan_ayah || '';
      namaIbuField.value = data.nama_ibu || '';
      pekerjaanIbuField.value = data.pekerjaan_ibu || '';
      namaWaliField.value = data.nama_wali || ''; 
      noHpWaliField.value = data.no_hp_wali || '';
    } catch (err) { showToast('Gagal mengambil data untuk diedit.', 'error'); }
  };

  window.hapusSantri = async function (id, nama) {
    const isConfirmed = await customConfirm('Hapus Data Santri?', `Apakah Anda yakin ingin menghapus data <strong>${nama}</strong>?`);
    if (!isConfirmed) return;
    try { const { error } = await db.from('santri').delete().eq('id', id); if (error) throw error; showToast('Data santri berhasil dihapus.'); loadSantri(); } catch (err) { showToast('Gagal menghapus data.', 'error'); }
  };

  btnExport.addEventListener('click', () => {
    const dataToExport = dataSantriCache.map((s, i) => ({ 
      No: i + 1, 'ID Murid': s.id_murid, 'NIK': s.nik, 'Nama Lengkap': s.nama_lengkap, 'Jenis Kelamin': s.jenis_kelamin, 
      'Tempat Lahir': s.tempat_lahir, 'Tanggal Lahir': s.tanggal_lahir, 'Agama': s.agama,
      'Anak Ke': s.anak_ke, 'Jumlah Saudara': s.jumlah_saudara,
      'Alamat': s.alamat, 'RT/RW': s.rt_rw, 'Desa/Kel': s.desa_kelurahan, 'Kecamatan': s.kecamatan, 'Kab/Kota': s.kabupaten_kota, 'Provinsi': s.provinsi,
      'Asal Sekolah': s.asal_sekolah, 'Jenjang': s.jenjang, 'Tahun Angkatan': s.tahun_angkatan, 
      'Kelas Formal': s.kelas_formal, 'Kelas Diniyah': s.kelas_diniyah, 'Kamar': s.kamar, 'Status': s.status,
      'Nama Ayah': s.nama_ayah, 'Pekerjaan Ayah': s.pekerjaan_ayah, 'Nama Ibu': s.nama_ibu, 'Pekerjaan Ibu': s.pekerjaan_ibu,
      'Nama Wali': s.nama_wali, 'No HP Wali': s.no_hp_wali
    }));
    if (window.exportToExcel) { window.exportToExcel(dataToExport, 'Data_Santri_Al_Anwar_KK'); } else { showToast('Modul export belum dimuat.', 'error'); }
  });

  const user = window.pengurusAktif;
  document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  document.getElementById('userRole').textContent = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan';
  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') { document.getElementById('menu-administrasi').style.display = 'none'; document.getElementById('menu-pelanggaran').style.display = 'none'; }
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });
  
  loadSantri();
})();