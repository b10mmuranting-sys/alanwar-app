// ============================================================
// formulir.js — Logika Formulir Santri (Fix KOP & Petugas)
// ============================================================

(function () {
  'use strict';

  if (!window.pengurusAktif) return;
  const currentUser = window.pengurusAktif;

  // --- Inisialisasi UI Navbar ---
  document.getElementById('userName').textContent = currentUser.nama_lengkap;
  document.getElementById('userAvatar').textContent = currentUser.nama_lengkap.charAt(0).toUpperCase();
  document.getElementById('userRole').textContent = currentUser.role;
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });

  // --- Variabel DOM ---
  const formSantri = document.getElementById('formSantri');
  const idMuridField = document.getElementById('idMurid');
  const tahunAngkatanField = document.getElementById('tahunAngkatan');
  const kelasFormalField = document.getElementById('kelasFormal');
  const kelasDiniyahField = document.getElementById('kelasDiniyah');
  const kamarField = document.getElementById('kamarSantri');

  let allSantri = [];
  let selectedSantri = null;
  let kopData = {};

  // --- Fungsi Toast ---
  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-exit'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
  }

  // ==========================================
  // 1. NAVIGASI TAB
  // ==========================================
  document.querySelectorAll('.form-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.form-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.form-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // ==========================================
  // 2. LOAD DROPDOWN DARI DB UTAMA
  // ==========================================
  async function loadDropdowns() {
    try {
      const { data: angkatan } = await db.from('tahun_angkatan').select('*').order('tahun', { ascending: false });
      tahunAngkatanField.innerHTML = '<option value="">-- Pilih Angkatan --</option>';
      if (angkatan) angkatan.forEach(y => {
        const o = document.createElement('option'); o.value = y.tahun; o.textContent = `Angkatan ${y.tahun}`;
        if(y.status === 'Ditutup') { o.disabled = true; o.textContent += ' (Ditutup)'; }
        tahunAngkatanField.appendChild(o);
      });

      const { data: kelas } = await db.from('kelas').select('*').order('nama_kelas', { ascending: true });
      kelasFormalField.innerHTML = '<option value="">-- Pilih Kelas Formal --</option>';
      kelasDiniyahField.innerHTML = '<option value="">-- Pilih Kelas Diniyah --</option>';
      if (kelas) kelas.forEach(k => {
        const o = document.createElement('option'); o.value = k.nama_kelas; o.textContent = k.nama_kelas;
        if(k.tipe === 'Formal') kelasFormalField.appendChild(o);
        else if(k.tipe === 'Diniyah') kelasDiniyahField.appendChild(o);
      });

      const { data: kamar } = await db.from('kamar').select('*').order('tipe', { ascending: true });
      kamarField.innerHTML = '<option value="">-- Belum Ada Kamar --</option>';
      if (kamar) kamar.forEach(k => {
        const o = document.createElement('option'); o.value = k.nama_kamar; o.textContent = `${k.nama_kamar} (${k.tipe})`;
        kamarField.appendChild(o);
      });
    } catch (err) { console.error('Gagal load dropdown:', err); }
  }

  // ==========================================
  // 3. AUTO GENERATE ID MURID
  // ==========================================
  tahunAngkatanField.addEventListener('change', async () => {
    const tahun = tahunAngkatanField.value;
    if (!tahun) { idMuridField.value = ''; return; }
    try {
      const prefix = tahun.toString();
      const { data, error } = await db.from('santri').select('id_murid').like('id_murid', `${prefix}%`).order('id_murid', { ascending: false }).limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        const lastNumStr = data[0].id_murid.substring(prefix.length);
        idMuridField.value = prefix + (parseInt(lastNumStr) + 1).toString().padStart(3, '0');
      } else { idMuridField.value = prefix + "001"; }
    } catch (err) { showToast('Gagal generate ID otomatis', 'error'); }
  });

  // ==========================================
  // 4. SIMPAN FORMULIR
  // ==========================================
  formSantri.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';

    const payload = {
      id_murid: val('idMurid'), nik: val('nikSantri') || null,
      nama_lengkap: val('namaLengkap').toUpperCase(), tempat_lahir: val('tempatLahir').toUpperCase() || null,
      tanggal_lahir: val('tanggalLahir') || null, jenis_kelamin: val('jenisKelamin'), agama: val('agama'),
      anak_ke: val('anakKe') ? parseInt(val('anakKe')) : null, jumlah_saudara: val('jumlahSaudara') ? parseInt(val('jumlahSaudara')) : null,
      alamat: val('alamat').toUpperCase() || null, rt_rw: val('rtRw') || null,
      desa_kelurahan: val('desaKelurahan').toUpperCase() || null, kecamatan: val('kecamatan').toUpperCase() || null,
      kabupaten_kota: val('kabupatenKota').toUpperCase() || null, provinsi: val('provinsi').toUpperCase() || null,
      no_kk: val('noKk') || null, nama_kepala_keluarga: val('namaKepalaKeluarga').toUpperCase() || null,
      nama_ayah: val('namaAyah').toUpperCase() || null, pekerjaan_ayah: val('pekerjaanAyah').toUpperCase() || null,
      nama_ibu: val('namaIbu').toUpperCase() || null, pekerjaan_ibu: val('pekerjaanIbu').toUpperCase() || null,
      nama_wali: val('namaWali').toUpperCase() || null, no_hp_wali: val('noHpWali') || null,
      jenjang: val('jenjang'), asal_sekolah: val('asalSekolah').toUpperCase() || null,
      tahun_angkatan: val('tahunAngkatan') ? parseInt(val('tahunAngkatan')) : null,
      kelas_formal: val('kelasFormal'), kelas_diniyah: val('kelasDiniyah'), kamar: val('kamarSantri') || null,
      tanggal_masuk: val('tanggalMasuk') || null, status: 'Aktif',
      kelengkapan_berkas: kumpulkanBerkas() || null, petugas_input: currentUser.nama_lengkap
    };

    let missingFields = [];
    if (!payload.id_murid) missingFields.push("ID Murid");
    if (!payload.nama_lengkap) missingFields.push("Nama Lengkap");
    if (!payload.jenis_kelamin) missingFields.push("Jenis Kelamin");
    if (!payload.jenjang) missingFields.push("Jenjang");
    if (!payload.tahun_angkatan) missingFields.push("Tahun Angkatan");
    if (!payload.nama_ayah) missingFields.push("Nama Ayah");
    if (!payload.nama_ibu) missingFields.push("Nama Ibu");
    if (!payload.no_hp_wali) missingFields.push("No HP Wali");

    if (missingFields.length > 0) { showToast('Wajib diisi: ' + missingFields.join(', '), 'error'); return; }

    try {
      const { error } = await db.from('santri').insert([payload]);
      if (error) { if(error.code === '23505') throw new Error('ID Murid sudah digunakan!'); throw error; }
      showToast('Santri baru berhasil ditambahkan ke Master Data!');
      formSantri.reset(); idMuridField.value = ''; await loadAllSantri(); 
    } catch (err) { showToast(err.message || 'Gagal menyimpan data.', 'error'); }
  });

  function kumpulkanBerkas() {
    const berkas = [];
    document.querySelectorAll('.checklist-item input[type="checkbox"]:checked').forEach(cb => berkas.push(cb.value));
    return berkas.join('; ');
  }

  // ==========================================
  // 5. FITUR CETAK DOKUMEN (FIX KOP & PETUGAS)
  // ==========================================
  async function loadAllSantri() {
    try {
      const { data, error } = await db.from('santri').select('*').eq('status', 'Aktif').order('nama_lengkap');
      if (error) throw error; allSantri = data || [];
    } catch (err) { console.error(err); }
  }

  const cetakSearch = document.getElementById('cetakSearch');
  const cetakResults = document.getElementById('cetakResults');
  
  cetakSearch.addEventListener('input', () => {
    const q = cetakSearch.value.toLowerCase();
    if (q.length < 2) { cetakResults.innerHTML = ''; return; }
    const results = allSantri.filter(s => s.nama_lengkap.toLowerCase().includes(q) || (s.id_murid && s.id_murid.toLowerCase().includes(q)));
    if(results.length === 0) { cetakResults.innerHTML = '<p style="padding:1rem;color:var(--text-muted)">Tidak ditemukan</p>'; return; }
    cetakResults.innerHTML = results.map(s => `
      <div class="search-result-item" onclick="window.pilihSantriCetak('${s.id}')" style="cursor:pointer; padding:10px; border:1px solid #ccc; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <div><strong>${s.nama_lengkap}</strong><br><span style="font-size:0.75rem;color:#7A7A7A">${s.id_murid || '-'} | ${s.kelas_formal||'-'}</span></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`).join('');
  });

  window.pilihSantriCetak = function(id) {
    const targetId = parseInt(id);
    selectedSantri = allSantri.find(s => s.id === targetId);
    if (!selectedSantri) { selectedSantri = allSantri.find(s => String(s.id) === String(id)); }
    if (!selectedSantri) { showToast('Gagal menemukan data santri di memori', 'error'); return; }
    document.getElementById('selectedSantriCard').style.display = 'block';
    document.getElementById('selSantriNama').textContent = selectedSantri.nama_lengkap;
    document.getElementById('selSantriReg').textContent = `${selectedSantri.id_murid || '-'} | ${selectedSantri.kelas_formal||'-'}`;
    cetakResults.innerHTML = ''; cetakSearch.value = '';
    document.getElementById('btnCetakFormulir').disabled = false;
    document.getElementById('btnCetakPernyataan').disabled = false;
    document.getElementById('btnCetakMerokok').disabled = false;
    showToast('Santri berhasil dipilih!', 'success');
  };

  document.getElementById('clearSantriBtn').addEventListener('click', () => {
    selectedSantri = null;
    document.getElementById('selectedSantriCard').style.display = 'none';
    document.getElementById('btnCetakFormulir').disabled = true;
    document.getElementById('btnCetakPernyataan').disabled = true;
    document.getElementById('btnCetakMerokok').disabled = true;
  });

  document.getElementById('btnCetakFormulir').addEventListener('click', () => cetakDokumen('formulir'));
  document.getElementById('btnCetakPernyataan').addEventListener('click', () => cetakDokumen('pernyataan'));
  document.getElementById('btnCetakMerokok').addEventListener('click', () => cetakDokumen('merokok'));

  function cetakDokumen(jenis) {
    if (!selectedSantri) { showToast('Pilih santri terlebih dahulu!', 'error'); return; }
    const s = selectedSantri, kop = kopData, petugas = currentUser.nama_lengkap;
    const namaWali = s.nama_wali || s.nama_ayah || '-';
    const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let htmlContent = '';
    if (jenis === 'formulir') htmlContent = generateFormulirHTML(s, kop, petugas, namaWali, tanggal);
    else if (jenis === 'pernyataan') htmlContent = generatePernyataanHTML(s, kop, petugas, namaWali, tanggal);
    else if (jenis === 'merokok') htmlContent = generateMerokokHTML(s, kop, petugas, namaWali, tanggal);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('Pop-up diblokir browser!', 'error'); return; }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 700);
  }

  // KOP FULL KIRI (MENGGUNAKAN MARGIN NEGATIF)
   function generateKopHTML(kop) {
    if (kop.logo_url && kop.logo_url.trim() !== '') {
      return `<div style="margin-left:-1cm; margin-right:-1cm; margin-bottom:12px; text-align:left;"><img src="${kop.logo_url}" alt="Kop" style="width:100%; max-height:100px; object-fit:contain; display:block;"></div>`;
    }
    return `<div style="text-align:left; border-bottom:3px double #000; padding-bottom:8px; margin-bottom:12px"><h1 style="font-size:14pt;margin:4px 0">PONDOK PESANTREN AL ANWAR</h1><p style="font-size:9pt;margin:2px 0">Upload kop di menu Pengaturan</p></div>`;
  }

  // TABEL DATA DIRI SANGAT LENGKAP UNTUK SURAT
  function generateDataDiriTable(s) {
      return `
      <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:11pt;">
        <tr><td style="width:160px; padding:3px 0; vertical-align:top;">ID Murid</td><td style="padding:3px 4px; vertical-align:top;">: <strong>${s.id_murid || '-'}</strong></td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Nama Lengkap</td><td style="padding:3px 4px; vertical-align:top;">: <strong>${s.nama_lengkap}</strong></td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">NIK</td><td style="padding:3px 4px; vertical-align:top;">: ${s.nik || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Tempat, Tgl Lahir</td><td style="padding:3px 4px; vertical-align:top;">: ${s.tempat_lahir || '-'}, ${s.tanggal_lahir || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Jenis Kelamin</td><td style="padding:3px 4px; vertical-align:top;">: ${s.jenis_kelamin || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Alamat Lengkap</td><td style="padding:3px 4px; vertical-align:top;">: ${s.alamat || '-'} ${s.rt_rw ? 'RT/RW '+s.rt_rw : ''}, Desa/Kel. ${s.desa_kelurahan || '-'}, Kec. ${s.kecamatan || '-'}, ${s.kabupaten_kota || '-'}, Prov. ${s.provinsi || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">No. KK</td><td style="padding:3px 4px; vertical-align:top;">: ${s.no_kk || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Nama Ayah / Pekerjaan</td><td style="padding:3px 4px; vertical-align:top;">: ${s.nama_ayah || '-'} / ${s.pekerjaan_ayah || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Nama Ibu / Pekerjaan</td><td style="padding:3px 4px; vertical-align:top;">: ${s.nama_ibu || '-'} / ${s.pekerjaan_ibu || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Nama Wali</td><td style="padding:3px 4px; vertical-align:top;">: ${s.nama_wali || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">No. HP Wali/Ortu</td><td style="padding:3px 4px; vertical-align:top;">: ${s.no_hp_wali || '-'}</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Jenjang / Kelas</td><td style="padding:3px 4px; vertical-align:top;">: ${s.jenjang || '-'} / ${s.kelas_formal || '-'} (Diniyah: ${s.kelas_diniyah || '-'})</td></tr>
        <tr><td style="padding:3px 0; vertical-align:top;">Kamar</td><td style="padding:3px 4px; vertical-align:top;">: ${s.kamar || '-'}</td></tr>
      </table>`;
  }

  function generateFormulirHTML(s, kop, petugas, namaWali, tanggal) {
    const berkasList = s.kelengkapan_berkas
      ? s.kelengkapan_berkas.split('; ').map(b => `<tr><td style="padding:2px 8px"><input type="checkbox" checked disabled></td><td style="padding:2px 8px">${b}</td></tr>`).join('')
      : '<tr><td colspan="2" style="padding:2px 8px;color:#999">Tidak ada berkas dicatat</td></tr>';
      
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Formulir - ${s.nama_lengkap}</title><style>@page { size: 210mm 330mm; margin: 1cm; } body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; } .judul { text-align: center; font-size: 13pt; font-weight: bold; margin: 12px 0; text-decoration: underline } table.f4 { width: 100%; border-collapse: collapse; margin-bottom: 12px } table.f4 td, table.f4 th { padding: 4px 8px; border: 1px solid #000; vertical-align: top } table.f4 th { background: #f0f0f0; font-weight: bold; width: 180px } .ttd-wrapper { display: flex; justify-content: space-between; margin-top: 24px } .ttd-box { text-align: center; width: 45% } .ttd-box .nama { font-weight: bold; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding-bottom: 2px; margin-top: 55px }</style></head><body>${generateKopHTML(kop)}<div class="judul">FORMULIR PENDAFTARAN SANTRI BARU</div>
      
      <table class="f4">
        <tr><th>ID Murid</th><td><strong>${s.id_murid || '-'}</strong></td><th>NIK</th><td>${s.nik || '-'}</td></tr>
        <tr><th>Nama Lengkap</th><td colspan="3">${s.nama_lengkap}</td></tr>
        <tr><th>Tempat Lahir</th><td>${s.tempat_lahir || '-'}</td><th>Tanggal Lahir</th><td>${s.tanggal_lahir || '-'}</td></tr>
        <tr><th>Jenis Kelamin</th><td>${s.jenis_kelamin || '-'}</td><th>Agama</th><td>${s.agama || 'Islam'}</td></tr>
        <tr><th>Anak Ke</th><td>${s.anak_ke || '-'}</td><th>Jumlah Saudara</th><td>${s.jumlah_saudara || '-'}</td></tr>
        <tr><th>Alamat</th><td colspan="3">${s.alamat || '-'}</td></tr>
        <tr><th>RT / RW</th><td>${s.rt_rw || '-'}</td><th>Desa/Kelurahan</th><td>${s.desa_kelurahan || '-'}</td></tr>
        <tr><th>Kecamatan</th><td>${s.kecamatan || '-'}</td><th>Kabupaten/Kota</th><td>${s.kabupaten_kota || '-'}</td></tr>
        <tr><th>Provinsi</th><td colspan="3">${s.provinsi || '-'}</td></tr>
        <tr><th>No. KK</th><td colspan="3">${s.no_kk || '-'}</td></tr>
        <tr><th>Nama Kepala Keluarga</th><td colspan="3">${s.nama_kepala_keluarga || '-'}</td></tr>
        <tr><th>Nama Ayah</th><td>${s.nama_ayah || '-'}</td><th>Pekerjaan Ayah</th><td>${s.pekerjaan_ayah || '-'}</td></tr>
        <tr><th>Nama Ibu</th><td>${s.nama_ibu || '-'}</td><th>Pekerjaan Ibu</th><td>${s.pekerjaan_ibu || '-'}</td></tr>
        <tr><th>Nama Wali</th><td>${s.nama_wali || '-'}</td><th>No. HP Wali/Ortu</th><td>${s.no_hp_wali || '-'}</td></tr>
        <tr><th>Jenjang / Asal Sekolah</th><td>${s.jenjang || '-'} / ${s.asal_sekolah || '-'}</td><th>Angkatan</th><td>${s.tahun_angkatan || '-'}</td></tr>
        <tr><th>Kelas Formal / Diniyah</th><td>${s.kelas_formal || '-'} / ${s.kelas_diniyah || '-'}</td><th>Kamar</th><td>${s.kamar || '-'}</td></tr>
        <tr><th>Tanggal Masuk</th><td colspan="3">${s.tanggal_masuk || '-'}</td></tr>
        <tr><th>Petugas Input</th><td colspan="3">${petugas}</td></tr>
      </table>

      <div style="font-weight:bold;margin-bottom:4px">Kelengkapan Berkas:</div>
      <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:20px">${berkasList}</table>
      
      <div class="ttd-wrapper"><div class="ttd-box"><div>Wali / Orang Tua</div><div class="nama">${namaWali}</div></div><div class="ttd-box"><div>Petugas Pesantren</div><div class="nama">${petugas}</div></div></div></body></html>`;
  }

  function generatePernyataanHTML(s, kop, petugas, namaWali, tanggal) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Surat Pernyataan - ${s.nama_lengkap}</title><style>@page { size: 210mm 330mm; margin: 1cm; } body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; text-align: justify } .judul { text-align: center; font-size: 13pt; font-weight: bold; margin: 20px 0 4px } .sub-judul { text-align: center; font-size: 10pt; margin-bottom: 16px } .ttd-wrapper { display: flex; justify-content: space-between; margin-top: 40px } .ttd-box { text-align: center; width: 45% } .ttd-box .nama { font-weight: bold; border-bottom: 1px solid #000; display: inline-block; min-width: 180px; padding-bottom: 2px; margin-top: 55px }</style></head><body>${generateKopHTML(kop)}<div class="judul">SURAT PERNYATAAN</div><div class="sub-judul">KESANGGUPAN MENGIKUTI TATA TERTIB DAN PERATURAN PESANTREN</div><div style="text-align:right;margin-bottom:12px">Karangsembung, ${tanggal}</div><div style="margin-bottom:16px">Yang bertanda tangan di bawah ini:</div>${generateDataDiriTable(s)}<p style="margin-top:15px;">Dengan ini menyatakan dengan sesungguhnya bahwa saya selaku wali dari santri tersebut di atas, dengan penuh kesadaran dan tanpa paksaan dari pihak manapun, menyatakan:</p><ol style="margin-left:40px; margin-bottom:15px;"><li>Bersedia menyerahkan pendidikan, pembinaan, serta pengawasan santri sepenuhnya kepada Pimpinan Pondok Pesantren Al Anwar selama santri terdaftar sebagai santri aktif.</li><li>Menjamin bahwa santri akan mentaati segala peraturan, tata tertib, ketentuan, dan disiplin yang berlaku di lingkungan Pondok Pesantren Al Anwar, baik di dalam maupun di luar lingkungan pesantren.</li><li>Bersedia memantau perkembangan belajar dan perilaku santri secara berkala, serta berkoordinasi aktif dengan pihak asatidz dan pengurus pesantren.</li><li>Bertanggung jawab penuh atas pembiayaan pendidikan, asrama, konsumsi, dan seluruh kebutuhan santri selama berada di pesantren secara tepat waktu sesuai ketentuan yang berlaku.</li><li>Menerima sepenuhnya segala bentuk sanksi pendidikan, pembinaan, maupun tindakan disipliner yang diberikan oleh pesantren apabila santri terbukti melanggar peraturan, termasuk kemungkinan santri dikembalikan kepada orang tua/wali (dikeluarkan) jika pelanggaran yang dilakukan mengganggu ketertiban umum pesantren.</li></ol><p>Demikian surat pernyataan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.</p><div class="ttd-wrapper"><div class="ttd-box"><div>Wali / Orang Tua</div><div class="nama">${namaWali}</div></div><div class="ttd-box"><div>Petugas Pesantren</div><div class="nama">${petugas}</div></div></div></body></html>`;
  }

  function generateMerokokHTML(s, kop, petugas, namaWali, tanggal) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Surat Tidak Merokok - ${s.nama_lengkap}</title><style>@page { size: 210mm 330mm; margin: 1cm; } body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; text-align: justify } .judul { text-align: center; font-size: 13pt; font-weight: bold; margin: 20px 0 4px } .sub-judul { text-align: center; font-size: 10pt; margin-bottom: 16px } .ttd-wrapper { display: flex; justify-content: space-between; margin-top: 40px } .ttd-box { text-align: center; width: 30% } .ttd-box .nama { font-weight: bold; border-bottom: 1px solid #000; display: inline-block; min-width: 150px; padding-bottom: 2px; margin-top: 55px } .warning { text-align: center; font-weight: bold; font-size: 11pt; margin: 15px 0; padding: 10px; border: 2px solid #000; background-color: #f9f9f9 }</style></head><body>${generateKopHTML(kop)}<div class="judul">SURAT PERNYATAAN TIDAK MEROKOK</div><div class="sub-judul">BAGI SANTRI PONDOK PESANTREN AL ANWAR</div><div style="text-align:right;margin-bottom:12px">Karangsembung, ${tanggal}</div><div style="margin-bottom:16px">Yang bertanda tangan di bawah ini:</div>${generateDataDiriTable(s)}<p style="margin-top:15px;">Dengan ini menyatakan dengan sesungguhnya bahwa kami, baik santri maupun wali, dengan penuh kesadaran dan tanggung jawab, berjanji dan menyatakan:</p><ol style="margin-left:40px; margin-bottom:15px;"><li>Saya selaku santri berjanji tidak akan merokok, menghisap rokok (baik rokok konvensional maupun rokok elektrik/vape), mengedarkan, membeli, menyimpan, maupun berada dalam lingkungan aktivitas merokok di seluruh area Pondok Pesantren Al Anwar.</li><li>Menjauhi segala bentuk aktivitas yang berkaitan dengan rokok, narkoba, dan zat-zat adiktif lainnya yang membahayakan kesehatan serta bertentangan dengan nilai-nilai Islam, Syariat, dan koridor keilmuan pesantren.</li><li>Menyadari sepenuhnya bahwa kegiatan merokok adalah perbuatan yang diharamkan dan dilarang keras oleh pesantren karena merusak kesehatan fisik dan mental, membuang harta pada hal yang tidak bermanfaat, serta mencemarkan kehormatan diri sendiri dan nama baik institusi pesantren.</li><li>Apabila di kemudian hari terbukti saya melanggar pernyataan ini, saya bersedia menerima sanksi tegas dari pesantren, mulai dari skorsing, denda, hingga pengembalian (dikeluarkannya) saya dari Pondok Pesantren Al Anwar tanpa hak komplain dan syarat apapun.</li></ol><div class="warning">MELANGGAR PERJANJIAN INI BERARTI MENGKHIANATI AMANAH PESANTREN DAN BERSEDIA MENERIMA SANKSI TEGAS SESUAI PERATURAN YANG BERLAKU</div><div class="ttd-wrapper"><div class="ttd-box"><div>Santri</div><div class="nama">${s.nama_lengkap}</div></div><div class="ttd-box"><div>Wali / Orang Tua</div><div class="nama">${namaWali}</div></div><div class="ttd-box"><div>Petugas</div><div class="nama">${petugas}</div></div></div></body></html>`;
  }

  // ==========================================
  // 6. FITUR PENGATURAN KOP
  // ==========================================
  async function loadKop() {
    try {
      const { data } = await db.from('settings').select('*').eq('key','kop_pesantren').single();
      if (data && data.value) {
        kopData = data.value;
        document.getElementById('setLogoUrl').value = kopData.logo_url || '';
        if (kopData.logo_url) { document.getElementById('logoPreview').style.display = 'block'; document.getElementById('logoPreviewImg').src = kopData.logo_url; }
        else { document.getElementById('logoPreview').style.display = 'none'; }
      }
    } catch (err) { console.log('Belum ada kop'); }
  }

  document.getElementById('btnSimpanKop').addEventListener('click', async () => {
    const logoUrl = document.getElementById('setLogoUrl').value.trim();
    if (!logoUrl) { showToast('Masukkan URL gambar kop terlebih dahulu', 'error'); return; }
    const payload = { logo_url: logoUrl };
    try {
      const { data: existing } = await db.from('settings').select('key').eq('key','kop_pesantren').single();
      let error;
      if (existing) { const r = await db.from('settings').update({ value: payload, updated_at: new Date().toISOString() }).eq('key','kop_pesantren'); error = r.error; }
      else { const r = await db.from('settings').insert([{ key:'kop_pesantren', value: payload }]); error = r.error; }
      if (error) throw error;
      kopData = payload;
      showToast('Kop berhasil disimpan!', 'success');
    } catch (err) { showToast('Gagal menyimpan kop: ' + err.message, 'error'); }
  });

  const uploadZone = document.getElementById('uploadZone');
  const logoFileInput = document.getElementById('logoFileInput');
  uploadZone.addEventListener('click', () => logoFileInput.click());
  logoFileInput.addEventListener('change', () => { if (logoFileInput.files.length) handleLogoUpload(logoFileInput.files[0]); });
  
  async function handleLogoUpload(file) {
    if (!file || !file.type.startsWith('image/')) { showToast('File harus gambar', 'error'); return; }
    if (file.size > 2*1024*1024) { showToast('Maksimal 2MB', 'error'); return; }
    try {
      const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await db.storage.from('pesantren-assets').upload(fileName, file, { cacheControl:'3600', upsert:true });
      if (error) throw error;
      const { data: urlData } = db.storage.from('pesantren-assets').getPublicUrl(fileName);
      document.getElementById('setLogoUrl').value = urlData.publicUrl;
      document.getElementById('logoPreview').style.display = 'block';
      document.getElementById('logoPreviewImg').src = urlData.publicUrl;
      showToast('Logo berhasil diupload! Jangan lupa klik Simpan Kop.', 'success');
    } catch (err) { showToast('Gagal upload: ' + err.message, 'error'); }
  }

  // ==========================================
  // 7. INISIALISASI SAAT HALAMAN DIMUAT
  // ==========================================
  async function init() {
    await loadDropdowns();
    await loadAllSantri();
    await loadKop();
    document.getElementById('tanggalMasuk').valueAsDate = new Date();
  }

  init();

})();