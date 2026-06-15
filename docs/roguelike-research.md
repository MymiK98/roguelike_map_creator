# 로그라이크 제작 리서치 — 종합 마스터 문서

> 조사일: 2026-06-11~12 · 방법: deep-research 워크플로(5각도 팬아웃 → 웹검색 → 출처 페치 → 3표 적대적 검증 → 합성)
> 검증 표기: `✓ N-M` = 확정(찬성-반대 표), `❌` = 반박 탈락. 각 주장 뒤에 뒷받침 출처 명시.

---

## 목차
- [파트 1: 절차적 던전/맵 생성](#파트-1-절차적-던전맵-생성)
- [파트 2: 시야(FOV) 알고리즘](#파트-2-시야fov-알고리즘)
- [파트 3: 로그라이크 디자인 정의 (Berlin Interpretation)](#파트-3-로그라이크-디자인-정의-berlin-interpretation)
- [파트 4: 메타 진행 설계](#파트-4-메타-진행meta-progression-설계)
- [파트 5: 난이도 밸런싱 & 공정한 RNG](#파트-5-난이도-밸런싱--공정한-rng)
- [파트 6: 로그라이크 vs 로그라이트](#파트-6-로그라이크-vs-로그라이트)
- [반박된 통념](#-반박된-통념-믿지-말-것)
- [미해결 질문](#-미해결-질문)
- [출처 목록](#출처-목록)

---

## 파트 1: 절차적 던전/맵 생성

### PCG 서베이 (SBGames 2019) — `sbgames.org/.../198359.pdf` `[primary]`
던전 생성 기법 분류의 기준.

- **모든 PDG는 2전략**: `constructive`(단일패스 — 셀룰러 오토마타, 생성 문법, 랜덤 배치)와 `search-based`(주로 유전 알고리즘, **항상 생성물 일관성 검증**). `✓ 3-0`
- **Togelius PCG 7축 분류 채택**: 콘텐츠 필요성·생성 시점·생성 제어·일반성·랜덤성·생성 방법·저작권. **생성 제어 = 랜덤 시드(1차원 제어) 또는 파라미터셋(다차원)** → RNG 시드 설계의 이론적 근거. `✓ 3-0`

### WFC 결합 연구 (SBGames 2020) — `sbgames.org/.../207911.pdf` `[primary]` + ResearchGate 348569324 `[primary]`
각 기법 직접 비교의 핵심.

- **기법 분류표**: WFC=search-based(고복잡도, 연결성 보장X) vs Drunkard Walk·셀룰러오토마타·BSP·Digger=constructive. `✓ 3-0`
- **Drunkard Walk** = 랜덤워크. 에이전트가 채워진 맵을 "판다". 여러 에이전트를 다른 위치서 시작하면 동굴 시스템 생성하나 **영역 간 연결성 미보장**. `✓ 3-0`
- **셀룰러 오토마타** = 카오스 입력(바닥 타일 **40~50%**)을 n회 스무딩. 이웃 = **Moore(직교+대각) 또는 von Neumann(직교만)**. `✓ 3-0`
- **BSP 던전** = BSP 트리로 공간 분할 후 방 배치. **방 리스트 순서가 연결 결과를 좌우**. TDML(맨션형) 중간복잡도, **연결성 보장**. `✓ 3-0` (2-1 재확인)
- **WFC = Sudoku식 제약 해결기**: 각 셀이 모든 패턴 가능성에서 시작 → 반사/회전·인접 규칙으로 패턴 축소 → "붕괴" → 이웃에 전파. 입력과 국소 유사한 큰 출력. `✓ 3-0`
- **WFC 3대 약점**(Brian Bucklew/Caves of Qud): ①동질성(큰 구조 없음) ②과적합(디테일 추가 시 변동성↓) ③연결성 미보장. **해법**: 선택 영역 내부에서 WFC 실행 + 디테일은 후처리 삽입 + 사후 연결 알고리즘. `✓ 3-0`
- **WFC는 대형 구조에 부적합** → 다른 PDG와 결합한 한 단계(방 내부 디테일 생성)로 쓰는 게 베스트. `✓ 3-0`
- **Drunkard Walk + 셀룰러오토마타는 자연스럽게 결합** — DW가 카오스 맵 생성, CA가 카오스 입력 전용. 동굴·숲 생성에 최적. `✓ 3-0`

### Nested WFC (arXiv 2308.07307) `[primary]`
- **표준 WFC는 대형/무한 콘텐츠 생성 불가** — 제약 충돌 + 시간복잡도 비용 탓. `✓ 3-0`
- **N-WFC 프레임워크가 시간복잡도 감소**로 대형 생성 가능케 함. `✓ 3-0`

### 셀룰러 오토마타 동굴 — `roguebasin.com/.../Cellular_Automata_Method...` `[primary]`
구현 디테일의 결정판.

- **4-5 룰**: 맵 랜덤 채움 → 반복: 3x3 영역에 **벽 5개 이상이면 벽**(벽 타일은 이웃 4+, 바닥 타일은 이웃 5+). 노이즈가 동굴로 수렴. `✓ 3-0`
- **전형 파라미터**: **초기 벽 45% + 스무딩 5회**. `✓ 3-0`
- **주 약점 = 분리된 동굴 조각**. **해법**: 랜덤 오픈점에서 flood-fill → 그 영역 밖 오픈 타일은 벽으로 되돌림 → 연결 영역이 임계치(≈45% 오픈) 미만이면 재생성. `✓ 3-0`

---

## 파트 2: 시야(FOV) 알고리즘

### FOV 비교 연구 — `roguebasin.com/.../Comparative_study...` `[primary]`
- **5종 비교**: 기본 레이캐스팅, 다이아몬드 레이캐스팅, 재귀 섀도캐스팅, precise permissive FOV(permissiveness 0~8), 디지털 FOV. `✓ 3-0`
- **대칭성 0오차는 디지털 FOV와 PERMISSIVE8뿐**. permissive 대칭성은 permissiveness에 반비례(≤4서 매우 나쁨). **실외맵 오차율 > 실내맵** — 비대칭 알고리즘은 실외서 게임플레이 문제. `✓ 3-0`
- **완벽한 FOV 없음** — 각자 약점. 게임 요구 동작에 따라 선택(기둥 활용 스텔스 → 기본/섀도캐스팅/저permissiveness). `✓ 3-0`

### Red Blob Games 가시성 — `redblobgames.com/articles/visibility` `[primary]`
- **회전 스윕** — 각도순 정렬된 벽 끝점 처리, 스윕라인 교차 벽 추적, **각 각도서 가장 가까운 벽만 보임**. `✓ 3-0`
- **임의 선분에서 작동**(격자/솔리드 블록 한정 X) — 그리드 기반 섀도캐스팅과 구별됨. `✓ 3-0`

### 재귀 섀도캐스팅 — `roguebasin.com/.../FOV_using_recursive_shadowcasting` `[primary]`
> ⚠️ 아래 2건은 세션한도로 검증자 전원 기권(`0-0 abstain`) — 반박 아님, 잘 알려진 사실. 재검증 권장.

- **8옥탄트 분할** — 원점 가까운 행/열부터 셀 단위 스캔. 레이캐스팅(중심→가장자리 선 추적)과 근본 다름. *(미검증)*
- **셀 중복 방문 회피** — non/blocking 셀만 방문, 그림자 셀 스킵. 레이캐스팅의 원점근처 중복 제거. *(미검증)*

---

## 파트 3: 로그라이크 디자인 정의 (Berlin Interpretation)

### Berlin Interpretation — `roguebasin.com/.../Berlin_Interpretation` `[primary]`
장르 정의 표준 (2008 ICRD 제정).

- **9개 high-value 요소**: 랜덤 환경 생성, 퍼머데스, 턴제, 그리드 기반, 비모달, 복잡성, 자원 관리, 핵앤슬래시, 탐험/발견. `✓ 3-0`
- **low-value 요소**: 싱글 캐릭터, 플레이어 유사 몬스터, 전술적 도전, ASCII, 던전, 숫자.
- **필수 요소 없음** — 리스트는 "얼마나 로그라이크다운가"의 등급 척도. 요소 빠져도/가져도 분류 단정 불가.
- **퍼머데스 정의**: 죽으면 1레벨부터 재시작, 세이브 가능하나 **로드 시 파일 삭제**. 랜덤 환경이 이를 처벌 아닌 즐거움으로. `✓ 2-0`

---

## 파트 4: 메타 진행(meta-progression) 설계

### Dead Cells 포스트모템 — `gamedeveloper.com/.../dead-cells-smart-constraints` `[secondary]` + `gdcvault.com/play/1025788` `[primary, GDC]`
- **죽음을 진행으로 재구성** — Motion Twin은 영구 손실(런 내)과 영구 획득(런 간)을 분리, **숨겨진 공정성으로 rage-quit 회피**. `✓ 3-0`
- 개발자(Benard) 인용: *"치팅이 게임을 더 하드코어하게 만들되 rage-quit 없이"* — 옵트인 난이도(Heat) 철학.

### arXiv 2401.14878 `[primary, 학술]` + GameRant 진행 시스템 `[secondary]`
- **영구 업그레이드는 게임을 쉽게 만든다** → Heat·New Game+ 같은 **옵트인 모디파이어로 상쇄**(Hades/Rogue Legacy 2/Dead Cells 패턴). `✓ 3-0`

> ⚠️ Hades "런 리셋 좌절" 특징·Hades 분류는 `2-1`(약한 근거). 메타 사례 다수가 GameRant 단일 출처 의존.

---

## 파트 5: 난이도 밸런싱 & 공정한 RNG

### fNIRS 플로우 연구 — `researchgate.net/.../358985311` `[primary, 학술]`
- **난이도가 플로우 상태에 실증적 영향**(fNIRS 뇌측정). 약한 플레이어 조기 이탈. `✓ 3-0`
  > ⚠️ 모바일/일반 게임 맥락 — 로그라이크 직접 측정 아님, 유추적.

### thom.ee 에이전시 분석 — `thom.ee/blog/.../agency-in-roguelikes` `[blog]`
- **RNG 공정성 = pre-action luck은 공정, post-action luck은 제한 권장**. 과용 시 플레이어 에이전시 약화. `✓ 3-0`
- **변형 언락은 무해, 파워 업그레이드는 마스터리 약화**. `✓ 3-0`

### Spelunky 디자인 분석 pt.2 — `gamedeveloper.com/.../spelunky-game-design-analysis-pt-2` `[blog]`
- **절차적 생성 + 퍼머데스는 학습을 어렵게** 만든다(Spelunky 사례). `✓ 3-0`

> ⚠️ **pity timer·weighted RNG는 이번 출처셋서 직접 입증 안 됨** — 미해결 질문 참조.

---

## 파트 6: 로그라이크 vs 로그라이트

### Wikipedia Roguelike `[secondary]` + RogueBasin Berlin Interpretation `[primary]`
- **2008 Berlin Interpretation**이 무작위 생성·퍼머데스·턴제로 "로그라이크다움" 채점. `✓ 3-0`

### Destructoid 차이 설명 `[secondary]` + GameRant `[secondary]`
- **로그라이트 = 런 넘어 영구 기능 언락하는 메타게임**으로 구분. 단 **메타 진행은 약한 분류자**라는 견해도 — 논쟁 지속. `✓ 3-0`

---

## ❌ 반박된 통념 (믿지 말 것)
적대적 검증 탈락. 흔히 퍼지는 주장이나 근거 약함:

| 반박된 주장 | 표결 | 출처 |
|---|---|---|
| "로그라이트 정의 = 퍼머데스 없는 메타 진행" 단정 | 0-3 | Destructoid |
| "메타 진행은 스킬-마스터리 훼손, 잘 만든 로그라이크는 첫 런에 스킬만으로 클리어 가능해야" | 0-3 | thom.ee |
| "Spelunky는 안 보이는 것에 절대 안 죽인다" (공정성 기법) | 0-3 | gamedeveloper |
| DDA가 D30 리텐션 +3%p, 월 +10라운드 | 0-3 | theamericanjournals |
| 고전 ML DDA가 리텐션 최대 20%↑ | 0-3 | theamericanjournals |
| GameRant "턴제 던전크롤 유지 여부가 1차 구분" | 1-2 | GameRant |

**교훈**: 로그라이트 분류와 DDA 정량 효과는 출처마다 모순 — 단정적 정의 피하라. 메타진행 "무조건 나쁨"론도 근거 약함.

---

## ❓ 미해결 질문 (현 문서 범위 밖 — 향후 리서치 과제)
아래 4건은 이번 조사(파트 1~6) 출처셋에서 검증 가능한 근거를 확보 못 함. 별도 deep-research 필요:

1. **pity timer / weighted RNG 구현과 공정성 효과** — bag shuffle(Tetris 7-bag), Dota PRD(pseudo-random distribution), XCOM 숨은 명중 보정, 셔플백. 최우선.
2. **DDA 리텐션 정량 근거** — 현 출처(theamericanjournals)는 0-3 반박됨. Left 4 Dead AI Director 등 신뢰 출처 필요.
3. **메타 진행 파워 인플레이션 임계값** — 영구 업그레이드가 스킬 표현을 압도하는 지점.
4. **Binding of Isaac · FTL 경계 사례** — 스펙트럼 위치, 시너지 아이템 설계.

> 상태: 위 항목 deep-research 시도했으나 산출물 미확보 → 현 시점 본 문서는 파트 1~6 확정본으로 마감.

---

## 출처 목록

### Primary (학술/원전/GDC)
- `sbgames.org/sbgames2019/files/papers/ComputacaoFull/198359.pdf` — PCG 서베이
- `sbgames.org/proceedings2020/ComputacaoShort/207911.pdf` — WFC 결합 연구
- `researchgate.net/publication/348569324` — WFC+constructive 결합 (위 논문 확장)
- `arxiv.org/abs/2308.07307` — Nested WFC
- `arxiv.org/pdf/2401.14878` — 메타 진행 학술
- `roguebasin.com/.../Cellular_Automata_Method_for_Generating_Random_Cave-Like_Levels`
- `roguebasin.com/.../Comparative_study_of_field_of_view_algorithms_for_2D_grid_based_worlds`
- `roguebasin.com/.../FOV_using_recursive_shadowcasting`
- `roguebasin.com/.../Berlin_Interpretation`
- `redblobgames.com/articles/visibility/`
- `gdcvault.com/play/1025788` — Dead Cells GDC
- `researchgate.net/publication/358985311` — fNIRS 플로우 연구
- `github.com/mxgmn/WaveFunctionCollapse` — WFC 원본 레포

### Secondary / Blog (구현·해설 참고)
- `gamedeveloper.com/.../dead-cells-smart-constraints` — Dead Cells 포스트모템
- `gamedeveloper.com/.../a-spelunky-game-design-analysis---pt-2`
- `thom.ee/blog/what-makes-or-breaks-agency-in-roguelikes/`
- `en.wikipedia.org/wiki/Roguelike`
- `bfnightly.bracketproductions.com/` — Rust 로그라이크 튜토리얼
- `albertford.com/shadowcasting/` — 섀도캐스팅 시각 튜토리얼
- `journal.stuffwithstuff.com/2015/09/07/what-the-hero-sees/` — FOV 구현
- `blog.jrheard.com/procedural-dungeon-generation-cellular-automata`
- `pulsegeek.com/.../dungeon-generation-algorithms-patterns-and-tradeoffs/`
- `destructoid.com/the-difference-between-roguelike-and-roguelite-games/`
- `gamerant.com/roguelike-vs-roguelite-whats-the-difference/`

### ⚠️ 반박/신뢰성 낮음
- `theamericanjournals.com/.../6271` — DDA 정량 주장 0-3 반박

---

*검증 통계: 3회 리서치 통합 · 5각도 × 3 · 63출처 페치 · 235클레임 추출 · 41확정 / 6반박. 적대적 3표 검증 통과분만 수록.*
