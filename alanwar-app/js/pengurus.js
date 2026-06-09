// ============================================================
// pengurus.js — Logika CRUD Akun Pengurus (UPGRADED)
// ============================================================

(function () {
  'use strict';
  if (!window.pengurusAktif || window.pengurusAktif.role !== 'administrator') { alert('Akses ditolak!'); window.location.href = '../index.html'; return; }

  const tbody = document.getElementById('dataPengurusBody'); const modalPengurus = document.getElementById('modalPengurus'); const formPengurus = document.getElementById('formPengurus');
  const modalTitle = document.getElementById('modalPengurusTitle'); const btnTambah = document.getElementById('btnTambahPengurus'); const btnClose = document.getElementById('btnClosePengurus');
  const btnBatal = document.getElementById('btnBatalPengurus'); const btnSimpan = document.getElementById('btnSimpanPengurus');
  const editIdField = document.getElementById('editPengurusId'); const namaField = document.getElementById('pengurusNama'); const usernameField = document.getElementById('pengurusUsername');
  const roleField = document.getElementById('pengurusRole'); const passwordField = document.getElementById('pengurusPassword'); const passwordNote = document.getElementById('passwordNote');
  let dataPengurusCache = [];

  function customConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div'); overlay.className = 'confirm-overlay';
      overlay.innerHTML = `<div class="confirm-box"><div class="confirm-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01"/></svg></div><h3 class="confirm-title">${title}</h3><p class="confirm-msg">${message}</p><div class="confirm-actions"><button class="btn btn-outline btn-sm" id="cBtnBatal">Batal</button><button class="btn btn-danger btn-sm" id="cBtnYa">Ya, Lanjutkan</button></div></div>`;
      document.body.appendChild(overlay); overlay.querySelector('#cBtnBatal').onclick = () => { overlay.remove(); resolve(false); }; overlay.querySelector('#cBtnYa').onclick = () => { overlay.remove(); resolve(true); }; overlay.addEventListener('click', (e) => { if(e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  }
  function showToast(m, t='success') { let c = document.getElementById('toastContainer'); if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container';document.body.appendChild(c);} const ts=document.createElement('div');ts.className=`toast ${t}`;ts.innerHTML=`<span>${m}</span>`;c.appendChild(ts);setTimeout(()=>{ts.classList.add('toast-exit');ts.addEventListener('animationend',()=>ts.remove());},3000); }

  async function loadPengurus() { try { const { data, error } = await db.from('pengurus').select('*').order('id', { ascending: true }); if (error) throw error; dataPengurusCache = data || []; renderTable(dataPengurusCache); } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty text-danger">Gagal memuat data.</td></tr>`; } }
  
  function renderTable(data) {
    if (data.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada data.</td></tr>`; return; }
    const roleBadge = (r) => { if(r==='administrator') return '<span class="badge badge-danger">Administrator</span>'; if(r==='operator') return '<span class="badge badge-info">Operator</span>'; if(r==='perizinan') return '<span class="badge badge-warning">Perizinan</span>'; return '<span class="badge">Unknown</span>'; };
    tbody.innerHTML = data.map((p, i) => `<tr><td>${i + 1}</td><td><strong>${p.username}</strong></td><td>${p.nama_lengkap}</td><td>${roleBadge(p.role)}</td><td><div class="action-buttons"><button class="btn-action btn-edit" onclick="window.editPengurus('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-action btn-delete" onclick="window.hapusPengurus('${p.id}', '${p.username}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></td></tr>`).join('');
  }

  function openModal(isEdit=false) { formPengurus.reset(); editIdField.value=''; modalTitle.textContent=isEdit?'Edit Data Pengurus':'Tambah Pengurus Baru'; passwordField.required=!isEdit; passwordNote.style.display=isEdit?'block':'none'; modalPengurus.classList.add('active'); }
  function closeModal() { modalPengurus.classList.remove('active'); }
  btnTambah.addEventListener('click', ()=>openModal(false)); btnClose.addEventListener('click', closeModal); btnBatal.addEventListener('click', closeModal); modalPengurus.addEventListener('click', (e)=>{if(e.target===modalPengurus)closeModal();});

  btnSimpan.addEventListener('click', async () => {
    const editId = editIdField.value;
    const payload = { nama_lengkap: namaField.value.trim().toUpperCase(), username: usernameField.value.trim(), role: roleField.value }; // UPPERCASE Nama
    if (!payload.nama_lengkap || !payload.username || !payload.role) { showToast('Harap isi Nama, Username, dan Role!', 'error'); return; }
    const passValue = passwordField.value; if (!editId && !passValue) { showToast('Password wajib diisi untuk akun baru!', 'error'); return; }
    if (passValue) payload.password = passValue;
    btnSimpan.disabled = true; btnSimpan.textContent = 'Menyimpan...';
    try { let error; if (editId) { const res = await db.from('pengurus').update(payload).eq('id', editId); error = res.error; } else { const res = await db.from('pengurus').insert([payload]); error = res.error; }
      if (error) { if (error.code === '23505') throw new Error('Username tersebut sudah digunakan!'); throw error; }
      showToast(editId ? 'Akun pengurus berhasil diperbarui!' : 'Akun pengurus baru berhasil dibuat!'); closeModal(); loadPengurus();
    } catch (err) { showToast(err.message || 'Gagal menyimpan data.', 'error'); } finally { btnSimpan.disabled = false; btnSimpan.textContent = 'Simpan Akun'; }
  });

  window.editPengurus = async function(id) { try { const { data, error } = await db.from('pengurus').select('*').eq('id', id).single(); if (error) throw error; openModal(true); editIdField.value = data.id; namaField.value = data.nama_lengkap; usernameField.value = data.username; roleField.value = data.role; } catch (err) { showToast('Gagal mengambil data.', 'error'); } };

  window.hapusPengurus = async function(id, username) {
    if (username === window.pengurusAktif.username) { showToast('Anda tidak bisa menghapus akun yang sedang digunakan!', 'error'); return; }
    const isConfirmed = await customConfirm('Hapus Akun Pengurus?', `Apakah Anda yakin ingin menghapus akun <strong>${username}</strong>?`);
    if (!isConfirmed) return;
    try { const { error } = await db.from('pengurus').delete().eq('id', id); if (error) throw error; showToast('Akun pengurus berhasil dihapus.'); loadPengurus(); } catch (err) { showToast('Gagal menghapus akun.', 'error'); }
  };

  const user = window.pengurusAktif; document.getElementById('userName').textContent = user.nama_lengkap; document.getElementById('userAvatar').textContent = user.nama_lengkap.charAt(0).toUpperCase(); document.getElementById('userRole').textContent = 'Administrator';
  document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('btnToggleSidebar').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('active'); });
  document.getElementById('sidebarOverlay').addEventListener('click', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('active'); });
  loadPengurus();
})();