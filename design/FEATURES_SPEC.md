# 기능 추가 구현 스펙 (5개 제안 통합본)

대상: Sonnet 구현자 4명(그룹 G1~G4). 기준 문서: `design/DESIGN_SPEC.md`(「피의 판화」, 예산, 모션 규칙), `design/COPY_DECK.md`(버튼은 "-기", 안내·토스트는 합니다체).

포함 기능
- F1. 채팅 답글과 채팅 끄기
- F2. 누구의 카드인지 표시하기
- F3. 배경음악(WebAudio 합성, 내려받는 소리 파일 0바이트)
- F4. 카드 정렬 시스템(크기 6단계, 토큰 앵커, 안쪽 좌석 카드)
- F5. 애니메이션 패스(배분, 도장, 처형, 새벽, 투표선)

공통 규칙(모든 그룹)
- 움직이는 속성은 `transform`과 `opacity`만 씁니다. 높이·위치 애니메이션, 바운스, 스프링, 파티클은 쓰지 않습니다.
- `html[data-perf=lite]`와 `prefers-reduced-motion:reduce`를 모든 새 연출에서 처리합니다. 정보를 담은 결과(도장, X, 취소선, 캡션)는 어느 등급에서나 남깁니다.
- 사용자에게 보이는 문구는 전부 `public/strings.js`에서 가져옵니다. 지연 모듈도 런타임에 `window.T`를 읽습니다. 하드코딩은 하지 않습니다.
- 서버에서 온 문자열(이름, 채팅, 인용)은 반드시 `esc()`를 거칩니다.
- 남의 그룹 파일은 고치지 않습니다. 필요한 것은 아래 계약을 보고 그 계약대로 호출합니다.

---

## 0. 예산 계획

### 0.1 현재 상태와 문제
- `game.js` = strings.js + roles.js + art.js + app.js (tools/stamp.js 104행 근처 `joinJs`). 상한 24KB br, 현재 약 23.3KB.
- 다섯 제안의 game.js 증가분을 합치면 약 +1.1KB입니다(F1 0.35, F2 0.35, F3 0.25, F4 0.06, F5 0.1). 그대로 넣으면 약 24.4KB로 상한을 넘습니다.

### 0.2 회수: 클라이언트가 안 쓰는 문자열을 game.js에서 빼기 (G1 + G4)
측정값(현재 dist, brotli):
- `T.msg`(서버 메시지 44개)는 클라이언트 코드 어디서도 읽지 않습니다. game.js에서 빼면 약 **−0.55KB**입니다.
- `T.replay` 중 app.js가 읽는 것은 `why`, `self`, `ui`뿐입니다. 나머지(`hunt_rule_join` ~ `hunt`, `cause`)는 replay.js만 씁니다. 이것을 replay.js 번들로 옮기면 약 **−0.8~1.0KB**입니다.

방식(소스는 strings.js 한 곳에 그대로 둡니다. 서버와 테스트는 계속 `require('./public/strings.js')` 전체를 씁니다):
1. **G1**이 strings.js에 줄 단위 표식을 넣습니다. 표식 안의 줄은 "객체 속성 목록"이어야 하고, 마지막 속성 뒤에도 쉼표를 둡니다.
   ```js
   // @client:drop-start
   msg: { ... },
   // @client:drop-end
   ...
   replay: {
     // @client:replay-start
     hunt_rule_join: ' ', ... hunt: { ... },
     // @client:replay-end
     why: { ... }, self: { ... },
     // @client:replay-start
     cause: { ... },
     // @client:replay-end
     ui: { ... },
   },
   ```
2. **G4**가 tools/stamp.js에서 game.js를 만들 때:
   - `drop` 구간은 지웁니다.
   - `replay` 구간들은 잘라서 이어 붙이고, replay.js 번들 맨 앞에 `Object.assign(T.replay,{<구간들>});`로 넣습니다.
   - 표식이 없으면 아무것도 하지 않습니다(이전 소스와 호환).
   - 빌드한 game.js를 `new Function`으로 한 번 파싱해 문법 오류가 없는지 확인하고, 실패하면 빌드를 실패시킵니다.
3. **G2**가 app.js에서 `T.replay.ui.altarShort`처럼 남은 키만 읽는지 확인합니다. 옮겨진 키를 app.js에서 새로 읽으면 안 됩니다.

### 0.3 새 지연 모듈
| 모듈 | 내용 | 불러오는 시점 | 상한(br) | check-budget 행 |
|---|---|---|---|---|
| `a/chatx.<h>.js` (`public/js/chatx.js` + `public/css/chatx.css`를 `__CHATX_CSS__`로 내장) | F1 답글 동작, 답글 바, 인용 눌러 이동 | 시트를 처음 열 때 또는 `loadAssets()`의 idle 중 먼저 오는 쪽. 채팅을 껐으면 불러오지 않음 | 2KB | `chatx.js` 2KB |
| `a/audio.<h>.js` (`public/js/audio.js`) | F3 합성 엔진 전체 + 음악 크기 `.seg` 마크업 | 음악을 켤 때만. 이미 켜 둔 사람은 idle 중 | 4KB | `audio.js` 4KB (없으면 SKIP) |
| `fx.js` (기존, 지연) | F5 새 연출 전부, F2 peek 라벨 | 기존과 같음 | 5KB (지금 약 2.1KB) | 기존 행 |
| `game.css` (기존, 지연) | F2·F4·F5 CSS | 기존과 같음 | 9KB | 기존 행 |

- `audio.js`는 서비스워커 precache에 넣지 않습니다("음악이 꺼져 있으면 audio.js 요청 0건" 조건). `chatx.js`는 precache에 넣습니다.
- `base.css`(크리티컬, 7KB 상한)에는 F1의 최소 규칙(약 150B)만 더합니다. 나머지 CSS는 game.css 또는 chatx.css에 넣습니다.

### 0.4 game.js 배정과 컷 순서
| 항목 | 예상 증감 |
|---|---|
| 0.2 회수 | −1.3KB |
| F1 코어(인용 줄, `re` 전송, 채팅 끄기, 메뉴 항목, chatx 로더) | +0.25KB |
| F2(whoOf, 강도·불면증환자 큰 카드, lastSeen 출처, 기록 꼬리표, 출처 강조) | +0.35KB |
| F2 §2.5 이름 판(늑대인간·하수인·프리메이슨) | +0.1KB |
| F3 shim(snd, 메뉴 항목, 컨텍스트 생성, 호출 지점) | +0.18KB |
| F4(placeSeats·lobbyHTML) | +0.03KB |
| F5(deal 타이머, 새벽 600, 투표선 재긋기) | +0.08KB |
| 새 문자열 | +0.3KB |
| **합계** | 약 **23.3 → 23.3KB** (목표 ≤23.8KB) |

`node tools/check-budget.mjs`가 game.js 23.8KB를 넘으면 아래 순서로 뺍니다.
1. F2 §2.5 이름 판 → 띠 문구만 남깁니다.
2. F2 §2.7 기록 꼬리표.
3. (삭제됨) 첫 방문 안내 토스트는 예산 때문에 뺐습니다. BGM은 기본 켜짐입니다.

`fmt`, `esc`, `$`, `later`처럼 이미 있는 도우미를 다시 만들지 않습니다. `fx()`와 `snd()`는 공용 큐 호출 함수 하나(`qcall(obj, n, args, max)`)로 합칩니다.

---

## 1. 그룹과 파일 소유

| 그룹 | 소유 파일 (이 파일만 고칩니다) |
|---|---|
| **G1 strings+server** | `public/strings.js`, `server.js`, `test/sim.js`, `design/COPY_DECK.md`(§4 새 키 표) |
| **G2 app+base** | `public/js/app.js`, `public/css/base.css` |
| **G3 screens+cards+fx** | `public/css/screens.css`, `public/css/card.css`, `public/css/replay.css`, `public/js/fx.js`, `public/js/replay.js`, `public/js/art.js`, `test/replay.js`, `design/DESIGN_SPEC.md`(§5.3 개정) |
| **G4 audio+새 파일+빌드** | `public/js/audio.js`(새), `public/js/chatx.js`(새), `public/css/chatx.css`(새), `public/index.html`, `tools/stamp.js`, `tools/check-budget.mjs`, `public/sw.js`(필요하면), `test/smoke.js` |

그룹 사이의 약속은 아래 2~6장의 계약(소켓 페이로드, 문자열 키, 클래스 이름, 모듈 API)뿐입니다. 계약을 바꿔야 하면 코드에서 고치지 말고 이 문서를 먼저 고칩니다.

---

## 2. 문자열 키 (G1이 추가, 다른 그룹은 읽기만)

디스플레이 그룹(`T.btn` 등)은 폰트 서브셋 대상입니다. G1은 새 키를 넣은 뒤 `node tools/subset-font.mjs`를 돌려 hanbam-d가 30KB 안인지 확인합니다. `음`·`악`이 새 글자로 들어가며, 넘으면 `bgmOn/bgmOff`만 `T.body`로 옮기고 G2에 알립니다.

### 2.1 `T.btn` (디스플레이)
```js
chatOff: '채팅 끄기',
chatOn: '채팅 켜기',
bgmOn: '음악 켜기',
bgmOff: '음악 끄기',
```

### 2.2 `T.chat` (본문)
```js
reply: '답글하기',
replyAria: '${n}의 메시지에 답글하기',
replyCancel: '취소하기',
replyBar: '${n}의 메시지에 답글을 씁니다.',   // 스크린리더용 상태 문장
jump: '원래 메시지로 이동하기',
gone: '원래 메시지를 찾을 수 없습니다. 오래된 메시지는 지워집니다.',
offNote: '채팅을 꺼 두었습니다. 알림 메시지만 표시됩니다. 오른쪽 위 메뉴에서 다시 켤 수 있습니다.',
```

### 2.3 `T.body` (본문)
```js
// F1
chatOffToast: '채팅을 껐습니다.',
chatOnToast: '채팅을 켰습니다.',
// F2
whoCard: '${n}의 카드',
whoMine: '당신의 카드',
whoNew: '당신의 새 카드',
whoNow: '당신의 지금 카드',
whoCopy: '이제 당신은 이 역할입니다.',
whoFrom: '${n}에게서 가져온 카드',
whoWoke: '새벽에 다시 확인한 카드',
whoCopied: '${n}의 카드를 따라 했습니다.',
whoPack: '함께 깨어난 늑대인간',
whoOwners: '당신이 섬기는 늑대인간',
whoBros: '함께 깨어난 프리메이슨',
whoMe: '나',
// F3
bgmOnToast: '배경음악을 켰습니다.',
bgmOffToast: '배경음악을 껐습니다.',
bgmTip: '오른쪽 위 메뉴에서 배경음악을 켤 수 있습니다.',
bgmVol: '음악 크기',
bgmLv: ['작게', '보통', '크게'],
```
- 지울 키: `T.body.peekLast` (F2 이후 쓰지 않음). `peekFirst: '처음 받은 카드'`는 F2의 부제로 다시 씁니다.
- 가운데 카드 표기는 기존 `T.altar[idx]`('가운데 카드 2')와 `T.replay.ui.altarShort[idx]`('가운데 2')를 그대로 씁니다.
- '의'는 받침과 상관없으므로 조사 처리가 필요 없습니다. `${n}에게서`도 같습니다.
- 도장 문구는 기존 `T.stamp.dead`('처형'), `T.stamp.win`('승리'), `T.stamp.lose`('패배')를 씁니다.
- G1은 COPY_DECK §4 "새로 필요한 키" 표에 위 키를 모두 적습니다.

---

## 3. F1 채팅 답글과 채팅 끄기

### 3.1 서버 (G1, server.js)
- 방을 만들 때 `chatSeq: 0`을 추가합니다(184행 `chat: []` 옆).
- `pushChat`에서 `msg.mid = ++room.chatSeq`를 붙입니다. 시스템 메시지에도 붙입니다.
- `backToLobby`에서도 `chat`과 `chatSeq`는 그대로 둡니다.

**클라이언트 → 서버 `chat`**
```
{ text: string, re?: number }
```

**서버 → 클라이언트 `chat`, `chatHistory[]`**
```
일반:  { mid, id, name, text, ts, re?: { mid, name, t } }
시스템: { mid, system: true, text, ts }
```
`id`는 지금처럼 보낸 사람의 pid입니다. 의미를 바꾸지 않습니다.

**검증 (`socket.on('chat')`)**
1. 지금 검사를 유지합니다: 밤이면 return, `trim().slice(0,300)`, 빈 문자열 무시, 400ms 연타 차단.
2. `re`가 `Number.isInteger(re) && re > 0`이 아니면 `re`만 버리고 일반 메시지로 보냅니다. 오류는 내지 않습니다.
3. `const o = room.chat.find(m => m.mid === re && !m.system)`가 없으면 같은 방식으로 버립니다.
4. 인용은 서버가 원문에서 만듭니다. 클라이언트가 보낸 이름이나 내용은 믿지 않습니다.
   ```js
   const s = o.text.replace(/\s+/g, ' '), cp = Array.from(s);
   msg.re = { mid: o.mid, name: o.name, t: cp.length > 40 ? cp.slice(0, 40).join('') + '…' : s };
   ```
5. 인용은 한 단계만 합니다(원문의 `re`는 따라가지 않습니다).

### 3.2 클라이언트 코어 (G2, app.js + base.css)
**상태**: `let chatOff = LS.get('ww_chat') === '0';` 시작 시 `body.dataset.chat = chatOff ? 'off' : ''`.

**addChat(m, quiet)**
- `if (m.mid) p.dataset.mid = m.mid;`
- 일반 메시지에 `m.re`가 있으면 `.msg-n` 다음, `.msg-t` 앞에 넣습니다.
  ```html
  <span class="msg-q" data-re="12" role="button" tabindex="0" aria-label="원래 메시지로 이동하기"><b class="nm">민수</b> 원문 앞부분…</span>
  ```
- unread/ticker 조건에 `|| chatOff`를 더합니다(채팅을 끄면 배지 숫자와 티커가 늘지 않음).

**보내기 (chat-form submit)**
```js
const re = +f.dataset.re || 0;
sock.emit('chat', re ? { text: t, re } : { text: t });
delete f.dataset.re;
```

**밤 잠금 (paintSheet)**: `night`가 true이면 `delete $('.chat-form').dataset.re`.

**채팅 탭 안내**: `#chatLog` 바로 앞(채팅 pane 안)에 `<p class="chat-offnote">${T.chat.offNote}</p>`를 한 번 만들어 둡니다. 보이고 숨기는 것은 CSS가 합니다.

**메뉴**: `openMenu`에서 음성 항목 바로 다음에 `item('chatTog', chatOff ? TBT.chatOn : TBT.chatOff)`, 그다음 F3의 `item('bgm', …)`.

**액션 `chatTog`**: `chatOff = !chatOff; LS.set('ww_chat', chatOff ? '0' : '1'); body.dataset.chat = chatOff ? 'off' : ''; delete form.dataset.re; ui.unread = 0; closeModal(); toast(chatOff ? TB.chatOffToast : TB.chatOnToast); if (!chatOff) loadChatx(); sched();`

**독 배지와 시트는 숨기지 않습니다.** 시트에 `기록`과 `카드 구성` 탭이 있기 때문입니다.
- 채팅을 끄면 독 배지 aria-label에서 채팅을 빼고 `T.chat.log`만 씁니다.
- 배지의 피 점은 `ui.logNew`에만 반응합니다.

**chatx 로더**
```js
let cxState = 0;   // 0 없음, 1 불러오는 중, 2 완료
function loadChatx() {
  if (chatOff || cxState) return; cxState = 1;
  addScript(A.chatx, (ok) => { cxState = ok && W.CHATX ? 2 : 0; if (cxState) CHATX.init({ toast }); });
}
```
호출 지점: `setSheet(h>0)` 안, 그리고 `loadAssets()`의 `idle(...)` 안.

**base.css 추가**
```css
.msg-q{display:block;margin:0 0 1px;padding-left:8px;border-left:1px solid var(--ash);font-size:var(--fs-small);color:var(--smoke);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.msg-q .nm{color:var(--bone-dim);margin-right:4px}
.chat-offnote{display:none}
body[data-chat=off] .chat-offnote{display:block;font-size:var(--fs-small);color:var(--smoke);padding:6px 0}
body[data-chat=off] #chatLog .msg[data-sys="0"],body[data-chat=off] .chat-form{display:none}
```

### 3.3 chatx 모듈 (G4, chatx.js + chatx.css)
**API**
```js
window.CHATX = { init({ toast }) }   // 두 번 불려도 한 번만 동작
```
- `init`는 `#chatLog`, `.chat-form`, `#chatInput`을 찾고, 위임 리스너만 답니다. 메시지마다 리스너를 달지 않습니다.
- 모든 문구는 `T.chat.*`에서 읽습니다. `esc`는 모듈 안에 작게 둡니다.
- `reduce = matchMedia('(prefers-reduced-motion:reduce)').matches || document.documentElement.dataset.perf === 'lite'`.

**답글하기 버튼 (길게 누르기는 쓰지 않습니다. 투표·나가기의 길게 누르기와 iOS 텍스트 선택과 겹치기 때문입니다)**
- 버튼은 하나만 만들어 옮겨 씁니다: `<button class="msg-act" type="button" hidden>답글하기</button>`. aria-label은 `fmt(T.chat.replyAria,{n:이름})`.
- 모바일: `.msg[data-sys="0"][data-mid]`를 탭하면 그 메시지에 `.is-sel`을 붙이고 버튼을 그 메시지 끝에 붙입니다. 다른 곳을 탭하거나 3초가 지나면 숨깁니다.
- 데스크톱 `(hover:hover)`: `.msg:hover`에 같은 버튼을 붙입니다.
- 키보드: 메시지에 `tabindex="-1"`. 로그 안에서 ↑/↓로 메시지를 옮겨 다니고 Enter로 답글을 시작합니다.
- `#chatInput.disabled`(밤)이면 버튼을 보이지 않습니다.
- `data-mid`가 없는 메시지(예전 기록)에는 버튼을 붙이지 않습니다.

**답글 바**: `init`에서 `.chat-form` 맨 앞에 한 번 넣습니다.
```html
<div class="chat-re" role="status">
  <span class="chat-re-t"><b class="nm">민수</b> 원문 앞부분…</span>
  <button class="chat-re-x" type="button">취소하기</button>
</div>
```
- 답글 시작: `form.dataset.re = mid`, 바 내용은 DOM의 `.msg-t`를 40자(코드포인트)로 잘라 채웁니다. 상태 문장은 `T.chat.replyBar`로 `#sr`에도 넣습니다. 그다음 입력창에 포커스를 줍니다.
- 취소: `취소하기` 또는 입력창에서 Esc → `delete form.dataset.re`, 포커스는 입력창에 둡니다.
- 바가 보이는지는 `form.dataset.re`만으로 정해집니다(app.js가 지워도 바가 따라 사라짐).

**인용 눌러 이동**: `#chatLog`의 click과 keydown(Enter/Space)에서 `.msg-q`를 찾습니다.
- `[data-mid="<re>"]`가 있으면 `scrollIntoView({block:'center', behavior: reduce ? 'auto' : 'smooth'})`를 하고 `.is-hit`을 1200ms 붙입니다.
- 없으면 `toast(T.chat.gone)`.

**chatx.css**
```css
.chat-form{flex-wrap:wrap}
.chat-re{flex:1 0 100%;display:flex;align-items:center;gap:8px;font-size:var(--fs-small);color:var(--smoke)}
.chat-re-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chat-form:not([data-re]) .chat-re{display:none}
.msg{position:relative}
.msg.is-hit::before{content:"";position:absolute;inset:0 -8px;background:var(--blood-deep);opacity:0;animation:cx-hit 1.2s ease-out both;pointer-events:none;z-index:-1}
@keyframes cx-hit{15%{opacity:.35}to{opacity:0}}
@media(prefers-reduced-motion:reduce){.msg.is-hit::before{animation:none;opacity:.35}}
html[data-perf=lite] .msg.is-hit::before{animation:none;opacity:.35}
body[data-chat=off] .msg-act{display:none}
```
- 바가 나타나거나 사라질 때 높이 애니메이션은 쓰지 않습니다.
- reduced/lite에서는 `.is-hit`을 600ms 뒤에 뗍니다.

### 3.4 엣지 케이스
- 재접속: `chatHistory`에 `mid`·`re`가 있으므로 인용이 그대로 복원됩니다.
- 나가거나 강퇴된 사람의 메시지에도 답글을 달 수 있습니다(서버에 저장된 이름 사용).
- 채팅을 끈 상태에서 남이 내게 답글을 달아도 알리지 않습니다.

---

## 4. F2 누구의 카드인지 표시하기

### 4.1 서버 (G1)
- insomniac `setPrompt`에 필드 하나를 더합니다: `reveal: [{ at: 'p', id: pid, role: now }]`.
- robber 기록의 reveal에 출처를 더합니다: `[{ at: 'p', id: pid, role: g.cards[pid], from: t }]`. ack에도 같은 배열이 갑니다.
- 다른 역할의 reveal 형태는 바꾸지 않습니다.

### 4.2 큰 카드 캡션 (G2 마크업, G3 CSS)
**app.js**
```js
// ui.reveals 항목: { k:'p'|'c', id, idx, role, self?: 'new'|'now', from?: pid, copy?: 1 }
const whoOf = (r) => r.k === 'c' ? esc(T.altar[r.idx])
  : r.id === S.me ? esc(r.self === 'now' ? TB.whoNow : TB.whoNew)
  : fmt(TB.whoCard, { n: { t: pname(r.id), h: '<b class="rv-n">' + esc(pname(r.id)) + '</b>' } });
```
`revealHTML()`는 카드마다 아래처럼 감쌉니다. 캡션은 카드 **위**에 둡니다(아래에는 덮기 힌트가 있고, 엄지가 가리는 곳도 아래입니다).
```html
<div class="reveal" data-act="cover" role="button" tabindex="0">
  <div class="reveal-row">
    <figure class="rv-it">
      <figcaption class="rv-who"><b class="rv-n">철수</b>의 카드</figcaption>
      ART.card(role,{size:'md',face:1,label:'철수의 카드: 늑대인간'})
      <p class="rv-sub">이제 당신은 이 역할입니다.</p>        <!-- 도플갱어(copy) 또는 강도(from)일 때만 -->
    </figure>
  </div>
  <p class="reveal-hint">누르면 카드를 덮습니다.</p>
</div>
```
- `rv-sub`: 도플갱어면 `TB.whoCopy`, 강도면 `fmt(TB.whoFrom,{n:pname(from)})`.
- 카드를 펼칠 때 `sr(ack.text)`로 서버 문장을 읽어 줍니다.

**onAck 변경**
- 강도(`t==='robber'`): 지금처럼 `ui.last`를 바꾸고, `ui.reveals.push({k:'p', id:S.me, self:'new', from: v.from || sn.sel[0], role:v.role})`도 합니다.
- 도플갱어: push할 때 `copy:1`.
- 외톨이 늑대: `k:'c'`라서 캡션은 '가운데 카드 N'.

**불면증환자**: 프롬프트가 `t==='info' && p.reveal && !ui.dn['rv'+p.key]`이면 한 번만 `ui.dn['rv'+p.key]=1`로 표시하고 `{k:'p', id:S.me, self:'now', role}`을 push합니다. 덮은 뒤에 기존 확인 버튼이 나옵니다.

**출처 자리 강조** (`nightView`의 `if (ui.reveals.length)` 분기): `V.target = ui.reveals.filter(r => r.k==='p' && r.id!==S.me).map(r => r.id); V.targetC = ui.reveals.filter(r => r.k==='c').map(r => r.idx);` 기존 `.is-target` 테두리를 다시 씁니다.

**screens.css (G3)**: `.reveal` 다음에
```css
.rv-it{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
.rv-who{max-width:max(var(--cw-md),40vw);padding:1px 6px;font:600 13px/1.35 var(--f-body);color:var(--bone-hi);background:rgba(10,8,7,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 0 #000}
.rv-n{display:inline-block;max-width:6.6em;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom;color:var(--blood-hot)}
.rv-sub{margin:0;font-size:var(--fs-small);color:var(--bone-dim)}
```
375px 확인: 예언자 가운데 2장은 128×2+8=264px로 343px 안, 세로는 약 22px 늘어납니다.

### 4.3 이름 판 (늑대인간·하수인·프리메이슨) — 예산 컷 1순위
프롬프트에 `ids`가 1명 이상이면 `.rv` 영역에 띄웁니다. 비어 있으면 띠 문구만 씁니다.
```html
<div class="reveal rv-info" data-act="cover" role="button" tabindex="0">
  <p class="rv-who">함께 깨어난 늑대인간</p>     <!-- whoPack / whoOwners(하수인) / whoBros -->
  <ul class="rv-names"><li>철수</li><li>영희</li></ul>
  <p class="reveal-hint">누르면 카드를 덮습니다.</p>
</div>
```
```css
.rv-names{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:min(300px,86vw);margin:0;padding:0;list-style:none}
.rv-names li{padding:2px 8px;font:600 15px/1.4 var(--f-body);color:var(--bone-hi);border:1px solid var(--blood);background:rgba(10,8,7,.78);max-width:7em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
```

### 4.4 독 엿보기
- **G2**: `lastSeen()`이 `{role, lbl, sub}`를 돌려줍니다. `peekInfo()`는 `{ role, label: [lbl, sub] }`를 돌려줍니다.

| 상황 | lbl | sub |
|---|---|---|
| 처음 받은 카드 | `whoMine` | `peekFirst` |
| 강도(도플갱어 강도 포함) | `whoNew` | `fmt(whoFrom,{n:pname(reveal.from)})` |
| 불면증환자 | `whoNow` | `whoWoke` |
| 도플갱어 | `whoMine` | `fmt(whoCopied,{n:pname(첫 reveal.id)})` |

- **G3** fx.js `peek(roleId, label)`: `label`이 문자열이면 지금처럼, 배열 `[lbl, sub]`이면 아래처럼 만듭니다.
  ```html
  <p class="peek-label"><b class="peek-who">당신의 새 카드</b><span>철수에게서 가져온 카드</span></p>
  ```
  ```css
  .peek-label{display:flex;flex-direction:column;gap:2px}
  .peek-who{font:600 15px/1.3 var(--f-body);color:var(--bone-hi)}
  ```

### 4.5 밤 기록 꼬리표 — 예산 컷 2순위
- **G2** `paintLog`: xs 카드마다 감쌉니다. `<span class="log-c">ART.card(xs)<i class="log-who">철수</i></span>`. 값은 가운데면 `T.replay.ui.altarShort[idx]`, 나면 `TB.whoMe`, 다른 사람이면 이름입니다.
- **G3** CSS:
  ```css
  .log-c{display:inline-flex;flex-direction:column;align-items:center;gap:2px;width:44px;flex:none}
  .log-who{font:500 10px/1.2 var(--f-body);font-style:normal;color:var(--bone-dim);max-width:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  ```
- 꼬리표는 `.secret-in` 안에 있어서 흐림 처리를 같이 받습니다.

F2에는 새 애니메이션이 없습니다(`.reveal`의 기존 fx-rise를 이어받습니다).

---

## 5. F3 배경음악 (합성)

### 5.1 원칙
- 소리 파일은 내려받지 않습니다. 오실레이터, Biquad, 2초 모노 노이즈 버퍼 하나로 모든 소리를 만듭니다. 멜로디·팡파르는 쓰지 않고, 드론·바람·심장·종·끌 긁는 소리만 씁니다.
- **기본값은 켜짐**(첫 제스처 뒤, 작게)입니다(대면 플레이에서 폰 여러 대가 동시에 울리기 때문).
- 첫 로비 진입 때 한 번만 `toast(TB.bgmTip)`를 띄우고 `LS.set('hb.bgmTip','1')`.
- 소리는 reduced-motion의 대상이 아닙니다. lite에서는 층을 줄입니다.

### 5.2 game.js 쪽 (G2)
**상태**: `let bgmOn = LS.get('ww_bgm') !== '0';` 음량 `LS.get('ww_bgm_vol')`은 `'1'|'2'|'3'`, 기본 `'1'`.

**shim** (fx와 같은 큐 방식, 공용 `qcall` 사용)
```js
W.SND = W.SND || { q: [] };
const snd = (n, ...a) => { if (bgmOn) qcall(W.SND, n, a, 8); };
```

**켜기 (메뉴 액션 `bgm`)**. 클릭 핸들러 안에서 동기적으로 컨텍스트를 만듭니다(iOS 자동재생 규칙). 스크립트 로드는 비동기이므로 모듈에 맡기면 제스처가 사라집니다.
```js
bgm() {
  bgmOn = !bgmOn; LS.set('ww_bgm', bgmOn ? '1' : '0');
  if (bgmOn) {
    try { const C = W.AudioContext || W.webkitAudioContext; if (!W.SND.ctx && C) W.SND.ctx = new C(); W.SND.ctx.resume(); } catch (e) {}
    if (W.SND.on) W.SND.on(); else { W.SND.q.unshift(['on', []]); addScript(A.audio, () => {}); }
    snd('scene', 현재 장면);
  } else if (W.SND.off) W.SND.off();
  closeModal(); toast(bgmOn ? TB.bgmOnToast : TB.bgmOffToast);
}
```
- 시작 시 `bgmOn`이면 `loadAssets()`의 idle에서 `addScript(A.audio)`. 컨텍스트는 만들지 않습니다(audio.js가 첫 제스처에서 만듭니다).
- 메뉴: `item('bgm', bgmOn ? TBT.bgmOff : TBT.bgmOn)`, 그 다음 `bgmOn && W.SND.segHTML ? W.SND.segHTML() : ''`. 음량 버튼의 마크업과 클릭 처리는 audio.js가 맡습니다.

**호출 지점**
| 위치 | 호출 |
|---|---|
| `render()`에서 장면이 바뀔 때. 장면 = lobby/day/vote/result는 그대로, check·sleep·act 등 밤 모드는 `'night'` | `snd('scene', sc, { ends })`. `ends`는 낮·투표 종료 시각을 로컬 시계로 바꾼 값(서버 시각 − `skew`) |
| `startResult` | `snd('scene', 'result', { win: 내 승패(true/false, 관전이면 null), dead: 처형 수, replay: 자동 리플레이 여부 })` |
| `render()`의 `awk` 시작(255행) | `snd('sting', 'wake')` |
| `awk` 끝(256행) | `snd('sting', 'close')` |
| `speak()` | `u.onstart = () => snd('duck', 'tts', -8); u.onend = u.onerror = () => snd('duck', 'tts', 0);` |

### 5.3 replay.js 쪽 (G3)
큐에 쌓지 않고 있을 때만 부릅니다: `const N = window.SND; if (N && N.ctx) N.toll(dead>0)`.
- 리플레이 시작: `duck('rp', -9)`, 끝 또는 건너뛰기: `duck('rp', 0)`.
- 카드가 바뀌는 박자: `sting('carve')`.
- 처형 도장 박자: `toll(dead > 0)`. 건너뛰면 즉시 한 번 칩니다.

### 5.4 audio.js 공개 API (G4)
```js
window.SND = {
  q, ctx,                     // 로드 전 큐, app이 만든 AudioContext(있으면 그대로 씀)
  on(), off(), vol(1|2|3),
  scene(name, o),             // 'lobby'|'night'|'day'|'vote'|'result', o: { ends?, win?, dead?, replay? }
  sting(name),                // 'wake'|'close'|'carve'
  toll(dead),                 // 종 1타. dead=false면 lowpass 600Hz로 둔하게
  duck(key, db),              // key별 감쇠, 실제 값은 가장 낮은 것. db=0이면 해제
  pause(), resume(),
  segHTML(),                  // 음악 크기 .seg 마크업(T.body.bgmVol, bgmLv)
}
```
- 로드되면 기존 `window.SND.q`와 `ctx`를 넘겨받고, 큐를 차례로 재생합니다.
- 모든 메서드 본문을 try로 감싸고 실패하면 조용히 무시합니다.
- `segHTML()`의 버튼은 `<button type="button" class="seg-btn" data-snd-vol="2" aria-pressed="true">보통</button>` 형태입니다. audio.js가 `document`에 click 위임 리스너를 하나 달아 `vol()`을 부르고 `LS` 대신 `localStorage['ww_bgm_vol']`을 try로 저장합니다. `data-act`는 쓰지 않습니다(app의 runAct와 충돌 방지).
- 음량은 0.35·0.6·1.0, 실제 이득은 `v*v*0.5`입니다.

**생명주기**
- 컨텍스트가 없으면 `pointerdown`/`keydown`에 `{once:true, capture:true}`로 한 번 리스너를 달고 거기서 만들고 `resume()`합니다. `state==='interrupted'`(iOS 통화)도 다음 제스처에서 resume합니다.
- `if (navigator.audioSession) navigator.audioSession.type = 'ambient'`.
- `visibilitychange`는 audio.js가 직접 듣습니다: 숨으면 `ctx.suspend()`, 보이면 `resume()`(켜져 있을 때만).
- `off()`: 마스터를 0.3초에 걸쳐 0으로 내린 뒤 suspend. 노드는 남겨 둡니다.
- 컨텍스트는 하나만 만들고 다시 만들지 않습니다.

**믹싱 체인**
```
scene bus(GainNode) ─┐
sting bus ───────────┼→ duck → master → DynamicsCompressor(-24dB, knee 12, ratio 4, attack .01, release .3) → destination
```
- 장면 전환: 새 bus 0→1, 이전 bus 1→0, `setTargetAtTime(·, t, 0.8)`. 4초 뒤 이전 소스를 `stop()`·`disconnect()`.
- 공용: 2초 모노 화이트 노이즈 버퍼 1개, 에코 1개(Delay 0.38s → 피드백 0.35 → lowpass 1800Hz). ConvolverNode, HRTF Panner, AudioWorklet은 쓰지 않습니다.
- 박자 이벤트(심장, 틱, 퉁김)는 `setInterval(250ms)` 룩어헤드로 0.5초 앞까지 예약합니다. rAF는 쓰지 않습니다.
- 스팅어 노드는 `stop(t+decay)`, `onended`에서 disconnect합니다.
- 레시피는 데이터 표(배열)로 적어 코드를 줄입니다.

### 5.5 장면 레시피 (기본 A 에올리안, 위협은 반음 충돌로만)
- **로비 「등불 아래」**: sine 55Hz + sine 82.4Hz(+3cent) 각 0.05. triangle 110Hz → lowpass 400Hz(Q1), 컷오프 LFO 0.07Hz ±150Hz. 7~13초마다 {A3,C4,E4,G4} 퉁김: sine + 한 옥타브 위 triangle, attack 5ms, 지수 decay 2.5s, peak 0.04, 에코로 보냄.
- **밤 「달 없는 밤」**: 바람 = 노이즈 → bandpass(Q .8, 500Hz), 주파수 LFO 0.11Hz ±300Hz, 음량 LFO 0.023Hz 0.02~0.06. 드론 sawtooth 36.7Hz → lowpass 140Hz(Q2) 0.06 + sine 73.4Hz 0.03. 약 20초마다 sine 77.8Hz가 6초 동안 0.015까지 차고 6초 동안 빠짐(lite 생략).
  - `wake`: highpass 2kHz 노이즈 0→0.05(0.6s) 후 끊고, 끊는 순간 sine 90→49Hz(0.12s) 쿵(decay 0.8, peak 0.2), sine 587Hz + 880Hz(−4cent) attack 30ms decay 1.8s gain 0.03. 바람은 2초간 −6dB.
  - `close`: sine 220→110Hz 0.4초 글라이드, 0.02.
- **낮 「새벽 논쟁」**: 바람 bandpass 1200Hz 0.015. sine 110Hz + 164.8Hz, 트레몰로 0.2Hz 깊이 30%. 9~15초마다 {D4,F4,A4,B4} 퉁김. `ends` 30초 전부터 1초마다 맥박 sine 55Hz(attack 2ms, decay 120ms, 0.03→0.12).
- **투표 「심판」**: sawtooth 41.2Hz → lowpass 90Hz 0.07 + 노이즈 → lowpass 120Hz 0.01. 심장 lub(sine 90→45Hz 80ms, attack 4ms, decay 180ms, 0.25) + 0.28초 뒤 dub(50Hz, 0.18). 간격 1.0초 → `ends`에 가까울수록 0.7초.
- **결과 「판결」**: 드론 3초 페이드아웃, 0.6초 침묵 뒤 종. `o.replay`면 종은 리플레이의 `toll`에 맡깁니다.
  - 종: 기본 110Hz, 부분음 [비율, 이득] = [.5,.35],[1,.5],[1.19,.3],[1.5,.2],[2,.25],[2.74,.12],[3.76,.08],[5.4,.05]. attack 3ms, decay 6s/비율^0.6. 타격 노이즈 20ms → highpass 3kHz, 0.1. lite는 앞 5개 부분음만.
  - 승리: 종이 잦아든 뒤 triangle 110Hz + 165Hz → lowpass 900Hz 3초 페이드인, sine C#4 0.008.
  - 패배: sawtooth D1 → lowpass 120Hz, 8초 동안 −30cent 글라이드, Eb2 충돌, 바람 재진입.
  - `carve`: 노이즈 → bandpass 3kHz(Q6) 60ms, 0.05.
- **lite**: 에코 생략, 불안 스웰 생략, 퉁김 간격 ×1.5, 종 부분음 5개. 한 장면 동시 소스 ≤6, 노드 ≈15.

---

## 6. F4 카드 정렬

### 6.1 고칠 어긋남 (스크린샷 근거)
1. 좌석 앵커가 토큰이 아닌 좌석 박스 전체에 걸림(desktop 011, 051).
2. 모바일 좌석 카드가 토큰 링을 덮음, 리플레이 `.is-target` 링이 카드를 관통(375 011, 360 003, replay-07).
3. 데스크톱 득표 배지가 처형 X·카드와 겹침(desktop 051).
4. 센터 카드 3장이 타원 중심과 어긋남(replay-07, `.res .altar{top:46%}`).
5. 로비 덱 팬이 `+N` 때문에 왼쪽으로 치우치고 이름띠가 잘림, 7명 이상에서 인라인 `--cw:38px`이 미디어 쿼리를 이김.
6. 데스크톱 사이드바 카드 구성 칸이 넘치고 「선택한 카드 9 / 9」가 줄바꿈됨.
7. 카드 크기가 13가지.
8. 리플레이에서 내 좌석 이름표가 토큰에서 떨어짐.

### 6.2 정렬 규칙
- **R1** 좌석 기준점은 언제나 토큰 중심입니다.
- **R2** 좌석 카드는 탁자 안쪽에 놓고, 토큰과 세로 중심을 맞추고, 링 바깥 6px에 둡니다.
- **R3** 같은 줄의 카드는 같은 `--cw`, 간격은 `--cw × .12`.
- **R4** 센터 카드 3장의 중심 = 타원 중심 `--cy`.
- **R5** 장식(`+N`, 배지)은 absolute로 흐름 밖에 둡니다.

### 6.3 크기 토큰 (G3, card.css `:root`)
```css
:root{--cw-seat:26px;--cw-xs:40px;--cw-sm:72px;--cw-hero:96px;--cw-md:128px;--cw-xl:min(64vw,300px)}
@media(min-width:600px){:root{--cw-seat:40px;--cw-sm:88px;--cw-hero:128px;--cw-md:156px}}
```
- 이 밖의 카드 폭 px 리터럴은 쓰지 않습니다. 예외는 덱 칸 64px 하나입니다.
- `card.css:15`의 `.card.altar-card{--cw:52px}`를 지웁니다.

### 6.4 탁자 변수와 좌석 (G3, screens.css)
```css
.stage{--tk:48px;--seat-cw:var(--cw-seat);--altar-cw:var(--cw-sm);--fan-cw:44px;--gap-c:calc(var(--altar-cw)*.12);--cy:0px}
.stage[data-n="7"],.stage[data-n="8"]{--tk:40px;--fan-cw:40px}
.stage[data-n="9"],.stage[data-n="10"]{--tk:40px;--seat-cw:22px;--fan-cw:36px}
@media(max-width:399px){.stage{--altar-cw:52px;--fan-cw:36px}}
@media(min-width:600px){.stage,.stage[data-n]{--fan-cw:64px}}
@media(min-width:1024px){.stage,.stage[data-n]{--tk:56px}}
#stage[data-tight="1"]{--seat-cw:calc(var(--cw-seat)*.9);--altar-cw:64px}

.seat{transform:translate(calc(var(--x) - 50%),calc(var(--y) - var(--tk)/2))}
.seat>.card{--cw:var(--seat-cw);position:absolute;z-index:2;margin:0;top:calc(var(--tk)/2 - var(--cw)*.7);left:calc(50% + var(--tk)/2 + 6px)}
.seat[data-side=r]>.card{left:auto;right:calc(50% + var(--tk)/2 + 6px)}
.seat-mark[data-k=votes]{top:-6px;bottom:auto;left:auto;right:calc(50% + var(--tk)/2 - 10px);transform:none}
.seat[data-side=r] .seat-mark[data-k=votes]{right:auto;left:calc(50% + var(--tk)/2 - 10px)}

.altar{top:calc(50% + var(--cy));gap:var(--gap-c)}
.altar .card{--cw:var(--altar-cw)}
.res .altar{top:calc(50% + var(--cy))}
```
- 데스크톱 "토큰 아래 카드" `@media` 블록, 모바일 `top:-4px` 규칙, `.res .seat>.card`, `#stage[data-tight] …` 개별 규칙 4줄을 지우고 위로 대체합니다.
- G3는 DESIGN_SPEC §5.3의 좌석 카드 위치 문장을 "토큰 안쪽 옆, 세로 중심 일치"로 고칩니다.
- `data-side=r`은 "토큰이 오른쪽 반에 있음 → 카드는 왼쪽(안쪽)"이라는 뜻입니다.

### 6.5 placeSeats·lobbyHTML (G2, app.js)
```js
// placeSeats: pts 계산 뒤
s.dataset.side = ui.pts[i].x > 8 ? 'r' : 'l';
st.style.setProperty('--cy', (-rp / 2) + 'px');
const tk = parseFloat(getComputedStyle(st).getPropertyValue('--tk')) || 48;
const ry = Math.max(60, Math.min(H/2 - 64, H/2 - (sh - tk/2) - 12, H/2 - tk/2 - 28));
```
- `lobbyHTML`: 인라인 `--ty`와 `;--cw:38px`를 지우고 `;--i:` + `Math.abs(o)`를 넣습니다. `--r`은 유지합니다(F5 deal이 읽습니다).

### 6.6 로비 덱 팬 (G3)
```css
.fan{position:relative;align-items:flex-end}
.fan .card{--cw:var(--fan-cw);transform-origin:50% 140%;transform:rotate(var(--r,0deg));z-index:calc(10 - var(--i,0))}
.fan .card+.card{margin-left:calc(var(--cw)*-.58)}
.fan .card-name{opacity:0}
.fan .card:last-of-type .card-name{opacity:1}
.fan-more{position:absolute;left:100%;bottom:50%;margin-left:6px;transform:translateY(50%)}
```

### 6.7 카드 구성 시트·사이드바, 결과 (G3)
```css
.deck-grid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:16px 8px}   /* 뷰포트 브레이크포인트 2줄 삭제 */
.deck-cell .card{--cw:64px}
.deck-ctl{width:100%;max-width:112px;justify-content:space-between}
.deck-dec,.deck-inc{width:36px;height:40px}                    /* ::before 48px 히트영역 유지 */
.deck-count,.deck-bar>:last-child{white-space:nowrap}
.deck-bar>:last-child{margin-left:auto}
.verdict-cards{align-items:flex-start;gap:calc(var(--cw-hero)*.16)}
.verdict-cards figure{width:var(--cw-hero)}
.verdict-cards .card{--cw:var(--cw-hero)}
.verdict-cards figcaption{width:max-content;max-width:calc(var(--cw-hero)*1.4);text-align:center;word-break:keep-all}
@media(min-width:600px){.res .stage{--seat-cw:56px}}
```
사이드바 안의 `.deck-count`는 `font-size:var(--fs-body)`로 낮춥니다.

### 6.8 리플레이 (G3)
- `REPLAY.relayout`의 좌석 카드 `--tx`에 `±(tk/2 + 6 + cw/2)`(`data-side` 부호)를 더해 실제 좌석 카드와 같은 좌표를 씁니다.
- 내 좌석 이름표가 떨어지는 문제: `rp-card`가 `.seat` 흐름 안에 들어가는지 확인하고, 들어가면 absolute로 바꿉니다.

---

## 7. F5 애니메이션

### 7.1 토큰 (G3)
`screens.css`의 `:root`(game.css, 지연)에 둡니다. 크리티컬 base.css에는 넣지 않습니다.
```css
:root{--t-gap:90ms;--t-deal:360ms;--t-stamp:140ms;--t-line:250ms;--t-trem:120ms;--t-silence:600ms;--ease-cut:steps(6,end)}
```
fx.js 상수:
```js
var TT={tap:60,ui:180,enter:360,flip:520,lid:500,phase:1100,gap:90,deal:360,stamp:140,line:250,trem:120};
var E={press:'cubic-bezier(.7,0,.3,1)',out:'cubic-bezier(.2,.7,.1,1)',ink:'steps(5,end)',cut:'steps(6,end)'};
```
- WAAPI(fx.js): 좌표 계산, 순서, `skip()`·`pause()`가 필요한 것 = deal, swap, tremble, execute, stamp, shake.
- CSS 클래스: 상태 변화에 한 번 반응하는 것 = 단계 점, 투표선, 투표 봉인, 배너 덮개, 카드 확인 등장.
- `run()`에 슬롯 검사: `live.length >= 6`이면 애니메이션 없이 끝 상태를 적용하고 `done`을 부릅니다. `will-change`는 run이 붙이고 끝날 때 뗍니다.
- 무한 애니메이션은 화면당 3개 이하.

### 7.2 fx.js 새 API (G3)
```js
FX.deal(o)              // o: { n }. Promise. .fan 접기 → 뒷면 복제본을 좌석 토큰 옆과 제단 3자리로. play('deal:'+gameId) 1회
FX.tremble(els, n=2)    // translateX(±2px), 회당 60ms. Promise
FX.stamp(host, text, kind)  // kind: 'blood'|'paper'. <i class="fx-stamp" data-k=kind>, scale(1.6→1)+opacity, rotate(-6deg) 고정, 140ms steps(3). Promise
FX.execute(card, slot)  // scaleX 1→0(130ms press) → 앞면 교체 → 0→1(130ms out) → stamp(slot, T.stamp.dead, 'blood') + shake(6,4) 240ms + flash('blood',120) + buzz(12)
```
- 모든 함수: `lite()`, `calm()`, `!canAnim`, `d.hidden`이면 끝 상태로 바로 가고 Promise를 resolve합니다. 기존 `skip()`과 visibilitychange 일시정지가 적용됩니다.
- **하드 규칙**: 밤에 다른 사람 좌석에 `tremble`을 부르지 않습니다. 함수 위에 주석으로 적습니다. 잠든 사람 화면에서 좌석이 흔들리면 교환 위치가 드러납니다. 밤의 정보 없는 흔들림은 기존 `FX.rustle`만 씁니다. rustle을 onAck나 행동 시각에 연결하지 않습니다.

### 7.3 게임 시작 배분 (G2 타이머, G3 연출)
**fx.js `deal`**
1. `.fan .card`가 `rotate(var(--r))→0`으로 모이며 `.fan` 전체가 opacity 1→0(240ms press).
2. 가운데에 `ART.card(null,{size:'xs',face:0,cls:'fx-ghost'})` 복제본을 `#fx`에 만들고, 내 왼쪽 좌석부터 시계 방향으로 `.seat-token` 옆, 마지막 3장은 `.altar` 자리로. 각 `translate(dx,dy) rotate(±4°→0)` 360ms press, 간격 90ms(동시 비행 ≤4장).
3. 착지: 복제본 `::before` 잉크판 opacity .5→0(60ms).
4. 복제본은 눈꺼풀이 닫힌 프레임에 지웁니다.
- lite: 날기 생략, 팬만 180ms opacity. reduced: 팬만 160ms 크로스페이드.

**app.js `onPhase`의 `night && from==='lobby'` 분기**
```js
const dl = first || D.hidden ? 0 : lite ? 200 : reduce ? 160 : 600 + 90 * (n + 3);
if (dl) fx('deal', { n });
// 이하 기존 intro 타이머 전부 +dl
```

### 7.4 카드 확인, 밤 단계, 새벽 (G3 CSS, G2 한 줄)
- `.check .card{animation:fx-rise 360ms var(--ease-out) both}` (눈꺼풀이 열린 뒤 시작).
- 단계 점: 지난 점 `opacity .35`(180ms). 새 점 `scale(1.4)→1` 120ms `steps(3)` 뒤 기존 `fx-dot` 맥동. `.night-msg`는 180ms opacity.
- 새벽: G2가 `later(400…)`을 `later(600…)`로 바꿉니다. G3: `.fx-head-1::after`에 `--void` 덮개 `scaleX(1→0)`, `transform-origin:right`, 360ms `steps(5)`. 독 `.crack`은 opacity 0→1 180ms `steps(3)`.
- 내 화면의 교환: 기존 `FX.swap` 앞에 `FX.tremble([a,b])`. G2의 onAck `sw()`가 `fx('tremble',[a,b])` 후 `fx('swap',a,b)`를 부르거나, G3가 `swap` 안에서 tremble을 먼저 실행합니다. **G3가 swap 안에서 처리**하는 것으로 정합니다(app.js 변경 없음). lite·reduced 생략.

### 7.5 투표선 (G3 CSS, G2 한 줄)
- `.ln.is-blood{transition:transform var(--t-line) var(--ease-cut)}`.
- G2 `lines()`: 선의 a·b가 바뀌면 `is-on`을 한 프레임 뗐다가 다시 붙입니다(기존 선을 opacity 0 120ms로 지운 뒤 새로 긋기).
- 확정(600ms 길게 누르기 완료): `.ln.is-lock`에 `scaleY(1→2)` 60ms. G2가 확정 시 `is-lock`을 붙입니다.
- `.seat.is-voted` 봉인: `scale(1.3→1)` + opacity 0→1, 120ms `steps(3)`. 누구를 찍었는지는 보이지 않습니다.

### 7.6 처형·판결 (G3, replay.js)
- replay.js 283행의 `F.shake/F.flash/F.buzz` 묶음을 `F.execute(card, slot)`로 바꿉니다. 정적 800ms는 기존 그대로입니다.
- swap 박자의 `wait(300)` 자리를 `F.tremble`로 바꿉니다(결과 리플레이에서만 좌석별 떨림 공개).
- 판결 개인 도장: `FX.stamp(el, win ? T.stamp.win : T.stamp.lose, win ? 'paper' : 'blood')`. 판결 띠 위에서는 흔들림을 쓰지 않습니다.
- lite: 뒤집기 대신 크로스페이드 160ms, 도장은 opacity만, 흔들림 없음. reduced: 도장을 opacity 120ms로 바로 놓음, 섬광·흔들림 없음. 도장·X·취소선은 어느 등급에서나 남깁니다.
- 리플레이 동시 실행 ≤4(뒤집기 1, 도장 1, 흔들림 1, 섬광 1).

### 7.7 CSS (G3, screens.css)
`.fx-stamp`, `.fx-ghost`, `.check .card` 등장, `.night-dot` 찍힘, `.ln.is-blood` easing, `.ln.is-lock`, `.is-voted` 봉인, `.fx-head-1::after` 덮개, lite·reduced 덮어쓰기 블록.

---

## 8. 빌드·로딩 (G4)

- `public/index.html` ASSETS에 두 토큰을 더합니다.
  ```html
  <script>window.ASSETS={ver:'__VER__',css:'/a/__GAME_CSS__',fx:'/a/__FX_JS__',replay:'/a/__REPLAY_JS__',chatx:'/a/__CHATX_JS__',audio:'/a/__AUDIO_JS__',fontD:'/a/__FONT_D__'}</script>
  ```
- `tools/stamp.js`
  - `chatx.js` + `css/chatx.css`(`__CHATX_CSS__`를 JSON 문자열로 치환, replay와 같은 방식) → `a/chatx.<h>.js`. 모듈은 로드 시 `<style>`을 한 번 넣습니다.
  - `audio.js` → `a/audio.<h>.js`.
  - 0.2절의 `@client:drop`·`@client:replay` 구간 처리.
  - `fileTok('__CHATX_JS__', …)`, `fileTok('__AUDIO_JS__', …)`. 파일이 없으면 빈 문자열(app의 `addScript`가 `.js`가 아니면 무시).
  - sw precache 목록에 `CHATX_JS`는 넣고 `AUDIO_JS`는 넣지 않습니다. `names`에 두 이름을 더합니다.
- `tools/check-budget.mjs`
  - `chatx.js` 2KB, `audio.js` 4KB 행(없으면 SKIP). "한 판 전체" 합계에 chatx와 audio를 더합니다(기본 켜짐).
  - game.js 경고선 23.8KB(WARN), 상한 24KB(FAIL)는 유지.
- 서버가 `/a/` 정적 파일을 해시 이름으로 서빙하는 방식과 CSP(있으면)에 새 파일이 막히지 않는지 확인합니다.

---

## 9. 작업 순서와 병렬화

1. 모든 그룹이 동시에 시작합니다. 계약은 이 문서에 있으므로 서로 기다리지 않습니다.
2. G1은 문자열 키를 가장 먼저 커밋합니다(다른 그룹이 로컬 확인할 때 필요).
3. G4는 stamp.js의 strip 처리와 새 토큰을 먼저 끝내고, 그다음 chatx.js, audio.js를 만듭니다.
4. 통합: `npm test` → `npm run smoke` → `node tools/stamp.js` → `node tools/check-budget.mjs` → `node tools/capture.mjs`로 review/shots 다시 찍기.
5. game.js가 23.8KB를 넘으면 0.4절 컷 순서대로 G2가 뺍니다.

그룹 간 접점 요약
| 접점 | 제공 | 사용 |
|---|---|---|
| `chat` 페이로드 `mid`, `re` | G1 | G2, G4 |
| insomniac 프롬프트 `reveal`, robber reveal `from` | G1 | G2 |
| 문자열 키 2장 | G1 | G2, G3, G4 |
| `.msg-q`, `[data-mid]`, `.chat-form[data-re]`, `body[data-chat=off]` | G2 | G4 |
| `CHATX.init({toast})` | G4 | G2 |
| `SND.*`, `SND.segHTML()` | G4 | G2, G3 |
| `FX.deal/tremble/stamp/execute`, `peek(role,[lbl,sub])` | G3 | G2, G3(replay) |
| `.rv-it/.rv-who/.rv-n/.rv-sub/.rv-info/.rv-names`, `.log-c/.log-who`, `.peek-label/.peek-who` | G2 마크업 / G3 CSS (peek은 G3) | |
| `.seat[data-side]`, `--cy`, `.fan .card` `--r`·`--i`, `.ln.is-lock` | G2 | G3 |
| `__CHATX_JS__`, `__AUDIO_JS__`, `A.chatx`, `A.audio` | G4 | G2 |

---

## 10. 테스트 체크리스트

### 10.1 자동 (test/)
**G1 `test/sim.js`**
- [ ] `chatHistory`의 `mid`가 1부터 빠짐없이 증가(시스템 메시지 포함).
- [ ] `re`가 문자열·음수·0·소수·없는 번호·시스템 메시지 번호면 `re` 없이 일반 메시지로 저장.
- [ ] 줄바꿈이 섞인 45자 원문의 인용 `t`가 공백 정리 뒤 40자 + `…`. 이모지(서로게이트 쌍)가 잘리지 않음.
- [ ] 클라이언트가 보낸 `re`에 이름·내용을 넣어도 서버 원문으로 덮어씀.
- [ ] 밤에 `re`를 붙인 메시지는 거부.
- [ ] 로비로 돌아가도 `chat`, `chatSeq` 유지.
- [ ] insomniac 프롬프트에 `reveal:[{at:'p',id:자기,role:현재}]`.
- [ ] robber ack·기록 reveal에 `from`.
- [ ] `require('./public/strings.js')`에 `T.msg`와 `T.replay` 전체가 그대로 있음(서버 호환).

**G3 `test/replay.js`**
- [ ] `F.execute`가 없을 때(fx 미로드) 리플레이가 멈추지 않음.
- [ ] 건너뛰기 시 도장·X가 끝 상태로 남음.

**G4 `test/smoke.js`**
- [ ] 빌드한 game.js에 `T.msg` 문자열(예: 서버 전용 문장 하나)이 없고, replay.js에는 `T.replay.pro`가 있음.
- [ ] 빌드한 game.js·replay.js·chatx.js·audio.js가 모두 파싱됨.
- [ ] 정적 검사: app.js에서 `fx('tremble'`이 호출되지 않음, fx.js의 `rustle` 근처에 onAck 연결 없음.
- [ ] index.html에 `__CHATX_JS__`, `__AUDIO_JS__` 토큰이 남아 있지 않음.

### 10.2 예산
- [ ] `node tools/check-budget.mjs` 전부 OK: game.js ≤24KB(목표 ≤23.8KB), fx.js ≤5KB, game.css ≤9KB, base.css ≤7KB, chatx.js ≤2KB, audio.js ≤4KB, replay.js ≤15KB(OWNER, 옮겨 온 문자열 포함), hanbam-d ≤30KB.
- [ ] 음악이 꺼진 첫 방문에서 `audio.*.js` 요청 0건. 채팅을 끈 방문에서 `chatx.*.js` 요청 0건.

### 10.3 수동 — F1
- [ ] 모바일: 메시지 탭 → 답글하기 → 바 표시 → 보내기 → 인용 줄 표시 → 인용 탭 → 원문으로 이동하고 1.2초 강조.
- [ ] 데스크톱: hover로 버튼, 키보드 ↑/↓/Enter, Esc 취소.
- [ ] 150개 밖으로 밀린 원문 인용을 누르면 `gone` 토스트.
- [ ] 답글 바를 연 채 밤이 되면 바가 사라지고 아침에 남아 있지 않음.
- [ ] 채팅 끄기: 일반 메시지·입력창 숨김, 시스템 메시지와 안내 줄 보임, 배지 숫자·티커 없음, `기록` 새 표시는 계속, 새로고침 뒤에도 유지, 다시 켜면 chatx 로드.
- [ ] 이름·인용에 `<img onerror>`를 넣어도 실행되지 않음.

### 10.4 수동 — F2
- [ ] 예언자(사람 1, 가운데 2), 강도, 말썽쟁이 없음, 도플갱어(+예언자/강도), 외톨이 늑대, 불면증환자 각각에서 캡션 문구가 표와 일치.
- [ ] 큰 카드를 보는 동안 출처 좌석·가운데 카드에 `is-target` 테두리.
- [ ] 375×812, 360×640에서 캡션 한 줄, 8글자 이름 말줄임, 위쪽 좌석 이름과 겹치지 않음.
- [ ] 독 엿보기 두 줄 라벨, 밤 기록 꼬리표가 흐림 상태에서는 안 보이고 누르면 보임.
- [ ] 스크린리더: 펼칠 때 서버 문장을 읽음.

### 10.5 수동 — F3
- [ ] 기본 켜짐(작게), 첫 로비에서 안내 토스트 한 번.
- [ ] iOS Safari: 메뉴에서 켜자마자 소리 남, 무음 스위치를 켜면 소리 안 남, 다른 앱 음악과 섞임.
- [ ] 새로고침 뒤(켜 둔 상태) 첫 탭에서 소리 시작.
- [ ] 장면 전환 크로스페이드, 내 차례 `wake`, 투표 심장 간격 줄어듦, 결과 종 1타(처형 없음은 둔한 종).
- [ ] 음성 안내 중 −8dB, 리플레이 중 −9dB, 끝나면 복귀.
- [ ] 탭을 숨기면 `ctx.state==='suspended'`.
- [ ] 저가 안드로이드 투표 화면 CPU 1~2% 수준, lite에서 층 감소.
- [ ] 음악 크기 `작게/보통/크게`가 메뉴에서 바로 반영되고 저장됨.

### 10.6 수동 — F4 (검증 행렬)
| 폭 \ 인원 | 3 | 5 | 6 | 8 | 10 |
|---|---|---|---|---|---|
| 360×640 | ✓ | ✓ | ✓ | tight | tight |
| 375×553 / 812 | ✓ | ✓ | ✓ | ✓ | tight |
| 1280×800 | ✓ | ✓ | ✓ | ✓ | ✓ |

각 칸에서 확인합니다.
- [ ] 토큰 중심이 타원 위(`getBoundingClientRect` 오차 ≤1px).
- [ ] 좌석 카드와 토큰 링이 겹치지 않음, 득표 배지가 카드·X와 겹치지 않음.
- [ ] 카드가 뷰포트 밖으로 0px, 세로 스크롤 0.
- [ ] 센터 카드 3장 중심 y = 위·아래 토큰 중점(결과 화면 포함).
- [ ] 팬 무리 중심 x와 `lobby-mid` 중심 차이 ≤2px, `+N`이 흐름 밖.
- [ ] 데스크톱 사이드바 카드 구성 3열, `− 1 +`가 칸 안, 「선택한 카드 9 / 9」 한 줄.
- [ ] 리플레이 replay-07 장면에서 이름표가 토큰에 붙어 있음, 좌석 카드 좌표가 실제 카드와 일치.

### 10.7 수동 — F5
- [ ] 6× CPU 쓰로틀에서 deal 중 프레임 ≤16.7ms, 50ms 넘는 long task 0.
- [ ] 재접속(`first`)·숨긴 탭에서는 deal을 하지 않고 타이머도 밀리지 않음. 같은 게임에서 deal은 한 번만.
- [ ] lite·reduced 각각에서 deal, tremble, execute, stamp가 정해진 대체 동작을 함.
- [ ] 밤에 잠든 사람 화면에서 특정 좌석이 흔들리지 않음(행동한 본인 화면의 두 카드만).
- [ ] 투표 대상을 바꾸면 기존 선이 지워지고 새로 그어짐, 확정 시 굵어짐.
- [ ] 처형: 정적 → 뒤집기 → 도장+흔들림+섬광, 건너뛰기 시 끝 상태.
- [ ] DevTools Animations 패널에서 동시 `will-change` 레이어 ≤6, 무한 애니메이션 화면당 ≤3.
- [ ] 애니메이션 속성이 transform/opacity뿐(Performance 패널에 Layout 없음).
