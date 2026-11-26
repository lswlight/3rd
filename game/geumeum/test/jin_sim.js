// 도깨비체스 밸런스 자동 시험: node test/jin_sim.js 100 ['{"hpM":600}']  (값을 덮어써 비교)
// 도깨비체스 자동 시험: Stage마다 N판, 새로 시작(fresh) / 이어가기(cont) 승률
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.addInitScript(() => { sessionStorage.setItem('geumeum-picked', '1'); localStorage.setItem('dokkaebi-save', JSON.stringify({ gold: 70, stars: {0:3}, tut: { all: 1, prologue: 1, r11: 3, arc13: 1, weak: 1, awake: 1, shield: 1, coRdy: 1 }, jin: { best: 0, runs: 0, tut: 1, clear: 0, got5: 0, free: { d: '', n: 0 }, use: {}, spd: 3 } })); });
  await p.goto(process.env.URL || 'file:///home/user/3rd/game/geumeum/dokkaebi-shooter.html'); await p.waitForTimeout(1500);
  const N = +(process.argv[2] || 20), P = process.argv[3] ? JSON.parse(process.argv[3]) : null;
  if (process.env.DBG) await p.evaluate(() => { window.DBG = 1; }); const r = await p.evaluate(({ N, P }) => { const g = __game.jin; document.getElementById('ovCover').hidden = true; window.tone = () => {}; if (P) Object.assign(g.J13, P);
    const MUL = [0, 1, 1.8, 3.2, 5.5, 7.5, 10];
    const pow = u => (1 + (g.JCOST[u.ch] || 1) * 0.35) * MUL[u.star];
    function prep() { const J = __game.jin.J; J.guestPick = null; J.sealPick = null; J.askOpen = null; if (J.bagOpen && window.__jBagPick) { window.__bagN = (window.__bagN || 0) + 1; window.__jBagPick(J.lan <= 5 ? ['life', 'copy', 'root', 'lv', 'buff', 'coin'] : ['copy', 'root', 'lv', 'buff', 'coin', 'bind', 'roll', 'life']); }
      for (let loop = 0; loop < 30; loop++) { const c0 = J.coin; const own = {}; for (const u of [...Object.values(J.board), ...J.bench.filter(Boolean)]) own[u.ch] = (own[u.ch] || 0) + 1;
        const benchFree = J.bench.some(x => !x);
        let i = J.shop.findIndex(c => c != null && own[c] && J.coin >= g.JCOST[c] && (benchFree || J.bench.some(u => u && u.ch === c && u.star === 1) || Object.values(J.board).some(u => u.ch === c && u.star === 1)));
        if (i < 0 && benchFree) { let best = -1, bc = 0; J.shop.forEach((c, k) => { if (c != null && J.coin >= g.JCOST[c] && g.JCOST[c] > bc && (J.coin - g.JCOST[c] >= 2 || loop > 3)) { bc = g.JCOST[c]; best = k; } }); i = best; }
        if (i >= 0) g.jBuy(i); else if (J.lv < g.jLvMax() && J.coin >= (J.lv >= 10 ? 8 : J.lv >= 8 ? 6 : 4) && Object.keys(J.board).length + J.bench.filter(Boolean).length >= g.jCap()) g.jXp(); else if (J.coin >= 3) g.jRoll(false); else break;
        if (J.coin === c0) break; }
      // 배치: 힘 센 순으로 cap명, 막는·베는은 앞(c=2), 쏘는은 뒤
      const all = [...Object.values(J.board), ...J.bench.filter(Boolean)].sort((a, b) => pow(b) - pow(a)); const cap = g.jCap(), on = all.slice(0, cap), off = all.slice(cap);
      J.board = {}; const front = [], back = []; for (const u of on) ((g.JROLE[u.ch] || 'ranged') === 'ranged' ? back : front).push(u);
      const slots = []; for (const c of [2, 1, 0]) for (const r of [2, 1, 3, 0, 4]) slots.push(c + ',' + r); const used = new Set();
      const put = (u, cols) => { for (const s of slots) if (!used.has(s) && cols.includes(+s[0])) { used.add(s); J.board[s] = u; return true; } return false; };
      for (const u of front) put(u, [2, 1, 0]) || put(u, [0, 1, 2]); for (const u of back) put(u, [0, 1]) || put(u, [2]);
      J.bench = Array(6).fill(null); off.sort((a, b) => pow(b) - pow(a)).forEach((u, k) => { if (k < 6) J.bench[k] = u; else g.jSell(u); }); }
    function playStage() {  let bossLost = 0, bossN = 0;
      for (let guard = 0; guard < 30; guard++) { const J = __game.jin.J; if (J.phase === 'over') break; prep(); const isBoss = J.night === g.JCHAP.bossR; g.jStart(); J.sortie = null; let s = 0; while (__game.jin.J.phase === 'fight' && s++ < 2500) { __game.jin.J.sortie = null; g.jUpd(1 / 20); }
        if (window.__dbg) window.__dbg.push([J.chap, J.night, isBoss, __game.jin.J.win, __game.jin.J.lan, Object.keys(J.board).length, J.coin, J.lv, (J.foe||[]).length, Math.round((J.foe||[]).reduce((a,f)=>a+f.hp,0)), Math.round(__game.jin.J.ft)]); if (isBoss) { bossN++; if (!__game.jin.J.win) bossLost++; } if (__game.jin.J.phase === 'result') g.jNext(); }
      return { clear: !!__game.jin.J.clear, bossLost, bossN, lan: __game.jin.J.lan }; }
    const out = { fresh: [], cont: [] }; if (window.DBG) { window.__dbg = []; for (const k of [1, 5]) { g.jNewChap(k); playStage(); } return window.__dbg; }
    for (let k = 1; k <= 15; k++) { let w = 0, bl = 0, bn = 0; for (let n = 0; n < N; n++) { g.jNewChap(k); const res = playStage(); if (res.clear) w++; bl += res.bossLost; bn += res.bossN; } out.fresh.push([k, Math.round(w / N * 100), bn ? Math.round(bl / bn * 100) : 0]); }
    // 이어가기: 1부터 연속, 각 Stage 도달 판에서 깬 비율
    const reach = Array(16).fill(0), win = Array(16).fill(0); for (let n = 0; n < N; n++) { g.jNewChap(1); for (let k = 1; k <= 15; k++) { reach[k]++; const res = playStage(); if (!res.clear) break; win[k]++; if (k < 15) g.jContinue(); } }
    for (let k = 1; k <= 15; k++) out.cont.push([k, reach[k], reach[k] ? Math.round(win[k] / reach[k] * 100) : 0]); out.bags = window.__bagN || 0; return out; }, { N, P });
  if (process.env.DBG) { console.log(r.map(x => x.join(' ')).join('\n')); await b.close(); return; } console.log('Stage | 새로 시작 깸% | 보스 패배% || 이어가기 도달 | 깸%'); for (let i = 0; i < 15; i++) console.log((i + 1) + ' | ' + r.fresh[i][1] + ' | ' + r.fresh[i][2] + ' || ' + r.cont[i][1] + ' | ' + r.cont[i][2]);
  console.log('bags opened', r.bags); console.log('errors', errs.slice(0, 3)); await b.close(); })();
