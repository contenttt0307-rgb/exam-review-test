/* 單元01 實數　題庫初稿（34 題）
   數學式一律用 LaTeX，行內公式以 \( ... \) 包起來。
   欄位：id 題號、tag 觀念代碼、level 難度（易／中／難）、type（tf 是非 / mc 單選 / multi 多選 / num 數字填充）、
   stem 題幹、opts 選項、ans 正解（選項編號從 0 開始；num 題為數字字串）、
   reasons 答錯時追問的錯因、key 最常見錯因的編號、exp 解析。
   stuck（全班卡關比例）上線後由實際作答資料計算，這裡先留空。 */
window.BANK_UNIT01 = [
  // R01 有理數的定義與組成
  {id:"R01-1", tag:"R01", level:"易", type:"tf",
   stem:String.raw`循環小數都是有理數。`,
   opts:["○ 正確","✕ 錯誤"], ans:[0],
   reasons:["以為無限小數都不是有理數","把循環小數和不循環的無限小數搞混","忘了循環小數可以化成分數"], key:0,
   exp:String.raw`循環小數都能化成 \(\dfrac{p}{q}\) 的形式，所以是有理數。<br>只有不循環的無限小數才是無理數。`},
  {id:"R01-2", tag:"R01", level:"中", type:"multi",
   stem:String.raw`<span class="k">多選</span>下列哪些是有理數？`,
   opts:[String.raw`\(0.\overline{12}\)`,String.raw`\(\sqrt{9}\)`,String.raw`\(\dfrac{\pi}{2}\)`,String.raw`\(-3.14\)`,String.raw`\(\sqrt{2}+1\)`], ans:[0,1,3],
   reasons:["以為有根號的數一定是無理數","以為循環小數不是有理數",String.raw`把 \(\dfrac{\pi}{2}\) 當成分數`], key:0,
   exp:String.raw`\(0.\overline{12}=\dfrac{12}{99}\)、\(\sqrt{9}=3\)、\(-3.14=-\dfrac{314}{100}\) 都是有理數。<br>\(\pi\) 是無理數，\(\dfrac{\pi}{2}\) 也是無理數；\(\sqrt{2}+1\) 是無理數。`},

  // R02 循環小數化為分數
  {id:"R02-1", tag:"R02", level:"易", type:"mc",
   stem:String.raw`\(0.\overline{36}=\)？`,
   opts:[String.raw`\(\dfrac{4}{11}\)`,String.raw`\(\dfrac{9}{25}\)`,String.raw`\(\dfrac{2}{5}\)`,String.raw`\(\dfrac{4}{111}\)`], ans:[0],
   reasons:[String.raw`當成有限小數 \(0.36\) 來化`,String.raw`分母寫成 \(90\)`,String.raw`分母的 \(9\) 寫錯個數`], key:0,
   exp:String.raw`設 \(x=0.\overline{36}\)，則 \(100x=36.\overline{36}\)。<br>相減得 \(99x=36\)，所以 \(x=\dfrac{36}{99}=\dfrac{4}{11}\)。`},
  {id:"R02-2", tag:"R02", level:"中", type:"mc",
   stem:String.raw`\(1.2\overline{3}=\)？`,
   opts:[String.raw`\(\dfrac{37}{30}\)`,String.raw`\(\dfrac{41}{33}\)`,String.raw`\(\dfrac{37}{33}\)`,String.raw`\(\dfrac{123}{100}\)`], ans:[0],
   reasons:[String.raw`分母應該用 \(90\)，寫成了 \(99\)`,String.raw`沒有先把不循環的 \(2\) 處理掉`,String.raw`當成有限小數 \(1.23\)`], key:0,
   exp:String.raw`設 \(x=1.2\overline{3}\)，則 \(100x=123.\overline{3}\)、\(10x=12.\overline{3}\)。<br>相減得 \(90x=111\)，所以 \(x=\dfrac{111}{90}=\dfrac{37}{30}\)。`},
  {id:"R02-3", tag:"R02", level:"中", type:"tf",
   stem:String.raw`\(0.\overline{9}=1\)`,
   opts:["○ 正確","✕ 錯誤"], ans:[0],
   reasons:[String.raw`以為 \(0.999\cdots\) 永遠比 \(1\) 小一點點`,"不知道循環小數可以化成分數","以為無限小數不可能等於整數"], key:0,
   exp:String.raw`設 \(x=0.\overline{9}\)，則 \(10x=9.\overline{9}\)。<br>相減得 \(9x=9\)，所以 \(x=1\)。`},
  {id:"R02-4", tag:"R02", level:"中", type:"tf",
   stem:String.raw`\(0.\overline{38}+0.\overline{62}=1\)`,
   opts:["○ 正確","✕ 錯誤"], ans:[1],
   reasons:["把循環小數當成有限小數相加","沒有先化成分數再相加","以為循環的部分會互相抵消"], key:0,
   exp:String.raw`\(0.\overline{38}+0.\overline{62}=\dfrac{38}{99}+\dfrac{62}{99}=\dfrac{100}{99}\)，比 \(1\) 大。`},

  // R03 有限小數的判別
  {id:"R03-1", tag:"R03", level:"中", type:"mc",
   stem:`下列哪一個分數可以化成有限小數？`,
   opts:[String.raw`\(\dfrac{7}{12}\)`,String.raw`\(\dfrac{9}{24}\)`,String.raw`\(\dfrac{5}{14}\)`,String.raw`\(\dfrac{11}{30}\)`], ans:[1],
   reasons:["沒有先約成最簡分數","以為分母是偶數就一定是有限小數",String.raw`忘了最簡分數的分母只能有 \(2\)、\(5\) 兩種質因數`], key:0,
   exp:String.raw`\(\dfrac{9}{24}=\dfrac{3}{8}\)，分母 \(8=2^3\) 只含質因數 \(2\)，可化成有限小數 \(0.375\)。<br>其他三個約到最簡後，分母含有 \(3\) 或 \(7\)。`},
  {id:"R03-2", tag:"R03", level:"中", type:"tf",
   stem:String.raw`\(\dfrac{21}{75}\) 可以化成有限小數。`,
   opts:["○ 正確","✕ 錯誤"], ans:[0],
   reasons:[String.raw`看到分母 \(75\) 含 \(3\) 就判斷不行，沒有先約分`,String.raw`把 \(25\) 的質因數算錯`,String.raw`以為有限小數的分母只能是 \(10\) 的次方`], key:0,
   exp:String.raw`\(\dfrac{21}{75}=\dfrac{7}{25}\)，分母 \(25=5^2\)，所以可化成有限小數 \(0.28\)。<br>判斷前一定要先約成最簡分數。`},

  // R04 有理數的稠密性
  {id:"R04-1", tag:"R04", level:"易", type:"tf",
   stem:String.raw`在 \(0\) 和 \(0.001\) 之間有無限多個有理數。`,
   opts:["○ 正確","✕ 錯誤"], ans:[0],
   reasons:["以為兩個很接近的數之間沒有其他有理數","只把有理數想成整數或簡單分數","不知道有理數的稠密性"], key:2,
   exp:String.raw`任意兩個相異有理數之間，一定還有有理數（例如兩數的平均），這叫做有理數的稠密性。<br>一直取平均就能找到無限多個。`},
  {id:"R04-2", tag:"R04", level:"中", type:"mc",
   stem:String.raw`下列哪一個數介於 \(\dfrac{1}{4}\) 與 \(\dfrac{1}{3}\) 之間？`,
   opts:[String.raw`\(\dfrac{2}{7}\)`,String.raw`\(\dfrac{1}{5}\)`,String.raw`\(\dfrac{3}{8}\)`,String.raw`\(\dfrac{2}{5}\)`], ans:[0],
   reasons:["以為分母越大，數就越大","沒有通分或化成小數就直接比",String.raw`把 \(\dfrac{1}{4}\) 和 \(\dfrac{1}{3}\) 的大小弄反`], key:1,
   exp:String.raw`\(\dfrac{1}{4}=0.25\)、\(\dfrac{1}{3}\approx 0.333\)，而 \(\dfrac{2}{7}\approx 0.286\) 在兩者之間。<br>其他選項：\(0.2\)、\(0.375\)、\(0.4\) 都不在範圍內。`},

  // R05 無理數的判別
  {id:"R05-1", tag:"R05", level:"中", type:"multi",
   stem:String.raw`<span class="k">多選</span>下列哪些是無理數？`,
   opts:[String.raw`\(\sqrt{16}\)`,String.raw`\(\sqrt{12}\)`,String.raw`\(3.\overline{14}\)`,String.raw`\(\pi-3\)`,String.raw`\(\sqrt{\dfrac{4}{9}}\)`], ans:[1,3],
   reasons:[String.raw`把 \(\sqrt{16}\) 這種完全平方數也當成無理數`,String.raw`以為 \(\pi-3\) 減掉整數後變成有理數`,"以為根號裡是分數就一定是無理數"], key:0,
   exp:String.raw`\(\sqrt{16}=4\)、\(3.\overline{14}\) 是循環小數、\(\sqrt{\dfrac{4}{9}}=\dfrac{2}{3}\)，都是有理數。<br>\(\sqrt{12}=2\sqrt{3}\) 與 \(\pi-3\) 是無理數。`},

  // R06 有理數與無理數的運算
  {id:"R06-1", tag:"R06", level:"易", type:"tf",
   stem:String.raw`若 \(a\) 為有理數、\(b\) 為無理數，則 \(ab\) 必為無理數。`,
   opts:["○ 正確","✕ 錯誤"], ans:[1],
   reasons:[String.raw`忽略 \(a=0\) 的情況`,"以為無理數乘任何數都是無理數","把加法的性質套到乘法"], key:0,
   exp:String.raw`反例：取 \(a=0\)，則 \(ab=0\) 是有理數。<br>（當 \(a\neq 0\) 時，\(ab\) 才一定是無理數。）`},
  {id:"R06-2", tag:"R06", level:"易", type:"tf",
   stem:`兩個無理數的和必為無理數。`,
   opts:["○ 正確","✕ 錯誤"], ans:[1],
   reasons:["沒想到兩個無理數可以互相抵消","以為無理數加無理數一定還是無理數",String.raw`只用 \(\sqrt{2}+\sqrt{3}\) 這種例子判斷`], key:0,
   exp:String.raw`反例：\(\sqrt{2}+(-\sqrt{2})=0\)，結果是有理數。`},
  {id:"R06-3", tag:"R06", level:"中", type:"tf",
   stem:String.raw`若 \(a\) 為有理數、\(b\) 為無理數，則 \(a+b\) 必為無理數。`,
   opts:["○ 正確","✕ 錯誤"], ans:[0],
   reasons:["以為可能剛好抵消成有理數",String.raw`把乘法的反例 \(a=0\) 套到加法`,"不會用反證法判斷"], key:1,
   exp:String.raw`假設 \(a+b=c\) 是有理數，則 \(b=c-a\) 是兩個有理數相減，也是有理數，與 \(b\) 是無理數矛盾。<br>所以 \(a+b\) 必為無理數。`},

  // R07 a + b√2 = 0（係數比較）
  {id:"R07-1", tag:"R07", level:"中", type:"mc",
   stem:String.raw`若 \(a\)、\(b\) 為有理數，且 \((a-1)+(b+2)\sqrt{2}=0\)，則 \(a+b=\)？`,
   opts:[String.raw`\(-1\)`,String.raw`\(3\)`,String.raw`\(1\)`,String.raw`\(-3\)`], ans:[0],
   reasons:[String.raw`忘了 \(a\)、\(b\) 是有理數才能比較係數`,"移項時正負號弄錯",String.raw`把 \(\sqrt{2}\) 的係數和有理數部分搞混`], key:1,
   exp:String.raw`因為 \(a-1\)、\(b+2\) 都是有理數，所以 \(a-1=0\) 且 \(b+2=0\)。<br>得 \(a=1\)、\(b=-2\)，\(a+b=-1\)。`},
  {id:"R07-2", tag:"R07", level:"難", type:"mc",
   stem:String.raw`若 \(a\)、\(b\) 為有理數，且 \((2+\sqrt{2})a+(1-\sqrt{2})b=5+\sqrt{2}\)，則數對 \((a,b)=\)？`,
   opts:[String.raw`\((2,1)\)`,String.raw`\((1,3)\)`,String.raw`\((3,-1)\)`,String.raw`\((1,2)\)`], ans:[0],
   reasons:[String.raw`展開後沒有把有理數部分和 \(\sqrt{2}\) 部分分開整理`,String.raw`\(\sqrt{2}\) 部分的係數正負號弄錯`,"聯立方程式解錯"], key:0,
   exp:String.raw`整理成 \((2a+b)+(a-b)\sqrt{2}=5+\sqrt{2}\)。<br>比較係數：\(2a+b=5\)、\(a-b=1\)，解得 \(a=2\)、\(b=1\)。`},

  // R08 根號的近似與估計
  {id:"R08-1", tag:"R08", level:"易", type:"mc",
   stem:String.raw`\(\sqrt{7}\) 介於下列哪兩個數之間？`,
   opts:[String.raw`\(2.5\) 與 \(2.6\)`,String.raw`\(2.6\) 與 \(2.7\)`,String.raw`\(2.7\) 與 \(2.8\)`,String.raw`\(3.4\) 與 \(3.5\)`], ans:[1],
   reasons:["平方後比大小算錯",String.raw`把 \(\sqrt{7}\) 和 \(7\div 2\) 搞混`,"沒有用平方來夾"], key:0,
   exp:String.raw`\(2.6^2=6.76\)、\(2.7^2=7.29\)，而 \(6.76\lt 7\lt 7.29\)。<br>所以 \(2.6\lt \sqrt{7}\lt 2.7\)。`},

  // R09 實數的運算性質與次序
  {id:"R09-1", tag:"R09", level:"易", type:"tf",
   stem:String.raw`若 \(a\lt b\)，則 \(-2a\lt -2b\)。`,
   opts:["○ 正確","✕ 錯誤"], ans:[1],
   reasons:["乘以負數時忘了不等號要變向","以為不等式兩邊同乘任何數都不變號",String.raw`把 \(a\)、\(b\) 的大小弄反`], key:0,
   exp:String.raw`不等式兩邊同乘負數，不等號要變向：\(a\lt b\Rightarrow -2a\gt -2b\)。`},
  {id:"R09-2", tag:"R09", level:"中", type:"tf",
   stem:String.raw`若 \(a\lt b\)，則 \(\dfrac{2a+b}{3}\gt \dfrac{a+2b}{3}\)。`,
   opts:["○ 正確","✕ 錯誤"], ans:[1],
   reasons:["沒有相減比較就直接判斷",String.raw`以為 \(a\) 的係數比較大，結果就比較大`,"相減時正負號弄錯"], key:1,
   exp:String.raw`相減：\(\dfrac{2a+b}{3}-\dfrac{a+2b}{3}=\dfrac{a-b}{3}\lt 0\)。<br>所以 \(\dfrac{2a+b}{3}\lt \dfrac{a+2b}{3}\)。`},

  // R10 乘法公式
  {id:"R10-1", tag:"R10", level:"易", type:"mc",
   stem:String.raw`\((2x-3y)^2=\)？`,
   opts:[String.raw`\(4x^2-12xy+9y^2\)`,String.raw`\(4x^2-9y^2\)`,String.raw`\(4x^2+9y^2\)`,String.raw`\(4x^2-6xy+9y^2\)`], ans:[0],
   reasons:[String.raw`以為 \((a-b)^2=a^2-b^2\)`,"中間項忘了乘 2","正負號弄錯"], key:0,
   exp:String.raw`\((a-b)^2=a^2-2ab+b^2\)。<br>\((2x-3y)^2=(2x)^2-2(2x)(3y)+(3y)^2=4x^2-12xy+9y^2\)。`},
  {id:"R10-2", tag:"R10", level:"中", type:"mc",
   stem:String.raw`若 \(a+b+c=5\)，\(ab+bc+ca=6\)，則 \(a^2+b^2+c^2=\)？`,
   opts:[String.raw`\(13\)`,String.raw`\(19\)`,String.raw`\(37\)`,String.raw`\(25\)`], ans:[0],
   reasons:[String.raw`忘了 \((a+b+c)^2\) 有交叉項`,"交叉項沒有乘 2","移項時把減號寫成加號"], key:1,
   exp:String.raw`\((a+b+c)^2=a^2+b^2+c^2+2(ab+bc+ca)\)。<br>\(25=a^2+b^2+c^2+12\)，所以 \(a^2+b^2+c^2=13\)。`},

  // R11 和差立方、立方和與立方差
  {id:"R11-1", tag:"R11", level:"易", type:"mc",
   stem:String.raw`\((x-2)(x^2+2x+4)=\)？`,
   opts:[String.raw`\(x^3-8\)`,String.raw`\(x^3+8\)`,String.raw`\(x^3-6x^2+12x-8\)`,String.raw`\(x^3-4\)`], ans:[0],
   reasons:["立方差與立方和的符號記反","把立方差公式和差的立方公式搞混","展開時漏乘"], key:0,
   exp:String.raw`立方差公式：\((a-b)(a^2+ab+b^2)=a^3-b^3\)。<br>這裡 \(a=x\)、\(b=2\)，結果是 \(x^3-8\)。`},
  {id:"R11-2", tag:"R11", level:"中", type:"mc",
   stem:String.raw`\((a+2b)^3=\)？`,
   opts:[String.raw`\(a^3+6a^2b+12ab^2+8b^3\)`,String.raw`\(a^3+8b^3\)`,String.raw`\(a^3+6a^2b+6ab^2+8b^3\)`,String.raw`\(a^3+3a^2b+3ab^2+8b^3\)`], ans:[0],
   reasons:[String.raw`以為 \((a+b)^3=a^3+b^3\)`,String.raw`係數 \(3\) 沒有和 \(2b\) 的次方一起乘`,"中間項的係數算錯"], key:1,
   exp:String.raw`\((a+b)^3=a^3+3a^2b+3ab^2+b^3\)，把 \(b\) 換成 \(2b\)：<br>\(a^3+3a^2(2b)+3a(2b)^2+(2b)^3=a^3+6a^2b+12ab^2+8b^3\)。`},

  // R12 x + 1/x 型求值
  {id:"R12-1", tag:"R12", level:"中", type:"num",
   stem:String.raw`若 \(x+\dfrac{1}{x}=3\)，則 \(x^2+\dfrac{1}{x^2}=\)？`, ans:"7", unitWord:"",
   reasons:[String.raw`平方後忘了減 \(2\)`,String.raw`把 \(\left(x+\dfrac{1}{x}\right)^2\) 直接當成 \(x^2+\dfrac{1}{x^2}\)`,String.raw`把 \(3^2\) 算成 \(6\)`], key:0,
   exp:String.raw`\(x^2+\dfrac{1}{x^2}=\left(x+\dfrac{1}{x}\right)^2-2=9-2=7\)。`},
  {id:"R12-2", tag:"R12", level:"難", type:"num",
   stem:String.raw`若 \(x+\dfrac{1}{x}=3\)，則 \(x^3+\dfrac{1}{x^3}=\)？`, ans:"18", unitWord:"",
   reasons:[String.raw`少減了 \(3\left(x+\dfrac{1}{x}\right)\)`,"把立方和公式記錯",String.raw`直接把 \(3\) 立方得 \(27\)`], key:0,
   exp:String.raw`\(x^3+\dfrac{1}{x^3}=\left(x+\dfrac{1}{x}\right)^3-3\left(x+\dfrac{1}{x}\right)=27-9=18\)。`},

  // R13 根式化簡與四則運算
  {id:"R13-1", tag:"R13", level:"易", type:"mc",
   stem:String.raw`\(\sqrt{12}+\sqrt{75}-\sqrt{27}=\)？`,
   opts:[String.raw`\(4\sqrt{3}\)`,String.raw`\(\sqrt{60}\)`,String.raw`\(2\sqrt{15}\)`,String.raw`\(6\sqrt{3}\)`], ans:[0],
   reasons:[String.raw`以為 \(\sqrt{a}+\sqrt{b}=\sqrt{a+b}\)`,"根號化簡時提出來的數算錯","沒有化成同類根式就合併"], key:0,
   exp:String.raw`\(\sqrt{12}=2\sqrt{3}\)、\(\sqrt{75}=5\sqrt{3}\)、\(\sqrt{27}=3\sqrt{3}\)。<br>\(2\sqrt{3}+5\sqrt{3}-3\sqrt{3}=4\sqrt{3}\)。`},
  {id:"R13-2", tag:"R13", level:"易", type:"tf",
   stem:String.raw`\(\sqrt{9+16}=\sqrt{9}+\sqrt{16}\)`,
   opts:["○ 正確","✕ 錯誤"], ans:[1],
   reasons:["以為根號可以對加法拆開","根號的值算錯",String.raw`把乘法的性質 \(\sqrt{ab}=\sqrt{a}\sqrt{b}\) 套到加法`], key:2,
   exp:String.raw`左邊 \(\sqrt{25}=5\)，右邊 \(3+4=7\)，不相等。<br>根號只能對乘除拆開：\(\sqrt{ab}=\sqrt{a}\sqrt{b}\)，加減不行。`},

  // R14 分母有理化
  {id:"R14-1", tag:"R14", level:"易", type:"mc",
   stem:String.raw`\(\dfrac{2}{\sqrt{5}+\sqrt{3}}=\)？`,
   opts:[String.raw`\(\sqrt{5}-\sqrt{3}\)`,String.raw`\(\sqrt{5}+\sqrt{3}\)`,String.raw`\(\dfrac{\sqrt{5}-\sqrt{3}}{4}\)`,String.raw`\(2(\sqrt{5}-\sqrt{3})\)`], ans:[0],
   reasons:["乘的共軛式符號弄反",String.raw`分母算成 \(5+3\)`,"分子沒有一起乘"], key:1,
   exp:String.raw`分子分母同乘 \(\sqrt{5}-\sqrt{3}\)：<br>\(\dfrac{2(\sqrt{5}-\sqrt{3})}{5-3}=\sqrt{5}-\sqrt{3}\)。`},
  {id:"R14-2", tag:"R14", level:"中", type:"mc",
   stem:String.raw`\(\dfrac{1}{2-\sqrt{3}}+\dfrac{1}{2+\sqrt{3}}=\)？`,
   opts:[String.raw`\(4\)`,String.raw`\(2\sqrt{3}\)`,String.raw`\(1\)`,String.raw`\(\dfrac{4}{7}\)`], ans:[0],
   reasons:[String.raw`分母算成 \(4+3=7\)`,"根號部分沒有抵消，反而相加","有理化時分子忘了一起乘"], key:0,
   exp:String.raw`\(\dfrac{1}{2-\sqrt{3}}=\dfrac{2+\sqrt{3}}{4-3}=2+\sqrt{3}\)，同理 \(\dfrac{1}{2+\sqrt{3}}=2-\sqrt{3}\)。<br>相加得 \(4\)。`},

  // R15 根式比大小
  {id:"R15-1", tag:"R15", level:"難", type:"mc",
   stem:String.raw`設 \(a=\sqrt{2}+\sqrt{11}\)，\(b=\sqrt{3}+\sqrt{10}\)，\(c=\sqrt{6}+\sqrt{7}\)，則大小關係為？`,
   opts:[String.raw`\(a\lt b\lt c\)`,String.raw`\(c\lt b\lt a\)`,String.raw`\(a=b=c\)`,String.raw`\(b\lt a\lt c\)`], ans:[0],
   reasons:[String.raw`看到根號內加起來都是 \(13\) 就以為相等`,"平方後交叉項比錯","沒有先平方再比較"], key:0,
   exp:String.raw`平方：\(a^2=13+2\sqrt{22}\)、\(b^2=13+2\sqrt{30}\)、\(c^2=13+2\sqrt{42}\)。<br>因為 \(22\lt 30\lt 42\)，且 \(a,b,c\) 都是正數，所以 \(a\lt b\lt c\)。`},

  // R16 雙重根式
  {id:"R16-1", tag:"R16", level:"中", type:"mc",
   stem:String.raw`\(\sqrt{7-2\sqrt{10}}=\)？`,
   opts:[String.raw`\(\sqrt{5}-\sqrt{2}\)`,String.raw`\(\sqrt{2}-\sqrt{5}\)`,String.raw`\(\sqrt{7}-\sqrt{10}\)`,String.raw`\(\sqrt{5}+\sqrt{2}\)`], ans:[0],
   reasons:["大小順序寫反，結果變成負數","以為可以直接把根號拆開",String.raw`找錯兩數（和為 \(7\)、積為 \(10\)）`], key:0,
   exp:String.raw`找兩數和為 \(7\)、積為 \(10\)：\(5\) 和 \(2\)。<br>\(\sqrt{7-2\sqrt{10}}=\sqrt{(\sqrt{5}-\sqrt{2})^2}=\sqrt{5}-\sqrt{2}\)（大的在前，結果才是正數）。`},
  {id:"R16-2", tag:"R16", level:"難", type:"mc",
   stem:String.raw`\(\sqrt{4+\sqrt{12}}=\)？`,
   opts:[String.raw`\(\sqrt{3}+1\)`,String.raw`\(\sqrt{3}-1\)`,String.raw`\(2+\sqrt{3}\)`,String.raw`\(1+\sqrt{2}\)`], ans:[0],
   reasons:[String.raw`沒先把 \(\sqrt{12}\) 寫成 \(2\sqrt{3}\)`,String.raw`找錯兩數（和為 \(4\)、積為 \(3\)）`,"正負號寫錯"], key:0,
   exp:String.raw`\(\sqrt{12}=2\sqrt{3}\)，所以 \(\sqrt{4+2\sqrt{3}}\)。<br>兩數和為 \(4\)、積為 \(3\)：\(3\) 和 \(1\)，結果是 \(\sqrt{3}+1\)。`},

  // R17 算幾不等式
  {id:"R17-1", tag:"R17", level:"中", type:"mc",
   stem:String.raw`若 \(a\gt 0\)、\(b\gt 0\)，且 \(ab=16\)，則 \(a+b\) 的最小值為？`,
   opts:[String.raw`\(8\)`,String.raw`\(4\)`,String.raw`\(16\)`,String.raw`\(32\)`], ans:[0],
   reasons:[String.raw`寫成 \(a+b\ge\sqrt{ab}\)，忘了乘 \(2\)`,String.raw`忘了 \(a\)、\(b\) 要是正數才能用`,String.raw`等號成立條件 \(a=b\) 沒有用上`], key:0,
   exp:String.raw`由算幾不等式：\(\dfrac{a+b}{2}\ge\sqrt{ab}=4\)，所以 \(a+b\ge 8\)。<br>當 \(a=b=4\) 時等號成立，最小值為 \(8\)。`},
  {id:"R17-2", tag:"R17", level:"難", type:"mc",
   stem:String.raw`若 \(a\gt 0\)、\(b\gt 0\)，且 \(ab=8\)，則 \(a+2b\) 的最小值為？`,
   opts:[String.raw`\(8\)`,String.raw`\(4\sqrt{2}\)`,String.raw`\(6\)`,String.raw`\(16\)`], ans:[0],
   reasons:[String.raw`把 \(a\) 和 \(2b\) 的乘積算成 \(ab=8\)`,String.raw`忘了乘 \(2\)`,"等號成立條件寫錯"], key:0,
   exp:String.raw`把 \(a\) 和 \(2b\) 看成兩個正數：\(\dfrac{a+2b}{2}\ge\sqrt{a\cdot 2b}=\sqrt{16}=4\)，所以 \(a+2b\ge 8\)。<br>當 \(a=2b\)，即 \(a=4\)、\(b=2\) 時等號成立。`}
];
