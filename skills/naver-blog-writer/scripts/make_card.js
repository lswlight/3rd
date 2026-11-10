// 블로그용 카드 PNG 생성 (1080x1080). Playwright만 사용. 디자인: 종이 질감 크림 바탕 + 테마 포인트 색
// 사용: node make_card.js card.json 출력폴더
// 결과: cover.png(표지), summary.png(핵심 요약), compare 가 있으면 compare.png(비교 막대)
//
// card.json 예:
// {
//   "date": "2026.11.10",                       // 날짜
//   "basis": "2026.11.10 한터차트 집계 기준",     // 위쪽 정보 줄 오른쪽(없으면 date)
//   "category": "연예뉴스",                       // 위쪽 정보 줄 왼쪽 "이라도시 · 오늘의 연예뉴스"
//   "kicker": "걸그룹 앨범 기록",                  // 표지 제목 위 작은 글(없으면 category)
//   "headline": "리센느\n초동 60만 장",            // 표지 큰 제목(최대 2줄), 강조할 말은 [[ ]] 로 감싸기: "초동 [[60만]] 장"
//   "sub": "미니 4집 '펄스' · 데뷔 첫 하프 밀리언셀러", // 표지 검은 띠 한 줄
//   "stats": [["60만 2,688","초동(11.3~11.9)"],["5배+","전작 초동 대비"],["1위","멜론·벅스·지니"],["4관왕","2026 KGMA"]], // 최대 4개
//   "art": "disc",                                // 표지 그림: disc(음반) | heart(결혼·열애) | film(드라마·영화) | trophy(시상식·예능) | none
//   "art_label": "PULSE",                          // disc 가운데 글자 등(선택)
//   "summary_title": "리센느 초동\n[[4줄]] 정리",   // 요약 카드 제목(없으면 headline 첫 줄 + 핵심 요약)
//   "points": ["...","...","...","..."],           // 요약 4줄(각 30자 안팎)
//   "next": ["다음 체크","컴백 2주 차 음악방송 활동 이어가요"], // 요약 아래 띠(선택)
//   "compare": {                                   // 선택: 비교 막대 카드
//     "title": "전작보다 [[5배]] 넘게\n늘었어요",
//     "rows": [["미니 3집 '립밤'","10만여 장",17,"전작 초동"],["미니 4집 '펄스'","60만 2,688장",100,"2026.11.3~11.9"]],  // [이름, 값 글자, 막대 %, 오른쪽 작은 글]
//     "notes": [["속도","발매 첫날 이미 전작 초동 기록을 넘었어요"]]
//   },
//   "theme": "rose"                                // rose(결혼·열애·걸그룹) | mint(컴백·음원) | navy(드라마·영화) | sunset(예능·시상식·생활정보)
// }
// 규칙: 모든 카드 왼쪽 아래는 BRAND 고정, 오른쪽 아래는 비워 둔다. 기준일·출처는 위쪽 정보 줄에 넣는다.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const BRAND = '이라도시| 아빠의 제태크생활';

const THEMES = {
  rose:   { t: '#C8456E', tSoft: '#FBE1EA', sand: '#F3DDE3', wave: '#EFCFDA', ink: '#2B1B24', sub: '#8C7380', line: '#EBD9DF', bg: '#FBF4EE', pill: '#FF9DBA' },
  mint:   { t: '#1F9A86', tSoft: '#DDF3EE', sand: '#DCEFE8', wave: '#C9E8DE', ink: '#1C2B28', sub: '#6E837E', line: '#D5E6E0', bg: '#F7F6EF', pill: '#7FE0CB' },
  navy:   { t: '#3A5BA0', tSoft: '#E1E8F6', sand: '#E1E6F0', wave: '#D2DBEC', ink: '#1C2333', sub: '#727C90', line: '#DCE2EC', bg: '#F8F6F0', pill: '#9DB8F2' },
  sunset: { t: '#D9652B', tSoft: '#FBE3D2', sand: '#F3E3CC', wave: '#EFD6B8', ink: '#2E2118', sub: '#8A7462', line: '#E8D8C3', bg: '#FBF5EA', pill: '#FFB27D' },
};

// 글꼴: Pretendard(본문·숫자), 나눔명조 ExtraBold(표지 제목). 없으면 내려받아 ~/.fonts 에 넣는다(실패해도 기본 글꼴로 계속).
function ensureFonts() {
  let list = '';
  try { list = execSync('fc-list', { encoding: 'utf8' }); } catch (e) { return; }
  const dir = path.join(os.homedir(), '.fonts');
  const need = [];
  if (!/Pretendard/i.test(list)) ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'].forEach((w) =>
    need.push([`Pretendard-${w}.otf`, `https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-${w}.otf`]));
  if (!/NanumMyeongjo/i.test(list)) need.push(['NanumMyeongjo-ExtraBold.ttf', 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanummyeongjo/NanumMyeongjo-ExtraBold.ttf']);
  if (!need.length) return;
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, u] of need) {
    try { execSync(`curl -sSLf -m 60 -o "${path.join(dir, f)}" "${u}"`); } catch (e) { console.error('글꼴 내려받기 실패:', f); }
  }
  try { execSync('fc-cache -f', { stdio: 'ignore' }); } catch (e) { /* 무시 */ }
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// [[강조]] → <em>, \n → <br>
const rich = (s) => esc(s).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>').replace(/\n/g, '<br>');

const ICONS = {
  disc: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5"/>',
  up: '<path d="M4 17l6-6 4 4 6-8"/><path d="M15 7h5v5"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  heart: '<path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
};
const STAT_ICONS = ['disc', 'up', 'crown', 'trophy'];
const ic = (n, s, c, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ICONS.star}</svg>`;

function art(kind, label, T) {
  const s = 300;
  if (kind === 'disc') return `<div style="width:${s}px;height:${s}px;border-radius:50%;position:relative;
    background:radial-gradient(circle at 50% 50%,${T.bg} 0 ${s * 0.07}px,#D9C3CB ${s * 0.07}px ${s * 0.09}px,#2B1B24 ${s * 0.09}px ${s * 0.2}px,#3A2531 ${s * 0.2}px),repeating-radial-gradient(circle,#3A2531 0 3px,#2F1E28 3px 6px);box-shadow:-20px 30px 60px rgba(60,30,40,.35)">
    <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 200deg,rgba(255,255,255,0) 0deg,rgba(255,255,255,.22) 40deg,rgba(255,255,255,0) 90deg,rgba(255,255,255,0) 200deg,rgba(255,255,255,.15) 240deg,rgba(255,255,255,0) 290deg)"></div>
    <div style="position:absolute;left:50%;top:50%;width:${s * 0.36}px;height:${s * 0.36}px;transform:translate(-50%,-50%);border-radius:50%;background:${T.t};display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-weight:900;font-size:${s * 0.07}px;line-height:1.1;padding:6px">${esc(label || '')}</div></div>`;
  const icon = { heart: 'heart', film: 'film', trophy: 'trophy' }[kind];
  if (!icon) return '';
  return `<div style="width:${s}px;height:${s}px;border-radius:44px;background:linear-gradient(150deg,${T.t},${T.pill});transform:rotate(8deg);display:flex;align-items:center;justify-content:center;box-shadow:-20px 30px 60px rgba(60,30,20,.28)">
    <div style="transform:rotate(-8deg);text-align:center;color:#fff">${ic(icon, 150, '#fff', 1.6)}<div style="font-weight:900;font-size:30px;margin-top:8px">${esc(label || '')}</div></div></div>`;
}

function page(T, c, inner) {
  const noise = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45 0 0 0 0 .33 0 0 0 0 .25 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1080px;background:${T.bg} ${noise};color:${T.ink};position:relative;overflow:hidden;word-break:keep-all;
    font-family:"Pretendard","Noto Sans CJK KR","WenQuanYi Zen Hei",sans-serif;font-weight:500;letter-spacing:-0.6px}
  .meta{position:absolute;left:64px;right:64px;top:44px;display:flex;justify-content:space-between;align-items:center;font-size:22px;font-weight:700;color:${T.sub}}
  .logo{display:flex;align-items:center;gap:10px;color:${T.ink}}
  .logo i{display:inline-flex;width:30px;height:30px;border-radius:50%;background:${T.t};color:#fff;font-style:normal;font-size:16px;font-weight:900;align-items:center;justify-content:center}
  .datep{display:flex;align-items:center;gap:8px;border:2px solid ${T.line};background:#fff;border-radius:999px;padding:6px 16px}
  .kick{position:absolute;left:64px;top:118px;display:inline-flex;align-items:center;gap:10px;font-size:28px;font-weight:800;color:${T.t}}
  .kick b{background:${T.t};color:#fff;border-radius:10px;padding:2px 12px;font-size:24px}
  .title{position:absolute;left:64px;right:64px;top:166px;font-weight:900;font-size:76px;line-height:1.12;letter-spacing:-2.5px}
  em{font-style:normal;color:${T.t};background:linear-gradient(transparent 68%,${T.tSoft} 68%)}
  .serif em{background:none}
  .body{position:absolute;left:64px;right:64px;top:360px;bottom:160px}
  .foot{position:absolute;left:64px;bottom:40px;display:flex;align-items:center;gap:14px;font-size:22px;color:${T.sub};font-weight:700}
  .foot:before{content:"";width:28px;height:3px;background:${T.t};border-radius:2px}
  .cardp{background:#FFFDFA;border:2px solid ${T.line};border-radius:26px;box-shadow:0 10px 26px rgba(100,70,50,.07)}
  .num{font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-1.5px}
  .sub{color:${T.sub}}
  </style></head><body>
  <div class="meta"><span class="logo"><i>이</i>이라도시 · 오늘의 ${esc(c.category || '연예뉴스')}</span><span class="datep">${ic('cal', 22, T.sub)}${esc(c.basis || c.date)}</span></div>
  ${inner}
  <svg style="position:absolute;left:0;bottom:0" width="1080" height="150" viewBox="0 0 1080 150"><path d="M0 70 C180 30 300 110 520 72 C720 38 860 100 1080 58 L1080 150 L0 150Z" fill="${T.sand}" opacity=".7"/><path d="M0 105 C220 80 380 135 600 108 C800 84 930 124 1080 98 L1080 150 L0 150Z" fill="${T.wave}" opacity=".75"/></svg>
  <div class="foot">${esc(BRAND)}</div></body></html>`;
}

const pillBar = (T, label, text, dark = true) => `<div style="display:flex;align-items:center;gap:20px;background:${dark ? T.ink : '#FFFDFA'};border:${dark ? 'none' : `2px solid ${T.line}`};border-radius:999px;padding:12px 14px">
  <span style="flex:none;background:${T.t};color:#fff;font-weight:800;font-size:25px;border-radius:999px;padding:10px 24px">${esc(label)}</span>
  <span style="font-size:26px;font-weight:600;color:${dark ? '#FBEFEA' : T.ink}">${esc(text)}</span></div>`;

function cover(c, T) {
  const stats = (c.stats || []).slice(0, 4);
  const lines = String(c.headline || '').split('\n');
  const longest = Math.max(...lines.map((l) => l.replace(/\[\[|\]\]/g, '').length));
  const hasArt = c.art !== 'none';
  const boxW = hasArt ? 640 : 950;
  const fs1 = Math.min(116, Math.floor(boxW / (longest * 0.98)));
  return page(T, c, `
  <div style="position:absolute;left:64px;top:110px;font-size:30px;font-weight:800;color:${T.t};display:flex;align-items:center;gap:10px">${ic('note', 30, T.t)}${esc(c.kicker || c.category || '연예뉴스')}</div>
  <div style="position:absolute;left:64px;top:160px;height:420px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:34px">
    <div class="serif" style="width:${boxW}px;white-space:nowrap;font-family:'NanumMyeongjo','Pretendard',serif;font-weight:800;font-size:${fs1}px;line-height:1.08;letter-spacing:-3px">${rich(c.headline)}</div>
    ${c.sub ? `<div style="max-width:950px;display:inline-flex;align-items:center;background:${T.ink};color:#FBEFEA;border-radius:999px;padding:14px 30px;font-size:31px;font-weight:700">${esc(c.sub)}</div>` : ''}
  </div>
  ${hasArt ? `<div style="position:absolute;right:14px;top:175px">${art(c.art || 'disc', c.art_label, T)}</div>` : ''}
  ${stats.length ? `<div style="position:absolute;left:64px;right:64px;top:610px;display:flex;gap:18px">
  ${stats.map(([v, l, i], k) => `<div class="cardp" style="flex:1;padding:22px 8px;text-align:center"><div style="display:flex;justify-content:center">${ic(i || STAT_ICONS[k], 38, T.t)}</div>
     <div class="num" style="font-size:${String(v).length > 6 ? 34 : String(v).length > 4 ? 40 : 48}px;margin-top:6px;white-space:nowrap">${esc(v)}</div>
     <div class="sub" style="font-size:21px;font-weight:700;margin-top:2px">${esc(l)}</div></div>`).join('')}</div>` : ''}`);
}

function summary(c, T) {
  const title = c.summary_title || `${String(c.headline || '').split('\n')[0]}\n[[핵심]] 요약`;
  const pts = (c.points || []).slice(0, 4);
  return page(T, c, `
  <div class="kick"><b>✓</b>핵심 요약</div>
  <div class="title">${rich(title)}</div>
  <div class="body">
    <div class="cardp" style="position:relative;padding:18px 40px 18px 92px">
      <div style="position:absolute;left:44px;top:0;bottom:0;border-left:3px solid ${T.tSoft}"></div>
      ${pts.map((p) => `<div style="min-height:84px;display:flex;align-items:center;gap:18px;font-size:${String(p).length > 26 ? 29 : 32}px;font-weight:700;border-bottom:2px dashed ${T.line}">
        <span style="flex:none;width:40px;height:40px;border-radius:12px;background:${T.t};display:flex;align-items:center;justify-content:center">${ic('check', 26, '#fff', 3)}</span>${esc(p)}</div>`).join('')}
    </div>
    ${c.next ? `<div style="margin-top:24px">${pillBar(T, c.next[0], c.next[1])}</div>` : ''}
  </div>`);
}

function compare(c, T) {
  const k = c.compare;
  const rows = (k.rows || []).slice(0, 4);
  return page(T, c, `
  <div class="kick"><b>+</b>${esc(k.kicker || '한눈에 비교')}</div>
  <div class="title">${rich(k.title || '')}</div>
  <div class="body">
  ${rows.map(([name, val, pct, note], i) => {
    const hl = i === rows.length - 1;
    const w = Math.max(8, Math.min(100, Number(pct) || 0));
    return `<div style="margin-top:${i ? 26 : 0}px"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:30px;font-weight:800">${esc(name)}</span><span class="sub" style="font-size:22px;font-weight:700">${esc(note || '')}</span></div>
    <div style="margin-top:12px;height:76px;background:#FFFDFA;border:2px solid ${T.line};border-radius:999px;overflow:hidden;position:relative">
      <div style="height:100%;width:${w}%;border-radius:999px;background:${hl ? `linear-gradient(90deg,${T.t},${T.pill})` : T.tSoft}"></div>
      <span class="num" style="position:absolute;${w > 45 ? `right:${100 - w + 3}%;color:${hl ? '#fff' : T.ink}` : `left:${w + 3}%;color:${T.ink}`};top:50%;transform:translateY(-50%);font-size:40px">${esc(val)}</span></div></div>`;
  }).join('')}
  <div style="margin-top:34px;display:flex;flex-direction:column;gap:14px">${(k.notes || []).slice(0, 2).map(([a, b], i) => pillBar(T, a, b, i === 0)).join('')}</div>
  </div>`);
}

(async () => {
  const [, , input, outDir = '.'] = process.argv;
  if (!input) { console.error('사용: node make_card.js card.json 출력폴더'); process.exit(1); }
  const c = JSON.parse(fs.readFileSync(input, 'utf8'));
  const T = THEMES[c.theme] || THEMES.rose;
  ensureFonts();
  fs.mkdirSync(outDir, { recursive: true });
  const jobs = [['cover.png', cover(c, T)], ['summary.png', summary(c, T)]];
  if (c.compare && (c.compare.rows || []).length) jobs.push(['compare.png', compare(c, T)]);
  const browser = await chromium.launch();
  const page_ = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  for (const [name, html] of jobs) {
    await page_.setContent(html, { waitUntil: 'load' });
    await page_.evaluate(() => document.fonts.ready);
    const out = path.join(outDir, name);
    await page_.screenshot({ path: out });
    console.log(out);
  }
  await browser.close();
})();
