/* 段考複習系統：主程式
   題庫在 unit0X.js，觀念清單在 concepts.js，Firebase 設定在 firebase-config.js。
   未登入時進度暫存在這台裝置；用學校 Google 帳號登入後，進度存到雲端（Firestore）。 */

const ICON = "icon-192.png";
/* 同一套檔案放在兩個網址：網址含 -test 的是「試用站」，其餘是正式站。
   兩站在同一個網域，所以進度用不同的名稱分開保存，互不影響。 */
const IS_TEST = /-test(\/|$)/.test(location.pathname);
if (IS_TEST) document.documentElement.classList.add("test-site");
const UNITS = window.UNITS.map(u => ({...u, bank: (window[u.key] || []).map(q => ({...q, unit: u.code}))}));
const BANK = UNITS.flatMap(u => u.bank);
const BY_ID = Object.fromEntries(BANK.map(q => [q.id, q]));
const CONCEPTS = window.CONCEPTS;
const SUPP = new Set(window.SUPP_CONCEPTS);
const CORE = Object.keys(CONCEPTS).filter(t => !SUPP.has(t));
const unitOf = tag => ({R:"01", A:"02", E:"03", L:"04"})[tag[0]];

/* ---------- 雲端（Firebase） ---------- */
const ENV = IS_TEST ? "test" : "prod";              // 試用站與正式站的資料分開存
const DOMAIN = window.SCHOOL_DOMAIN;
let auth = null, db = null, ME = null;             // ME：目前登入的人
try {
  firebase.initializeApp(window.FIREBASE_CONFIG);
  auth = firebase.auth(); db = firebase.firestore();
} catch (e) { console.warn("Firebase 無法啟動", e); }
const isTeacherEmail = e => (window.TEACHERS || []).map(x => x.toLowerCase()).includes((e || "").toLowerCase());
const isSchoolEmail = e => (e || "").toLowerCase().endsWith("@" + DOMAIN);

/* ---------- 進度 ---------- */
const KEY = IS_TEST ? "exam-review-test-guest" : "exam-review-guest";   // 未登入時的暫存
let P = loadGuest();
function emptyP(){ return {c: {}, answered: 0, qs: {}}; }
function loadGuest(){
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.c) return {...emptyP(), ...v}; } catch (_) {}
  return emptyP();
}
function clearGuest(){ try { localStorage.removeItem(KEY); } catch (_) {} }
let dirty = false;
function save(){
  if (!ME) { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) {} return; }
  try { localStorage.setItem(KEY + "-" + ME.uid, JSON.stringify(P)); } catch (_) {}   // 先存在手機，避免斷線遺失
  dirty = true;
}
/* 為了節省免費額度：每練完一回、回到首頁、或離開 App 時才上傳一次 */
function pushCloud(force){
  if (!ME || !db || (!dirty && !force)) return Promise.resolve();
  dirty = false;
  return db.doc(`envs/${ENV}/students/${ME.uid}`).set({
    uid: ME.uid, email: ME.email, sid: ME.sid, name: ME.name, cls: ME.cls, seat: ME.seat,
    c: P.c, qs: P.qs, answered: P.answered,
    readiness: readiness(), mastered: mastered().length, todo: todo(),
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }, {merge: true}).catch(e => { dirty = true; console.error(e); toast("進度暫時沒有上傳成功，下次會再試一次"); });
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") pushCloud(); });
const cs = tag => P.c[tag] || {s: 0, m: false, w: false};       // s 連續答對次數、m 已攻克、w 待攻克
function record(q, right){
  const c = {...cs(q.tag)};
  if (right) { c.s += 1; if (c.s >= 2 && !c.m) { c.m = true; c.w = false; S.newly.push(q.tag); } }
  else { c.s = 0; c.m = false; c.w = true; }
  P.c[q.tag] = c; P.answered += 1;
  const st = P.qs[q.id] || {a: 0, w: 0, r: [0, 0, 0]};
  P.qs[q.id] = {...st, a: st.a + 1, w: st.w + (right ? 0 : 1)};
  save();
}
function recordWhy(q, k){
  const st = P.qs[q.id] || {a: 0, w: 0, r: [0, 0, 0]};
  const r = [...(st.r || [0, 0, 0])]; r[k] = (r[k] || 0) + 1;
  P.qs[q.id] = {...st, r}; save();
}

/* ---------- 登入 ---------- */
async function login(){
  if (!auth) { toast("目前無法連線登入，請檢查網路後重新整理"); return; }
  const p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({prompt: "select_account"});
  try { await auth.signInWithPopup(p); }
  catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) await auth.signInWithRedirect(p);
    else if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code)) toast("登入失敗：" + e.code);
  }
}
async function logout(){
  if (ME) await pushCloud();
  if (auth) await auth.signOut();
}
if (auth) auth.onAuthStateChanged(async u => {
  if (!u) { ME = null; P = loadGuest(); set({screen: S.screen === "quiz" ? "quiz" : "welcome", loading: false}); return; }
  const email = (u.email || "").toLowerCase();
  if (!isSchoolEmail(email) && !isTeacherEmail(email)) {
    await auth.signOut(); toast(`請改用 ${DOMAIN} 的學校帳號登入`); return;
  }
  const sid = email.split("@")[0];
  ME = {uid: u.uid, email, sid, name: u.displayName || sid, cls: "", seat: "", teacher: isTeacherEmail(email)};
  set({loading: true, sheet: null});
  try {
    if (!ME.teacher) {
      const r = await db.doc(`envs/${ENV}/roster/${sid}`).get();
      if (r.exists) { const d = r.data(); ME.name = d.name || ME.name; ME.cls = d.cls || ""; ME.seat = d.seat || ""; }
    }
    const doc = await db.doc(`envs/${ENV}/students/${u.uid}`).get();
    const cloud = doc.exists ? doc.data() : null;
    const guest = P;
    P = cloud
      ? {c: {...guest.c, ...(cloud.c || {})}, answered: cloud.answered || 0, qs: {...guest.qs, ...(cloud.qs || {})}}
      : {...guest};
    clearGuest();
    await pushCloud(true);
  } catch (e) { console.error(e); toast("讀取雲端進度失敗，請檢查網路後重新整理"); }
  set({loading: false, screen: S.screen === "quiz" ? "quiz" : "home"});
});

const conceptScore = t => { const c = cs(t); return c.m ? 1 : c.s >= 1 ? 0.5 : 0; };
const readiness = () => Math.round(CORE.reduce((s, t) => s + conceptScore(t), 0) / CORE.length * 100);
const mastered = () => CORE.filter(t => cs(t).m);
const todo = () => Object.keys(CONCEPTS).filter(t => cs(t).w && !cs(t).m);

/* ---------- 出題 ---------- */
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const coreQs = () => BANK.filter(q => !q.supp);
function pick(mode, unit){
  if (mode === "health") return window.HEALTH_CHECK.map(id => BY_ID[id]).filter(Boolean);
  if (mode === "quick") { // 還沒攻克的觀念優先，每個觀念最多 1 題
    const seen = new Set(), out = [];
    const qs = shuffle(coreQs()).sort((a, b) => (cs(a.tag).m ? 1 : 0) - (cs(b.tag).m ? 1 : 0));
    for (const q of qs) { if (!seen.has(q.tag)) { seen.add(q.tag); out.push(q); } if (out.length === 8) break; }
    return out;
  }
  if (mode === "weak") { const t = new Set(todo()); return shuffle(BANK.filter(q => t.has(q.tag))).slice(0, 8); }
  if (mode === "hard") return shuffle(coreQs().filter(q => q.level === "難")).slice(0, 6);
  if (mode === "unit") return shuffle(coreQs().filter(q => q.unit === unit)).slice(0, 8);
  if (mode === "supp") return shuffle(BANK.filter(q => q.supp));
  return [];
}

/* ---------- 畫面狀態 ---------- */
let S = {screen: "welcome", loading: false, mode: null, list: [], i: 0, sel: [], typed: "", done: false, why: null, log: [], newly: [], sheet: null};
const app = document.getElementById("app");
const scroller = document.getElementById("scroller") || document.scrollingElement;
/* 作答中的這一回也存起來：不小心重新整理或切換 App，回來可以接著做 */
const SKEY = (IS_TEST ? "exam-review-test" : "exam-review") + "-session";
function persistSession(){
  try {
    if (S.screen === "quiz") localStorage.setItem(SKEY, JSON.stringify({t: Date.now(), mode: S.mode, ids: S.list.map(q => q.id), i: S.i, sel: S.sel, typed: S.typed, done: S.done, why: S.why, log: S.log, newly: S.newly}));
    else localStorage.removeItem(SKEY);
  } catch (_) {}
}
function restoreSession(){
  try {
    const v = JSON.parse(localStorage.getItem(SKEY));
    if (!v || Date.now() - v.t > 3 * 3600e3) return;
    const list = v.ids.map(id => BY_ID[id]).filter(Boolean);
    if (!list.length || list.length !== v.ids.length) return;
    Object.assign(S, {screen: "quiz", mode: v.mode, list, i: v.i, sel: v.sel, typed: v.typed, done: v.done, why: v.why, log: v.log, newly: v.newly});
  } catch (_) {}
}
const set = p => { Object.assign(S, p); render(); persistSession(); if (p.screen && p.screen !== "quiz") pushCloud(); };
const badge = () => IS_TEST ? `<span class="proto test">試用站　這裡的改動不會影響學生</span>` : "";
const tagLabel = t => `${t}　${CONCEPTS[t] || ""}`;

function startSession(mode, unit){
  const list = pick(mode, unit);
  if (!list.length) { toast(mode === "weak" ? "目前沒有待攻克的觀念，先去快刷吧" : "這裡還沒有題目"); return; }
  scroller.scrollTo(0, 0);
  set({screen: "quiz", mode, list, i: 0, sel: [], typed: "", done: false, why: null, log: [], newly: [], sheet: null});
}
function isRight(q){
  if (q.type === "num") return S.typed === q.ans;
  return [...S.sel].sort().join() === [...q.ans].sort().join();
}

/* ---------- 歡迎頁 ---------- */
function vWelcome(){
  return `${badge()}
  <div class="hero">
    <img src="${ICON}" alt="">
    <span class="eyebrow">高一數學・第一次段考　單元 01–04</span>
    <h1>先花 <span class="hl num">60</span> 秒，<br>看看你準備到哪裡</h1>
    <p class="muted">6 題快速健檢，不用登入。做完馬上告訴你最該補的觀念。</p>
  </div>
  <div class="facts">
    <div class="fact"><b>${BANK.length}</b><span>道試題</span></div>
    <div class="fact"><b>4</b><span>個單元</span></div>
    <div class="fact"><b>${CORE.length}</b><span>個觀念</span></div>
  </div>
  <div class="grow"></div>
  <div class="stack">
    <button class="btn" data-a="start" data-k="health">開始健檢</button>
    <button class="link" data-a="loginsheet">已經用過？用學校 Google 帳號登入</button>
  </div>
  <p class="credit">系統製作：汪陽老師</p>`;
}

/* ---------- 作答 ---------- */
function optHTML(q, k, txt){
  let c = "opt";
  if (S.done) { if (q.ans.includes(k)) c += " right"; else if (S.sel.includes(k)) c += " wrong"; }
  else if (S.sel.includes(k)) c += " sel";
  const mk = q.type === "tf" ? "" : `<span class="mk">${q.type === "multi" && S.sel.includes(k) && !S.done ? "✓" : "ABCDE"[k]}</span>`;
  return `<button class="${c}" data-a="pick" data-k="${k}" ${S.done ? "disabled" : ""}>${mk}<span>${txt}</span></button>`;
}
function vQuiz(){
  const q = S.list[S.i], right = S.done && isRight(q), n = S.list.length;
  let body = "";
  if (q.type === "tf") body = `<div class="tfrow">${q.opts.map((t, k) => optHTML(q, k, t)).join("")}</div>`;
  else if (q.type === "num") {
    const cls = S.done ? (right ? " right" : " wrong") : "";
    body = `<div class="numbox${cls}"><span class="num">${S.typed}${S.done ? "" : '<span class="caret"></span>'}</span><span class="unit">${q.unitWord || ""}</span></div>
    ${S.done ? (right ? "" : `<p class="small muted">正確答案：<b class="num">${q.ans}</b> ${q.unitWord || ""}</p>`) : `<div class="keys">${["1","2","3","4","5","6","7","8","9",".","0","⌫"].map(x => `<button data-a="key" data-k="${x}" aria-label="${x === "⌫" ? "刪除" : x}">${x}</button>`).join("")}</div>`}`;
  }
  else body = `<div class="opts ${q.type === "multi" ? "multi" : ""}">${q.opts.map((t, k) => optHTML(q, k, t)).join("")}</div>`;

  const answered = q.type === "num" ? S.typed.length > 0 : S.sel.length > 0;
  let fb = "";
  if (S.done) {
    const peers = typeof q.stuck === "number" ? `<div class="peers"><span class="dots"><i></i><i></i><i></i></span>全班有 <b class="num">${q.stuck}%</b> 的人也在這題卡過</div>` : `<p class="small">卡住很正常，弄懂它就是一個新攻克的觀念。</p>`;
    const why = right ? "" : `<div class="why"><span class="small">你覺得錯在哪？</span>
      ${q.reasons.map((r, k) => { let c = ""; if (S.why !== null) { if (k === q.key) c = "key"; else if (k === S.why) c = "pick"; } return `<button class="${c}" data-a="why" data-k="${k}" ${S.why !== null ? "disabled" : ""}>${r}</button>`; }).join("")}</div>`;
    const showExp = right || S.why !== null;
    const whyMsg = (!right && S.why !== null) ? `<p class="small">${S.why === q.key ? "對，關鍵就在這裡。" : "最常見的卡點其實是：「" + q.reasons[q.key] + "」。"}</p>` : "";
    const c = cs(q.tag);
    const okMsg = S.newly.includes(q.tag) ? `攻克了「${CONCEPTS[q.tag]}」！` : c.m ? "這個觀念已經攻克，保持住！" : "答對一次，這個觀念再答對一次就攻克。";
    fb = `<div class="fb ${right ? "ok" : "no"}">
      <h2>${right ? "答對了" : "這題你還沒掌握"}</h2>
      ${right ? `<p class="small">${okMsg}</p>` : peers}
      ${why}${whyMsg}
      ${showExp ? `<div class="exp"><b>解析</b><div>${q.exp}</div>${q.fast ? `<div class="fast">${q.fast}</div>` : ""}</div>` : ""}
    </div>`;
  }
  const canNext = S.done && (right || S.why !== null);
  return `
  <div class="top"><button aria-label="離開" data-a="home" style="font-size:22px;line-height:1">×</button>
    <div class="bar"><i style="width:${(S.i + (S.done ? 1 : 0)) / n * 100}%"></i></div>
    <span class="num small muted">${S.i + 1}/${n}</span></div>
  <div class="stack" style="gap:8px"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip">單元${q.unit}</span><span class="chip">${tagLabel(q.tag)}</span>${q.supp ? '<span class="chip supp">補充</span>' : ""}</div>
  <div class="stem">${q.stem}</div></div>
  ${body}
  ${fb}
  <div class="grow"></div>
  <div class="dock">${S.done
    ? `<button class="btn" data-a="next" ${canNext ? "" : "disabled"}>${S.i === n - 1 ? "看結果" : "下一題"}</button>`
    : `<button class="btn" data-a="submit" ${answered ? "" : "disabled"}>送出</button>`}</div>`;
}

/* ---------- 結果 ---------- */
function ring(p, label = "段考準備度"){
  const C = 2 * Math.PI * 52;
  return `<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="10"/>
  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * p / 100} ${C}"/></svg>
  <div class="v"><div><b>${p}<small>%</small></b><br><span>${label}</span></div></div></div>`;
}
function vResult(){
  const right = S.log.filter(l => l.right).length, n = S.log.length;
  const wrongTags = [...new Set(S.log.filter(l => !l.right).map(l => S.list[l.i].tag))];
  if (S.mode === "health") {
    const p = Math.round(right / n * 100);
    const rows = UNITS.map(u => { const ls = S.log.filter(l => S.list[l.i].unit === u.code), r = ls.filter(l => l.right).length;
      return `<div class="urow"><span>${u.code} ${u.name}</span><div class="bar"><i style="width:${ls.length ? r / ls.length * 100 : 0}%"></i></div><span class="num">${r}/${ls.length}</span></div>`; }).join("");
    return `${badge()}
    <h1>你的健檢結果</h1>
    <div class="score">${ring(p, "健檢答對率")}<div class="units grow" style="min-width:0">${rows}</div></div>
    <div class="card"><h2>最該先補的觀念</h2>
      ${wrongTags.length ? `<ul class="todo">${wrongTags.map(t => `<li>${tagLabel(t)}</li>`).join("")}</ul>` : `<p class="muted">6 題全對！登入後挑戰更多題目。</p>`}
    </div>
    <div class="grow"></div>
    <div class="stack">
      ${ME ? `<button class="btn" data-a="home">回到首頁</button>` : `<p class="small muted">登入後會保存結果，並幫你排好複習路線。</p>
      <button class="gbtn" data-a="loginsheet">${gIcon()}使用學校 Google 帳號登入</button>`}
    </div>`;
  }
  return `${badge()}
  <h1>這回答對 <span class="num">${right}</span> / <span class="num">${n}</span></h1>
  ${S.newly.length ? `<div class="card win"><h2>這回攻克了</h2><ul class="todo done">${S.newly.map(t => `<li>${tagLabel(t)}</li>`).join("")}</ul></div>` : ""}
  ${wrongTags.length ? `<div class="card"><h2>加入待攻克</h2><ul class="todo">${wrongTags.map(t => `<li>${tagLabel(t)}</li>`).join("")}</ul></div>` : ""}
  <div class="score">${ring(readiness())}<div class="grow stack" style="gap:6px;min-width:0"><b>已攻克 <span class="num">${mastered().length}</span> / <span class="num">${CORE.length}</span> 個觀念</b><span class="small muted">同一個觀念連續答對 2 次就攻克。</span></div></div>
  <div class="grow"></div>
  <div class="stack">
    <button class="btn" data-a="again">再來一回</button>
    <button class="btn ghost" data-a="home">回到首頁</button>
  </div>`;
}
function gIcon(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8C3.9 20.5 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.1 4.9l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.5 2.1 7.1l3.6 2.8c.9-2.6 3.4-4.5 6.3-4.5z"/></svg>`}

/* ---------- 首頁 ---------- */
function vHome(){
  const t = todo(), m = mastered().length;
  const units = UNITS.map(u => { const tags = CORE.filter(x => unitOf(x) === u.code), done = tags.filter(x => cs(x).m).length;
    return `<button class="unitrow" data-a="start" data-k="unit" data-u="${u.code}"><span class="un">${u.code}</span><span class="grow" style="min-width:0"><b>${u.name}</b><span class="bar"><i style="width:${done / tags.length * 100}%"></i></span></span><span class="num small muted">${done}/${tags.length}</span></button>`; }).join("");
  return `${badge()}
  <div class="hello"><div class="av">${(ME && ME.name || "我").slice(0, 1)}</div><div class="grow"><p>${ME ? (ME.cls ? `${ME.cls} 班 ${ME.seat} 號　` : "") + ME.name : ""}</p><p style="font-weight:700">今天想怎麼複習？</p></div></div>
  <div class="score">${ring(readiness())}<div class="grow stack" style="gap:6px;min-width:0"><b>已攻克 <span class="num">${m}</span> / <span class="num">${CORE.length}</span> 個觀念</b><span class="small muted">${t.length ? `還有 <span class="num">${t.length}</span> 個待攻克。` : "還沒有待攻克的觀念。"}同一個觀念連續答對 2 次就攻克。</span></div></div>
  <div class="modes">
    <button class="mode main" data-a="start" data-k="quick"><span class="ic">5</span><b>5 分鐘快刷</b><span>8 題，混合各單元</span></button>
    <button class="mode" data-a="start" data-k="weak"><span class="ic">!</span><b>攻弱點</b><span>只練待攻克</span></button>
    <button class="mode" data-a="start" data-k="hard"><span class="ic">↑</span><b>挑戰難題</b><span>段考壓軸等級</span></button>
  </div>
  <div class="card"><h2>依單元練習</h2><div class="stack" style="gap:8px">${units}</div>
    <button class="unitrow supp" data-a="start" data-k="supp"><span class="un">+</span><span class="grow" style="min-width:0"><b>補充：對數律</b><span class="small muted">課綱外，不計入準備度</span></span></button></div>
  ${t.length ? `<div class="card"><h2>待攻克</h2><ul class="todo">${t.map(x => `<li>${tagLabel(x)}</li>`).join("")}</ul></div>` : ""}
  <button class="link" data-a="logout">登出</button>`;
}

/* ---------- 底部面板 ---------- */
function vSheet(){
  if (S.sheet === "login") return `<div class="scrim" data-a="close"><div class="sheet" role="dialog" aria-label="登入">
    <span class="grab"></span>
    <b>用學校 Google 帳號登入</b>
    <p class="small muted">請選 <b>學號@${DOMAIN}</b> 的帳號。登入後進度會存到雲端，換手機也不會不見。</p>
    <button class="gbtn" data-a="login">${gIcon()}使用 Google 帳號登入</button>
  </div></div>`;
  return "";
}

/* ---------- 繪製與事件 ---------- */
function render(){
  if (S.loading) { app.innerHTML = `<div class="grow" style="display:grid;place-items:center"><p class="muted">讀取你的進度中…</p></div>`; return; }
  const v = {welcome: vWelcome, quiz: vQuiz, result: vResult, home: vHome}[S.screen]();
  app.innerHTML = v + vSheet();
  if (window.MathJax && MathJax.typesetPromise) {
    try { MathJax.typesetClear && MathJax.typesetClear([app]); } catch (_) {}
    MathJax.typesetPromise([app]).catch(() => {});
  }
}
function toast(t){ const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2400); }

app.addEventListener("click", e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a, k = b.dataset.k;
  if (a === "close" && e.target !== b) return;
  const q = S.list[S.i];
  switch (a) {
    case "start": startSession(k, b.dataset.u); break;
    case "again": startSession(S.mode, S.list[0] && S.list[0].unit); break;
    case "pick": { const n = +k;
      if (q.type === "multi") set({sel: S.sel.includes(n) ? S.sel.filter(x => x !== n) : [...S.sel, n]}); else set({sel: [n]}); break; }
    case "key": { let t = S.typed; if (k === "⌫") t = t.slice(0, -1); else if (t.length < 6) t += k; set({typed: t}); break; }
    case "submit": { const r = isRight(q); S.log.push({i: S.i, right: r}); record(q, r); set({done: true}); break; }
    case "why": recordWhy(q, +k); set({why: +k}); break;
    case "next": scroller.scrollTo(0, 0);
      if (S.i === S.list.length - 1) set({screen: "result"}); else set({i: S.i + 1, sel: [], typed: "", done: false, why: null}); break;
    case "home": set({screen: ME ? "home" : "welcome", sheet: null}); break;
    case "loginsheet": set({sheet: "login"}); break;
    case "close": set({sheet: null}); break;
    case "login": login(); break;
    case "logout": logout(); break;
  }
});
restoreSession();
render();
