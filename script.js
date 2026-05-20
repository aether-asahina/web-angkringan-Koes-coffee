
  

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCeSqRWg0MNOq51EyKXerb9Yhc-Knzfo8k",
  authDomain: "angkringan-12330.firebaseapp.com",
  projectId: "angkringan-12330",
  storageBucket: "angkringan-12330.firebasestorage.app",
  messagingSenderId: "630385630007",
  appId: "1:630385630007:web:e19e29f1512705d704d8b2",
  measurementId: "G-MHDVHFSF16"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

  // ... (kode menuItems lu tetap di sini)

  const menuItems = [
  {
    name: 'Americano',
    hot: 14000,
    cold: 15000
  },
  {
    name: 'Sanger',
    hot: 15000,
    cold: 16000
  },
  {
    name: 'Kopi Susu Gula Aren',
    hot: 16000,
    cold: 17000
  },
  {
    name: 'Salted Caramel',
    hot: 16000,
    cold: 18000
  },
  {
    name: 'Butterscotch Latte',
    hot: 16000,
    cold: 18000
  },
  {
    name: 'Hazelnut Latte',
    hot: 16000,
    cold: 18000
  },
  {
    name: 'Pandan Latte',
    hot: 16000,
    cold: 18000
  },
  {
    name: 'Cokelat Latte',
    hot: 16000,
    cold: 17000
  },
  {
    name: 'Matcha Latte',
    hot: 16000,
    cold: 17000
  },
  {
    name: 'Taro Latte',
    hot: 16000,
    cold: 17000
  },
  {
    name: 'Red Velvet Latte',
    hot: 16000,
    cold: 17000
  }
]
// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
let transactions = [];
let categories = [
  { id:'c1', name:'Minuman', type:'pemasukan' },
  { id:'c2', name:'Makanan', type:'pemasukan' },
  { id:'c3', name:'Lainnya', type:'keduanya' },
  { id:'c4', name:'Bahan Baku', type:'pengeluaran' },
  { id:'c5', name:'Operasional', type:'pengeluaran' },
  { id:'c6', name:'Gaji', type:'pengeluaran' }
];

let currentType  = 'pemasukan';
let dashPeriod   = 'today';
let lapPeriod    = 'today';
let deleteId     = null;
let selectedMenu = null;
let currentUserRole = 'viewer';
let selectedPayment = 'cash'; // ← tambah ini

// ══════════════════════════════════════════════════
//  PERSIST
// ══════════════════════════════════════════════════


// ══════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════
const fmt = n => 'Rp ' + Math.abs(n).toLocaleString('id-ID');
const fmtDate = d => new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

function startOfDay(d)   { const x=new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d)  { const x=startOfDay(d); x.setDate(x.getDate()-x.getDay()); return x; }
function startOfMonth(d) { const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }

function filterByPeriod(list, period) {
  const now = new Date();
  return list.filter(t => {
    const d = new Date(t.date);
    if (period==='today') return d >= startOfDay(now);
    if (period==='week')  return d >= startOfWeek(now);
    if (period==='month') return d >= startOfMonth(now);
    return true;
  });
}

function sumBy(list, type) {
  return list.filter(t=>t.type===type).reduce((s,t)=>s+t.amount,0);
}

function getCatName(id) {
  return (categories.find(c=>c.id===id)||{name:'—'}).name;
}


// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
function init() {
  // header date
  document.getElementById('headerDate').textContent =
    new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // set default datetime
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('txDate').value = now.toISOString().slice(0,16);

  populateCatSelect();
  renderCatList();
  renderDashboard();
  renderHistory();
  renderLaporan();
  
  loadTransactions();
  renderFinanceChart();
}

// ══════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════
function showPage(p) {
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  const idx = {dashboard:0,transaksi:1,riwayat:2,laporan:3}[p];
  document.querySelectorAll('nav button')[idx].classList.add('active');
  if(p==='riwayat')  renderHistory();
  if(p==='laporan')  renderLaporan();
  if(p==='transaksi') { renderCatList(); populateCatSelect(); }
}

// ══════════════════════════════════════════════════
//  TYPE TOGGLE
// ══════════════════════════════════════════════════
function setType(t) {
  currentType = t;
  document.getElementById('typeIncome').classList.toggle('active', t==='pemasukan');
  document.getElementById('typeExpense').classList.toggle('active', t==='pengeluaran');
  populateCatSelect();
}

// ══════════════════════════════════════════════════
//  CATEGORIES
// ══════════════════════════════════════════════════
function populateCatSelect() {
  const sel = document.getElementById('txCat');
  if (!sel) return; // Guard clause
  
  const cats = categories.filter(c=>c.type===currentType||c.type==='keduanya');
  sel.innerHTML = cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

  const fSel = document.getElementById('filterCat');
  if(fSel) {
    fSel.innerHTML = '<option value="">Semua Kategori</option>' +
      categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }
}


function renderCatList() {
  document.getElementById('catList').innerHTML = categories.map(c=>`
    <span style="display:inline-flex;align-items:center;gap:0.4rem;background:var(--cream);border:1px solid var(--border);border-radius:20px;padding:0.25rem 0.75rem;font-size:0.78rem;">
      ${c.name}
      <span style="font-size:0.65rem;color:var(--text-soft);">(${c.type==='keduanya'?'semua':c.type})</span>
      <button onclick="deleteCat('${c.id}')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:0.8rem;padding:0;margin-left:2px;">✕</button>
    </span>
  `).join('');
}

function addCategory() {
  const name = document.getElementById('newCatName').value.trim();
  const type = document.getElementById('newCatType').value;
  if (!name) { showToast('⚠ Nama kategori tidak boleh kosong'); return; }
  categories.push({ id: uid(), name, type });
  
  document.getElementById('newCatName').value = '';
  renderCatList();
  populateCatSelect();
  showToast('✓ Kategori ditambahkan');
}

function deleteCat(id) {
  categories = categories.filter(c=>c.id!==id);
  
  renderCatList();
  populateCatSelect();
  showToast('Kategori dihapus');
}

// ══════════════════════════════════════════════════
//  TRANSACTIONS
// ══════════════════════════════════════════════════
async function saveTransaction() {
  if(currentUserRole === 'viewer') {

  showToast('❌ Viewer tidak punya akses');

  return;

}
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const catId  = document.getElementById('txCat').value;
  const date   = document.getElementById('txDate').value;
  const note   = document.getElementById('txNote').value.trim();
  


  if (!desc)          { showToast('⚠ Keterangan wajib diisi'); return; }
  if (!amount || amount<=0) { showToast('⚠ Jumlah harus lebih dari 0'); return; }
  if (!date)          { showToast('⚠ Tanggal wajib diisi'); return; }

  try {

  await addDoc(collection(db, "transaksi_angkringan"), {
    type: currentType,
    desc,
    amount,
    catId,
    date,
    note,
    payment: selectedPayment,
    createdAt: serverTimestamp()
  });

  showToast('✓ Transaksi disimpan ke Firebase');

  clearForm();

  await loadTransactions();
  renderFinanceChart();

} catch(err) {

  console.error(err);

  showToast('❌ Gagal simpan ke Firebase');

}
}

function clearForm() {
  document.getElementById('txDesc').value = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txNote').value = '';
  const now = new Date();
  now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
  document.getElementById('txDate').value = now.toISOString().slice(0,16);
  setType('pemasukan');
}

// ── DELETE

function closeModal() {
  deleteId = null;
  document.getElementById('deleteModal').classList.remove('open');
}

// FUNGSI UNTUK MENGHAPUS DARI FIREBASE
const hapusDariFirebase = async function(docId) {
  if(currentUserRole !== 'admin') {

  showToast('❌ Hanya admin');

  return;

}
  if (confirm("Hapus transaksi ini dari database cloud?")) {
    try {
      await deleteDoc(doc(db, "transaksi_angkringan", docId));
      showToast('✓ Berhasil dihapus');
      await loadTransactions(); // Refresh data dari server
    } catch (error) {
      console.error("Error hapus:", error);
      showToast('❌ Gagal menghapus data');
    }
  }
};
window.hapusDariFirebase = hapusDariFirebase;


// ══════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════
function setDashPeriod(p, btn) {
  dashPeriod = p;
  document.querySelectorAll('#dashPeriod .period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const labels = {today:'Hari Ini',week:'Minggu Ini',month:'Bulan Ini',all:'Semua Waktu'};
  document.getElementById('dashPeriodLabel').textContent = '— ' + labels[p];
  renderDashboard();
}

function renderDashboard() {
  const list = filterByPeriod(transactions, dashPeriod);
  const inc  = sumBy(list,'pemasukan');
  const exp  = sumBy(list,'pengeluaran');
  const net  = inc - exp;
  const txCount = list.length;
  const modal = inc > 0 ? (net/inc*100).toFixed(1) : '0.0';

  document.getElementById('dashCards').innerHTML = `
    <div class="card income">
      <div class="card-label">Total Pemasukan</div>
      <div class="card-value green">${fmt(inc)}</div>
      <div class="card-sub">${list.filter(t=>t.type==='pemasukan').length} transaksi</div>
    </div>
    <div class="card expense">
      <div class="card-label">Total Pengeluaran</div>
      <div class="card-value red">${fmt(exp)}</div>
      <div class="card-sub">${list.filter(t=>t.type==='pengeluaran').length} transaksi</div>
    </div>
    <div class="card profit">
      <div class="card-label">Laba Bersih</div>
      <div class="card-value ${net>=0?'green':'red'}">${(net>=0?'':'-')+fmt(net)}</div>
      <div class="card-sub">${txCount} total transaksi</div>
    </div>
    <div class="card modal-profit">
      <div class="card-label">Margin Laba</div>
      <div class="card-value ${net>=0?'amber':'red'}">${modal}%</div>
      <div class="card-sub">net / pemasukan</div>
    </div>
  `;

  // chart — per category
  const max = Math.max(inc, exp, 1);
  const incRows = buildCatBar(list,'pemasukan',max);
  const expRows = buildCatBar(list,'pengeluaran',max);

  document.getElementById('dashChart').innerHTML =
    (incRows+expRows) || '<div style="color:var(--text-soft);font-size:0.85rem;padding:1rem 0;">Belum ada data untuk periode ini.</div>';

  // recent 5
  const rows = list.slice(0,5).map(t=>`
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:0.75rem;">${fmtDate(t.date)}</td>
      <td>${t.desc}</td>
      <td><span class="badge badge-${t.type==='pemasukan'?'income':'expense'}">${getCatName(t.catId)}</span></td>
      <td><span class="badge badge-${t.type==='pemasukan'?'income':'expense'}">${t.type==='pemasukan'?'Masuk':'Keluar'}</span></td>
      <td class="amount-${t.type==='pemasukan'?'income':'expense'}">${t.type==='pemasukan'?'+':'-'}${fmt(t.amount)}</td>
    </tr>
  `).join('');

  document.getElementById('dashRecent').innerHTML = rows ||
    `<tr><td colspan="5"><div class="empty"><div class="empty-icon">☕</div><div class="empty-text">Belum ada transaksi</div></div></td></tr>`;
}

function buildCatBar(list, type, max) {
  const cats = {};
  list.filter(t=>t.type===type).forEach(t=>{
    const n = getCatName(t.catId);
    cats[n] = (cats[n]||0) + t.amount;
  });
  return Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([name,val])=>{
    const pct = Math.round(val/max*100);
    return `<div class="bar-row">
      <div class="bar-label">${name}</div>
      <div class="bar-track"><div class="bar-fill ${type==='pemasukan'?'income':'expense'}" style="width:${pct}%"></div></div>
      <div class="bar-val">${fmt(val)}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════════
// Bagian dalam renderHistory di kodingan lu


// ══════════════════════════════════════════════════
//  LAPORAN
// ══════════════════════════════════════════════════
function setLapPeriod(p, btn) {
  lapPeriod = p;
  document.querySelectorAll('#lapPeriod .period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderLaporan();
}

function renderLaporan() {
  const list = filterByPeriod(transactions, lapPeriod);
  const inc  = sumBy(list,'pemasukan');
  const exp  = sumBy(list,'pengeluaran');
  const net  = inc - exp;
  const modal = inc>0 ? (net/inc*100).toFixed(1) : '0.0';

  document.getElementById('lapCards').innerHTML = `
    <div class="card income"><div class="card-label">Pemasukan</div><div class="card-value green">${fmt(inc)}</div></div>
    <div class="card expense"><div class="card-label">Pengeluaran</div><div class="card-value red">${fmt(exp)}</div></div>
    <div class="card profit"><div class="card-label">Laba Bersih</div><div class="card-value ${net>=0?'green':'red'}">${net>=0?'':'-'}${fmt(net)}</div></div>
    <div class="card modal-profit"><div class="card-label">Margin</div><div class="card-value ${net>=0?'amber':'red'}">${modal}%</div></div>
  `;

  // per-category breakdown
  const renderCats = (type, elId) => {
    const cats = {};
    list.filter(t=>t.type===type).forEach(t=>{
      const n=getCatName(t.catId); cats[n]=(cats[n]||0)+t.amount;
    });
    const total = Object.values(cats).reduce((s,v)=>s+v,0)||1;
    document.getElementById(elId).innerHTML = Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`
      <div class="cat-row">
        <span class="cat-name">${n}</span>
        <span class="cat-amount ${type==='pemasukan'?'amount-income':'amount-expense'}">${fmt(v)} <span style="font-size:0.65rem;color:var(--text-soft);">(${(v/total*100).toFixed(0)}%)</span></span>
      </div>
    `).join('') || '<div style="color:var(--text-soft);font-size:0.85rem;">Tidak ada data</div>';
  };
  renderCats('pemasukan','lapIncCat');
  renderCats('pengeluaran','lapExpCat');

  // daily trend
  const days = {};
  list.forEach(t=>{
    const d = new Date(t.date).toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
    if(!days[d]) days[d]={inc:0,exp:0};
    if(t.type==='pemasukan') days[d].inc+=t.amount;
    else days[d].exp+=t.amount;
  });
  const dayEntries = Object.entries(days).slice(-14);
  const maxVal = Math.max(...dayEntries.flatMap(([,v])=>[v.inc,v.exp]),1);
  const labels = {today:'Hari Ini',week:'Minggu Ini',month:'Bulan Ini',all:'Semua'};
  document.getElementById('lapTrenLabel').textContent = '— '+labels[lapPeriod];

  document.getElementById('lapTren').innerHTML = dayEntries.length
    ? dayEntries.map(([d,v])=>`
        <div style="margin-bottom:0.25rem;">
          <div style="font-family:'DM Mono',monospace;font-size:0.65rem;color:var(--text-soft);margin-bottom:0.2rem;">${d}</div>
          <div class="bar-row"><div class="bar-label" style="min-width:70px;">Masuk</div><div class="bar-track"><div class="bar-fill income" style="width:${Math.round(v.inc/maxVal*100)}%"></div></div><div class="bar-val">${fmt(v.inc)}</div></div>
          <div class="bar-row"><div class="bar-label" style="min-width:70px;">Keluar</div><div class="bar-track"><div class="bar-fill expense" style="width:${Math.round(v.exp/maxVal*100)}%"></div></div><div class="bar-val">${fmt(v.exp)}</div></div>
        </div>
      `).join('')
    : '<div style="color:var(--text-soft);font-size:0.85rem;">Belum ada data untuk periode ini.</div>';
}

// ══════════════════════════════════════════════════
//  EXPORT CSV
// ══════════════════════════════════════════════════
function exportCSV() {
  const header = ['Tanggal','Keterangan','Kategori','Tipe','Jumlah','Catatan'];
  const rows = transactions.map(t=>[
    new Date(t.date).toLocaleString('id-ID'),
    `"${t.desc.replace(/"/g,'""')}"`,
    getCatName(t.catId),
    t.type,
    t.amount,
    `"${(t.note||'').replace(/"/g,'""')}"`
  ]);
  const csv = [header, ...rows].map(r=>r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `koes-coffee-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('✓ CSV berhasil diunduh');
}

// ══════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2600);
}

// ══════════════════════════════════════════════════
//  CLOSE MODAL ON OUTSIDE CLICK
// ══════════════════════════════════════════════
window.onerror = function(msg, url, line) {
  console.error("Error: " + msg + "\nLine: " + line);
  // showToast("Ada error sistem, cek koneksi"); 
};

init();


async function login() {

  const email = document.getElementById('loginUser').value.trim();
  const pass  = document.getElementById('loginPass').value.trim();

  if(!email || !pass){
    showToast('Isi email dan password');
    return;
  }

  try {

    await signInWithEmailAndPassword(auth, email, pass);

    showToast('✓ Login berhasil');

    await loadTransactions();
    renderFinanceChart();

  } catch(err) {

    console.error(err);

    showToast('❌ ' + err.message);

  }

}



function quickExpense(name) {
  setType('pengeluaran');
  document.getElementById('txDesc').value = name;
  
  // Otomatis pilih kategori 'Bahan Baku' (id: c4) jika ada
  const catSelect = document.getElementById('txCat');
  if (catSelect) catSelect.value = 'c4'; 

  document.getElementById('txAmount').focus();
  showToast('Isi nominal untuk ' + name);
}


function customExpense() {
  const val = document.getElementById('customExpense').value;

  if(!val) {
    alert('Isi dulu pengeluarannya');
    return;
  }

  quickExpense(val);

  document.getElementById('customExpense').value = '';
}

function quickSale() {
  showPage('transaksi');
  setType('pemasukan');
}

function showTempSelector(item) {
  selectedMenu = item
  document.getElementById('tempModal').classList.add('active')
}

function closeTempModal() {
  document.getElementById('tempModal').classList.remove('active')
}

function chooseTemp(temp) {

  if(!selectedMenu) return

  const price = temp === 'hot'
    ? selectedMenu.hot
    : selectedMenu.cold

  if(price <= 0) {
    showToast('Menu tidak tersedia')
    return
  }

  setType('pemasukan')

  document.getElementById('txDesc').value =
    selectedMenu.name + ' (' + temp.toUpperCase() + ')'

  document.getElementById('txAmount').value = price

  closeTempModal()

  showToast(selectedMenu.name + ' ' + temp.toUpperCase())
}



function renderHistory() {
  let list = [...transactions];
  const q = document.getElementById('searchQ')?.value.toLowerCase() || "";
  const type = document.getElementById('filterType')?.value || "";
  const cat = document.getElementById('filterCat')?.value || "";
  const from = document.getElementById('filterDateFrom')?.value || "";
  const to = document.getElementById('filterDateTo')?.value || "";

  if(q) list = list.filter(t => t.desc.toLowerCase().includes(q));
  if(type) list = list.filter(t => t.type === type);
  if(cat) list = list.filter(t => t.catId === cat);
  if(from) list = list.filter(t => t.date >= from);
  if(to) list = list.filter(t => t.date <= to + 'T23:59');

  const historyBody = document.getElementById('historyBody');
  const emptyState = document.getElementById('historyEmpty');
  
  if (emptyState) emptyState.style.display = list.length ? 'none' : 'block';
  if (!historyBody) return;

  historyBody.innerHTML = list.map(t => `
    <tr>
      <td style="font-family:'DM Mono',monospace;font-size:0.75rem;">${fmtDate(t.date)}</td>
      <td><div style="font-weight:600;">${t.desc}</div></td>
      <td><span class="badge badge-${t.type==='pemasukan'?'income':'expense'}">${getCatName(t.catId)}</span></td>
      <td><span class="badge badge-${t.type==='pemasukan'?'income':'expense'}">${t.type==='pemasukan'?'Masuk':'Keluar'}</span></td>
      <td class="amount-${t.type==='pemasukan'?'income':'expense'}">${t.type==='pemasukan'?'+':'-'}${fmt(t.amount)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="hapusDariFirebase('${t.id}')">✕</button>
      </td>
    </tr>
  `).join('');
}


async function loadTransactions() {

  try {

    const querySnapshot = await getDocs(
      collection(db, "transaksi_angkringan")
    );

    transactions = [];

    querySnapshot.forEach((docSnap) => {

      transactions.push({
        id: docSnap.id,
        ...docSnap.data()
      });

    });

    transactions.sort((a,b) => {
      return new Date(b.date) - new Date(a.date)
    });
    window._txArr = transactions; // ← tambah ini
    let cash = 0, qris = 0;
transactions.forEach(t => {
  if (t.type === 'pemasukan') {
    if (t.payment === 'cash') cash += Number(t.amount);
    if (t.payment === 'qris') qris += Number(t.amount);
  }
});
document.getElementById('cashTotal').innerText = 'Rp ' + cash.toLocaleString('id-ID');
document.getElementById('qrisTotal').innerText = 'Rp ' + qris.toLocaleString('id-ID');

    renderDashboard();
    renderHistory();
    renderLaporan();

  } catch(err) {

    console.error(err);

    showToast('❌ Gagal load Firebase');

  }

}
onAuthStateChanged(auth, async (user) => {
  console.log(user.uid)

  if(user) {
  const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    if(userSnap.exists()) {

      currentUserRole = userSnap.data().role || 'viewer';

    } else {

      currentUserRole = 'viewer';

    }

    applyRoleSystem();

   

    document.getElementById('loginPage').style.display = 'none';

    document.getElementById('app').style.display = 'block';

    await loadTransactions();
    renderFinanceChart();

  } else {

    document.getElementById('loginPage').style.display = 'flex';

    document.getElementById('app').style.display = 'none';

  }

});

const toggleTheme = () => {

  document.body.classList.toggle('dark');

  const isDark =
    document.body.classList.contains('dark');

  localStorage.setItem(
    'koes_theme',
    isDark ? 'dark' : 'light'
  );

  document.getElementById('themeBtn').textContent =
    isDark ? '☀️' : '🌙';

};

window.toggleTheme = toggleTheme;

/* load saved theme */

const savedTheme =
  localStorage.getItem('koes_theme');

if(savedTheme === 'dark') {

  document.body.classList.add('dark');

  const btn = document.getElementById('themeBtn');

  if(btn) btn.textContent = '☀️';

}
function applyRoleSystem() {
  if(currentUserRole === 'viewer') {
    // Sembunyikan tab Transaksi
    document.querySelectorAll('nav button')[1].style.display = 'none';
    // Sembunyikan semua tombol aksi
    document.querySelectorAll('.btn-danger, .btn-primary, .type-btn, .expense-item, .menu-card').forEach(el => {
      el.style.display = 'none';
    });
    // Disable quick menu jual cepat
    document.querySelectorAll('.quick-btn').forEach(btn => {
      if(btn.textContent.includes('Transaksi') || btn.textContent.includes('Jual')) {
        btn.style.display = 'none';
      }
    });
  }
  // Admin = akses penuh, tidak perlu dibatasi
}

// Ekspos fungsi ke global agar bisa dipanggil oleh attribute onclick di HTML
window.login = login;
async function logout() {
  await auth.signOut(auth);
  showToast('✓ Berhasil keluar');
}
window.logout = logout;
window.showPage = showPage;
window.setType = setType;
window.saveTransaction = saveTransaction;
window.clearForm = clearForm;
window.addCategory = addCategory;
window.deleteCat = deleteCat;
window.setDashPeriod = setDashPeriod;
window.setLapPeriod = setLapPeriod;
window.quickExpense = quickExpense;
window.customExpense = customExpense;
window.quickSale = quickSale;
window.showTempSelector = showTempSelector;
window.chooseTemp = chooseTemp;
window.exportCSV = exportCSV;
window.renderHistory = renderHistory;
window.hapusDariFirebase = hapusDariFirebase;

window.setPayment = function(type, el) {
  selectedPayment = type;
  document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');
};

let currentChartPeriod = 'week';

function renderFinanceChart() {
  const ctx = document.getElementById('financeChart');
  if (!ctx) return;

  const txArr = window._txArr || [];
  const labels = [], incomeData = [], expenseData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit' }));
    const key = d.toISOString().split('T')[0];
    let income = 0, expense = 0;
    txArr.forEach(t => {
      if (t.date && t.date.startsWith(key)) {
        if (t.type === 'pemasukan') income += Number(t.amount);
        else expense += Number(t.amount);
      }
    });
    incomeData.push(income);
    expenseData.push(expense);
  }

  if (window.financeChartInstance) window.financeChartInstance.destroy();

  window.financeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Pemasukan', data:incomeData, borderColor:'#48ff00', backgroundColor:'rgba(72,255,0,0.15)', tension:0.4, fill:true },
        { label:'Pengeluaran', data:expenseData, borderColor:'#ff3b3b', backgroundColor:'rgba(255,59,59,0.12)', tension:0.4, fill:true }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: document.body.classList.contains('dark') ? '#fff' : '#222' }}},
      scales: {
        x: { ticks: { color: document.body.classList.contains('dark') ? '#ccc' : '#444' }},
        y: { ticks: { color: document.body.classList.contains('dark') ? '#ccc' : '#444' }}
      }
    }
  });
}
window.renderFinanceChart = renderFinanceChart;


