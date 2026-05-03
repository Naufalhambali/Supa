// ================================================================
// DARUL FALAH GAMBUT — app.js
// ================================================================
// Fungsi  : Semua logika JavaScript aplikasi (frontend + API)
// Backend : Supabase (Postgres + Auth)
//
// Daftar seksi utama:
//   SUPABASE CONFIG    → URL & API key koneksi database
//   APP STATE          → Variabel global status aplikasi
//   LOCAL STORAGE      → Simpan/muat data lokal (cache offline)
//   CACHE              → TTL cache agar tidak fetch berlebihan
//   SUPABASE API       → Semua fungsi CRUD ke Supabase
//   AUTH               → Login, logout, toggle password
//   NAVIGATION         → Pindah halaman, dropdown, dark mode
//   DATA LOADING       → Fetch semua data + indikator cache
//   DASHBOARD          → Hitung & render statistik dashboard
//   CATERING TABLE     → Render tabel catering + filter
//   SPP TABLE          → Render tabel SPP + filter
//   MODAL              → Form tambah & edit data
//   SETTINGS           → Simpan tarif, kelas, kamar, dll
//   TOAST              → Notifikasi singkat (3 detik)
//   UTILS              → Helper: formatRp, toTitleCase, dll
//   AUTO LOGOUT        → Logout otomatis setelah 30 menit
//   BACK BUTTON        → Cegah app tertutup tombol Back HP
//   LAPORAN TUNGGAKAN  → Laporan tunggakan per bulan
//   RESET CENTANG      → Reset semua centang bayar bulan ini
//   INIT               → Inisialisasi saat app pertama dibuka
//
// Cara ganti koneksi Supabase:
//   Cari seksi SUPABASE CONFIG → ganti SUPABASE_URL dan SUPABASE_KEY
// ================================================================

// ==========================================
// SUPABASE CONFIG
// ==========================================
const SUPABASE_URL = 'https://bnpczblikmqwclcvxnsp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucGN6Ymxpa21xd2NsY3Z4bnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzAxODgsImV4cCI6MjA5MzEwNjE4OH0.UZIkJeCsLcoEPU_ihwhhiPAtbv_bLJrhmOHSdwosRWM';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// ==========================================
// APP STATE
// ==========================================
let state = {
  loggedIn: false,
  user:     null,
  darkMode: false,
  catTab:   'santri',
  sppTab:   'santri',
  cateringData: [],
  sppData:      [],
  settings: {
    tarifCatering: 0,
    tarifSpp:      0,
    tahunAjaran:   '2024/2025',
  },
  modal: { type: null, mode: null, editId: null },
  _cacheTs: {}
};

const MONTHS      = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// ==========================================
// LOCAL STORAGE
// ==========================================
function saveLocal() {
  localStorage.setItem('df_sb', JSON.stringify({
    loggedIn:     state.loggedIn,
    user:         state.user,
    darkMode:     state.darkMode,
    cateringData: state.cateringData,
    sppData:      state.sppData,
    settings:     state.settings,
    kelasList,
    kamarList,
    _cacheTs:     state._cacheTs || {}
  }));
}

function loadLocal() {
  try {
    const s = localStorage.getItem('df_sb');
    if (!s) return;
    const d = JSON.parse(s);
    if (d.loggedIn !== undefined) state.loggedIn = d.loggedIn;
    if (d.user)         state.user          = d.user;
    if (d.darkMode !== undefined) state.darkMode = d.darkMode;
    if (d.cateringData?.length) state.cateringData = d.cateringData;
    if (d.sppData?.length)      state.sppData      = d.sppData;
    if (d.settings)     state.settings      = { ...state.settings, ...d.settings };
    if (d.kelasList?.length) kelasList = d.kelasList;
    if (d.kamarList?.length) kamarList = d.kamarList;
    if (d._cacheTs)     state._cacheTs      = d._cacheTs;
  } catch(e) { localStorage.removeItem('df_sb'); }
}

// ==========================================
// CACHE
// ==========================================
const CACHE_TTL = 2 * 60 * 1000; // 2 menit

function saveCacheTs(key) {
  if (!state._cacheTs) state._cacheTs = {};
  state._cacheTs[key] = Date.now();
  saveLocal();
}

function isCacheValid(key) {
  if (!state._cacheTs?.[key]) return false;
  return (Date.now() - state._cacheTs[key]) < CACHE_TTL;
}

function invalidateCache(key) {
  if (!state._cacheTs) state._cacheTs = {};
  if (key) state._cacheTs[key] = 0;
  else state._cacheTs = { catering: 0, spp: 0, settings: 0 };
}

// ==========================================
// SUPABASE HELPERS
// ==========================================
function _parseBool(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1;
}

function _rowToCatering(row) {
  return {
    id:     String(row.id),
    gender: row.gender,
    nama:   row.nama   || '',
    bin:    row.bin    || '',
    kamar:  row.kamar  || '',
    alamat: row.alamat || '',
    months: [row.bln1,row.bln2,row.bln3,row.bln4,row.bln5,row.bln6,
             row.bln7,row.bln8,row.bln9,row.bln10,row.bln11,row.bln12].map(_parseBool)
  };
}

function _rowToSpp(row) {
  return {
    id:          String(row.id),
    gender:      row.gender,
    nama:        row.nama         || '',
    bin:         row.bin          || '',
    kelas:       row.kelas        || '',
    tahunAjaran: row.tahun_ajaran || '',
    alamat:      row.alamat       || '',
    months: [row.bln1,row.bln2,row.bln3,row.bln4,row.bln5,row.bln6,
             row.bln7,row.bln8,row.bln9,row.bln10,row.bln11,row.bln12].map(_parseBool)
  };
}

function _monthsToObj(months) {
  const obj = {};
  months.forEach((v, i) => { obj[`bln${i+1}`] = v === true; });
  return obj;
}

// ==========================================
// SUPABASE API
// ==========================================
async function callScript(action, data = {}) {
  switch(action) {
    case 'login':             return sbLogin(data);
    case 'logout':            return { success: true };
    case 'getCatering':       return sbGetCatering();
    case 'getSpp':            return sbGetSpp();
    case 'getSettings':       return sbGetSettings();
    case 'saveCatering':      return sbSaveCatering(data);
    case 'saveSpp':           return sbSaveSpp(data);
    case 'deleteCatering':    return sbDeleteCatering(data);
    case 'deleteSpp':         return sbDeleteSpp(data);
    case 'saveSettings':      return sbSaveSettings(data);
    case 'getMonthlyFinance': return sbGetMonthlyFinance(data);
    case 'getTotalTahunan':   return sbGetTotalTahunan(data);
    case 'resetCentangBulan': return sbResetCentangBulan(data);
    default: return { success: false, error: `Action '${action}' tidak dikenal` };
  }
}

async function sbLogin({ username, password }) {
  try {
    // username di-map ke email: username@dafalah.id
    const email = username.includes('@') ? username : `${username}@dafalah.id`;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login')) return { success: false, error: 'Username atau password salah' };
      return { success: false, error: error.message };
    }
    // Ambil data profil dari tabel users berdasarkan username
    const { data: userData } = await sb.from('users')
      .select('name,role,username,active')
      .eq('username', username).eq('active', true).single();
    if (!userData) return { success: false, error: 'Akun tidak aktif atau tidak ditemukan' };
    return { success: true, user: { name: userData.name, role: userData.role, username: userData.username } };
  } catch(e) { return { success: false, error: 'Koneksi gagal: ' + e.message }; }
}

async function sbGetCatering() {
  try {
    let all = [], from = 0, batchSize = 1000;
    while (true) {
      const { data, error } = await sb.from('catering').select('*')
        .order('nama').range(from, from + batchSize - 1);
      if (error) throw error;
      all = all.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    return { success: true, data: all.map(_rowToCatering) };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbGetSpp() {
  try {
    let all = [], from = 0, batchSize = 1000;
    while (true) {
      const { data, error } = await sb.from('spp').select('*')
        .order('nama').range(from, from + batchSize - 1);
      if (error) throw error;
      all = all.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    return { success: true, data: all.map(_rowToSpp) };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbGetSettings() {
  try {
    const { data, error } = await sb.from('settings').select('*');
    if (error) throw error;
    const map = {};
    data.forEach(r => { map[r.key] = r.value; });
    let kl = kelasList, km = kamarList;
    try { if (map.kelasList) kl = JSON.parse(map.kelasList); } catch(e){}
    try { if (map.kamarList) km = JSON.parse(map.kamarList); } catch(e){}
    return { success: true, data: {
      tarifCatering: Number(map.tarifCatering) || 0,
      tarifSpp:      Number(map.tarifSpp)      || 0,
      tahunAjaran:   map.tahunAjaran  || '2024/2025',
      kelasList: kl, kamarList: km
    }};
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbSaveCatering({ mode, item }) {
  try {
    const row = {
      id: item.id || Date.now().toString(),
      gender: item.gender, nama: item.nama,
      bin: item.bin||'', kamar: item.kamar||'', alamat: item.alamat||'',
      ..._monthsToObj(item.months)
    };
    const { error } = mode === 'add'
      ? await sb.from('catering').insert([row])
      : await sb.from('catering').update(row).eq('id', item.id);
    if (error) throw error;
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbSaveSpp({ mode, item }) {
  try {
    const row = {
      id: item.id || Date.now().toString(),
      gender: item.gender, nama: item.nama,
      bin: item.bin||'', kelas: item.kelas||'',
      tahun_ajaran: item.tahunAjaran||'', alamat: item.alamat||'',
      ..._monthsToObj(item.months)
    };
    const { error } = mode === 'add'
      ? await sb.from('spp').insert([row])
      : await sb.from('spp').update(row).eq('id', item.id);
    if (error) throw error;
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbDeleteCatering({ id }) {
  try {
    const { error } = await sb.from('catering').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbDeleteSpp({ id }) {
  try {
    const { error } = await sb.from('spp').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbSaveSettings({ settings }) {
  try {
    const rows = Object.entries(settings).map(([key, value]) => ({
      key, value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
    const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

async function sbGetMonthlyFinance({ bulan }) {
  const blnIdx        = bulan - 1;
  const tarifSpp      = state.settings.tarifSpp      || 0;
  const tarifCatering = state.settings.tarifCatering || 0;
  const tahun         = new Date().getFullYear();

  let sppBayar = 0, sppBelum = 0;
  const sppDetail = [];
  state.sppData.forEach(r => {
    const lunas = r.months[blnIdx] === true;
    if (lunas) { sppBayar++;  sppDetail.push({ nama:r.nama, bin:r.bin, gender:r.gender, kelas:r.kelas,  status:'lunas' }); }
    else        { sppBelum++; sppDetail.push({ nama:r.nama, bin:r.bin, gender:r.gender, kelas:r.kelas,  status:'belum' }); }
  });

  let catBayar = 0, catBelum = 0;
  const catDetail = [];
  state.cateringData.forEach(r => {
    const lunas = r.months[blnIdx] === true;
    if (lunas) { catBayar++;  catDetail.push({ nama:r.nama, bin:r.bin, gender:r.gender, kamar:r.kamar, status:'lunas' }); }
    else        { catBelum++; catDetail.push({ nama:r.nama, bin:r.bin, gender:r.gender, kamar:r.kamar, status:'belum' }); }
  });

  return { success: true, data: {
    bulan, tahun, namaBulan: MONTHS_FULL[blnIdx],
    spp: {
      bayar: sppBayar, belum: sppBelum, total: sppBayar + sppBelum,
      masuk: sppBayar * tarifSpp, sisaBelum: sppBelum * tarifSpp,
      tarif: tarifSpp, detail: sppDetail
    },
    catering: {
      bayar: catBayar, belum: catBelum, total: catBayar + catBelum,
      masuk: catBayar * tarifCatering, sisaBelum: catBelum * tarifCatering,
      tarif: tarifCatering, detail: catDetail
    },
    totalMasuk: (sppBayar * tarifSpp) + (catBayar * tarifCatering),
    totalBelum: (sppBelum * tarifSpp) + (catBelum * tarifCatering)
  }};
}

async function sbGetTotalTahunan({ tahun }) {
  const tarifSpp      = state.settings.tarifSpp      || 0;
  const tarifCatering = state.settings.tarifCatering || 0;
  let totalSpp = 0, totalCatering = 0, bulanAktif = 0;
  for (let b = 1; b <= 12; b++) {
    const idx      = b - 1;
    const sppBayar = state.sppData.filter(r => r.months[idx] === true).length;
    const catBayar = state.cateringData.filter(r => r.months[idx] === true).length;
    const masuk    = (sppBayar * tarifSpp) + (catBayar * tarifCatering);
    if (masuk > 0) bulanAktif++;
    totalSpp      += sppBayar * tarifSpp;
    totalCatering += catBayar * tarifCatering;
  }
  return { success: true, data: { tahun, totalSpp, totalCatering, totalMasuk: totalSpp + totalCatering, bulanAktif }};
}

async function sbResetCentangBulan({ resetSpp, resetCat }) {
  try {
    const blnObj = {};
    for (let i = 1; i <= 12; i++) blnObj[`bln${i}`] = false;
    if (resetCat) {
      const { error } = await sb.from('catering').update(blnObj).neq('id','');
      if (error) throw error;
    }
    if (resetSpp) {
      const { error } = await sb.from('spp').update(blnObj).neq('id','');
      if (error) throw error;
    }
    const parts = [resetSpp && 'SPP', resetCat && 'Catering'].filter(Boolean).join(' & ');
    return { success: true, message: `Reset centang ${parts} berhasil` };
  } catch(e) { return { success: false, error: e.message }; }
}





    if (catDetail.length > 0) {
      const rows = catDetail.map(x => ({ ...x, rekap_id: rekapId }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await sb.from('rekap_catering').insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
    }

    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

// ==========================================
// AUTH
// ==========================================
function togglePassword() {
  const inp = document.getElementById('login-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btnText  = document.getElementById('btn-login-text');

  if (!username || !password) {
    errEl.textContent = 'Username dan password harus diisi';
    errEl.classList.add('show'); return;
  }
  errEl.classList.remove('show');
  btnText.innerHTML = '<span class="loading-spinner"></span>';
  document.getElementById('btn-login').disabled = true;

  const res = await callScript('login', { username, password });

  document.getElementById('btn-login').disabled = false;
  btnText.textContent = 'Masuk';

  if (res.success) {
    state.user     = res.user;
    state.loggedIn = true;
    invalidateCache();
    saveLocal();
    enterApp();
  } else {
    errEl.textContent = res.error || 'Login gagal';
    errEl.classList.add('show');
  }
}

function enterApp() {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-main').classList.add('active');
  updateProfileUI();
  state.cateringData = [];
  state.sppData = [];
  invalidateCache();
  loadAllData(true);
  resetAutoLogout();
}

function confirmLogout() {
  document.getElementById('confirm-text').textContent = 'Anda akan keluar. Data di Supabase tetap aman. Lanjutkan?';
  document.getElementById('btn-confirm-yes').onclick = doLogout;
  document.getElementById('confirm-dialog').classList.add('show');
  closeDropdown();
}

function doLogout() {
  clearTimeout(autoLogoutTimer);
  closeConfirm();
  sb.auth.signOut(); // sign out dari Supabase Auth
  state.loggedIn = false;
  state.user     = null;
  state.cateringData = [];
  state.sppData = [];
  invalidateCache();
  localStorage.removeItem('df_sb');
  document.getElementById('screen-main').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function clearCacheAndReload() {
  closeDropdown();
  state.cateringData = [];
  state.sppData = [];
  invalidateCache();
  localStorage.removeItem('df_sb');
  showToast('Cache dihapus, mengambil data terbaru...', 'success');
  loadAllData(true);
}

// ==========================================
// NAVIGATION
// ==========================================
let currentPage = 'dashboard';

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.animation = 'none';
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) {
    target.style.animation = 'none';
    target.offsetHeight;
    target.style.animation = '';
    target.classList.add('active');
  }
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  currentPage = page;
  closeDropdown();
  const titles = { dashboard: 'Dashboard', catering: 'Catering', spp: 'SPP', setting: 'Setting' };
  document.getElementById('header-title').textContent = titles[page] || page;
  if (page === 'catering')  renderCateringTable();
  if (page === 'spp')       renderSppTable();
  if (page === 'dashboard') updateDashboard();
  document.getElementById('main-content').scrollTop = 0;
}

// ==========================================
// DROPDOWN
// ==========================================
function toggleDropdown() { document.getElementById('dropdown-menu').classList.toggle('show'); }
function closeDropdown()   { document.getElementById('dropdown-menu').classList.remove('show'); }
document.addEventListener('click', (e) => {
  const dd  = document.getElementById('dropdown-menu');
  const btn = document.getElementById('btn-more');
  if (dd && !dd.contains(e.target) && !btn.contains(e.target)) closeDropdown();
});

// ==========================================
// DARK MODE
// ==========================================
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  applyDarkMode(); saveLocal(); closeDropdown();
}

function applyDarkMode() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  const label = state.darkMode ? 'Mode Terang' : 'Mode Gelap';
  const el1 = document.getElementById('theme-label');
  const el2 = document.getElementById('mode-label-setting');
  if (el1) el1.textContent = label;
  if (el2) el2.textContent = state.darkMode ? 'Dark' : 'Light';
  const icon = document.getElementById('theme-icon');
  if (icon) {
    if (state.darkMode) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
    else icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
  }
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadAllData(forceRefresh = false) {
  const refreshIcon = document.getElementById('refresh-icon');
  const cacheEl     = document.getElementById('cache-indicator');
  if (refreshIcon) refreshIcon.style.animation = 'spin 0.8s linear infinite';
  if (cacheEl)     cacheEl.textContent = forceRefresh ? '🔄 Mengambil data terbaru...' : '🔄 Memuat...';

  const needCatering = forceRefresh || !isCacheValid('catering') || !state.cateringData.length;
  const needSpp      = forceRefresh || !isCacheValid('spp')      || !state.sppData.length;
  const needSettings = forceRefresh || !isCacheValid('settings');

  if (!needCatering && !needSpp && !needSettings) {
    updateDashboard(); renderCateringTable(); renderSppTable(); updateSettingsUI();
    showCacheIndicator(); return;
  }

  const promises = [];
  if (needCatering) promises.push(callScript('getCatering').then(r => ({ key:'catering', r })));
  if (needSpp)      promises.push(callScript('getSpp')     .then(r => ({ key:'spp',      r })));
  if (needSettings) promises.push(callScript('getSettings').then(r => ({ key:'settings', r })));

  const results = await Promise.all(promises);

  results.forEach(({ key, r }) => {
    if (!r.success) { showToast('Gagal load ' + key + ': ' + r.error, 'error'); return; }
    if (key === 'catering') { state.cateringData = r.data; saveCacheTs('catering'); }
    if (key === 'spp')      { state.sppData      = r.data; saveCacheTs('spp'); }
    if (key === 'settings') {
      state.settings = { ...state.settings, ...r.data };
      if (r.data.kelasList?.length) kelasList = r.data.kelasList;
      if (r.data.kamarList?.length) kamarList = r.data.kamarList;
      saveCacheTs('settings');
    }
  });

  updateDashboard(); renderCateringTable(); renderSppTable(); updateSettingsUI();
  showCacheIndicator();
}

function showCacheIndicator() {
  const ts = state._cacheTs;
  if (!ts) return;
  const oldest = Math.min(ts.catering||0, ts.spp||0, ts.settings||0);
  if (!oldest) return;
  const selisih = Date.now() - oldest;
  const menit   = Math.floor(selisih / 60000);
  const detik   = Math.floor((selisih % 60000) / 1000);
  const label   = menit === 0 ? (detik < 5 ? 'Baru saja' : `${detik} detik lalu`)
                : menit < 60  ? `${menit} menit lalu` : 'Lebih dari 1 jam lalu';
  const el = document.getElementById('cache-indicator');
  if (el) el.textContent = '🕐 Data: ' + label;
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.style.animation = '';
}

// ==========================================
// DASHBOARD — hitung dari sppData
// ==========================================
function updateDashboard() {
  // Santri/wati dihitung dari sppData (data lebih lengkap)
  const displaySantri     = state.sppData.filter(x => x.gender === 'santri').length;
  const displaySantriwati = state.sppData.filter(x => x.gender === 'santriwati').length;
  const displayTotal      = displaySantri + displaySantriwati;

  document.getElementById('stat-santri').textContent     = displaySantri;
  document.getElementById('stat-santriwati').textContent = displaySantriwati;
  document.getElementById('stat-total').textContent      = displayTotal;
  document.getElementById('summary-total').textContent   = displayTotal + ' santri';

  const s = state.settings;
  document.getElementById('summary-catering').textContent = 'Rp ' + formatRp(s.tarifCatering);
  document.getElementById('summary-spp').textContent      = 'Rp ' + formatRp(s.tarifSpp);

  // Donut chart
  const circumference = 2 * Math.PI * 65;
  if (displayTotal > 0) {
    const santriLen     = circumference * (displaySantri / displayTotal);
    const santriwatiLen = circumference * (displaySantriwati / displayTotal);
    const ds  = document.getElementById('donut-santri');
    const dsw = document.getElementById('donut-santriwati');
    if (ds)  { ds.setAttribute('stroke-dasharray',  `${santriLen} ${circumference - santriLen}`); ds.setAttribute('stroke-dashoffset','0'); }
    if (dsw) { dsw.setAttribute('stroke-dasharray', `${santriwatiLen} ${circumference - santriwatiLen}`); dsw.setAttribute('stroke-dashoffset',`${-santriLen}`); }
  }
  const el = document.getElementById('donut-total-text');
  if (el) el.textContent = displayTotal;
  const sP  = displayTotal > 0 ? Math.round(displaySantri / displayTotal * 100) : 0;
  const swP = 100 - sP;
  const ls = document.getElementById('legend-santri');
  const lw = document.getElementById('legend-santriwati');
  if (ls) ls.textContent = `${displaySantri} (${sP}%)`;
  if (lw) lw.textContent = `${displaySantriwati} (${swP}%)`;

  if (!financeView.bulan) initFinanceView();
  loadFinanceDashboard();
  loadTotalTahun();
}
async function loadTotalTahun() {
  const tahun = new Date().getFullYear();
  const elNum = document.getElementById('stat-total-tahun');
  const elSub = document.getElementById('stat-total-tahun-sub');
  if (!elNum) return;

  const res = await callScript('getTotalTahunan', { tahun });

  if (res.success && res.data) {
    const d = res.data;
    elNum.textContent = 'Rp ' + formatRp(d.totalMasuk);
    elSub.textContent = `SPP: Rp ${formatRp(d.totalSpp)} · Catering: Rp ${formatRp(d.totalCatering)} · ${d.bulanAktif} bulan aktif`;
  } else {
    elNum.textContent = 'Rp 0';
    elSub.textContent = 'Gagal memuat data';
  }
}


const NAMA_BULAN_JS = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];

// State navigasi bulan keuangan
let financeView = { bulan: 0, tahun: 0 }; // diinit saat dashboard dibuka

function initFinanceView() {
  const now = new Date();
  financeView.bulan = now.getMonth() + 1; // 1-12
  financeView.tahun = now.getFullYear();
}

function navFinanceMonth(delta) {
  financeView.bulan += delta;
  if (financeView.bulan > 12) { financeView.bulan = 1;  financeView.tahun++; }
  if (financeView.bulan < 1)  { financeView.bulan = 12; financeView.tahun--; }
  loadFinanceDashboard();
}

async function loadFinanceDashboard() {
  const now      = new Date();
  const isNow    = financeView.bulan === (now.getMonth() + 1) && financeView.tahun === now.getFullYear();
  const isFuture = (financeView.tahun > now.getFullYear()) ||
                   (financeView.tahun === now.getFullYear() && financeView.bulan > now.getMonth() + 1);

  const btnNext = document.getElementById('btn-next-month');
  if (btnNext) btnNext.style.opacity = isNow || isFuture ? '0.3' : '1';
  if (btnNext) btnNext.style.pointerEvents = isNow || isFuture ? 'none' : '';

  const labelEl = document.getElementById('finance-month-label');
  if (labelEl) labelEl.textContent = NAMA_BULAN_JS[financeView.bulan - 1] + ' ' + financeView.tahun;

  const badge = document.getElementById('badge-bulanini');
  if (badge) badge.style.display = isNow ? 'inline-block' : 'none';

  const subtitle = document.getElementById('finance-subtitle');
  const content  = document.getElementById('finance-content');
  if (content) content.innerHTML = '<div class="finance-loading">⏳ Memuat data...</div>';

  if (isFuture) {
    if (subtitle) subtitle.textContent = 'Pilih bulan yang sudah lewat';
    if (content)  content.innerHTML = '<div class="finance-loading" style="color:var(--text-muted)">📅 Data belum tersedia</div>';
    return;
  }

  if (subtitle) subtitle.textContent = 'Data real-time dari Supabase';

  // Ambil data keuangan bulan ini
  const res = await callScript('getMonthlyFinance', { bulan: financeView.bulan, tahun: financeView.tahun });

  if (!res.success) {
    if (content) content.innerHTML = `<div class="finance-loading" style="color:var(--danger)">❌ ${res.error}</div>`;
    return;
  }

  const d = res.data;
  const sppPct = d.spp.total > 0     ? Math.round(d.spp.bayar / d.spp.total * 100)         : 0;
  const catPct = d.catering.total > 0 ? Math.round(d.catering.bayar / d.catering.total * 100) : 0;

  if (content) content.innerHTML = `
    <div class="finance-total-row">
      <div>
        <div class="finance-total-label">Total Uang Masuk</div>
        <div class="finance-total-amount">Rp ${formatRp(d.totalMasuk)}</div>
        <div class="finance-total-sub">${d.namaBulan} ${d.tahun}</div>
      </div>
      <svg fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" width="36" height="36">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>

    <div class="finance-cards">
      <div class="finance-card">
        <div class="finance-card-label">SPP</div>
        <div class="finance-card-amount text-green">Rp ${formatRp(d.spp.masuk)}</div>
        <div class="finance-card-sub">Lunas: <span>${d.spp.bayar}</span> / ${d.spp.total} santri</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${sppPct}%;background:#10b981"></div></div>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:3px;font-weight:600">${sppPct}% terbayar</div>
      </div>
      <div class="finance-card">
        <div class="finance-card-label">Catering</div>
        <div class="finance-card-amount" style="color:#f59e0b">Rp ${formatRp(d.catering.masuk)}</div>
        <div class="finance-card-sub">Lunas: <span>${d.catering.bayar}</span> / ${d.catering.total} santri</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${catPct}%;background:#f59e0b"></div></div>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:3px;font-weight:600">${catPct}% terbayar</div>
      </div>
    </div>

    <div class="finance-belum-row">
      <div>
        <div class="finance-belum-label">⚠️ Belum Terbayar</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:1px">
          SPP: ${d.spp.belum} santri &nbsp;|&nbsp; Catering: ${d.catering.belum} santri
        </div>
      </div>
      <div class="finance-belum-amount">Rp ${formatRp(d.totalBelum)}</div>
    </div>`;

  // Simpan detail tunggakan ke state agar bisa di-render saat expand
  // Gabungkan SPP & Catering belum bayar per nama santri
  const sppBelumList = d.spp.detail.filter(x => x.status === 'belum');
  const catBelumList = d.catering.detail.filter(x => x.status === 'belum');

  // Buat map per nama: { nama, kelas, kamar, sppBelum, catBelum }
  const namaMap = {};
  sppBelumList.forEach(x => {
    if (!namaMap[x.nama]) namaMap[x.nama] = { nama: x.nama, kelas: x.kelas, kamar: '', sppBelum: false, catBelum: false };
    namaMap[x.nama].sppBelum = true;
    namaMap[x.nama].kelas    = x.kelas || '';
  });
  catBelumList.forEach(x => {
    if (!namaMap[x.nama]) namaMap[x.nama] = { nama: x.nama, kelas: '', kamar: x.kamar, sppBelum: false, catBelum: false };
    namaMap[x.nama].catBelum = true;
    namaMap[x.nama].kamar    = x.kamar || '';
  });

  state.tunggakanData = {
    list:         Object.values(namaMap).sort((a,b) => a.nama.localeCompare(b.nama)),
    tarifSpp:     d.spp.tarif,
    tarifCatering:d.catering.tarif,
    namaBulan:    d.namaBulan + ' ' + d.tahun
  };

}


// Dialog konfirmasi timpa rekap — return Promise<boolean>

// ==========================================
// CATERING TABLE
// ==========================================
let catCurrentTab = 'santri';

function switchCatTab(tab) {
  catCurrentTab = tab;
  document.getElementById('cat-tab-santri').classList.toggle('active', tab === 'santri');
  document.getElementById('cat-tab-santriwati').classList.toggle('active', tab === 'santriwati');
  const s = document.getElementById('cat-search');
  if (s) s.value = '';
  renderCateringTable();
}

// ==========================================
// FILTER STATE
// ==========================================
let catFilter  = { kamar: '', status: 'semua' };
let sppFilter  = { kelas: '', status: 'semua' };

function toggleFilter(type) {
  const panel = document.getElementById('filter-panel-' + type);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    if (type === 'catering') renderFilterKamarBtns();
    if (type === 'spp')      renderFilterKelasBtns();
  }
  // Highlight tombol filter kalau ada filter aktif
  const btn = document.getElementById('btn-filter-' + type);
  const aktif = type === 'catering'
    ? (catFilter.kamar !== '' || catFilter.status !== 'semua')
    : (sppFilter.kelas !== '' || sppFilter.status !== 'semua');
  if (btn) btn.style.background = aktif ? 'var(--primary-light)' : '';
}

function renderFilterKamarBtns() {
  const wrap = document.getElementById('filter-kamar-btns');
  if (!wrap) return;
  const allKamar = ['', ...new Set(state.cateringData.map(x => x.kamar).filter(Boolean).sort())];
  wrap.innerHTML = allKamar.map(k => {
    const label = k || 'Semua';
    const active = catFilter.kamar === k;
    return `<button class="tab-btn ${active?'active':''}" onclick="setCatKamarFilter('${k}')" style="font-size:11px;padding:4px 10px">${label}</button>`;
  }).join('');
}

function renderFilterKelasBtns() {
  const wrap = document.getElementById('filter-kelas-btns');
  if (!wrap) return;
  const allKelas = ['', ...new Set(state.sppData.map(x => x.kelas).filter(Boolean).sort())];
  wrap.innerHTML = allKelas.map(k => {
    const label = k || 'Semua';
    const active = sppFilter.kelas === k;
    return `<button class="tab-btn ${active?'active':''}" onclick="setSppKelasFilter('${k.replace(/'/g,"\\'")}')"
      style="font-size:11px;padding:4px 10px">${label}</button>`;
  }).join('');
}

function setCatKamarFilter(val) {
  catFilter.kamar = val;
  renderFilterKamarBtns();
  _updateFilterBtn('catering');
  renderCateringTable();
}

function setCatStatusFilter(val) {
  catFilter.status = val;
  ['semua','lunas','belum'].forEach(v => {
    const el = document.getElementById('fcat-' + v);
    if (el) el.classList.toggle('active', v === val);
  });
  _updateFilterBtn('catering');
  renderCateringTable();
}

function setSppKelasFilter(val) {
  sppFilter.kelas = val;
  renderFilterKelasBtns();
  _updateFilterBtn('spp');
  renderSppTable();
}

function setSppStatusFilter(val) {
  sppFilter.status = val;
  ['semua','lunas','belum'].forEach(v => {
    const el = document.getElementById('fspp-' + v);
    if (el) el.classList.toggle('active', v === val);
  });
  _updateFilterBtn('spp');
  renderSppTable();
}

function _updateFilterBtn(type) {
  const btn = document.getElementById('btn-filter-' + type);
  if (!btn) return;
  const aktif = type === 'catering'
    ? (catFilter.kamar !== '' || catFilter.status !== 'semua')
    : (sppFilter.kelas !== '' || sppFilter.status !== 'semua');
  btn.style.background = aktif ? 'var(--primary-light)' : '';
  btn.style.color      = aktif ? 'var(--primary)' : '';
}

function _applyStatusFilter(rows, type) {
  const now     = new Date();
  const blnIdx  = now.getMonth(); // 0-based
  const status  = type === 'catering' ? catFilter.status : sppFilter.status;
  if (status === 'semua') return rows;
  return rows.filter(r => {
    const lunas = r.months?.[blnIdx] === true;
    return status === 'lunas' ? lunas : !lunas;
  });
}


function renderCateringTable() {
  const q = (document.getElementById('cat-search')?.value || '').toLowerCase();
  let data = state.cateringData.filter(x => x.gender === catCurrentTab);
  if (catFilter.kamar) data = data.filter(x => x.kamar === catFilter.kamar);
  data = _applyStatusFilter(data, 'catering');
  const filtered = q ? data.filter(x =>
    (x.nama||'').toLowerCase().includes(q) ||
    (x.bin||'').toLowerCase().includes(q) ||
    (x.kamar||'').toLowerCase().includes(q)
  ) : data;

  const tbody = document.getElementById('catering-tbody');
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="18"><div class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p>Belum ada data</p></div></td></tr>`;
    return;
  }
  const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  tbody.innerHTML = filtered.map((row, i) => {
    const months = row.months || Array(12).fill(false);
    const monthsHtml = months.map((m, idx) => `<div class="month-check ${m?'checked':''}">${MONTH_LABELS[idx]}</div>`).join('');
    return `<tr>
      <td>${i+1}</td>
      <td onclick="openEditModal('catering','${row.id}')" style="cursor:pointer;max-width:160px;padding-right:4px">
        <div style="display:flex;flex-direction:column;gap:2px">
          <strong style="color:var(--primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;display:block">${row.nama||''}</strong>
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">${catCurrentTab==='santri'?'bin':'binti'} ${row.bin||''}</span>
        </div>
      </td>
      <td class="small" style="padding-left:4px">${row.kamar||''}</td>
      <td class="small">${row.alamat||''}</td>
      <td colspan="12"><div class="month-checks">${monthsHtml}</div></td>
      <td><div class="action-btns">
        <button class="btn-action btn-edit" onclick="openEditModal('catering','${row.id}')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button class="btn-action btn-delete" onclick="confirmDelete('catering','${row.id}','${(row.nama||'').replace(/'/g,"\\'")}')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div></td>
    </tr>`;
  }).join('');
}

// ==========================================
// SPP TABLE
// ==========================================
let sppCurrentTab = 'santri';

function switchSppTab(tab) {
  sppCurrentTab = tab;
  document.getElementById('spp-tab-santri').classList.toggle('active', tab === 'santri');
  document.getElementById('spp-tab-santriwati').classList.toggle('active', tab === 'santriwati');
  // Clear search saat ganti tab supaya hasil tidak tercampur
  const s = document.getElementById('spp-search');
  if (s) s.value = '';
  renderSppTable();
}

function renderSppTable() {
  const q = (document.getElementById('spp-search')?.value || '').toLowerCase();
  let data = state.sppData.filter(x => x.gender === sppCurrentTab);
  if (sppFilter.kelas) data = data.filter(x => x.kelas === sppFilter.kelas);
  data = _applyStatusFilter(data, 'spp');
  const filtered = q ? data.filter(x =>
    (x.nama||'').toLowerCase().includes(q) ||
    (x.bin||'').toLowerCase().includes(q) ||
    (x.kelas||'').toLowerCase().includes(q)
  ) : data;

  const tbody = document.getElementById('spp-tbody');
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="18"><div class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p>Belum ada data</p></div></td></tr>`;
    return;
  }
  const binLabel = sppCurrentTab === 'santri' ? 'bin' : 'binti';
  const MONTH_LABELS_SPP = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  tbody.innerHTML = filtered.map((row, i) => {
    const months = row.months || Array(12).fill(false);
    const monthsHtml = months.map((m, idx) => `<div class="month-check ${m?'checked':''}">${MONTH_LABELS_SPP[idx]}</div>`).join('');
    return `<tr>
      <td>${i+1}</td>
      <td onclick="openEditModal('spp','${row.id}')" style="cursor:pointer;max-width:160px;padding-right:4px">
        <div style="display:flex;flex-direction:column;gap:2px">
          <strong style="color:var(--primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;display:block">${row.nama||''}</strong>
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap">${binLabel} ${row.bin||''}</span>
        </div>
      </td>
      <td class="small" style="white-space:nowrap;padding-left:4px">${row.kelas||''}</td>
      <td class="small">${row.tahunAjaran||state.settings.tahunAjaran}</td>
      <td class="small">${row.alamat||'-'}</td>
      <td colspan="12"><div class="month-checks">${monthsHtml}</div></td>
      <td><div class="action-btns">
        <button class="btn-action btn-edit" onclick="openEditModal('spp','${row.id}')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
        <button class="btn-action btn-delete" onclick="confirmDelete('spp','${row.id}','${(row.nama||'').replace(/'/g,"\\'")}')">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div></td>
    </tr>`;
  }).join('');
}

// ==========================================
// MODAL
// ==========================================
function openAddModal(type) {
  state.modal = { type, mode: 'add', editId: null };
  document.getElementById('modal-title').textContent = `Tambah Data ${type === 'catering' ? 'Catering' : 'SPP'}`;
  document.getElementById('btn-save-text').textContent = 'Simpan';
  renderModalForm(type, null);
  showModal();
}

function openEditModal(type, id) {
  const data = type === 'catering' 
    ? state.cateringData.find(x => x.id === id)
    : state.sppData.find(x => x.id === id);
  if (!data) return;
  state.modal = { type, mode: 'edit', editId: id };
  document.getElementById('modal-title').textContent = `Edit Data ${type === 'catering' ? 'Catering' : 'SPP'}`;
  document.getElementById('btn-save-text').textContent = 'Update';
  renderModalForm(type, data);
  showModal();
}

function renderModalForm(type, data) {
  const gender = type === 'catering' ? catCurrentTab : sppCurrentTab;
  const binLabel = gender === 'santri' ? 'Bin' : 'Binti';
  const months = data?.months || Array(12).fill(false);

  const monthButtons = MONTHS.map((m, i) =>
    `<button type="button" class="month-toggle-btn ${months[i] ? 'checked' : ''}" 
      onclick="toggleMonth(this, ${i})" data-idx="${i}">${m}</button>`
  ).join('');

  // Build kamar & kelas options dari state list
  // Jika nilai data tidak ada di list, tambahkan sementara agar tidak kosong saat edit
  const kamarListFinal = (data?.kamar && !kamarList.includes(data.kamar))
    ? [data.kamar, ...kamarList] : kamarList;
  const kelasListFinal = (data?.kelas && !kelasList.includes(data.kelas))
    ? [data.kelas, ...kelasList] : kelasList;

  const kamarOpts = kamarListFinal.map(k =>
    `<option value="${k}" ${data?.kamar===k?'selected':''}>${k}</option>`).join('');
  const kelasOpts = kelasListFinal.map(k =>
    `<option value="${k}" ${data?.kelas===k?'selected':''}>${k}</option>`).join('');

  let html = `<div class="modal-form">
    <div class="form-group">
      <label>Nama Santri</label>
      <input type="text" id="f-nama" value="${data?.nama||''}" placeholder="Nama lengkap santri">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>${binLabel}</label>
        <input type="text" id="f-bin" value="${data?.bin||''}" placeholder="Nama ayah...">
      </div>`;

  if (type === 'catering') {
    html += `<div class="form-group">
        <label>Kamar</label>
        <select id="f-kamar">
          <option value="">-- Pilih Kamar --</option>
          ${kamarOpts}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Alamat</label>
      <input type="text" id="f-alamat" value="${data?.alamat||''}" placeholder="Alamat lengkap">
    </div>`;
  } else {
    html += `<div class="form-group">
        <label>Kelas</label>
        <select id="f-kelas">
          <option value="">-- Pilih Kelas --</option>
          ${kelasOpts}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Tahun Ajaran</label>
      <input type="text" id="f-tahun" value="${data?.tahunAjaran||state.settings.tahunAjaran}" placeholder="2024/2025">
    </div>
    <div class="form-group">
      <label>Alamat</label>
      <input type="text" id="f-alamat-spp" value="${data?.alamat||''}" placeholder="Alamat lengkap">
    </div>`;
  }

  html += `<div class="form-group">
      <label>Status Pembayaran Bulanan</label>
      <div class="months-grid">${monthButtons}</div>
    </div>
  </div>`;

  document.getElementById('modal-body').innerHTML = html;

  // Set nilai select SETELAH innerHTML di-set
  // Gunakan requestAnimationFrame agar DOM benar-benar siap sebelum set .value
  requestAnimationFrame(() => {
    if (type === 'catering' && data?.kamar) {
      const selKamar = document.getElementById('f-kamar');
      if (selKamar) selKamar.value = data.kamar;
    }
    if (type === 'spp' && data?.kelas) {
      const selKelas = document.getElementById('f-kelas');
      if (selKelas) selKelas.value = data.kelas;
    }
  });
}

function toggleMonth(btn, idx) {
  btn.classList.toggle('checked');
}

function showModal() {
  document.getElementById('modal-overlay').classList.add('show');
  document.body.classList.add('modal-open');
  // Tidak auto-focus agar keyboard tidak langsung muncul saat modal dibuka
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.body.classList.remove('modal-open');
  // Reset posisi modal (dari keyboard fix)
  const modal = document.getElementById('modal-sheet');
  modal.style.transform = '';
  modal.style.maxHeight = '92vh';
  modal.style.borderRadius = '';
  state.modal = { type: null, mode: null, editId: null };
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

async function saveModal() {
  const { type, mode, editId } = state.modal;
  if (!type) return;

  const namaRaw = document.getElementById('f-nama')?.value?.trim();
  const binRaw = document.getElementById('f-bin')?.value?.trim();
  const nama = namaRaw;  // akan di-capitalize di bawah per jenis
  const bin = binRaw;
  if (!namaRaw || !binRaw) { showToast('Nama dan Bin/Binti harus diisi', 'error'); return; }

  const monthBtns = document.querySelectorAll('.month-toggle-btn');
  const months = Array.from(monthBtns).map(b => b.classList.contains('checked'));

  let item;
  if (type === 'catering') {
    const kamar = document.getElementById('f-kamar')?.value || '';
    const alamat = toSentenceCase(document.getElementById('f-alamat')?.value || '');
    item = { id: editId || null, gender: catCurrentTab, nama: toTitleCase(nama), bin: toTitleCase(bin), kamar, alamat, months };
  } else {
    const kelas = document.getElementById('f-kelas')?.value || '';
    const tahunAjaran = document.getElementById('f-tahun')?.value?.trim();
    const alamatSpp = toSentenceCase(document.getElementById('f-alamat-spp')?.value || '');
    item = { id: editId || null, gender: sppCurrentTab, nama: toTitleCase(nama), bin: toTitleCase(bin), kelas, tahunAjaran, alamat: alamatSpp, months };
  }

  document.getElementById('btn-save-text').innerHTML = '<span class="loading-spinner"></span>';
  document.getElementById('btn-save').disabled = true;

  const action = type === 'catering' ? 'saveCatering' : 'saveSpp';
  const res = await callScript(action, { mode, item });

  document.getElementById('btn-save').disabled = false;
  document.getElementById('btn-save-text').textContent = mode === 'add' ? 'Simpan' : 'Update';

  if (res.success) {
    closeModal();
    if (type === 'catering') { const r = await callScript('getCatering'); if(r.success) state.cateringData = r.data; renderCateringTable(); }
    else { const r = await callScript('getSpp'); if(r.success) state.sppData = r.data; renderSppTable(); }
    updateDashboard();
    // Invalidate cache agar next loadAllData fetch ulang dari server
    invalidateCache(type === 'catering' ? 'catering' : 'spp');
    showToast(mode === 'add' ? 'Data berhasil ditambahkan' : 'Data berhasil diperbarui', 'success');
  } else {
    showToast(res.error || 'Gagal menyimpan data', 'error');
  }
}

// ==========================================
// CONFIRM DELETE
// ==========================================
let pendingDelete = null;

function confirmDelete(type, id, nama) {
  pendingDelete = { type, id };
  document.getElementById('confirm-text').textContent = `Data "${nama}" akan dihapus secara permanen.`;
  document.getElementById('btn-confirm-yes').onclick = doConfirm;
  document.getElementById('confirm-dialog').classList.add('show');
}

function closeConfirm() {
  document.getElementById('confirm-dialog').classList.remove('show');
  pendingDelete = null;
}

async function doConfirm() {
  if (!pendingDelete) { closeConfirm(); return; }
  const { type, id } = pendingDelete;
  const action = type === 'catering' ? 'deleteCatering' : 'deleteSpp';
  const res = await callScript(action, { id });
  closeConfirm();
  if (res.success) {
    if (type === 'catering') { const r = await callScript('getCatering'); if(r.success) state.cateringData = r.data; invalidateCache('catering'); renderCateringTable(); }
    else { const r = await callScript('getSpp'); if(r.success) state.sppData = r.data; invalidateCache('spp'); renderSppTable(); }
    updateDashboard();
    showToast('Data berhasil dihapus', 'success');
  } else {
    showToast(res.error || 'Gagal menghapus data', 'error');
  }
}

// ==========================================
// SETTINGS & SUB PAGES
// ==========================================
function openSubPage(name) {
  const el = document.getElementById('sub-' + name);
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('show'));
  // Pre-fill values
  if (name === 'tarif-catering') document.getElementById('input-tarif-catering').value = state.settings.tarifCatering || '';
  if (name === 'tarif-spp') document.getElementById('input-tarif-spp').value = state.settings.tarifSpp || '';
  if (name === 'tahun-ajaran') document.getElementById('input-tahun-ajaran').value = state.settings.tahunAjaran || '';
  if (name === 'data-kelas') renderKelasContent();
  if (name === 'data-kamar') renderKamarContent();
  if (name === 'laporan-tunggakan') initLaporanTunggakan();
  if (name === 'reset-centang') initResetCentang();
}

function closeSubPage(name) {
  const el = document.getElementById('sub-' + name);
  if (!el) return;
  el.classList.remove('show');
  setTimeout(() => { el.style.display = 'none'; }, 300);
}


async function saveTarifCatering() {
  const val = parseInt(document.getElementById('input-tarif-catering').value) || 0;
  state.settings.tarifCatering = val;
  await callScript('saveSettings', { settings: { tarifCatering: val } });
  invalidateCache('settings');
  updateSettingsUI(); updateDashboard();
  closeSubPage('tarif-catering');
  showToast('Tarif catering disimpan', 'success');
}

async function saveTarifSpp() {
  const val = parseInt(document.getElementById('input-tarif-spp').value) || 0;
  state.settings.tarifSpp = val;
  await callScript('saveSettings', { settings: { tarifSpp: val } });
  invalidateCache('settings');
  updateSettingsUI(); updateDashboard();
  closeSubPage('tarif-spp');
  showToast('Tarif SPP disimpan', 'success');
}


async function saveTahunAjaran() {
  const val = document.getElementById('input-tahun-ajaran').value.trim();
  if (!val) { showToast('Tahun ajaran tidak boleh kosong', 'error'); return; }
  state.settings.tahunAjaran = val;
  await callScript('saveSettings', { settings: { tahunAjaran: val } });
  updateSettingsUI();
  closeSubPage('tahun-ajaran');
  showToast('Tahun ajaran disimpan', 'success');
}


function updateSettingsUI() {
  const s = state.settings;
  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('show-tarif-catering', 'Rp ' + formatRp(s.tarifCatering));
  el('show-tarif-spp', 'Rp ' + formatRp(s.tarifSpp));
  el('show-tahun-ajaran', s.tahunAjaran);
}

function updateProfileUI() {
  if (!state.user) return;
  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('profile-name', state.user.name || 'Admin Pondok');
  el('profile-role', state.user.role || 'Admin');
  el('avatar-letter', (state.user.name || 'A').charAt(0).toUpperCase());
  const greeting = document.getElementById('header-greeting');
  const hour = new Date().getHours();
  const greet = hour < 10 ? 'Selamat Pagi ☀️' : hour < 15 ? 'Selamat Siang 🌤' : hour < 18 ? 'Selamat Sore 🌅' : 'Selamat Malam 🌙';
  if (greeting) greeting.textContent = greet;
}

// ==========================================
// KELAS & KAMAR MANAGEMENT
// ==========================================
let kelasList = ['Awaliyah A','Awaliyah B','Awaliyah C','1 Wushto A','1 Wustho B','1 Wustho C','2 Wustho A','2 Wustho B','2 Wushto C','3 Wustho A','3 Wustho B','3 Wushto C','1 Ulya A','1 Ulya B','1 Ulya C','2 Ulya A','2 Ulya B','2 Ulya C','3 Ulya A','3 Ulya B','3 Ulya C'];
let kamarList = ['Kamar 01','Kamar 02','Kamar 03','Kamar 04','Kamar 05'];

function renderKelasContent() {
  const el = document.getElementById('kelas-content');
  if (!el) return;
  el.innerHTML = `
    <div class="section-card">
      <div class="modal-form">
        <div class="form-group"><label>Tambah Kelas Baru</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="input-kelas-baru" placeholder="Contoh: 7A" style="flex:1">
            <button class="btn-add" onclick="addKelas()" style="flex-shrink:0">Tambah</button>
          </div>
        </div>
      </div>
    </div>
    <div class="section-card">
      ${kelasList.map((k,i) => `
        <div class="setting-row" style="cursor:default">
          <div class="setting-row-info"><p>${k}</p></div>
          <button class="btn-action btn-delete" style="width:32px;height:32px" onclick="deleteKelas(${i})">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>`).join('')}
    </div>`;
}

async function addKelas() {
  const val = document.getElementById('input-kelas-baru')?.value?.trim();
  if (!val) return;
  const formatted = val.toUpperCase();
  if (!kelasList.includes(formatted)) {
    kelasList.push(formatted);
    await callScript('saveSettings', { settings: { kelasList: kelasList } });
    saveLocal();
  }
  document.getElementById('input-kelas-baru').value = '';
  renderKelasContent();
  showToast('Kelas ' + formatted + ' ditambahkan', 'success');
}

async function deleteKelas(idx) {
  kelasList.splice(idx, 1);
  await callScript('saveSettings', { settings: { kelasList: kelasList } });
  saveLocal();
  renderKelasContent();
  showToast('Kelas dihapus', 'success');
}

function renderKamarContent() {
  const el = document.getElementById('kamar-content');
  if (!el) return;
  el.innerHTML = `
    <div class="section-card">
      <div class="modal-form">
        <div class="form-group"><label>Tambah Kamar Baru</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="input-kamar-baru" placeholder="Contoh: Kamar 06" style="flex:1">
            <button class="btn-add" onclick="addKamar()" style="flex-shrink:0">Tambah</button>
          </div>
        </div>
      </div>
    </div>
    <div class="section-card">
      ${kamarList.map((k,i) => `
        <div class="setting-row" style="cursor:default">
          <div class="setting-row-info"><p>${k}</p></div>
          <button class="btn-action btn-delete" style="width:32px;height:32px" onclick="deleteKamar(${i})">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>`).join('')}
    </div>`;
}

async function addKamar() {
  const val = document.getElementById('input-kamar-baru')?.value?.trim();
  if (!val) return;
  if (!kamarList.includes(val)) {
    kamarList.push(val);
    await callScript('saveSettings', { settings: { kamarList: kamarList } });
    saveLocal();
  }
  document.getElementById('input-kamar-baru').value = '';
  renderKamarContent();
  showToast('Kamar ' + val + ' ditambahkan', 'success');
}

async function deleteKamar(idx) {
  kamarList.splice(idx, 1);
  await callScript('saveSettings', { settings: { kamarList: kamarList } });
  saveLocal();
  renderKamarContent();
  showToast('Kamar dihapus', 'success');
}

// ==========================================
// TOAST
// ==========================================
let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  const el = document.getElementById('toast');
  el.innerHTML = `<div class="toast-msg ${type}">${msg}</div>`;
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, 3000);
}

// ==========================================
// UTILS
// ==========================================
function formatRp(num) {
  if (!num) return '0';
  return parseInt(num).toLocaleString('id-ID');
}

// Kapitalisasi huruf awal setiap kata
function toTitleCase(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Kapitalisasi hanya huruf pertama kalimat
function toSentenceCase(str) {
  if (!str) return '';
  const s = str.trim().replace(/\s+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ==========================================
// KEYBOARD FIX (Android)
// ==========================================
function handleViewportResize() {
  const visualH = window.visualViewport?.height || window.innerHeight;
  const keyboardH = Math.max(0, window.innerHeight - visualH);
  const keyboardOpen = keyboardH > 80;

  // Fix modal-sheet
  const modal = document.getElementById('modal-sheet');
  const overlay = document.getElementById('modal-overlay');
  if (modal && overlay && overlay.classList.contains('show')) {
    if (keyboardOpen) {
      modal.style.transform = `translateY(-${keyboardH}px)`;
      modal.style.maxHeight = (visualH * 0.98) + 'px';
      modal.style.borderRadius = '16px 16px 0 0';
    } else {
      modal.style.transform = '';
      modal.style.maxHeight = '92vh';
      modal.style.borderRadius = '';
    }
  }

  // Fix sub-page: scroll input yang aktif agar tidak tertutup keyboard
  const activeEl = document.activeElement;
  if (keyboardOpen && activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
    const subPage = activeEl.closest('.sub-page');
    if (subPage) {
      // Beri jeda agar keyboard selesai muncul, lalu scroll ke input
      setTimeout(() => {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
    // Fix layar utama (login, search bar)
    const screenMain = activeEl.closest('#screen-main, #screen-login');
    if (screenMain && !subPage) {
      setTimeout(() => {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }

  // Pastikan tinggi layar tidak "nyangkut" saat keyboard tutup
  if (!keyboardOpen) {
    document.body.style.minHeight = '';
    window.scrollTo(0, 0);
  }
}

// Pasang listener focus untuk semua input agar scroll otomatis
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') return;
  // Tunda agar keyboard sempat muncul
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', handleViewportResize);
  window.visualViewport.addEventListener('scroll', handleViewportResize);
}

// ==========================================
// AUTO LOGOUT — 30 menit tidak aktif
// ==========================================
const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30 menit
let autoLogoutTimer;

function resetAutoLogout() {
  clearTimeout(autoLogoutTimer);
  if (state.loggedIn) {
    autoLogoutTimer = setTimeout(() => {
      if (state.loggedIn) {
        
        showToast('Sesi berakhir. Silakan login kembali.', 'error');
        setTimeout(() => doLogout(), 1500);
      }
    }, AUTO_LOGOUT_MS);
  }
}

// Reset timer saat ada aktivitas pengguna
['touchstart','touchend','click','keydown','scroll'].forEach(evt => {
  document.addEventListener(evt, resetAutoLogout, { passive: true });
});

// ==========================================
let laporanView = { bulan: 0, tahun: 0, tab: 'semua' };

function initLaporanTunggakan() {
  const now = new Date();
  if (!laporanView.bulan) {
    laporanView.bulan = now.getMonth() + 1;
    laporanView.tahun = now.getFullYear();
    laporanView.tab   = 'semua';
  }
  renderLaporanBulanLabel();
  loadLaporanTunggakan();
}

function renderLaporanBulanLabel() {
  const now      = new Date();
  const isNow    = laporanView.bulan === now.getMonth() + 1 && laporanView.tahun === now.getFullYear();
  const isFuture = laporanView.tahun > now.getFullYear() ||
                  (laporanView.tahun === now.getFullYear() && laporanView.bulan > now.getMonth() + 1);
  const label = document.getElementById('tunggakan-month-label');
  const btnNext = document.getElementById('tunggakan-btn-next');
  if (label) label.textContent = MONTHS_FULL[laporanView.bulan - 1] + ' ' + laporanView.tahun;
  if (btnNext) {
    btnNext.style.opacity      = isNow || isFuture ? '0.3' : '1';
    btnNext.style.pointerEvents = isNow || isFuture ? 'none' : '';
  }
}

function navTunggakanMonth(delta) {
  laporanView.bulan += delta;
  if (laporanView.bulan > 12) { laporanView.bulan = 1;  laporanView.tahun++; }
  if (laporanView.bulan < 1)  { laporanView.bulan = 12; laporanView.tahun--; }
  renderLaporanBulanLabel();
  loadLaporanTunggakan();
}

function switchLaporanTab(tab) {
  laporanView.tab = tab;
  ['semua','spp','catering'].forEach(t => {
    const el = document.getElementById('ltab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  renderLaporanList();
}

async function loadLaporanTunggakan() {
  const tbody     = document.getElementById('laporan-tbody');
  const summaryEl = document.getElementById('laporan-summary');
  const btnPdf    = document.getElementById('btn-export-pdf');

  if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">⏳ Memuat data...</td></tr>';
  if (summaryEl) summaryEl.innerHTML = '';
  if (btnPdf) btnPdf.style.display = 'none';

  const res = await callScript('getMonthlyFinance', { bulan: laporanView.bulan, tahun: laporanView.tahun });
  if (!res.success) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--danger)">❌ ${res.error}</td></tr>`;
    return;
  }

  const d = res.data;

  // Simpan list terpisah per jenis — TIDAK digabung by nama agar data akurat
  const sppList = d.spp.detail
    .filter(x => x.status === 'belum')
    .map(x => ({
      nama:    x.nama,
      bin:     x.bin  || '',
      gender:  x.gender || 'santri',
      sub:     x.kelas || '-',
      jenis:   'spp',
      nominal: d.spp.tarif
    }));

  const catList = d.catering.detail
    .filter(x => x.status === 'belum')
    .map(x => ({
      nama:    x.nama,
      bin:     x.bin  || '',
      gender:  x.gender || 'santri',
      sub:     x.kamar || '-',
      jenis:   'catering',
      nominal: d.catering.tarif
    }));

  laporanView.data = {
    sppList,
    catList,
    tarifSpp:      d.spp.tarif,
    tarifCatering: d.catering.tarif,
    namaBulan:     d.namaBulan + ' ' + d.tahun,
    totalBelum:    d.totalBelum,
    sppBelum:      d.spp.belum,
    catBelum:      d.catering.belum,
    sppTotal:      d.spp.total,
    catTotal:      d.catering.total
  };

  // Summary ringkas — satu baris horizontal
  if (summaryEl) summaryEl.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1;background:rgba(239,68,68,0.07);border:1.5px solid rgba(239,68,68,0.2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;color:var(--danger);letter-spacing:.4px">SPP BELUM</div>
        <div style="font-size:18px;font-weight:800;color:var(--danger)">${d.spp.belum} <span style="font-size:11px;font-weight:600;opacity:.7">/ ${d.spp.total}</span></div>
      </div>
      <div style="flex:1;background:rgba(245,158,11,0.07);border:1.5px solid rgba(245,158,11,0.2);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;color:#d97706;letter-spacing:.4px">CATERING BELUM</div>
        <div style="font-size:18px;font-weight:800;color:#d97706">${d.catering.belum} <span style="font-size:11px;font-weight:600;opacity:.7">/ ${d.catering.total}</span></div>
      </div>
      <div style="flex:1;background:rgba(239,68,68,0.05);border:1.5px solid rgba(239,68,68,0.15);border-radius:10px;padding:10px 12px">
        <div style="font-size:10px;font-weight:700;color:var(--danger);letter-spacing:.4px">TOTAL</div>
        <div style="font-size:13px;font-weight:800;color:var(--danger)">Rp ${formatRp(d.totalBelum)}</div>
      </div>
    </div>`;

  if (btnPdf) btnPdf.style.display = '';
  renderLaporanList();
}

function renderLaporanList() {
  const tbody = document.getElementById('laporan-tbody');
  if (!tbody || !laporanView.data) return;
  const { sppList, catList } = laporanView.data;
  const tab = laporanView.tab;

  // Tentukan data berdasarkan tab
  let filtered = [];
  if (tab === 'semua') {
    // Gabung SPP + Catering, urutkan nama
    filtered = [
      ...sppList.map(x => ({ ...x, jenisLabel: 'SPP',      badgeClass: 'badge-spp' })),
      ...catList.map(x => ({ ...x, jenisLabel: 'Catering', badgeClass: 'badge-cat' }))
    ].sort((a,b) => a.nama.localeCompare(b.nama));
  } else if (tab === 'spp') {
    filtered = sppList.map(x => ({ ...x, jenisLabel: 'SPP', badgeClass: 'badge-spp' }));
  } else {
    filtered = catList.map(x => ({ ...x, jenisLabel: 'Catering', badgeClass: 'badge-cat' }));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">✅ Semua ${tab === 'spp' ? 'SPP' : tab === 'catering' ? 'Catering' : 'pembayaran'} sudah lunas</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((x, i) => {
    const binLabel = x.gender === 'santriwati' ? 'binti' : 'bin';
    const binText  = x.bin ? `<div style="font-size:10px;color:var(--text-muted);margin-top:1px">${binLabel} ${x.bin}</div>` : '';
    return `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td><strong>${x.nama}</strong>${binText}</td>
      <td class="small">${x.sub}</td>
      <td><span class="${x.badgeClass}" style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px">${x.jenisLabel}</span></td>
      <td style="text-align:right;font-weight:700;color:var(--danger);white-space:nowrap">Rp ${formatRp(x.nominal)}</td>
    </tr>`;
  }).join('');
}

function exportTunggakanPDF() {
  if (!laporanView.data) return;
  const { sppList, catList, namaBulan, totalBelum } = laporanView.data;
  const tab = laporanView.tab;

  let filtered = [];
  let labelTab = '';
  if (tab === 'semua') {
    filtered = [
      ...sppList.map(x => ({ ...x, jenisLabel: 'SPP' })),
      ...catList.map(x => ({ ...x, jenisLabel: 'Catering' }))
    ].sort((a,b) => a.nama.localeCompare(b.nama));
    labelTab = 'SPP & Catering';
  } else if (tab === 'spp') {
    filtered = sppList.map(x => ({ ...x, jenisLabel: 'SPP' }));
    labelTab = 'SPP';
  } else {
    filtered = catList.map(x => ({ ...x, jenisLabel: 'Catering' }));
    labelTab = 'Catering';
  }

  const tglCetak = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
  const totalPiutang = filtered.reduce((s, x) => s + x.nominal, 0);

  const rows = filtered.map((x, i) => {
    const binLabel = x.gender === 'santriwati' ? 'binti' : 'bin';
    const binText  = x.bin ? `<div style="font-size:10px;color:#888">${binLabel} ${x.bin}</div>` : '';
    return `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td>${x.nama}${binText}</td>
      <td>${x.sub}</td>
      <td style="text-align:center">${x.jenisLabel}</td>
      <td style="text-align:right">Rp ${formatRp(x.nominal)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Laporan Tunggakan ${labelTab} - ${namaBulan}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1a56db; padding-bottom: 12px; }
  .header h1 { font-size: 16px; font-weight: 800; color: #1a56db; }
  .header p  { font-size: 12px; color: #555; margin-top: 3px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 11px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #1a56db; color: white; padding: 8px 10px; font-size: 11px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .total-row td { font-weight: 800; background: #fef3f2; color: #dc2626; border-top: 2px solid #dc2626; }
  .footer { text-align: right; font-size: 11px; color: #888; margin-top: 16px; }
  @media print { body { padding: 12px; } }
</style>
</head><body>
<div class="header">
  <h1>LAPORAN TUNGGAKAN ${labelTab.toUpperCase()}</h1>
  <p>Pondok Pesantren Darul Falah Gambut</p>
  <p style="font-weight:700;color:#111;margin-top:4px">Bulan: ${namaBulan}</p>
</div>
<div class="meta">
  <span>Jumlah: <strong>${filtered.length} data</strong></span>
  <span>Dicetak: ${tglCetak}</span>
</div>
<table>
  <thead><tr>
    <th style="width:36px;text-align:center">No</th>
    <th>Nama Santri</th>
    <th>Kelas / Kamar</th>
    <th style="text-align:center">Jenis</th>
    <th style="text-align:right">Nominal</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Total Piutang</td>
      <td style="text-align:right">Rp ${formatRp(totalPiutang)}</td>
    </tr>
  </tbody>
</table>
<div class="footer">Laporan digenerate otomatis · ${tglCetak}</div>
</body></html>`;

  // Buka via Blob URL — tidak diblokir popup blocker browser/mobile
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.target   = '_blank';
  a.rel      = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ==========================================
// ==========================================
// RESET CENTANG BULAN
// ==========================================
function initResetCentang() {
  // Reset input dan tombol setiap kali sub-page dibuka
  const inp = document.getElementById('reset-konfirm-input');
  const btn = document.getElementById('btn-reset-centang');
  const cbSpp = document.getElementById('reset-spp');
  const cbCat = document.getElementById('reset-catering');
  if (inp) inp.value = '';
  if (cbSpp) cbSpp.checked = true;
  if (cbCat) cbCat.checked = true;
  if (btn) {
    btn.disabled = true;
    btn.style.background = '#9ca3af';
    btn.style.cursor = 'not-allowed';
  }
}

function checkResetKonfirm() {
  const val = (document.getElementById('reset-konfirm-input')?.value || '').trim().toUpperCase();
  const btn = document.getElementById('btn-reset-centang');
  if (!btn) return;
  if (val === 'RESET') {
    btn.disabled = false;
    btn.style.background = '#ef4444';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.background = '#9ca3af';
    btn.style.cursor = 'not-allowed';
  }
}

async function jalankanReset() {
  const resetSpp = document.getElementById('reset-spp')?.checked;
  const resetCat = document.getElementById('reset-catering')?.checked;

  if (!resetSpp && !resetCat) {
    showToast('Pilih minimal satu: SPP atau Catering', 'error');
    return;
  }

  const target = resetSpp && resetCat ? 'SPP & Catering'
               : resetSpp ? 'SPP' : 'Catering';

  // Konfirmasi terakhir pakai dialog bawaan
  document.getElementById('confirm-text').textContent =
    `Semua centang bulan ${target} akan dihapus permanen. Data rekap yang sudah disimpan tetap aman. Lanjutkan?`;
  document.getElementById('btn-confirm-yes').onclick = () => {
    closeConfirm();
    eksekusiReset(resetSpp, resetCat);
  };
  document.getElementById('confirm-dialog').classList.add('show');
}

async function eksekusiReset(resetSpp, resetCat) {
  const btn = document.getElementById('btn-reset-centang');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg style="animation:spin 1s linear infinite" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg> Mereset data...`;
    btn.style.background = '#9ca3af';
  }

  const res = await callScript('resetCentangBulan', { resetSpp, resetCat });

  if (res.success) {
    showToast(`✅ ${res.message}`, 'success');
    const inp = document.getElementById('reset-konfirm-input');
    if (inp) inp.value = '';
    invalidateCache(); // invalidate semua cache
    await loadAllData(true);
  } else {
    showToast(`❌ Gagal: ${res.error}`, 'error');
  }

  // Kembalikan tombol
  if (btn) {
    btn.disabled = true;
    btn.style.background = '#9ca3af';
    btn.style.cursor = 'not-allowed';
    btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg> Reset Semua Centang`;
  }
}

// ==========================================
// BACK BUTTON — cegah app tertutup saat tombol back ditekan
// ==========================================
function pushAppHistory() {
  // Push state ke history sehingga tombol Back browser/HP
  // akan memicu popstate dulu sebelum menutup app
  history.pushState({ app: true }, '', window.location.href);
}

window.addEventListener('popstate', function(e) {
  // Jika ada modal terbuka, tutup modal
  if (document.getElementById('modal-overlay').classList.contains('show')) {
    closeModal(); pushAppHistory(); return;
  }
  // Jika ada confirm dialog terbuka, tutup
  if (document.getElementById('confirm-dialog').classList.contains('show')) {
    closeConfirm(); pushAppHistory(); return;
  }
  // Jika ada sub-page terbuka, tutup sub-page
  const openSub = document.querySelector('.sub-page.show');
  if (openSub) {
    const name = openSub.id.replace('sub-', '');
    closeSubPage(name); pushAppHistory(); return;
  }
  // Jika dropdown terbuka, tutup
  if (document.getElementById('dropdown-menu').classList.contains('show')) {
    closeDropdown(); pushAppHistory(); return;
  }
  // Jika di halaman selain dashboard, kembali ke dashboard
  if (currentPage !== 'dashboard' && state.loggedIn) {
    switchPage('dashboard'); pushAppHistory(); return;
  }
  // Sudah di dashboard — push ulang agar tidak keluar app
  pushAppHistory();
});

// ==========================================
// INIT
// ==========================================
function init() {
  loadLocal();
  applyDarkMode();
  // Push history state awal agar tombol Back ter-intercept
  pushAppHistory();
  if (state.user && state.loggedIn) {
    enterApp();
  } else {
    document.getElementById('screen-login').classList.add('active');
  }
  // Enter key untuk login
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
}

function toggleClearBtn(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp || !btn) return;
  btn.style.display = inp.value.length > 0 ? 'flex' : 'none';
}

function clearSearch(inputId, btnId, renderFn) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (inp) { inp.value = ''; inp.focus(); }
  if (btn) btn.style.display = 'none';
  if (renderFn) renderFn();
}

init();
