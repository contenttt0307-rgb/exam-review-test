/* 段考複習系統：主程式
   題庫在 unit0X.js，觀念清單在 concepts.js，Firebase 設定在 firebase-config.js。
   未登入時進度暫存在這台裝置；用學校 Google 帳號登入後，進度存到雲端（Firestore）。 */

const ICON = "icon-192.png";
/* 同一套檔案放在兩個網址：網址含 -test 的是「試用站」，其餘是正式站。
   兩站在同一個網域，所以進度用不同的名稱分開保存，互不影響。 */
const IS_TEST = /-test(\/|$)/.test(location.pathname);
if (IS_TEST) document.documentElement.classList.add("test-site");
/* 兩個段考範圍：1＝第一次段考（單元 01–04）、2＝第二次段考（單元 05–07）。首頁可以切換。 */
const mkUnits = list => (list || []).map(u => ({...u, bank: (window[u.key] || []).map(q => ({...q, unit: u.code}))}));
const UNITS1 = mkUnits(window.UNITS), UNITS2 = mkUnits(window.UNITS2);
const UNITS = [...UNITS1, ...UNITS2];
const BANK = UNITS.flatMap(u => u.bank);
const unitOf = tag => ({R:"01", A:"02", E:"03", L:"04", S:"05", C:"06", T:"07"})[tag[0]];
const rangeOf = tag => "SCT".includes(tag[0]) ? "2" : "1";
const CATCH = (window.CATCH_KEYS || []).flatMap(k => (window[k] || []).map(x => ({...x, kind: "catch", unit: unitOf(x.tag)})));
const BY_ID = Object.fromEntries([...BANK, ...CATCH].map(q => [q.id, q]));
const BOSS = (window.BOSS || []).map(q => ({...q, unit: "BOSS"}));   // 魔王關：不算在題庫題數與準備度裡
BOSS.forEach(q => { BY_ID[q.id] = q; });
const BOSS_UNLOCK = 90;
const CONCEPTS = {...window.CONCEPTS, ...(window.CONCEPTS2 || {})};
const SUPP = new Set(window.SUPP_CONCEPTS);
const CORE = Object.keys(window.CONCEPTS).filter(t => !SUPP.has(t));   // 第一次段考的觀念
const CORE2 = Object.keys(window.CONCEPTS2 || {});                    // 第二次段考的觀念
const CATS = ["基本分", "必考題", "陷阱題", "拉分題"];
const CAT_INFO = {"基本分": "課本例題程度，先拿穩", "必考題": "段考一定會考的題型", "陷阱題": "最容易粗心看錯的地方", "拉分題": "段考壓軸等級"};
const XTYPE = ["正負號", "分數計算", "移項／乘開", "公式或漏步驟"];
const RANGES = {
  "1": {name: "第一次段考", span: "01–04", units: UNITS1, core: CORE},
  "2": {name: "第二次段考", span: "05–07", units: UNITS2, core: CORE2}
};
if (window.FIG_CSS) { const st = document.createElement("style"); st.textContent = window.FIG_CSS; document.head.appendChild(st); }

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
const OLD_KEY = IS_TEST ? "exam-review-test-v1" : "exam-review-v1";   // 舊版（免登入版）存在手機的進度，登入時一併帶進帳號
let P = loadGuest();
function emptyP(){ return {c: {}, answered: 0, qs: {}, boss: {}, x: {}, ch: {}, range: "2"}; }
function loadGuest(){
  for (const k of [KEY, OLD_KEY]) {
    try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.c) return {...emptyP(), c: v.c, answered: v.answered || 0, qs: v.qs || {}, boss: v.boss || {}, x: v.x || {}, ch: v.ch || {}, range: v.range || "2"}; } catch (_) {}
  }
  return emptyP();
}
const RG = () => P.range === "1" ? "1" : "2";   // 目前首頁選的段考範圍
function clearGuest(){ try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch (_) {} }
let dirty = false;
function save(){
  if (!ME || ME.guest) { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (_) {} return; }
  try { localStorage.setItem(KEY + "-" + ME.uid, JSON.stringify(P)); } catch (_) {}   // 先存在手機，避免斷線遺失
  dirty = true;
}
/* 為了節省免費額度：每練完一回、回到首頁、或離開 App 時才上傳一次 */
function pushCloud(force){
  if (!ME || ME.guest || !db || (!dirty && !force)) return Promise.resolve();
  dirty = false;
  return db.doc(`envs/${ENV}/students/${ME.uid}`).set({
    uid: ME.uid, email: ME.email, sid: ME.sid, name: ME.name, cls: ME.cls, seat: ME.seat,
    c: P.c, qs: P.qs, answered: P.answered, boss: P.boss || {}, x: P.x || {}, ch: P.ch || {}, range: RG(),
    readiness: readiness("1"), mastered: mastered("1").length, todo: todo("1"),
    readiness2: readiness("2"), mastered2: mastered("2").length, todo2: todo("2"),
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }, {merge: true}).catch(e => { dirty = true; console.error(e); toast("進度暫時沒有上傳成功，下次會再試一次"); });
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") pushCloud(); });
const cs = tag => P.c[tag] || {s: 0, m: false, w: false};       // s 連續答對次數、m 已攻克、w 待攻克
function record(q, right){
  if (q.boss) {   // 魔王題只記錄有沒有擊敗，不影響觀念攻克
    P.answered += 1;
    const st = P.qs[q.id] || {a: 0, w: 0, r: [0, 0, 0, 0]};
    P.qs[q.id] = {...st, a: st.a + 1, w: st.w + (right ? 0 : 1)};
    if (right) P.boss = {...(P.boss || {}), [q.id]: true};
    save(); return;
  }
  if (q.kind === "catch") {   // 抓錯題：只記錄練習次數，不影響觀念攻克
    P.answered += 1;
    const st = (P.x || {})[q.id] || {a: 0, w: 0};
    P.x = {...(P.x || {}), [q.id]: {a: st.a + 1, w: st.w + (right ? 0 : 1)}};
    save(); return;
  }
  const st = P.qs[q.id] || {a: 0, w: 0, r: [0, 0, 0]};
  P.qs[q.id] = {...st, a: st.a + 1, w: st.w + (right ? 0 : 1), l: right ? 1 : 0};   // l：最近一次是否答對
  const c = {...cs(q.tag)};
  if (rangeOf(q.tag) === "2") {
    /* 第二次段考：平常練習只累積「已答對題數」（最多算到 80%），
       要通過這個觀念的「限時挑戰」才算攻克（見 finishExam）。 */
    c.s = okCount(q.tag);
    if (!right && !c.m) c.w = true;
  }
  else if (right) { c.s += 1; if (c.s >= 2 && !c.m) { c.m = true; c.w = false; S.newly.push(q.tag); } }
  else { c.s = 0; c.m = false; c.w = true; }
  P.c[q.tag] = c; P.answered += 1;
  save();
}
function recordWhy(q, k){
  const st = P.qs[q.id] || {a: 0, w: 0, r: [0, 0, 0, 0]};
  const r = [...(st.r || [0, 0, 0, 0])]; r[k] = (r[k] || 0) + 1;
  P.qs[q.id] = {...st, r}; save();
}

/* ---------- 登入 ---------- */
/* LINE、IG、FB 等 App 內建的瀏覽器，Google 不允許在裡面登入 */
const IN_APP = /\bLine\/|Instagram|FBAN|FBAV|FB_IAB|Messenger|MicroMessenger|Threads/i.test(navigator.userAgent || "");
/* 從手機主畫面的圖示開啟（加入主畫面）時，Google 登入視窗打不開 */
const STANDALONE = !!(navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches));
function copyLink(){
  const url = location.origin + location.pathname;
  const done = () => toast("已複製網址，請貼到 Safari 或 Chrome 開啟");
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt("請複製這個網址：", url));
  else prompt("請複製這個網址：", url);
}
async function login(){
  if (!auth) { toast("目前無法連線登入，請檢查網路後重新整理"); return; }
  const p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({prompt: "select_account"});
  try { await auth.signInWithPopup(p); }
  catch (e) {
    /* 不改用「跳轉登入」：Safari、新版 Chrome 會擋掉跨網站的暫存資料，跳轉回來會出現 missing initial state 的錯誤 */
    if (e.code === "auth/popup-blocked") toast("登入視窗被擋住了，請允許這個網站開啟彈出式視窗後再試一次");
    else if (e.code === "auth/operation-not-supported-in-this-environment") toast("這裡無法登入，請用 Safari 或 Chrome 開啟網址");
    else if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code)) toast("登入失敗：" + e.code);
  }
}
/* 試用站可以免登入試用：進度只存在這台裝置，不會上傳、老師後台也看不到 */
const GUEST_FLAG = "exam-review-test-guest-mode";
function enterGuest(){
  if (!IS_TEST) return;
  try { localStorage.setItem(GUEST_FLAG, "1"); } catch (_) {}
  ME = {uid: "guest", guest: true, email: "", sid: "", name: "試用者", cls: "", seat: "", teacher: false};
  P = loadGuest(); S.err = "";
  set({screen: (S.screen === "quiz" || S.screen === "exam") ? S.screen : "home", loading: false, sheet: null});
}
const guestOn = () => { try { return IS_TEST && localStorage.getItem(GUEST_FLAG) === "1"; } catch (_) { return false; } };
async function logout(){
  if (ME && ME.guest) { try { localStorage.removeItem(GUEST_FLAG); } catch (_) {} ME = null; set({screen: "welcome", sheet: null}); return; }
  if (ME) await pushCloud();
  if (auth) await auth.signOut();
}
if (auth) auth.onAuthStateChanged(async u => {
  if (!u) { if (guestOn()) { enterGuest(); return; } ME = null; P = loadGuest(); set({screen: "welcome", loading: false, sheet: null}); return; }   // 正式站只開放登入使用
  const email = (u.email || "").toLowerCase();
  if (!isSchoolEmail(email) && !isTeacherEmail(email)) {
    S.err = `請改用 ${DOMAIN} 的學校帳號登入。`; await auth.signOut(); return;
  }
  try { localStorage.removeItem(GUEST_FLAG); } catch (_) {}
  const sid = email.split("@")[0];
  ME = {uid: u.uid, email, sid, name: u.displayName || sid, cls: "", seat: "", teacher: isTeacherEmail(email)};
  set({loading: true, sheet: null});
  try {
    if (!ME.teacher) {   // 只有名單上的學生可以使用
      const r = await db.doc(`envs/${ENV}/roster/${sid}`).get();
      if (!r.exists) { ME = null; S.err = "這個帳號不在名單上。本系統只開放汪陽老師任教班級的同學使用，若有興趣請洽詢汪陽老師（0346@sssh.tp.edu.tw）。"; await auth.signOut(); return; }
      const d = r.data(); ME.name = d.name || ME.name; ME.cls = d.cls || ""; ME.seat = d.seat || "";
    }
    const doc = await db.doc(`envs/${ENV}/students/${u.uid}`).get();
    const cloud = doc.exists ? doc.data() : null;
    const guest = P;
    P = cloud
      ? {c: {...guest.c, ...(cloud.c || {})}, answered: cloud.answered || 0, qs: {...guest.qs, ...(cloud.qs || {})}, boss: {...(guest.boss || {}), ...(cloud.boss || {})},
         x: {...(guest.x || {}), ...(cloud.x || {})}, ch: {...(guest.ch || {}), ...(cloud.ch || {})}, range: cloud.range || guest.range || "2"}
      : {...guest};
    clearGuest();
    await pushCloud(true);
  } catch (e) { console.error(e); toast("讀取雲端進度失敗，請檢查網路後重新整理"); }
  S.err = "";
  set({loading: false, screen: (S.screen === "quiz" || S.screen === "exam") ? S.screen : "home"});
});

/* 準備度：第一次段考每個觀念答對 1 次算一半、攻克算滿；第二次段考依連續答對的必考題／拉分題數（0～3 題）計分 */
/* 第二次段考：每個觀念要有 80% 的題目「最近一次答對」 */
const TAG_QS = {}; BANK.forEach(q => { if (!q.supp) (TAG_QS[q.tag] = TAG_QS[q.tag] || []).push(q.id); });
const okCount = t => (TAG_QS[t] || []).filter(id => P.qs[id] && P.qs[id].l === 1).length;
const needCount = t => Math.ceil((TAG_QS[t] || []).length * 0.8);
const practiceRatio = t => Math.min(1, okCount(t) / (needCount(t) || 1));
const conceptScore = t => { const c = cs(t); if (c.m) return 1; if (rangeOf(t) === "2") return 0.8 * practiceRatio(t); return c.s >= 1 ? 0.5 : 0; };
const readiness = (r = RG()) => { const core = RANGES[r].core; return core.length ? Math.round(core.reduce((s, t) => s + conceptScore(t), 0) / core.length * 100) : 0; };
const mastered = (r = RG()) => RANGES[r].core.filter(t => cs(t).m);
const todo = (r = RG()) => Object.keys(CONCEPTS).filter(t => rangeOf(t) === r && cs(t).w && !cs(t).m);
const ruleText = (r = RG()) => r === "2" ? "平常練習最多累積到 80%，通過觀念的限時挑戰才算攻克。" : "同一個觀念連續答對 2 次就攻克。";

/* ---------- 出題 ---------- */
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rangeQs = () => BANK.filter(q => !q.supp && rangeOf(q.tag) === RG());
/* 出題順序：還沒攻克的觀念優先；第二次段考再優先出「還沒答對過或最近答錯」的題目 */
const need = q => !(P.qs[q.id] && P.qs[q.id].l === 1);
const unmasteredFirst = qs => shuffle(qs).sort((a, b) => ((cs(a.tag).m ? 2 : 0) + (need(a) ? 0 : 1)) - ((cs(b.tag).m ? 2 : 0) + (need(b) ? 0 : 1)));
function pick(mode, arg){
  if (mode === "boss") return BOSS;
  if (mode === "health") return window.HEALTH_CHECK.map(id => BY_ID[id]).filter(Boolean);
  if (mode === "quick") { // 還沒攻克的觀念優先，每個觀念最多 1 題
    const seen = new Set(), out = [];
    for (const q of unmasteredFirst(rangeQs())) { if (!seen.has(q.tag)) { seen.add(q.tag); out.push(q); } if (out.length === 8) break; }
    return out;
  }
  if (mode === "weak") { const t = new Set(todo()); return unmasteredFirst(BANK.filter(q => t.has(q.tag))).slice(0, 8); }
  if (mode === "cat") return unmasteredFirst(rangeQs().filter(q => q.cat === arg)).slice(0, arg === "拉分題" ? 6 : 8);
  if (mode === "catch") return shuffle(CATCH).sort((a, b) => ((P.x || {})[a.id] ? 1 : 0) - ((P.x || {})[b.id] ? 1 : 0)).slice(0, 5);   // 沒做過的優先
  if (mode === "hard") return shuffle(rangeQs().filter(q => q.level === "難")).slice(0, 6);
  if (mode === "unit") return unmasteredFirst(rangeQs().filter(q => q.unit === arg)).slice(0, 8);
  if (mode === "supp") return shuffle(BANK.filter(q => q.supp));
  return [];
}

/* ---------- 數字填充：可輸入負號、分數、根號，依數值判斷對錯 ---------- */
function parseNum(s){
  const m = String(s).match(/^(-)?(\d+(?:\.\d+)?)?(?:√(\d+(?:\.\d+)?))?(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m || (!m[2] && !m[3]) || (m[4] !== undefined && +m[4] === 0)) return null;
  return (m[1] ? -1 : 1) * (m[2] ? +m[2] : 1) * (m[3] ? Math.sqrt(+m[3]) : 1) / (m[4] ? +m[4] : 1);
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
function isSimplest(s){   // 分數要約分、根號裡不能有平方因數、分母不能是 1
  const m = String(s).match(/^(-)?(\d+(?:\.\d+)?)?(?:√(\d+(?:\.\d+)?))?(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m) return false;
  const [, , a, r, d] = m;
  if (a && /^0\d/.test(a)) return false;
  if (r !== undefined) { const n = +r; if (!Number.isInteger(n) || n < 2) return false; for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) return false; if (a === "1") return false; }
  if (d !== undefined) {
    if (+d === 1 || /\./.test(d) || /\./.test(a || "")) return false;
    if (gcd(a ? +a : 1, +d) > 1) return false;
    if (r === undefined && a && +a % +d === 0) return false;
  }
  return true;
}
/* 顯示：根號加上橫線，負號用長一點的 − */
function fmtNum(s){
  return String(s).replace(/^-/, "−").replace(/√([\d.]+)/, '<span class="rt">√<span>$1</span></span>');
}

/* ---------- 畫面狀態 ---------- */
let S = {screen: "welcome", loading: !!auth, err: "", mode: null, arg: null, list: [], i: 0, sel: [], typed: "", done: false, why: null, log: [], newly: [], sheet: null};
const app = document.getElementById("app");
const scroller = document.getElementById("scroller") || document.scrollingElement;
/* 作答中的這一回也存起來：不小心重新整理或切換 App，回來可以接著做 */
const SKEY = (IS_TEST ? "exam-review-test" : "exam-review") + "-session";
/* 選擇題每回合打亂選項順序（題庫裡正解多在 A，避免學生猜位置） */
function withPerm(q, perm){
  if (!perm || (q.type !== "mc" && q.type !== "multi")) return q;
  return {...q, perm, opts: perm.map(i => q.opts[i]), ans: q.ans.map(a => perm.indexOf(a))};
}
function shuffledQ(q){
  if (q.type !== "mc" && q.type !== "multi") return q;
  const perm = q.opts.map((_, i) => i);
  for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  return withPerm(q, perm);
}
function persistSession(){
  try {
    if (S.screen === "exam" && S.ex) localStorage.setItem(SKEY, JSON.stringify({t: Date.now(), mode: "exam", ex: {...S.ex, ans: S.ex.ans.map((a, k) => k === S.i ? {sel: S.sel, typed: S.typed} : a)}, ids: S.list.map(q => q.id), perms: S.list.map(q => q.perm || null), i: S.i}));
    else if (S.screen === "quiz") localStorage.setItem(SKEY, JSON.stringify({t: Date.now(), mode: S.mode, arg: S.arg, ids: S.list.map(q => q.id), perms: S.list.map(q => q.perm || null), i: S.i, sel: S.sel, typed: S.typed, done: S.done, why: S.why, log: S.log, newly: S.newly}));
    else localStorage.removeItem(SKEY);
  } catch (_) {}
}
function restoreSession(){
  try {
    const v = JSON.parse(localStorage.getItem(SKEY));
    if (!v || Date.now() - v.t > 3 * 3600e3) return;
    const list = v.ids.map((id, k) => BY_ID[id] && withPerm(BY_ID[id], v.perms && v.perms[k])).filter(Boolean);
    if (!list.length || list.length !== v.ids.length) return;
    if (v.mode === "exam" && v.ex) {   // 限時挑戰：時間照算，回來時如果已經超時就直接交卷
      const a = v.ex.ans[v.i] || {sel: [], typed: ""};
      Object.assign(S, {screen: "exam", mode: "exam", ex: v.ex, list, i: v.i, sel: a.sel, typed: a.typed, done: false});
      setTimeout(tickExam, 0);
      return;
    }
    Object.assign(S, {screen: "quiz", mode: v.mode, arg: v.arg || null, list, i: v.i, sel: v.sel, typed: v.typed, done: v.done, why: v.why, log: v.log, newly: v.newly});
  } catch (_) {}
}
const set = p => { Object.assign(S, p); render(); persistSession(); if (p.screen && p.screen !== "quiz" && p.screen !== "exam") pushCloud(); };
const badge = () => IS_TEST ? `<span class="proto test">試用站　這裡的改動不會影響學生</span>` : "";
const tagLabel = t => `${t}　${CONCEPTS[t] || ""}`;

function startSession(mode, arg){
  if (!ME) { set({screen: "welcome"}); return; }   // 只開放登入使用
  if (mode === "boss" && readiness("1") < BOSS_UNLOCK) { toast(`準備度達到 ${BOSS_UNLOCK}% 才能挑戰魔王關`); return; }
  const list = pick(mode, arg).map(shuffledQ);
  if (!list.length) { toast(mode === "weak" ? "目前沒有待攻克的觀念，先去快刷吧" : "這裡還沒有題目"); return; }
  scroller.scrollTo(0, 0);
  set({screen: "quiz", mode, arg: arg || null, list, i: 0, sel: [], typed: "", done: false, why: null, log: [], newly: [], sheet: null});
}
function isRight(q){
  if (q.kind === "catch") return S.sel[0] === q.bad;
  if (q.type === "num") { const a = parseNum(S.typed), b = parseNum(q.ans); return a !== null && b !== null && Math.abs(a - b) < 1e-9; }
  return [...S.sel].sort().join() === [...q.ans].sort().join();
}

/* ---------- 歡迎頁 ---------- */
function vWelcome(){
  return `${badge()}
  <div class="hero">
    <img src="${ICON}" alt="">
    <span class="eyebrow">高一數學・段考複習　單元 01–07</span>
    <h1>段考前，<br>把會的<span class="hl">拿穩</span>、不會的補起來</h1>
    <p class="muted">用學校 Google 帳號登入就能開始。進度存在雲端，換手機也不會不見。</p>
  </div>
  <div class="facts">
    <div class="fact"><b>${BANK.length}</b><span>道試題</span></div>
    <div class="fact"><b>${UNITS.length}</b><span>個單元</span></div>
    <div class="fact"><b>${CORE.length + CORE2.length}</b><span>個觀念</span></div>
  </div>
  ${S.err ? `<p class="note" role="alert">${S.err}</p>` : ""}
  <div class="grow"></div>
  <div class="stack">
    ${STANDALONE && !IN_APP ? `<div class="card" style="gap:8px"><b>從主畫面圖示開啟可能無法登入</b>
      <p class="small muted" style="margin:0">如果按了登入沒有反應或出現錯誤，請複製網址，改用 Safari 或 Chrome 開啟登入。</p>
      <button class="btn ghost" data-a="copylink">複製網址</button></div>` : ""}
    ${IN_APP ? `<div class="card" style="gap:8px"><b>請改用 Safari 或 Chrome 開啟</b>
      <p class="small muted" style="margin:0">你現在是在 LINE、IG 等 App 裡面開啟網頁，Google 不允許在這裡登入。請點右上角「⋯」選「用瀏覽器開啟」，或複製網址貼到 Safari／Chrome。</p></div>
      <button class="btn" data-a="copylink">複製網址</button>` : `<button class="gbtn" data-a="login">${gIcon()}使用學校 Google 帳號登入</button>`}
    ${IS_TEST ? `<button class="btn ghost" data-a="guest">免登入試用</button>
    <p class="small muted" style="text-align:center;margin:0">免登入試用的進度只存在這台裝置，不會上傳。</p>` : ""}
    <p class="small muted" style="text-align:center;margin:0">本系統只開放任教班級的同學使用<br>若有興趣請洽詢汪陽老師，<a class="mail" href="mailto:0346@sssh.tp.edu.tw">0346@sssh.tp.edu.tw</a></p>
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
function answerBody(q, right){
  let body = "";
  if (q.type === "tf") body = `<div class="tfrow">${q.opts.map((t, k) => optHTML(q, k, t)).join("")}</div>`;
  else if (q.type === "num") {
    const cls = S.done ? (right ? " right" : " wrong") : "";
    const KEYS = [["1"],["2"],["3"],["⌫","刪除"],["4"],["5"],["6"],["√","根號"],["7"],["8"],["9"],["/","分數線"],["−","正負號"],["0"],["."],["C","全部清除"]];
    body = `<div class="numbox${cls}"><span class="num">${fmtNum(S.typed)}${S.done ? "" : '<span class="caret"></span>'}</span><span class="unit">${q.unitWord || ""}</span></div>
    ${S.done
      ? (right ? (isSimplest(S.typed) ? "" : `<p class="note">答對了！不過還沒化到最簡，最簡形式是 <b class="num">${fmtNum(q.ans)}</b>，段考要寫最簡喔。</p>`)
               : `<p class="small muted">正確答案：<b class="num">${fmtNum(q.ans)}</b> ${q.unitWord || ""}</p>`)
      : `<div class="keys k4">${KEYS.map(([x, l]) => `<button data-a="key" data-k="${x}" aria-label="${l || x}" class="${/[0-9.]/.test(x) ? "" : "fn"}">${x}</button>`).join("")}</div>
         <p class="small muted" style="margin:-4px 0 0">分數用 <b>/</b>，例如 −3/2、3√2/2；要寫成最簡形式。</p>`}`;
  }
  else body = `<div class="opts ${q.type === "multi" ? "multi" : ""}">${q.opts.map((t, k) => optHTML(q, k, t)).join("")}</div>`;

  return body;
}
function vQuiz(){
  const q = S.list[S.i], right = S.done && isRight(q), n = S.list.length;
  if (q.kind === "catch") return vCatch(q, right, n);
  const body = answerBody(q, right);

  const answered = q.type === "num" ? S.typed.length > 0 : S.sel.length > 0;
  let fb = "";
  if (S.done) {
    const peers = typeof q.stuck === "number" ? `<div class="peers"><span class="dots"><i></i><i></i><i></i></span>全班有 <b class="num">${q.stuck}%</b> 的人也在這題卡過</div>` : `<p class="small">卡住很正常，弄懂它就是一個新攻克的觀念。</p>`;
    const why = right ? "" : `<div class="why"><span class="small">你覺得錯在哪？</span>
      ${[...q.reasons, "我不知道錯在哪"].map((r, k) => { let c = k === 3 ? "idk" : ""; if (S.why !== null) { if (k === q.key) c += " key"; else if (k === S.why) c += " pick"; } return `<button class="${c}" data-a="why" data-k="${k}" ${S.why !== null ? "disabled" : ""}>${r}</button>`; }).join("")}</div>`;
    const showExp = right || S.why !== null;
    const card = window.CARDS && CARDS[q.tag];
    const whyMsg = (right || S.why === null) ? "" : S.why === 3
      ? `<p class="small">沒關係，先想想這題最常卡在：「${q.reasons[q.key]}」。</p>${card ? `<div class="cardx"><b>觀念小卡｜${CONCEPTS[q.tag]}</b><p>${card.pt}</p><p class="cex"><b>例</b>${card.ex}</p></div>` : ""}`
      : `<p class="small">${S.why === q.key ? "對，關鍵就在這裡。" : "最常見的卡點其實是：「" + q.reasons[q.key] + "」。"}</p>`;
    const c = cs(q.tag);
    const okMsg = q.boss ? "你擊敗了這一題魔王！" : S.newly.includes(q.tag) ? `攻克了「${CONCEPTS[q.tag]}」！` : c.m ? "這個觀念已經攻克，保持住！"
      : rangeOf(q.tag) === "2" ? (okCount(q.tag) >= needCount(q.tag) ? `這個觀念已答對 ${okCount(q.tag)} / ${(TAG_QS[q.tag] || []).length} 題，可以去挑戰限時檢測了！` : `這個觀念已答對 ${okCount(q.tag)} / ${(TAG_QS[q.tag] || []).length} 題，答對 ${needCount(q.tag)} 題後建議去挑戰限時檢測。`)
      : "答對一次，這個觀念再答對一次就攻克。";
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
  <div class="stack" style="gap:8px"><div style="display:flex;gap:6px;flex-wrap:wrap">${q.boss ? '<span class="chip bosschip">魔王關</span>' : `${q.cat ? `<span class="chip cat c${CATS.indexOf(q.cat)}">${q.cat}</span>` : ""}<span class="chip">單元${q.unit}</span><span class="chip">${tagLabel(q.tag)}</span>`}${q.supp ? '<span class="chip supp">補充</span>' : ""}${q.type === "multi" && !/多選/.test(q.stem) ? '<span class="chip supp">多選</span>' : ""}</div>
  <div class="stem">${q.stem}</div>${q.fig && window.figSVG ? figSVG(q.fig) : ""}</div>
  ${body}
  ${fb}
  <div class="grow"></div>
  <div class="dock">${S.done
    ? `<button class="btn" data-a="next" ${canNext ? "" : "disabled"}>${S.i === n - 1 ? "看結果" : "下一題"}</button>`
    : `<button class="btn" data-a="submit" ${answered ? "" : "disabled"}>送出</button>`}</div>`;
}

/* ---------- 練習檢查錯誤（抓錯題） ---------- */
const mx = s => ("\\(" + s + "\\)").replace(/\\text\{([^}]*)\}/g, "\\)$1\\(").replace(/\\\(\s*\\\)/g, "");   // 中文移到數學式外面
function vCatch(q, right, n){
  const lineCls = k => { let c = "ln"; if (S.done) { if (k === q.bad) c += " bad"; else if (S.sel.includes(k)) c += " wrong"; } else if (S.sel.includes(k)) c += " sel"; return c; };
  const lines = q.lines.map((l, k) => `<button class="${lineCls(k)}" data-a="pick" data-k="${k}" ${S.done ? "disabled" : ""}><span class="no num">${k + 1}</span><span class="lt">${mx(l)}</span></button>`).join("");
  const okAll = `<button class="${lineCls(-1)}${S.done && q.bad === -1 ? " bad good" : ""} allok" data-a="pick" data-k="-1" ${S.done ? "disabled" : ""}><span class="no">✓</span><span class="lt">全部都算對了</span></button>`;
  let fb = "";
  if (S.done) {
    const where = q.bad === -1 ? `<p>這份計算<b>全部正確</b>，沒有錯。</p>`
      : `<p>錯在第 <b class="num">${q.bad + 1}</b> 行<span class="chip" style="margin-left:6px">${XTYPE[q.type] || ""}</span></p>
         <div>${q.why}</div>
         <div class="exp"><b>改正</b><div class="fixl">${mx(q.fix)}</div></div>`;
    fb = `<div class="fb ${right ? "ok" : "no"}"><h2>${right ? (q.bad === -1 ? "答對了，真的沒錯" : "抓到了！") : "差一點"}</h2>
      ${where}
      <div class="exp"><b>正確答案</b><div>${mx(q.ans)}</div></div></div>`;
  }
  return `
  <div class="top"><button aria-label="離開" data-a="home" style="font-size:22px;line-height:1">×</button>
    <div class="bar"><i style="width:${(S.i + (S.done ? 1 : 0)) / n * 100}%"></i></div>
    <span class="num small muted">${S.i + 1}/${n}</span></div>
  <div class="stack" style="gap:8px"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip cat cx">檢查錯誤</span><span class="chip">${tagLabel(q.tag)}</span></div>
    <div class="stem">${q.q}</div>
    <p class="small muted">下面是一位同學的計算。從哪一行開始算錯？點那一行；如果都對，選「全部都算對了」。</p></div>
  <div class="lines">${lines}${okAll}</div>
  ${fb}
  <div class="grow"></div>
  <div class="dock">${S.done
    ? `<button class="btn" data-a="next">${S.i === n - 1 ? "看結果" : "下一題"}</button>`
    : `<button class="btn" data-a="submit" ${S.sel.length ? "" : "disabled"}>送出</button>`}</div>`;
}

/* ---------- 限時挑戰（觀念完成度檢測） ----------
   每個觀念一回：最多 10 題，每題 1.5 分鐘（10 題 15 分鐘），錯題不超過 20% 就通過＝攻克這個觀念。
   作答中不顯示對錯、可以跳題回頭改，按「交卷」或時間到才批改。 */
const examPlan = tag => { const n = Math.min(10, (TAG_QS[tag] || []).length); return {n, sec: n * 90, wrong: Math.floor(n * 0.2)}; };
const minTxt = s => { const m = s / 60; return Number.isInteger(m) ? `${m} 分鐘` : `${Math.floor(m)} 分半`; };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;
let examTimer = null;
function examLeft(){ return S.ex ? Math.ceil(S.ex.sec - (Date.now() - S.ex.t0) / 1000) : 0; }
function tickExam(){
  clearInterval(examTimer); examTimer = null;
  if (S.screen !== "exam" || !S.ex) return;
  examTimer = setInterval(() => {
    if (S.screen !== "exam" || !S.ex) { clearInterval(examTimer); examTimer = null; return; }
    const left = examLeft(), el = document.getElementById("clock");
    if (el) { el.textContent = mmss(left); el.classList.toggle("low", left <= 60); }
    if (left <= 0 && ME && !S.loading) { clearInterval(examTimer); examTimer = null; toast("時間到，自動交卷"); finishExam(); }
  }, 500);
}
function startExam(tag){
  if (!ME) { set({screen: "welcome"}); return; }
  const plan = examPlan(tag);
  const list = shuffle(BANK.filter(q => q.tag === tag && !q.supp)).slice(0, plan.n).map(shuffledQ);
  if (!list.length) { toast("這個觀念還沒有題目"); return; }
  scroller.scrollTo(0, 0);
  S.ex = {tag, sec: plan.sec, allow: plan.wrong, t0: Date.now(), ans: list.map(() => ({sel: [], typed: ""}))};
  set({screen: "exam", mode: "exam", list, i: 0, sel: [], typed: "", done: false, sheet: null});
  tickExam();
}
function examGo(i){
  S.ex.ans[S.i] = {sel: [...S.sel], typed: S.typed};
  const a = S.ex.ans[i] || {sel: [], typed: ""};
  scroller.scrollTo(0, 0);
  set({i, sel: [...a.sel], typed: a.typed, sheet: null});
}
function finishExam(){
  if (!S.ex) return;
  S.ex.ans[S.i] = {sel: [...S.sel], typed: S.typed};
  const used = Math.min(S.ex.sec, Math.round((Date.now() - S.ex.t0) / 1000));
  const res = S.list.map((q, k) => {
    const a = S.ex.ans[k]; const blank = q.type === "num" ? !a.typed : !a.sel.length;
    S.sel = a.sel; S.typed = a.typed;
    const right = !blank && isRight(q);
    record(q, right);
    return {right, blank, sel: a.sel, typed: a.typed};
  });
  const ok = res.filter(r => r.right).length, n = S.list.length, pass = n - ok <= S.ex.allow;
  const tag = S.ex.tag, prev = (P.ch || {})[tag] || {};
  const better = !prev.best || ok > prev.best.ok || (ok === prev.best.ok && used < prev.best.sec);
  P.ch = {...(P.ch || {}), [tag]: {tries: (prev.tries || 0) + 1, pass: !!prev.pass || pass, best: better ? {ok, n, sec: used} : prev.best, last: Date.now()}};
  const c = {...cs(tag)}, newly = pass && !c.m;
  if (pass) { c.m = true; c.w = false; } else c.w = true;
  P.c[tag] = c; save();
  S.exres = {tag, res, ok, n, used, pass, newly, allow: S.ex.allow, sec: S.ex.sec, ids: S.list.map(q => q.id), perms: S.list.map(q => q.perm || null)};
  S.ex = null; clearInterval(examTimer); examTimer = null;
  scroller.scrollTo(0, 0);
  set({screen: "examres", sheet: null, sel: [], typed: ""});
}
function vExam(){
  const q = S.list[S.i], n = S.list.length, left = examLeft();
  const done = k => { const a = k === S.i ? {sel: S.sel, typed: S.typed} : S.ex.ans[k]; return S.list[k].type === "num" ? !!a.typed : a.sel.length > 0; };
  const dots = S.list.map((_, k) => `<button class="qdot${k === S.i ? " cur" : ""}${done(k) ? " ans" : ""}" data-a="exgo" data-k="${k}" aria-label="第 ${k + 1} 題">${k + 1}</button>`).join("");
  return `
  <div class="top"><span class="chip cat c1">限時挑戰</span><span class="grow small muted" style="min-width:0">${tagLabel(S.ex.tag)}</span>
    <span class="clock num${left <= 60 ? " low" : ""}" id="clock">${mmss(left)}</span></div>
  <div class="qdots">${dots}</div>
  <div class="stack" style="gap:8px"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip num">第 ${S.i + 1} / ${n} 題</span>${q.type === "multi" && !/多選/.test(q.stem) ? '<span class="chip supp">多選</span>' : ""}</div>
    <div class="stem">${q.stem}</div>${q.fig && window.figSVG ? figSVG(q.fig) : ""}</div>
  ${answerBody(q, false)}
  <div class="grow"></div>
  <div class="dock exdock">
    <button class="btn ghost" data-a="exgo" data-k="${S.i - 1}" ${S.i === 0 ? "disabled" : ""}>上一題</button>
    ${S.i < n - 1 ? `<button class="btn ghost" data-a="exgo" data-k="${S.i + 1}">下一題</button>` : ""}
    <button class="btn" data-a="exsubmit">交卷</button></div>`;
}
function ansText(q, r){
  if (q.type === "num") return r.typed ? fmtNum(r.typed) : "（沒作答）";
  if (!r.sel.length) return "（沒作答）";
  return r.sel.map(k => q.type === "tf" ? q.opts[k] : "ABCDE"[k]).join("、");
}
function vExamRes(){
  const R = S.exres, list = R.ids.map((id, k) => withPerm(BY_ID[id], R.perms[k]));
  const rows = list.map((q, k) => { const r = R.res[k];
    const right = q.type === "num" ? fmtNum(q.ans) : q.ans.map(a => q.type === "tf" ? q.opts[a] : "ABCDE"[a]).join("、");
    return `<details class="rv ${r.right ? "ok" : "no"}"><summary><span class="mk">${r.right ? "✓" : "✕"}</span><span class="grow">第 ${k + 1} 題${r.blank ? "（沒作答）" : ""}</span><span class="small muted">看解析</span></summary>
      <div class="stem small-stem">${q.stem}</div>${q.fig && window.figSVG ? figSVG(q.fig) : ""}
      ${q.opts && q.type !== "tf" ? `<ol class="ropts">${q.opts.map((o, i) => `<li class="${q.ans.includes(i) ? "ok" : r.sel.includes(i) ? "no" : ""}"><b>${"ABCDE"[i]}</b><span>${o}</span></li>`).join("")}</ol>` : ""}
      <p class="small">你的答案：<b>${ansText(q, r)}</b>　正確答案：<b class="num">${right}</b></p>
      <div class="exp"><b>解析</b><div>${q.exp}</div></div></details>`; }).join("");
  return `${badge()}
  <div class="card ${R.pass ? "win" : ""}" style="align-items:flex-start">
    <span class="chip cat c1">限時挑戰｜${tagLabel(R.tag)}</span>
    <h1>${R.pass ? (R.newly ? "通過！攻克這個觀念" : "通過！") : "這次沒通過"}</h1>
    <p>答對 <b class="num">${R.ok} / ${R.n}</b>　用時 <b class="num">${mmss(R.used)}</b>（限時 ${mmss(R.sec)}）</p>
    <p class="small muted">${R.pass ? "在時間內錯 " + R.allow + " 題以內，代表這個觀念你真的會了。" : `通過條件：${mmss(R.sec)} 內最多錯 ${R.allow} 題。看完下面的解析再挑戰一次。`}</p>
  </div>
  <div class="stack" style="gap:8px">${rows}</div>
  <div class="grow"></div>
  <div class="stack">
    <button class="btn" data-a="exstart" data-k="${R.tag}">${R.pass ? "再挑戰一次（刷新最佳紀錄）" : "再挑戰一次"}</button>
    <button class="btn ghost" data-a="chal">回到挑戰列表</button>
  </div>`;
}
/* 挑戰列表：依單元列出每個觀念的練習進度與挑戰紀錄 */
function vChal(){
  const units = RANGES["2"].units.map(u => {
    const rows = CORE2.filter(t => unitOf(t) === u.code).map(t => {
      const ch = (P.ch || {})[t], plan = examPlan(t), pr = Math.round(practiceRatio(t) * 100), m = cs(t).m;
      const stat = m ? `<span class="pass">✓ 已攻克</span>${ch && ch.best ? `<span class="small muted num">最佳 ${ch.best.ok}/${ch.best.n}・${mmss(ch.best.sec)}</span>` : ""}`
        : ch && ch.best ? `<span class="small muted num">最佳 ${ch.best.ok}/${ch.best.n}・挑戰 ${ch.tries} 次</span>` : `<span class="small muted">練習進度 ${pr}%${pr >= 100 ? "，可以挑戰了" : ""}</span>`;
      return `<button class="chrow${m ? " done" : ""}" data-a="exask" data-k="${t}"><span class="grow" style="min-width:0"><b>${tagLabel(t)}</b>${stat}<span class="bar"><i style="width:${m ? 100 : pr * 0.8}%"></i></span></span><span class="go num">${plan.n} 題<br>${minTxt(plan.sec)}</span></button>`;
    }).join("");
    return `<div class="card"><h2>${u.code} ${u.name}</h2><div class="stack" style="gap:8px">${rows}</div></div>`;
  }).join("");
  const n = CORE2.filter(t => cs(t).m).length;
  return `${badge()}
  <div class="top"><button aria-label="返回" data-a="home" style="font-size:22px;line-height:1">×</button><b class="grow">限時挑戰</b><span class="num small muted">已攻克 ${n} / ${CORE2.length}</span></div>
  <div class="card"><p class="small" style="margin:0">每個觀念一回，最多 10 題、每題 1.5 分鐘（10 題共 15 分鐘），<b>錯題不超過 2 成</b>就通過，這個觀念才算攻克。作答中不會顯示對錯，可以跳題回頭改，時間到會自動交卷。</p>
    <p class="small muted" style="margin:0">建議先把觀念練到「練習進度 100%」（答對 8 成題目）再來挑戰。</p></div>
  ${units}`;
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
      <button class="gbtn" data-a="loginsheet">${gIcon()}使用學校 Google 帳號登入</button>
      <button class="btn ghost" data-a="home">先不登入，繼續練習</button>`}
    </div>`;
  }
  if (S.mode === "catch") {
    const missed = S.log.filter(l => !l.right).map(l => S.list[l.i]);
    const types = {}; missed.forEach(x => { if (x.type >= 0) types[x.type] = (types[x.type] || 0) + 1; });
    const top = Object.entries(types).sort((x, y) => y[1] - x[1])[0];
    const done = CATCH.filter(x => (P.x || {})[x.id]).length;
    return `${badge()}
    <h1>這回抓對 <span class="num">${right}</span> / <span class="num">${n}</span></h1>
    <div class="card"><h2>${missed.length ? "下次計算時特別留意" : "全部抓到了"}</h2>
      <p class="small" style="margin:0">${missed.length ? (top ? `這回漏掉最多的是「<b>${XTYPE[top[0]]}</b>」類的錯誤。自己算完也用同樣的眼光檢查一次。` : "有幾題其實全部都對，別太快下結論，每一行都要驗算。") : "檢查得很仔細！段考算完也這樣逐行檢查。"}</p>
      <p class="small muted" style="margin:0">已練過 <span class="num">${done} / ${CATCH.length}</span> 題。這個練習不計入準備度。</p></div>
    <div class="grow"></div>
    <div class="stack"><button class="btn" data-a="again">再來一回</button><button class="btn ghost" data-a="home">回到首頁</button></div>`;
  }
  return `${badge()}
  <h1>這回答對 <span class="num">${right}</span> / <span class="num">${n}</span></h1>
  ${S.mode === "boss" ? `<div class="card"><h2>魔王關</h2><p class="small" style="margin:0">累計擊敗 <b class="num">${BOSS.filter(q => P.boss && P.boss[q.id]).length} / ${BOSS.length}</b> 題。答錯的題目可以再來一回，直到全部擊敗。</p></div>` : ""}
  ${S.newly.length ? `<div class="card win"><h2>這回攻克了</h2><ul class="todo done">${S.newly.map(t => `<li>${tagLabel(t)}</li>`).join("")}</ul></div>` : ""}
  ${wrongTags.length ? `<div class="card"><h2>加入待攻克</h2><ul class="todo">${wrongTags.map(t => `<li>${tagLabel(t)}</li>`).join("")}</ul></div>` : ""}
  <div class="score">${ring(readiness())}<div class="grow stack" style="gap:6px;min-width:0"><b>已攻克 <span class="num">${mastered().length}</span> / <span class="num">${RANGES[RG()].core.length}</span> 個觀念</b><span class="small muted">${ruleText()}</span></div></div>
  <div class="grow"></div>
  <div class="stack">
    <button class="btn" data-a="again">再來一回</button>
    <button class="btn ghost" data-a="home">回到首頁</button>
  </div>`;
}
function gIcon(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8C3.9 20.5 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.1 4.9l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.5 2.1 7.1l3.6 2.8c.9-2.6 3.4-4.5 6.3-4.5z"/></svg>`}

/* ---------- 魔王關入口 ---------- */
function bossCard(){
  const rd = readiness("1"), beat = BOSS.filter(q => P.boss && P.boss[q.id]).length;
  if (!BOSS.length) return "";
  if (rd < BOSS_UNLOCK) return `<div class="boss locked"><span class="bic"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg></span><div class="grow" style="min-width:0"><b>魔王關</b>
    <span class="small">準備度達到 <b class="num">${BOSS_UNLOCK}%</b> 解鎖，目前 <span class="num">${rd}%</span></span>
    <span class="bar"><i style="width:${Math.min(100, rd / BOSS_UNLOCK * 100)}%"></i></span></div></div>`;
  return `<button class="boss" data-a="start" data-k="boss"><span class="bic">♛</span><div class="grow" style="min-width:0"><b>魔王關</b>
    <span class="small">${BOSS.length} 題段考範圍的綜合難題，已擊敗 <span class="num">${beat} / ${BOSS.length}</span></span></div><span class="go">挑戰</span></button>`;
}

/* ---------- 首頁 ---------- */
const rangeSwitch = () => `<div class="seg rng" role="tablist" aria-label="段考範圍">${["2", "1"].map(r => `<button role="tab" class="${RG() === r ? "on" : ""}" data-a="range" data-k="${r}" aria-selected="${RG() === r}">${RANGES[r].name}<small class="num">單元 ${RANGES[r].span}</small></button>`).join("")}</div>`;
const hello = () => ME ? `<div class="hello"><div class="av">${(ME.name || "我").slice(0, 1)}</div><div class="grow"><p>${ME.guest ? "免登入試用（進度只存在這台裝置）" : (ME.cls ? `${ME.cls} 班 ${ME.seat} 號　` : "") + ME.name}</p><p style="font-weight:700">今天想怎麼複習？</p></div></div>` : "";
const unitRows = r => RANGES[r].units.map(u => { const tags = RANGES[r].core.filter(x => unitOf(x) === u.code), done = tags.filter(x => cs(x).m).length;
  return `<button class="unitrow" data-a="start" data-k="unit" data-u="${u.code}"><span class="un">${u.code}</span><span class="grow" style="min-width:0"><b>${u.name}</b><span class="bar"><i style="width:${tags.length ? done / tags.length * 100 : 0}%"></i></span></span><span class="num small muted">${done}/${tags.length}</span></button>`; }).join("");
const scoreCard = () => { const t = todo(); return `<div class="score">${ring(readiness())}<div class="grow stack" style="gap:6px;min-width:0"><b>已攻克 <span class="num">${mastered().length}</span> / <span class="num">${RANGES[RG()].core.length}</span> 個觀念</b><span class="small muted">${t.length ? `還有 <span class="num">${t.length}</span> 個待攻克。` : "還沒有待攻克的觀念。"}${ruleText()}</span></div></div>`; };
const todoCard = () => { const t = todo(); return t.length ? `<div class="card"><h2>待攻克</h2><ul class="todo">${t.map(x => `<li>${tagLabel(x)}</li>`).join("")}</ul></div>` : ""; };
function vHome(){ return RG() === "1" ? vHome1() : vHome2(); }
/* 第二次段考：依題型練習＋練習檢查錯誤 */
function vHome2(){
  const qs = rangeQs(), xdone = CATCH.filter(x => (P.x || {})[x.id]).length;
  const cats = CATS.map((c, i) => `<button class="catbtn c${i}" data-a="start" data-k="cat" data-u="${c}"><b>${c}</b><span>${CAT_INFO[c]}</span><span class="num cnt">已答對 ${qs.filter(q => q.cat === c && !need(q)).length} / ${qs.filter(q => q.cat === c).length} 題</span></button>`).join("");
  return `${badge()}
  ${hello()}
  ${rangeSwitch()}
  ${scoreCard()}
  <div class="modes two">
    <button class="mode main" data-a="start" data-k="quick"><span class="ic">5</span><b>5 分鐘快刷</b><span>8 題，混合各單元</span></button>
    <button class="mode" data-a="start" data-k="weak"><span class="ic">!</span><b>攻弱點</b><span>只練待攻克</span></button>
  </div>
  <div class="card"><h2>依題型練習</h2><div class="cats">${cats}</div></div>
  <button class="xbtn chalbtn" data-a="chal"><span class="bic">⏱</span><div class="grow" style="min-width:0"><b>限時挑戰</b>
    <span class="small">每個觀念 10 題 15 分鐘，錯 2 題以內才算攻克。已攻克 <span class="num">${mastered().length} / ${CORE2.length}</span></span></div><span class="go">挑戰</span></button>
  <button class="xbtn" data-a="start" data-k="catch"><span class="bic">✓?</span><div class="grow" style="min-width:0"><b>練習檢查錯誤</b>
    <span class="small">找出同學的計算從哪一行開始錯，練習自己檢查。已練 <span class="num">${xdone} / ${CATCH.length}</span></span></div><span class="go">開始</span></button>
  <div class="card"><h2>依單元練習</h2><div class="stack" style="gap:8px">${unitRows("2")}</div></div>
  ${todoCard()}
  ${ME ? `<button class="link" data-a="logout">${ME.guest ? "結束試用" : "登出"}</button>` : ""}`;
}
/* 第一次段考：維持原本的配置 */
function vHome1(){
  return `${badge()}
  ${hello()}
  ${rangeSwitch()}
  ${!P.answered ? `<div class="card"><h2>先花 60 秒做個健檢</h2>
    <p class="small muted" style="margin:0">6 題快速檢查，做完馬上知道最該補哪些觀念。</p>
    <button class="btn" data-a="start" data-k="health">開始健檢</button></div>` : ""}
  ${scoreCard()}
  <div class="modes">
    <button class="mode main" data-a="start" data-k="quick"><span class="ic">5</span><b>5 分鐘快刷</b><span>8 題，混合各單元</span></button>
    <button class="mode" data-a="start" data-k="weak"><span class="ic">!</span><b>攻弱點</b><span>只練待攻克</span></button>
    <button class="mode" data-a="start" data-k="hard"><span class="ic">↑</span><b>挑戰難題</b><span>段考壓軸等級</span></button>
  </div>
  ${bossCard()}
  <div class="card"><h2>依單元練習</h2><div class="stack" style="gap:8px">${unitRows("1")}</div>
    <button class="unitrow supp" data-a="start" data-k="supp"><span class="un">+</span><span class="grow" style="min-width:0"><b>補充：對數律</b><span class="small muted">課綱外，不計入準備度</span></span></button></div>
  ${todoCard()}
  ${ME ? `<button class="link" data-a="logout">${ME.guest ? "結束試用" : "登出"}</button>` : ""}`;
}

/* ---------- 底部面板 ---------- */
function vSheet(){
  if (S.sheet === "login") return `<div class="scrim" data-a="close"><div class="sheet" role="dialog" aria-label="登入">
    <span class="grab"></span>
    <b>用學校 Google 帳號登入</b>
    <p class="small muted">請選 <b>學號@${DOMAIN}</b> 的帳號。登入後進度會存到雲端，換手機也不會不見。</p>
    ${IN_APP ? `<div class="card" style="gap:8px"><b>請改用 Safari 或 Chrome 開啟</b>
      <p class="small muted" style="margin:0">你現在是在 LINE、IG 等 App 裡面開啟網頁，Google 不允許在這裡登入。請點右上角「⋯」或分享按鈕，選「用瀏覽器開啟」；或複製網址貼到 Safari / Chrome。</p></div>
    <button class="btn" data-a="copylink">複製網址</button>` : `<button class="gbtn" data-a="login">${gIcon()}使用 Google 帳號登入</button>`}
  </div></div>`;
  if (S.sheet && S.sheet.startsWith("exask:")) { const tg = S.sheet.slice(6), pl = examPlan(tg), ch = (P.ch || {})[tg];
    return `<div class="scrim" data-a="close"><div class="sheet" role="dialog" aria-label="開始限時挑戰">
    <span class="grab"></span>
    <b>限時挑戰｜${tagLabel(tg)}</b>
    <div class="facts"><div class="fact"><b>${pl.n}</b><span>題</span></div><div class="fact"><b>${mmss(pl.sec)}</b><span>限時</span></div><div class="fact"><b>${pl.wrong}</b><span>最多可錯</span></div></div>
    <p class="small muted">開始後計時不會暫停；作答中不顯示對錯，可以跳題回頭改。按「交卷」或時間到就批改。${ch && ch.best ? `<br>你的最佳紀錄：${ch.best.ok}/${ch.best.n}，${mmss(ch.best.sec)}` : ""}</p>
    ${practiceRatio(tg) < 1 && !cs(tg).m ? `<p class="note">這個觀念的練習進度還沒到 100%，建議先多練幾題再挑戰。</p>` : ""}
    <button class="btn" data-a="exstart" data-k="${tg}">開始計時</button>
    <button class="btn ghost" data-a="close">先不要</button>
  </div></div>`; }
  if (S.sheet === "exsubmit") { const left = S.list.filter((q, k) => { const a = k === S.i ? {sel: S.sel, typed: S.typed} : S.ex.ans[k]; return q.type === "num" ? !a.typed : !a.sel.length; }).length;
    return `<div class="scrim" data-a="close"><div class="sheet" role="dialog" aria-label="交卷">
    <span class="grab"></span>
    <b>確定要交卷嗎？</b>
    <p class="small muted">${left ? `還有 <b class="num">${left}</b> 題沒作答，沒作答算錯。` : "全部都作答了。"}剩下時間 ${mmss(examLeft())}。</p>
    <button class="btn" data-a="exfinish">交卷</button>
    <button class="btn ghost" data-a="close">回去檢查</button>
  </div></div>`; }
  return "";
}

/* ---------- 繪製與事件 ---------- */
function render(){
  if (!ME && !S.loading && S.screen !== "welcome") S.screen = "welcome";   // 只開放登入使用
  if (S.loading) { app.innerHTML = `<div class="grow" style="display:grid;place-items:center"><p class="muted">讀取你的進度中…</p></div>`; return; }
  const v = {welcome: vWelcome, quiz: vQuiz, result: vResult, home: vHome, exam: vExam, examres: vExamRes, chal: vChal}[S.screen]();
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
    case "again": startSession(S.mode, S.arg || (S.list[0] && S.list[0].unit)); break;
    case "range": P.range = k === "1" ? "1" : "2"; save(); set({}); break;
    case "pick": { const n = +k;
      if (q.type === "multi") set({sel: S.sel.includes(n) ? S.sel.filter(x => x !== n) : [...S.sel, n]}); else set({sel: [n]}); break; }
    case "key": { let t = S.typed;
      if (k === "⌫") t = t.slice(0, -1);
      else if (k === "C") t = "";
      else if (k === "−") t = t.startsWith("-") ? t.slice(1) : "-" + t;
      else if (k === "√") { if (!/[√/.]/.test(t) && t.length < 9) t += "√"; }
      else if (k === "/") { if (!t.includes("/") && /\d$/.test(t)) t += "/"; }
      else if (k === ".") { const seg = t.split(/[√/]/).pop(); if (!seg.includes(".") && !t.includes("√") && t.length < 9) t += seg === "" || seg === "-" ? "0." : "."; }
      else if (t.length < 10) t += k;
      set({typed: t}); break; }
    case "submit": if (q.type === "num" && parseNum(S.typed) === null) { toast("這個寫法看不懂，例如：−3/2、2√3、3√2/2"); break; } { const r = isRight(q); S.log.push({i: S.i, right: r}); record(q, r); set({done: true}); break; }
    case "why": recordWhy(q, +k); set({why: +k}); break;
    case "next": scroller.scrollTo(0, 0);
      if (S.i === S.list.length - 1) set({screen: "result"}); else set({i: S.i + 1, sel: [], typed: "", done: false, why: null}); break;
    case "home":
      if (S.screen === "exam") { toast("限時挑戰進行中，要離開請先交卷"); break; }
      set({screen: "home", sheet: null}); break;
    case "chal": scroller.scrollTo(0, 0); set({screen: "chal", sheet: null}); break;
    case "exask": set({sheet: "exask:" + k}); break;
    case "exstart": startExam(k); break;
    case "exgo": { const n = +k; if (n >= 0 && n < S.list.length) examGo(n); break; }
    case "exsubmit": set({sheet: "exsubmit"}); break;
    case "exfinish": finishExam(); break;
    case "loginsheet": set({sheet: "login"}); break;
    case "close": set({sheet: null}); break;
    case "login": login(); break;
    case "copylink": copyLink(); break;
    case "logout": logout(); break;
    case "guest": enterGuest(); break;
  }
});
restoreSession();
render();
