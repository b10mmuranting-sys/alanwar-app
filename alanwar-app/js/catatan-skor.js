// ============================================================
// catatan-skor.js — Logika Matriks Skor Kamar (FIXED Ketua)
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

  const tbody           = document.getElementById('dataKamarBody');
  const filterBulan     = document.getElementById('filterBulan');
  const filterMinggu    = document.getElementById('filterMinggu');
  const statusPeriode   = document.getElementById('statusPeriode');
  const modalSkor       = document.getElementById('modalSkor');
  const modalSkorTitle  = document.getElementById('modalSkorTitle');
  const btnCloseSkor    = document.getElementById('btnCloseSkor');
  const btnBatalSkor    = document.getElementById('btnBatalSkor');
  const btnSimpanSkor   = document.getElementById('btnSimpanSkor');
  const matrixContainer = document.getElementById('matrixContainer');

  let dataKamarCache = [];
  let jenisPelanggaranCache = [];
  let isPeriodeOpen = false;
  let ketuaKamarMap = {}; // Menyimpan mapping Nama Kamar -> Nama Ketua

  const now = new Date();
  filterBulan.value = now.getMonth() + 1; 
  filterMinggu.value = Math.min(Math.ceil(now.getDate() / 7), 5);

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

  async function loadJenisPelanggaran() {
    try {
      const { data, error } = await db.from('jenis_pelanggaran').select('*').eq('is_active', true).order('poin', { ascending: true });
      if (error) throw error;
      jenisPelanggaranCache = data || [];
    } catch (err) { console.error('Gagal memuat jenis pelanggaran:', err.message); }
  }

  // FUNGSI BARU: Ambil data Ketua Kamar dari tabel santri (is_ketua = true)
  async function loadKetuaKamar() {
    try {
      const { data, error } = await db.from('santri')
        .select('kamar, nama_lengkap')
        .eq('is_ketua', true)
        .eq('status', 'Aktif');
      
      if (error) throw error;

      ketuaKamarMap = {}; // Reset map
      (data || []).forEach(s => {
        if (s.kamar) {
          ketuaKamarMap[s.kamar] = s.nama_lengkap; // Contoh: { "Blok A1": "Budi Santoso" }
        }
      });
    } catch (err) {
      console.error('Gagal memuat data ketua kamar:', err.message);
    }
  }

  async function loadKamarData() {
    try {
      const { data, error } = await db.from('kamar').select('id, nama_kamar').order('nama_kamar', { ascending: true });
      if (error) throw error;
      dataKamarCache = data || [];
      renderTableKamar();
    } catch (err) {
      console.error('Gagal memuat kamar:', err.message);
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty text-danger">Gagal memuat data kamar.</td></tr>`;
    }
  }

  async function checkPeriodeStatus() {
    const bulan = filterBulan.value;
    const minggu = filterMinggu.value;
    const tahun = now.getFullYear();

    try {
      const { data, error } = await db.from('periode_skor')
        .select('status')
        .eq('bulan', bulan)
        .eq('tahun', tahun)
        .eq('minggu_ke', minggu)
        .single();

      if (data && data.status === 'Dibuka') {
        isPeriodeOpen = true;
        statusPeriode.textContent = 'Periode Dibuka';
        statusPeriode.className = 'badge badge-success';
      } else {
        isPeriodeOpen = false;
        statusPeriode.textContent = data ? 'Periode Ditutup' : 'Periode Belum Dibuka';
        statusPeriode.className = 'badge badge-danger';
      }
    } catch (err) {
      isPeriodeOpen = false;
      statusPeriode.textContent = 'Periode Belum Dibuka';
      statusPeriode.className = 'badge badge-secondary';
    }
    renderTableKamar();
  }

  function renderTableKamar() {
    if (dataKamarCache.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Tidak ada data kamar.</td></tr>`; return; }
    
    tbody.innerHTML = dataKamarCache.map((k, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${k.nama_kamar}</strong></td>
        <!-- Menggunakan ketuaKamarMap dari tabel santri -->
        <td>${ketuaKamarMap[k.nama_kamar] || '-'}</td>
        <td id="skorKamar_${k.id}">Memuat...</td>
        <td>
          <button class="btn btn-primary btn-xs" onclick="window.openMatrix('${k.nama_kamar}')" ${!isPeriodeOpen ? 'disabled title="Periode Ditutup"' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Input Skor
          </button>
        </td>
      </tr>
    `).join('');

    calculateTotalSkor();
  }

  async function calculateTotalSkor() {
    const bulan = filterBulan.value;
    const minggu = filterMinggu.value;
    const tahun = now.getFullYear();

    try {
      const { data, error } = await db.from('catatan_skor')
        .select('santri(kamar), skor')
        .eq('periode_bulan', bulan)
        .eq('periode_minggu', minggu)
        .eq('periode_tahun', tahun);
      
      if (error) throw error;

      const totals = {};
      (data || []).forEach(item => {
        const namaKamar = item.santri ? item.santri.kamar : null;
        if (namaKamar) {
          totals[namaKamar] = (totals[namaKamar] || 0) + (item.skor || 0);
        }
      });

      dataKamarCache.forEach(k => {
        const el = document.getElementById(`skorKamar_${k.id}`);
        if (el) el.textContent = totals[k.nama_kamar] || 0;
      });

    } catch (err) {
      console.error('Gagal hitung skor:', err);
    }
  }

  window.openMatrix = async function(namaKamar) {
    if (!isPeriodeOpen) {
      showToast('Periode minggu ini sudah ditutup!', 'error');
      return;
    }

    modalSkorTitle.textContent = `Input Skor Kamar: ${namaKamar}`;
    matrixContainer.innerHTML = '<p>Memuat data santri...</p>';
    modalSkor.classList.add('active');

    const bulan = filterBulan.value;
    const minggu = filterMinggu.value;
    const tahun = now.getFullYear();

    try {
      const { data: santriData, error: sErr } = await db.from('santri').select('id, id_murid, nama_lengkap').eq('kamar', namaKamar).eq('status', 'Aktif').order('nama_lengkap');
      if (sErr) throw sErr;

      if (!santriData || santriData.length === 0) {
        matrixContainer.innerHTML = '<p class="table-empty">Tidak ada santri aktif di kamar ini.</p>';
        return;
      }

      const santriIds = santriData.map(s => s.id);
      const { data: existingSkorData, error: esErr } = await db.from('catatan_skor')
        .select('santri_id, jenis_pelanggaran_id, skor')
        .in('santri_id', santriIds)
        .eq('periode_bulan', bulan)
        .eq('periode_minggu', minggu)
        .eq('periode_tahun', tahun);
      
      if (esErr) throw esErr;

      const existingMap = {};
      (existingSkorData || []).forEach(item => {
        existingMap[`${item.santri_id}_${item.jenis_pelanggaran_id}`] = item.skor;
      });

      let tableHtml = `<table class="matrix-table"><thead><tr><th>No</th><th>Nama Santri</th>`;
      jenisPelanggaranCache.forEach(jp => {
        tableHtml += `<th>${jp.nama_pelanggaran}<br><small>(${jp.poin} pts)</small></th>`;
      });
      tableHtml += `</tr></thead><tbody>`;

      santriData.forEach((s, i) => {
        tableHtml += `<tr><td>${i+1}</td><td>${s.nama_lengkap}</td>`;
        jenisPelanggaranCache.forEach(jp => {
          const key = `${s.id}_${jp.id}`;
          const val = existingMap[key] || 0;
          tableHtml += `<td><input type="number" min="0" class="matrix-input" data-santri-id="${s.id}" data-jenis-id="${jp.id}" value="${val}"></td>`;
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table>`;
      matrixContainer.innerHTML = tableHtml;

    } catch (err) {
      showToast('Gagal memuat matriks: ' + err.message, 'error');
      matrixContainer.innerHTML = '<p class="text-danger">Terjadi kesalahan.</p>';
    }
  }

  btnSimpanSkor.addEventListener('click', async () => {
    const isConfirmed = await customConfirm('Simpan Skor?', 'Pastikan semua skor sudah terisi benar. Data lama akan ditimpa.');
    if (!isConfirmed) return;

    const bulan = parseInt(filterBulan.value);
    const minggu = parseInt(filterMinggu.value);
    const tahun = now.getFullYear();

    const inputs = document.querySelectorAll('.matrix-input');
    const payloadInsert = [];
    const santriIdsInMatrix = new Set()

    inputs.forEach(input => {
      const val = parseInt(input.value) || 0;
      if (val > 0) {
        const santriId = input.dataset.santriId;
        const jenisId = input.dataset.jenisId;
        santriIdsInMatrix.add(santriId);
        const jp = jenisPelanggaranCache.find(j => j.id == jenisId);
        const poinDasar = jp ? jp.poin : 0;
        payloadInsert.push({
          santri_id: santriId,
          jenis_pelanggaran_id: jenisId,
          periode_bulan: bulan,
          periode_tahun: tahun,
          periode_minggu: minggu,
          skor: val * poinDasar
        });
      }
    });

    btnSimpanSkor.disabled = true; btnSimpanSkor.textContent = 'Menyimpan...';

    try {
      const idsArray = Array.from(santriIdsInMatrix);
      if (idsArray.length > 0) {
        await db.from('catatan_skor').delete()
          .in('santri_id', idsArray)
          .eq('periode_bulan', bulan)
          .eq('periode_minggu', minggu)
          .eq('periode_tahun', tahun);
      }

      if (payloadInsert.length > 0) {
        const { error: insertErr } = await db.from('catatan_skor').insert(payloadInsert);
        if (insertErr) throw insertErr;
      }

      showToast('Skor kamar berhasil disimpan!');
      closeModal();
      calculateTotalSkor();
    } catch (err) {
      showToast('Gagal menyimpan skor: ' + err.message, 'error');
    } finally {
      btnSimpanSkor.disabled = false; btnSimpanSkor.textContent = 'Simpan Skor Kamar';
    }
  });

  function closeModal() { modalSkor.classList.remove('active'); }
  btnCloseSkor.addEventListener('click', closeModal);
  btnBatalSkor.addEventListener('click', closeModal);
  modalSkor.addEventListener('click', (e) => { if (e.target === modalSkor) closeModal(); });

  const user = window.pengurusAktif;
  document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  document.getElementById('userRole').textContent = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan';
  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') { document.getElementById('menu-administrasi').style.display = 'none'; document.getElementById('menu-pelanggaran').style.display = 'none'; }
  document.getElementById('currentDate').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });

  filterBulan.addEventListener('change', checkPeriodeStatus);
  filterMinggu.addEventListener('change', checkPeriodeStatus);

  // INIT LOAD: Pastikan loadKetuaKamar() dipanggil sebelum render tabel
  loadJenisPelanggaran().then(() => {
    loadKetuaKamar().then(() => {
      loadKamarData();
      checkPeriodeStatus();
    });
  });

})();