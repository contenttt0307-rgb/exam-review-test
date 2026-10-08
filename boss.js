/* 魔王關：段考範圍內的綜合難題。準備度 90% 以上才解鎖，不計入準備度、也不影響觀念攻克。 */
window.BOSS = [
  {id:"BOSS-1", tag:"R16", level:"難", type:"num", boss:true,
   stem:String.raw`設 \(\sqrt{19-8\sqrt{3}}\) 的整數部分為 \(a\)、小數部分為 \(b\)，求 \(b^3+\dfrac{1}{b^3}\) 的值。`,
   ans:"52",
   reasons:["雙重根式化不出來，或化成 \\(\\sqrt{3}-4\\)（負數）",String.raw`小數部分 \(b\) 算錯（以為 \(b=\sqrt{3}-1\) 之類）`,String.raw`不會用 \(b+\frac{1}{b}\) 求 \(b^3+\frac{1}{b^3}\)`], key:0,
   exp:String.raw`① \(19-8\sqrt{3}=19-2\sqrt{48}\)，找兩數和為 \(19\)、積為 \(48\)：\(16\) 與 \(3\)。<br>所以 \(\sqrt{19-8\sqrt{3}}=\sqrt{16}-\sqrt{3}=4-\sqrt{3}\approx 2.27\)。<br>② 整數部分 \(a=2\)，小數部分 \(b=(4-\sqrt{3})-2=2-\sqrt{3}\)。<br>③ \(\frac{1}{b}=\frac{1}{2-\sqrt{3}}=2+\sqrt{3}\)，所以 \(b+\frac{1}{b}=4\)。<br>④ \(b^3+\frac{1}{b^3}=\left(b+\frac{1}{b}\right)^3-3\left(b+\frac{1}{b}\right)=64-12=52\)。`},

  {id:"BOSS-2", tag:"A07", level:"難", type:"num", boss:true,
   stem:String.raw`同時滿足 \(|x-1|+|x-5|\le 6\) 與 \(|2x-7|\ge 3\) 的整數 \(x\) 共有幾個？`,
   ans:"5",
   reasons:[String.raw`\(|x-1|+|x-5|\le 6\) 的範圍算錯`,String.raw`\(|2x-7|\ge 3\) 只取了一邊，或方向弄反`,"兩個範圍的交集、端點整數數錯"], key:0,
   exp:String.raw`① \(|x-1|+|x-5|\) 是 \(x\) 到 \(1\) 和到 \(5\) 的距離和。\(1\)、\(5\) 相距 \(4\)，距離和為 \(6\) 時 \(x\) 在兩端各再往外 \(1\)：\(x=0\) 或 \(x=6\)。<br>所以 \(0\le x\le 6\)。<br>② \(|2x-7|\ge 3\) ⇒ \(2x-7\ge 3\) 或 \(2x-7\le -3\) ⇒ \(x\ge 5\) 或 \(x\le 2\)。<br>③ 交集的整數：\(0, 1, 2, 5, 6\)，共 \(5\) 個。`},

  {id:"BOSS-3", tag:"A04", level:"難", type:"mc", boss:true,
   stem:String.raw`設 \(x=\dfrac{\sqrt{3}+1}{\sqrt{3}-1}\)，求 \(\sqrt{x^2-8x+16}+\sqrt{x^2+\dfrac{1}{x^2}-2}\) 的值。`,
   opts:[String.raw`\(2+\sqrt{3}\)`,String.raw`\(3\sqrt{3}-2\)`,String.raw`\(2\sqrt{3}\)`,String.raw`\(4\)`], ans:[0],
   reasons:[String.raw`根號裡沒看出是完全平方：\((x-4)^2\)、\(\left(x-\frac{1}{x}\right)^2\)`,String.raw`把 \(\sqrt{(x-4)^2}\) 直接寫成 \(x-4\)，忘了要看正負（\(x\lt 4\)）`,String.raw`\(x\) 或 \(\frac{1}{x}\) 有理化算錯`], key:1,
   exp:String.raw`① 有理化：\(x=\frac{(\sqrt{3}+1)^2}{3-1}=\frac{4+2\sqrt{3}}{2}=2+\sqrt{3}\approx 3.73\)，\(\frac{1}{x}=\frac{1}{2+\sqrt{3}}=2-\sqrt{3}\)。<br>② \(\sqrt{x^2-8x+16}=\sqrt{(x-4)^2}=|x-4|\)，因為 \(x\lt 4\)，所以 \(=4-x\)。<br>③ \(\sqrt{x^2+\frac{1}{x^2}-2}=\sqrt{\left(x-\frac{1}{x}\right)^2}=\left|x-\frac{1}{x}\right|\)，因為 \(x\gt 1\gt\frac{1}{x}\)，所以 \(=x-\frac{1}{x}\)。<br>④ 相加：\((4-x)+\left(x-\frac{1}{x}\right)=4-\frac{1}{x}=4-(2-\sqrt{3})=2+\sqrt{3}\)。`},

  {id:"BOSS-4", tag:"L09", level:"難", type:"num", boss:true,
   stem:String.raw`已知 \(\log 2\approx 0.3010\)。若正整數 \(n\) 使得 \(2^n\) 是 \(31\) 位數，求所有可能的 \(n\) 的總和。`,
   ans:"303",
   reasons:[String.raw`位數和 log 的範圍對應錯（寫成 \(31\le\log 2^n\lt 32\)）`,String.raw`解 \(n\) 的範圍時邊界算錯，多算或少算一個`,"以為只有一個 n，沒想到是一段範圍"], key:0,
   exp:String.raw`① \(2^n\) 是 \(31\) 位數 ⇔ \(10^{30}\le 2^n\lt 10^{31}\) ⇔ \(30\le\log 2^n\lt 31\)。<br>② \(\log 2^n=n\log 2\approx 0.3010n\)，所以 \(30\le 0.3010n\lt 31\)。<br>③ \(n\ge\frac{30}{0.3010}\approx 99.67\)，\(n\lt\frac{31}{0.3010}\approx 102.99\)。<br>④ \(n=100, 101, 102\)，總和 \(100+101+102=303\)。`},

  {id:"BOSS-5", tag:"R17", level:"難", type:"mc", boss:true,
   stem:String.raw`當 \(x\gt 0\) 時，\(\dfrac{4^x+4^{-x}+8}{2^x+2^{-x}}\) 的最小值為何？`,
   opts:[String.raw`\(2\sqrt{6}\)`,String.raw`\(5\)`,String.raw`\(4\)`,String.raw`\(2\sqrt{6}+2\)`], ans:[0],
   reasons:[String.raw`不會把 \(4^x+4^{-x}\) 用 \(2^x+2^{-x}\) 表示`,String.raw`以為 \(2^x+2^{-x}\) 最小是 \(2\) 就直接代入，得到 \(5\)`,"算幾不等式用了，但沒檢查等號能不能成立"], key:1,
   exp:String.raw`① 令 \(t=2^x+2^{-x}\)。由算幾不等式 \(t\ge 2\)，且 \(x\gt 0\) 時 \(t\gt 2\)。<br>② \(4^x+4^{-x}=t^2-2\)，原式 \(=\frac{t^2+6}{t}=t+\frac{6}{t}\)。<br>③ 算幾：\(t+\frac{6}{t}\ge 2\sqrt{6}\)，等號在 \(t=\sqrt{6}\) 成立，而 \(\sqrt{6}\gt 2\)，取得到。<br>所以最小值是 \(2\sqrt{6}\approx 4.90\)。（直接代 \(t=2\) 得到的 \(5\) 不是最小值。）`}
  ,
  {id:"BOSS-6", tag:"R17", level:"難", type:"num", boss:true,
   stem:String.raw`對所有實數 \(x\)，求 \(|x-1|+\dfrac{16}{|x-1|+2}\) 的最小值。`,
   ans:"6",
   reasons:["直接對兩項用算幾，但兩項相乘不是定值",String.raw`沒想到令 \(t=|x-1|+2\)，把式子湊成 \(t+\frac{16}{t}-2\)`,String.raw`算出 \(t+\frac{16}{t}\ge 8\) 就停了，忘了減 \(2\)，或沒檢查等號能否成立`], key:1,
   exp:String.raw`① 令 \(t=|x-1|+2\)，因為 \(|x-1|\ge 0\)，所以 \(t\ge 2\)。<br>② 原式 \(=(t-2)+\frac{16}{t}=t+\frac{16}{t}-2\)。<br>③ 算幾不等式：\(t+\frac{16}{t}\ge 2\sqrt{16}=8\)，等號在 \(t=4\) 時成立，而 \(4\ge 2\)，取得到。<br>④ 最小值 \(=8-2=6\)，此時 \(|x-1|=2\)，即 \(x=3\) 或 \(x=-1\)。`}
];
