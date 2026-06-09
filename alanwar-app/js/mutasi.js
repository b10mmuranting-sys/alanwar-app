// ============================================================
// mutasi.js — Logika Pencatatan Mutasi & Pembatalan (UPGRADED)
// ============================================================

(function () {
  'use strict';
  if (!window.pengurusAktif) return; const role = window.pengurusAktif.role;
  if (role !== 'administrator' && role !== 'operator') { alert('Akses ditolak!'); window.location.href = '../index.html'; return; }

  const tbody=document.getElementById('dataMutasiBody'); const filterJenis=document.getElementById('filterJenis'); const modalMutasi=document.getElementById('modalMutasi'); const formMutasi=document.getElementById('formMutasi');
  const modalTitle=document.getElementById('modalMutasiTitle'); const btnTambah=document.getElementById('btnTambahMutasi'); const btnClose=document.getElementById('btnCloseMutasi'); const btnBatal=document.getElementById('btnBatalMutasi'); const btnSimpan=document.getElementById('btnSimpanMutasi');
  const selectSantriField=document.getElementById('selectSantriMutasi'); const tanggalField=document.getElementById('tanggalMutasi'); const jenisField=document.getElementById('jenisMutasi'); const keteranganField=document.getElementById('keteranganMutasi');
  let dataMutasiCache = [];

  function customConfirm(title, message) { return new Promise((resolve) => { const o=document.createElement('div');o.className='confirm-overlay';o.innerHTML=`<div class="confirm-box"><div class="confirm-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/></svg></div><h3 class="confirm-title">${title}</h3><p class="confirm-msg">${message}</p><div class="confirm-actions"><button class="btn btn-outline btn-sm" id="cB">Batal</button><button class="btn btn-danger btn-sm" id="cY">Ya, Lanjutkan</button></div></div>`;document.body.appendChild(o);o.querySelector('#cB').onclick=()=>{o.remove();resolve(false);};o.querySelector('#cY').onclick=()=>{o.remove();resolve(true);};o.addEventListener('click',(e)=>{if(e.target===o){o.remove();resolve(false);}}); }); }
  function showToast(m, t='success') { let c=document.getElementById('toastContainer');if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container';document.body.appendChild(c);} const ts=document.createElement('div');ts.className=`toast ${t}`;ts.innerHTML=`<span>${m}</span>`;c.appendChild(ts);setTimeout(()=>{ts.classList.add('toast-exit');ts.addEventListener('animationend',()=>ts.remove());},3000); }

  async function loadMutasi() { try { const { data, error } = await db.from('santri').select('*').neq('status', 'Aktif').order('jenis_kelamin', { ascending: true }).order('nama_lengkap', { ascending: true }); if (error) throw error; dataMutasiCache = data || []; applyFilters(); } catch (err) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty text-danger">Gagal memuat data.</td></tr>`; } }
  
  function renderTable(data) {
    if (data.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Belum ada riwayat mutasi.</td></tr>`; return; }
    const jB = (j) => { if(j==='Lulus') return '<span class="badge badge-success">Lulus</span>'; if(j==='Keluar') return '<span class="badge badge-danger">Keluar</span>'; if(j==='Pindah') return '<span class="badge badge-info">Pindah</span>'; return ''; };
    tbody.innerHTML = data.map((s, i) => `<tr><td>${i+1}</td><td><strong>${s.id_murid}</strong></td><td>${s.nama_lengkap}</td><td>${s.tanggal_mutasi?new Date(s.tanggal_mutasi).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'-'}</td><td>${jB(s.status)}</td><td>${s.keterangan_mutasi||'-'}</td><td><div class="action-buttons"><button class="btn-action" style="background:var(--info-light);color:var(--info);" onclick="window.batalkanMutasi('${s.id}','${s.nama_lengkap}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button></div></td></tr>`).join('');
  }

  function applyFilters() { const j=filterJenis.value; renderTable(dataMutasiCache.filter(s=>j?s.status===j:true)); }
  filterJenis.addEventListener('change', applyFilters);
  function openModal() { formMutasi.reset(); tanggalField.value = new Date().toISOString().split('T')[0]; populateSantriAktif(); modalMutasi.classList.add('active'); }
  function closeModal() { modalMutasi.classList.remove('active'); }
  btnTambah.addEventListener('click', openModal); btnClose.addEventListener('click', closeModal); btnBatal.addEventListener('click', closeModal); modalMutasi.addEventListener('click', (e)=>{if(e.target===modalMutasi)closeModal();});

  async function populateSantriAktif() { try { const { data, error } = await db.from('santri').select('id, id_murid, nama_lengkap').eq('status', 'Aktif').order('jenis_kelamin').order('nama_lengkap'); if (error) throw error; selectSantriField.innerHTML = '<option value="">-- Pilih Santri Aktif --</option>'; if (data) { data.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.id_murid} - ${s.nama_lengkap}`; selectSantriField.appendChild(o); }); } } catch (err) {} }

  btnSimpan.addEventListener('click', async () => {
    const sId=selectSantriField.value; const tgl=tanggalField.value; const jns=jenisField.value; const ket=keteranganField.value.trim().toUpperCase(); // UPPERCASE Keterangan
    if (!sId || !tgl || !jns) { showToast('Harap pilih santri, tanggal, dan jenis mutasi!', 'error'); return; }
    const isConfirmed = await customConfirm('Proses Mutasi?', 'Santri akan keluar dari kamar dan statusnya berubah.');
    if (!isConfirmed) return;
    btnSimpan.disabled = true; btnSimpan.textContent = 'Memproses...';
    try { const { error } = await db.from('santri').update({ status: jns, tanggal_mutasi: tgl, keterangan_mutasi: ket, kamar: null, is_ketua: false }).eq('id', sId); if (error) throw error; showToast('Mutasi santri berhasil diproses!'); closeModal(); loadMutasi(); } catch (err) { showToast('Gagal memproses mutasi.', 'error'); } finally { btnSimpan.disabled = false; btnSimpan.textContent = 'Proses Mutasi'; }
  });

  window.batalkanMutasi = async function(id, nama) {
    const isConfirmed = await customConfirm('Batalkan Mutasi?', `Kembalikan status <strong>${nama}</strong> menjadi AKTIF?`);
    if (!isConfirmed) return;
    try { const { error } = await db.from('santri').update({ status: 'Aktif', tanggal_mutasi: null, keterangan_mutasi: null }).eq('id', id); if (error) throw error; showToast(`Mutasi untuk ${nama} berhasil dibatalkan.`); loadMutasi(); } catch (err) { showToast('Gagal membatalkan mutasi.', 'error'); }
  };

  const user = window.pengurusAktif; document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase();
  let roleLabel = user.role === 'administrator' ? 'Administrator' : user.role === 'operator' ? 'Operator Data' : 'Divisi Perizinan'; document.getElementById('userRole').textContent = roleLabel;
  if (role !== 'administrator') document.getElementById('nav-pengurus').style.display = 'none';
  if (role === 'operator') { document.getElementById('menu-administrasi').style.display = 'none'; document.getElementById('menu-pelanggaran').style.display = 'none'; }
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });
  loadMutasi();
})();