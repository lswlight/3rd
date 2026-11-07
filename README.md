# 네이버 블로그 글 작성 스킬

키워드나 종목명만 말하면 네이버 블로그에 **복사해서 바로 붙여넣을 수 있는 글**을 써 주는 Claude 스킬입니다.

```
skills/naver-blog-writer/
├── SKILL.md                      # 스킬 본체 (작업 순서, 출력 형식)
├── scripts/market_data.py        # 시세 수집 + 볼린저 밴드·RSI·이동평균 계산 (표준 라이브러리만 사용)
└── references/
    ├── naver-seo.md              # 네이버 검색 노출 규칙, 저품질 회피
    ├── bollinger-guide.md        # 볼린저 밴드 해석 표현
    └── post-templates.md         # 키워드 글 / 시황 글 구조
dist/naver-blog-writer.zip        # claude.ai 업로드용 패키지
```

## 두 가지 모드

| 모드 | 이렇게 말하면 | 결과 |
|---|---|---|
| A. 키워드 글 | "겨울철 타이어 공기압 관리 키워드로 블로그 글 써줘" | SEO 맞춤 정보성 글 |
| B. 시황 글 | "오늘 비트코인 볼린저 밴드로 시황 글 써줘", "엔비디아 차트 분석 포스팅" | 시세 + 볼린저 밴드 해석 + 테마·글로벌 이슈 + 조건부 시나리오 |

출력: 제목 후보 3개, 본문(코드 블록 하나, 바로 복사), 태그 10개 안팎, 발행 전 체크리스트.
본문에는 `【 소제목 】`, `[이미지: …]`, `▶ 강조` 표시가 들어갑니다. 붙여넣은 뒤 소제목 서식과 이미지만 넣으면 됩니다.

## 왜 자동 발행이 아닌가요?

네이버 블로그 글쓰기 API는 2020년에 종료됐습니다. 자동 발행을 하려면 브라우저 자동화를 써야 하는데,
네이버의 어뷰징 감지에 걸리면 블로그가 저품질 판정을 받거나 계정이 제재될 수 있습니다. 그래서 글 생성까지만 자동으로 하고 발행은 직접 합니다.

## 시세 데이터

`market_data.py` 가 가져오는 곳:
- 코인: 업비트 공개 API (`KRW-BTC`, `KRW-ETH` …), 키 필요 없음
- 주식: Yahoo Finance (`005930.KS`, `035720.KQ`, `NVDA` …), 키 필요 없음
- 직접 준비한 데이터: `--csv prices.csv` (`date,open,high,low,close,volume`)

```bash
python3 skills/naver-blog-writer/scripts/market_data.py KRW-BTC
python3 skills/naver-blog-writer/scripts/market_data.py 005930.KS --json
```

claude.ai에서 `NETWORK_BLOCKED` 가 나오면 Settings → Capabilities 의 코드 실행 네트워크 설정에서
`api.upbit.com`, `query1.finance.yahoo.com` 을 허용합니다. 허용하지 않으면 연결된 CoinGecko나 미국 주식 커넥터의 데이터로 대신 계산합니다.

## 설치

- **claude.ai (웹·모바일)**: `./build.sh` 로 만든 `dist/naver-blog-writer.zip` 을 Settings → Capabilities → Skills 에 업로드합니다.
- **Claude Code**: 이 저장소를 열면 `.claude/skills/naver-blog-writer` 가 자동으로 잡힙니다.
