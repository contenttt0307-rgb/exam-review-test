/* 坐標圖：把題目的 fig 設定畫成 SVG（直線、圓、點、線段、陰影區域、文字）。
   fig = {x:[x0,x1], y:[y0,y1], items:[...], nums:true}
   顏色用 CSS 變數，深色模式也看得清楚。 */
window.figSVG = function (fig) {
  const [x0, x1] = fig.x || [-6, 6], [y0, y1] = fig.y || [-6, 6];
  const W = 300, s = W / (x1 - x0), H = Math.round((y1 - y0) * s);
  const X = x => +((x - x0) * s).toFixed(2), Y = y => +((y1 - y) * s).toFixed(2);
  const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const box = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  let out = [];
  const span = Math.max(x1 - x0, y1 - y0), step = [1, 2, 5, 10, 20, 25, 50, 100].find(v => span / v <= 14) || 200;
  // 格線
  for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) out.push(`<line x1="${X(gx)}" y1="0" x2="${X(gx)}" y2="${H}" class="fg-grid"/>`);
  for (let gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) out.push(`<line x1="0" y1="${Y(gy)}" x2="${W}" y2="${Y(gy)}" class="fg-grid"/>`);
  // 陰影區域（半平面交集）
  const clip = (poly, a, b, c, op) => {
    const f = p => a * p[0] + b * p[1] + c, keep = v => (op[0] === ">" ? v >= -1e-9 : v <= 1e-9), res = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q);
      if (keep(fp)) res.push(P);
      if (keep(fp) !== keep(fq)) { const t = fp / (fp - fq); res.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
    }
    return res;
  };
  (fig.items || []).forEach(it => {
    if (!it.region) return;
    let poly = box;
    it.region.forEach(([a, b, c, op]) => { if (poly.length) poly = clip(poly, a, b, c, op); });
    if (poly.length > 2) out.push(`<polygon points="${poly.map(p => X(p[0]) + "," + Y(p[1])).join(" ")}" class="fg-region"/>`);
  });
  // 坐標軸
  if (y0 <= 0 && y1 >= 0) out.push(`<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" class="fg-axis" marker-end="url(#fg-arr)"/><text x="${W - 4}" y="${Y(0) - 6}" class="fg-ax" text-anchor="end">x</text>`);
  if (x0 <= 0 && x1 >= 0) out.push(`<line x1="${X(0)}" y1="${H}" x2="${X(0)}" y2="0" class="fg-axis" marker-end="url(#fg-arr)"/><text x="${X(0) + 6}" y="12" class="fg-ax">y</text>`);
  if (fig.nums !== false) {
    for (let gx = Math.ceil(x0 / step) * step; gx < x1; gx += step) if (gx !== 0 && y0 <= 0 && y1 >= 0) out.push(`<text x="${X(gx)}" y="${Math.min(H - 2, Y(0) + 13)}" class="fg-num" text-anchor="middle">${gx}</text>`);
    for (let gy = Math.ceil(y0 / step) * step; gy < y1; gy += step) if (gy !== 0 && x0 <= 0 && x1 >= 0) out.push(`<text x="${X(0) - 4}" y="${Y(gy) + 4}" class="fg-num" text-anchor="end">${gy}</text>`);
    if (x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0) out.push(`<text x="${X(0) - 4}" y="${Y(0) + 13}" class="fg-num" text-anchor="end">O</text>`);
  }
  // 直線、線段、圓、文字、點
  (fig.items || []).forEach(it => {
    if (it.line) {
      const [a, b, c] = it.line; let pts = [];
      if (Math.abs(b) > 1e-12) { [x0, x1].forEach(x => pts.push([x, -(a * x + c) / b])); }
      if (Math.abs(a) > 1e-12) { [y0, y1].forEach(y => pts.push([-(b * y + c) / a, y])); }
      pts = pts.filter(p => p[0] >= x0 - 1e-9 && p[0] <= x1 + 1e-9 && p[1] >= y0 - 1e-9 && p[1] <= y1 + 1e-9);
      pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      if (pts.length >= 2) {
        const P = pts[0], Q = pts[pts.length - 1];
        out.push(`<line x1="${X(P[0])}" y1="${Y(P[1])}" x2="${X(Q[0])}" y2="${Y(Q[1])}" class="fg-line${it.dash ? " fg-dash" : ""}"/>`);
        if (it.label) {
          const t = 0.88, lx = P[0] + t * (Q[0] - P[0]), ly = P[1] + t * (Q[1] - P[1]);
          out.push(`<text x="${Math.min(W - 4, Math.max(4, X(lx) + 6))}" y="${Math.min(H - 4, Math.max(12, Y(ly) - 6))}" class="fg-lab">${esc(it.label)}</text>`);
        }
      }
    }
    if (it.seg) { const [a, b, c, d] = it.seg; out.push(`<line x1="${X(a)}" y1="${Y(b)}" x2="${X(c)}" y2="${Y(d)}" class="fg-line${it.dash ? " fg-dash" : ""}"/>`); }
    if (it.circle) {
      const [h, k, r] = it.circle;
      out.push(`<circle cx="${X(h)}" cy="${Y(k)}" r="${+(r * s).toFixed(2)}" class="fg-circ"/>`);
      if (it.label) out.push(`<text x="${X(h + r * 0.72) + 4}" y="${Y(k + r * 0.72) - 4}" class="fg-lab">${esc(it.label)}</text>`);
    }
    if (it.text) { const [x, y, t] = it.text; out.push(`<text x="${X(x)}" y="${Y(y)}" class="fg-lab" text-anchor="middle">${esc(t)}</text>`); }
  });
  (fig.items || []).forEach(it => {
    if (!it.pt) return;
    const [x, y] = it.pt;
    out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="3.2" class="fg-pt"/>`);
    if (it.label) out.push(`<text x="${X(x) + 6}" y="${Y(y) - 6}" class="fg-lab">${esc(it.label)}</text>`);
  });
  return `<svg class="fg" viewBox="-14 -6 ${W + 28} ${H + 20}" role="img" aria-label="坐標圖">
<defs><marker id="fg-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fg-arrhead"/></marker></defs>
${out.join("\n")}</svg>`;
};
/* 樣式：用頁面上的顏色變數 */
window.FIG_CSS = `
.fg{display:block;width:100%;max-width:360px;height:auto;margin:4px auto;overflow:visible}
.fg-grid{stroke:var(--line,#DDE3EC);stroke-width:.6}
.fg-axis{stroke:var(--muted,#5D6880);stroke-width:1.2}
.fg-arrhead{fill:var(--muted,#5D6880)}
.fg-ax,.fg-num{fill:var(--muted,#5D6880);font-size:10px;font-family:var(--f-num,sans-serif)}
.fg-line{stroke:var(--ink,#13294B);stroke-width:1.8;fill:none}
.fg-dash{stroke-dasharray:5 4}
.fg-circ{stroke:var(--ink,#13294B);stroke-width:1.8;fill:none}
.fg-region{fill:var(--accent,#F5B82E);fill-opacity:.35;stroke:none}
.fg-pt{fill:var(--ink,#13294B)}
.fg-lab{fill:var(--ink,#13294B);font-size:12px;font-weight:600;font-family:var(--f-body,sans-serif)}
`;
