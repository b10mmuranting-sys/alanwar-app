// ============================================================
// kelas.js — Logika CRUD Kelas (UPGRADED)
// ============================================================

(function () {
  'use strict';
  if (!window.pengurusAktif) return; const role = window.pengurusAktif.role;
  if (role !== 'administrator' && role !== 'operator') { alert('Akses ditolak!'); window.location.href = '../index.html'; return; }

  const tbody=document.getElementById('dataKelasBody'); const searchInput=document.getElementById('searchInput'); const filterTipe=document.getElementById('filterTipe');
  const modalKelas=document.getElementById('modalKelas'); const formKelas=document.getElementById('formKelas'); const modalTitle=document.getElementById('modalKelasTitle');
  const btnTambah=document.getElementById('btnTambahKelas'); const btnClose=document.getElementById('btnCloseKelas'); const btnBatal=document.getElementById('btnBatalKelas'); const btnSimpan=document.getElementById('btnSimpanKelas');
  const editIdField=document.getElementById('editKelasId'); const namaKelasField=document.getElementById('namaKelas'); const tipeKelasField=document.getElementById('tipeKelas'); const kapasitasField=document.getElementById('kapasitasKelas');
  let dataKelasCache = [];

  function customConfirm(title, message) { return new Promise((resolve) => { const o=document.createElement('div');o.className='confirm-overlay';o.innerHTML=`<div class="confirm-box"><div class="confirm-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/></svg></div><h3 class="confirm-title">${title}</h3><p class="confirm-msg">${message}</p><div class="confirm-actions"><button class="btn btn-outline btn-sm" id="cB">Batal</button><button class="btn btn-danger btn-sm" id="cY">Ya, Lanjutkan</button></div></div>`;document.body.appendChild(o);o.querySelector('#cB').onclick=()=>{o.remove();resolve(false);};o.querySelector('#cY').onclick=()=>{o.remove();resolve(true);};o.addEventListener('click',(e)=>{if(e.target===o){o.remove();resolve(false);}}); }); }
  function showToast(m, t='success') { let c=document.getElementById('toastContainer');if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container';document.body.appendChild(c);} const ts=document.createElement('div');ts.className=`toast ${t}`;ts.innerHTML=`<span>${m}</span>`;c.appendChild(ts);setTimeout(()=>{ts.classList.add('toast-exit');ts.addEventListener('animationend',()=>ts.remove());},3000); }

  async function loadKelas() { try { const { data, error } = await db.from('kelas').select('*').order('tipe', { ascending: true }); if (error) throw error; dataKelasCache = data || []; applyFilters(); } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty text-danger">Gagal memuat data.</td></tr>`; } }
  
  function renderTable(data) {
    if (data.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Tidak ada data.</td></tr>`; return; }
    const tipeBadge = (t) => { if(t==='Formal') return '<span class="badge badge-info">Formal</span>'; if(t==='Diniyah') return '<span class="badge badge-success">Diniyah</span>'; return '<span class="badge">Unknown</span>'; };
    tbody.innerHTML = data.map((k, i) => `<tr><td>${i + 1}</td><td><strong>${k.nama_kelas}</strong></td><td>${tipeBadge(k.tipe)}</td><td>${k.kapasitas || '-'}</td><td><div class="action-buttons"><button class="btn-action btn-edit" onclick="window.editKelas('${k.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-action btn-delete" onclick="window.hapusKelas('${k.id}', '${k.nama_kelas}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td></tr>`).join('');
  }

  function applyFilters() { const k = searchInput.value.toLowerCase(); const t = filterTipe.value; renderTable(dataKelasCache.filter(kl => kl.nama_kelas.toLowerCase().includes(k) && (t ? kl.tipe === t : true))); }
  searchInput.addEventListener('keyup', applyFilters); filterTipe.addEventListener('change', applyFilters);
  function openModal(isEdit=false) { formKelas.reset(); editIdField.value=''; modalTitle.textContent=isEdit?'Edit Data Kelas':'Tambah Kelas Baru'; modalKelas.classList.add('active'); }
  function closeModal() { modalKelas.classList.remove('active'); }
  btnTambah.addEventListener('click', ()=>openModal(false)); btnClose.addEventListener('click', closeModal); btnBatal.addEventListener('click', closeModal); modalKelas.addEventListener('click', (e)=>{if(e.target===modalKelas)closeModal();});

  btnSimpan.addEventListener('click', async () => {
    const payload = { nama_kelas: namaKelasField.value.trim().toUpperCase(), tipe: tipeKelasField.value, kapasitas: kapasitasField.value ? parseInt(kapasitasField.value) : null }; // UPPERCASE Nama
    if (!payload.nama_kelas || !payload.tipe) { showToast('Harap isi Nama dan Tipe Kelas!', 'error'); return; }
    btnSimpan.disabled = true; btnSimpan.textContent = 'Menyimpan...';
    try { const editId = editIdField.value; let error; if (editId) { const res = await db.from('kelas').update(payload).eq('id', editId); error = res.error; } else { const res = await db.from('kelas').insert([payload]); error = res.error; }
      if (error) throw error; showToast(editId ? 'Kelas berhasil diperbarui!' : 'Kelas baru berhasil ditambahkan!'); closeModal(); loadKelas();
    } catch (err) { showToast(err.message || 'Gagal menyimpan data.', 'error'); } finally { btnSimpan.disabled = false; btnSimpan.textContent = 'Simpan Kelas'; }
  });

  window.editKelas = async function(id) { try { const { data, error } = await db.from('kelas').select('*').eq('id', id).single(); if (error) throw error; openModal(true); editIdField.value = data.id; namaKelasField.value = data.nama_kelas; tipeKelasField.value = data.tipe; kapasitasField.value = data.kapasitas || ''; } catch (err) { showToast('Gagal mengambil data.', 'error'); } };

  window.hapusKelas = async function(id, nama) {
    const isConfirmed = await customConfirm('Hapus Kelas?', `Apakah Anda yakin ingin menghapus kelas <strong>${nama}</strong>?`);
    if (!isConfirmed) return;
    try { const { error } = await db.from('kelas').delete().eq('id', id); if (error) throw error; showToast('Kelas berhasil dihapus.'); loadKelas(); } catch (err) { showToast('Gagal menghapus.', 'error'); }
  };

  const user = window.pengurusAktif; document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  let roleLabel = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan'; document.getElementById('userRole').textContent = roleLabel;
  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') { document.getElementById('menu-administrasi').style.display = 'none'; document.getElementById('menu-pelanggaran').style.display = 'none'; }
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });
  loadKelas();
})();