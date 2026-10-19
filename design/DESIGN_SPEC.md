# 한밤의 늑대인간 — DESIGN SPEC (단일 기준 문서, 4차 개정)

> 구현 에이전트는 이 문서만 보고 작업한다. 제안서 19개와 비평 5개는 참고용이며, 이 문서와 충돌하면 **이 문서가 이긴다.**
> 3차 개정: 게임 종료 리플레이 「밤의 기록」(§13) 추가. 결말 화면(§6.9)은 이제 §13 시퀀스 하나로 정의된다.
> 성능 예산(§9)은 **하드 제약**이다. 디자인 욕심 때문에 예산을 넘기면 반려.

---

## 0. 컨셉 한 줄

**「피의 판화」 — 칠흑 같은 목판에서 칼로 파낸 1510년대 독일 판화. 빛은 칼자국뿐이고, 색은 단 하나, 피.**

플레이어는 웹 페이지를 보는 게 아니라 **어둠 속 탁자에 앉아 있다.** 카드는 종이 여백을 두른 판화 한 장이고, 그림의 절반 이상은 먹으로 덮여 있다. 인물은 한 줄기 빛이 칼로 파낸 만큼만 드러난다. 그 밖의 모든 것은 어둠에 잠겨 있다. UI는 설명하지 않는다. **선고한다.**

---

## 1. 선택한 아트 디렉션과 이유

### 1.1 결정: 「거장 목판화 아트 × 영화적 어둠 연출」 하이브리드, 단일 체계

| 층위 | 채택 | 출처 |
|---|---|---|
| **카드 그림체** | 16세기 초 독일 명암 목판화(한스 발둥 그린, 뒤러 묵시록 계열). 굵고 성긴 칼선, **화면 절반 이상 먹**, 잉크 3색(먹·종이·피) | 디자인:woodcut, 비평1 |
| **배경·키아트 인쇄 방식** | 같은 계열의 **화이트라인 판화**(검은 판에 뼈색 선을 파낸 것). 어두운 화면에 그대로 얹힌다 | woodcut + cinematic |
| **화면 연출** | 단일 광원, 거의 검정(#070606), 눈꺼풀 letterbox, 정적의 공백, 심박 비네트 | 디자인:cinematic, 기획:flow |
| **화면 구조** | 모든 게임 화면 = **하나의 탁자**(타원 좌석, 내 자리는 6시, 가운데 제단 3장) | 기획:ia, 기획:mobile |
| **크롬(UI 장식)** | 직각, 1px 헤어라인 + L자 코너 틱, 하드 오프셋 그림자, 도장(stamp) 누름 | woodcut, graphic |
| **비밀 보호** | 내 카드는 항상 뒷면, **누르고 있는 동안만** 앞면 | 기획:mobile |
| **카피** | 촌장의 명령형 반말(해라체), 마침표, 이모지/느낌표 0 | 기획:copy, 비평3 |
| **결과 연출** | **「밤의 기록」 리플레이**(§13): 처음 패 → 밤의 모든 행동 → 마지막 패 → 지목·처형·사냥꾼 → 판결을 하나의 연속 시퀀스로. 전지적 시점, 박자 단위로 탭·되감기·건너뛰기 | 기획:flow, 리플레이 제안 6개 |
| **렌더링** | 영역 패치, `#fx` 연출 레이어, rAF 배치 | 성능:runtime |
| **배포** | 정적 파일은 CDN(Render Static Site, 잠들지 않음), 소켓만 웹 서비스 | 비평4 |

### 1.2 왜 이것인가

1. **목판화는 AI 이미지의 최대 약점(12장 일관성)에 가장 강하다.** 선 굵기만 맞으면 나머지 편차는 오프라인 **3색 재인쇄(duotone)** 파이프라인(§9.3)과 공통 프레임이 흡수한다. 모든 카드가 정확히 같은 먹·종이·피 세 색을 갖는다.
2. **어둠이 살벌함을 만든다.** 밝은 종이 한가운데 작은 인물은 "빈티지 삽화"(Etsy 리노컷 느낌)로 떨어진다. 먹이 절반 이상인 화면에서 빛이 인물을 파내야 위협이 된다.
3. **성기고 굵은 선 + 넓은 먹 = 압축 효율 최고.** 촘촘한 망사 해칭은 WebP 최악의 경우다. 굵은 칼선과 넓은 단색 면은 같은 해상도에서 용량이 절반 이하이고, 72px 썸네일에서도 형태가 읽힌다.
4. **한국 민속(korean-folk)은 기각.** 게임 원작과 역할 이름(프리메이슨, 무두장이)이 서양 세계관이라 의미 충돌이 크고, 부적·탈은 관광 키치로 떨어질 위험이 높다. 대신 **한글 붓명조(Song Myung)** 로 한국어 게임으로서의 정체성을 지킨다.
5. **오컬트 타로(금색)는 기각.** 금색-검정은 "AI 다크 판타지" 기본값 그 자체다. 금색은 이 프로젝트에서 **완전 금지**.

### 1.3 금지 목록 (리뷰에서 하나라도 보이면 반려)

- 이모지 (UI, 서버 메시지, 파비콘, 채팅 시스템 메시지 전부). 검수: `grep -P "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}]"` 결과 0건 (`✠`·`†` 같은 장식 문자도 쓰지 말 것 — 아이콘은 SVG 심볼만).
- 금색/남색/보라/초록/파랑. 피 이외의 채도 있는 색.
- `border-radius` > 2px (예외: 플레이어 좌석 원형 토큰 `50%` 하나뿐).
- `backdrop-filter`, `mix-blend-mode`, 그라디언트 버튼, 소프트 드롭섀도(`0 18px 40px` 류), 글로우 테두리.
- 느낌표, "~요" 존댓말 안내문, "…" 말줄임 완곡어, 마케팅 문장, 인원·시간·음성통화 안내 같은 메타 문구.
- 상시 장식 애니메이션(별 반짝임, 유성, 구름 흐름). **움직임은 상태가 바뀔 때만.** 예외는 §8.4 목록.
- 화면 가운데 패널 안에 패널(card-in-card) 레이아웃.
- **밤(`data-phase="night"`)의 진동.** 책상 위 휴대폰 진동음이 통화 마이크로 "방금 누가 깼다"를 흘린다(§8.2).

---

## 2. 팔레트 (CSS 변수, `public/css/base.css`의 `:root` — index.html에 인라인됨)

```css
:root{
  /* 어둠 */
  --void:#070606;      /* 페이지 바닥. 순수 #000 금지(OLED 번짐) */
  --ink:#0d0b09;       /* 먹. 카드 그림의 검정(duotone 출력과 동일) */
  --char:#15120f;      /* 패널, 독, 시트 */
  --char-hi:#1f1a16;   /* 눌림 가능한 표면, 입력칸 */
  --ash:#2b2520;       /* 헤어라인, 구분선, 비활성 */
  --smoke:#8c8176;     /* 2차 텍스트 (void 위 5.3:1, char 위 4.9:1) */
  /* 종이 */
  --bone:#d9cbb0;      /* 카드 종이 여백, 판화의 흰 부분(duotone 출력과 동일), 법도 모달 종이 */
  --bone-hi:#e8dfcc;   /* void 위 1차 텍스트 */
  --bone-dim:#a89a80;  /* void 위 본문 */
  --sepia:#6b5a43;     /* 무두장이 팀(배경색 전용, 글자색 금지) */
  /* 피 — 유일한 색 */
  --blood:#8e0f0f;     /* 늑대 팀, 주 버튼, 죽음, 내 투표 (duotone 출력과 동일) */
  --blood-hot:#c4161c; /* 눌림/포커스, 10초 미만 타이머, 처형 플래시, 주 버튼 외곽선 */
  --clot:#4a0709;      /* 피의 그림자, 눌린 주 버튼 */
  /* 빛 (그라디언트 레이어에만 사용, 텍스트·테두리 금지) */
  --light-candle:rgba(214,170,110,.10); /* 밤의 탁자 조명 */
  --light-dawn:rgba(150,160,168,.10);   /* 낮: 차가운 회청 새벽 */
  --light-vote:rgba(142,15,15,.16);     /* 심판: 붉은 달빛 */
  /* 팀 */
  --team-village:var(--bone);
  --team-wolf:var(--blood);
  --team-tanner:var(--sepia);
  /* 형태 */
  --hair:1px solid var(--ash);
  --shadow-hard:4px 4px 0 #000;
}
```

**규칙**
- 피는 **화면 면적의 3% 이하.** 피가 나타나는 곳: 늑대 팀 카드 띠, 주 버튼, 10초 미만 타이머, 내 투표 대상, 처형, 늑대 승리 배너, 기록 배지의 새 기록 점. 그 외에는 없다.
- 성공/실패를 색으로 구분하지 않는다. 상태는 **도장(스탬프)·굵기·취소선**으로.
- 대비: void 위 본문 `--bone-dim`(8:1+), 2차 `--smoke`(5.3:1). `--sepia`는 글자색으로 쓰지 않는다(bone 위 4.1:1). 피 글자는 24px 이상 디스플레이에만.
- `.btn-main`(피 바탕)은 void 위 비텍스트 경계 3:1을 위해 `outline:1px solid var(--blood-hot); outline-offset:-1px`.
- 다크모드 분기 없음. 이 게임은 항상 어둡다. `<meta name="theme-color" content="#070606">`, `color-scheme: dark`.

---

## 3. 타이포그래피

| 용도 | 폰트 | 비고 |
|---|---|---|
| 홈 제목·홈 버튼 | **Hanbam T** = Song Myung 400 서브셋 ①(제목용, ≤10KB, preload) | 첫 페인트에 필요한 글자만. 홈 버튼 라벨(`T.btn.open/join/otherTown/law/or`)도 ①에 포함(subset-font.mjs `HOME_BTN`) — 홈에서 ②(30KB)를 끌어오지 않게 |
| 디스플레이 (역할명 md 이상, 리본, 버튼 동사, 헤드라인, 판결, 도장, 단계명) | **Hanbam** = Song Myung 400 서브셋 ②(≤30KB, 지연 로드) | 18px 이상에서만. `font-synthesis:none` |
| 내레이션, 카드 한 줄(`card-line`), 법도 본문 | 시스템 명조 0KB `--f-serif` | 서브셋에 넣지 않는다(확정, 예외 없음) |
| 본문 / UI / 채팅 / **닉네임 전부** / 지시문 띠 | 시스템 고딕 0KB `--f-body` | |
| 숫자 (타이머, 표식, 로마자) | Hanbam T(라틴·숫자 포함) | 타이머 각 자리 `min-width:.62em; text-align:center` |

```css
/* index.html 인라인 <style> 안. __FONT_T__/__FONT_D__ 는 stamp가 해시 파일명으로 치환 (§9.0) */
@font-face{ font-family:"Hanbam T"; src:url(/a/__FONT_T__) format("woff2"); font-display:swap; }
@font-face{ font-family:"Hanbam";   src:url(/a/__FONT_D__) format("woff2"); font-display:swap; }
@font-face{ /* 대체 메트릭: 안드로이드엔 명조가 없으므로 고딕 기준으로 맞춘다 */
  font-family:"Hanbam Fallback";
  src:local("Apple SD Gothic Neo"),local("Malgun Gothic"),local("Noto Sans CJK KR"),local("Noto Sans KR");
  size-adjust:__SA__%; ascent-override:__AO__%; descent-override:__DO__%; /* @font-face 안에서는 var() 불가. W5 실측값을 리터럴로 기입, 추측 금지 */
}
:root{
  --f-title:"Hanbam T","Hanbam","Hanbam Fallback",sans-serif;
  --f-display:"Hanbam","Hanbam T","Hanbam Fallback",sans-serif;
  --f-serif:"Nanum Myeongjo","AppleMyungjo","Batang","Noto Serif CJK KR",serif;
  --f-body:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;
}
.nm{font-family:var(--f-body)!important;font-weight:600}  /* 닉네임은 어느 문맥에서든 본문 폰트 */
```

- `size-adjust`/`ascent-override`/`descent-override`는 W5가 `tools/font-metrics.html`(Song Myung 원본과 로컬 고딕의 같은 문자열 폭·높이를 캔버스로 측정)로 **실측**해서 기록한다. 96% 같은 추정값 금지.
- **닉네임 규칙**: 디스플레이 폰트를 쓰는 문자열(`처형 — 민수`, `민수 처형.`, `민수를 내쫓는다`) 안의 이름은 **반드시** `<b class="nm">`으로 감싼다. 서브셋에 없는 글자가 명조와 고딕으로 섞이는 것을 막는다(§10.0 규칙 7).

**타입 스케일 (모바일 / ≥1024px)**: `--fs-hero 44/72` 제목·판결, `--fs-h1 30/40`, `--fs-h2 22/26`, `--fs-name 20/22`(카드 역할명 md/xl), `--fs-body 15/16`, `--fs-small 13/13`, `--fs-label 12/12`(letter-spacing .18em). 디스플레이 letter-spacing `.06em`. 한국어 이탤릭 금지. 12px 미만 금지(12px은 `--fs-label`만).

**서브셋 파이프라인** (`tools/subset-font.mjs`, 오프라인, devDependency `subset-font`(wasm))
1. 원본: Google Fonts 저장소의 `SongMyung-Regular.ttf`를 `art-src/fonts/`에 둔다(배포 안 함).
2. 글자 소스는 **손으로 관리하는 목록 없이** 코드를 순회해 만든다(`T.DISPLAY` 삭제).
   - ① 제목용(Hanbam T): `T.title`의 모든 문자열 값 + 홈 버튼 라벨 5종(`T.btn.open/join/otherTown/law/or`) + `0-9 A-Z I V X — · . , ? ( ) / : ×` + 공백.
   - ② 디스플레이용(Hanbam): `T`에서 디스플레이 그룹(`T.title T.btn T.head T.phase T.verdict T.stamp`)의 모든 문자열 값 + `ROLES[*].name` + `TEAM_NAME` 값 + ①의 ASCII. 템플릿의 `${…}`는 제거하고 센다. `T.chat`, `T.narr`, `T.body`, `ROLES[*].line/desc`, `NIGHT_TEXT`는 넣지 않는다.
3. 출력: `public/fonts/hanbam-t.<8자 해시>.woff2`(≤10KB), `public/fonts/hanbam-d.<8자 해시>.woff2`(≤30KB). 넘으면 `check-budget` 실패 → 디스플레이 그룹에서 문장을 `T.body`로 옮긴다(문장 단위, 구현자가 아니라 W2가 결정).
4. `Hanbam T`만 `<link rel="preload" as="font" type="font/woff2" crossorigin>`. `Hanbam`은 홈이 입력 가능해진 뒤 `requestIdleCallback`(최대 3초) 또는 모닥불 진입 중 먼저 오는 시점에 `new FontFace('Hanbam','url(...)').load().then(f=>document.fonts.add(f))`.
5. **문구를 바꾸면 반드시 재실행.** 2차 개정으로 새 글자(베꼈, 지핀, 법도, 목매달, 손 든 등)가 들어갔다 — W2 직후 1회 실행 필수.

Google Fonts `<link>` 3줄은 **삭제**. 제3자 도메인 0개.

---

## 4. 카드 시스템

### 4.1 원칙
- **이미지 = 그림만.** 종이 여백, 프레임, 역할명, 밤 순서, 팀 표시는 **전부 CSS + 인라인 SVG.** gpt-image는 글자/테두리를 그리지 않는다.
- **이미지가 0장이어도 카드는 완성품이다.** 아트가 없으면 먹 바탕 + 해칭(CSS) + 큰 역할 문양(SVG) + 이름으로 렌더한다. 아트가 와도 화면 인상(어두운 판화)이 바뀌지 않게 폴백도 어둡다.
- **런타임 합성 없음.** 그림은 오프라인에서 이미 `--ink`/`--bone`/`--blood` 3색으로 재인쇄되어 온다(§9.3). `mix-blend-mode`, 카드별 그레인 타일 **금지**(3D 플립 안에서 합성 레이어 폭증·Safari 오작동). 그레인은 `#bg`에만.

### 4.2 비율과 크기
비율 **5:7**. `aspect-ratio:5/7` 고정(CLS 0). 크기는 `--cw` 하나로.

| 크기 | `--cw` | 쓰임 | 이미지 | 글자 |
|---|---|---|---|---|
| `xs` | 40px | 좌석 위 엎어진 카드, 로그 아이콘, 모바일 좌석 겹침 카드(28px로 축소 사용) | 아틀라스 | **글자 없음.** 문양 칩만 |
| `sm` | 72px (모바일) / 88px | 제단 3장, 덱 빌더, 결과 | 아틀라스 | 이름 `600 13px var(--f-body)`, letter-spacing 0. 문양 칩 |
| `md` | 128px / 156px | 밤 정보 카드, 공개된 좌석 카드 | 큰 아트 | 이름 Hanbam `--fs-name`, `card-ord`·`card-tm` 표시 |
| `xl` | `min(64vw, 300px)` | 카드 확인, 누르고 보기(peek), 공개 연출, 처형 카드 | 큰 아트 | md + `card-line` |

- 독의 내 카드는 `--cw:44px`의 `xs` 변형(§5.2). 제단은 뷰포트 폭 400px 미만에서 `--cw:52px`.
- `.card-ord`, `.card-line`은 `md` 미만에서 `display:none`.

### 4.3 앞면 구조

```
┌─────────────────────┐  ← 종이 여백: --bone, 두께 calc(var(--cw)*.04) (판화 한 장을 탁자에 놓은 느낌)
│┌───────────────────┐│  ← 안쪽 1px --ink 괘선
││ V              ▼  ││  ← 좌상 밤 순서(로마자), 우상 팀 문양 14px — 아트 위, --bone-hi
││                   ││
││   [ 판화 전면 ]    ││  ← .card-art: 여백 안쪽 전체(full-bleed), background-position 50% 0
││                   ││
│╞═══ 리본 (76%~88%) ═╡│  ← 역할명 띠. 팀 색. clip-path 다각형
││ 남의 패를 엿본다.   ││  ← card-line(xl만): --ink 띠 위 13px --f-serif --bone-dim
│└───────────────────┘│
└─────────────────────┘
```

```css
.card{position:relative;width:var(--cw);aspect-ratio:5/7;perspective:800px}
.card-in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform var(--t-flip) var(--ease-press)}
.card-front,.card-back{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.card-front{transform:rotateY(180deg);background:var(--bone);padding:calc(var(--cw)*.04)}
[data-face="1"] .card-in{transform:rotateY(180deg)}
.card-plate{position:relative;height:100%;outline:1px solid var(--ink);background:var(--ink)
  repeating-linear-gradient(115deg,rgba(217,203,176,.05) 0 1px,transparent 1px 4px)}   /* 폴백 해칭 */
.card-art{position:absolute;inset:0;background:var(--art) 50% 0/cover no-repeat;opacity:0;transition:opacity 180ms}
[data-art="1"] .card-art{opacity:1}
.card-name{position:absolute;left:-4%;right:-4%;top:76%;height:12%;display:grid;place-items:center;
  clip-path:polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)}
.card-line{position:absolute;left:0;right:0;top:88%;bottom:0;background:var(--ink);display:grid;place-items:center}
```

- `background-position`만 쓴다(`object-position` 아님 — `<img>`가 아니다). 역할별 미세 조정은 `[data-role=x] .card-art{background-position:50% N%}`.
- 소스 크롭(1024×1434)과 카드 그림판의 비율이 같으므로 `cover`가 거의 잘라내지 않는다. 그림의 아래 20%는 프롬프트상 가장 어두운 먹이라 리본·한 줄 띠가 그 위에 얹힌다.
- **모서리**: 직각. 종이 여백 네 귀에 2px 사각 "판목 못" 점(`background` 다중 레이어 4개).
- **리본(역할명 띠)** — `clip-path`는 정적이므로 mask 예산(§8.3)에 넣지 않는다.
  - 마을: `--bone-hi` 바탕 + `--ink` 글자, 위아래 1px `--ink` 괘선
  - 늑대(늑대인간, 하수인): `--blood` 바탕 + `--bone-hi` 글자
  - 무두장이: `--sepia` 바탕 + `--bone-hi` 글자 + 아래 괘선 `1px dashed --bone-hi`(꿰맨 실)
  - 도플갱어: 공개 시점 팀을 따른다(결과 화면에서 `도플갱어 → 역할` 표기). 기본은 마을 리본.
- **팀 문양**(색에만 의존하지 않기): 늑대 = **세 줄 발톱 자국**, 마을 = **횃불**, 무두장이 = **올가미 고리**. `<symbol id="tm-wolf|tm-village|tm-tanner">`.
- **역할 문양** `<symbol id="sg-<roleId>">` 12종 — 아트 그림의 식별 소품과 맞춘다: 도플갱어=코를 맞댄 두 옆얼굴, 늑대인간=송곳니, 하수인=끊어진 목줄, 프리메이슨=맞잡은 두 손, 예언자=물 대야 위 눈, 강도=열쇠 꾸러미, 말썽쟁이=교차하는 두 화살, 주정뱅이=두레박, 불면증환자=꺼지지 않는 초, 마을주민=쇠스랑, 사냥꾼=석궁 화살, 무두장이=올가미. 단색(`currentColor`), stroke 1.5px 기준 24×24 viewBox, 끝을 칼로 자른 듯 각지게.
- **문양 칩(`.card-sg`)**: 아트가 없을 때는 판 가운데 46% 크기 `--bone-dim`으로 크게. **`sm`·`xs`에서는 아트가 있어도 항상** 우하단에 16px 문양을 18px `--ink` 정사각 칩 위 `--bone-hi`로 겹친다(썸네일에서 촘촘한 판화만으로 역할을 판독할 수 없으므로).

**밤 순서 로마자** (roles.js `ord`): 도플갱어 I, 늑대인간 II, 하수인 III, 프리메이슨 IV, 예언자 V, 강도 VI, 말썽쟁이 VII, 주정뱅이 VIII, 불면증환자 IX, 마을주민/사냥꾼/무두장이 `—`. 라틴 대문자로 쓴다(Hanbam T에 포함).

### 4.4 뒷면
- 이미지 1장(`--img-back`): 화이트라인 판화 — 정면 늑대 머리 하나, 완벽한 좌우 대칭(파이프라인이 왼쪽 절반을 거울 복사), 눈 틈만 피. 글자 없음.
- 프레임: 종이 여백 **없음**. `--ink` 바탕 + 3px 안쪽에 `--bone-dim` 1px 이중 괘선. (앞면 = 종이에 찍힌 판화, 뒷면 = 먹판 그대로 → 크기가 작아도 앞뒤가 즉시 구분된다.)
- **0KB 폴백**: 이미지 로드 전엔 `--ink` 바탕 + 가운데 `<symbol id="back-mark">`(늑대 머리 윤곽 + 두 눈 틈, ≤200바이트) + 해칭. 이미지가 오면 `opacity` 0→1 (180ms).
- 뒷면은 다른 플레이어 카드, 제단 카드, 내 카드(비공개 상태) 모두 공통.

### 4.5 마크업 계약 (모든 에이전트가 이 HTML을 생성/스타일링한다)

```html
<div class="card" data-size="md" data-role="seer" data-team="village" data-face="0" data-art="0" aria-label="엎어진 카드">
  <div class="card-in">
    <div class="card-front">
      <div class="card-plate">
        <div class="card-art" style="--art:url(/a/seer.1a2b3c4d.webp)"></div>
        <span class="card-ord">V</span>
        <svg class="card-tm" aria-hidden="true"><use href="#tm-village"/></svg>
        <span class="card-sg" aria-hidden="true"><svg><use href="#sg-seer"/></svg></span>
        <div class="card-name">예언자</div>
        <div class="card-line">남의 패를 엿본다.</div>
      </div>
    </div>
    <div class="card-back"></div>
  </div>
</div>
```

- `data-face="0|1"`: 0 = 뒷면이 보임, 1 = 앞면.
- `xs`/`sm`의 `.card-art`는 `--art` 대신 아틀라스: `background:var(--img-atlas) calc(var(--col)*20%) calc(var(--row)*100%)/600% 200% no-repeat`. `--col`/`--row`는 `ROLE_ORDER` 인덱스에서 계산(2행 × 6열).
- `.card-art`는 `<img>` 대신 **`background-image`** → `innerHTML` 재렌더에도 디코드된 이미지가 재사용되어 깜빡이지 않는다.
- 아트 로드 여부는 `art.js`가 `data-art="1"`로 표시.
- 접근성: `.card`의 `aria-label`은 앞면이면 `"예언자 카드"`, 뒷면이면 `"엎어진 카드"`.
- 생성 함수: `ART.card(roleId|null, {size, face, cls, label, flat})` 하나만 사용. 화면 코드는 카드 HTML을 직접 쓰지 않는다.
- `flat:1`(리플레이 전용, §13.6): `.card-in` 회전·`preserve-3d` 없이 한 면만 그린다. `roleId`가 있으면 `.card-front`만, `null`이면 `.card-back`만. 3D 변환이 없어 정지한 카드는 합성 레이어로 남지 않는다.

### 4.6 상태

의사 요소 역할 고정: **`.card::before` = 선택 테두리(맥동·선택됨), `.card::after` = 플립 섬광 전용.**

| 상태 | 표현 (transform/opacity만 애니메이션) |
|---|---|
| `face=0` 뒷면 | 기본 |
| `face=1` 앞면 | `.card-in` 회전 520ms `--ease-press`. 90° 지점에서 `::after` 종이 섬광 1프레임(opacity .5→0, 60ms) |
| `.is-selectable` 고를 수 있음 | 나머지 카드는 `.is-dim`(opacity .35). `::before` 1px `--bone-hi` 테두리 opacity .3↔.9 1.6s 맥동 |
| `.is-selected` 선택됨 | `translateY(-6px)`, `::before` 테두리 `--blood-hot` 2px 고정(맥동 정지), 아래 하드 그림자 `0 6px 0 #000` |
| `.is-swapped` 바뀐 카드 | 결과에서: 리본 옆 `rp-turn` 문양(반쯤 판 끌 갈고리, 스프라이트 `<symbol>`) + 카드 귀퉁이 찢김(정적 `clip-path`). 장식 문자(`↺` 등) 금지(§1.3). 밤 교환 연출: 두 카드가 서로의 좌표로 `translate` 360ms 교차 |
| `.is-unknown` 모르는 카드(주정뱅이 등) | 뒷면 위에 `?` 낙인(Hanbam T 40%, `--bone-dim`) |
| `.is-dead` 처형 | `.card-art` opacity .55 **정적**(filter 금지), 대각선 피 칼자국(`linear-gradient` 2개, 정적) + 리본 위 `처형` 도장 −6° |
| `.is-original` 결과의 처음 카드 | `sm`의 60% 크기로 최종 카드 왼쪽 위에 겹침, opacity .7 (데스크톱 전용. 모바일은 §6.9 목록) |
| `.is-zero` 덱 빌더 0장 | opacity .35 정적(grayscale filter 금지) |

`prefers-reduced-motion`: 플립 대신 opacity 크로스페이드 160ms, 맥동·흔들림 없음.

---

## 5. 화면 레이어 구조 (전역)

```html
<html lang="ko" data-perf="full|lite" data-net="fast|slow">   <!-- head 인라인 스크립트가 설정 (§8.5) -->
<body data-phase="home|lobby|night|day|vote|result">
  <div id="bg" aria-hidden="true">        <!-- z 0, position:fixed, 정적 -->
    <div class="bg-art"></div>             <!-- 키아트(home) / 지평선(게임 중) -->
    <div class="light light-night"></div>
    <div class="light light-day"></div>
    <div class="light light-vote"></div>
    <div class="grain"></div>              <!-- 128px 타일, 정적, opacity .07 — 그레인은 여기에만 -->
    <div class="vignette"></div>           <!-- 정적 radial. 맥동은 ::after opacity -->
  </div>
  <div id="app">                           <!-- z 1 -->
    <header id="hud" data-r="hud">…</header>
    <main id="main">…</main>               <!-- 탁자 + 지시문 띠. 흔들림(shake)은 여기에만 -->
    <nav id="dock" data-r="dock">…</nav>
  </div>
  <aside id="sheet" data-h="0">…</aside>   <!-- z 20 -->
  <div id="fx" aria-hidden="true">         <!-- z 30, pointer-events:none -->
    <div class="lid lid-t"></div><div class="lid lid-b"></div>
    <div class="flash"></div>
    <div class="peek"></div>               <!-- z 35, 누르고 보기용 미리 렌더한 xl 카드 -->
  </div>
  <div id="modal" hidden></div>            <!-- z 40 -->
  <div id="conn" role="status" aria-live="polite" hidden></div>   <!-- z 50 -->
  <div id="toast" role="status" aria-live="polite" hidden></div>  <!-- z 60 -->
  <div id="sr" class="sr-only" role="status" aria-live="polite"></div> <!-- 스크린리더 공지 -->
  <svg id="sprite" hidden>…symbols…</svg>  <!-- index.html 인라인, ≤ 8KB 원본 -->
</body>
```

- **z-index 척도(고정)**: `#bg 0 · #app 1 · #sheet 20 · #fx 30 · .peek 35 · #modal 40 · #conn 50 · #toast 60`. 다른 값 금지.
- 페이즈 조명은 **세 `.light` 레이어의 opacity 크로스페이드**(1100ms)로만 바꾼다. `background-color` 트랜지션 금지.
- 기존 `.scene`(별, 유성, 달, 구름, 해, 숲 3장, 창문, 눈 2쌍, 안개 2장) **전부 삭제.** `img/forest-*.svg`, `windows.svg` 삭제(W3).
- `FX.shake`는 `#main`에만 건다. `#app`을 흔들면 fixed 자식(HUD, 독)이 재배치된다.

### 5.1 HUD (상단 44px, `--char` 92% 불투명, 아래 1px `--ash`)
`[표식 K7QX]  —  [단계 이름 · 타이머]  —  [⋯]`
- 왼쪽: 표식(Hanbam T, letter-spacing .2em). 누르면 초대 링크 복사 → 토스트 `표식을 베꼈다. 부를 자에게 넘겨라.`
- 가운데: 단계 이름(`밤` `낮` `심판` `결말` `모닥불`) + 타이머. 타이머 아래 HUD 전체 폭 2px 바(`transform:scaleX`). 낮/심판에서는 숫자 1.5배.
- 오른쪽 `⋯` 하나(결말 리플레이 중에는 그 왼쪽에 텍스트 버튼 `건너뛴다`, §13.7): 시트 메뉴(목소리를 켠다/끈다, 법도, 이번 밤의 패, 낮의 길이(촌장), 지금 심판한다(촌장), 떠난다). 🔈📖🚪 버튼 삭제.
- 홈에서는 HUD 숨김. `.brand` 헤더 삭제.

### 5.2 독 (하단 고정, 높이 76px + `env(safe-area-inset-bottom)`)
`[내 카드 44px | 보조 링크 + 주 행동 버튼 | 기록/속삭임 배지 48px]`
- **주 버튼은 항상 하나**, 2줄 구조: 위 동사(Hanbam 18px, 예 `훔친다`), 아래 대상(`<b class="nm">` 13px `--bone-dim`, 한 줄 말줄임). 대상이 없으면 동사 한 줄 가운데.
- 보조 행동(`보지 않는다` 등)은 주 버튼 위 36px 텍스트 링크 `.dock-alt`.
- 내 카드: `--cw:44px`(높이 62px) 뒷면. **누르고 있는 동안만** `#fx .peek`에 미리 렌더한 `xl` 앞면이 뜬다(§6.3). 독 카드 자체를 `scale()`로 키우지 않는다(흐려진다).
- 첫 판에서만 독 카드 아래 `눌러 본다`(`--smoke` 12px). `localStorage['hb.peeked']` — 읽기/쓰기는 try/catch, 실패하면 항상 표시.
- 탭 영역 최소 48×48, 간격 8px.

### 5.3 탁자 (Stage)
- 플레이어 N명(3~10)을 타원 위 균등 배치, **내 자리는 항상 6시.**
- **좌표는 JS가 계산**(CSS `cos()` 사용 안 함): `#main`의 실측 W·H로 `rx = W/2 − 40`, `ry = H/2 − 64`. 좌석마다 `--x`,`--y`(px)를 인라인. 리사이즈·`visualViewport` resize 때만 재계산. 투표선·교환 연출이 같은 좌표를 재사용.
  ```css
  .seat{position:absolute;left:50%;top:50%;transform:translate(calc(var(--x) - 50%),calc(var(--y) - 50%))}
  ```
- 가운데: 제단 카드 3장(`sm`, 뒷면, 라벨 없음 — 위치로 `왼쪽`·`가운데`·`오른쪽` 제단이라 부른다. 로마 숫자는 밤 차례 전용). 폭 400px 미만에서 `--cw:52px`.
- 좌석 = 원형 토큰 48px(모바일, 7인 이상 40px)/56px(데스크톱) + 이름표(최대 6자 + 말줄임, `--f-body` 13px) + 상태 표식. 토큰: `--char-hi` 원 + 1px `--bone-dim` 테두리 + 이름 첫 글자(`--f-body`).
- 좌석의 카드: **탁자 안쪽(타원 중심 쪽) 토큰 바로 옆, 세로 중심을 토큰과 맞추고 링 바깥 6px에 둔다.** 크기는 `--seat-cw`(모바일 26px, ≥600px 40px, 결과 화면 ≥600px 56px, 9~10명 22px, `data-tight` 90%). 좌석 기준점은 언제나 토큰 중심이며 `.seat[data-side=r]`(토큰이 오른쪽 반)이면 카드는 왼쪽에 놓인다. 득표 배지는 카드 반대쪽 위, 센터 카드 3장의 중심은 타원 중심(`--cy`), 제단 카드 폭은 `--altar-cw`(탁자 폭·높이로 계산, 52~104px). 결과 화면은 ≥1024px에서 좌 탁자·우 판결과 기록의 두 칸으로 놓아 판결이 첫 화면에 보인다.
- **내 좌석에는 카드를 그리지 않는다.** 내 카드는 독의 `.dock-card`가 소유하고, 교환 연출도 `.dock-card`를 대상으로 한다. 예외: 결말 리플레이(§13.6)는 모든 패가 공개된 뒤이므로 내 좌석에도 카드를 그린다.
- 좌석 상태는 **독립 클래스**로 겹쳐 쓴다(`data-s` 폐기):

  | 클래스 | 표현 |
  |---|---|
  | `.is-me` | 토큰 테두리 `--bone-hi` 2px |
  | `.is-host` | 토큰 우상단 작은 열쇠 문양(왕관 금지) |
  | `.is-off` | opacity .35 + 끊긴 사슬 문양, 이름표 `자리를 비움` |
  | `.is-ready` (낮) | 토큰 아래 밀랍 봉인 점(`--bone-dim`) + 작은 손 문양 |
  | `.is-voted` (심판) | 봉인 점(누구를 찍었는지 숨김) |
  | `.is-target` | 토큰 `--blood-hot` 2px 링 1.15→1 scale 120ms 조여듦. 토큰 `aria-pressed="true"` |
  | `.is-dead` | 토큰 위 피 X 칼자국, 이름표 취소선 |
  | `.is-gone` (결말) | 결과 화면에서 떠난 자의 유령 좌석. 토큰 opacity .35 + 끊긴 사슬 문양, 이름은 그대로(§13.6). 좌석을 지우지 않는다 |
- 좌석 DOM은 **플레이어 집합이 바뀔 때만** 생성하고 이후 클래스·텍스트만 바꾼다(§7.2).
- **들어맞음 검증**: 375×553(iPhone SE, 브라우저 UI 제외)과 360×640에서 10인 좌석·제단·지시문 띠·독이 겹치지 않고 세로 스크롤 0.

### 5.4 마크업 계약 (W6이 생성, W7이 스타일. 새 클래스 임의 추가 금지)

```html
<!-- 좌석 -->
<div class="seat is-host" data-pid="p1" style="--x:-120px;--y:40px">
  <button class="seat-token" aria-pressed="false" aria-label="민수">민</button>
  <span class="seat-name">민수</span>
  <i class="seat-mark" aria-hidden="true"></i>      <!-- 무리/주인/형제 낙인, 받은 표 수 -->
  <!-- ART.card(null,{size:'xs'}) — 내 좌석엔 없음 -->
</div>

<!-- 제단 -->
<div class="altar"><!-- ART.card(null,{size:'sm',cls:'altar-card'}) ×3, aria-label '왼쪽 제단'·'가운데 제단'·'오른쪽 제단' --></div>

<!-- 지시문 띠 (독 위 56px) -->
<div class="band" data-r="prompt" role="status" aria-live="polite">
  <p class="band-text"></p><div class="band-bar"></div>
</div>

<!-- 독 -->
<nav id="dock">
  <div class="dock-card" role="button" tabindex="0" aria-label="내 패. 누르고 있으면 보인다"><!-- ART.card --></div>
  <div class="dock-act">
    <a class="dock-alt" href="#" role="button"></a>
    <button class="btn-main hold" data-hold="600" aria-describedby="hold-hint">
      <span class="hold-fill"></span><span class="lbl"></span><b class="nm"></b>
    </button>
  </div>
  <button class="dock-badge" aria-label="기록"><i class="dot"></i></button>
</nav>
<span id="hold-hint" class="sr-only">길게 눌러 확정한다</span>

<!-- 시트 -->
<aside id="sheet" data-h="0|1|2">
  <div class="sheet-head"><button class="sheet-tab" aria-selected="true">속삭임</button><button class="sheet-tab">기록</button></div>
  <div class="sheet-body"></div>
</aside>

<!-- 채팅 줄 -->
<p class="msg" data-sys="0"><b class="msg-n nm">민수</b><span class="msg-t">…</span></p>

<!-- 덱 셀 -->
<div class="deck-cell" data-role="seer">
  <!-- ART.card('seer',{size:'sm',face:1}) — 탭 = 설명 -->
  <div class="deck-ctl"><button class="deck-dec" aria-label="예언자 빼기">−</button><output>1</output><button class="deck-inc" aria-label="예언자 더하기">+</button></div>
</div>

<!-- 결과: 타임라인 줄 / 판결 / 모든 기록 줄 -->
<li class="tl-row" data-beat="7"><!-- ART.card(role,{size:'xs',face:1}) --><span class="tl-t"></span></li>   <!-- 문장은 replay.js가 채운다 (§13.8) -->
<div class="verdict" data-team="wolf">
  <p class="verdict-line">늑대가 마을을 삼켰다.</p>
  <p class="verdict-why">늑대는 끝내 살아남았다.</p>     <!-- §10.13 판결 이유 -->
  <p class="verdict-self">너는 예언자라 믿었다. 너는 늑대인간이었다.</p>  <!-- 내 화면에만 -->
</div>
<li class="rec-row is-dead" data-slot="0">
  <b class="rec-n nm">민수</b>
  <span class="rec-from"><svg><use href="#sg-seer"/></svg>예언자</span>
  <span class="rec-arrow">→</span>
  <span class="rec-to"><svg><use href="#sg-werewolf"/></svg>늑대인간</span>
  <span class="rec-vote">지목 <b class="nm">지수</b></span><span class="rec-got">표 2</span>
  <span class="rec-stamp">졌다</span>
  <!-- 아래 두 줄은 replay.js가 로드되면 끼워 넣는다 (§13.8). app.js는 만들지 않는다 -->
  <span class="rec-path">…</span>
  <span class="rec-belief">믿은 패 <i>예언자</i></span>
</li>
```
- 리플레이 무대(`.rp`)·조작줄(`.rp-bar`)·자막(`.rp-cap`) 마크업은 §13.6이 정의하며 **replay.js만** 생성한다.
- **선(`.ln`)**: 투표선·말썽쟁이 예고선·리플레이 칼선이 모두 같은 원시 요소를 쓴다. SVG `stroke-dashoffset`은 쓰지 않는다(§8.3).
  ```html
  <i class="ln" style="--x:-120px;--y:40px;--len:182px;--ang:-34deg"></i>
  ```
  ```css
  .ln{position:absolute;left:50%;top:50%;width:var(--len);height:1px;background:currentColor;
      transform-origin:0 50%;transform:translate(var(--x),var(--y)) rotate(var(--ang)) scaleX(0);
      transition:transform 280ms var(--ease-ink)}
  .ln.is-on{transform:translate(var(--x),var(--y)) rotate(var(--ang)) scaleX(1)}
  ```
  `--len`·`--ang`는 좌석 좌표가 바뀔 때만 JS가 계산한다(레이아웃 1회). 애니메이션은 `scaleX`뿐이다. `.ln`은 W7이 `screens.css`에 정의하고, W6(투표·말썽쟁이)과 W9(리플레이)가 같은 클래스를 쓴다.
- 화면 구조용 접두사(`.v-*`)는 쓰지 않는다. 연출 전용 클래스만 W7이 `.fx-*`로 `fx.js`/`screens.css` 안에서 정의할 수 있다.

### 5.5 접근성 (전 화면)
- 사유가 곧 문구인 비활성 버튼(`2명 부족`)은 `disabled` 대신 `aria-disabled="true"` — 포커스 가능해야 사유가 읽힌다.
- 지시문 띠, 토스트, `#conn`은 `role="status" aria-live="polite"`.
- 모달과 시트는 포커스를 가두고(focus trap), 닫으면 연 요소로 돌려준다.
- 심판 규칙 `?`는 hover 툴팁이 아니라 `<button aria-expanded>`.
- 좌석 토큰은 대상 상태에 `aria-pressed`.
- 독 카드 peek 시 `#sr`에 역할명을 공지(`예언자.`)하고, 놓으면 지운다.
- 길게 누르기는 키보드로도 동일(§6.3).

---

## 6. 화면별 레이아웃과 상호작용

### 6.1 HOME
- 배경: 키아트를 화면 가득 `cover`, 아래로 갈수록 `--void`로 사라지는 그라디언트. 로드 전엔 **인라인 LQIP**(§9.2) + void. **LQIP에 `filter` 금지** — `background-size:cover` + 브라우저 보간만.
- 레이아웃(모바일): 위 50% 키아트 + 그 위 제목 `한밤의 늑대인간`(`--fs-hero`, `--f-title`, `--bone-hi`, 가운데). 아래 50%:
  ```
  [ 이름            ]
  [ 마을을 연다 ]         ← 주 버튼(피)
  ─── 혹은 ───
  [ 표식 ____ ][ 들어간다 ]
                          법도 →   (오른쪽 아래 작은 텍스트 링크)
  ```
- 데스크톱(≥1024): 왼쪽 60% 키아트, 오른쪽 40% 세로 입력 영역, 제목은 키아트 위 왼쪽 위.
- **표식 입력은 칸 하나**: `<input maxlength="4" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="latin" enterkeyhint="go">` + `letter-spacing:.5em`, Hanbam T. `input` 이벤트에서 `toUpperCase()` 후 `/[^A-Z]/g` 제거(코드 알파벳은 이미 `I`·`O`·숫자 없음 — 서버 `genCode` 유지). 한글 IME로 들어온 자모도 이 단계에서 지워진다.
- `?room=K7QX`로 들어오면: 이름 칸 + 주 버튼 `K7QX 마을로 들어간다` + 링크 `다른 마을을 연다`. 표식 입력 숨김.
- 등장: 제목은 잉크가 번지듯, 제목 위를 덮은 `--void` 덮개 div가 `scaleX(1→0)`(`transform-origin:right`) 360ms `steps(6)`로 걷힌다(한 번. `clip-path` 애니메이션 금지, §8.2). 키아트는 로드 시 opacity 0→1 600ms.
- 홈 스타일은 전부 `base.css`에 있다(홈은 `game.css` 없이 완성되어야 함, §9.1).
- **삭제**: `ONE NIGHT · WEREWOLF`, `✦`, 태그라인 2줄, `.foot`(3~10명·10분·음성 통화), `또는 코드로 참가`.

### 6.2 LOBBY (모닥불)
- 탁자에 좌석이 둘러앉는다. 들어올 때 해당 좌석 토큰 scale 0→1 300ms. 빈자리는 그리지 않는다.
- 탁자 가운데(제단 자리)에 **이번 밤의 패**를 `sm` 카드 부채꼴로 겹쳐 펼친다(앞면). 패가 추가되면 위에서 떨어짐 `translateY(-20px)→0` 180ms.
- 탁자 위쪽에 표식 크게(`--fs-h1`, Hanbam T) + 그 아래 작은 버튼 `표식 베끼기`(링크 복사). HUD 표식도 같은 동작.
- 인원 표시: `불가에 3/10`.
- **덱 편집(촌장)**: 독 위로 올라오는 시트 `이번 밤의 패` — 12장 `sm` 카드 격자(모바일 4열 ≈ 82px 셀, 데스크톱 6열).
  - 각 셀 아래 `[−] n [+]`: 버튼 36×40, `::before`로 hit-area를 48×48까지 확장.
  - **카드를 탭하면** 시트 머리 아래에 그 역할의 설명 한 줄(`desc`)이 뜬다. 길게 누르기 없음. 수량은 `−`/`+`로만.
  - 0장인 카드는 `.is-zero`.
  - 상단 카운터 `이번 밤 7 / 7` — 맞으면 `--bone-hi`, 틀리면 `--blood-hot`. 경고(프리메이슨 1장, 늑대 0장)는 카운터 옆 작은 `!` 문양 `<button aria-expanded>` → 한 줄.
- 촌장의 배치(추천): 시트 상단 텍스트 버튼 `촌장의 배치`. 자동 적용 중이면 `인원에 맞춰 배치된다.`
- 촌장이 아닌 자: 같은 시트를 읽기 전용으로 볼 수 있음(`⋯` → `이번 밤의 패`). 카드 탭 설명은 동일.
- 낮의 길이: `⋯` 메뉴(촌장만) 세그먼트 `3분 5분 7분`.
- 독: 촌장 `[밤을 부른다]` — 조건 미충족이면 `aria-disabled` + 문구 자체가 이유(`2명 부족` / `패 6/7`). 촌장 아님: `aria-disabled` `촌장을 기다린다`.
- 내쫓기: 촌장이 좌석 토큰 길게 누름(600ms) → 작은 시트 `<b class="nm">민수</b>를 내쫓는다` 버튼(**1200ms** 길게 눌러 확정). `confirm()` 금지.
- **밤 시작 신호**: 서버가 `night`로 바꾸면 좌석 불빛(토큰 테두리)이 하나씩 80ms 간격으로 꺼지고 → 0.8초 완전 암전 → 카드 확인. 이 순간 모든 클라이언트가 화면 깨우기를 건다(§6.13).

### 6.3 비밀 규칙과 누르기 (전 화면 공통, 가장 중요)
- **내 카드는 기본이 뒷면.** 누르고 보기(peek):
  - `.dock-card`, `.card[data-peek]`, `.hold`에 `touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none`. **모든 버튼**에도 `user-select:none; -webkit-touch-callout:none`(iOS 돋보기 방지).
  - `pointerdown` → `el.setPointerCapture(e.pointerId)` → `#fx .peek`에 xl 앞면 표시(`.is-on`). `pointerup`/`pointercancel`/`lostpointercapture`/`visibilitychange`/`blur` → 해제. **`pointerleave` 해제는 쓰지 않는다**(capture 중엔 의미 없음). `contextmenu` preventDefault.
  - `.peek`의 xl 카드는 **`position:fixed; top:14vh; left:50%; transform:translateX(-50%)`** — 엄지 위로 떠오른다. 화면 가장자리 2px 피 비네트(`.peek::before`) = "지금 열려 있다".
  - xl 아래에 **반드시** 라벨(`--f-body` 13px `--bone-dim`): 보여주는 패가 처음 받은 패면 `처음 받은 패`, 밤에 새로 본 패(강도·불면증환자·도플갱어)면 `마지막으로 본 패`. 주정뱅이는 처음 받은 패를 `.is-unknown` 낙인과 함께.
- **길게 누르기 시간은 두 종류뿐**: 확정류 **600ms**(밤 행동, 처형 지목, 내쫓기 시트 열기), 파괴류 **1200ms**(떠난다, 내쫓는다, 지금 심판한다). 버튼 안 `.hold-fill`이 `scaleX` 0→1. 손을 떼면 0으로.
- 키보드: `.hold`에 포커스 후 Enter/Space `keydown`(`e.repeat` 무시)이 같은 타이머 시작, `keyup`에서 취소. 독 카드는 Space를 누르고 있는 동안 peek.
- `prefers-reduced-motion`: 게이지는 채워지지 않고 시간이 차면 한 번에 꽉 찬다.
- 밤에 알게 된 정보(`네가 본 것`. 「밤의 기록」은 결말 리플레이 §13의 이름이므로 쓰지 않는다)도 기본 `filter:blur(14px)` 정적 + 위에 `눌러야 보인다.` 누르는 동안만 해제(같은 pointer capture 규칙). 이 blur는 화면당 filter 2개 예산(§8.3)에 포함된다.
- 심판 화면에서는 내 카드를 아예 표시하지 않는다.
- `confirm()`/`alert()`/`prompt()` **전면 금지.**

### 6.4 NIGHT — 카드 확인 (`_check`, 서버 `CARD_CHECK: 13000`)
| 시점 | 연출 |
|---|---|
| 0–0.8s | 암전. 화면 가운데 `xl` 카드 뒷면이 어둠에서 opacity 0→1. 비네트 `::after` 심박 72bpm(0.83s) opacity .6↔1 |
| 0.8s~ | 카드 아래 `네 패다.` 그 아래 `누르고 있어라.` 맨 아래 `화면을 끄지 마라.`(`--smoke` 13px). 누르는 동안 앞면. **아트를 기다리지 않는다**: 폴백 카드로 즉시 공개 가능, 아트가 decode되면 `.card-art` opacity로 교체 |
| 앞면 첫 공개 순간 | 늑대 팀이면 `#fx .flash` 피색 opacity 0→.18→0 120ms. 마을은 종이색 .08. 무두장이 없음(정적). 진동 없음 |
| 7s 시점에 한 번도 안 눌렀으면 | `누르고 있어라.` 문구 1회 깜빡(opacity) |
| 마지막 1.2s | 카드가 뒷면 상태로 아래로 가라앉음(translateY 40px, opacity 0) → 눈꺼풀 닫힘 → `눈을 감아라.` |

- 남은 시간: 숫자 대신 카드 아래 1px 선이 양끝에서 가운데로 줄어든다(`scaleX`).
- 이 단계 이후 독의 내 카드(뒷면)는 계속 누르면 볼 수 있다.

### 6.5 NIGHT — 잠든 상태 (내 차례가 아닐 때)
- 화면 거의 검정. 탁자는 `opacity .12`로 가라앉음. 가운데 `눈을 감아라.`(`--fs-h2`, `--bone-dim`).
- 상단 한 줄: 현재 단계 내레이션 — **opacity .7, 15px, `--f-serif`, `--bone-dim`**, 글자당 40ms 지연 출력. 통화 중 "지금 누구 차례야?"에 화면이 답해야 한다.
- 단계 트랙: HUD 아래 1px 선 위 작은 점 — `steps`에서 `_check`를 **뺀** 개수(최대 9). 지난 점은 꺼지고, 현재 점은 `--bone-hi` 깜빡(opacity). **역할 이름·문양은 표시하지 않는다.**
- **"누군가 움직인다"**: 단계가 바뀔 때마다 0.4~2.5초 랜덤 지연 후 `#main` `translateX(±1px)` 2회(120ms) + 비네트 짙어짐. **행동 단계와 빈 단계에 동일하게** 적용해 정보가 새지 않게 한다.
- 독: 내 카드(누르면 봄) + `aria-disabled` 버튼 `잠들어 있다`. 채팅 배지는 `밤`으로 바뀌고 시트가 열리지 않음.

### 6.6 NIGHT — 깨어난 상태 (내 차례)
- 진입: 눈꺼풀(`.lid-t/.lid-b`, 각 50vh 검정)이 위아래로 열림(500ms `--ease-out`). 동시에 `light-night` 조명 원이 탁자를 비춤. `document.title = '● 눈을 떠라'`(차례 끝나면 원복). **진동 없음.**
- 지시문 띠(독 위 56px): `<역할명>. <지시문>` + 남은 시간 바.
- **고를 수 있는 좌석·제단 카드만 `.is-selectable`**, 나머지 `.is-dim`.
- **선택 문법(모든 역할 공통)**: ① 대상 탭 → `.is-target` 링. 다시 탭하면 해제. ② 독 주 버튼이 대상 이름과 함께 활성화(동사 `훔친다` / 대상 `<b class="nm">민수</b>`). ③ 돌이킬 수 없는 행동(예언자, 강도, 말썽쟁이, 주정뱅이, 도플갱어)은 **주 버튼 600ms 길게 누르기**로 확정.
- **공개된 카드는 탭할 때까지 유지**하고 아래에 `탭하면 덮는다.` 단계 종료 1.5초 전에는 자동으로 덮는다. 덮일 때 기록 배지에 피 점(`.dock-badge .dot`)이 찍힌다 = "기록이 생겼다". 시트를 열면 점이 사라진다.
- 역할별 (좌석·카드 식별은 서버가 보내는 `ids`/`reveal` 데이터로만, §7.4):
  - **도플갱어**: 좌석 1 → `얼굴을 훔친다`(600ms). 결과 카드 `md`로 그 좌석에서 앞면 → 탭하면 덮임. 즉시 행동 역할이면 덮인 뒤 같은 화면에서 이어서 그 역할 프롬프트.
  - **늑대인간**: `ids`의 동료 좌석에 피색 링 + `.seat-mark` `무리` 낙인. 혼자면 `너 혼자다.` + 제단 3장 selectable → 하나 탭하면 즉시 공개(보는 행동만, 길게 누를 필요 없음). 보조 링크 `보지 않는다`.
  - **하수인**: `ids`의 늑대 좌석에 피색 링 + `주인` 낙인. 주 버튼 `봤다`.
  - **프리메이슨**: `ids`의 형제 좌석에 `--bone-hi` 링 + `형제` 낙인. 없으면 `형제는 이 마을에 없다.` 주 버튼 `봤다`.
  - **예언자**: 좌석과 제단을 동시에 selectable. 좌석을 고르면 제단 dim, 제단을 고르면 좌석 dim(최대 2장). 주 버튼 `본다`(600ms). `reveal`의 카드가 그 자리에서 앞면 → 탭할 때까지 유지.
  - **강도**: 좌석 1 → `훔친다`(600ms) → 대상 좌석 카드와 `.dock-card`가 서로의 좌표로 교차 이동(360ms) → 새 패는 **누르고 있어야** 보인다(peek 라벨 `마지막으로 본 패`).
  - **말썽쟁이**: 좌석 2 → 두 좌석 사이 예고선(`.ln`, opacity .4, `scaleX` 280ms. §5.4) → `바꾼다`(600ms) → 두 엎어진 카드 교차. 보조 `손대지 않는다`.
  - **주정뱅이**: 제단 1 → `바꾼다`(600ms) → 제단 카드가 `.dock-card`로, 내 카드가 제단으로 교차. 독 카드에 `.is-unknown`. 건너뛰기 없음.
  - **불면증환자**: 지시 `네 패를 다시 봐라.` → 독 카드를 누르고 있으면 앞면(라벨 `마지막으로 본 패`). 주 버튼 `봤다`.
- 퇴장: `끝났다. 눈을 감아라.` 0.6초 → 눈꺼풀 닫힘 → **잠든 상태와 완전히 같은 화면**.
- ack가 오기 전까지 주 버튼은 `…` 상태로 잠금. 5초 타임아웃 시 1회 재전송(서버 멱등), 실패하면 토스트 `전해지지 않았다. 다시.`

### 6.7 새벽 → DAY
- `day` 수신: 암전 1.5초 유지 → `light-day`(회청) opacity가 아래에서 위로 2.5초에 걸쳐 오름. 따뜻한 해 금지.
- 헤드라인 `날이 밝았다.` → 1초 뒤 부제 `너는 아직 너인가.` → 3초 뒤 둘 다 페이드아웃.
- 레이아웃: 탁자(좌석 + 제단 3장 뒷면). HUD 타이머가 주인공(1.5배). 60초 미만에서 바가 `--blood`, 30초 미만 비네트 심박, 10초 미만 심박 2배 속도 + 숫자 `--blood-hot`.
- 내 카드: 독 왼쪽, 뒷면 + 금 간 효과(정적 SVG 균열 오버레이 opacity .5). 누르고 있으면 §6.3 라벨 규칙대로.
- 네가 본 것(밤에 알게 된 정보): 모바일·데스크톱 모두 **시트의 `기록` 탭**(데스크톱은 오른쪽 280px 서랍의 `속삭임 | 기록` 탭). 별도 기둥 없음.
- 독 주 버튼: 누르기 전 `심판하자`, 누른 뒤 `손을 내린다`(토글). 위에 작게 `손 든 자 3/6`. 손 든 좌석에 `.is-ready`.
- 촌장: `⋯` 메뉴 `지금 심판한다`(1200ms).
- 채팅: 기본 닫힘 + 새 메시지 한 줄 티커(독 위, 2.5초).
- **삭제**: `누가 늑대인간일까요?…`, `지금도 이 카드인지는 알 수 없습니다`, `모두 준비하거나…` 안내, 덱 칩 목록(→ `⋯` 메뉴 `이번 밤의 패`).

### 6.8 VOTE (심판)
- 진입: `#fx .flash` 피 80ms → `light-vote` 크로스페이드 600ms → 헤드라인 `지목하라.`(1.2초 후 작아져 지시문 띠로).
- 좌석 = 대상. 탭하면 **내 자리에서 대상까지 피색 선**(`.ln` 하나, `scaleX` 0→1 250ms. §5.4). 다른 좌석을 탭하면 선이 옮겨감. 독: 동사 `처형` / 대상 `<b class="nm">민수</b>`(600ms로 확정). 확정 후에도 바꿀 수 있음.
- 다른 사람이 투표하면 그 좌석에 `.is-voted` 봉인 점만. 대상은 숨김.
- 남은 10초: HUD 숫자가 매초 scale 1.3→1 떨어짐.
- 규칙: 지시문 띠 오른쪽 `?` `<button aria-expanded>` → 한 줄 `모두 한 표씩이면 아무도 죽지 않는다. 동표면 모두 죽는다.`
- 화면에 내 카드 표시 없음. 진동은 확정 시 `vibrate(12)` 허용(낮·심판만).

### 6.9 RESULT (결말) — 「밤의 기록」 리플레이로 대체
`result` 상태를 받으면 **§13 「밤의 기록」 시퀀스 하나**가 결말 전체를 맡는다. 예전의 12초 시퀀스(투표선 → 처형 → 전원 공개 → 판결)는 없어지지 않고 §13의 뒤쪽 세 막(새벽·심판·판결)으로 흡수되었다. 결말에는 두 화면만 있다.

| 화면 | 내용 | 정의 |
|---|---|---|
| **리플레이** | 서막(처음 패) → 밤(차례마다 박자) → 새벽(마지막 패, 바뀐 좌석마다 "처음 → 마지막, 이제 어느 편") → 심판(지목·처형·사냥꾼 연쇄) → 판결(배너·이유·내 한 줄·도장). 1배속 약 38~65초(×2면 절반). 탭 = 다음 박자, `건너뛴다` = 끝판 보드 | §13.4~13.7 |
| **끝판 보드** | 판결 배너 + `모든 기록`(사람별 패의 여정·믿은 패) + `그 밤에 일어난 일`(문장 목록). 독: 촌장 `다시, 밤으로` / 그 외 `aria-disabled` `촌장을 기다린다`, 보조 링크 `그 밤을 다시 본다` | §13.8 |

- 키 `result:<gameId>`(§7.4)로 **자동 재생은 1회만.** 재접속하거나 이미 본 결말이면 끝판 보드부터 보여 준다.
- 리플레이 모듈(`replay.js`)이 아직 도착하지 않았으면 끝판 보드(정적 `.rec-row` 목록 + 판결)를 W6이 먼저 그린다. 도착하면 §13.9의 규칙대로 재생하거나 `그 밤을 다시 본다`를 켠다. **결말은 리플레이 없이도 완결된다.**
- **표(`table.res`) 삭제.** `.rec-row`는 §5.4. **역할명을 글자로 표시한다**(썸네일만으로는 판독 불가). 처형된 줄은 취소선. 마지막 세 줄은 왼쪽·가운데·오른쪽 제단.
- **모바일(<600px)**: 끝판 보드에서는 `모든 기록`을 **기본으로 펼치고** 탁자는 위로 접는다(40px 띠, 탭하면 다시 펼침). 데스크톱은 탁자가 기본, `모든 기록`은 접힘.
- `그 밤에 일어난 일`: 검은 바탕, 왼쪽 1px 괘선, 줄마다 `xs` 카드 + 문장. 문장은 서버 문장이 아니라 §10.13 템플릿으로 클라이언트가 만든다. 각 줄 `content-visibility:auto`.

### 6.10 채팅 (속삭임)
- 모바일: 하단 시트 3단계 `#sheet[data-h]` — 0 닫힘(독 배지: 피 점 + 개수) / 1 엿보기 30vh(최근 4줄 + 입력) / 2 전체 85vh(끌어올리거나 머리 탭). 키보드가 뜨면 `visualViewport`로 시트를 키보드 위에 유지.
- 데스크톱(≥1024): 오른쪽 280px 서랍, 탭 `속삭임 | 기록`.
- 모양: 말풍선 없음. `.msg` 한 줄, 이름 `.msg-n.nm` `--bone-dim` 13px, 메시지 `--bone-hi` 15px, 시스템 메시지(`data-sys="1"`)는 `--smoke` + 앞에 1px 괘선.
- 밤: 시트 잠김, 배지 `밤`, 입력 placeholder `밤에는 입을 다물어라.`
- `#chatLog` 최대 150개 노드 유지. `#chatFab`, `toChat` 스크롤 동작 삭제.

### 6.11 법도 모달
- 화면 위에 **뼈색 종이 한 장**(`--bone` 바탕, `--ink` 글자, 이중 괘선) — 유일한 반전 표면. 모바일은 전체 화면 시트, 데스크톱은 720px 폭 2단. 본문 `--f-serif`.
- 상단 `법도` + 5줄 규칙(§10.11), 아래 `깨어나는 순서` — 역할마다 `sm` 카드 + 이름 + 한 줄 설명.
- 닫기: 오른쪽 위 X 문양 / 바깥 탭 / Esc. 포커스 트랩.

### 6.12 토스트
- 상단 가운데 얇은 띠(최대 92vw), `--char` 바탕, 왼쪽 3px 피 홈(`danger`) 또는 `--ash`(`info`). 1.8초. 위에서 `translateY(-100%)→0` 180ms `steps(4)`. 아이콘·이모지 없음.

### 6.13 로딩 / 콜드스타트 / 재연결 / 화면 깨우기
- **콜드스타트**: 정적 파일은 CDN에서 즉시 뜬다(§9.0). `<head>` 인라인 스크립트가 **즉시** `fetch(SOCKET_URL+'/healthz')`로 잠든 서버를 깨운다(첫 바이트와 동시에). 소켓 연결 전 주 버튼 위 한 줄 `마을을 깨운다 · 12`(초 카운터). 15초가 지나면 아래 작게 `깊이 잠든 마을이다. 1분은 걸린다.` 이름·표식 입력은 **활성** — 누르면 대기열에 넣고 연결되자마자 전송. 키아트 늑대 눈 위치에 CSS 점 2개가 opacity 숨쉬기(이 화면만의 무한 애니메이션 1개).
- `/healthz` 폴링: 1, 2, 4, 5, 5…초 백오프. 연결되면 문구 제거.
- **재방문**: Service Worker가 셸을 즉시 띄움(§9.6).
- **연결 끊김(게임 중)**: 최상단 고정 띠 `#conn` — `횃불이 꺼졌다. 다시 지핀다 · 3`. 마지막 화면 유지, 행동 버튼 전부 `aria-disabled`, 타이머는 흐리게 계속. 복귀 시 띠가 1초간 `돌아왔다.` 후 사라짐. 토스트 사용 안 함.
- 탭이 다시 보이거나 `online` 이벤트 시 `!socket.connected`면 즉시 `socket.connect()`.
- **화면 깨우기(Wake Lock)**: 밤 시작 신호를 받은 순간부터 결말까지 `navigator.wakeLock?.request('screen')`. `visibilitychange`로 보이는 상태가 되면 다시 요청. 결말·모닥불 복귀 시 해제. 지원하지 않으면 무시(카드 확인 화면의 `화면을 끄지 마라.`가 대신한다).
- **복귀 시 따라잡기**: 보이는 상태로 돌아왔을 때 처리할 프롬프트가 남아 있으면 연출 없이 바로 깨어난 화면으로 간다.

---

## 7. 렌더링 구조 (app.js 필수 변경)

### 7.1 문제
`setMain()`이 `main.innerHTML` 전체를 교체 → 연출 끊김, 등장 애니메이션 반복, 이미지 재디코드, 포커스 손실.

### 7.2 해결
1. **rAF 배치**: `socket.on('state')`는 `S`만 갱신하고 `scheduleRender()` → `requestAnimationFrame(render)` 1회.
2. **셸 + 영역 패치**: 페이즈가 바뀔 때만 셸을 새로 만든다. 셸 안 영역은 `data-r="hud|stage|prompt|dock|log|sheet"`. 각 영역은 `patch(name, html)` — 직전 문자열과 같으면 건너뜀.
3. **탁자(stage)는 문자열 교체 금지**: 좌석 DOM은 플레이어 집합이 바뀔 때만 재생성, 그 외에는 상태 클래스·텍스트만 갱신(`updateSeats(S)`).
4. **연출은 `#fx`/`fx.js`에서만.** `FX.play(key, fn)` — 재생한 키 Set. 화면 코드는 연출 완료를 기다리지 않는다.
5. **타이머**: 서버는 `endsAt`(epoch ms)과 `now`만 보낸다. 클라이언트는 state마다 `skew = S.now - Date.now()`, 남은 시간 = `endsAt - (Date.now() + skew)`. 1000ms 간격(초 경계 정렬), 값이 바뀔 때만 `textContent`. 서버는 1초마다 state를 재전송하지 않는다.
6. `speak()`(TTS) 기본값 **꺼짐**, 페이즈 전환 연출(1.2초)이 끝난 뒤 시작.
7. **진동 래퍼**: `FX.buzz(pattern)`만 쓴다. `document.body.dataset.phase==='night'`이면 아무것도 하지 않는다. 직접 `navigator.vibrate` 호출 금지.

### 7.3 모듈 API (파일 경로 고정)
- `public/strings.js`, `public/roles.js` — 루트 유지(서버가 require).
- `public/js/art.js`, `public/js/app.js`, `public/js/fx.js`, `public/js/replay.js` + `public/css/replay.css`(§13.9). 기존 `public/app.js`는 W6이 `public/js/app.js`로 옮기고 삭제.
- 배포 시 `strings → roles → art → app` 순서로 이어 붙여 `game.<hash>.js` 하나가 된다(§9.0). 각 파일은 전역 하나만 노출(`T`, `ROLES`, `ART`, 앱은 IIFE).

```js
// strings.js  → window.T (Node require 가능한 UMD)
T.title.*, T.btn.*, T.head.*, T.phase.*, T.verdict.*, T.stamp.*   // 디스플레이 그룹 (폰트 서브셋 대상)
T.body.*, T.narr.*, T.chat.*                                       // 비디스플레이 그룹
T.fmt(T.body.need, {n:2})       // 템플릿 치환
T.josa(word, pair)              // 계약 고정: pair ∈ '이/가'|'을/를'|'과/와'|'은/는'|'이다/다'|'이었다/였다'|'이라/라'|'으로/로'
                                //  '으로/로': 받침 없음 또는 ㄹ받침이면 '로'(예: 늑대인간으로, 하수인으로, 주정뱅이로, 무두장이로, 마을 편으로)
                                //  ('이었다/였다', '이라/라'는 3차 개정 추가 — 리플레이 자막 §10.13)
                                //  → word + 조사. 받침 판정 (code-0xAC00)%28 !== 0
                                //  끝 글자가 숫자면 한국어 읽기로 판정(0영 1일 3삼 6육 7칠 8팔 = 받침 있음)
                                //  끝 글자가 라틴 문자면 조사 대신 `${word} —` 를 반환 (예: 'Tom —')
                                //  → 이름이 문장 앞에 오는 서버 문장은 'Tom — 촌장이 되었다.'로 자연스럽게 읽힘
                                //  '이다/다': 받침 있으면 '이다', 없으면 '다' (예: 늑대인간이다, 하수인이다, 주정뱅이다)

// art.js → window.ART
ART.manifest            // = window.ART_MANIFEST (index.html 인라인, §9.0). 비어 있으면 전부 CSS 폴백
ART.card(roleId|null, {size, face, cls, label, flat})   // §4.5 HTML 문자열. flat:1 = 한 면, 3D 없음(리플레이)
ART.want(roleIds)       // 큰 아트 로드 요청(동시 2개, 이미 있으면 무시)
ART.prefetchDeck(deck)  // requestIdleCallback, data-net="slow"면 건너뜀
ART.ready(roleId)       // Promise<void>: decode 완료 또는 1500ms. 카드 확인 화면은 이것을 기다리지 않는다
ART.mark(root)          // root 안의 .card에 로드된 아트면 data-art="1" 즉시 부여
// art.js는 시작 시 :root에 이미지 URL CSS 변수를 설정한다:
//   --img-back --img-atlas --img-grain --img-horizon --img-home (url(...) 값). CSS에는 URL을 쓰지 않는다.

// fx.js → window.FX (game.css와 함께 홈 입력 가능 후 지연 로드. 로드 전 호출은 큐에 쌓였다 재생)
FX.lidsClose(ms), FX.lidsOpen(ms), FX.flash('blood'|'paper', ms), FX.shake(px, n)   // shake 대상은 #main
FX.heartbeat(level)     // 0 끔, 1 72bpm, 2 144bpm
FX.typeLine(el, text)   // 글자 지연 출력 (내레이션 전용)
FX.play(key, asyncFn)   // 1회 재생 보장
FX.peek(roleId|null, label) / FX.unpeek()   // #fx .peek xl 카드
// FX.resultSequence는 삭제 — 결말 시퀀스는 REPLAY가 소유한다(§13). REPLAY는 FX.shake/flash를 호출만 한다.
FX.swap(elA, elB)       // 두 카드 교차 이동 (내 카드는 .dock-card)
FX.buzz(pattern)        // 밤엔 무시 (§7.2-7)
FX.skip()               // 진행 중 시퀀스 즉시 종료

// replay.js → window.REPLAY (UMD. 심판 진입 시 idle 지연 로드, §9.4. Node에서는 build만 쓴다)
REPLAY.build(R, meId)   // 순수 함수: 결과 페이로드 → {beats, total, journey, belief, lines}. DOM·시간·난수 없음 (§13.9)
REPLAY.open(R, meId, {autoplay, mount:{main, dock, hud}, onDone})  // 무대 생성 + 재생. onDone = 끝판 보드로
REPLAY.seek(beat) / REPLAY.next() / REPLAY.prev() / REPLAY.toggle() / REPLAY.rate(1|2) / REPLAY.skip()
REPLAY.enhanceBoard(listEl, R, meId)  // 끝판 보드의 .rec-row에 여정·믿은 패를 끼우고, 그 밤에 일어난 일 목록을 채운다
REPLAY.close()          // 애니메이션 cancel, .rp 제거, 참조 해제 (로비 전환·playAgain)
```

### 7.4 서버 → 클라이언트 데이터 계약 (W1이 구현, W6이 소비)
- **게임 식별자**: `startGame`마다(방마다가 아니라 판마다) `g.id = crypto.randomBytes(4).toString('hex')`. `다시, 밤으로` 뒤의 새 판은 반드시 새 id다(자동 재생 키 `result:<gameId>`). 모든 `state`에 `gameId`, `room.result.gameId`에도 복사.
- **정보 프롬프트**(늑대·하수인·프리메이슨): 기존 `{type:'info', title, text}`에 **`ids:[playerId]`** 추가.
- **모든 밤 행동 ack**: `{ok, text, reveal:[{at:'p', id, role} | {at:'c', idx, role}]}`. 예언자·강도·도플갱어·외로운 늑대·불면증환자가 본 카드만. 말썽쟁이·주정뱅이는 `reveal:[]`.
- `S.myLog` 항목은 `{text, reveal}`.
- **금지 키**: 이 페이로드에 `original`, `cards`, `center` 키를 쓰지 않는다(`test/sim.js:100`이 정보 누출로 실패시킨다). 3차 개정으로 `night`, `deal`, `pos`, `ev`, `seats`, `why`, `deaths` 키도 추가한다. 검사는 **키 패턴** `/"(original|cards|center|night|deal|pos|ev|seats|why|deaths)":/`으로 한다(`"phase":"night"` 같은 값과 혼동하지 않도록).
- **결과 페이로드만 예외**: `phase==='result'`인 `state`의 `result` 안에서만 위 키가 허용된다. 스키마는 §13.3. `timeline`(서버 한국어 문장)과 `hunterKills`는 `night`·`deaths`·`why`로 대체된다. 단 **한 릴리스 동안** 옛 클라이언트가 깨지지 않도록 `hunterKills`(기존 모양)와 빈 `timeline:[]`을 함께 보내고, 다음 릴리스에서 지운다. 배포 순서는 새 클라이언트 먼저, 서버 나중(§13.3).
- `state`는 변화가 있을 때만 보낸다. 크기: 결과 `state` ≤ 6KB(`night` 포함), 그 외 ≤ 3KB(10인).

---

## 8. 모션 규칙

### 8.1 토큰
```css
:root{
  --t-tap:60ms; --t-ui:180ms; --t-enter:360ms; --t-flip:520ms; --t-lid:500ms; --t-phase:1100ms;
  --t-hold:600ms; --t-hold-x:1200ms;
  --ease-out:cubic-bezier(.2,.7,.1,1);
  --ease-press:cubic-bezier(.7,0,.3,1);
  --ease-ink:steps(5,end);
}
```

### 8.2 문법: "느린 공포, 빠른 폭력"
- **정적이 기본.** 큰 사건 직전 0.5~1.2초 아무것도 움직이지 않는다(결과 시퀀스, 새벽, 밤 시작).
- **조작 피드백은 즉시**: 탭 `scale(.96)` 60ms. 버튼 누름 = `translate(2px,2px)` + 하드 그림자 사라짐(도장 찍기).
- **잉크 등장**: 글자 위를 덮은 `--void` 덮개 div의 `scaleX(1→0)`(`transform-origin:right`) + `steps(5)` 360ms — 제목·판결 배너·리플레이 자막 같은 작은 요소에만. `clip-path`는 애니메이션하지 않는다(정적 다각형만 허용).
- **오류**: `translateX(±4px)` 3회. 진동은 `FX.buzz([10,40,10])` — 밤에는 자동으로 무시된다.
- **진동 정책**: 밤 전체 금지. 낮·심판에서만 확정 피드백 `12ms`, 오류 `[10,40,10]`.
- 바운스, 스프링, 컨페티, 파티클 **금지.**

### 8.3 하드 규칙
- 애니메이션/트랜지션 대상 속성: **`transform`, `opacity`만.**
- 정적 `filter`/`mask`: 한 화면 최대 2개, 움직이는 레이어 아래에 두지 않는다. 정적 `clip-path` 다각형(리본, 찢김)은 여기에 포함하지 않는다. `mix-blend-mode`는 0개.
- `will-change`는 애니메이션 동안만 JS로 붙였다 `transitionend`에서 제거.
- `preserve-3d`는 밤·카드 확인의 카드 플립에만, `backface-visibility:hidden`. **리플레이 카드는 평면**(`flat:1`)이고 뒤집기는 2D `scaleX`다(§13.5).
- 결과 공개 외에는 동시에 1장만 플립. 리플레이 서막의 2D 물결(§13.4)은 120ms 간격, 동시 최대 6장. lite는 물결 없이 단일 크로스페이드.
- 페이즈 전환은 1100ms 이하 opacity 크로스페이드.
- **선은 `.ln`의 `scaleX`로만 긋는다.** SVG `stroke-dashoffset`(페인트 애니메이션)은 금지(§5.4).
- **리플레이(§13)**: 한 박자에 움직임 한 종류. 동시에 움직이는 요소 최대 **4개**(빛 1 + 카드 2 + 선 1), 예외는 서막·새벽 물결(카드 6). 어둠(`.rp-dim`, 수십 개 요소)은 트랜지션 없이 빛이 꺼진 프레임에 클래스로 바꾼다. 승격 레이어(`will-change`) 동시 **8개 이하.** 박자 준비 때 레이아웃 1회(선 길이·좌표 계산) 외에는 레이아웃·페인트를 일으키지 않는다. 리플레이 중 무한 애니메이션 0개.

### 8.4 무한 애니메이션 허용 목록 (화면당 동시 최대 3개, lite 등급에선 0~1개)
1. `.is-selectable` 테두리 맥동 (밤 깨어남, 심판)
2. 비네트 심박 (카드 확인, 낮 30초 미만)
3. 단계 트랙 현재 점 깜빡임 (밤)
4. 콜드스타트 두 눈 숨쉬기 (연결 전)
결말(리플레이·끝판 보드)에는 무한 애니메이션이 없다.
`document.hidden`이면 리플레이는 일시정지하고(WAAPI `pause()`, §13.9), `body.paused *{animation-play-state:paused}`.

### 8.5 성능 등급 (두 축으로 분리)
`<head>` 인라인 스크립트(≤ 400B):
- **기기 축 `data-perf="lite"`**: `navigator.deviceMemory<=2 || navigator.hardwareConcurrency<=2 || connection.saveData`. → 무한 애니메이션 끔, 흔들림 끔, 플립은 크로스페이드.
- **망 축 `data-net="slow"`**: `connection.saveData || /2g|3g/.test(connection.effectiveType)`. 추가로 런타임에 `performance.getEntriesByType('navigation')[0].responseStart > 1500`이면 `slow`로 내린다(iOS엔 `effectiveType`이 없으므로). → 홈 키아트·지평선·판결·idle 선로딩 생략, 역할 아트는 lite 360px만 필요할 때.
- 두 속성 모두 `<html>`에 둔다(body는 아직 없다).
- `prefers-reduced-motion: reduce`: 흔들림·섬광·맥동 끔, 페이드만.
- 리플레이의 등급별 처리는 §13.10. 원칙: **움직임은 줄여도 정보(자막·표식·선 자국)는 줄이지 않는다.**

---

## 9. 성능 예산과 배포·이미지 파이프라인 (하드 제약)

> 번호 순서상 §9지만 가장 먼저 지켜야 할 장이다.

### 9.0 배포 구조 (확정)
- **정적 파일은 Render Static Site(CDN, 잠들지 않음)로 분리한다.** 웹 서비스는 소켓과 `/healthz`만 담당한다. Render 무료 웹 서비스는 잠들면 첫 HTML조차 30~60초 늦으므로, 분리하지 않으면 §6.13 콜드스타트 화면은 영원히 보이지 않는다.
- 저장소 루트 `render.yaml`(W5): 웹 서비스(`node server.js`) + 정적 사이트(빌드 명령 `node tools/stamp.js`, 게시 폴더 `dist`). 정적 사이트 헤더: `/a/*` → `Cache-Control: public, max-age=31536000, immutable`, `/`·`/index.html`·`/sw.js` → `no-cache`.
- **`tools/stamp.js`** (CJS, 의존성 0 — 번들러·트랜스파일 없음, 이어 붙이기와 토큰 치환만):
  1. `strings.js + roles.js + js/art.js + js/app.js` → `dist/a/game.<hash>.js`
  2. `css/card.css + css/screens.css` → `dist/a/game.<hash>.css`
  3. `js/fx.js` → `dist/a/fx.<hash>.js`, `js/replay.js`(안의 `__REPLAY_CSS__` 토큰을 `css/replay.css`의 JSON 문자열로 치환) → `dist/a/replay.<hash>.js`, `vendor/socket.io.4.8.1.min.js` → `dist/a/sio.<hash>.js`, 폰트·이미지 해시 파일 → `dist/a/`
  4. `public/index.html`(템플릿)의 토큰 치환: `__BASE_CSS__`(base.css 인라인), `__FONT_T__`/`__FONT_D__`, `__LQIP__`, `__MANIFEST__`(`window.ART_MANIFEST=…` 인라인, ≤1.5KB), `__GAME_JS__`, `__GAME_CSS__`, `__FX_JS__`, `__REPLAY_JS__`(`__FX_JS__`와 같은 방식으로 URL만 인라인, 요청은 하지 않음), `__SIO__`, `__SOCKET_URL__`, `__VER__` → `dist/index.html`
  5. `dist/sw.js`에 `__VER__`와 precache 목록 치환
- **로컬 개발·단일 출처 폴백**: `server.js`가 시작 시 `require('./tools/stamp.js').build({memory:true})`로 같은 결과를 메모리에 만들고, 텍스트 자산을 **시작 시 1회** `zlib.brotliCompressSync` + gzip으로 미리 압축해 `Accept-Encoding`에 맞춰 응답(`Vary: Accept-Encoding`). 요청마다 압축하지 않는다. `compression` 의존성은 쓰지 않는다. 정적 사이트를 만들기 전에도 이 경로로 동작한다.
- 클라이언트: `const SOCKET_URL='__SOCKET_URL__'`(같은 출처면 `''`). `io(SOCKET_URL,{transports:['websocket','polling'],tryAllTransports:true})` — 롱폴링부터 시작해 업그레이드하는 2~3 RTT를 없앤다.
- `<head>`에 `<link rel="preconnect" href="__SOCKET_URL__" crossorigin>`.

### 9.1 바이트 예산 (전송량, br/gzip 후)
| 구간 | 상한 | 비고 |
|---|---|---|
| **크리티컬 패스** (홈 폼 입력 가능까지) | **≤ 75KB, 요청 ≤ 5개**, 제3자 도메인 0 | 아래 4개 + 여유 1 |
| ├ `index.html` (base.css·SVG 스프라이트·LQIP·manifest·@font-face 인라인) | ≤ 16KB | base.css ≤ 7KB, 스프라이트 ≤ 3KB, LQIP ≤ 1.2KB, manifest ≤ 1.5KB |
| ├ `hanbam-t` 제목 폰트 (preload) | ≤ 10KB | §3 |
| ├ socket.io 클라이언트 (`sio.<hash>.js`, defer) | ≈ 15KB | 버전 고정 사본 |
| └ `game.<hash>.js` (strings+roles+art+app, defer) | ≤ 26KB | 크리티컬 합계 75KB 유지 |
| 홈 입력 가능 후 지연 로드 | `game.css` ≤ 10KB, `fx.js` ≤ 5KB, `hanbam-d` ≤ 30KB | 홈에는 필요 없음 |
| 심판 진입 후 idle 지연 로드 | `replay.<hash>.js` **≤ 18KB** (JS ≈ 5 + 인라인 CSS ≈ 1.5 + 문양 5종 ≈ 0.4) | §13.9. `fx.js` 5KB 예산과 별개. 결말 이미지 0장 추가 |
| 홈 키아트 | 데스크톱 ≤ 80KB / 모바일 ≤ 45KB | `load` 후 `fetchpriority=low`. slow면 생략 |
| 모닥불 추가 (아틀라스 + 뒷면 + 지평선 + 그레인) | ≤ 130KB | 55 + 35 + 35 + 4 |
| idle 선로딩 (이번 덱의 큰 아트) | ≤ 400KB | 취소 가능, slow면 생략 |
| 캐시 없이 한 판 전체 | **≤ 900KB** | |
| 재방문 (SW) | ≤ 15KB, 셸 표시 ≤ 300ms | |
| 단일 파일 상한 | **80KB** | 넘으면 반려 |
| 홈 TTI 최악 추정 | **≤ 3.0s** | 4×300ms RTT + (html+sio+game.js+game.css+hanbam-t+key-m)/125KB/s. 1MB/s 는 1Mbit/s 최악으로 본다. `result.js` ≤ 7KB |
| 소켓 `state` | 결과 ≤ 6KB(그중 `result.night` ≤ 1.5KB), 그 외 ≤ 3KB (10인, 이름 최대 길이) | §7.4, §13.3. 압축 없이 측정(socket.io `perMessageDeflate` 꺼짐) |

목표: 1MB/s · RTT 300ms · 캐시 없음 → 홈 입력 가능 ≤ 2.0s, LCP ≤ 3s, CLS < 0.05. 재방문 ≤ 300ms. 이미지 요청 전부 차단해도 한 판 끝까지 플레이 가능.

### 9.2 이미지 규격 (전부 WebP만. AVIF·PNG·JPG 배포 금지)
| 자산 | 원본(gpt-image) | 출력 | 인코딩 | 상한 |
|---|---|---|---|---|
| 역할 큰 아트 ×12 | 1024×1536 | 위아래 51px 크롭 → 1024×1434 → **560×784** | q62, `preset:'drawing'`, `effort:6`, `smartSubsample` | **≤ 40KB** |
| 역할 lite 아트 ×12 | 〃 | 360×504 | q58 | ≤ 18KB |
| 썸네일 아틀라스 1장 | 12장 합성 | 176×246 타일, **2행 × 6열 = 1056×492** (`ROLE_ORDER` 순) | q60 | ≤ 55KB |
| 카드 뒷면 | 1024×1536 | 왼쪽 절반 거울 복사 → 560×784 + LQIP 20×28 | q60 | ≤ 35KB |
| 홈 키아트 (데스크톱) | 1536×1024 | 1280×853 → 위 10%·아래 15% 크롭 → **1280×640**, 나머지는 CSS `--void` | q55 | ≤ 80KB |
| 홈 키아트 (모바일) | 같은 원본 | 가운데 640×1024 크롭 → **540×864** | q55 | ≤ 45KB |
| 홈 키아트 LQIP | 〃 | 데스크톱 24×12, 모바일 12×20 → base64 인라인 | q40 | 합계 ≤ 1.2KB |
| 지평선 배경 (권장) | 1536×1024 | 하단 1536×480 크롭 → **1280×400** | q55 | ≤ 35KB |
| 판결 배경 ×3 (선택) | 1536×1024 | 960×640 | q55 | 각 ≤ 35KB |
| 그레인 타일 | 스크립트 생성 | 128×128 회색 노이즈 | q50 | ≤ 4KB |

### 9.3 파이프라인 (`tools/optimize-images.mjs`, devDependency `sharp`, 오프라인 실행)
1. 오너가 준 PNG를 `art-src/`에 파일명 그대로 둔다(`card-werewolf.png` 등, 배포 안 함).
2. **3색 재인쇄(duotone) — 모든 이미지 공통.** 생성 이미지의 종이 톤·색 드리프트를 완전히 없앤다.
   a. 크롭(위 표). 카드 뒷면은 왼쪽 절반을 좌우 반전해 오른쪽에 덮어써 완벽한 대칭을 만든다.
   b. **피 마스크**: 원본 RGB에서 `R − max(G,B) > 50`인 픽셀 = 피.
   c. 나머지는 그레이스케일 → `normalise({lower:1, upper:99})` → `median(3)`(잡티·머리카락 선 제거, 원본 해상도에서) → **선형 LUT**: 검정 → `--ink #0d0b09`(배경류는 `--void #070606`), 흰색 → `--bone #d9cbb0`.
   d. 피 마스크를 평탄한 `--blood #8e0f0f`로 다시 합성.
   e. 리사이즈 → WebP(§9.2 설정). 결과: 모든 카드가 정확히 같은 3색, 런타임 합성 불필요, 파일 25~35% 감소.
3. **용량 사다리**: 40KB(또는 표의 상한)를 넘으면 q56으로 재시도 → 그래도 넘으면 480×672로 재시도 → 그래도 넘으면 실패(오너에게 "선이 너무 촘촘하다 — 재생성" 보고).
4. 파일명에 내용 해시 8자(`werewolf.1a2b3c4d.webp`) → `public/img/`.
5. 아틀라스: 큰 아트를 176×246으로 줄여 2행 × 6열. 아트가 없는 역할 칸은 투명(CSS 폴백이 보이게).
6. LQIP → `art-src/lqip.json` (stamp가 `__LQIP__`로 인라인).
7. 그레인: sharp로 128×128 가우시안 노이즈 → `public/img/grain.<hash>.webp`.
8. 결과 경로 목록을 `public/art-manifest.json`으로 기록(stamp가 `__MANIFEST__`로 인라인, ≤ 1.5KB).
9. **검사 2종(구현 완료 조건)**:
   - `tools/check-budget.mjs`: `dist/` 파일을 br 압축 측정해 §9.1·§9.2 표와 대조, 초과 시 exit 1. 폰트 상한(제목 10KB, 디스플레이 30KB) 포함.
   - `tools/check-waterfall.mjs`: 차가운 클라이언트처럼 `/`를 요청하고 preload·script·link를 따라가 **홈 입력 가능 전 요청 ≤ 5개, 전송량 ≤ 75KB, 제3자 호스트 0**(허용: 정적 출처, `SOCKET_URL` 출처)을 단언.

### 9.4 로딩 전략
| 화면 | 받는 것 |
|---|---|
| 첫 방문 HTML | 크리티컬 패스만(§9.1). LQIP·manifest 인라인. `hanbam-t` preload. head에서 `/healthz` 깨우기 |
| 홈 입력 가능 후 | `game.css`·`fx.js` 주입, idle에 `hanbam-d` FontFace 로드. `load` 후 홈 키아트(`fetchpriority=low`, 미디어 쿼리 분기). slow면 키아트 생략 |
| 모닥불 진입 | `hanbam-d`(아직이면), card-back, atlas, horizon, grain (`new Image()`+`decode()`) |
| 모닥불에서 덱 확정 시 | `ART.prefetchDeck(deck)` — idle, 동시 2개, 이번 덱의 고유 역할 큰 아트만 |
| 밤 시작 | 내 역할 큰 아트 최우선(`ART.want([myRole])`). 카드 확인은 0.8초에 폴백 카드로 공개, 아트는 도착 시 opacity 교체 — **절대 빈 카드 금지** |
| 밤 중 정보 | `reveal`된 카드만 즉시 요청 |
| 심판 진입 | 판결 배경은 받지 않음. `requestIdleCallback`(최대 2초)으로 `replay.<hash>.js` 주입(§13.9). `data-net="fast"`이면 이번 덱 큰 아트 중 아직 없는 것을 `ART.want()`(동시 2개, 취소 가능). slow면 replay.js만 |
| 결과 | **리플레이는 이미지를 기다리지 않는다.** 필수 이미지는 이미 받은 아틀라스·뒷면뿐. 결과 수신 즉시 ① 처형된 패의 큰 아트(최우선) ② 판결 배경 1장(fast만)을 요청. 리플레이의 확대 카드는 `ART.ready(role)`가 이미 끝난 경우에만 큰 아트, 아니면 아틀라스 타일. 끝판 보드는 아틀라스, 큰 아트는 탭한 카드만 |
| 결과 (lite) | 큰 아트를 DOM에 동시 2장까지만(확대 카드 1 + 처형 카드 1). 디코드 메모리 장당 ≈1.76MB |

### 9.5 서버 (server.js)
```js
const io = new Server(server, {
  serveClient:false,                          // 클라이언트는 vendor 사본을 immutable로 (socket.io 자체 서빙은 max-age=0 + 요청마다 압축)
  cors:{ origin:[process.env.STATIC_ORIGIN].filter(Boolean) },
  pingInterval:20000, pingTimeout:25000,
  connectionStateRecovery:{ maxDisconnectionDuration:120000 } });
app.get('/healthz', (req,res)=>{ res.set('Access-Control-Allow-Origin', process.env.STATIC_ORIGIN||'*'); res.send('ok'); });
// 같은 출처 폴백: stamp.build({memory:true}) 결과를 미리 압축해 서빙 (§9.0)
```
- `public/vendor/socket.io.4.8.1.min.js`: `node_modules/socket.io/client-dist/socket.io.min.js` 사본(W5의 `tools/vendor.mjs`가 복사, 버전은 package-lock과 일치 검사).
- `CARD_CHECK` 10000 → **13000**. `LOBBY_GRACE` 30000 → **60000**.
- 타이머는 `endsAt`만 보낸다(현재 `stepEndsAt` 유지). `state`는 변화 시에만. 1초 타이머로 state 재전송 금지.
- 밤 행동·투표 핸들러는 **멱등**(같은 행동 재전송 시 같은 ack). 클라이언트는 `socket.timeout(5000).emit` + 1회 재시도.
- §7.4 데이터 계약(`gameId`, `ids`, `reveal`).
- **밤 기록은 구조화 이벤트만**(§13.2). `g.timeline`·`timeline()`·`label()`은 삭제. 카드 교환은 반드시 `swapSlots()` 하나로만 한다.

### 9.6 Service Worker (`public/sw.js` 템플릿, ≤ 3KB)
- install: 셸 precache(`/`, `game.js`, `game.css`, `fx.js`, `sio.js`, 두 폰트, card-back). 캐시명 `hb-<VER>`. 모든 URL은 해시 파일명이라 버전 쿼리 불필요.
- fetch:
  - 내비게이션 = **stale-while-revalidate**: 캐시 셸을 즉시 응답하고 백그라운드로 새 HTML을 받는다. 콜드 서버를 3초씩 기다리지 않는다.
  - `/a/` = cache-first(런타임 상한 60개, 오래된 것부터 삭제). `replay.<hash>.js`는 precache하지 않고 이 규칙으로 캐시된다(첫 판의 심판 진입 때 받는다).
  - `SOCKET_URL` 출처, `/socket.io/`, `/healthz` = 가로채지 않음.
- 새 버전 감지(`VER` 변경) 시: **게임 중에는 절대 새로고침하지 않는다.** 홈·모닥불·결말에서만 토스트 `새 법도가 내려왔다.` → 다음 홈 진입 때 적용.
- activate: 이전 캐시 삭제 + `clients.claim()`.
- 등록: `load` 후 `requestIdleCallback`.

### 9.7 이미지 없이 동작하는 폴백 (필수 검증 항목)
- 카드: 종이 여백 + 먹 판 + 해칭 + 큰 역할 문양 + 리본 + 순서 + 팀 문양 = 완성된 카드.
- 뒷면: ink + back-mark SVG + 해칭.
- 홈: LQIP(`filter` 없이 `background-size:cover`, 브라우저 보간만. **블러 금지**) + void 그라디언트 + 제목.
- 배경: `--void` + 조명 그라디언트 + 그레인(그레인 타일 없으면 생략).
- 판결: 검은 띠 + 거대한 판결 문장.
- 리플레이: 아틀라스까지 없어도 폴백 카드(문양 + 이름)와 자막만으로 끝까지 재생된다. replay.js 자체가 오지 않아도 끝판 보드로 결말이 완결된다(§6.9).

---

## 10. 카피 덱 (모든 한국어 문자열)

> **단일 출처는 `design/COPY_DECK.md`입니다.** 아래 10.1~10.13의 예시 문구는 옛 문체(촌장 반말, 마을·표식·패·제단·법도)로 쓰인 것이어서 **효력이 없습니다.** 구조(어느 화면에 어떤 키가 쓰이는지)만 참고하고, 실제 문구는 COPY_DECK.md의 표와 `public/strings.js`·`public/roles.js`를 따릅니다.

### 10.0 보이스 원칙 (COPY_DECK.md 1~2절 요약)
1. **버튼은 "-기" 명사형.** 누를 수 있는 모든 컨트롤(버튼, 메뉴 항목, 아이콘 버튼 aria-label)이 대상: 방 만들기, 참가하기, 건너뛰기, 투표하기. 비활성 상태 표시(대기 중, 방장 대기 중)와 ×1/×2는 예외.
2. **탭·섹션 제목·열 이름은 일반 명사**(채팅, 기록, 게임 규칙, 카드 구성, 결과).
3. **안내·상태·내레이션·오류·토스트는 합니다/하세요체.** 반말과 고어투 명령형(~하라, ~해라, ~한다)은 쓰지 않는다. 다시 시도시키는 오류는 "~해 주세요".
4. 호칭: 문장 안에서 꼭 필요할 때만 "당신". 짧은 라벨은 "나". "너"는 쓰지 않는다.
5. 정식 한글판 보드게임 앱처럼 쓴다. 비유·꾸민 말·가짜 위협조 금지. 긴장감은 내레이션 내용과 그림이 만든다.
6. 밤 내레이션은 공식 앱 진행자 문체("○○은/는 눈을 뜨세요. ~할 수 있습니다." / "모두 눈을 감으세요."). TTS이므로 쉼표를 최소로.
7. 용어: 카드(패 아님), 가운데 카드 1/2/3(제단 아님), 방 / 방 코드 / 방장 / 대기실, 투표(처형은 투표로 죽는 것, 사냥꾼 효과는 "죽다"), 마을 팀 / 늑대인간 팀 / 무두장이 팀, 결과, 규칙, 채팅, 닉네임. 역할 이름은 줄이지 않는다(늑대 아님, 늑대인간).
8. 닉네임은 항상 `<b class="nm">`. 조사는 `T.josa()`/`T.fmt()`. **판정할 수 없는 이름(라틴 등)은 괄호 병기**: 이(가), 을(를), 은(는), 과(와), (으)로. 옛 "괄호 표기 금지"와 " —" 폴백은 폐기. 새 조사 쌍은 JOSA 표에 있는 것만 쓴다.
9. 이모지 0, 느낌표 0. 표기는 `한밤의 늑대인간` 하나, 영어 부제 금지.
10. 길이 제한: 밤 띠(56px)에는 44자 이하의 안내만, 리플레이 자막은 위 줄 46자 이하(2줄 안), NIGHT_TEXT는 40자 안팎.

### 10.1 문서/전역 (index.html)
| 위치 | 현재 | 변경 |
|---|---|---|
| `<title>` | 한밤의 늑대인간 온라인 | 한밤의 늑대인간 |
| meta description | 친구들과 브라우저로… | 하룻밤. 한 번의 심판. 늑대를 찾아 처형하라. |
| 파비콘 | 🐺 이모지 SVG | 인라인 SVG: void 바탕 피색 늑대 눈 두 틈 |
| theme-color | #070914 | #070606 |
| `.brand` | ☾ 한밤의 늑대인간 | **삭제** |
| 🔈/🔊 | 버튼 | `⋯` 메뉴 `목소리를 켠다` / `목소리를 끈다` |
| 📖 | 버튼 | `⋯` 메뉴 `법도` |
| 🚪 | 버튼 | `⋯` 메뉴 맨 아래 피색 `떠난다`(1200ms) |
| `💬 채팅` | 헤더 | `속삭임` |
| 채팅 placeholder | 메시지 입력… | 말하라 |
| 전송 | 전송 | (아이콘 `↵` SVG, aria-label `보낸다`) |
| `#chatFab` | 💬 | **삭제** (독 배지로 대체) |

### 10.2 홈
| 현재 | 변경 |
|---|---|
| ONE NIGHT · WEREWOLF / ✦ / 태그라인 2줄 | **삭제** |
| 닉네임 (라벨) | **삭제** (placeholder만) |
| 닉네임 (최대 12자) | 이름 |
| 새 방 만들기 | 마을을 연다 |
| 또는 코드로 참가 | 혹은 |
| 방 코드 4자리 | 표식 |
| 참가 | 들어간다 |
| 방 ${code} 참가하기 | ${code} 마을로 들어간다 |
| 대신 새 방 만들기 | 다른 마을을 연다 |
| 📖 게임 방법 · 역할 설명 | 법도 |
| 3~10명 · 한 판 약 10분 · 음성 통화와 함께하면 더 재밌어요 | **삭제** |
| 닉네임을 입력하세요. | 이름을 대라. |
| 4자리 방 코드를 입력하세요. | 표식은 네 글자다. |
| (콜드스타트) | 마을을 깨운다 · ${s} / 깊이 잠든 마을이다. 1분은 걸린다. |

### 10.3 모닥불 (로비)
| 현재 | 변경 |
|---|---|
| 방 ${code} (상단) | 표식 ${code} |
| 방 코드 (라벨) | 표식 |
| 🔗 초대 링크 복사 | 표식 베끼기 |
| 초대 링크를 복사했습니다! | 표식을 베꼈다. 부를 자에게 넘겨라. |
| 초대 링크 / 아래 링크를 복사해서… (복사 실패 폴백 모달) | 표식 / 이 주소를 넘겨라. |
| 플레이어 ${n} | 불가에 ${n}/10 |
| 최소 3명이 필요합니다. 친구를 초대하세요! | 아직 ${need}명이 오지 않았다. |
| 👑 방장 | 촌장 (열쇠 문양) |
| 나 | 너 |
| 연결 끊김 | 자리를 비움 |
| 내보내기 (✕) | 내쫓는다 |
| ${name}님을 내보낼까요? | `<nm>`${을/를} 내쫓는다 (1200ms) |
| 방장에 의해 방에서 나가게 되었습니다. | 너는 마을에서 쫓겨났다. |
| 게임 설정 | (삭제 — `⋯` 메뉴로) |
| 낮 토론 시간 | 낮의 길이 |
| 카드는 인원 + 3장을 사용합니다… | 패는 인원보다 셋 많다. 남은 셋은 제단에 엎는다. |
| 사용할 카드 (덱 시트 제목) | 이번 밤의 패 |
| ${total} / ${need}장 | 이번 밤 ${total} / ${need} |
| ✨ 추천 구성 | 촌장의 배치 |
| 인원에 맞는 추천 구성이 자동으로 적용되고 있습니다. | 인원에 맞춰 배치된다. |
| ⚠ 프리메이슨은 보통 2장을 함께 넣습니다. | 프리메이슨은 둘이어야 서로를 안다. |
| ⚠ 늑대인간이 없습니다. 괜찮나요? | 늑대 없는 밤이다. |
| 🌙 게임 시작 | 밤을 부른다 |
| 3~10명이 필요합니다. (비활성 사유) | ${need}명 부족 |
| 카드를 정확히 ${need}장으로 맞춰주세요. | 패 ${total}/${need} |
| 방장이 게임을 시작하기를 기다리는 중… | 촌장을 기다린다 |
| 방에서 나가시겠습니까? | 마을을 떠난다 (1200ms) |

### 10.4 카드 확인
| 현재 | 변경 |
|---|---|
| 카드 확인 (단계명) | 패 |
| 당신이 받은 카드는… | 네 패다. |
| (안내) | 누르고 있어라. |
| (신규) | 화면을 끄지 마라. |
| 잠시 후 밤이 찾아옵니다 ${t} | (삭제 — 줄어드는 선으로 대체) |
| 팀 표기 마을 팀 / 늑대인간 팀 / 무두장이 | 마을 편 / 늑대 편 / 홀로 |
| (peek 라벨) | 처음 받은 패 / 마지막으로 본 패 |
| (독 카드 첫 판 힌트) | 눌러 본다 |

### 10.5 밤 내레이션 `NIGHT_TEXT` (roles.js, TTS 겸용 — 쉼표 대신 마침표, `--f-serif`)
```
_check:       각자 패를 봐라. 누구에게도 보이지 마라.
doppelganger: 도플갱어. 눈을 떠라. 누군가의 얼굴을 훔쳐라.
werewolf:     늑대인간. 눈을 떠라. 서로를 알아봐라.
minion:       하수인. 눈을 떠라. 네 주인을 봐라.
mason:        프리메이슨. 눈을 떠라. 형제를 찾아라.
seer:         예언자. 눈을 떠라. 한 명의 패를 봐라. 아니면 제단의 두 장을.
robber:       강도. 눈을 떠라. 누군가의 패를 훔쳐라.
troublemaker: 말썽쟁이. 눈을 떠라. 둘의 패를 뒤바꿔라.
drunk:        주정뱅이. 눈을 떠라. 제단의 패와 네 패를 바꿔라. 보지는 마라.
insomniac:    불면증환자. 눈을 떠라. 네 패를 다시 봐라.
```
TTS는 단계 종료 시 `눈을 감아라.`를 붙여 읽는다.

### 10.6 밤 화면/프롬프트 (app.js)
| 현재 | 변경 |
|---|---|
| 밤이 되었습니다. 모두 눈을 감으세요. | 밤이 왔다. 눈을 감아라. |
| 눈을 감고 기다리세요… | 눈을 감아라. |
| 밤이 오기 전 / ${i} / ${n}번째 차례 | (삭제 — 점 트랙) |
| ${title} — 눈을 뜨세요 | ${역할명}. |
| 확인했습니다 | 봤다 |
| 행동을 마쳤습니다. 다시 눈을 감으세요… | 끝났다. 눈을 감아라. |
| 🐺 혼자인 늑대인간 / 동료가 없습니다… | 늑대인간. / 너 혼자다. 제단의 패 하나를 봐라. |
| 보지 않기 | 보지 않는다 |
| 🎭 도플갱어 / 다른 플레이어 1명의 카드를 보고… | 도플갱어. / 하나를 골라라. 너는 그가 된다. |
| (도플갱어 확정 버튼) | 얼굴을 훔친다 + `<nm>` |
| 🎭 도플갱어로서 (접두) | 도플갱어로서 |
| 🔮 예언자 / 플레이어 1명의 카드 또는 가운데 카드 2장… | 예언자. / 한 명의 패, 혹은 제단의 두 장. |
| 플레이어 1명 보기 / 가운데 카드 2장 보기 (n/2) | (삭제 — 탁자에서 직접 선택) / 주 버튼 `본다` + `<nm>` 또는 `제단을 본다` + `${n}/2` |
| ${name}의 카드를 볼까요? | (삭제 — 길게 누르기로 확정) |
| 🗡️ 강도 / 카드를 훔칠 플레이어를 고르세요… | 강도. / 훔칠 자를 골라라. 훔친 패는 네 것이다. |
| 훔치지 않기 | 훔치지 않는다 |
| (강도 확정) | 훔친다 + `<nm>` |
| 🃏 말썽쟁이 / 카드를 서로 바꿀 두 명을 고르세요. | 말썽쟁이. / 둘을 골라라. 둘의 패를 맞바꾼다. 너는 보지 못한다. |
| 바꾸기 / 바꾸지 않기 | 바꾼다 / 손대지 않는다 |
| 🍺 주정뱅이 / 가운데 카드 1장과 자신의 카드를 바꿉니다… | 주정뱅이. / 제단의 패 하나를 골라라. 너는 보지 못한다. |
| 🥱 불면증환자 | 불면증환자. / 네 패를 다시 봐라. |
| 가운데 ${i} | ${왼쪽·가운데·오른쪽} 제단 |
| 👤 이름 | 이름 |
| 🌙 밤에 알게 된 정보 | 네가 본 것 (「밤의 기록」은 결말 리플레이 이름, §13) |
| 밤 동안 알게 된 정보가 없습니다. | 너는 아무것도 보지 못했다. |
| (잠든 독 버튼) | 잠들어 있다 |
| (밤 정보 블러 안내) | 눌러야 보인다. |
| (공개 카드 안내) | 탭하면 덮는다. |
| (내 차례 탭 제목) | ● 눈을 떠라 |
| (ack 실패) | 전해지지 않았다. 다시. |

### 10.7 서버 메시지 (server.js — 이모지 제거 + 톤 변경)
| 행 | 현재 | 변경 |
|---|---|---|
| 110 | ${n}님이 방장이 되었습니다. | ${n}${이/가} 촌장이 되었다. |
| 123 | ${n}님이 나갔습니다. | ${n}${이/가} 마을을 떠났다. |
| 221 | 3~10명이 필요합니다. | 셋에서 열이 모여야 밤이 온다. |
| 222 | 카드는 인원 + 3장(${n}장)이어야 합니다. | 패는 ${n}장이어야 한다. |
| 252 | 🌙 밤이 되었습니다. 채팅이 잠깁니다. | 밤이 왔다. 입을 다물어라. |
| 274 | 도플갱어-${역할} | (삭제 — `label()`은 timeline 전용이었다. 결과의 `도플갱어 → ${역할}` 표기는 클라이언트가 만든다) |
| 324 | 동료 늑대인간: ${names} | 무리: ${names} (+ `ids`) |
| 328 | 🐺 늑대인간은 당신 혼자입니다. | 무리는 없다. 너 혼자다. |
| 332 | 늑대인간: ${names} | 네 주인: ${names} (+ `ids`) |
| 332 | 플레이어 중에 늑대인간이 없습니다… | 늑대는 모두 제단에 잠들어 있다. |
| 337 | 다른 프리메이슨: ${names} / …없습니다. | 형제: ${names} (+ `ids`) / 형제는 이 마을에 없다. |
| 343 | 당신의 현재 카드: ${role} | 네 패는 지금 ${role}${이다/다}. |
| 345 | 🥱 ${a} 자신의 카드를 확인했습니다 → ${role} | (삭제 — timeline. §13.2 `peek` 이벤트, 문장은 §10.13) |
| 360 | 지금은 행동할 수 없습니다. | 지금은 아니다. |
| 362 | (시간 초과로 자동 선택) | — 밤이 대신 골랐다 |
| 371/447 | 가운데 카드를 고르세요. | 제단의 패를 골라라. |
| 373 | 🐺 가운데 ${i}번 카드: ${role} | ${왼쪽·가운데·오른쪽} 제단: ${role} |
| 374 | 🐺 ${a} 가운데 ${i}번 카드를 봤습니다 → ${role} | (삭제 — timeline. §13.2) |
| 381/399/420 | 다른 플레이어를 고르세요. | 다른 이를 골라라. |
| 384 | 🎭 ${t}의 카드는 ${r}입니다. 당신은 이제 ${r}입니다. | ${t}의 패는 ${r}. 너는 이제 ${r}${이다/다}. |
| 385 | 🎭 ${a}(도플갱어)가 ${t}의 카드를 보고 ${r} 되었습니다 | (삭제 — timeline. §13.2) |
| 389 | 🎭 ${r}의 차례에 다시 깨어납니다. | ${r}의 차례에 다시 깨어난다. |
| 400 | 🔮 ${t}의 카드: ${r} | ${t}의 패: ${r} |
| 401 | 🔮 ${a} ${t}의 카드를 봤습니다 → ${r} | (삭제 — timeline. §13.2) |
| 404 | 가운데 카드 2장을 고르세요. | 제단의 두 장을 골라라. |
| 405-407 | ${i}번 ${r} / 🔮 가운데 카드: … / 🔮 ${a} 가운데 카드를 봤습니다 → … | ${왼쪽·가운데·오른쪽} 제단 ${r} / 제단: … / (세 번째는 삭제 — timeline) |
| 415/430 | 🗡️ 카드를 훔치지 않았습니다. / 🃏 카드를 바꾸지 않았습니다. | 손대지 않았다. |
| 422 | 🗡️ ${t}와 카드를 바꿨습니다. 당신의 새 카드: ${r} | ${t}의 패를 훔쳤다. 이제 너는 ${r}${이다/다}. |
| 423 | 🗡️ ${a} ${t}의 카드를 훔쳤습니다 → ${r} | (삭제 — timeline. §13.2) |
| 436 | 자신을 제외한 두 명을 고르세요. | 너를 뺀 둘을 골라라. |
| 440 | 🃏 ${a}와 ${b}의 카드를 바꿨습니다. | ${a}${과/와} ${b}의 패를 뒤바꿨다. |
| 441 | 🃏 ${x} ${a}와 ${b}의 카드를 바꿨습니다 | (삭제 — timeline. §13.2) |
| 450 | 🍺 가운데 ${i}번 카드와 바꿨습니다… | ${왼쪽·가운데·오른쪽} 제단의 패와 맞바꿨다. 무엇인지는 모른다. |
| 451 | 🍺 ${a} 가운데 ${i}번 카드와 바꿨습니다 → ${r} | (삭제 — timeline. §13.2) |
| 457 | 알 수 없는 행동입니다. | 지금은 아니다. |
| 473 | ⏰ 시간이 지나 아무 행동도 하지 않았습니다. | 밤이 지났다. 너는 아무것도 하지 않았다. |
| 500 | ☀️ 아침이 밝았습니다! 토론을 시작하세요. | 날이 밝았다. 누군가는 거짓말을 하고 있다. |
| 510 | 🗳️ 투표 시간입니다! 죽일 사람을 고르세요. | 심판의 시간이다. |
| 596-597 | ' 승리!' / 아무도 이기지 못했습니다. / 🏁 게임 종료 — ${wn} | (판결 문장 §10.9) / 결말: ${판결} |
| 641/667 | 닉네임을 입력하세요. | 이름을 대라. |
| 642/656 | 잘못된 요청입니다. | 지금은 아니다. |
| 648 | ${name}님이 방을 만들었습니다. | ${name}${이/가} 마을을 열었다. |
| 655 | 방을 찾을 수 없습니다. | 그런 마을은 없다. |
| 665 | 이전 방에 다시 들어갈 수 없습니다. | 그 마을로는 돌아갈 수 없다. |
| 668 | 이미 게임이 진행 중입니다… | 이미 밤이 시작됐다. 다음 밤을 기다려라. |
| 669 | 방이 가득 찼습니다. (최대 10명) | 자리가 없다. 열 명이 이미 앉았다. |
| 679 | ${final}님이 들어왔습니다. | ${final}${이/가} 불가에 앉았다. |
| 695 | ${n}님이 게임을 떠났습니다. | ${n}${이/가} 마을을 떠났다. |
| 744 | 시작할 수 없습니다. | 아직 밤을 부를 수 없다. |
| 755 | 게임이 없습니다. | 진행 중인 밤이 없다. |
| 779 | 지금은 투표할 수 없습니다. | 지금은 심판의 시간이 아니다. |
| 780 | 자신이 아닌 플레이어를 고르세요. | 너는 너를 지목할 수 없다. |
| 841 | 🐺 …서버 실행 중 (콘솔) | 이모지만 제거 |

서버의 이/가·과/와 헬퍼(74~75행)는 삭제하고 `require('./public/strings.js').josa`를 쓴다(§7.3 계약).

### 10.8 낮
| 현재 | 변경 |
|---|---|
| 아침이 밝았습니다. 모두 눈을 뜨세요. (토스트) | 날이 밝았다. |
| ☀ 아침이 밝았습니다 | 날이 밝았다. |
| 누가 늑대인간일까요? 밤사이 카드가 바뀌었을 수도 있습니다. | 너는 아직 너인가. |
| 내가 처음 받은 카드 | 처음 받은 패 |
| 지금도 이 카드인지는 알 수 없습니다. | (삭제 — 금 간 카드로 표현) |
| 이번 게임의 카드 (이 중 3장은 가운데에) | 이번 밤의 패 — 셋은 제단에 |
| 플레이어 / 투표 준비 ${r}/${n} | 손 든 자 ${r}/${n} |
| ✋ 투표 준비 완료 / ✋ 준비 취소 | 심판하자 / 손을 내린다 |
| ✋ 투표 준비 (배지) | 손 든 자 |
| ⏩ 바로 투표 시작 (방장) | 지금 심판한다 (1200ms) |
| 토론을 끝내고 바로 투표를 시작할까요? / 모두 준비하거나… | (삭제) |

### 10.9 심판·결말
| 현재 | 변경 |
|---|---|
| 투표 시간입니다. (토스트) / 붉은 달이 떴습니다 | 지목하라. |
| 처형할 사람을 고르세요… | 처형할 자를 골라라. 끝나기 전엔 바꿀 수 있다. |
| 내 투표: / 아직 투표하지 않았습니다. | 지목: `<nm>` / 아직 지목하지 않았다. |
| (확정 버튼) | 처형 + `<nm>` |
| 투표 현황 ${n}/${t} | 지목 ${n}/${t} |
| ✔ 투표함 / 고민 중… | (봉인 점만, 문구 삭제) |
| 한 표씩만 받은 경우… | 모두 한 표씩이면 아무도 죽지 않는다. 동표면 모두 죽는다. (`?` 버튼) |
| 늑대인간 팀 승리! | 늑대가 마을을 삼켰다. (`T.verdict.wolf`, 플레이어 중 늑대가 있을 때) |
| (신규) 늑대 편 승리, 플레이어 중 늑대 없음 | 하수인이 웃었다. (`T.verdict.minion`) |
| 마을 팀 승리! | 늑대가 목매달렸다. (`T.verdict.village`, 늑대가 있을 때) |
| (신규) 마을 승리, 플레이어 중 늑대 없음 | 늑대는 없었다. (`T.verdict.villageNoWolf`) |
| 무두장이 승리! | 무두장이는 바라던 대로 죽었다. (`T.verdict.tanner`, 무두장이만 이겼을 때) |
| 아무도 이기지 못했습니다 | 승자는 없다. (`T.verdict.none`) |
| (판결 고르기) | 서버 `winners`와 `wolvesInPlay`로 위 여섯 중 하나. 마을과 무두장이가 함께 이기면 마을 판결 + 이유 줄 `tanner_too`(§10.13) |
| 아무도 죽지 않았습니다. | 피는 흐르지 않았다. |
| 죽은 사람: ${names} | `<nm>…` 처형. |
| 🏹 사냥꾼 ${a}이(가) ${b}을(를) 데려갔습니다. | 사냥꾼 ${a}의 마지막 화살이 ${b}${을/를} 꿰뚫었다. (리플레이 자막 `hunt`와 같은 문장·칭호 규칙, §10.13) |
| 도플갱어 → ${r} | 도플갱어 → ${r} |
| 🎉 당신은 이겼습니다! / 😢 당신은 졌습니다. | 이겼다 / 졌다 |
| 모든 카드 공개 | 모든 기록 |
| 플레이어/처음 카드/최종 카드/투표/받은 표/결과 | 이름 / 처음 / 마지막 / 지목 / 표 / 결말 |
| 승리 / 패배 | 이겼다 / 졌다 (도장) |
| 가운데 카드 / 가운데 ${i} / 처음: ${r} | 제단 / ${왼쪽·가운데·오른쪽} 제단 / 처음 ${r} |
| 🌙 밤에 일어난 일 | 그 밤에 일어난 일 |
| 밤에 아무 일도 일어나지 않았습니다. | 그 밤, 아무도 움직이지 않았다. |
| 🔎 내가 알았던 정보 | 네가 본 것 |
| (신규, 끝판 보드 보조 링크) | 그 밤을 다시 본다 |
| (신규, 리플레이 조작) | §10.13 |
| 🔁 대기실로 (한 판 더) | 다시, 밤으로 |
| 방장이 다음 게임을 준비하기를 기다리는 중… | 촌장을 기다린다 |
| (건너뛰기) | 건너뛴다 |

### 10.10 시스템
| 현재 | 변경 |
|---|---|
| 오류가 발생했습니다. | 무언가 어긋났다. |
| 서버와 연결이 끊겼습니다. 다시 연결하는 중… | 횃불이 꺼졌다. 다시 지핀다 · ${n} |
| (복귀) | 돌아왔다. |
| 🔊 음성 나레이션을 켰습니다. | 촌장의 목소리가 밤을 읽는다. |
| 🔈 음성 나레이션을 껐습니다. | 촌장이 입을 다문다. |
| 밤에는 대화할 수 없습니다 🤫 | 밤에는 입을 다물어라. |
| (새 버전, SW) | 새 법도가 내려왔다. |

### 10.11 법도 모달
제목 `법도`. 다섯 줄:
1. **패** — 모두 한 장. 남은 셋은 제단에 엎는다.
2. **밤** — 정해진 순서대로 깨어난다. 패는 바뀐다. 네가 누구인지 장담하지 마라.
3. **낮** — 말하라. 거짓말도 무기다.
4. **심판** — 동시에 하나를 지목한다. 가장 많이 지목된 자가 처형된다. 모두 한 표씩이면 아무도 죽지 않고, 동표면 모두 죽는다.
5. **결말** — 마지막에 쥔 패가 네 편을 정한다.
   - 마을: 늑대를 하나라도 처형하면 이긴다. 늑대가 없다면 아무도 죽지 않아야 이긴다.
   - 늑대: 늑대가 아무도 처형되지 않으면 이긴다.
   - 무두장이: 처형되면 홀로 이긴다.

소제목 `깨어나는 순서`. 삭제: `거짓말도, 블러핑도 자유!`, 🏘️🐺🪓 이모지.

### 10.12 역할 (roles.js: `emoji` 필드 삭제, `line`·`ord`·`sigil` 추가, `desc` 교체)
| id | name | ord | line (카드 한 줄) | desc (모달·덱 시트) |
|---|---|---|---|---|
| doppelganger | 도플갱어 | I | 남의 얼굴로 산다. | 누군가의 패를 보고 그가 된다. 예언자·강도·말썽쟁이·주정뱅이가 되면 그 자리에서 행동하고, 늑대인간·하수인·프리메이슨·불면증환자가 되면 그 차례에 함께 깬다. 그 편에 선다. |
| werewolf | 늑대인간 | II | 무리를 알아본다. | 다른 늑대를 본다. 혼자라면 제단의 패 하나를 본다. 늑대가 아무도 처형되지 않으면 이긴다. |
| minion | 하수인 | III | 주인을 섬긴다. | 누가 늑대인지 안다. 늑대는 너를 모른다. 네가 처형되어도 늑대가 살면 이긴다. |
| mason | 프리메이슨 | IV | 형제를 안다. | 다른 프리메이슨을 본다. |
| seer | 예언자 | V | 남의 패를 엿본다. | 한 명의 패, 혹은 제단의 두 장을 본다. |
| robber | 강도 | VI | 빼앗고, 그가 된다. | 누군가와 패를 바꾸고 새 패를 본다. 그 편에 서되, 능력은 쓰지 못한다. |
| troublemaker | 말썽쟁이 | VII | 남의 패를 뒤바꾼다. | 다른 둘의 패를 바꾼다. 보지 않는다. |
| drunk | 주정뱅이 | VIII | 제가 누군지 모른다. | 제단의 패 하나와 제 패를 반드시 바꾼다. 새 패는 보지 못한다. |
| insomniac | 불면증환자 | IX | 잠들지 못한다. | 밤의 끝에 제 패를 다시 본다. |
| villager | 마을주민 | — | 아무것도 모른다. | 능력이 없다. 말로 살아남아라. |
| hunter | 사냥꾼 | — | 홀로 죽지 않는다. | 처형되면, 제가 지목한 자도 함께 죽는다. |
| tanner | 무두장이 | — | 죽음을 원한다. | 처형되면 홀로 이긴다. 그 경우 늑대는 이길 수 없다. |

`TEAM_NAME = { village:'마을 편', wolf:'늑대 편', tanner:'홀로' }`.

### 10.13 리플레이 「밤의 기록」 (strings.js `T.replay.*` — 비디스플레이 그룹, 서브셋 대상 아님)
규칙
- 자막은 **고정 2줄**이다. 위 줄 = 행위(`--f-serif` 15px `--bone-hi`), 아래 줄 = 드러난 것(`--f-body` 13px `--bone-dim`, 역할명 앞에 `xs` 문양 칩). 아래 줄은 위 줄보다 400ms 늦게 나온다. 피 글자는 쓰지 않는다(24px 미만).
- 위 줄 왼쪽에 차례의 로마 숫자(Hanbam T 12px `--smoke`, 도플갱어가 행동하면 `I → V`). 문장 안에는 넣지 않는다. **로마 숫자는 차례에만 쓴다.** 제단은 위치로 부른다(§10.0-5).
- `<a>` `<t>` `<b>` `<c>` = 이름(`<b class="nm">`). 내 좌석이면 `dawn.seat`에서만 `너`로 바꾼다.
- `<r>` = 역할명. 값은 **`effRole(c)`**(§13.1): 도플갱어 카드는 복사한 역할로 읽고 `도플갱어 → <r>`로 표기한다. `deal[c]` 날값을 문장에 쓰지 않는다.
- `<P>` `<Q>` = 제단 위치 `왼쪽 제단` · `가운데 제단` · `오른쪽 제단`(슬롯 `n`·`n+1`·`n+2`). `<팀>` = `TEAM_NAME`. 조사는 `T.josa()`.
- **역할명은 반드시 글자로 쓴다.** 모바일 좌석 카드(28px)는 문양만 보이므로 자막과 이름표(`.rp-tag`, §13.6)가 판독 수단이다.
- **칭호 `<역>`**: 행동자의 원래 역할명. 행동자가 도플갱어면 `도플갱어`. 여럿을 나열할 때 도플갱어는 이름 앞에 `도플갱어`를 붙인다(`무리: 민수, 도플갱어 지훈`). 도플갱어가 함께 깨는 역할(늑대·하수인·프리메이슨·불면증환자)로 다시 깨는 박자에는 그의 이름표 옆에 복사 문양(`.rp-copyof`)을 붙인다.
- **읽기 시간**: 박자의 읽기 유지 = `max(바닥, 90ms × 위·아래 줄 음절 수 합)`. 바닥은 §13.4.
- 문장 끝은 마침표, 이모지 0, 느낌표 0, 쉼표는 이름 나열과 호격 뒤에만.

| 키 | 조건 | 위 줄 | 아래 줄 |
|---|---|---|---|
| `pro` | 서막 | 그 밤, 패는 이렇게 놓였다. | 너는 `<r>${으로/로}` 시작했다. 제단: `<r>`, `<r>`, `<r>`. |
| `quiet` | 밤의 이벤트가 전부 `idle` | 그 밤, 아무도 움직이지 않았다. | 깨어날 패는 모두 처음부터 제단에 있었다. |
| `idle` | 깬 사람 없음. **연속된 `idle`은 한 박자로 합친다** | `<r>${은/는}` 깨지 않았다. / `<r>`, `<r>${은/는}` 깨지 않았다. | 그 패는 처음부터 제단에 있었다. (여럿이면 `그 패들은`) |
| `idle.moved` | 그 역할 카드 중 하나라도 박자 시작 때 좌석에 있음 | (같음) | 처음 그 패를 받은 자가 없었다. |
| `copy` | 도플갱어가 즉시 행동 역할을 베낌 | 도플갱어 `<a>`, `<t>`의 얼굴을 훔쳤다. | 이제 `<r>${이다/다}`. |
| `copy.wake` | 늑대인간·하수인·프리메이슨·불면증환자를 베낌 | (같음) | 이제 `<r>${이다/다}`. `<r>`의 차례에 다시 깬다. |
| `copy.sleep` | 마을주민·사냥꾼·무두장이를 베낌 | (같음) | 이제 `<r>${이다/다}`. 다시 깨지 않는다. |
| `know.werewolf` | 늑대 둘 이상 | 늑대들이 눈을 떴다. 서로를 알아봤다. | 무리: `<a>`, `<a>` |
| `peek.werewolf` | 외로운 늑대 | 늑대 `<a>`, 홀로 깼다. `<P>`의 패를 들췄다. | `<r>`. `<다른 늑대>` |
| `peek.werewolf.d` | 외로운 늑대가 도플갱어 | 도플갱어 `<a>`, 늑대가 되어 홀로 깼다. `<P>`의 패를 들췄다. | (같음) |
| `skip.werewolf` | 외로운 늑대가 보지 않음 | 늑대 `<a>`, 홀로 깼다. 제단에 손대지 않았다. (도플갱어면 `도플갱어 <a>, 늑대가 되어 홀로 깼다. …`) | `<다른 늑대>` |
| `<다른 늑대>` | 위 세 줄의 아래 줄 꼬리 | | 다른 늑대 패는 `<P>`에 있었다. / `<P>`, `<Q>`에 있었다. / 좌석에 있으면 `<t>`의 손에 있었다. / 덱에 없으면 `늑대 패는 그 한 장뿐이었다.` (박자 시작 때 `pos` 기준. 그 카드들에 `.rp-lit`) |
| `know.minion` | 늑대 있음 | 하수인 `<a>`, 주인을 우러렀다. | 주인: `<a>`, `<a>`. 주인은 그를 모른다. |
| `know.minion0` | 늑대 없음 | 하수인 `<a>`, 주인을 찾았다. | 늑대 패를 처음 받은 자는 없었다. (덱에 늑대가 없으면 `이 밤의 패에는 늑대가 없었다.`) |
| `know.mason` | 둘 이상 | 프리메이슨들이 서로의 손을 쥐었다. | 형제: `<a>`, `<a>` |
| `know.mason1` | 혼자 | 프리메이슨 `<a>`, 홀로 깼다. | 형제는 없었다. |
| `peek.seer` | 좌석 1 | `<역>` `<a>`, `<t>`의 패를 들췄다. | `<r>` |
| `peek.seer2` | 제단 2 | `<역>` `<a>`, 제단의 두 장을 들췄다. | `<P>` `<r>` · `<Q>` `<r>` |
| `swap.robber` | | `<역>` `<a>`, `<t>`의 패를 훔쳤다. | 빼앗은 패: `<r>`. `<t>`에게는 `<r2>${이/가}` 남았다. |
| `swap.troublemaker` | | `<역>` `<a>`, `<b>${과/와}` `<c>`의 패를 뒤바꿨다. | `<b>` `<rc>` · `<c>` `<rb>`. 아무도 보지 못했다. |
| `swap.drunk` | | `<역>` `<a>`, `<P>`의 패와 제 패를 맞바꿨다. | 받은 패: `<r>`. 그는 끝내 몰랐다. |
| `peek.insomniac` | 그대로 | `<역>` `<a>`, 새벽에 제 패를 다시 봤다. | `<r>`. 그대로였다. |
| `peek.insomniac*` | 바뀜 | (같음) | 패가 바뀌어 있었다. `<r>`. + 확대 카드에 도장 `바뀌었다`(`T.stamp.changed`) |
| (불면증환자 여럿) | 도플갱어 동반 | 불면증환자 `<a>${과/와}` 도플갱어 `<a>`, 새벽에 제 패를 다시 봤다. | `<a>` `<r>` · `<a>` `<r>` |
| `skip` | 스스로 포기 | `<역>` `<a>`, 손대지 않았다. (예언자: `<역>` `<a>`, 눈을 감은 채였다.) | — |
| `skip.auto` | 시간 초과 | `<역>` `<a>`, 망설이다 때를 놓쳤다. | — |
| `auto` | 자동 선택(복사·주정뱅이) | 위 줄 끝에 ` 밤이 대신 골랐다.` | |
| `note.wake` | 행동자가 처음 패와 다른 패를 쥔 채 깨는 **첫** 박자(리플레이당 1회) | 무대 위 주석 `.rp-note`(§13.6) | 패가 바뀌었어도, 처음 받은 패대로 깨어난다. |
| `mine` | 내가 행동자 | 자막 오른쪽 작은 도장 `너였다`(Hanbam, −6°, `T.stamp.you`) | |
| `hit` | 내 좌석이 `tg`나 `mv`에 있고 행동자가 내가 아님 | 자막 오른쪽 도장 `네 패였다`(`T.stamp.yours`). 내 이름표가 한 번 켜진다 | |
| `dawn` | 새벽 | 날이 밝았다. 패는 이렇게 남았다. | 바뀐 패 `<n>`장. / 바뀐 패는 없다. |
| `dawn.seat` | 처음과 다른 역할로 끝난 좌석마다, 좌석 순(§13.4) | `<a>`: `<r처음>` → `<r마지막>`. (내 좌석이면 `너:`) | 이제 `<팀>`. |
| `vote` | 지목 | 모두가 동시에 지목했다. | `<t>` `<n>`표 · `<t>` `<n>`표 (표가 많은 순, 같으면 좌석 순, 최대 셋) + 지목 안 한 자가 있으면 ` · 지목 없음 <n>` |
| `vote1` | 최다 득표가 1표 이하 | 모두가 동시에 지목했다. | 모두 한 표 이하. 아무도 죽지 않는다. (+ 같은 꼬리) |
| `vote.none` | `그 밤에 일어난 일` 목록 전용, 지목 안 한 자마다 | `<a>`, 지목하지 않았다. | |
| `exec` | 처형(동표면 한 박자) | `<t>` 처형. / `<t>`, `<t>` 처형. (`vote`와 같은 순서) | 그의 패는 `<r>${이었다/였다}`. / `<t>` `<r>` · `<t>` `<r>` |
| `nodeath` | 사망자 없음 | 피는 흐르지 않았다. | — |
| `hunt` | 사냥꾼 연쇄 1회 | `<사냥꾼>`의 마지막 화살이 `<t>${을/를}` 꿰뚫었다. | `<t>`의 패는 `<r>${이었다/였다}`. |
| `hunt0` | 사냥꾼이 겨눈 자가 이미 쓰러져 있음 | `<사냥꾼>`의 화살이 겨눈 `<t>${은/는}` 이미 쓰러져 있었다. | — |
| `hunt0.none` | 사냥꾼이 아무도 지목하지 않음 | `<사냥꾼>`, 아무도 겨누지 않았다. | — |
| `<사냥꾼>` | 칭호 | | 처음 패와 마지막 패가 모두 사냥꾼: `사냥꾼 <a>` / 마지막 패만 사냥꾼: `사냥꾼 패를 쥔 <a>` / 마지막 패가 도플갱어: `사냥꾼을 베낀 패를 쥔 <a>` |
| `hunt.rule` | 첫 사냥꾼 박자(`hunt`·`hunt0`·`hunt0.none` 중 처음 것)만 | | 아래 줄 끝(없으면 아래 줄 전체)에 ` 사냥꾼은 죽으며 제가 지목한 자를 데려간다.` |

**판결 이유** (`T.replay.why.*`, 판결 배너 아래 한 줄. 서버 `why` 배열 순서대로, 각 항목 `[코드, 좌석?]`)

| `why` | 문장 |
|---|---|
| `wolf_died` | 늑대 `<t>${이/가}` 처형됐다. (여럿: `<t>`, `<t>${이/가}`) |
| `tanner_too` | 무두장이 `<t>`도 바라던 대로 죽었다. |
| `wolf_lived` | 늑대 `<a>`, `<b>${은/는}` 살아남았다. |
| `tanner_blocked` | 무두장이 `<t>${이/가}` 죽었다. 늑대도 이기지 못한다. |
| `wolf_center` | 새벽에 늑대 패는 모두 제단에 있었다. |
| `wolf_none` | 이 밤의 패에는 늑대가 없었다. |
| `no_death` | 피도 흐르지 않았다. |
| `no_wolf_tanner` | 무두장이 `<t>`만 바라던 죽음을 얻었다. |
| `minion_only_died` | 죽은 자는 하수인 `<t>`뿐이었다. |
| `minion_lived` | 무고한 피가 흘렀다. 하수인 `<a>${이/가}` 웃는다. |
| `innocent_died` | 무고한 피만 흘렀다. |

`wolf_center`·`wolf_none`은 플레이어 중 늑대가 없을 때 항상 첫 항목이고, 뒤에 결과 항목 하나가 붙는다(예: `새벽에 늑대 패는 모두 제단에 있었다. 피도 흐르지 않았다.`). "새벽에"를 빼지 않는다 — 밤에는 늑대가 있었을 수 있다(`know.werewolf` 박자와 모순 금지).

**내 한 줄** (`T.replay.self.*`, 내 화면의 판결 아래. 믿은 패 계산은 §13.8. `<f>` = `effRole(end[나])`)

| 키 | 문장 |
|---|---|
| `same` | 너는 끝까지 `<f>${이었다/였다}`. |
| `diff` | 너는 `<b>${이라/라}` 믿었다. 너는 `<f>${이었다/였다}`. |
| `blind` | 너는 제 패를 몰랐다. 너는 `<f>${이었다/였다}`. (주정뱅이) |
| `doppel` | (`final === 'doppelganger'`이면 위 문장 뒤에) 네가 쥔 도플갱어 패는 `<r>${을/를}` 베낀 패였다. |
| `team` | (항상 끝에) 그래서 `<팀>${이었다/였다}`. `이겼다`/`졌다`. |
| `team.why` | 내가 하수인 또는 무두장이면 `team` 대신: 그 결말을 정한 `why` 문장 + `이겼다`/`졌다`. |

**조작·보드**

| 위치 | 문구 |
|---|---|
| HUD 가운데 | `결말` (리플레이 중에도 같다) |
| HUD 오른쪽 | `건너뛴다` (재생 시작부터 보인다) |
| 주 버튼 | 재생 중 `멈춘다` / 멈춤 `잇는다` / 끝 `처음부터`. 아래 줄 위치 `밤 4/9`(막 이름 + 박자). 첫 자동 재생에서 패가 움직인 박자 뒤 기다리는 동안 `잇는다` + 아래 줄 `눌러서 잇는다` |
| 좌우 버튼 aria-label | `앞 박자` / `다음 박자` |
| 속도 토글 | `×1` / `×2` (aria-label `빠르게 본다` / `제 속도로 본다`) |
| 막 이름(눈금 자) | 서막 · 밤 · 새벽 · 심판 · 판결 |
| 눈금 자 aria-label | 그 밤의 박자 |
| 도장 | `너였다`(`T.stamp.you`) · `네 패였다`(`T.stamp.yours`) · `바뀌었다`(`T.stamp.changed`) |
| 끝판 보드 | `모든 기록` / `그 밤에 일어난 일` / 보조 링크 `그 밤을 다시 본다` |
| 여정 줄 | `믿은 패` / 움직이지 않았으면 `밤새 그대로였다.` |
| 떠난 자의 좌석 | 이름 그대로, 토큰 `.is-gone`(§5.3) |
| 리플레이 모듈 대기 중(끝판 보드) | `그 밤을 다시 본다` 링크를 `aria-disabled` |

---

## 11. 구현 작업 분할 (Sonnet 구현 에이전트, 파일 소유권으로 충돌 방지)

규칙: **각 작업 단위는 표에 적힌 파일만 수정한다.** 다른 파일이 필요하면 §7.3·§7.4·§4.5·§5.4 계약을 믿고 호출만 한다. 계약을 바꿔야 하면 구현하지 말고 보고한다.

### Wave 0 (먼저, 약 30분)
| ID | 담당 | 소유 파일 | 완료 조건 |
|---|---|---|---|
| **W2 문자열·역할 데이터** | `public/strings.js` 신설(§10 전체를 디스플레이/비디스플레이 그룹으로, `T.fmt`, `T.josa`(§7.3 계약 그대로 — `이다/다`, 숫자, 라틴 처리 포함), UMD), `roles.js`에서 `emoji` 삭제 + `line`/`ord`/`sigil` 추가 + `desc`/`NIGHT_TEXT`/`TEAM_NAME` 교체. **3차**: `T.replay.*`(§10.13 자막·이유·내 한 줄·조작 문구), `T.verdict` 6종(§10.9), `T.stamp.you`·`T.stamp.yours`·`T.stamp.changed`, `T.josa`에 `이었다/였다`·`이라/라`·`으로/로`(ㄹ받침 포함) 추가, 제단 위치 이름 `T.altar = ['왼쪽 제단','가운데 제단','오른쪽 제단']`, 음절 수 헬퍼 `T.syl(str)`(읽기 시간, §10.13) | `public/strings.js`, `public/roles.js` | Node `require('./public/strings.js')` 동작, `T.josa` 단위 검사(받침/무받침/ㄹ받침/숫자/라틴/이다/이었다/이라/으로), 이모지 0 |

### Wave 1 (W2 완료 후 병렬)
| ID | 담당 | 소유 파일 | 완료 조건 |
|---|---|---|---|
| **W1 서버·네트워크** | `serveClient:false`, CORS(`STATIC_ORIGIN`), `/healthz` CORS, stamp 메모리 빌드 + 시작 시 br/gzip 미리 압축 서빙, socket 옵션, `CARD_CHECK` 13000, `LOBBY_GRACE` 60000, 멱등 핸들러/ack, §7.4 데이터 계약(`gameId`, `ids`, `reveal`), §10.7 서버 문구 전체 교체(`T.josa`), 이모지 제거, `package.json`(dev: sharp, subset-font). sim.js는 끝에서 `test/replay.js`가 있으면 `require`해 함께 돌린다(W9 파일, 없으면 건너뜀). `test/sim.js`를 새 문구·페이로드에 맞게 갱신. **3차 — 밤의 기록 서버 쪽 전부(§13.1~13.3)**: `g.seats`/`deal`/`pos`/`ev`, `swapSlots()`·`rec()`, 기록 지점 표 전부, `finishPending`의 `auto:1`(`r`의 `lonewolf`→`werewolf`, `st = g.stepRole`), `rec()`의 `dop`·`r` 생략, `mv` `[c,to]`, 개발 모드 `swapSlots` 불변식 단언, 게임 안 슬롯 계산 `g.seats` 전용(`slotOf`는 −1에서 throw), `resolve()`의 정합성 단언·`deaths`(`miss` 포함)·`why`(`[코드, 좌석]`)·`night`, `label()`·`timeline()` 삭제(호환 `hunterKills`·`timeline:[]`은 한 릴리스 유지, §13.3), `eff()` 규칙 고정. sim.js에 §13.11 서버 단언 + 시나리오 행렬(§13.12) + 각 결과를 `test/fixtures/night-<시나리오>.json`으로 기록 | `server.js`, `package.json`, `test/sim.js`, `test/fixtures/*`(생성물) | `npm test` 통과(금지 키 패턴 검사 포함), 서버 문자열 이모지 0, 결과 `state` ≤ 6KB 단언 통과 |
| **W3 셸·기반 CSS** | `public/index.html` 템플릿 재작성(§5 레이어 구조, §9.0 토큰(`__REPLAY_JS__` 포함), 메타, head 인라인 스크립트 ≤400B: `data-perf`/`data-net`/`/healthz` 깨우기, SVG 스프라이트 `<symbol>` 전부 — 역할 12, 팀 3, back-mark, UI: 메뉴·닫기·보냄·복사·열쇠·사슬·손·봉인·발톱·균열·`rp-turn`(바뀐 카드 표식, 반쯤 판 끌 갈고리 — §4.6)), `public/css/base.css`(토큰, 리셋, 타이포, **홈 화면 전체**, HUD, 독, 버튼·hold 게이지, 입력, 시트, 모달, 토스트, 채팅, `#conn`, `#bg` 조명, z-index 척도, 모션 토큰, reduced-motion/lite/paused, `.nm`, `.sr-only`). 기존 `public/style.css`, `public/img/*.svg` 삭제 | `public/index.html`, `public/css/base.css`, (삭제) `public/style.css`, `public/img/*.svg` | 제3자 도메인 0, base.css br ≤ 7KB, 홈이 game.css 없이 완성 |
| **W4 카드 시스템** | `public/css/card.css`(§4 전체 + 상태, 플립 기하, 아틀라스 좌표), `public/js/art.js`(§7.3 ART API, CSS 이미지 변수 설정, 로더, decode, prefetch, data-art 마킹, 폴백), 데모 페이지 | `public/css/card.css`, `public/js/art.js`, `design/card-demo.html` | `ART.card()`가 manifest 없이도 12역할 + 뒷면 전부 완성 렌더(**`flat:1` 한 면 평면 렌더 포함**, §4.5)(데모에서 xs/sm/md/xl × 앞/뒤 × 상태 전부 확인, 앞면이 거울상으로 뒤집히지 않음) |
| **W5 도구·배포** | `tools/stamp.js`(§9.0), `tools/optimize-images.mjs`(§9.3 duotone·사다리·대칭), `tools/subset-font.mjs`(§3, 2벌), `tools/font-metrics.html`(대체 메트릭 실측), `tools/check-budget.mjs`, `tools/check-waterfall.mjs`, `tools/vendor.mjs`(socket.io 사본), **3차**: stamp에 `replay.<hash>.js` 단계(`__REPLAY_CSS__` 치환, §9.0-3)와 `__REPLAY_JS__` 토큰, check-budget에 replay ≤ 12KB 행, `public/art-manifest.json` 빈 기본값, `public/sw.js` 템플릿(§9.6), `render.yaml`, `.gitignore`(`art-src/`, `dist/`) | `tools/*`, `public/art-manifest.json`, `public/sw.js`, `public/vendor/*`, `render.yaml`, `.gitignore` | 샘플 PNG 1장으로 duotone 파이프라인 동작, `node tools/stamp.js`로 `dist/` 생성, 두 검사 스크립트 동작 |

### Wave 2 (Wave 1 완료 후, 병렬)
| ID | 담당 | 소유 파일 | 완료 조건 |
|---|---|---|---|
| **W6 화면 렌더 엔진** | `public/app.js` → `public/js/app.js`로 이동·재구성: `SOCKET_URL`, rAF 배치, 셸+영역 패치(§7.2), 탁자 좌석 DOM 유지·JS 좌표 계산(§5.3), §5.4 마크업 그대로, 모든 화면(§6.1~6.12), 비밀 규칙·누르기(§6.3), 선택 문법·hold(600/1200), 채팅 시트, `⋯` 메뉴, 재연결 띠·콜드스타트·Wake Lock(§6.13), 타이머 skew(§7.2-5), `.nm` 감싸기, 모든 문자열 `T.*`, 접근성(§5.5), `game.css`/`fx.js` 지연 주입. 투표선·말썽쟁이 예고선은 `.ln`(§5.4). **3차 — 결말 껍데기(§6.9, §13.9)**: 심판 진입 시 `replay.js` idle 주입, 결과 수신 시 정적 끝판 보드(`.verdict`·`.rec-row`·빈 `.tl-list`)를 먼저 그림, `REPLAY.open/enhanceBoard/close` 호출, `body[data-replay="1"]`인 동안 `dock`·`prompt` 영역 패치를 멈춤, 1회 자동재생 키 `result:<gameId>`, `그 밤을 다시 본다` 링크, **결과 단계의 탁자 좌석과 `.rec-row`는 `result.players`로만 배치**(떠난 자는 `.is-gone`, id → 슬롯은 `result.players.findIndex`, §13.6), `R.night`가 없으면 끝판 보드만 | `public/js/app.js`, (삭제) `public/app.js` | 이미지 0장 상태로 3인 한 판 완주, replay.js를 막아도 결말이 끝판 보드로 완결, `confirm(`·이모지 grep 0건, 375×553에서 10인 탁자 스크롤 0 |
| **W7 연출·화면 CSS** | `public/js/fx.js`(§7.3 FX API: 눈꺼풀, 섬광, 흔들림(#main), 심박, 글자 출력, peek, 교환, buzz(밤 무시), 1회 재생 Set, 로드 전 호출 큐. **`FX.resultSequence`는 만들지 않는다** — §13 REPLAY가 소유), `public/css/screens.css`(모닥불, 탁자/좌석 상태 클래스, 밤 잠듦/깨어남, 새벽/낮, 심판 선, **`.ln` 원시 요소(§5.4)**, 끝판 보드: `.verdict`·`.verdict-why`·`.verdict-self`·`.rec-row`·`.rec-path`·`.rec-belief`·`.tl-row`·모바일 기록 목록, 덱 시트, 법도 모달 종이, peek) | `public/js/fx.js`, `public/css/screens.css` | `stroke-dashoffset` 0건, 무한 애니메이션 동시 ≤ 3, `mix-blend-mode` 0 |
| **W9 밤의 기록 (리플레이)** | §13 전부의 클라이언트: `public/js/replay.js`(UMD, `REPLAY.build` 순수 함수 + 무대·박자 재생·스냅샷 점프·조작·끝판 보강, §7.3 API), `public/css/replay.css`(`.rp*` 클래스, stamp가 replay.js 안에 인라인), 문양 4종(§13.6, replay.js 안 문자열), `test/replay.js`(W1의 `test/fixtures/night-*.json` 전부에 대해 §13.11 클라이언트 단언) | `public/js/replay.js`, `public/css/replay.css`, `test/replay.js` | §13.11 반려 조건 전부 통과, replay 번들 br ≤ 18KB, 375×553 10인에서 무대·자막·눈금 자·독 겹침 0 |

W6과 W7은 §4.5·§5.4의 클래스명, `data-r`, `FX.*` 이름을 그대로 쓴다. 연출 전용 클래스만 W7이 `.fx-*`로 추가할 수 있다. W9는 `.rp-*` 접두사만 정의하고, 좌석·제단·`.ln`·`.card`·`.verdict` 등 기존 클래스에는 **상태 클래스(기존 것 또는 `.rp-dim`처럼 `.rp-` 접두사)를 붙이고 떼기만** 한다(스타일 재정의 금지). 예외 둘: `.rp-card[data-z="seat"]` 범위 안에서 `.card-name`·`.card-ord`·`.card-line` 숨김과 `.card-sg` 역보정(§13.6), `body[data-replay="1"]` 동안 좌석의 `xs` 카드·제단 카드·`.seat-name`을 `opacity:0`. W7은 `.is-gone`(§5.3)을 정의한다. W9는 W1의 픽스처가 나오기 전에는 §13.3 예시 JSON으로 개발한다.

### Wave 3 (이미지 도착 후)
| ID | 담당 | 소유 파일 |
|---|---|---|
| **W8 아트 반영** | 오너 PNG → `tools/optimize-images.mjs` → manifest·LQIP 갱신 → `tools/subset-font.mjs` 재실행 → `node tools/stamp.js` → `check-budget`·`check-waterfall` 통과 → 각 카드 육안 검수(역할별 `[data-role=x] .card-art{background-position:…}` 미세 조정만) | `public/img/**`, `public/fonts/**`, `public/art-manifest.json`, `art-src/lqip.json`, `public/css/card.css`(위치 조정만) |

### 오너가 직접 할 일 (1회)
- Render 대시보드에서 `render.yaml` 블루프린트로 **Static Site** 생성(무료), 웹 서비스 환경변수 `STATIC_ORIGIN`에 정적 사이트 주소, 정적 사이트의 `SOCKET_URL`에 웹 서비스 주소(`https://one-night-werewolf-pa5a.onrender.com`).

### 구현 체크리스트 (모든 에이전트 공통)
- [ ] 이모지 grep 0건 (`public/`, `server.js`)
- [ ] `confirm(`/`alert(` 0건
- [ ] `backdrop-filter`·`mix-blend-mode` 0건, `border-radius` > 2px는 `.seat-token`만
- [ ] 애니메이션 대상 속성 transform/opacity만 (`@keyframes` 안 grep)
- [ ] Google Fonts 링크 0, 제3자 도메인 0
- [ ] 밤에 `navigator.vibrate` 호출 0 (`FX.buzz` 경유만)
- [ ] 디스플레이 폰트 문자열 안의 닉네임은 전부 `.nm`
- [ ] 문구 변경 후 `tools/subset-font.mjs` 재실행, 제목 ≤10KB·디스플레이 ≤30KB
- [ ] `tools/check-budget.mjs`·`tools/check-waterfall.mjs` 통과
- [ ] DevTools 1MB/s·RTT300·캐시 끔: 홈 입력 가능 ≤ 2.0s
- [ ] 이미지 요청 차단 상태로 한 판 완주
- [ ] 375×553, 360×640에서 가로 스크롤 0, 게임 화면 세로 스크롤 0(결과 목록·덱 시트 제외)
- [ ] 휴대폰에서 독 카드를 누른 채 손가락을 조금 움직여도 peek가 닫히지 않음
- [ ] 6× CPU 쓰로틀에서 밤 단계 전환 프레임 < 16.7ms, 50ms 초과 long task 0
- [ ] `stroke-dashoffset` 0건 (선은 `.ln` scaleX)
- [ ] 결과 `state` ≤ 6KB, `result.night` ≤ 1.5KB (10인·이름 최대 길이, sim.js 단언)
- [ ] 리플레이: 이미지·replay.js를 각각 막은 상태에서도 결말 완결 (§13.11)
- [ ] `clip-path`·`border-color` 애니메이션 0건(와이프는 덮개 `scaleX`), 리플레이 중 `rotateY`/`preserve-3d` 0
- [ ] 제단을 로마 숫자로 부르는 문자열 0건(로마 숫자는 밤 차례 전용)

---

## 12. 비평 반영 기록

비평 5개(아트 프롬프트, 모바일 UX, 한국어 카피, 성능·배포, 구현 계약)의 지적은 아래를 빼고 **전부 반영**했다.

**기각**
- 비평2 #13 "덱 셀의 카드를 탭하면 +1" — 같은 비평 #12의 "카드 탭 = 설명"과 같은 손짓이 겹친다. 손짓 하나에 뜻 하나: 카드 탭 = 설명, 수량은 `−`/`+` 버튼만.

**두 비평이 충돌해 하나를 고른 것**
- 길게 누르기 확정 시간: 비평2(600ms) vs 비평5(500ms) → **600ms**. 파괴류는 둘 다 1200ms로 일치.
- 수량 앞 "자"의 대체어: 비평2(`한 명`, `두 명`) vs 비평3(`하나`, `둘`, `누군가`) → 촌장 말투에 맞는 비평3을 쓰고, `한 명의 패`는 예언자 문장에만 남겼다. 결과 표 머리는 비평3의 `이름`.
- 낮 토글: 비평3(`아직이다` 유지) vs 비평2(`손을 내린다`) → `손 든 자 3/6`과 짝이 맞는 `손을 내린다`.
- 무승부 판결: `누구도 이기지 못했다`(비평2) vs `승자는 없다.`(비평3) → 더 짧은 `승자는 없다.`
- 성능 등급 판정: 비평4와 비평5의 휴리스틱을 합쳐 **기기 축(`data-perf`)과 망 축(`data-net`)**으로 나눴다. 3g는 망 축에만 넣어 자산만 줄이고 연출은 살린다.

**조정해서 반영한 것**
- 비평4 #3 "서버가 메모리에서 CSS/JS를 이어 붙임" — 정적 사이트 분리(비평4 #1)와 같이 쓰려면 서버 밖에서도 돌아야 하므로 `tools/stamp.js`(의존성 0, 이어 붙이기와 토큰 치환만)로 옮겼다. 정적 사이트의 빌드 명령과 server.js의 메모리 빌드가 같은 모듈을 쓴다. 번들러·트랜스파일이 없으므로 "빌드 단계 없음" 원칙의 취지(클라이언트 코드를 그대로 배포)는 유지된다.
- 비평4 #12 br 미리 압축 — 정적 사이트는 CDN이 압축하므로 server.js의 같은 출처 폴백 경로에만 적용. `compression` 의존성은 아예 넣지 않는다.
- 비평4 #7 `median(1)` — 1은 아무 효과가 없으므로 원본 해상도에서 `median(3)`.
- 비평4 #2 새 버전 토스트 `새 판이 준비됐다` — 비평3 #20("판"은 게임 밖 단어)과 충돌해 `새 법도가 내려왔다.`
- 비평5 #22 `card-line`을 `--ink` .75로 — 비평1 #1 전면 아트로 카드 아래가 먹이 되어, `card-line`은 `--ink` 띠 위 `--bone-dim`(8:1)으로 바꿨다.
- 비평2 #5 peek 라벨 `지금 네 패` — 말썽쟁이가 이후에 바꿨을 수 있어 "지금"은 거짓이 될 수 있다. `마지막으로 본 패`.
- 비평2 #1 Wake Lock을 `밤을 부른다` 버튼에서 — 촌장 외에는 그 버튼을 누르지 않으므로, 모든 클라이언트가 밤 시작 신호를 받을 때 요청한다(화면 깨우기는 사용자 손짓이 필요 없다).
- 비평2 #14 코드 알파벳에서 `0 O 1 I` 제외 — 서버 `genCode`가 이미 `I`·`O`·숫자를 쓰지 않는다. 입력 필터만 `/[^A-Z]/g`로.
- 비평1 #7 늑대인간 "naked man" — 생성 거절 위험 때문에 `near-naked, in a torn loincloth`.
- 예언자(비평1 지정)와 불면증환자가 모두 "촛불만 피"라 썸네일에서 겹친다 → 불면증환자의 피는 `raw rims of her eyes`로 옮겼다.
- `.is-dead`의 `grayscale` filter와 덱 0장 카드의 `grayscale` → opacity로 바꿨다(비평5 #8의 filter 예산 취지. duotone 아트에는 grayscale을 걸어도 피만 사라진다).
- 아트 창(비평1 #1, 비평5 #9): 카드 그림판을 종이 여백 안쪽 전면으로, 리본을 `top:76%; height:12%`로. 앞면에 종이 여백을 둬서 먹 위주의 그림이어도 앞뒤가 즉시 구분된다.
- 비평4 #9 데스크톱 키아트 크롭 — 새 키아트 구도(위 40% 하늘에 달)에 맞춰 위 10%, 아래 15%를 자른다.


**3차 개정 — 리플레이 제안 6개(기획:구조, 기획:데이터, 디자인:연출, 디자인:UI, 디자인:에셋, 성능) 병합**
- 시점: 디자인:에셋의 "이동 카드는 항상 뒷면, 본 카드만 뒤집기"는 기각. 결말에서 관객이 알고 싶은 것은 "무엇이 어디로 갔나"이고, 뒷면 이동은 그 답을 숨긴다. 구조·연출·UI의 **전지적 시점(전부 앞면)**을 쓰고, 에셋안의 정보 비대칭은 `rp-eye`/`rp-blind` 문양과 믿은 패 밑줄로 옮겼다.
- 데이터 모델: 데이터안의 **정수 슬롯 + 배분 슬롯 = 카드 id + `mv` 이벤트**를 채택했다. UI안의 이벤트마다 판 스냅샷(`cards`, 10인 ≈ 3KB)과 연출·에셋안의 역할 문자열 기반 이벤트는 기각. 같은 역할 카드가 여럿이면 추적할 수 없고, 스냅샷은 클라이언트가 접어서 공짜로 만든다.
- 전송: 성능안의 별도 `night` 소켓 이벤트 + 재접속 ack는 기각하고 `result` 안에 넣었다. timeline 문장을 빼면 결과 `state`가 오히려 줄고(§13.3), 재접속 경로를 하나 더 만들 이유가 없다. 대신 크기 단언(≤ 6KB, `night` ≤ 1.5KB)을 sim.js에 고정했다.
- 빛: 연출안의 화면 전체 먹 막 `.iris`와 에셋안의 `200vmax` 그라디언트 레이어는 기각. 375px·DPR 3에서 승격 레이어 하나가 수십 MB의 GPU 메모리를 쓴다. 280px 광원 하나를 옮기고 어둠은 `.is-dim`과 `light-night`로 만든다.
- 확대: 구조안의 대상 카드 `scale(1.6)`은 흐려지므로 기각. 미리 렌더한 `sm` 확대 카드(`.rp-focus`)를 띄운다.
- 빈 차례: 연출안의 "빈 단계는 넣지 않는다"는 기각. 예언자가 제단에 있었다는 사실 자체가 낮 토론의 거짓말을 판정하는 정보다. 900ms 짧은 박자로 넣는다(전부 비었으면 한 박자로 접는다).
- 투표선: 구조안의 동시 400ms 대신 연출안의 좌석 순 80ms 간격. 375px에서 동시에 그은 10개의 선은 판독되지 않는다.
- 조작: UI안의 속도를 시트 메뉴에 숨기는 안은 기각, 눈금 자 오른쪽 `×1/×2` 토글로. 끄는 동안은 끝 스냅샷, 놓으면 그 박자 재생(UI·성능안 합침).
- 내 한 줄: UI안의 `self`와 구조안의 믿은 패를 하나로 합쳐 판결 막(`.verdict-self`)과 끝판 보드(`.rec-belief`)가 같은 계산을 쓴다.
- 문양: 에셋안 8종 중 4종(`rp-eye`, `rp-blind`, `rp-swap`, `rp-copy`)만 채택하고 조작용 `rp-step`을 더했다. `rp-paw`·`rp-gallows`·`rp-cut`·`rp-wake`는 기존 `tm-wolf`, `.is-dead` 칼자국, `rp-eye`와 겹친다.
- 새 이미지: 여섯 제안 모두 0장에 동의. 에셋안의 예비 프롬프트(`bg-replay`)도 만들지 않는다. 리플레이의 무대는 밤새 앉아 있던 그 탁자여야 "그 자리에서 움직였다"가 읽힌다. `IMAGE_PROMPTS.md`는 바뀌지 않는다.
- 규칙 해석: 데이터안이 제기한 `eff()`(도플갱어 카드를 쥔 사람 = 복사한 역할) 문제는 **현행 유지**로 확정했다. 공식 규칙과 같다. 시나리오 `doppel-card-moved`로 고정한다(§13.1).
- 부수 수정: §6.6·§6.8의 `stroke-dashoffset` 선은 §8.3 위반이었다(연출·성능안 지적). `.ln` `scaleX`로 바꿨다. 「밤의 기록」이라는 이름은 리플레이에 주고, 밤 중 개인 정보 기록은 `네가 본 것`으로 바꿨다. 플레이어 중 늑대가 없을 때 마을 승리 판결 `늑대가 목매달렸다.`는 거짓이므로 `늑대는 없었다.`, 하수인 승리는 `하수인이 웃었다.`를 더했다(§10.9).

**4차 개정 — 리플레이 비평 3개(이해도, 데이터 정합성, 아트·성능) 반영**

비평1(17개)·비평2(16개)·비평3(15개)은 아래를 빼고 **전부 반영**했다(§10.13, §13 전면 개정, §4.5·§4.6·§5.3·§5.4·§6.1·§7.3·§7.4·§8.2·§8.3·§10.0·§10.7·§10.9·§11). `IMAGE_PROMPTS.md`는 바뀌지 않는다(새 이미지 0장 유지, 확대 카드의 폴백은 기존 `md` 폴백 판).

기각
- 비평3 #13의 "총 길이 26~40초 유지" — 비평1 #1(바뀐 좌석마다 한 박자)·#3(읽기 시간 = 90ms × 음절)과 함께 지킬 수 없다. 오너 요구가 "밤에 무슨 일이 있었는지 알아야 끝난다"이므로 이해를 택했다. 길이는 §9의 하드 예산이 아니고(§9는 바이트·프레임), 탭·눈금 자·`×2`·`건너뛴다`로 언제든 줄일 수 있다. 박자별 가변 정적(+400)과 2000ms 기준은 그대로 반영.
- 비평2 #13의 "`gameId` = 카운터 + 방 코드" — §7.4가 이미 `startGame`마다 무작위 4바이트를 새로 만든다. 판마다 바뀐다는 요구만 명문화했다.
- 비평2 #13의 "W1과 W6을 한 stamp 해시로 묶기" — 정적 사이트와 웹 서비스는 따로 배포되어 원자적이지 않다. 대신 새 클라이언트 먼저 + 서버의 호환 키 한 릴리스(`hunterKills`, 빈 `timeline:[]`)로 풀었다.

조정해서 반영한 것
- 비평1 #1 `dawn.seat` 900ms 고정 → 같은 비평 #3의 읽기 규칙을 따라 `max(900, 90ms × 음절)`. "바뀐 좌석"은 카드가 바뀌었거나 처음 역할 ≠ 마지막 실제 역할(도플갱어가 제 패를 지킨 경우 포함)인 좌석.
- 비평1 #2 이름표 `이름 · 역할` — 기존 `.seat-name`을 늘리면 W9가 남의 클래스를 재정의하게 된다. W9 소유 `.rp-tag`를 좌석·제단 좌표에 따로 두고 좁으면 두 줄로. 아래 줄의 두 제안(비평1 #2 "너는 …로 시작했다", #6 "제단 세 장 이름")은 한 줄로 합쳤다. `T.josa`에 `으로/로` 추가.
- 비평1 #5·비평2 #3 빈 차례 — 두 안을 합쳐 `idleCards(st)`의 박자 시작 때 위치를 **전부** 켜고, 하나라도 좌석에 있으면 `idle.moved`, 아니면 과거형 `처음부터 제단에 있었다`.
- 비평1 #10·비평3 #12 `네 패였다` — 하나로 합침. 조건은 비평1의 `tg` 또는 `mv`(엿보인 것도 "내 패"의 일이다), +600ms 유지는 `mv`일 때만(비평3).
- 비평3 #14 행동자 링을 토큰의 `::after`에 — W7의 `.is-dead` 칼자국이 토큰 의사 요소와 부딪칠 수 있어, 같은 표현(2px `--bone-hi`, opacity만)을 W9 소유 `.rp-ring`(좌석마다 한 개)으로 옮겼다. `hit` 링(`.rp-hit`)은 바깥 이중 링으로 구분.
- 비평3 #2 `.is-dim` 트랜지션 제거 — 남의 상태 클래스의 트랜지션을 끌 수 없으므로 리플레이 전용 `.rp-dim`(트랜지션 없음)을 쓴다.
- 비평3 #15 "lite 물결 동시 4장" — lite는 이미 물결이 없다. 13장 개별 크로스페이드도 동시 13개라, lite는 앞면을 즉시 놓고 `.rp` 전체를 한 번 opacity로 띄운다(레이어 1개).
- 비평1 #12·비평2 #9 사냥꾼 — 서버 기록은 `deaths`에 `{by:'miss', s, h}`(지목 없음은 `s:-1`)로 넣어 큐 순서를 지킨다. `miss`는 죽음이 아니며 사망 판정은 `players[].dead`만.
- 비평1 #13·비평2 #11 판결 이유 — 좌석을 실은 `[코드, 좌석]` 쌍으로 바꾸고, "늑대가 없다"는 결과 문장에서 떼어 앞 항목(`wolf_center` "새벽에…" / `wolf_none`)으로 분리했다. 기존 `no_wolf_no_death`·`no_wolf_innocent_died`는 `no_death`·`innocent_died`로 이름을 바꿨다.
- 비평1 #15 제단 로마 숫자 — 리플레이만이 아니라 게임 전체(탁자 라벨, 서버 문구, 결과)에서 위치 이름으로 바꿨다. 로마 숫자는 밤 차례 전용.
- 비평1 #11·비평2 #9·#10·비평3 #9 투표선 — 대상별 묶음(표 많은 순, 동표는 좌석 순) + 지목 없는 좌석 건너뜀 + 뼈색, 처형된 자에게 들어가는 선만 처형 박자에 피색 사본. 셋이 한 그림으로 합쳐진다.
- 비평3 #7 복사 문양 — `rp-copy`를 지우고 기존 `sg-doppelganger`를 도장으로 쓴다. 그래서 replay.js 문양은 4종(`rp-eye`·`rp-blind`·`rp-swap`·`rp-step`), `rp-turn`은 끝판 보드에서도 쓰이므로 index.html 스프라이트(W3).
- 비평3 #10 와이프 — 판결뿐 아니라 홈 제목(§6.1)·리플레이 자막도 같은 덮개 `scaleX`로. `clip-path` 애니메이션은 이제 문서에 없다.
- replay 예산 7KB→12KB, 지연 로드라 크리티컬 패스 무관.

---

## 13. 밤의 기록 (게임 종료 리플레이)

> **오너 요구**: 이 게임은 밤에 무슨 일이 있었는지 알아야 끝난다. 결말에서 밤의 모든 행동을 순서대로, 패가 사람과 제단 사이를 어떻게 옮겨 다녔는지, 누가 무엇으로 끝났는지, 그리고 지목·처형·사냥꾼 연쇄·판결까지 보여 준다. 영화처럼 살벌하되 읽기 쉽고, 건너뛰고 되감고 다시 볼 수 있고, 375px에서 먼저 완성되며, 1MB/s에서도 가볍다.
> 이 장은 결말 화면 전체를 정의한다(§6.9는 요약). 이 장과 다른 절이 충돌하면 이 장이 이긴다. **단 §9 예산은 예외 없이 이 장보다 우선한다.**

### 13.0 결정 요약
1. **하나의 시퀀스, 다섯 막**: 서막(처음 패) → 밤(차례마다 박자) → 새벽(마지막 패, 바뀐 좌석마다 한 박자) → 심판(지목·처형·사냥꾼) → 판결(배너·이유·내 한 줄·도장). 그다음 끝판 보드. 예전 12초 결말 시퀀스는 뒤쪽 세 막으로 흡수됐다.
2. **전지적 시점.** 리플레이에서는 모든 패가 앞면이다. 숨기는 연출로 긴장을 만들지 않는다. 대신 **누가 무엇을 알았는지**를 눈 문양으로 따로 표시하고, 끝에서 **믿은 패와 실제 패**를 맞세운다. 이 게임에서 가장 강한 순간은 "내가 모르는 사이에 바뀌었다"이므로, 남이 내 패를 건드린 박자에는 `네 패였다` 도장이 찍히고 새벽에는 좌석마다 "처음 → 마지막, 이제 어느 편"을 한 박자씩 말해 준다.
3. **실물 카드 한 장 = 고유 id 하나 = DOM 노드 하나.** 늑대인간 2장, 마을주민 3장처럼 같은 역할이 여럿이어도 어느 카드가 어디로 갔는지 놓치지 않는다. 위치가 바뀌면 같은 노드가 `translate`로 이동한다.
4. **서버는 사실만, 문장은 클라이언트가.** 서버는 정수 슬롯으로 된 구조화 이벤트를 보내고, 문장은 §10.13 템플릿으로 만든다. 말투는 카피 덱 한 곳에서 관리된다.
5. **박자 스냅샷.** 클라이언트가 이벤트를 순수 함수로 접어 박자마다 판의 상태를 미리 계산한다. 되감기·점프는 스냅샷을 즉시 놓는 것이다. 역방향 애니메이션은 없다.
6. **새 이미지 0장.** 아틀라스·뒷면(모닥불에서 이미 받음)과 인라인 SVG 문양(replay.js 4종 + 스프라이트의 `rp-turn`·기존 역할 문양)으로 전부 그린다. 큰 아트는 이미 디코드된 경우에만 쓴다.
7. **리플레이 카드는 평면이다.** 3D(`preserve-3d`, `rotateY`)를 쓰지 않는다. 뒤집기는 2D `scaleX`로 한다(§13.5). 13장이 상시 합성 레이어로 남는 것을 막는다.

### 13.1 카드 정체성 모델
- **슬롯**: 정수 하나로 모든 위치를 쓴다. `0..n-1` = 좌석(= `result.players` 순서 = 게임 시작 시 `room.order`를 고정한 `g.seats`), `n` `n+1` `n+2` = **왼쪽·가운데·오른쪽 제단**(`g.center[0..2]`). 제단에는 로마 숫자를 쓰지 않는다(로마 숫자는 차례 전용, §10.0-5).
- **카드 id(`c`)**: 셔플 직후 배분 순간의 슬롯 번호. `deal[c] = role`. 처음에는 `pos[slot] = slot`.
- **불변식**: 밤 동안 언제나 `deal[pos[s]] === (s < n ? g.cards[g.seats[s]] : g.center[s-n])`. 교환은 `swapSlots()` 하나로만 하며, 개발 환경에서는 `swapSlots` 직후마다, 모든 환경에서는 `resolve()` 첫 줄에서 단언한다.
- **도플갱어 카드의 효과 (규칙 확정)**: 밤이 끝났을 때 **도플갱어 카드를 쥔 사람은 도플갱어가 복사한 역할이다**(공식 규칙과 같다. 현재 `eff()` 그대로). 도플갱어 플레이어가 자기 카드를 지키면 복사한 역할, 카드를 빼앗기면 새로 받은 카드의 역할이다. 시나리오 `doppel-card-moved`·`robber-steals-doppel`로 고정한다.
- **`effRole(c)`**(클라이언트, `build()` 안): `copyAs` = `copy` 이벤트의 `deal[see[0][0]]`(도플갱어가 본 카드). `effRole(c) = deal[c] === 'doppelganger' && copyAs ? copyAs : deal[c]`. 도플갱어는 언제나 첫 차례이므로 이후 모든 박자에서 `copyAs`가 정해져 있다. **모든 `<r>`, 믿은 패, 불면증환자 "바뀜" 판정, 끝판 보드가 `effRole`을 쓴다.** 표기는 `도플갱어 → <r>`, 카드에는 복사 순간부터 복사한 역할 문양을 겹친다(`.rp-copyof`). 단언: 모든 좌석 `effRole(end[s]) === players[s].effective`.
- **깨는 규칙**: 누가 어느 차례에 깨는지는 **처음 받은 패(`g.original`)만**으로 정해진다(`actorsFor`). 강도·도플갱어-강도·도플갱어-주정뱅이가 늑대 카드를 먼저 가져가도, 그 사람은 늑대와 함께 깨지 않고 원래 늑대(이제 다른 패를 쥔)가 깬다. 따라서 **무리·주인·형제는 이벤트의 `by`·`know`가 유일한 출처**이고, 클라이언트는 `pos`(누가 늑대 카드를 쥐었나)로 이를 추론하지 않는다. 시나리오 `doppel-robber-steals-wolf`로 고정한다. 리플레이는 이 규칙을 처음 어긋나는 순간 한 번 주석으로 말한다(`note.wake`, §10.13).

### 13.2 서버 기록 (W1, `server.js`)
```js
// startGame: 셔플 직후
g.id    = crypto.randomBytes(4).toString('hex'); // §7.4. startGame마다 새로 만든다(`다시, 밤으로` → 새 gameId → 자동 재생 키도 새로)
g.seats = [...room.order];               // 좌석 고정. 게임 안의 모든 슬롯 계산은 g.seats만 쓴다(room.order 금지)
g.deal  = cards.slice();                 // cardId -> role (좌석 n개 + 제단 3)
g.pos   = g.deal.map((_, i) => i);       // slot -> cardId
g.ev    = [];

const slotOf = (g, pid) => { const s = g.seats.indexOf(pid); if (s < 0) throw new Error('slotOf ' + pid); return s; };
function rec(g, e) {                      // 모든 기록은 여기를 지난다
  const dop = e.by.filter((s) => g.original[g.seats[s]] === 'doppelganger');
  if (dop.length) e.dop = dop;            // by 중 도플갱어. 비면 키를 넣지 않는다
  if (e.r === e.st) delete e.r;           // r이 없으면 r = st
  g.ev.push(e);
}
function swapSlots(room, a, b) {          // a, b = 슬롯. g.cards/g.center를 직접 바꾸는 코드는 금지
  const g = room.game, n = g.seats.length, ca = g.pos[a], cb = g.pos[b];
  g.pos[a] = cb; g.pos[b] = ca;
  const put = (s, c) => s < n ? (g.cards[g.seats[s]] = g.deal[c]) : (g.center[s - n] = g.deal[c]);
  put(a, cb); put(b, ca);
  if (process.env.NODE_ENV !== 'production') checkInvariant(g);   // 깨뜨린 단계에서 바로 실패
  return [[ca, b], [cb, a]];             // mv 항목: [cardId, to]. 출발지는 클라이언트가 pos로 안다
}
```
- `actorsFor`, 밤의 `isPlayer`, `finishPending`의 무작위 대상은 `room.order` 대신 `g.seats`를 쓴다. 게임 중 `room.order`는 슬롯 계산에 쓰지 않는다.
- CI(sim.js 앞단 grep): `swapSlots`와 `startGame` 밖에 `g.cards[…] =`·`g.center[…] =` 대입이 있으면 실패.

**이벤트 스키마** (키는 짧게. 이름·플레이어 id는 넣지 않는다)
```ts
NightEvent = {
  st:   Step,            // 일어난 차례 = 기록 순간의 g.stepRole. 'doppelganger'|'werewolf'|'minion'|'mason'|'seer'|'robber'|'troublemaker'|'drunk'|'insomniac'
  r?:   Role,            // 실제로 쓴 능력. st와 같으면 생략. 도플갱어 차례의 예언자 행동이면 st:'doppelganger', r:'seer'
  k:    'copy'|'know'|'peek'|'swap'|'skip'|'idle',
  by:   int[],           // 행동한 좌석 슬롯 (늑대·하수인·프리메이슨·불면증환자는 여럿일 수 있다)
  dop?: int[],           // by 중 처음 패가 도플갱어인 좌석. rec()가 채운다
  tg?:  int[],           // 고른 슬롯 (예언자 제단 2장, 말썽쟁이 2명 등)
  see?: [cardId, slot][],// 행동자가 본 카드와 본 순간의 위치. 역할은 effRole(cardId). copy의 복사 역할 = deal[see[0][0]]
  know?: int[],          // 하수인이 본 늑대 좌석 (없으면 []). 늑대·프리메이슨은 by가 곧 서로 안 사람들이라 생략
  mv?:  [cardId, to][],
  auto?: 1               // 시간 초과. copy/swap이면 '밤이 대신 골랐다', skip이면 '때를 놓쳤다'
}
```

**기록 지점** (모든 행의 `st` = `g.stepRole`. 행마다 리터럴로 쓰지 않는다)

| 차례 | 위치 | 기록 |
|---|---|---|
| 깬 사람 없음 | `runStep`, `actors.length===0` | `{st, k:'idle', by:[]}` — 처음 그 패를 받은 자가 없었다는 사실 자체가 정보다 |
| 도플갱어 복사 | `doAction` `doppelganger` | `{st, r:'doppelganger', k:'copy', by:[s], tg:[t], see:[[pos[t],t]]}` (+`auto:1`) |
| 도플갱어 즉시 행동 | 해당 case에서 `p.fromDoppel`이면 | 각 역할과 같은 모양. `st`는 자동으로 `'doppelganger'`, `r`은 그 역할 |
| 늑대 둘 이상 | `runStep` 프롬프트 생성 후 **한 번** | `{st, k:'know', by:[...]}` |
| 외로운 늑대 | `doAction` `lonewolf` | `{st, r:'werewolf', k:'peek', by:[s], tg:[n+i], see:[[pos[n+i],n+i]]}` / 보지 않음 `k:'skip'`. 도플갱어가 외로운 늑대여도 같다(`dop`가 붙는다) |
| 하수인 | `runStep` 한 번 | `{st, k:'know', by:[...], know:[늑대 좌석]}` (도플갱어-하수인 포함) |
| 프리메이슨 | `runStep` 한 번 | `{st, k:'know', by:[...]}` (혼자여도 기록) |
| 예언자 | `doAction` | `{st, r:'seer', k:'peek', by:[s], tg:[t] 또는 [n+i,n+j], see}` / 보지 않음 `k:'skip'` |
| 강도 | `doAction` | `mv = swapSlots(s,t)` 뒤 `{st, r:'robber', k:'swap', by:[s], tg:[t], mv, see:[[훔친 카드, s]]}` / `k:'skip'` |
| 말썽쟁이 | `doAction` | `{st, r:'troublemaker', k:'swap', by:[s], tg:[a,b], mv}` (`see` 없음) / `k:'skip'` |
| 주정뱅이 | `doAction` | `{st, r:'drunk', k:'swap', by:[s], tg:[n+c], mv}` (`see` 없음, 시간 초과면 `auto:1`) |
| 불면증환자 | `runStep` 한 번 | `{st, k:'peek', by:[...], see:[[pos[s],s], …]}` (좌석 순) |
| 시간 초과로 아무것도 안 함 | `finishPending` else 분기(정보형 `info` 제외) | `{st, r: p.type==='lonewolf' ? 'werewolf' : p.type, k:'skip', by:[s], auto:1}` — 도플갱어가 즉시 행동 역할을 베낀 뒤 시간 초과면 `st:'doppelganger', r:'seer'|'robber'|'troublemaker'`가 저절로 나온다 |

- 정보형 차례(늑대 확인·하수인·프리메이슨·불면증환자)는 `runStep`에서 이미 기록하므로 시간 초과를 따로 남기지 않는다.
- `g.ev.length <= 20`을 단언한다(10인 풀덱 최대 약 12건).
- `nightLog`(개인의 `네가 본 것`)는 지금처럼 유지한다. `label()`·`timeline()`은 삭제한다(호환 필드는 §13.3).

**resolve()**
```js
const ids = g.seats, n = ids.length;
for (let s = 0; s < n + 3; s++) assert(g.deal[g.pos[s]] === (s < n ? g.cards[ids[s]] : g.center[s - n]));
// 사냥꾼 연쇄 큐를 돌면서 deaths를 만든다 (순서 = 연출 순서)
const deaths = dead.map((i) => ({ s: slotOf(g, i), by: 'vote' }));      // dead는 좌석 순
const queue = [...dead];
while (queue.length) {
  const d = queue.shift();
  if (final[d] !== 'hunter') continue;
  const t = g.votes[d] ?? null;
  if (t && !dead.includes(t)) { dead.push(t); queue.push(t); deaths.push({ s: slotOf(g, t), by: 'hunter', h: slotOf(g, d) }); }
  else deaths.push({ s: t ? slotOf(g, t) : -1, by: 'miss', h: slotOf(g, d) });   // 죽음이 아니다: 이미 쓰러진 자(s) 또는 지목 없음(-1)
}
// why — 판결 이유 (§10.13). [코드, 좌석?][], 표시 순서 그대로
const S = (a) => a.map((i) => slotOf(g, i));
const dw = S(dead.filter((i) => final[i] === 'werewolf')), dt = S(dead.filter((i) => final[i] === 'tanner'));
let why;
if (wolves.length) why = dw.length ? [['wolf_died', dw], ...(dt.length ? [['tanner_too', dt]] : [])]
                       : dt.length ? [['tanner_blocked', dt]] : [['wolf_lived', S(wolves)]];
else {
  why = [[g.deal.includes('werewolf') ? 'wolf_center' : 'wolf_none']];
  if (!dead.length)        why.push(['no_death']);
  else if (dt.length)      why.push(['no_wolf_tanner', dt]);
  else if (minions.length) why.push(dead.every((i) => final[i] === 'minion') ? ['minion_only_died', S(dead)] : ['minion_lived', S(minions)]);
  else                     why.push(['innocent_died']);
}
```
- `by:'miss'` 항목은 죽음이 아니다. 죽음 판정은 언제나 `players[i].dead`이며, 클라이언트는 `miss`를 `hunt0`/`hunt0.none` 박자로만 쓴다.
- `why`는 기존 승패 계산(`villageWin`/`wolfWin`)을 바꾸지 않는다. 같은 분기를 글로 옮긴 것이며, sim.js가 `why`와 `winners`의 대응을 단언한다.

### 13.3 결과 페이로드 (`room.result`, `phase==='result'`에서만)
```ts
room.result = {
  gameId, players /* 순서 = 좌석 슬롯. {id,name,original,final,effective,team,vote,votes,dead,win} 기존 그대로 */,
  winners, noDeath, wolvesInPlay, doppelCopy,
  center: { original, final },              // 기존 호환 (끝판 보드 정적 렌더용)
  night: { deal: Role[], ev: NightEvent[], end: int[] },   // end = 마지막 pos (검증용)
  deaths: ({ s, by:'vote' } | { s, by:'hunter', h } | { s /* -1 = 지목 없음 */, by:'miss', h })[],
  why: [Why, int[]?][],
  // 한 릴리스 동안만 호환: hunterKills(기존 모양), timeline: [] — 다음 릴리스에서 삭제
}
```
- 투표는 `players[i].vote`(플레이어 id)와 `votes`를 그대로 쓴다. 클라이언트는 id → 슬롯을 **`result.players.findIndex(p => p.id === id)`로만** 바꾼다(`state.players` 금지 — 결과 화면에서 누가 떠나면 줄어든다).
- **배포 순서**(정적 사이트와 웹 서비스는 따로 배포되어 원자적이지 않다): ① 새 클라이언트(W6·W9)를 먼저 낸다. 새 클라이언트는 `night`가 없는 결과를 받으면 리플레이 없이 끝판 보드만 그린다. ② 그다음 서버(W1). 이 릴리스의 서버는 옛 클라이언트(SW 캐시)가 깨지지 않도록 `hunterKills`와 빈 `timeline:[]`을 함께 보낸다. ③ 다음 릴리스에서 두 키를 지운다.
- **크기**: 10인 풀덱에서 `night` ≈ 0.9~1.1KB(`deal` 13개 ≈ 170B + 이벤트 ≤ 12건 × 50~75B; `r===st` 생략, `as` 없음, `mv`는 `[c,to]`). 한도: `night` ≤ 1.5KB, 결과 `state` ≤ 6KB(§9.1). **추정이 아니라** 시나리오 `max-bytes`에서 플레이어마다 실제 `Buffer.byteLength(JSON.stringify(view(room, pid)))`(myLog 한국어 문장, 36자 id의 `vote`, 호환 키 포함)를 압축 없이 잰다.
- **전송**: `state`의 `result` 안에 넣는다(별도 소켓 이벤트 없음). 재접속 클라이언트도 같은 경로로 받는다. `state`는 변화가 있을 때만 보내므로 재전송 비용은 무시할 만하다.

**5인 예시** (좌석 0 민수, 1 서연, 2 지훈, 3 하은, 4 도윤 / 슬롯 5·6·7 = 왼쪽·가운데·오른쪽 제단. 덱: 도플갱어, 늑대인간 2, 예언자, 강도, 말썽쟁이, 주정뱅이, 불면증환자)
```json
{
  "night": {
    "deal": ["werewolf","seer","doppelganger","robber","troublemaker","werewolf","drunk","insomniac"],
    "ev": [
      {"st":"doppelganger","k":"copy","by":[2],"tg":[0],"see":[[0,0]],"dop":[2]},
      {"st":"werewolf","k":"know","by":[0,2],"dop":[2]},
      {"st":"seer","k":"peek","by":[1],"tg":[5,7],"see":[[5,5],[7,7]]},
      {"st":"robber","k":"swap","by":[3],"tg":[0],"mv":[[3,0],[0,3]],"see":[[0,3]]},
      {"st":"troublemaker","k":"swap","by":[4],"tg":[1,2],"mv":[[1,2],[2,1]]},
      {"st":"drunk","k":"idle","by":[]},
      {"st":"insomniac","k":"idle","by":[]}
    ],
    "end": [3,2,1,0,4,5,6,7]
  },
  "deaths": [{"s":3,"by":"vote"}],
  "why": [["wolf_died",[3]]]
}
```
밤이 끝나면 하은이 늑대 카드(c0)를, 민수가 강도 카드(c3)를, 지훈이 예언자 카드(c1)를, **서연이 도플갱어 카드(c2)를** 쥐고 있다. 도플갱어가 늑대를 복사했으므로(`copyAs` = `deal[0]`) 서연은 늑대다(§13.1). 하은이 3표로 처형되어 마을이 이기고(`늑대 하은이 처형됐다.`), 서연은 진다. 마지막 두 `idle`은 한 박자(`주정뱅이, 불면증환자는 깨지 않았다.`)로 합쳐진다. 서연의 화면 마지막 줄은 `너는 예언자라 믿었다. 너는 늑대인간이었다. 네가 쥔 도플갱어 패는 늑대인간을 베낀 패였다. 그래서 늑대 편이었다. 졌다.` — 이 줄이 리플레이의 존재 이유다.

### 13.4 시퀀스 (막과 박자, 1배속)
박자 = 리플레이의 최소 단위. 탭·눈금·되감기는 모두 박자 단위다. **읽기 시간** = `max(바닥, 90ms × 자막 두 줄 음절 수)`(§10.13). 아래 길이는 바닥값이며, 긴 문장은 그만큼 늘어난다.

| 막 | 박자 수 | 내용 | 길이(ms) |
|---|---|---|---|
| 0 암전 | — | 완전 암전, 정적. `light-night`만 남는다 | 600 |
| 1 **서막** | 1 | 모든 좌석(내 자리 포함)과 제단의 카드가 시계 방향 물결로 앞면이 된다(120ms 간격, 동시 최대 6장, **2D 뒤집기** §13.5). 좌석·제단마다 이름표 `.rp-tag`(`이름 · 역할`, 제단은 `왼쪽 제단 · 역할`)가 함께 켜진다. 자막 `pro` | `max(3500, 120×(n+3) + 320 + 읽기)` |
| 2 **밤** | 이벤트마다 1. 연속된 `idle`은 1로 합침 | §13.5. 행동 박자 = [정적 400: 패가 움직이거나 늑대가 낀 박자만] + 빛 컷 320 + 행동 ≤ 600 + 읽기(바닥 1400). 빈 차례 `idle`·`skip.auto` = 빛 컷 320 + 읽기(바닥 900). 도플갱어가 즉시 행동을 하면 복사 박자 바로 다음 박자로 이어지고 빛은 움직이지 않는다. 전부 `idle`이면 밤 전체를 박자 하나(`quiet`)로 접는다. 남이 내 패를 옮긴 `hit` 박자(`mv`)는 읽기 +600 | 박자 합 |
| 3 **새벽** | 1 + 바뀐 좌석 수 | ① `dawn`: 빛이 걷히고 `light-day`로 크로스페이드(1100). 처음과 다른 카드가 놓인 슬롯에 `.is-swapped`(귀퉁이 찢김 + `rp-turn` 문양)가 물결로 붙는다. 밤의 칼선 자국은 전부 opacity **.12**로 가라앉는다(10인 20개의 선이 엉키지 않게). 이름표가 `이름 · 마지막 역할`로 바뀐다. 2000 ② **`dawn.seat`**: 처음 역할과 `effRole(end[s])`가 다르거나 카드가 바뀐 좌석마다, 좌석 순으로 한 박자. 그 좌석의 카드 행로 자국만 opacity .5로 오르고 나머지 좌석·카드는 `.rp-dim`. 자막 `dawn.seat` | 2000 + 박자마다 읽기(바닥 900) |
| 4 **심판** | 2 + 사냥꾼 박자 수 | ① `vote`: `light-vote` 600 → **대상별 묶음**으로 투표선 `.ln`(`--bone-dim`)을 긋는다. 묶음 순서 = 받은 표 많은 순, 같으면 좌석 순(자막·`exec`도 같은 순서). 한 묶음의 선은 함께 긋고, 300ms 뒤 대상 `.seat-mark`에 표 수가 도장처럼 찍힌 다음 다음 묶음으로 간다. 지목하지 않은 좌석(`vote:null`)은 건너뛴다. 자막 `vote`/`vote1` (600 + 300×묶음 + 읽기) ② 정적 800 → **처형**: 처형된 좌석으로 들어가는 선만 피색 사본이 opacity 0→1로 겹친다. `FX.shake` `#main` ±6px 4회 240ms + 피 섬광 120ms + 토큰 X + 이름표 취소선. 처형된 카드가 `md` 확대 카드로 떠오른다. 동표면 같은 박자. 자막 `exec` (2200) / 아무도 안 죽으면 흔들림 없이 1200 정적, 자막 `nodeath` ③ **`deaths`의 `hunter`·`miss` 항목마다 1박**: `hunter`는 사냥꾼 카드 문양이 피색으로(opacity 200), 그의 투표선만 2px 피색 사본으로 다시 그어진 뒤 두 번째 처형, 자막 `hunt`(1800). `miss`는 그의 선만 뼈색으로 긋고 멈춘다(지목 없음이면 선 없음), 자막 `hunt0`/`hunt0.none`(1000). 첫 사냥꾼 박자에만 `hunt.rule` | ≈ 4000~9000 |
| 5 **판결** | 1 | 전폭 검은 띠 `.verdict`(위아래 1px 피 괘선). Hanbam 한 줄은 그 위를 덮은 `--void` 덮개 div가 `scaleX(1→0)`, `transform-origin:right`, 360ms `steps(5)`로 걷히며 드러난다(`clip-path` 애니메이션 금지, §8.2). `verdict-*` 이미지가 이미 있으면 띠 뒤 opacity .5. 400ms 뒤 `.verdict-why`, 다시 600ms 뒤 `.verdict-self`(내 화면만, 읽기 규칙 적용). 마지막에 개인 도장 −6° `이겼다`/`졌다` 300ms | 3300 + 내 한 줄 읽기 |
| → | — | 끝판 보드로 크로스페이드 300ms(§13.8) | 300 |

- **총 길이**: 7인 보통 판 ≈ 38~46초, 10인 최악(9차례 전부 + 도플갱어 2박 + 바뀐 좌석 8 + 사냥꾼 2연쇄) ≈ 65초. `×2`는 모든 길이를 절반으로(정적·읽기 포함). 이해가 길이보다 우선이다. 대신 `건너뛴다`·탭·눈금 자로 언제든 줄일 수 있다.
- `건너뛴다`는 **재생 첫 프레임부터** HUD 오른쪽에 있다.
- **행동 박자의 구성**: [0~400 정적(패 이동·늑대 박자만)] → **빛 컷**: `.rp-glow` opacity→0 120ms, opacity가 0인 그 프레임에 `.rp-dim` 클래스 집합 교체 + 빛 `translate` 즉시 설정, opacity→1 200ms → 위 줄 자막 덮개 와이프(`scaleX` 360ms `steps(5)`) → 행동(§13.5, ≤ 600) → 위 줄 + 400ms에 아래 줄 → 읽기 유지(정적). **정적 → 동작 → 읽기.** 느린 공포, 빠른 폭력(§8.2).
- **첫 자동 재생의 멈춤**: `result:<gameId>` 첫 재생에서는 패가 움직인 박자(`swap`) 끝에서 재생을 멈추고 탭(또는 `잇는다`)을 기다린다. 다시 보기·`×2`에서는 멈추지 않고 이어진다.

### 13.5 시각 문법 (움직임은 다섯 종류뿐, 한 박자에 한 종류)

| 문법 | 표현 | 이벤트 |
|---|---|---|
| **빛이 옮겨 간다** | 화면의 유일한 광원 `.rp-glow`(280×280px div). 판화의 톤 단계처럼 **딱 끊긴 세 띠**: `radial-gradient(circle, var(--light-candle) 0 22%, rgba(214,170,110,.06) 22% 38%, rgba(214,170,110,.03) 38% 52%, transparent 52%)`(새 밝은 리터럴 금지). **미끄러지지 않고 끊어서 옮긴다**: opacity→0 120ms → `translate` 즉시 → opacity→1 200ms. 행동자 표시는 그 좌석의 `.rp-ring`(2px `--bone-hi` 원, 정적)이 opacity로만 켜진다. 나머지 좌석·카드는 `.rp-dim`(opacity .3, **트랜지션 없음**, 빛이 0인 프레임에 교체 — 어둠은 컷으로 떨어진다) | 모든 행동 박자 |
| **본다** | 행동자에서 대상까지 칼선 `.ln`(`--bone-dim`, `scaleX` 280ms `--ease-ink`). 대상 위치에 **확대 카드**(`.rp-focus`, 미리 렌더한 **`md` 128px** 앞면, opacity 0→1 + `translateY(-12px)` 360ms)가 뜨고 옆에 `rp-eye` 문양이 찍힌다(`scaleY` 0→1 240ms, 눈꺼풀이 열리듯). 큰 아트는 이미 decode된 경우에만, 아니면 `md` 폴백 판(먹 + 해칭 + 46% 문양). 원래 카드는 움직이지 않는다. 박자 끝에 확대 카드만 사라지고 칼선은 opacity .25 자국으로 남는다 | copy, peek(예언자·외로운 늑대·불면증환자). 불면증환자는 칼선 없이 제 카드에 확대만 |
| **바꾼다** | 300ms 완전 정지 → 두 `.rp-card`가 각자 **세 프레임 키프레임 하나**로 서로의 좌표로 간다: 시작 → 40% 지점에서 `scale(calc(var(--s)*1.8))`(들어 올려 빼앗는다) → 도착. 300ms `--ease-press`, 래퍼 없음, transform만. 착지 순간 `.rp-card::after` 뼈색 섬광 60ms(opacity) 한 번. 이동 뒤 두 슬롯 사이에 칼선 자국(opacity .25)과 가운데 `rp-swap` 문양. 행동자가 본 경우(강도)에는 이어서 **본다**(칼선 없이 확대만). 보지 못한 경우(말썽쟁이·주정뱅이)는 도착한 카드 옆에 `rp-blind` 문양 | swap |
| **알아본다** | 관련 토큰들의 `.rp-ring`이 동시에 켜지고 토큰 사이에 칼선이 동시에 그어진다(360ms). 늑대는 빛을 끄고(`.rp-glow` opacity→0) 어둠 속에서 토큰마다 피색 두 눈 점(CSS 3px 사각 두 개, opacity 200ms)과 피색 칼선, `무리` 낙인. 하수인은 하수인 → 늑대 **한 방향** 피색 칼선, 늑대의 눈은 켜지지 않는다(늑대는 그를 모른다), `주인` 낙인. 프리메이슨은 뼈색 칼선, `형제` 낙인. 카드는 움직이지 않는다. **대상은 `by`·`know`에서만 읽는다**(§13.1) | know |
| **손을 거둔다 / 깨지 않았다** | 스스로 포기·시간 초과: `.rp-ring`이 켜졌다가 opacity .35로 식는다. 빈 차례: `idleCards(st) = [c | c >= n && deal[c] === st]`(처음 그 패를 받은 자가 없으니 전부 제단 출신)의 **박자 시작 때 `pos`**를 찾아 **그 카드 전부**에 `.rp-lit`(`.rp-card::before` 1px `--bone-hi` 테두리)을 켜고 `.rp-dim`을 뺀다. 빛은 그중 첫 카드로. 하나라도 좌석에 있으면 자막 `idle.moved`. 칼선 없음. 합쳐진 `idle` 박자는 모든 역할의 카드를 함께 켠다 | skip, idle |

- **2D 뒤집기**(서막): `.rp-card` 안에는 평면 뒷면(`.rp-back`)과 평면 앞면(`.rp-front`)이 겹쳐 있다. `.rp-card`가 `scaleX` 1→0(160ms `--ease-press`) → 그 순간 뒷면 opacity 1→0·앞면 0→1(즉시) → `scaleX` 0→1(160ms). 종이 한 장을 뒤집는 모양이고 3D가 아니다. lite·reduced-motion은 §13.10.
- **도플갱어 복사**: **본다** 뒤 도플갱어 카드 위에 대상 문양 사본이 도장처럼 찍힌다(`.rp-copyof`, scale 1.3→1 120ms `steps(3)`). 칼선 가운데 표식은 기존 `sg-doppelganger` 문양(두 옆얼굴)을 도장으로 찍는다. 이후 도플갱어 카드는 어디로 가든 `.rp-copyof`를 지니고, 도플갱어가 함께 깨는 역할로 다시 깨는 박자(`know`·`peek`)에는 그의 이름표 옆에도 같은 표식이 붙는다.
- **외로운 늑대**: 본 제단 카드 외에 다른 늑대 카드(박자 시작 때 `pos`)에도 `.rp-lit`. 보지 않았어도 같다.
- **주정뱅이**: 빛이 좌석에서 제단까지 **미끄러져** 따라간다(700ms, 리플레이에서 유일한 미끄러짐). 궤적은 탁자 가운데를 지난다.
- **말썽쟁이**: 빛은 말썽쟁이에게 머문다. 두 대상 사이에 예고선(opacity .4)을 먼저 긋고 300ms 뒤 **바꾼다**.
- **불면증환자**: 움직임 없음. 처음과 다른 카드를 보았으면 확대 카드에 도장 `바뀌었다`(−6°, scale 1.3→1, `steps(3)`). 흔들기는 오류 표현(§8.2)이라 쓰지 않는다.
- **자국은 그 밤 끝까지 남는다.** 밤 동안 opacity .25, 새벽 .12, `dawn.seat` 박자에 그 좌석의 행로만 .5. 새벽의 대표 화면은 엉킨 선 더미가 아니라 **한 좌석씩 떠오르는 행로**다. 자국은 최대 약 20개, 정적 opacity만 가진다(클래스 교체, 트랜지션 없음).
- **피 3% 규칙**: 피색은 늑대·하수인의 칼선과 눈 점, **처형된 자에게 들어가는 투표선**, 처형·사냥꾼, 판결 괘선, 믿은 패 밑줄에만. 눈·교환·복사·자국·나머지 투표선·눈금 자의 "패가 움직임" 표시는 전부 뼈색이다.
- **`mine`**(내가 행동자): 자막 오른쪽에 도장 `너였다`.
- **`hit`**(내 좌석이 `tg`나 `mv`에 있고 행동자가 남): 도장 `네 패였다` + 내 좌석 `.rp-ring`과 다른 바깥 이중 링 `.rp-hit`(2px `--bone-hi`, 정적) + 내 이름표 opacity .5→1 한 번. `mv`면 읽기 +600ms. 한 박자에 `mine`과 `hit`이 겹치지 않는다(행동자가 나면 `mine`).
- **`note.wake`**: 행동자의 박자 시작 때 카드(`pos[s]`)가 처음 카드(`s`)와 다른 첫 박자에, 무대 위 `.rp-note`에 §10.13 주석을 그 박자 동안 띄운다. 리플레이당 한 번.

### 13.6 무대와 DOM (375px 기준, W9만 생성)
```
┌ HUD 44 ─ 표식 ── 결말 ── 건너뛴다 ⋯ ┐
│ 탁자 .rp (남는 높이 전부)             │  좌석 토큰은 W6의 것을 그대로 쓰고, 카드·링·이름표는 .rp가 그린다
│   .rp-note (탁자 맨 위, 필요할 때만)  │
│ 자막 .rp-cap (고정 2줄, 52px)         │  높이 고정 → 레이아웃이 흔들리지 않는다
│ 눈금 자 .rp-bar (44px)                │
├ 독 76 ─ [◀ 48] [멈춘다 / 밤 4/9] [▶ 48] ┤
└──────────────────────────────────────┘
```
```html
<div class="rp" data-act="night" aria-hidden="true">          <!-- #main 안, 탁자 위. position:absolute; inset:0; contain:layout paint -->
  <div class="rp-glow"></div>
  <i class="rp-ring" data-s="0" style="--tx:-120px;--ty:40px"></i>          <!-- × n, 좌석 토큰 위 -->
  <div class="rp-card" data-c="0" data-z="seat" style="--tx:-120px;--ty:40px;--s:.39;--inv:2.56">
    <span class="rp-back"><!-- ART.card(null,{size:'sm',flat:1}) --></span>
    <span class="rp-front"><!-- ART.card(deal[c],{size:'sm',face:1,flat:1}) --></span>
  </div>                                                                      <!-- × (n+3) -->
  <span class="rp-tag" data-s="0" style="--tx:-120px;--ty:72px">민수 · 예언자</span>   <!-- × (n+3), --fs-label -->
  <div class="rp-focus"></div><div class="rp-focus"></div>    <!-- 확대 카드 2장, md, 미리 렌더 -->
  <div class="rp-marks"><!-- .ln 자국, rp-eye/rp-blind/rp-swap/sg-doppelganger 표식 --></div>
  <p class="rp-note"></p>
</div>
<div class="rp-cap" role="status" aria-live="polite"><p class="rp-l1"></p><p class="rp-l2"></p><i class="rp-stamp"></i></div>
<div class="rp-bar" role="slider" aria-label="그 밤의 박자" aria-valuemin="0" aria-valuemax="23" aria-valuenow="7" aria-valuetext="밤 4/9" tabindex="0">
  <i class="rp-tick" data-b="0"></i>…<i class="rp-prog"></i><button class="rp-rate" aria-label="빠르게 본다">×1</button>
</div>
```
- **좌석은 `result.players`에서만 배치한다.** 결과 화면에서 누가 떠나면(`leave` → `removePlayer`) `state.players`와 `room.order`가 줄어들지만 `result.players`(슬롯)는 그대로다. W6은 결과 단계에서 탁자 좌석 링을 `result.players` 순서로 만들고, 토큰은 `result.players[s].id`로 찾는다. 떠난 사람의 좌석은 지우지 않고 유령 토큰 `.is-gone`(§5.3)으로 남긴다. 리플레이 도중 누가 떠나도 슬롯이 밀리지 않는다.
- `body[data-replay="1"]` 동안 좌석의 원래 `xs` 카드·제단 카드·`.seat-name`은 `opacity:0`, `.rp-card`·`.rp-tag`가 그 좌표에 대신 놓인다. **리플레이에서는 내 좌석에도 카드를 그린다**(§5.3의 예외). W6은 이 동안 `dock`·`prompt` 영역을 패치하지 않는다. 독 내용은 replay.js가 채우고, 끝나면 `onDone`에서 W6이 다시 그린다. 좌석 토큰에는 W9가 `.is-target`·`.is-dead` 등 **기존 상태 클래스**와 자기 접두사 상태 클래스(`.rp-dim`)만 붙인다.
- **이름표 `.rp-tag`**: 서막과 새벽 동안 모든 좌석·제단 아래 `이름 · 역할`(`--fs-label`, 이름 최대 6자 말줄임, 역할명 전체. 좁으면 두 줄 — 이름 / 역할). 밤 동안은 숨기고(opacity 0), 그 박자에 관련된 좌석의 이름표만 켠다. 좌석 높이 64px 안에 들어간다(§5.3 들어맞음 검증에 포함).
- **카드는 평면**: `ART.card(…, {flat:1})`(§7.3)는 `.card-in` 회전 없이 한 면만 그린다. 리플레이에는 `preserve-3d`·`rotateY`가 없다. 위치는 `transform: translate(var(--tx),var(--ty)) scale(var(--s))`뿐이다. 노드를 다른 부모로 옮기지 않는다.
- **좌석 크기(28px, `scale(.39)`)의 카드**는 `data-z="seat"`: `.card-name`·`.card-ord`·`.card-line`을 숨기고(W9가 `.rp-card[data-z="seat"]` 범위 안에서만), 문양 칩 `.card-sg`는 정적 `--inv`(= `1/--s`, JS가 설정)로 역보정해 16px을 유지한다. 28px 카드가 실어 나르는 것은 먹 판, 팀 색 띠, 읽히는 문양 하나뿐이다. 이름은 `.rp-tag`와 자막이 맡는다. 제단 크기는 `data-z="altar"`(이름 유지).
- **`.rp-ring`·`.rp-hit`**: 좌석마다 하나씩 `.rp` 안에 둔 2px 원(토큰 지름 + 4px / + 10px). 토큰의 의사 요소를 쓰지 않는다(W7의 `.is-dead` 칼자국과 충돌 방지). 애니메이션은 opacity뿐.
- 박자에 관련된 카드만 `.rp-dim`이 빠진다. 확대 카드는 화면 밖으로 나가지 않게 좌표를 가둔다(좌우 16px 여백).
- **광원은 화면 전체를 덮는 마스크가 아니다.** 280px 원 하나를 옮길 뿐이고, 어둠은 `.rp-dim`과 `light-night`가 만든다(전면 마스크 레이어는 고해상도 휴대폰에서 GPU 메모리를 수십 MB 쓴다, §12).
- **문양 4종**(replay.js 안 문자열, 첫 재생 때 `#sprite`에 `insertAdjacentHTML`. index.html 스프라이트 3KB 예산에 넣지 않는다. 공통 `viewBox="0 0 24 24"`, `currentColor`, 선은 stroke 1.5, `stroke-linecap="butt"`, `stroke-linejoin="miter"` — 끝을 칼로 자른 듯 각지게, §4.3. 기성 UI 아이콘(클립보드·⇄·사선 눈)의 모양을 쓰지 않는다):
  ```html
  <symbol id="rp-eye" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter"><path d="M1 12Q12 3 23 12Q12 21 1 12Z"/><path d="M6 7.4 4.4 5M12 5.4V2.6M18 7.4 19.6 5"/></g><path d="M12 7.6 13.5 12 12 16.4 10.5 12Z" fill="currentColor"/></symbol>
  <!-- 꿰맨 눈: 감긴 눈꺼풀 호 + 세로 실밥 4개 -->
  <symbol id="rp-blind" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter"><path d="M1 10Q12 19 23 10"/><path d="M6 10.7v5M10 11.9v5M14 11.9v5M18 10.7v5"/></g></symbol>
  <!-- 교차하는 V 끌 자국 두 개: 양끝이 쐐기로 가늘어지는 칼 획, 화살촉 없음 -->
  <symbol id="rp-swap" viewBox="0 0 24 24"><path d="M3 6 16.4 13.2 21 18 14.8 15.6ZM3 18 16.4 10.8 21 6 14.8 8.4Z" fill="currentColor"/></symbol>
  <symbol id="rp-step" viewBox="0 0 24 24"><path d="M8 3 17 12 8 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"/></symbol>
  ```
  라벨(`role="img"` + `aria-label`): `rp-eye` 보았다, `rp-blind` 보지 못했다, `rp-swap` 바꾸었다, 복사 표식(`sg-doppelganger`) 베꼈다. `rp-step`은 독의 앞·다음 버튼(앞 박자는 `scaleX(-1)`), 버튼의 `aria-label`이 이름이다. 바뀐 카드 표식 `rp-turn`(반쯤 판 끌 갈고리)은 끝판 보드에서도 쓰이므로 index.html 스프라이트(W3, §4.6)에 있다. 늑대·처형·사냥꾼은 기존 `tm-wolf`, `.is-dead` 칼자국, `sg-hunter`를 그대로 쓴다. **처형 표식에 올가미를 쓰지 않는다**(무두장이 팀 문양과 혼동).
- **들어맞음**: 375×553과 360×640에서 10인 좌석·이름표·제단·자막·눈금 자·독이 겹치지 않고 스크롤 0. 탁자 높이는 평소보다 44px 줄어든다(눈금 자). 7인 이상 토큰 40px 규칙(§5.3) 그대로.

### 13.7 조작
- **탭(탁자 아무 곳) = 다음 박자.** 진행 중인 박자는 끝 상태로 즉시 보내고(`finish()`) 다음 박자를 재생한다(§6.9의 문법 그대로). **첫 자동 재생에서는 아래 줄이 나온 뒤 600ms 동안 탭을 무시한다**(읽기 전에 넘어가는 실수 방지). 다시 보기에서는 즉시.
- **swap 뒤 멈춤**(첫 자동 재생만, §13.4): 기다리는 동안 주 버튼 `잇는다` + `눌러서 잇는다`. 탭·`잇는다`·`→`로 잇는다.
- **독**: `[◀ 앞 박자] [주 버튼: 멈춘다 / 잇는다 / 처음부터 + 아래 줄 위치 `밤 4/9`] [다음 박자 ▶]`. 좌우 버튼 48×48.
- **앞 박자**: 바로 앞 박자의 시작 스냅샷을 즉시 놓고 그 박자를 다시 재생한다.
- **눈금 자 `.rp-bar`**: 독 위 44px 줄. 1px `--ash` 바닥선 위에 박자마다 V자 칼자국 눈금(정적 `clip-path` 8×10px). 막 경계는 18px 세로 칼선 + 막 이름(`--fs-label`, `--f-body`). 밤 눈금 아래에 차례 로마 숫자(Hanbam T 12px `--smoke`). 지난 눈금 `--bone-dim`, 현재 `--bone-hi`(scale 1.3→1 120ms 1회, 깜빡임 없음), 앞으로 올 눈금 `--ash`. 패가 움직인 박자(swap) 눈금 아래에는 2px `--bone-hi` 칼자국, **처형·사냥꾼 박자만 2px 피 칼자국**. 진행은 2px `--bone-hi` 바(`scaleX`). 오른쪽 끝 `×1/×2` 토글(44×44).
  - 끄는 동안: 가장 가까운 눈금에 붙고 그 박자의 **끝 스냅샷**만 즉시 그린다(애니메이션 없음, 자막 전문 표시). 손을 떼면 그 박자를 시작 스냅샷부터 재생한다.
  - 눈금 탭 영역 최소 24px. 박자가 많아 겹치면 가장 가까운 것을 고른다. 연속 탐색(프레임마다 상태 계산)은 하지 않는다.
- **키보드**: `←` `→` 박자, `Space` 멈춤/잇기, `Home`/`End` 처음/끝, `Esc` 건너뛰기. 눈금 자는 `role="slider"`.
- **자동 재생**: `result:<gameId>` 키로 **1회만.** 재접속·이미 본 결말이면 끝판 보드부터 보여 주고 `그 밤을 다시 본다`로 연다. 재생은 **각자 로컬**이며 동기화하지 않는다. `gameId`는 `startGame`마다 새로 만들어지므로(§13.2) `다시, 밤으로` 뒤의 결말도 다시 자동 재생된다.
- **촌장**: 리플레이 중에도 `건너뛴다` → 끝판 보드의 `다시, 밤으로`로 언제든 갈 수 있다. 촌장이 로비로 돌리면 다른 사람의 리플레이는 `REPLAY.close()`로 닫히고 모닥불로 전환된다.
- `document.hidden`이면 일시정지하고, 돌아와도 저절로 잇지 않는다(`잇는다`를 누르게 둔다).

### 13.8 끝판 보드 (`모든 기록` + `그 밤에 일어난 일`)
- 판결 배너(판결 막의 최종 상태)를 맨 위에 둔다. 한 줄, Hanbam `--fs-h1`, 아래 `.verdict-why`, 내 화면에는 `.verdict-self`.
- **`모든 기록`**: 한 줄에 한 사람. W6이 정적 `.rec-row`(처음 → 마지막, 지목, 표, 도장)를 먼저 그리고, replay.js가 도착하면 `REPLAY.enhanceBoard()`가 `.rec-path`와 `.rec-belief`를 끼운다. 행은 `result.players`(떠난 사람 포함)로 만든다.
  ```
  민수   [xs 사냥꾼] ─VI 지은→ [xs 강도] ─VII 철수→ [xs 늑대인간]      지목 영희 · 표 3  [졌다]
         믿은 패 강도                                     ← 실제와 다르면 --blood 1px 밑줄
  ```
  - `.rec-path`: 그 **좌석**에 차례로 놓였던 카드들(`effRole`로 표기). 화살표(1px `--bone-dim` 칼선 + 끝 삼각형) 위 라벨은 그 카드를 옮긴 손(차례 로마 숫자 + 행동자 이름). 움직이지 않았으면 `밤새 그대로였다.` 375px에서 셋을 넘으면 줄을 바꾸고 화살표가 다음 줄 첫머리에서 이어진다. 가로 스크롤 금지.
  - **믿은 패**(build 중 계산, **`r`(실제로 쓴 능력) 기준**, `st` 기준이 아님): 처음엔 제 카드(`effRole` 아님 — 도플갱어는 처음에 `도플갱어`). 내가 `by`인 이벤트에서 `k==='copy'`면 복사한 역할, `r==='robber'`이고 `see`가 있으면 `effRole(훔친 카드)`, `r==='insomniac'`이면 `effRole(본 카드)`로 갱신. 그래서 도플갱어-강도·도플갱어-불면증환자도 믿음이 갱신된다. `r==='drunk'`면 `모른다`(`blind`). 예언자·말썽쟁이 등 다른 행동은 제 믿음을 바꾸지 않는다. 마지막 실제 역할(`effective`)과 다르면 `--blood` 1px 밑줄 = "모르는 사이 바뀌었다". 같은 값이 판결 막의 `.verdict-self`(§10.13 내 한 줄)를 만든다.
  - 마지막 세 줄은 왼쪽·가운데·오른쪽 제단(같은 형식, 믿은 패 줄 없음).
  - 정렬: 내 줄(`.is-me`, 맨 위 고정) → 처형된 자 → 나머지 좌석 순. 처형된 줄은 취소선 + 토큰 피 X, 사냥꾼에게 끌려간 줄은 `sg-hunter` 문양.
  - **줄을 탭하면** 그 사람(또는 제단)이 관련된 첫 박자로 리플레이가 점프해 재생되고, 관련 박자 눈금이 강조(`.is-rel`)된다.
- **`그 밤에 일어난 일`**: 박자마다 한 줄(§10.13 자막 위·아래 줄을 한 문장으로), `xs` 카드 + 문장. 지목하지 않은 자는 `vote.none` 줄. 줄 탭 = 그 박자로 점프. 기본 접힘(모바일은 `모든 기록` 아래). 스크린리더·lite 사용자가 흐름 전체를 읽는 경로이기도 하다.
- 각 줄 `content-visibility:auto`. 이미지는 아틀라스만, 새 이미지 0장.
- 독: 촌장 `다시, 밤으로` / 그 외 `aria-disabled` `촌장을 기다린다`. 보조 링크 `.dock-alt` `그 밤을 다시 본다`.
- 모바일은 탁자를 40px 띠로 접는다(§6.9). 리플레이를 다시 열면 탁자가 펼쳐진다.

### 13.9 클라이언트 모듈 (W9, `public/js/replay.js` + `public/css/replay.css`)
- **로드**: `vote` 상태 진입 때 W6이 `requestIdleCallback`(최대 2초)으로 `replay.<hash>.js`를 주입한다(br ≤ 12KB, CSS·문양 포함). 결과를 받았는데 아직 없으면 암전(막 0)을 최대 2000ms 늘려 기다린다 → 그래도 없으면 끝판 보드를 먼저 그리고, 도착하는 대로 `enhanceBoard()` + `그 밤을 다시 본다` 활성화(이때는 자동 재생하지 않는다). `R.night`가 없으면(구 서버) 리플레이 없이 끝판 보드만.
- **`REPLAY.build(R, meId)`**: 순수 함수(DOM·시간·난수 없음, 10인 < 1ms). `result` 수신 직후 1회 실행.
  ```js
  function build(R, me) {
    const N = R.night, n = R.players.length, pos = N.deal.map((_, i) => i), B = [];
    const copyEv = N.ev.find(e => e.k === 'copy');
    const copyAs = copyEv ? N.deal[copyEv.see[0][0]] : null;
    const effRole = c => N.deal[c] === 'doppelganger' && copyAs ? copyAs : N.deal[c];
    B.push(beat('pro', null, pos, pos));
    if (N.ev.every(e => e.k === 'idle')) B.push(beat('quiet', null, pos, pos));
    else for (const run of mergeIdle(N.ev)) {                   // 연속 idle은 한 묶음
      const pre = pos.slice();
      for (const e of run) for (const [c, to] of e.mv || []) pos[to] = c;   // 출발지 = pre.indexOf(c)
      B.push(beat('night', run, pre, pos.slice()));
    }
    if (pos.join() !== N.end.join()) throw new ReplayDesync();   // 치명: 호출부가 잡아 리플레이 없이 끝판 보드(end 기준)만, console.error. test/replay.js는 실패
    B.push(beat('dawn', null, N.end, N.end));
    for (let s = 0; s < n; s++) if (N.end[s] !== s || R.players[s].original !== R.players[s].effective) B.push(beat('dawn.seat', s, N.end, N.end));
    B.push(beat('vote', null, N.end, N.end));
    // deaths: by:'vote'는 'exec' 한 박자로 묶고(없으면 'nodeath'), by:'hunter'는 'hunt', by:'miss'는 'hunt0'(s===-1이면 'hunt0.none') 하나씩, 배열 순서대로
    B.push(beat('verdict', null, N.end, N.end));
    // beat = {act, e, pre, post, dur, cap:[l1,l2], focus:[slot], lit:[slot], moved, mine, hit, note, rel:[slot]}
    // 함께 반환: journey[slot] = [{c, st, by}], belief[seat], lines[] (그 밤에 일어난 일), effRole
  }
  ```
- 투표 id → 슬롯은 `R.players.findIndex`만 쓴다(§13.3). 정렬은 표 내림차순, 같으면 슬롯 오름차순.
- **재생**: 카드 이동·확대·칼선은 WAAPI(`el.animate([...], …)`). `.finished`로 순서를 잇고, `playbackRate=2`로 배속, `finish()`로 다음, `cancel()` + 스냅샷 적용으로 점프. 정적 상태(`.rp-dim`, `.rp-lit`, `.is-swapped`, `.is-dead`, 자국 opacity 단계)는 CSS 클래스만이며 **트랜지션이 없다**(빛이 0인 프레임에 바꾼다). FLIP은 쓰지 않는다(출발·도착 좌표를 이미 안다). `Element.prototype.animate`가 없으면 lite 경로.
- **스냅샷 적용(점프)**: 진행 중 애니메이션 전부 `cancel()` → 그 박자의 `pre`(끄는 중이면 `post`)로 모든 `.rp-card`의 `--tx/--ty/--s/--inv`를 한 번에 설정 → 자국·표식 클래스를 그 박자까지 누적된 집합으로 교체 → 자막 즉시 표시. 레이아웃 1회.
- `will-change:transform`은 `animate()` 직전에 붙이고 `finished`에서 뗀다. 평면 카드라 정지한 카드는 합성 레이어로 남지 않는다.
- 화면을 벗어나면(`playAgain`, 로비 전환) `REPLAY.close()`: 애니메이션 `cancel()`, `.rp`·`.rp-cap`·`.rp-bar` 제거, 스냅샷 참조 해제. 스냅샷은 메모리에만 두고 localStorage에는 자동 재생 키만 저장한다(try/catch).
- 진동은 처형 순간 `FX.buzz(12)`만(결말은 진동 허용 구간). TTS는 리플레이를 읽지 않는다.

### 13.10 등급·접근성

| | full | `data-perf="lite"` / `Element.animate` 없음 | `prefers-reduced-motion` |
|---|---|---|---|
| 빛 이동 | 끊어서: opacity 120 → 즉시 이동 → opacity 200 (주정뱅이만 700 미끄러짐) | 즉시 이동 + opacity 160ms | 즉시 이동 + opacity 160ms |
| 카드 교환 | 300 정지 + 세 프레임 키프레임 300ms + 섬광 60 | 즉시 적용, 바뀐 두 카드만 opacity .3→1 160ms | 출발 opacity→0, 도착 0→1 (각 160ms) |
| 본다 | `md` 확대 카드 떠오름 360ms | opacity 160ms | opacity 160ms |
| 칼선 | scaleX 280ms | 즉시 표시 | 즉시 표시 |
| 서막 뒤집기 | 2D `scaleX` 물결, 120ms 간격, 동시 최대 6장 | 앞면을 즉시 놓고 `.rp` 전체 opacity 0→1 160ms 한 번(레이어 1개) | 같은 단일 크로스페이드 |
| 새벽 물결 | `.is-swapped` 120ms 간격 | 동시에 정적 | 동시에 정적 |
| 처형 | 흔들림 + 섬광 | 없음, 도장·X만 정적 | 없음 |
| 박자 길이 | §13.4 | 행동 동작 구간만 줄임(읽기 시간은 지킨다) | §13.4 그대로 |
| 큰 아트 | 이미 디코드된 것만 | 동시 2장까지 | full과 같음 |

- **정보는 등급과 무관하게 같다.** 자막, 이름표, 자국, `.is-swapped`, 눈 문양, 도장은 lite에서도 전부 나온다. 자막만 읽어도 흐름을 따라갈 수 있어야 한다.
- 박자마다 자막 두 줄을 한 문장으로 `#sr`에 공지한다(`note.wake` 포함). 무대 `.rp`는 `aria-hidden`이고, 정보는 자막과 `그 밤에 일어난 일` 목록이 전달한다.
- 조작 버튼은 전부 48×48 이상(속도 토글 44×44), 눈금 탭 영역 24px 이상.

### 13.11 예산과 반려 조건
- **바이트**: 새 이미지 0. `replay.<hash>.js` br ≤ 18KB(check-budget). 결과 `state` ≤ 6KB, `night` ≤ 1.5KB(sim.js `max-bytes`, 10인·이름 최대 길이·풀덱, 플레이어마다 실제 `JSON.stringify(view())`).
- **누출**: `night`·`deal`·`pos`·`ev`·`seats`·`why`·`deaths` 키가 `phase!=='result'` 상태에 나타나면 sim.js 실패(§7.4 키 패턴).
- **서버 정합성**(W1, sim.js, 모든 시나리오): ① 불변식 단언 통과(개발 모드 `swapSlots`마다 + `resolve()`) ② `deal`에 `mv`를 순서대로 적용한 결과 === `end` ③ `deal[end[s]] === players[s].final`, 제단도 `center.final`과 일치 ④ `deaths` 순서가 사냥꾼 큐 순서와 같고, `miss`는 `players[].dead`에 영향이 없다 ⑤ `ev.length ≤ 20` ⑥ `why`와 `winners`의 대응(§13.2) ⑦ 모든 `skip`의 `r`이 실제 역할 id(`lonewolf` 없음), 모든 이벤트의 `st`가 `NIGHT_ORDER` 안 ⑧ `dop`는 비어 있으면 키가 없다 ⑨ grep: `swapSlots`·`startGame` 밖의 `g.cards[…] =`·`g.center[…] =` 0건.
- **클라이언트**(W9, test/replay.js, 픽스처 전부): ① `build()`의 마지막 `post` === `end`, 불일치면 **테스트 실패**(경고 아님) ② 모든 박자의 `cap`에 `undefined`·`${`·빈 위 줄 0, 제단을 로마 숫자로 부른 문장 0 ③ 이모지 grep 0 ④ `belief`가 시나리오 기대값과 일치(주정뱅이 `blind`, 강도·불면증환자·도플갱어 갱신, **`doppel-robber`·`doppel-insomniac`** 갱신) ⑤ 박자 수 = `1 + (전부 idle ? 1 : 연속 idle을 합친 묶음 수) + 1 + 바뀐 좌석 수 + 1 + 1 + deaths.filter(d => d.by !== 'vote').length + 1` ⑥ 모든 좌석 `effRole(end[s]) === players[s].effective` ⑦ `doppel-robber-steals-wolf`에서 `know.werewolf` 박자의 무리 === 이벤트 `by`이고, 늑대 카드를 쥔 좌석 집합과 다르다 ⑧ 리플레이 도중 한 명이 떠난 상태(`state.players` n−1)로 `open()` → 모든 슬롯의 토큰 id === `result.players[s].id`.
- **성능**(DevTools, 375×667, CPU 6× 감속, 1MB/s, RTT 300ms): 리플레이 중 50ms 초과 long task 0, 프레임 드롭 5% 미만, Layout/Paint 이벤트 박자당 1회 이하, 승격 레이어 ≤ 8, 동시 애니메이션 ≤ 4(서막 물결 제외, 물결도 ≤ 6), 3D 변환 0.
- **차단 검사**: 이미지 요청 전부 차단 → 끝까지 재생. `replay.js` 차단 → 끝판 보드로 결말 완결.

### 13.12 시나리오 행렬 (sim.js가 돌리고 `test/fixtures/night-<이름>.json`으로 남긴다)

| 이름 | 내용 |
|---|---|
| `min-3` | 3인, 최소 덱 |
| `full-10` | 10인, 9차례 전부 행동 |
| `doppel-seer` / `doppel-robber` / `doppel-tm` / `doppel-drunk` | 도플갱어가 즉시 행동 역할 복사(2박) |
| `doppel-wolf` / `doppel-minion` / `doppel-insomniac` | 도플갱어가 함께 깨는 역할 복사 |
| `doppel-lone-wolf` | 도플갱어가 늑대를 베끼고 진짜 늑대 둘은 제단 → 도플갱어 혼자 `peek.werewolf.d` |
| `doppel-mason-alone` | 도플갱어가 프리메이슨을 베꼈고 다른 프리메이슨은 제단 |
| `doppel-hunter-chain` | 도플갱어가 사냥꾼을 베낌 → 처형 → 연쇄(`사냥꾼을 베낀 패를 쥔`) |
| `doppel-card-moved` | 도플갱어 카드가 다른 사람에게 감(§13.1 규칙 고정, §13.3 예시) |
| `doppel-troublemaker-swaps-self-card` | 도플갱어-말썽쟁이가 도플갱어 카드를 포함해 바꿈(이후 모든 차례보다 먼저 움직임) |
| `doppel-robber-steals-wolf` | 도플갱어-강도가 늑대 카드를 훔침 → 늑대 차례에 깨는 자는 원래 늑대(§13.1) |
| `doppel-drunk-pulls-idle-role` | 도플갱어-주정뱅이가 제단의 예언자 카드를 가져감 → `idle.moved`, 빛은 그 좌석으로 |
| `doppel-seer-timeout` | 도플갱어가 예언자를 베낀 뒤 시간 초과(`st:'doppelganger', r:'seer', k:'skip', auto`) |
| `robber-steals-doppel` | 강도가 도플갱어 카드를 훔침 → 믿은 패·자막이 복사한 역할 |
| `seer-sees-doppel-card` | 예언자가 도플갱어 카드를 봄 → `도플갱어 → <r>` |
| `insomniac-received-doppel-card` | 불면증환자가 도플갱어 카드를 받음 → "바뀜" 판정이 `effRole` 기준 |
| `drunk-takes-insomniac` | 불면증환자 카드가 제단에 있고 주정뱅이가 가져감 → 불면증환자 `idle.moved` |
| `lone-wolf-peek` / `lone-wolf-skip` / `lone-wolf-timeout` | 외로운 늑대(스스로 / 시간 초과 — `r:'werewolf'`) |
| `deliberate-skip-seer` / `deliberate-skip-robber` / `deliberate-skip-tm` | 스스로 포기(`auto` 없음). `all-timeout`과 분리 |
| `minion-no-wolf` | 늑대 둘 다 제단 |
| `all-idle` | 깨어날 역할이 전부 제단(`quiet` 한 박자) |
| `all-timeout` | 모든 프롬프트 시간 초과(도플갱어·주정뱅이 `auto`, 나머지 `skip.auto`) |
| `hunter-chain-2` | 사냥꾼 → 사냥꾼 → 대상, 연쇄 2단계 |
| `hunter-miss` | 처형된 사냥꾼이 겨눈 자도 이미 처형됨(`by:'miss'`, `hunt0`) |
| `hunter-no-vote` | 처형된 사냥꾼이 지목하지 않음(`vote:null`, `miss` `s:-1`), 지목 없는 좌석의 투표선 건너뜀 |
| `tie-death` | 동표 두 명 처형 |
| `tanner-blocked` / `no-wolf-no-death` / `no-wolf-in-deck` / `no-wolf-tanner` / `minion-only` / `minion-lived` / `no-wolf-innocent` | `why` 코드 전부(`wolf_center`와 `wolf_none` 둘 다) |
| `leave-mid-replay` | 결말 수신 후 한 명이 `leave` → `state.players` 감소, 슬롯 매핑 유지(클라이언트 ⑧) |
| `max-bytes` | 10인, 이름 12자 전부, 풀덱 — 플레이어마다 실제 `view()` 크기 단언 |
