// ============================================================
// pengaturan.js — Logika Pengaturan Sistem (Lengkap)
// ============================================================

(function () {
  'use strict';
  if (!window.pengurusAktif || window.pengurusAktif.role !== 'administrator') { alert('Akses ditolak!'); window.location.href = '../index.html'; return; }

  // --- HELPER FUNCTIONS ---
  function customConfirm(title, message) { return new Promise((resolve) => { const o=document.createElement('div');o.className='confirm-overlay';o.innerHTML=`<div class="confirm-box"><div class="confirm-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/></svg></div><h3 class="confirm-title">${title}</h3><p class="confirm-msg">${message}</p><div class="confirm-actions"><button class="btn btn-outline btn-sm" id="cB">Batal</button><button class="btn btn-danger btn-sm" id="cY">Ya, Lanjutkan</button></div></div>`;document.body.appendChild(o);o.querySelector('#cB').onclick=()=>{o.remove();resolve(false);};o.querySelector('#cY').onclick=()=>{o.remove();resolve(true);};o.addEventListener('click',(e)=>{if(e.target===o){o.remove();resolve(false);}}); }); }
  function showToast(m, t='success') { let c=document.getElementById('toastContainer');if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container';document.body.appendChild(c);} const ts=document.createElement('div');ts.className=`toast ${t}`;ts.innerHTML=`<span>${m}</span>`;c.appendChild(ts);setTimeout(()=>{ts.classList.add('toast-exit');ts.addEventListener('animationend',()=>ts.remove());},3000); }
  const bulanNama = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // ==========================================
  // 1. LOGIKA TAHUN ANGKATAN
  // ==========================================
  const tbodyAngkatan=document.getElementById('dataAngkatanBody'); const modalAngkatan=document.getElementById('modalAngkatan'); const formAngkatan=document.getElementById('formAngkatan');
  const btnTambahAngkatan=document.getElementById('btnTambahAngkatan'); const btnCloseAngkatan=document.getElementById('btnCloseAngkatan'); const btnBatalAngkatan=document.getElementById('btnBatalAngkatan'); const btnSimpanAngkatan=document.getElementById('btnSimpanAngkatan');
  const editAngkatanIdField=document.getElementById('editAngkatanId'); const namaAngkatanField=document.getElementById('namaAngkatan'); const statusAngkatanField=document.getElementById('statusAngkatan'); const modalAngkatanTitle=document.getElementById('modalAngkatanTitle');

  async function loadAngkatan() { try { const { data, error } = await db.from('tahun_angkatan').select('*').order('tahun', { ascending: false }); if (error) throw error; if (data.length === 0) { tbodyAngkatan.innerHTML = `<tr><td colspan="4" class="table-empty">Belum ada data.</td></tr>`; return; }
    tbodyAngkatan.innerHTML = data.map((a, i) => `<tr><td>${i+1}</td><td><strong>${a.tahun}</strong></td><td>${a.status==='Dibuka'?'<span class="badge badge-success">Dibuka</span>':'<span class="badge badge-danger">Ditutup</span>'}</td><td><div class="action-buttons"><button class="btn-action btn-edit" onclick="window.editAngkatan('${a.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-action btn-delete" onclick="window.hapusAngkatan('${a.id}', '${a.tahun}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td></tr>`).join('');
  } catch (err) { tbodyAngkatan.innerHTML = `<tr><td colspan="4" class="table-empty text-danger">Gagal memuat.</td></tr>`; } }

  function openAngkatanModal(isEdit=false) { formAngkatan.reset(); editAngkatanIdField.value=''; modalAngkatanTitle.textContent=isEdit?'Edit Tahun Angkatan':'Tambah Tahun Angkatan'; modalAngkatan.classList.add('active'); }
  function closeAngkatanModal() { modalAngkatan.classList.remove('active'); }
  btnTambahAngkatan.addEventListener('click', ()=>openAngkatanModal(false)); btnCloseAngkatan.addEventListener('click', closeAngkatanModal); btnBatalAngkatan.addEventListener('click', closeAngkatanModal); modalAngkatan.addEventListener('click', (e)=>{if(e.target===modalAngkatan)closeAngkatanModal();});

  btnSimpanAngkatan.addEventListener('click', async () => { const payload = { tahun: parseInt(namaAngkatanField.value), status: statusAngkatanField.value }; if (!payload.tahun) { showToast('Tahun wajib diisi!', 'error'); return; }
    btnSimpanAngkatan.disabled=true; btnSimpanAngkatan.textContent='Menyimpan...';
    try { const editId=editAngkatanIdField.value; let error; if(editId){const res=await db.from('tahun_angkatan').update(payload).eq('id',editId);error=res.error;}else{const res=await db.from('tahun_angkatan').insert([payload]);error=res.error;}
      if(error){if(error.code==='23505')throw new Error('Tahun angkatan tersebut sudah ada!');throw error;}
      showToast(editId?'Angkatan berhasil diperbarui!':'Angkatan baru berhasil ditambahkan!'); closeAngkatanModal(); loadAngkatan();
    } catch (err) { showToast(err.message || 'Gagal menyimpan.', 'error'); } finally { btnSimpanAngkatan.disabled=false; btnSimpanAngkatan.textContent='Simpan'; }
  });

  window.editAngkatan = async function(id) { try { const { data, error } = await db.from('tahun_angkatan').select('*').eq('id', id).single(); if (error) throw error; openAngkatanModal(true); editAngkatanIdField.value = data.id; namaAngkatanField.value = data.tahun; statusAngkatanField.value = data.status; } catch (err) { showToast('Gagal mengambil data.', 'error'); } };
  window.hapusAngkatan = async function(id, tahun) { const isConfirmed = await customConfirm('Hapus Angkatan?', `Hapus Tahun Angkatan <strong>${tahun}</strong>?`); if (!isConfirmed) return; try { const { error } = await db.from('tahun_angkatan').delete().eq('id', id); if (error) throw error; showToast('Angkatan berhasil dihapus.'); loadAngkatan(); } catch (err) { showToast('Gagal menghapus.', 'error'); } };


  // ==========================================
  // 2. LOGIKA JENIS PELANGGARAN
  // ==========================================
  const tbodyPelanggaran=document.getElementById('dataPelanggaranBody'); const modalPelanggaran=document.getElementById('modalPelanggaran'); const formPelanggaran=document.getElementById('formPelanggaran');
  const btnTambahPelanggaran=document.getElementById('btnTambahPelanggaran'); const btnClosePelanggaran=document.getElementById('btnClosePelanggaran'); const btnBatalPelanggaran=document.getElementById('btnBatalPelanggaran'); const btnSimpanPelanggaran=document.getElementById('btnSimpanPelanggaran');
  const editPelanggaranIdField=document.getElementById('editPelanggaranId'); const namaPelanggaranField=document.getElementById('namaPelanggaran'); const poinPelanggaranField=document.getElementById('poinPelanggaran'); const statusPelanggaranField=document.getElementById('statusPelanggaran'); const modalPelanggaranTitle=document.getElementById('modalPelanggaranTitle');

  async function loadPelanggaran() { try { const { data, error } = await db.from('jenis_pelanggaran').select('*').order('poin', { ascending: true }); if (error) throw error; if (data.length === 0) { tbodyPelanggaran.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada data.</td></tr>`; return; }
    tbodyPelanggaran.innerHTML = data.map((p, i) => `<tr><td>${i+1}</td><td><strong>${p.nama_pelanggaran}</strong></td><td>${p.poin}</td><td>${p.is_active?'<span class="badge badge-success">Aktif</span>':'<span class="badge badge-danger">Nonaktif</span>'}</td><td><div class="action-buttons"><button class="btn-action btn-edit" onclick="window.editPelanggaran('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-action btn-delete" onclick="window.hapusPelanggaran('${p.id}', '${p.nama_pelanggaran}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td></tr>`).join('');
  } catch (err) { tbodyPelanggaran.innerHTML = `<tr><td colspan="5" class="table-empty text-danger">Gagal memuat.</td></tr>`; } }

  function openPelanggaranModal(isEdit=false) { formPelanggaran.reset(); editPelanggaranIdField.value=''; modalPelanggaranTitle.textContent=isEdit?'Edit Jenis Pelanggaran':'Tambah Jenis Pelanggaran'; modalPelanggaran.classList.add('active'); }
  function closePelanggaranModal() { modalPelanggaran.classList.remove('active'); }
  btnTambahPelanggaran.addEventListener('click', ()=>openPelanggaranModal(false)); btnClosePelanggaran.addEventListener('click', closePelanggaranModal); btnBatalPelanggaran.addEventListener('click', closePelanggaranModal); modalPelanggaran.addEventListener('click', (e)=>{if(e.target===modalPelanggaran)closePelanggaranModal();});

  btnSimpanPelanggaran.addEventListener('click', async () => { 
    const payload = { nama_pelanggaran: namaPelanggaranField.value, poin: parseInt(poinPelanggaranField.value), is_active: statusPelanggaranField.value === 'true' }; 
    if (!payload.nama_pelanggaran || !payload.poin) { showToast('Nama dan poin wajib diisi!', 'error'); return; }
    btnSimpanPelanggaran.disabled=true; btnSimpanPelanggaran.textContent='Menyimpan...';
    try { const editId=editPelanggaranIdField.value; let error; if(editId){const res=await db.from('jenis_pelanggaran').update(payload).eq('id',editId);error=res.error;}else{const res=await db.from('jenis_pelanggaran').insert([payload]);error=res.error;}
      if(error) throw error;
      showToast(editId?'Pelanggaran berhasil diperbarui!':'Pelanggaran baru berhasil ditambahkan!'); closePelanggaranModal(); loadPelanggaran();
    } catch (err) { showToast(err.message || 'Gagal menyimpan.', 'error'); } finally { btnSimpanPelanggaran.disabled=false; btnSimpanPelanggaran.textContent='Simpan'; }
  });

  window.editPelanggaran = async function(id) { try { const { data, error } = await db.from('jenis_pelanggaran').select('*').eq('id', id).single(); if (error) throw error; openPelanggaranModal(true); editPelanggaranIdField.value = data.id; namaPelanggaranField.value = data.nama_pelanggaran; poinPelanggaranField.value = data.poin; statusPelanggaranField.value = data.is_active ? 'true' : 'false'; } catch (err) { showToast('Gagal mengambil data.', 'error'); } };
  window.hapusPelanggaran = async function(id, nama) { const isConfirmed = await customConfirm('Hapus Pelanggaran?', `Hapus jenis pelanggaran <strong>${nama}</strong>?`); if (!isConfirmed) return; try { const { error } = await db.from('jenis_pelanggaran').delete().eq('id', id); if (error) throw error; showToast('Pelanggaran berhasil dihapus.'); loadPelanggaran(); } catch (err) { showToast('Gagal menghapus.', 'error'); } };


  // ==========================================
  // 3. LOGIKA PERIODE SKOR
  // ==========================================
  const tbodyPeriode=document.getElementById('dataPeriodeBody'); const modalPeriode=document.getElementById('modalPeriode'); const formPeriode=document.getElementById('formPeriode');
  const btnTambahPeriode=document.getElementById('btnTambahPeriode'); const btnClosePeriode=document.getElementById('btnClosePeriode'); const btnBatalPeriode=document.getElementById('btnBatalPeriode'); const btnSimpanPeriode=document.getElementById('btnSimpanPeriode');
  const editPeriodeIdField=document.getElementById('editPeriodeId'); const bulanPeriodeField=document.getElementById('bulanPeriode'); const tahunPeriodeField=document.getElementById('tahunPeriode'); const mingguPeriodeField=document.getElementById('mingguPeriode'); const statusPeriodeModalField=document.getElementById('statusPeriodeModal'); const modalPeriodeTitle=document.getElementById('modalPeriodeTitle');

  async function loadPeriode() { try { const { data, error } = await db.from('periode_skor').select('*').order('tahun', { ascending: false }); if (error) throw error; if (data.length === 0) { tbodyPeriode.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada data.</td></tr>`; return; }
    tbodyPeriode.innerHTML = data.map((p, i) => `<tr><td>${i+1}</td><td><strong>${bulanNama[p.bulan]} ${p.tahun}</strong></td><td>Minggu ke-${p.minggu_ke}</td><td>${p.status==='Dibuka'?'<span class="badge badge-success">Dibuka</span>':'<span class="badge badge-danger">Ditutup</span>'}</td><td><div class="action-buttons"><button class="btn-action btn-edit" onclick="window.editPeriode('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-action btn-delete" onclick="window.hapusPeriode('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td></tr>`).join('');
  } catch (err) { tbodyPeriode.innerHTML = `<tr><td colspan="5" class="table-empty text-danger">Gagal memuat.</td></tr>`; } }

  function openPeriodeModal(isEdit=false) { formPeriode.reset(); editPeriodeIdField.value=''; modalPeriodeTitle.textContent=isEdit?'Edit Periode':'Buka Periode Baru'; if(!isEdit){ const n=new Date(); bulanPeriodeField.value=n.getMonth()+1; tahunPeriodeField.value=n.getFullYear(); } modalPeriode.classList.add('active'); }
  function closePeriodeModal() { modalPeriode.classList.remove('active'); }
  btnTambahPeriode.addEventListener('click', ()=>openPeriodeModal(false)); btnClosePeriode.addEventListener('click', closePeriodeModal); btnBatalPeriode.addEventListener('click', closePeriodeModal); modalPeriode.addEventListener('click', (e)=>{if(e.target===modalPeriode)closePeriodeModal();});

  btnSimpanPeriode.addEventListener('click', async () => { 
    const payload = { bulan: parseInt(bulanPeriodeField.value), tahun: parseInt(tahunPeriodeField.value), minggu_ke: parseInt(mingguPeriodeField.value), status: statusPeriodeModalField.value }; 
    if (!payload.bulan || !payload.tahun || !payload.minggu_ke) { showToast('Semua field wajib diisi!', 'error'); return; }
    btnSimpanPeriode.disabled=true; btnSimpanPeriode.textContent='Menyimpan...';
    try { const editId=editPeriodeIdField.value; let error; if(editId){const res=await db.from('periode_skor').update(payload).eq('id',editId);error=res.error;}else{const res=await db.from('periode_skor').insert([payload]);error=res.error;}
      if(error){if(error.code==='23505')throw new Error('Periode minggu ini sudah ada!');throw error;}
      showToast(editId?'Periode berhasil diperbarui!':'Periode baru berhasil ditambahkan!'); closePeriodeModal(); loadPeriode();
    } catch (err) { showToast(err.message || 'Gagal menyimpan.', 'error'); } finally { btnSimpanPeriode.disabled=false; btnSimpanPeriode.textContent='Simpan'; }
  });

  window.editPeriode = async function(id) { try { const { data, error } = await db.from('periode_skor').select('*').eq('id', id).single(); if (error) throw error; openPeriodeModal(true); editPeriodeIdField.value = data.id; bulanPeriodeField.value = data.bulan; tahunPeriodeField.value = data.tahun; mingguPeriodeField.value = data.minggu_ke; statusPeriodeModalField.value = data.status; } catch (err) { showToast('Gagal mengambil data.', 'error'); } };
  window.hapusPeriode = async function(id) { const isConfirmed = await customConfirm('Hapus Periode?', 'Data skor yang sudah diinput tidak akan ikut terhapus.'); if (!isConfirmed) return; try { const { error } = await db.from('periode_skor').delete().eq('id', id); if (error) throw error; showToast('Periode berhasil dihapus.'); loadPeriode(); } catch (err) { showToast('Gagal menghapus.', 'error'); } };


  // ==========================================
  // PENYESUAIAN UI & ROLE
  // ==========================================
  const user = window.pengurusAktif; document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase(); document.getElementById('userRole').textContent = 'Administrator';
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });

  // INIT LOAD
  loadAngkatan();
  loadPelanggaran();
  loadPeriode();
})();