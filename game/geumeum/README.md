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

## 장비·옷·외형 (기획 4번)
- 장비 칸 넷: 무기 `w` · 부적 `t` · 장신구 `a` · 옷 `o`. 옷은 이동 빠르기와 기 모으기 시간을 줄여 준다.
- 옷 o0~o5: 길 떠나는 옷(기본) · 장터 무명 갑옷(골드 4,000) · 설산 털가죽(5층 아케이드 처음 성공) · 붉은 무희 궁수복(5층 대장 처치, 「새 옷!」 창) · 용궁 비늘 갑옷(달조각 380 또는 어려움 7층 대장) · 그믐밤 무희복(어려움 10층 대장 또는 무한의 탑 20층)
- 겉모습은 `look(ch)` 하나로 정한다. `LOOKS[ch][옷 id]` 에 그림이 있으면 그 그림, 없으면 기본옷(o0) 그림. 저장: `SAVE.eqd[ch].o`(입은 옷), `SAVE.look[ch]`(고른 외형)
- 달래 그림: 기본옷 `hp1_o0`·`hc1_o0`·`cutvh1_o0`, 붉은 무희 궁수복 `hp1`·`hc1y`·`cutvh1y`(등 뒤 구도). 스토어·표지는 기본옷만 쓴다.
