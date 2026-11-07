// 블로그용 요약 카드 PNG 생성 (1080x1080). Playwright만 사용.
// 사용: node make_card.js card.json 출력폴더
// card.json 예:
// {"date":"2026.11.07","category":"연예뉴스","headline":"도상우 ♥ 박지혜\n내년 2월 결혼","sub":"소속사 공식 발표",
//  "points":["11월 6일 소속사 공식 발표","2027년 2월 비공개 예식","상대는 모델 박지혜"],
//  "footer":"오늘의 연예뉴스","theme":"rose"}
// 결과: cover.png(대표 이미지), summary.png(핵심 요약)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const THEMES = {
  rose:   { bg1: '#2b1220', bg2: '#5a1f3d', accent: '#ff7aa8', text: '#fff6f9', sub: '#f3c6d6', card: '#fff6f9', ink: '#2b1220' },
  navy:   { bg1: '#0d1b2a', bg2: '#1b3a5c', accent: '#5fd3ff', text: '#f2f8ff', sub: '#b9d4ee', card: '#f2f8ff', ink: '#0d1b2a' },
  mint:   { bg1: '#0f2a26', bg2: '#1d4d45', accent: '#6ff0c8', text: '#f0fffa', sub: '#b8e6d9', card: '#f0fffa', ink: '#0f2a26' },
  sunset: { bg1: '#2a160d', bg2: '#6b2f12', accent: '#ffb35c', text: '#fff8f0', sub: '#f5d2b0', card: '#fff8f0', ink: '#2a160d' },
};

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (s) => esc(s).replace(/\n/g, '<br>');

function base(t, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1080px;font-family:"Noto Sans CJK KR","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic","WenQuanYi Zen Hei",sans-serif;
    background:linear-gradient(150deg,${t.bg1} 0%,${t.bg2} 100%);color:${t.text};overflow:hidden;position:relative;word-break:keep-all}
  .deco{position:absolute;border-radius:50%;background:${t.accent};opacity:.13}
  .top{position:absolute;top:72px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;font-size:30px;letter-spacing:1px}
  .badge{background:${t.accent};color:${t.ink};padding:10px 26px;border-radius:999px;font-weight:700}
  .date{color:${t.sub}}
  .foot{position:absolute;bottom:64px;left:80px;right:80px;display:flex;justify-content:space-between;font-size:26px;color:${t.sub}}
  .bar{width:90px;height:8px;background:${t.accent};border-radius:4px;margin-bottom:40px}
  </style></head><body>
  <div class="deco" style="width:520px;height:520px;right:-160px;top:-140px"></div>
  <div class="deco" style="width:300px;height:300px;left:-110px;bottom:-90px"></div>
  ${body}</body></html>`;
}

function cover(c, t) {
  return base(t, `
  <div class="top"><span class="badge">${esc(c.category || '연예뉴스')}</span><span class="date">${esc(c.date)}</span></div>
  <div style="position:absolute;left:80px;right:80px;top:300px">
    <div class="bar"></div>
    <div style="font-size:${c.headline && c.headline.length > 22 ? 80 : 96}px;font-weight:800;line-height:1.22">${br(c.headline)}</div>
    <div style="margin-top:44px;font-size:40px;color:${t.sub};line-height:1.4">${br(c.sub)}</div>
  </div>
  <div class="foot"><span>${esc(c.footer || '')}</span><span>요약 카드</span></div>`);
}

function summary(c, t) {
  const pts = (c.points || []).slice(0, 4).map((p, i) => `
    <div style="display:flex;gap:28px;align-items:flex-start;margin-bottom:34px">
      <div style="flex:none;width:64px;height:64px;border-radius:50%;background:${t.accent};color:${t.ink};font-size:34px;font-weight:800;display:flex;align-items:center;justify-content:center">${i + 1}</div>
      <div style="font-size:42px;line-height:1.4;padding-top:6px;color:${t.ink};font-weight:600">${br(p)}</div>
    </div>`).join('');
  return base(t, `
  <div class="top"><span class="badge">핵심 요약</span><span class="date">${esc(c.date)}</span></div>
  <div style="position:absolute;left:80px;right:80px;top:180px;font-size:50px;font-weight:800;line-height:1.3">${br((c.headline || '').replace(/\n/g, ' '))}</div>
  <div style="position:absolute;left:64px;right:64px;top:330px;max-height:600px;background:${t.card};border-radius:36px;padding:64px 56px">${pts}</div>
  <div class="foot"><span>${esc(c.footer || '')}</span><span>${esc(c.source || '')}</span></div>`);
}

(async () => {
  const [, , input, outDir = '.'] = process.argv;
  if (!input) { console.error('사용: node make_card.js card.json 출력폴더'); process.exit(1); }
  const c = JSON.parse(fs.readFileSync(input, 'utf8'));
  const t = THEMES[c.theme] || THEMES.rose;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  for (const [name, html] of [['cover.png', cover(c, t)], ['summary.png', summary(c, t)]]) {
    await page.setContent(html, { waitUntil: 'load' });
    const out = path.join(outDir, name);
    await page.screenshot({ path: out });
    console.log(out);
  }
  await browser.close();
})();
