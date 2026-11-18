// 그믐: 달을 훔친 자 — 게임 소개·개인정보처리방침 페이지 (Cloudflare Worker, 데이터베이스 없음)
// 자동가계부 서버(moneybook-sync)와 따로 둔다. 이 파일만 Worker 에 붙여 넣고 Deploy 하면 된다.
//   GET /            게임 소개 + 유료 아이템·환불 안내(#refund)
//   GET /privacy     개인정보처리방침 (데이터 삭제 안내 #delete)
const CONTACT = 'graft.korea@gmail.com';
const PAGE_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:#FBF7F0;color:#2D2A26;line-height:1.6;word-break:keep-all}
.w{max-width:640px;margin:0 auto;padding:22px 18px 48px}
a{color:#2F9E6E}
h1{font-size:28px;line-height:1.3;margin:8px 0 10px}h2{font-size:19px;margin:30px 0 10px}h3{font-size:15.5px;margin:16px 0 6px}
p,li{font-size:15px;color:#4A443C}ul,ol{padding-left:20px}li{margin:4px 0}
.sub{color:#9C9283;font-size:13px}
.card{background:#fff;border-radius:22px;padding:16px 18px;margin-top:12px}
.btn{display:block;text-align:center;background:#2F9E6E;color:#fff;text-decoration:none;padding:15px;border-radius:99px;font-weight:800;font-size:17px;margin-top:16px}
.btn2{background:#EFE7DA;color:#2D2A26}
.tag{display:inline-block;background:#DFF3E8;color:#2F9E6E;font-weight:700;font-size:12.5px;padding:4px 10px;border-radius:99px}
.feat{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.feat div{background:#fff;border-radius:18px;padding:12px 14px;font-size:13.5px;color:#6F665A}.feat b{display:block;font-size:15px;color:#2D2A26;margin-bottom:2px}
.shots{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 10px;scroll-snap-type:x mandatory}
.shots figure{flex:none;width:200px;scroll-snap-align:start}.shots img{width:100%;border-radius:18px;box-shadow:0 2px 10px rgba(0,0,0,.08);display:block}
.shots figcaption{font-size:12.5px;color:#6F665A;text-align:center;margin-top:6px}
.guide img{width:100%;border-radius:16px;margin-top:10px;display:block}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}th,td{border-bottom:1px solid #F0E9DD;padding:8px 6px;text-align:left;vertical-align:top}th{background:#F6F0E6;font-weight:700}
.foot{color:#B3A897;font-size:12px;text-align:center;margin-top:34px}.foot a{color:#9C9283}`;
function shell(title, desc, body) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#FBF7F0">
<title>${title}</title><meta name="description" content="${desc}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:type" content="website">
<style>${PAGE_CSS}</style></head><body><div class="w">${body}
<p class="foot"><a href="https://graftkorea.com">GRAFT</a> · 그믐: 달을 훔친 자 · 문의 <a href="mailto:${CONTACT}">${CONTACT}</a><br><a href="/">게임 소개</a> · <a href="/privacy">개인정보처리방침</a> · <a href="/#refund">환불 안내</a></p>
</div></body></html>`;
}

// ---------------------------------------------------------------- 게임: 그믐: 달을 훔친 자
const GAME_POLICY_DATE = '2026년 12월 1일'; // 출시일에 맞춰 고친다
function gameShell(title, desc, body) { return shell(title, desc, body); }
function _unused(title, desc, body) {
  return shell(title, desc, body).replace(/<p class="foot">[\s\S]*?<\/p>\n<\/div><\/body>/,
    `<p class="foot"><a href="/">GRAFT</a> · 그믐: 달을 훔친 자 · 문의 <a href="mailto:${CONTACT}">${CONTACT}</a><br><a href="/geumeum">게임 소개</a> · <a href="/geumeum/privacy">개인정보처리방침</a> · <a href="/geumeum#refund">환불 안내</a></p>\n</div></body>`);
}
function gamePage() {
  return gameShell('그믐: 달을 훔친 자 — 한국 설화 가로 슈팅 게임',
    '달을 훔친 도깨비 여왕의 열 층 탑! 설화 속 대장을 동료로 삼아 오르는 가로 슈팅 게임',
    `<span class="tag">안드로이드 게임</span>
<h1>그믐: 달을 훔친 자</h1>
<p>어느 날 밤, 하늘에서 달이 사라졌다. 도깨비 여왕이 달을 훔쳐 구름 위 열 층 탑 꼭대기에 숨긴 것이다. 부채 도사 한별, 활잡이 달래, 대장장이 무쇠가 구름을 타고 탑을 오른다.</p>
<div class="feat">
<div><b>한국 설화 슈팅</b>구미호, 설녀, 이무기, 두억시니… 층마다 다른 땅과 대장</div>
<div><b>대장이 동료로</b>이긴 대장을 동료로 삼아 바꿔 가며 싸우기</div>
<div><b>층마다 아케이드</b>쇠 먹기, 환영 찾기, 망치질 같은 짧은 놀이</div>
<div><b>짧게, 자주</b>한 구간 1~2분, 오늘의 임무와 무한의 탑</div>
</div>

<h2 id="refund">유료 아이템과 환불 안내</h2>
<div class="card">
<ul>
<li>게임은 무료이며, 게임 안에서 유료 아이템 <b>달조각</b>을 판매합니다. 뽑기(확률형) 상품은 없고, 모든 상품은 내용이 정해져 있습니다.</li>
<li>결제는 Google Play 결제로 처리되며, 결제와 환불은 Google Play 정책을 따릅니다.</li>
<li>구매 후 7일 안에, 쓰지 않은 달조각은 환불을 요청할 수 있습니다. (Google Play 앱 → 프로필 → 결제 및 정기 결제 → 예산 및 기록, 또는 아래 이메일)</li>
<li>이미 쓴 달조각(장비 구매·강화, 동료 영입, 이어 하기)은 환불이 제한될 수 있습니다.</li>
<li>미성년자가 법정대리인의 동의 없이 결제한 경우, 본인 또는 법정대리인이 취소를 요청할 수 있습니다.</li>
<li>게임 기록은 휴대폰에만 저장됩니다. 앱을 지우거나 기기를 바꾸면 달조각과 진행 기록이 사라질 수 있습니다.</li>
</ul>
</div>

<h2>문의</h2>
<div class="card"><p>상호: GRAFT<br>대표: SANGWOO LEE<br>이메일: <a href="mailto:${CONTACT}">${CONTACT}</a></p></div>`);
}
function gamePrivacyPage() {
  return gameShell('그믐: 달을 훔친 자 개인정보처리방침', '그믐: 달을 훔친 자 게임의 개인정보 처리 안내',
    `<h1>개인정보처리방침</h1>
<p class="sub">그믐: 달을 훔친 자 (Android 게임) · 시행일 ${GAME_POLICY_DATE}</p>
<div class="card"><p>GRAFT(이하 '운영자')는 게임 「그믐: 달을 훔친 자」(이하 '게임')를 이용하는 분의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을 지킵니다. 게임은 회원가입이 없고 개인정보를 수집하지 않습니다.</p></div>

<h2>1. 수집하는 개인정보</h2>
<p>게임은 이름, 이메일, 전화번호, 위치 정보, 기기 식별자 등 어떠한 개인정보도 수집하지 않습니다.</p>

<h2>2. 휴대폰에 저장되는 정보</h2>
<p>게임 진행 기록(골드, 달조각, 장비, 영입한 동료, 별, 강화 단계, 무한의 탑 기록, 설정)과 결제 거래 번호는 이용자의 휴대폰 안에만 저장되며 운영자나 외부 서버로 보내지 않습니다. 앱을 삭제하면 함께 지워집니다.</p>

<h2>3. 결제</h2>
<p>유료 아이템(달조각) 결제는 Google Play 결제 시스템으로 처리됩니다. 결제 수단, 구글 계정 등 결제에 필요한 정보는 Google이 Google 개인정보처리방침에 따라 처리하며, 운영자는 결제 수단 정보를 받거나 저장하지 않습니다. 같은 결제가 두 번 지급되지 않도록 구매 상품과 거래 번호만 휴대폰 안에 저장합니다.</p>

<h2>4. 제3자 제공 · 광고 · 분석</h2>
<p>운영자는 이용자의 정보를 제3자에게 제공하거나 판매하지 않습니다. 게임에는 광고와 분석 도구가 없습니다. 새로운 외부 서비스를 추가할 경우 이 방침을 먼저 고친 뒤 적용합니다.</p>

<h2 id="delete">5. 데이터 삭제</h2>
<p>운영자가 가진 이용자 데이터는 없습니다. 휴대폰에 저장된 게임 기록은 앱을 삭제하거나 휴대폰 설정 → 애플리케이션 → 그믐: 달을 훔친 자 → 저장공간 → 데이터 삭제로 지울 수 있습니다.</p>

<h2>6. 아동의 개인정보</h2>
<p>게임은 개인정보를 수집하지 않으므로 아동의 개인정보도 수집하지 않습니다.</p>

<h2>7. 개인정보 보호책임자</h2>
<div class="card"><p>상호: GRAFT<br>책임자: SANGWOO LEE (대표)<br>이메일: <a href="mailto:${CONTACT}">${CONTACT}</a></p></div>

<h2>8. 권익 침해 구제</h2>
<ul>
<li>개인정보침해신고센터: privacy.kisa.or.kr / 국번 없이 118</li>
<li>개인정보분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
</ul>

<h2>9. 방침의 변경</h2>
<p>이 방침이 바뀌면 시행 7일 전부터 이 페이지에 알립니다.</p>
<p class="sub">공고일 · 시행일: ${GAME_POLICY_DATE}</p>`);
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    const page = path === '/' ? gamePage() : path === '/privacy' ? gamePrivacyPage() : null;
    if (!page) return new Response('페이지가 없습니다.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  },
};
