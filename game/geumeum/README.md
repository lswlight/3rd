# 그믐: 달을 훔친 자

한국 설화를 바탕으로 한 가로 슈팅 게임(안드로이드 출시 준비 중). 회사: GRAFT (graftkorea.com)

## 폴더
| 경로 | 내용 |
|---|---|
| `dokkaebi-shooter.html` | 게임 본체(개발판, 모든 층·캐릭터가 열린 `TEST_UNLOCK = true`) |
| `assets/` | 게임이 실제로 쓰는 그림·영상·글꼴(SIL OFL)·장비 아이콘 |
| `build_release.py`, `app_css.txt` | 출시판 만들기: `python3 build_release.py` → `release/www/` (잠금 켜짐, 앱용 화면) |
| `release/` | 앱 설정(capacitor.config.json, MainActivity.java), 출시 가이드·체크리스트, 개인정보처리방침·환불 안내·스토어 소개글·등급 설문 참고 |
| `release/web/` | 게임 소개·개인정보처리방침 페이지(Cloudflare Worker `geumeum-site`, https://game.graftkorea.com) |
| `store/out/` | 스토어 아이콘·대표 이미지·스크린샷 |

## 앱 정보
- 앱 이름: 그믐: 달을 훔친 자 / 앱 ID: `com.graftkorea.geumeum` (검토용 APK는 `com.graftkorea.geumeum.test`)
- Capacitor 8, Android 16(API 36) 대상
- 인앱 상품 ID: `moon_60`, `moon_330`, `moon_700`, `moon_1500`, `starter_pack` (`release/docs/인앱결제_설정.md`)
- 출시 순서: `release/출시_체크리스트.md`
