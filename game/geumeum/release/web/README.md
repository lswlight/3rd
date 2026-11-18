# 게임 페이지(소개·개인정보처리방침) 올리기

서버를 새로 살 필요는 없습니다. graftkorea.com 은 Cloudflare Workers(무료, 하루 10만 요청)로 돌아가고,
게임 페이지는 글만 있는 페이지라 같은 Cloudflare 계정에서 무료로 함께 올릴 수 있습니다.
게임 자체는 서버를 쓰지 않습니다(기록은 휴대폰에 저장, 결제는 구글이 처리).

## 방법 A (권장) — 게임용 Worker 를 따로 하나 더 만들기: `worker_game.js`
자동가계부 서버(moneybook-sync)를 전혀 건드리지 않으므로 가족 공유 기능이 망가질 걱정이 없습니다.

1. Cloudflare 대시보드 → Workers & Pages → Create → Worker → 이름 `geumeum-site` → Deploy
2. Edit code → 기본 코드를 지우고 `worker_game.js` 를 통째로 붙여 넣기 → Deploy (데이터베이스 연결 필요 없음)
3. Settings → Domains & Routes → Add → Custom domain → `game.graftkorea.com`
4. 주소 확인
   - 게임 소개·환불 안내: https://game.graftkorea.com  (환불: `/#refund`)
   - 개인정보처리방침: https://game.graftkorea.com/privacy  (데이터 삭제: `/privacy#delete`)

## 방법 B — 기존 회사 서버에 합치기: `worker.js`
주소가 graftkorea.com/geumeum, graftkorea.com/geumeum/privacy 로 깔끔해지지만,
기존 moneybook-sync 코드를 통째로 바꿔야 합니다. 이 파일은 저장소에 있는 코드(2026년 11월 기준)에 게임 페이지를 더한 것이라,
그 뒤에 대시보드에서 직접 고친 내용이 있으면 사라질 수 있습니다. 붙여 넣기 전에 지금 코드를 꼭 따로 저장해 두세요.

출시일이 정해지면 파일 안 `GAME_POLICY_DATE` 를 고칩니다.
