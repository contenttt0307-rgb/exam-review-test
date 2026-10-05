/* 段考複習系統：老師後台
   只有 firebase-config.js 裡 TEACHERS 名單上的帳號能使用（Firestore 安全規則也會再檢查一次）。 */

const root = document.getElementById("root");
const CONCEPTS = window.CONCEPTS;
const SUPP = new Set(window.SUPP_CONCEPTS);
const CORE = Object.keys(CONCEPTS).filter(t => !SUPP.has(t));
const BANK = window.UNITS.flatMap(u => (window[u.key] || []));
const BY_ID = Object.fromEntries(BANK.map(q => [q.id, q]));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);

let auth = null, db = null;
try { firebase.initializeApp(window.FIREBASE_CONFIG); auth = firebase.auth(); db = firebase.firestore(); }
catch (e) { console.error(e); }

const A = {
  user: null, env: /-test(\/|$)/.test(location.pathname) ? "test" : "prod",
  tab: "class", roster: [], students: [], cls: null, open: null, loading: false, err: "",
  imp: null, impMsg: ""
};
const set = p => { Object.assign(A, p); render(); };
const isTeacher = e => (window.TEACHERS || []).map(x => x.toLowerCase()).includes((e || "").toLowerCase());
const envName = e => e === "prod" ? "正式站" : "試用站";

/* ---------- 資料 ---------- */
async function loadData(){
  set({loading: true, err: ""});
  try {
    const [r, s] = await Promise.all([
      db.collection(`envs/${A.env}/roster`).get(),
      db.collection(`envs/${A.env}/students`).get()
    ]);
    const roster = r.docs.map(d => ({sid: d.id, ...d.data()}));
    const students = s.docs.map(d => d.data());
    const classes = [...new Set(roster.map(x => x.cls))].sort();
    set({roster, students, cls: classes.includes(A.cls) ? A.cls : classes[0] || null, loading: false});
  } catch (e) { console.error(e); set({loading: false, err: "讀取資料失敗：" + (e.code || e.message)}); }
}

/* ---------- 畫面 ---------- */
function header(){
  return `<header>
    <h1>段考複習系統｜老師後台</h1>
    <div class="seg" role="group" aria-label="資料來源">
      <button class="${A.env === "prod" ? "on" : ""}" data-a="env" data-k="prod">正式站資料</button>
      <button class="${A.env === "test" ? "on" : ""}" data-a="env" data-k="test">試用站資料</button>
    </div>
    <div class="seg" role="tablist">
      <button class="${A.tab === "class" ? "on" : ""}" data-a="tab" data-k="class">班級進度</button>
      <button class="${A.tab === "import" ? "on" : ""}" data-a="tab" data-k="import">匯入名單</button>
    </div>
    <button class="btn ghost" data-a="logout">登出</button>
  </header>`;
}

function vLogin(msg){
  return `<div class="center"><div style="display:flex;flex-direction:column;gap:14px;align-items:center">
    <img src="icon-192.png" alt="" width="72" height="72" style="border-radius:18px">
    <h1 style="margin:0;font-size:24px">老師後台</h1>
    <p class="muted" style="margin:0">請用老師帳號登入。</p>
    ${msg ? `<p class="err" style="margin:0">${esc(msg)}</p>` : ""}
    <button class="btn" data-a="login">使用 Google 帳號登入</button>
  </div></div>`;
}

const fmtTime = t => {
  if (!t || !t.toDate) return "—";
  const d = t.toDate(), now = new Date(), diff = (now - d) / 864e5;
  if (diff < 1 && d.getDate() === now.getDate()) return "今天 " + d.toTimeString().slice(0, 5);
  if (diff < 7) return Math.ceil(diff) + " 天前";
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

function vClass(){
  if (A.loading) return `<div class="center"><p class="muted">讀取${envName(A.env)}資料中…</p></div>`;
  if (A.err) return `<div class="card"><p class="err">${esc(A.err)}</p><p class="muted small">如果是 permission-denied，請確認 Firestore 安全規則已經發布，而且你登入的是老師帳號。</p></div>`;
  if (!A.roster.length) return `<div class="card"><h2>${envName(A.env)}還沒有學生名單</h2><p class="muted">請先到「匯入名單」上傳學號與班級對照表。</p><div><button class="btn" data-a="tab" data-k="import">前往匯入名單</button></div></div>`;

  const classes = [...new Set(A.roster.map(x => x.cls))].sort();
  const bySid = Object.fromEntries(A.students.map(s => [s.sid, s]));
  const members = A.roster.filter(r => r.cls === A.cls).sort((a, b) => String(a.seat).localeCompare(String(b.seat), undefined, {numeric: true}));
  const active = members.map(m => bySid[m.sid]).filter(Boolean);
  const avg = active.length ? Math.round(active.reduce((s, x) => s + (x.readiness || 0), 0) / active.length) : 0;

  // 觀念掌握：使用過的學生中，已攻克的比例（由低到高）
  const conceptRows = CORE.map(t => {
    const tried = active.filter(s => s.c && s.c[t]);
    const m = active.filter(s => s.c && s.c[t] && s.c[t].m).length;
    return {t, pct: active.length ? Math.round(m / active.length * 100) : 0, tried: tried.length};
  }).filter(r => r.tried > 0).sort((a, b) => a.pct - b.pct).slice(0, 10);

  // 最常答錯的題目：至少 3 人次作答
  const qAgg = {};
  for (const s of active) for (const [id, st] of Object.entries(s.qs || {})) {
    const g = qAgg[id] || (qAgg[id] = {a: 0, w: 0, r: [0, 0, 0]});
    g.a += st.a || 0; g.w += st.w || 0; (st.r || []).forEach((n, i) => g.r[i] += n || 0);
  }
  const hardQs = Object.entries(qAgg).filter(([id, g]) => g.a >= 3 && BY_ID[id])
    .map(([id, g]) => ({id, ...g, rate: Math.round(g.w / g.a * 100)})).sort((a, b) => b.rate - a.rate).slice(0, 8);

  const rows = members.map(m => {
    const s = bySid[m.sid];
    const open = A.open === m.sid;
    const main = s
      ? `<tr class="stu" data-a="open" data-k="${esc(m.sid)}"><td class="num">${esc(m.seat)}</td><td>${esc(m.name)}</td><td class="num muted">${esc(m.sid)}</td>
          <td><div style="display:flex;gap:8px;align-items:center"><div class="bar" style="flex:1"><i style="width:${s.readiness || 0}%"></i></div><span class="num">${s.readiness || 0}%</span></div></td>
          <td class="num">${s.mastered || 0} / ${CORE.length}</td><td class="num">${(s.todo || []).length}</td><td>${fmtTime(s.lastActive)}</td></tr>`
      : `<tr><td class="num">${esc(m.seat)}</td><td>${esc(m.name)}</td><td class="num muted">${esc(m.sid)}</td><td colspan="4" class="none">尚未使用</td></tr>`;
    const detail = open && s ? `<tr class="detail"><td colspan="7"><b>待攻克的觀念：</b>${(s.todo || []).length ? s.todo.map(t => `<span class="pill bad">${t} ${esc(CONCEPTS[t] || "")}</span>`).join("") : "<span class='muted'>沒有</span>"}
      <br><span class="small muted">累計作答 ${s.answered || 0} 題</span></td></tr>` : "";
    return main + detail;
  }).join("");

  return `
  <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
    <label for="cls" class="muted">班級</label>
    <select id="cls" data-a="cls" style="padding:6px 10px;border-radius:8px;border:1.5px solid var(--line);background:var(--surface)">
      ${classes.map(c => `<option value="${esc(c)}" ${c === A.cls ? "selected" : ""}>${esc(c)} 班</option>`).join("")}
    </select>
    <button class="btn ghost" data-a="reload">重新整理資料</button>
    <span class="small muted">目前顯示：${envName(A.env)}</span>
  </div>
  <div class="tiles">
    <div class="tile"><b>${members.length}</b><span>班級人數</span></div>
    <div class="tile"><b>${active.length}</b><span>已開始使用</span></div>
    <div class="tile"><b>${avg}%</b><span>平均段考準備度（使用者）</span></div>
    <div class="tile"><b>${active.reduce((s, x) => s + (x.answered || 0), 0)}</b><span>全班累計作答題數</span></div>
  </div>
  <div class="card"><h2>學生進度</h2><p class="small muted" style="margin:0">點一下學生可以看他的待攻克觀念。</p>
    <div class="scroll"><table><thead><tr><th>座號</th><th>姓名</th><th>學號</th><th style="min-width:160px">準備度</th><th>已攻克</th><th>待攻克</th><th>最後使用</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>
  <div class="grid2">
    <div class="card"><h2>全班最弱的觀念</h2><p class="small muted" style="margin:0">已攻克人數比例最低的觀念（只計有練習過的學生）。</p>
      ${conceptRows.length ? conceptRows.map(r => `<div class="crow"><span>${r.t}　${esc(CONCEPTS[r.t])}</span><div class="bar"><i style="width:${r.pct}%"></i></div><span class="num">${r.pct}%</span></div>`).join("") : `<p class="muted">還沒有足夠的作答資料。</p>`}
    </div>
    <div class="card"><h2>最常答錯的題目</h2><p class="small muted" style="margin:0">至少 3 人次作答，依答錯率排序；並列出學生最常選的錯因。</p>
      ${hardQs.length ? hardQs.map(h => { const q = BY_ID[h.id], top = h.r.indexOf(Math.max(...h.r));
        return `<div class="qrow"><div class="meta"><b>${h.id}</b><span class="rate">答錯率 ${h.rate}%</span><span>${h.a} 人次</span></div><div>${q.stem}</div>${Math.max(...h.r) > 0 ? `<div class="small muted">最常選的錯因：${q.reasons[top]}</div>` : ""}</div>`; }).join("") : `<p class="muted">還沒有足夠的作答資料。</p>`}
    </div>
  </div>`;
}

function vImport(){
  const p = A.imp;
  const byCls = p ? Object.entries(p.rows.reduce((m, r) => (m[r.cls] = (m[r.cls] || 0) + 1, m), {})) : [];
  return `<div class="card">
    <h2>匯入學生名單到「${envName(A.env)}」</h2>
    <p class="muted" style="margin:0">上傳 Excel（.xlsx）或 CSV，第一列要有欄位名稱：<b>學號、班級、座號、姓名</b>。同一個學號重複匯入會覆蓋舊資料。名單只有老師帳號讀得到，學生只能讀到自己那一筆。</p>
    <div class="drop"><input type="file" id="file" accept=".xlsx,.xls,.csv" data-a="file"></div>
    ${p ? `<div class="stack">
      ${p.errors.length ? `<p class="err">有 ${p.errors.length} 列資料不完整，不會匯入：第 ${p.errors.slice(0, 10).join("、")} 列${p.errors.length > 10 ? "…" : ""}</p>` : ""}
      <p>讀到 <b class="num">${p.rows.length}</b> 位學生：${byCls.map(([c, n]) => `<span class="pill">${esc(c)} 班 ${n} 人</span>`).join("")}</p>
      <div class="scroll"><table><thead><tr><th>學號</th><th>班級</th><th>座號</th><th>姓名</th></tr></thead><tbody>
        ${p.rows.slice(0, 5).map(r => `<tr><td class="num">${esc(r.sid)}</td><td>${esc(r.cls)}</td><td class="num">${esc(r.seat)}</td><td>${esc(r.name)}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="small muted">（只顯示前 5 筆）</p>
      <div><button class="btn" data-a="doimport" ${p.rows.length ? "" : "disabled"}>匯入到${envName(A.env)}</button></div>
    </div>` : ""}
    ${A.impMsg ? `<p class="${A.impMsg.startsWith("✓") ? "ok" : "err"}">${esc(A.impMsg)}</p>` : ""}
  </div>`;
}

function render(){
  if (!auth) { root.innerHTML = vLogin("Firebase 無法啟動，請檢查網路後重新整理。"); return; }
  if (!A.user) { root.innerHTML = vLogin(A.err); return; }
  root.innerHTML = header() + (A.tab === "class" ? vClass() : vImport());
  if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([root]).catch(() => {});
}

/* ---------- 名單解析 ---------- */
async function parseFile(f){
  const buf = await f.arrayBuffer();
  const wb = XLSX.read(buf, {type: "array"});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, {defval: "", raw: false});
  const pick = (r, k) => String(r[k] ?? r[k.trim()] ?? "").trim();
  const rows = [], errors = [];
  raw.forEach((r, i) => {
    const sid = pick(r, "學號").toLowerCase(), cls = pick(r, "班級"), seat = pick(r, "座號"), name = pick(r, "姓名");
    if (!sid || !cls || !/^[0-9a-z]+$/.test(sid)) { errors.push(i + 2); return; }
    rows.push({sid, cls, seat: seat.padStart(2, "0"), name});
  });
  return {rows, errors};
}
async function doImport(){
  const rows = A.imp.rows;
  set({impMsg: "匯入中…"});
  try {
    for (let i = 0; i < rows.length; i += 400) {
      const b = db.batch();
      rows.slice(i, i + 400).forEach(r => b.set(db.doc(`envs/${A.env}/roster/${r.sid}`), {cls: r.cls, seat: r.seat, name: r.name}));
      await b.commit();
    }
    set({imp: null, impMsg: `✓ 已匯入 ${rows.length} 位學生到${envName(A.env)}`});
    loadData();
  } catch (e) { console.error(e); set({impMsg: "匯入失敗：" + (e.code || e.message)}); }
}

/* ---------- 事件 ---------- */
root.addEventListener("click", async e => {
  const b = e.target.closest("[data-a]"); if (!b || b.tagName === "SELECT" || b.tagName === "INPUT") return;
  const a = b.dataset.a, k = b.dataset.k;
  if (a === "login") {
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt: "select_account"});
    try { await auth.signInWithPopup(p); } catch (err) { if (err.code !== "auth/popup-closed-by-user") set({err: "登入失敗：" + err.code}); }
  }
  if (a === "logout") auth.signOut();
  if (a === "env") { set({env: k, open: null}); loadData(); }
  if (a === "tab") set({tab: k, impMsg: ""});
  if (a === "reload") loadData();
  if (a === "open") set({open: A.open === k ? null : k});
  if (a === "doimport") doImport();
});
root.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset.a === "cls") set({cls: t.value, open: null});
  if (t.dataset.a === "file" && t.files[0]) {
    try { set({imp: await parseFile(t.files[0]), impMsg: ""}); }
    catch (err) { console.error(err); set({imp: null, impMsg: "讀不到這個檔案，請確認是 .xlsx 或 .csv"}); }
  }
});

if (auth) auth.onAuthStateChanged(async u => {
  if (!u) { set({user: null}); return; }
  if (!isTeacher(u.email)) { await auth.signOut(); set({user: null, err: `${u.email} 不是老師帳號，無法進入後台。`}); return; }
  set({user: u, err: ""}); loadData();
});
render();
