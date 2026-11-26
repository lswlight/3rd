// 달밤 진법 자동 확인: 장 여러 판 연속(밤손님·봉인 고르기 포함), 멈추면 STUCK + 오류 출력.
// 사용: python3 build_release.py && node test/jin_auto.js '' c1,c1,c2,long
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 780, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.addInitScript(() => { sessionStorage.setItem('geumeum-picked', '1'); localStorage.setItem('dokkaebi-save', JSON.stringify({ gold: 70, stars: {0:3}, tut: { all: 1, prologue: 1, r11: 3, arc13: 1, weak: 1, awake: 1, shield: 1, coRdy: 1 }, jin: { best: 0, runs: 0, tut: 1, clear: 0, got5: 0, free: { d: '', n: 0 }, use: {}, spd: 3 } })); });
  await p.goto(process.argv[2] || 'file://' + require('path').resolve(__dirname, '../release/www/index.html')); await p.waitForTimeout(1500);
  const box = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top, r.width / 640]; });
  const tap = (x, y) => p.mouse.click(box[0] + x * box[2], box[1] + y * box[2]);
  await p.evaluate(() => { document.getElementById('ovCover').hidden = true; document.getElementById('ovTitle').hidden = false; }); await p.click('#btnJin'); await p.waitForTimeout(500);
  let W2; const seq = (process.argv[3] || 'c1,c1,c1').split(',');
  for (let run = 0; run < seq.length; run++) {
    await p.evaluate(() => { const o = document.getElementById('ovTitle'); if (!o.hidden) document.getElementById('btnJin').click(); }); await p.waitForTimeout(300);
    { const k = seq[run] === 'long' ? 16 : +seq[run].slice(1); await p.evaluate(() => { const S = __game.jin.JS(); S.chap = {}; for (let i = 1; i <= 15; i++) S.chap[i] = 1; /* 시험용: 모든 Stage 열기 */ if (!document.querySelector('#ovJin .g-grid')) __game.jin.jinMenu(); }); await p.evaluate(k => { if (k === 16) document.querySelector('#ovJin [data-g="ex"]').click(); else document.querySelector('#ovJin .g-c[data-k="' + k + '"]').click(); }, k); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('#ovJin [data-g="go"]').click()); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#ovJin [data-c="start"]').click()); } await p.waitForTimeout(700); // Stage 고르기 → 출진 준비 → 싸움 시작
    let last = '', same = 0, merged = 0;
    for (let step = 0; step < 200; step++) {
      const s = await p.evaluate(() => { const J = __game.jin.J; return J ? { ph: J.phase, n: J.night, ft: +(J.ft || 0).toFixed(1), slow: +(J.slowmo || 0).toFixed(2), cut: !!J.cut, mode: __game.G.mode } : null; });
      if (!s) break; const key = JSON.stringify(s); same = key === last ? same + 1 : 0; last = key;
      if (same > 20) { console.log('STUCK', run, key, errs.slice(0,3), await p.evaluate(() => { try { __game.jin.J && 0; const J = __game.jin.J; const u = J.us.find(x => x.u.yk || !CH[x.u.ch]); return 'yk unit: ' + JSON.stringify(u && u.u).slice(0, 200); } catch (e) { return String(e); } })); await p.screenshot({ path: 'stuck.png' }); process.exitCode = 1; break; }
      if (s.ph === 'prep' && await p.evaluate(() => !!__game.jin.J.bagOpen)) { await tap(192, 174); console.log('bag opened'); await p.waitForTimeout(300); continue; }
      if (s.ph === 'prep') { if (!merged && s.n === 2) { merged = 1; await p.evaluate(() => { const J = __game.jin.J; J.bench[0] = { ch: 5, star: 1, id: 1 }; J.bench[1] = { ch: 5, star: 1, id: 2 }; __game.jin.jMerge(5); }); await p.waitForTimeout(1600); }
        await p.evaluate(() => { const J = __game.jin.J; J.lv = 8; const L = [[1, 3], [0, 3], [2, 2], [9, 2], [16, 3], [27, 1], [28, 1], [23, 1]]; J.board = {}; L.forEach(([ch, st], i) => { J.board[(i % 3) + ',' + Math.floor(i / 3)] = { ch, star: st, id: Math.random() }; }); }); if (await p.evaluate(() => !!__game.jin.J.guestPick)) { await tap(155, 168); await p.waitForTimeout(300); console.log('guest picked'); } await tap(587, 321); await p.waitForTimeout(400); }
      else if (s.ph === 'fight') await p.waitForTimeout(400);
      else if (s.ph === 'result') { await p.waitForTimeout(700); if (await p.evaluate(() => (__game.jin.J.sealPick || []).length)) { await tap(W2 = 320 - 120 + 38, 242); console.log('seal picked'); await p.waitForTimeout(300); } await tap(320, 200); await p.waitForTimeout(300); console.log('run', run, 'night', s.n, 'done'); }
      else if (s.ph === 'over') { await p.waitForTimeout(500); await tap(320, 200); await p.waitForTimeout(700); console.log('run', run, 'over'); break; }
    }
  }
  console.log('errors', errs.slice(0, 8)); await b.close(); })();
