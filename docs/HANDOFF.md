# Handoff — 로그라이크 맵 생성기 (Roguelike Map Creator)

## 현재 상태: 완성·검증·푸시 완료

웹 기반 절차적 던전/맵 생성기. Vanilla JS + HTML5 Canvas, 빌드 무필요. 시드 재현 핵심.

- **저장소(private)**: https://github.com/MymiK98/roguelike_map_creator (branch `master`, origin 동기화)
- **로컬**: `/Users/kim_youngmin/Documents/roguelike_map_creator`
- **작업 트리 깨끗** — 미커밋/미푸시 없음. 서버 종료됨.

## 어디까지 했나

v1→v2→v3 3단계 확장 전부 완료. 상세는 중복 작성 안 함 — 아래 참조:
- 기능/구조/알고리즘 표: `README.md`
- v3 설계·검증·위험: 플랜 `/Users/kim_youngmin/.claude/plans/polymorphic-questing-hejlsberg.md`
- 변경 이력: `git log` (커밋 3개)
  - `1217fde` feat: 초기(9종 알고리즘, 시드 재현)
  - `d6c26e7` docs: README 배지 + 스크린샷
  - `305dfa9` fix: 코드리뷰 11건(검증/예외처리)

## 핵심 아키텍처 (재진입용 요약)

- **유일 난수원** `js/rng.js` `makeRNG(seed)`. `Math.random` 생성경로 금지. 파생시드 `seed+":ns"`로 격리(엔티티/다층/WFC재시도).
- **DOM 비의존 코어** `js/buildmap.js` `buildMap(config)->{grid,entities,meta}`, `js/dungeon.js` `buildDungeon`(다층). → Node 단독 테스트 가능.
- **알고리즘 등록부** `js/registry.js` `ALGORITHMS[{id,name,desc,docRef,generate,steps?,animatable?,sampleEditor?,params}]`. params 스키마 → UI 자동생성.
- **앱** `js/app.js` — 슬롯 기반 `state{slots:[cfgA,cfgB],active,compare}`. 공유코드 v3 `{v:3,c,slots:[{a,s,w,h,p,e,f}]}`, 구버전 하위호환.
- 알고리즘 9종: `js/algorithms/` (bsp/cellular/drunkard/tunneling/maze/graph/hybrid/wfc/wfc-overlap), 공용 `js/lib/`(bsp-core/delaunay/astar/wfc-tileset).

## 검증 완료 (재실행 방법)

1. **Node 순수검증** (DOM 모듈 import 금지): 임시 `_verify.mjs` 작성 → `buildMap` 9종 재현(같은시드=동일 해시)·단일연결(영역1)·엔티티 결정론 확인 후 삭제. 패턴은 git 히스토리/대화 참조.
2. **실브라우저** (playwright 미설치 → Chrome 헤드리스):
   ```
   python3 -m http.server 8000   # 프로젝트 루트
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
     --disable-gpu --user-data-dir=$(mktemp -d) --window-size=1400,1000 \
     --virtual-time-budget=6000 --screenshot=/tmp/x.png "http://localhost:8000/#code=<CODE>"
   ```
   `#code=` 공유코드로 디코드→생성→렌더 전 파이프라인 자동 실행됨. 공유코드는 `js/registry.js`의 `defaultParams`로 cfg 만들어 base64url(JSON) 인코딩(app.js `b64encode`와 동일: `+→- /→_ =제거`).
   - 검증한 화면: 시작(9카드)·BSP맵·비교모드(듀얼)·Overlapping WFC. 전부 정상.

## 다음에 할 수 있는 일 (미착수)

플랜 외 후보 — 우선순위 사용자 확인 필요:
- 브라우저 UI 전체 스크린샷을 `assets/`에 추가(README는 현재 맵 출력 PNG만). 헤드리스로 캡처 가능(위 명령).
- 플랜 `B4` A* 복도는 구현됨. 미구현 잔여: Web Worker 벤치(블로킹 회피), 비교뷰 전체(양슬롯) 직렬화.
- 코드리뷰 저위험 미수정분: `connectRegions`가 region `cells[0]`(스캔순) 대표점 기준 → 긴 복도 가능(연결성은 정상). 최근접셀 기반 개선 여지.

## 주의/함정

- ES module이라 `file://` 직접 열기 불가(CORS) — 반드시 정적 서버.
- 재현성: 신규 난수 소비처는 반드시 파생시드. 기존 알고리즘 rng 호출순서 바꾸면 구 맵 깨짐.
- 백그라운드 `python3 -m http.server`는 작업 종료 시 `pkill -f "http.server 8000"`.
- 헤드리스 Chrome 2연속 실행 시 두번째가 첫 종료 전 안 끝나면 파일 누락 — 분리 실행 권장.

## 사용자 선호 (메모리 저장됨)

- **플랜 승인 전 코드 대조 검증 필수**: ExitPlanMode를 "플랜을 검증해줘"로 한 번 반려함. 코드와 API 가정 대조 후 "검증 결과" 섹션 추가해 재제출할 것. (메모리: `validate-plan-before-approve`)
- **CAVEMAN 모드 활성**(full): 응답 간결, 관사/군더더기 제거. 단 코드/커밋/보안은 정상 문장.
- 커밋 트레일러: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Suggested skills

- `verify` / `run` — 변경 후 실브라우저 동작 확인(위 Chrome 헤드리스 방식).
- `code-review` — 추가 기능 작성 시 검증/예외처리(이번에 9종+앱 리뷰함).
- `caveman` — 사용자 활성 모드 유지.
- `frontend-design` — UI 개선/스크린샷 작업 시.
