/* 段考複習系統：老師後台
   只有 firebase-config.js 裡 TEACHERS 名單上的帳號能使用（Firestore 安全規則也會再檢查一次）。 */

const root = document.getElementById("root");
const CONCEPTS = {...window.CONCEPTS, ...(window.CONCEPTS2 || {})};
const SUPP = new Set(window.SUPP_CONCEPTS);
const CORE1 = Object.keys(window.CONCEPTS).filter(t => !SUPP.has(t)), CORE2 = Object.keys(window.CONCEPTS2 || {});
const rangeOf = tag => "SCT".includes(tag[0]) ? "2" : "1";
const BANK = [...window.UNITS, ...(window.UNITS2 || [])].flatMap(u => (window[u.key] || []));
/* 依目前選的段考範圍取資料：第二次段考的準備度存在 readiness2、mastered2、todo2 */
const RD = s => (A.range === "2" ? s.readiness2 : s.readiness) || 0;
const MS = s => (A.range === "2" ? s.mastered2 : s.mastered) || 0;
const TD = s => (A.range === "2" ? s.todo2 : (s.todo || []).filter(t => rangeOf(t) === "1")) || [];
const CORE_ = () => A.range === "2" ? CORE2 : CORE1;
const BY_ID = Object.fromEntries(BANK.map(q => [q.id, q]));
/* 第二次段考的五個等級（和學生端相同）：0 未開始、1 練習中、2 會做、3 熟練、4 穩定 */
const TAG_QS = {}; BANK.forEach(q => { if (!q.supp) (TAG_QS[q.tag] = TAG_QS[q.tag] || []).push(q.id); });
const LV = [{name: "未開始", c: "l0"}, {name: "練習中", c: "l1"}, {name: "會做", c: "l2"}, {name: "熟練", c: "l3"}, {name: "穩定", c: "l4"}];
function levelOf(s, t){
  const qs = s.qs || {}, ids = TAG_QS[t] || [];
  if (s.ch && s.ch[t] && s.ch[t].stable) return 4;
  if (s.c && s.c[t] && s.c[t].m) return 3;
  const ok = ids.filter(id => qs[id] && qs[id].l === 1).length;
  if (ids.length && ok >= Math.ceil(ids.length * 0.8)) return 2;
  return ids.some(id => qs[id]) ? 1 : 0;
}
const levelCounts = s => { const n = [0, 0, 0, 0, 0]; CORE2.forEach(t => n[levelOf(s, t)]++); return n; };
const levelBar = n => { const tot = n.reduce((a, b) => a + b, 0) || 1;
  return `<div class="lvbar" title="${[4, 3, 2, 1, 0].map(k => LV[k].name + " " + n[k]).join("、")}">${[4, 3, 2, 1, 0].map(k => n[k] ? `<i class="${LV[k].c}" style="width:${n[k] / tot * 100}%"></i>` : "").join("")}</div>`; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);

let auth = null, db = null;
try { firebase.initializeApp(window.FIREBASE_CONFIG); auth = firebase.auth(); db = firebase.firestore(); }
catch (e) { console.error(e); }

const A = {
  user: null, env: /-test(\/|$)/.test(location.pathname) ? "test" : "prod",
  tab: "class", range: "2", roster: [], students: [], cls: null, open: null, loading: false, err: "",
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
    <div class="seg" role="group" aria-label="段考範圍">
      <button class="${A.range === "2" ? "on" : ""}" data-a="range" data-k="2">第二次段考</button>
      <button class="${A.range === "1" ? "on" : ""}" data-a="range" data-k="1">第一次段考</button>
    </div>
    <div class="seg" role="tablist">
      <button class="${A.tab === "class" ? "on" : ""}" data-a="tab" data-k="class">班級進度</button>
      <button class="${A.tab === "import" ? "on" : ""}" data-a="tab" data-k="import">匯入名單</button>
    </div>
    <button class="btn ghost" data-a="export">匯出 CSV</button>
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

/* 匯出全部學生（名單 + 練習紀錄）成 CSV，Excel 可直接開啟 */
function exportCSV(){
  const bySid = Object.fromEntries((A.students || []).map(x => [x.sid, x]));
  const head = ["學號","班級","座號","姓名","有登入使用","累計作答次數","做過的不同題數","答錯次數","第一次段考準備度(%)","第一次已攻克觀念數","第一次待攻克觀念數","魔王關擊敗題數","第二次段考準備度(%)","第二次已攻克觀念數","第二次待攻克觀念數","檢查錯誤練習題數","最後使用時間"];
  const rows = [...(A.roster || [])].sort((x, y) => (x.cls + x.seat).localeCompare(y.cls + y.seat)).map(m => {
    const s = bySid[m.sid];
    if (!s) return [m.sid, m.cls, m.seat, m.name, "否", 0, 0, 0, "", "", "", 0, "", "", "", 0, ""];
    const qs = Object.values(s.qs || {});
    const t = s.lastActive && s.lastActive.toDate ? s.lastActive.toDate() : null;
    return [m.sid, m.cls, m.seat, m.name, "是", s.answered || 0, qs.length, qs.reduce((n, q) => n + (q.w || 0), 0),
      s.readiness || 0, s.mastered || 0, (s.todo || []).filter(t => rangeOf(t) === "1").length, Object.keys(s.boss || {}).length,
      s.readiness2 || 0, s.mastered2 || 0, (s.todo2 || []).length, Object.keys(s.x || {}).length,
      t ? `${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()} ${t.toTimeString().slice(0, 5)}` : ""];
  });
  const csv = "\uFEFF" + [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
  const link = document.createElement("a"); link.href = url; link.download = `段考複習系統_${A.env === "prod" ? "正式站" : "試用站"}_使用紀錄.csv`;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  const avg = active.length ? Math.round(active.reduce((s, x) => s + RD(x), 0) / active.length) : 0;
  const R2 = A.range === "2";
  const lvOf = Object.fromEntries(active.map(s => [s.sid, levelCounts(s)]));
  const avgHi = active.length ? (active.reduce((a, s) => a + lvOf[s.sid][3] + lvOf[s.sid][4], 0) / active.length).toFixed(1) : "0";

  // 觀念掌握：使用過的學生中，已攻克的比例（由低到高）
  const conceptRows = CORE_().map(t => {
    const tried = active.filter(s => s.c && s.c[t]);
    const m = active.filter(s => s.c && s.c[t] && s.c[t].m).length;
    return {t, pct: active.length ? Math.round(m / active.length * 100) : 0, tried: tried.length};
  }).filter(r => r.tried > 0).sort((a, b) => a.pct - b.pct).slice(0, 10);

  /* 第二次段考：全班觀念弱點表（依全班「最近一次答對率」由低到高） */
  const weak2 = !R2 ? [] : CORE2.map(t => {
    let tried = 0, ok = 0; const rs = {}; const lv = [0, 0, 0, 0, 0];
    for (const s of active) {
      const qs = s.qs || {}; lv[levelOf(s, t)]++;
      for (const id of TAG_QS[t] || []) { const st = qs[id]; if (!st) continue; tried++; if (st.l === 1) ok++;
        (st.r || []).forEach((n, k) => { if (n && k < 3) rs[id + "|" + k] = (rs[id + "|" + k] || 0) + n; if (n && k === 3) rs["idk"] = (rs["idk"] || 0) + n; }); }
    }
    const topKey = Object.entries(rs).sort((a, b) => b[1] - a[1])[0];
    let why = "";
    if (topKey) { if (topKey[0] === "idk") why = "不知道錯在哪"; else { const [id, k] = topKey[0].split("|"); const q = BY_ID[id]; why = q && q.reasons ? q.reasons[+k] : ""; } }
    return {t, tried, rate: tried ? Math.round(ok / tried * 100) : null, lv, why, whyN: topKey ? topKey[1] : 0};
  });
  const weakShown = weak2.filter(r => r.tried >= 3).sort((a, b) => a.rate - b.rate);
  // 最常答錯的題目：至少 3 人次作答
  const qAgg = {};
  for (const s of active) for (const [id, st] of Object.entries(s.qs || {})) {
    const g = qAgg[id] || (qAgg[id] = {a: 0, w: 0, r: [0, 0, 0, 0]});
    g.a += st.a || 0; g.w += st.w || 0; (st.r || []).forEach((n, i) => g.r[i] += n || 0);
  }
  const hardQs = Object.entries(qAgg).filter(([id, g]) => g.a >= 3 && BY_ID[id] && rangeOf(BY_ID[id].tag) === A.range)
    .map(([id, g]) => ({id, ...g, rate: Math.round(g.w / g.a * 100)})).sort((a, b) => b.rate - a.rate).slice(0, 8);

  const rows = members.map(m => {
    const s = bySid[m.sid];
    const open = A.open === m.sid;
    const main = s
      ? `<tr class="stu" data-a="open" data-k="${esc(m.sid)}"><td class="num">${esc(m.seat)}</td><td>${esc(m.name)}</td><td class="num muted">${esc(m.sid)}</td>
          ${R2 ? `<td style="min-width:180px">${levelBar(lvOf[m.sid])}</td><td class="num">${lvOf[m.sid][3] + lvOf[m.sid][4]} / ${CORE2.length}</td><td class="num">${lvOf[m.sid][2]}</td>`
               : `<td><div style="display:flex;gap:8px;align-items:center"><div class="bar" style="flex:1"><i style="width:${RD(s)}%"></i></div><span class="num">${RD(s)}%</span></div></td><td class="num">${MS(s)} / ${CORE_().length}</td>`}
          <td class="num">${TD(s).length}</td><td>${fmtTime(s.lastActive)}</td></tr>`
      : `<tr><td class="num">${esc(m.seat)}</td><td>${esc(m.name)}</td><td class="num muted">${esc(m.sid)}</td><td colspan="${R2 ? 5 : 4}" class="none">尚未使用</td></tr>`;
    const lvList = R2 && s ? [4, 3, 2, 1].map(k => { const ts = CORE2.filter(t => levelOf(s, t) === k); return ts.length ? `<div class="lvline"><span class="pill ${LV[k].c}">${LV[k].name} ${ts.length}</span>${ts.map(t => `<span class="small">${t} ${esc(CONCEPTS[t])}</span>`).join("、")}</div>` : ""; }).join("") : "";
    const detail = open && s ? `<tr class="detail"><td colspan="${R2 ? 8 : 7}">${lvList}<b>待攻克的觀念：</b>${TD(s).length ? TD(s).map(t => `<span class="pill bad">${t} ${esc(CONCEPTS[t] || "")}</span>`).join("") : "<span class='muted'>沒有</span>"}
      <br><span class="small muted">累計作答 ${s.answered || 0} 題｜${A.range === "2" ? `檢查錯誤練過 ${Object.keys(s.x || {}).length} 題` : `魔王關擊敗 ${Object.keys(s.boss || {}).length} / ${(window.BOSS || []).length} 題`}</span></td></tr>` : "";
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
    ${R2 ? `<div class="tile"><b>${avgHi}</b><span>平均熟練以上的觀念數（共 ${CORE2.length} 個）</span></div>` : `<div class="tile"><b>${avg}%</b><span>平均第一次段考準備度（使用者）</span></div>`}
    <div class="tile"><b>${active.reduce((s, x) => s + (x.answered || 0), 0)}</b><span>全班累計作答題數</span></div>
  </div>
  <div class="card"><h2>學生進度</h2><p class="small muted" style="margin:0">${R2 ? `點一下學生可以看他每個觀念的等級。等級條顏色：${[4, 3, 2, 1, 0].map(k => `<span class="pill ${LV[k].c}">${LV[k].name}</span>`).join("")}` : "點一下學生可以看他的待攻克觀念。"}</p>
    <div class="scroll"><table><thead><tr><th>座號</th><th>姓名</th><th>學號</th>${R2 ? `<th>觀念等級</th><th>熟練以上</th><th>會做</th>` : `<th style="min-width:160px">準備度</th><th>已攻克</th>`}<th>待攻克</th><th>最後使用</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>
  <div class="grid2">
    ${R2 ? `<div class="card"><h2>全班觀念弱點表</h2><p class="small muted" style="margin:0">依全班「最近一次答對率」由低到高（只列至少 3 人次作答的觀念）。右邊是各等級人數，下方是全班最常選的錯因，可以挑來上課講。</p>
      ${weakShown.length ? (A.allWeak ? weakShown : weakShown.slice(0, 10)).map(r => `<div class="wrow"><div class="crow"><span>${r.t}　${esc(CONCEPTS[r.t])}</span><div class="bar"><i style="width:${r.rate}%"></i></div><span class="num">${r.rate}%</span></div>
        <div class="wmeta">${levelBar(r.lv)}<span class="small muted">熟練以上 ${r.lv[3] + r.lv[4]} 人・會做 ${r.lv[2]} 人・沒練過 ${r.lv[0]} 人・${r.tried} 人次</span></div>
        ${r.why ? `<div class="small muted">最常選的錯因（${r.whyN} 次）：${r.why}</div>` : ""}</div>`).join("")
        + (weakShown.length > 10 ? `<button class="btn ghost" data-a="allweak">${A.allWeak ? "只看最弱 10 個" : `看全部 ${weakShown.length} 個`}</button>` : "")
        : `<p class="muted">還沒有足夠的作答資料。</p>`}
    </div>` : `<div class="card"><h2>全班最弱的觀念</h2><p class="small muted" style="margin:0">已攻克人數比例最低的觀念（只計有練習過的學生）。</p>
      ${conceptRows.length ? conceptRows.map(r => `<div class="crow"><span>${r.t}　${esc(CONCEPTS[r.t])}</span><div class="bar"><i style="width:${r.pct}%"></i></div><span class="num">${r.pct}%</span></div>`).join("") : `<p class="muted">還沒有足夠的作答資料。</p>`}
    </div>`}
    <div class="card"><h2>最常答錯的題目</h2><p class="small muted" style="margin:0">至少 3 人次作答，依答錯率排序；並列出學生最常選的錯因。</p>
      ${hardQs.length ? hardQs.map(h => { const q = BY_ID[h.id], top = h.r.indexOf(Math.max(...h.r));
        return `<div class="qrow"><div class="meta"><b>${h.id}</b><span class="rate">答錯率 ${h.rate}%</span><span>${h.a} 人次</span></div><div>${q.gen && window.VARY ? q.gen(VARY.mk(1)).stem + '<span class="small muted">（數字變形題，數字每次不同，這是其中一例）</span>' : q.stem}</div>${Math.max(...h.r) > 0 ? `<div class="small muted">最常選的錯因：${top === 3 ? "不知道錯在哪" : q.reasons[top]}</div>` : ""}</div>`; }).join("") : `<p class="muted">還沒有足夠的作答資料。</p>`}
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
  if (a === "range") set({range: k, open: null});
  if (a === "reload") loadData();
  if (a === "open") set({open: A.open === k ? null : k});
  if (a === "allweak") set({allWeak: !A.allWeak});
  if (a === "doimport") doImport();
  if (a === "export") exportCSV();
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
