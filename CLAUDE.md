# CLAUDE.md

네이버 블로그 글 작성 스킬(`naver-blog-writer`)의 원본 저장소. 사용법은 README.md 참고.

## 구조

- `skills/naver-blog-writer/`: 스킬 원본. `.claude/skills/naver-blog-writer` 는 이 폴더를 가리키는 심볼릭 링크이므로 원본만 수정한다.
- `dist/naver-blog-writer.zip`: claude.ai 업로드용 패키지. 직접 수정하지 말고 `./build.sh` 로 다시 만든다.

## 작업 규칙

- 스킬 파일을 바꾸면 `./build.sh` 를 실행해 `dist/naver-blog-writer.zip` 도 함께 커밋한다.
- `scripts/market_data.py` 는 파이썬 표준 라이브러리만 쓴다. 외부 패키지를 추가하지 않는다.
- `scripts/make_card.js` 를 바꾸면 Notion 페이지 "네이버 블로그 · 오늘의 연예뉴스"의 "요약 카드 생성 스크립트" 코드 블록도 같은 내용으로 바꾼다. 매일 예약 작업이 그 코드를 쓴다.
- 네이버 자동 발행(브라우저 자동화)은 계정 제재 위험 때문에 넣지 않는다. 결과물은 복사·붙여넣기용이다.
- 시황 글은 매수·매도 권유 없이 조건부 시나리오로 쓰고 면책 문구를 넣는다.
- 문서와 스킬 결과물은 한국어로 작성한다.
