/* 數字變形題的共用工具：同一題每次換數字。
   題目物件加上 gen: R => ({stem, ans, opts?, exp})，R 由 VARY.mk(seed) 產生（同一個 seed 一定得到同一組數字）。 */
window.VARY = (function () {
  /* 可重現的亂數（mulberry32） */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

  /* 分數：F(n, d) 自動約分，分母為正 */
  function F(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error("F 需要整數且分母不為 0：" + n + "/" + d);
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return {n: n / g, d: d / g};
  }
  const toF = x => (typeof x === "number" ? F(x, 1) : x);
  const add = (x, y) => { x = toF(x); y = toF(y); return F(x.n * y.d + y.n * x.d, x.d * y.d); };
  const sub = (x, y) => { x = toF(x); y = toF(y); return F(x.n * y.d - y.n * x.d, x.d * y.d); };
  const mul = (x, y) => { x = toF(x); y = toF(y); return F(x.n * y.n, x.d * y.d); };
  const div = (x, y) => { x = toF(x); y = toF(y); return F(x.n * y.d, x.d * y.n); };
  const val = x => { x = toF(x); return x.n / x.d; };
  const isInt = x => toF(x).d === 1;

  /* 答案字串（給系統判分，格式同題庫 ans）：整數 "-3"、分數 "-3/2" */
  const fAns = x => { x = toF(x); return x.d === 1 ? String(x.n) : `${x.n}/${x.d}`; };
  /* LaTeX：-\dfrac{3}{2}、4 */
  const fTex = x => { x = toF(x); return x.d === 1 ? String(x.n) : `${x.n < 0 ? "-" : ""}\\dfrac{${Math.abs(x.n)}}{${x.d}}`; };
  /* 當成被乘數或被減數時加括號：(-3)、\left(-\dfrac{1}{2}\right) */
  const fPar = x => { x = toF(x); const s = fTex(x); return x.n < 0 ? (x.d === 1 ? `(${s})` : `\\left(${s}\\right)`) : s; };

  /* 根式 k√m / d 化成最簡：surd(k, m, d) → {k, m, d}（m 沒有平方因數；m=1 表示有理數） */
  function surd(k, m, d = 1) {
    if (m < 0) throw new Error("根號內不可為負");
    if (m === 0) return {k: 0, m: 1, d: 1};
    let out = 1, r = m;
    for (let p = 2; p * p <= r; p++) while (r % (p * p) === 0) { r /= p * p; out *= p; }
    k *= out;
    const g = gcd(k, d) || 1; k /= g; d /= g;
    if (d < 0) { k = -k; d = -d; }
    return {k, m: r, d};
  }
  /* 根式答案字串："2√5"、"√10"、"3√2/2"、"-√3"、有理數時同 fAns */
  function sAns(s) {
    if (s.m === 1) return fAns(F(s.k, s.d));
    const c = Math.abs(s.k) === 1 ? "" : String(Math.abs(s.k));
    return `${s.k < 0 ? "-" : ""}${c}√${s.m}${s.d === 1 ? "" : "/" + s.d}`;
  }
  function sTex(s) {
    if (s.m === 1) return fTex(F(s.k, s.d));
    const c = Math.abs(s.k) === 1 ? "" : String(Math.abs(s.k));
    const top = `${c}\\sqrt{${s.m}}`;
    return `${s.k < 0 ? "-" : ""}${s.d === 1 ? top : `\\dfrac{${top}}{${s.d}}`}`;
  }
  const sVal = s => s.k * Math.sqrt(s.m) / s.d;

  /* 多項式各項的係數寫法：term(3,"x",true)→"3x"；term(-1,"y")→"-y"；term(2,"y")→"+2y"；term(0,…)→"" */
  function term(c, v, first) {
    c = toF(c);
    if (c.n === 0) return "";
    const neg = c.n < 0, a = F(Math.abs(c.n), c.d);
    let body = v ? (a.n === 1 && a.d === 1 ? v : fTex(a) + v) : fTex(a);
    return (neg ? "-" : first ? "" : "+") + body;
  }
  /* 一般式 ax+by+c=0 的 LaTeX（自動處理 1、-1、0 與正負號） */
  function lin(a, b, c) {
    let s = term(a, "x", true);
    s += term(b, "y", !s);
    s += term(c, "", !s);
    return (s || "0") + "=0";
  }
  /* 式子 ax+by+c（不含 =0），例如代入計算時使用 */
  function expr(parts) { let s = ""; for (const [c, v] of parts) s += term(c, v, !s); return s || "0"; }
  /* 點坐標 (x,y)，可放分數 */
  const pt = (x, y) => `(${fTex(x)},${fTex(y)})`;
  /* (x-h)^2 的寫法：sq("x",3)→"(x-3)^2"；sq("x",-2)→"(x+2)^2"；sq("x",0)→"x^2" */
  function sq(v, h) { h = toF(h); return h.n === 0 ? `${v}^2` : `(${v}${h.n < 0 ? "+" : "-"}${fTex(F(Math.abs(h.n), h.d))})^2`; }

  function mk(seed) {
    const r = rng(seed);
    const R = {
      seed,
      rand: r,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      nz: (a, b) => { let v; do v = a + Math.floor(r() * (b - a + 1)); while (v === 0); return v; },
      pick: arr => arr[Math.floor(r() * arr.length)],
      sign: () => (r() < 0.5 ? -1 : 1),
      shuffle: arr => { arr = [...arr]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
    };
    return R;
  }

  return {mk, rng, gcd, F, add, sub, mul, div, val, isInt, fAns, fTex, fPar, surd, sAns, sTex, sVal, term, lin, expr, pt, sq};
})();
/* 讓 node 也能載入（驗證用） */
if (typeof module !== "undefined") module.exports = window.VARY;
