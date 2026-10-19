# 한밤의 늑대인간 — 카피 덱 (최종)

네 영역 초안(버튼·라벨 / 밤·카드 확인 / 낮·투표·시스템 / 결말·리플레이)을 합치고 리뷰 두 건의 지적을 반영한 최종본입니다.
이 문서가 `public/strings.js`, `public/roles.js`, `public/index.html`, `public/js/app.js`·`replay.js`·`art.js`의 한국어 문구 기준입니다. 이 문서와 다른 문구가 코드에 남아 있으면 이 문서가 맞습니다.

---

## 1. 보이스 원칙

1. **버튼은 "-기" 명사형으로 끝냅니다.** 누를 수 있는 모든 컨트롤이 대상입니다(버튼, 링크형 버튼, 메뉴 항목, 아이콘 버튼의 aria-label). 2~6음절이 좋습니다. 예: 방 만들기, 참가하기, 건너뛰기, 카드 보기, 투표하기, 나가기.
   - 예외 1: 누를 수 없는 상태 표시(비활성 메인 버튼 등)는 동작이 아니므로 명사로 씁니다. 예: 대기 중, 방장 대기 중, 2명 더 필요.
   - 예외 2: 기호 버튼 ×1, ×2는 그대로 둡니다(aria-label은 "-기").
2. **탭·섹션 제목·열 이름은 일반 명사로 씁니다.** 예: 채팅, 기록, 게임 규칙, 카드 구성, 결과.
3. **안내·상태·내레이션·오류·토스트는 합니다/하세요체로 씁니다.** 반말과 고어투 명령형("~하라", "~해라", "~한다.")은 쓰지 않습니다. 오류에서 다시 하라고 할 때는 "~해 주세요"로 씁니다.
4. **"당신"은 문장 안에서 꼭 필요할 때만 씁니다**(카드 공개, 내 결과). 좌석, 도장, 리플레이 이름 자리처럼 짧은 라벨은 "나"로 씁니다. "너"는 쓰지 않습니다.
5. **정식 한글판 보드게임 앱처럼 씁니다.** 비유, 꾸민 말, 가짜 위협조("피가 흐른다", "운명이…", "어둠이 속삭인다")는 쓰지 않습니다. 긴장감은 내레이션 내용과 그림이 만듭니다.
6. **밤 내레이션은 공식 앱 진행자 문체를 따릅니다.** "○○은/는 눈을 뜨세요. ~할 수 있습니다." / "모두 눈을 감으세요." TTS로도 읽으므로 쉼표를 최소로 씁니다.
7. **조사 템플릿(`${n:이/가}` 등)과 키 이름은 유지합니다.** "~입니다"는 받침과 관계없이 붙으므로 조사 쌍이 필요 없습니다. JOSA 표에 없는 쌍은 쓰지 않습니다(표에 없으면 조사 없이 단어만 나옵니다).
8. **이모지는 쓰지 않습니다.** 느낌표는 쓰지 않습니다.

---

## 2. 용어 결정표

| 기존(삭제) | 확정 용어 | 근거 |
|---|---|---|
| 패 | **카드** | 정식 한글판 규칙서와 앱이 "카드"를 씁니다. "패"는 화투·포커 느낌이 나고, 반말 문체와 함께 AI가 쓴 말투로 읽히는 주원인이었습니다. 오너 예시 "당신의 패는 늑대인간입니다"도 "당신의 카드는 늑대인간입니다"로 통일합니다. |
| 제단 | **가운데 카드** | 정식 용어라서 설명 없이 통합니다. 세 칸은 **가운데 카드 1 / 2 / 3**으로 부릅니다. "가운데 제단"을 "가운데 가운데 카드"로 겹쳐 쓰지 않기 위해서입니다. 숫자 뒤 조사는 endKind가 처리합니다(1과, 2와, 3을). |
| 마을(방 의미) / 표식 / 촌장 / 모닥불·불가 | **방 / 방 코드 / 방장 / 대기실** | 한국 온라인 게임의 표준 UI 용어입니다. "마을"은 진영 이름(마을 팀)으로만 씁니다. |
| 심판 / 지목 | **투표** | 정식 규칙 용어입니다. 투표로 죽는 것은 **처형**으로 씁니다. 사냥꾼 효과로 죽는 것은 처형이 아니므로 **죽다**로 씁니다. |
| 편 / 홀로 | **팀**: 마을 팀, 늑대인간 팀, 무두장이 팀 | 승리 배너 "○○ 팀 승리"와 맞습니다. |
| 늑대(약칭) | **늑대인간** | 역할 이름은 줄이지 않습니다. |
| 무리 / 주인 / 형제 | **동료 / 늑대인간 / 동료**(좌석 표시), "다른 늑대인간", "다른 프리메이슨"(메시지) | 비유 대신 무엇인지 그대로 씁니다. |
| 결말 / 판결 | **결과** | 단계, 막, HUD 모두 "결과" 하나로 씁니다. |
| 서막 | **시작** | "준비"는 대기실의 투표 준비 기능과 헷갈립니다. |
| 새벽 | **새벽**(단계·막 이름), 내레이션 문장은 **"아침이 되었습니다."** | HUD 단계와 리플레이 막 이름을 같게 맞춥니다. "아침이 밝았습니다"는 틀린 연어라 쓰지 않습니다. |
| 속삭임 | **채팅** | 기능 이름을 그대로 씁니다. |
| 법도 | **게임 규칙**(제목) / **규칙 보기**(버튼) | |
| 손 든 자 | **투표 준비 / 준비 완료** | |
| 박자 | **장면** | 리플레이에서 한 단위를 가리키는 말입니다. |
| 얼굴을 훔친다 / 베끼다 | **복사**(도플갱어) | "역할 복사하기", "역할을 복사합니다"로 씁니다. 링크 복사와는 목적어로 구분합니다. |
| 들추다 / 엿보다 / 우러르다 | **확인하다** | 공식 내레이션 동사입니다. 강도는 **훔치다**, 말썽쟁이와 주정뱅이는 **바꾸다**로 씁니다. |
| 골라라 | **선택하세요** | 화면 안내에서 쓰는 표현입니다. 대상은 **플레이어**로 부릅니다. 내레이션(TTS)에서는 공식 앱처럼 **다른 사람**이라고 씁니다. |
| 내쫓는다 | **강퇴** | 한국 온라인 게임의 표준 표현입니다. "내보내기"는 파일 내보내기와 헷갈립니다. |
| 이름(입력칸) | **닉네임** | 입력칸과 오류 문구에만 씁니다. 결과 표의 "이름" 열은 그대로 둡니다. |
| 탭하다 | **누르다** | holdHint, blurHint, coverHint, tapResume을 같은 동사로 맞춥니다. |
| 너 | **나**(라벨) / **당신**(문장) | |

---

## 3. 전체 문구표

표기: `T.x.y` = public/strings.js, `roles.*` = public/roles.js. "변경 없음"은 현재 문구를 그대로 둔다는 뜻입니다.

### 3.1 T.title

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.title.game | 한밤의 늑대인간 | 한밤의 늑대인간 | 변경 없음 |

### 3.2 T.btn (모든 동작 버튼)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.btn.open / index.html#createBtn .lbl | 마을을 연다 | 방 만들기 | |
| T.btn.join / index.html#joinBtn .lbl | 들어간다 | 참가하기 | |
| T.btn.otherTown / index.html#otherLink | 다른 마을을 연다 | 새 방 만들기 | 초대 링크로 들어왔을 때 보입니다 |
| T.btn.law / index.html#lawLink / 메뉴 항목 | 법도 | 규칙 보기 | 메뉴 항목은 TH.law 대신 TBT.law를 써야 합니다(app.js:703, 4절) |
| T.btn.or / index.html .home-or span | 혹은 | 또는 | 구분선 |
| T.btn.copyCode | 표식 베끼기 | 링크 복사하기 | 실제로 초대 주소를 복사합니다. 결과는 토스트가 알려 줍니다 |
| T.btn.kick | 내쫓는다 | 강퇴하기 | 길게 눌러 확정합니다 |
| T.btn.start | 밤을 부른다 | 게임 시작하기 | |
| T.btn.seen | 봤다 | 확인하기 | 밤 정보를 본 뒤 누르는 버튼입니다. 다음 줄에 doneClose("눈을 감으세요")가 이어집니다 |
| T.btn.noLook | 보지 않는다 | 보지 않기 | |
| T.btn.stealFace | 얼굴을 훔친다 | 역할 복사하기 | 도플갱어 버튼입니다. 옆 `.nm`에 이름이 붙습니다. "링크 복사하기"와 구분됩니다 |
| T.btn.look | 본다 | 카드 보기 | 예언자가 플레이어를 고른 경우 |
| T.btn.lookAltar | 제단을 본다 | 가운데 카드 보기 | nm에 "1/2"가 붙습니다 |
| T.btn.steal | 훔친다 | 카드 훔치기 | |
| T.btn.noSteal | 훔치지 않는다 | 훔치지 않기 | |
| T.btn.swap | 바꾼다 | 카드 바꾸기 | 말썽쟁이와 주정뱅이가 함께 씁니다 |
| T.btn.noSwap | 손대지 않는다 | 바꾸지 않기 | |
| T.btn.execute | 처형 | 투표하기 | nm에 대상 이름이 붙습니다. "민수에게 투표하기" 어순은 4절의 선택 사항입니다 |
| T.btn.ready | 심판하자 | 투표 준비하기 | 낮의 조기 투표 토글. 띠 문구 "투표 준비 r/n"과 목적어를 맞춥니다 |
| T.btn.unready | 손을 내린다 | 준비 취소하기 | |
| T.btn.judgeNow | 지금 심판한다 | 바로 투표 시작하기 | 방장이 단계를 넘기는 메뉴입니다. execute(투표하기)와 구분됩니다 |
| T.btn.again | 다시, 밤으로 | 다시 하기 | |
| T.btn.skip | 건너뛴다 | 건너뛰기 | |
| T.btn.pause | 멈춘다 | 멈추기 | |
| T.btn.resume | 잇는다 | 계속하기 | |
| T.btn.restart | 처음부터 | 처음부터 보기 | |
| T.btn.leave | 떠난다 | 방 나가기 | 게임 메뉴에서 씁니다. leaveTown과 같은 문구 |
| T.btn.leaveTown | 마을을 떠난다 | 방 나가기 | |
| T.btn.voiceOn | 목소리를 켠다 | 음성 켜기 | |
| T.btn.voiceOff | 목소리를 끈다 | 음성 끄기 | |
| T.btn.asleep | 잠들어 있다 | 대기 중 | 비활성 상태 표시라서 "-기"를 쓰지 않습니다 |
| T.btn.close | 닫는다 | 닫기 | |
| T.btn.replay | 그 밤을 다시 본다 | 리플레이 보기 | 결과 화면에서 "다시 하기" 옆에 놓이므로 "다시 보기"는 쓰지 않습니다 |
| T.btn.fast | ×2 | ×2 | 변경 없음 |
| T.btn.normal | ×1 | ×1 | 변경 없음 |
| **T.btn.deck (신규)** | — (메뉴가 TH.deck "이번 밤의 패"를 씀) | 카드 구성 보기 | 새 키입니다. 4절 참고 |

### 3.3 T.head (제목·머리글)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.head.law | 법도 | 게임 규칙 | 규칙 모달 제목 |
| T.head.lawOrder | 깨어나는 순서 | 깨어나는 순서 | 변경 없음. 정식 규칙서 표현입니다 |
| T.head.whisper | 속삭임 | 채팅 | |
| T.head.sign | 표식 | 방 코드 | 방 코드 aria 접두어. 폰트 프리로드 문자열(app.js:72)도 이 값입니다 |
| T.head.deck | 이번 밤의 패 | 카드 구성 | 시트 탭, .fan aria |
| T.head.arrange | 촌장의 배치 | 자동 구성하기 | `<button class="deck-arrange">`(app.js:667)라서 "-기"로 끝냅니다. arrangeNote와 짝을 이룹니다 |
| T.head.dayLen | 낮의 길이 | 토론 시간 | |
| T.head.altar | 제단 | 가운데 카드 | |
| T.head.seen | 네가 본 것 | 밤에 확인한 정보 | |
| T.head.records | 모든 기록 | 전체 기록 | |
| T.head.happened | 그 밤에 일어난 일 | 밤에 일어난 일 | |
| T.head.believed | 믿은 패 | 알고 있던 카드 | |
| T.head.ending | 결말 | 결과 | |
| T.head.judge | 지목하라. | 투표 시간입니다. | 투표 배너 제목. 아래 줄 pickExec와 겹치지 않게 했습니다 |
| T.head.name | 이름 | 이름 | 변경 없음 |

### 3.4 T.phase (단계)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.phase.lobby | 모닥불 | 대기실 | app.js:17 폴백도 같이 바꿉니다 |
| T.phase.check | 패 | 카드 확인 | |
| T.phase.night | 밤 | 밤 | 변경 없음 |
| T.phase.dawn | 새벽 | 새벽 | 변경 없음 |
| T.phase.day | 낮 | 낮 | 변경 없음 |
| T.phase.vote | 심판 | 투표 | |
| T.phase.result | 결말 | 결과 | |
| T.phase.prologue | 서막 | 시작 | |
| T.phase.verdict | 판결 | 결과 | |
| T.phase.awake | 눈을 떠라 | 눈을 뜨세요. | 쓰는 곳이 없습니다(4절) |
| T.phase.nightFalls | 밤이 왔다. | 밤이 되었습니다. | 쓰는 곳이 없습니다 |
| T.phase.dayBreaks | 날이 밝았다. | 아침이 되었습니다. | 낮 배너 제목 |
| T.phase.closeEyes | 눈을 감아라. | 눈을 감으세요. | 쓰는 곳이 없습니다 |

### 3.5 T.verdict (판정 배너)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.verdict.wolf | 늑대가 마을을 삼켰다. | 늑대인간 팀 승리 | 이유는 verdict-why 줄이 설명합니다 |
| T.verdict.minion | 하수인이 웃었다. | 늑대인간 팀 승리 | |
| T.verdict.village | 늑대가 목매달렸다. | 마을 팀 승리 | |
| T.verdict.villageNoWolf | 늑대는 없었다. | 마을 팀 승리 | |
| T.verdict.tanner | 무두장이는 바라던 대로 죽었다. | 무두장이 승리 | |
| T.verdict.none | 승자는 없다. | 승자 없음 | |

### 3.6 T.stamp (도장)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.stamp.win | 이겼다 | 승리 | |
| T.stamp.lose | 졌다 | 패배 | |
| T.stamp.you | 너였다 | 나 | 짧은 라벨이라 "당신"이 아니라 "나"로 씁니다 |
| T.stamp.yours | 네 패였다 | 내 카드 | |
| T.stamp.changed | 바뀌었다 | 바뀜 | |

### 3.7 T.body — 공용·홈

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.minutes | 분 | 분 | 변경 없음 |
| T.body.dec | 빼기 | 한 장 빼기 | 카드 수 버튼 aria. "늑대인간 한 장 빼기"로 읽힙니다(app.js:675) |
| T.body.inc | 더하기 | 한 장 더하기 | app.js:676 |
| T.body.markPack | 무리 | 동료 | 늑대인간에게 보이는 좌석 표시 |
| T.body.markOwner | 주인 | 늑대인간 | 하수인에게 보이는 좌석 표시 |
| T.body.markBro | 형제 | 동료 | 프리메이슨에게 보이는 좌석 표시 |
| T.body.namePh / index.html#nameInput placeholder·aria-label | 이름 | 닉네임 | |
| T.body.codePh / index.html#codeInput placeholder·aria-label | 표식 | 방 코드 | |
| T.body.joinCode | ${code} 마을로 들어간다 | ${code} 방 참가하기 | 초대 링크로 들어왔을 때 #createBtn 라벨 |
| T.body.needName | 이름을 대라. | 닉네임을 입력해 주세요. | |
| T.body.needCode | 표식은 네 글자다. | 방 코드 4자리를 입력해 주세요. | |
| T.body.coldWake | 마을을 깨운다 · ${s} | 서버 연결 중… ${s}초 | |
| T.body.coldNote / index.html#homeBootSub | 깊이 잠든 마을이다. 1분은 걸린다. | 서버를 준비하고 있습니다. 최대 1분 정도 걸릴 수 있습니다. | |

### 3.8 T.body — 대기실

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.signLabel | 표식 | 방 코드 | |
| T.body.signTop | 표식 ${code} | 방 코드 ${code} | |
| T.body.copied | 표식을 베꼈다. 부를 자에게 넘겨라. | 초대 링크를 복사했습니다. | 토스트 |
| T.body.copyTitle | 표식 | 초대 링크 | 클립보드 실패 시 모달 제목 |
| T.body.copyHint | 이 주소를 넘겨라. | 이 링크를 공유하면 바로 참가할 수 있습니다. | |
| T.body.fire | 불가에 ${n}/10 | 참가자 ${n}/10 | |
| T.body.waitMore | 아직 ${need}명이 오지 않았다. | ${need}명이 더 필요합니다. | |
| T.body.chief | 촌장 | 방장 | |
| T.body.me | 너 | 나 | |
| T.body.away | 자리를 비움 | 연결 끊김 | 연결이 끊긴 좌석(is-off, app.js:439)에만 쓰입니다 |
| T.body.kickAsk | ${n:을/를} 내쫓는다 | ${n:을/를} 강퇴할까요? | |
| T.body.kicked | 너는 마을에서 쫓겨났다. | 방에서 강퇴되었습니다. | |
| T.body.deckNote | 패는 인원보다 셋 많다. 남은 셋은 제단에 엎는다. | 카드는 인원수보다 3장 많아야 합니다. 남는 3장은 가운데 카드가 됩니다. | |
| T.body.deckCount | 이번 밤 ${total} / ${need} | 선택한 카드 ${total} / ${need} | |
| T.body.arrangeNote | 인원에 맞춰 배치된다. | 인원수에 맞춰 자동으로 구성됩니다. | |
| T.body.masonWarn | 프리메이슨은 둘이어야 서로를 안다. | 프리메이슨은 2장을 함께 넣어야 서로를 확인할 수 있습니다. | |
| T.body.noWolfWarn | 늑대 없는 밤이다. | 늑대인간 카드가 없습니다. | |
| T.body.lack | ${need}명 부족 | ${need}명 더 필요 | 비활성 버튼(상태 표시) |
| T.body.deckLack | 패 ${total}/${need} | 카드 ${total}/${need} | 비활성 버튼. 분수 뒤에는 "장"을 붙이지 않습니다 |
| T.body.waitChief | 촌장을 기다린다 | 방장 대기 중 | 비활성 버튼 |

### 3.9 T.body — 카드 확인

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.yourCard | 네 패다. | 당신의 역할은 아직 가려져 있습니다. | check-t1, dock aria. 역할 이름은 누르고 있을 때만 보이므로 문장에 넣지 않습니다. 오너 예시 문장은 4절 선택 키로 처리합니다 |
| T.body.holdHint | 누르고 있어라. | 카드를 길게 누르면 역할이 보입니다. | 오너 예시 그대로입니다 |
| T.body.keepAwake | 화면을 끄지 마라. | 화면이 꺼지지 않도록 해 주세요. | |
| T.body.peekFirst | 처음 받은 패 | 처음 받은 카드 | |
| T.body.peekLast | 마지막으로 본 패 | 마지막으로 확인한 카드 | |
| T.body.dockHint | 눌러 본다 | 길게 눌러 보기 | 하단 카드 위 안내 |

### 3.10 T.body — 밤

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.nightFalls | 밤이 왔다. 눈을 감아라. | 밤이 되었습니다. 모두 눈을 감으세요. | 쓰는 곳이 없습니다 |
| T.body.closeEyes | 눈을 감아라. | 눈을 감고 차례를 기다려 주세요. | 잠든 플레이어 화면, 내레이션 아래(app.js:523) |
| T.body.wake | ${role}. | ${role}의 차례입니다. | 쓰는 곳이 없습니다 |
| T.body.doneClose | 끝났다. 눈을 감아라. | 행동을 마쳤습니다. 눈을 감으세요. | |
| T.body.lone | 늑대인간. | 늑대인간은 당신 혼자입니다. | `lone + ' ' + loneSub`로 이어 붙습니다(app.js:329) |
| T.body.loneSub | 너 혼자다. 제단의 패 하나를 봐라. | 가운데 카드 한 장을 볼 수 있습니다. | |
| T.body.doppel | 도플갱어. | 도플갱어의 차례입니다. | |
| T.body.doppelSub | 하나를 골라라. 너는 그가 된다. | 다른 플레이어 한 명을 선택하세요. 그 사람의 카드를 보고 같은 역할이 됩니다. | |
| T.body.asDoppel | 도플갱어로서 | 도플갱어: | 뒤에 ' '와 이어져 "도플갱어: 예언자의 차례입니다."가 됩니다(app.js:318) |
| T.body.seer | 예언자. | 예언자의 차례입니다. | |
| T.body.seerSub | 한 명의 패, 혹은 제단의 두 장. | 다른 플레이어의 카드 한 장 또는 가운데 카드 두 장을 선택하세요. | |
| T.body.robber | 강도. | 강도의 차례입니다. | |
| T.body.robberSub | 훔칠 자를 골라라. 훔친 패는 네 것이다. | 카드를 훔칠 플레이어를 선택하세요. 훔친 카드는 바로 확인합니다. | |
| T.body.troublemaker | 말썽쟁이. | 말썽쟁이의 차례입니다. | |
| T.body.troublemakerSub | 둘을 골라라. 둘의 패를 맞바꾼다. 너는 보지 못한다. | 카드를 서로 바꿀 플레이어 두 명을 선택하세요. 바꾼 카드는 볼 수 없습니다. | |
| T.body.drunk | 주정뱅이. | 주정뱅이의 차례입니다. | |
| T.body.drunkSub | 제단의 패 하나를 골라라. 너는 보지 못한다. | 가운데 카드 한 장을 선택하세요. 당신의 카드와 바뀌며 새 카드는 볼 수 없습니다. | |
| T.body.insomniac | 불면증환자. | 불면증환자의 차례입니다. | |
| T.body.insomniacSub | 네 패를 다시 봐라. | 자신의 카드를 다시 확인하세요. | |
| T.body.pickStealBtn | 얼굴을 훔친다 ${n} | 역할 복사하기 ${n} | 쓰는 곳이 없습니다 |
| T.body.lookCount | ${n}/2 | ${n}/2 | 변경 없음 |
| T.body.seenNothing | 너는 아무것도 보지 못했다. | 밤에 확인한 정보가 없습니다. | |
| T.body.sleeping | 잠들어 있다 | 대기 중 | 쓰는 곳이 없습니다 |
| T.body.blurHint | 눌러야 보인다. | 눌러서 확인하세요. | |
| T.body.coverHint | 탭하면 덮는다. | 누르면 카드를 덮습니다. | |
| T.body.awakeTab | ● 눈을 떠라 | ● 당신의 차례 | 브라우저 탭 제목이라 잘리지 않게 짧게 씁니다 |
| T.body.ackFail | 전해지지 않았다. 다시. | 전송하지 못했습니다. 다시 시도해 주세요. | |
| T.body.autoPicked | — 밤이 대신 골랐다 | (시간 초과로 자동 선택) | |

### 3.11 T.body — 낮·투표

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.dawn | 날이 밝았다. | 아침이 되었습니다. | |
| T.body.dayAsk | 너는 아직 너인가. | 토론을 시작하세요. 밤사이 카드가 바뀌었을 수 있습니다. | 낮 배너 부제 |
| T.body.firstCard | 처음 받은 패 | 처음 받은 카드 | |
| T.body.deckAll | 이번 밤의 패 — 셋은 제단에 | 카드 구성 (가운데 카드 3장 포함) | |
| T.body.raised | 손 든 자 ${r}/${n} | 투표 준비 ${r}/${n} | |
| T.body.raisedBadge | 손 든 자 | 준비 완료 | 좌석 배지 |
| T.body.pickExec | 처형할 자를 골라라. 끝나기 전엔 바꿀 수 있다. | 처형할 사람에게 투표하세요. 투표가 끝나기 전까지 바꿀 수 있습니다. | |
| T.body.myVote | 지목: ${n} | 내 투표: ${n} | |
| T.body.noVote | 아직 지목하지 않았다. | 아직 투표하지 않았습니다. | |
| T.body.voteCount | 지목 ${n}/${t} | 투표 ${n}/${t} | |
| T.body.voteRule | 모두 한 표씩이면 아무도 죽지 않는다. 동표면 모두 죽는다. | 2표 이상 받은 사람이 없으면 아무도 처형되지 않습니다. 최다 득표자가 여럿이면 모두 처형됩니다. | |
| T.body.execLine | ${names} 처형. | ${names:이/가} 처형되었습니다. | names는 {t,h} 객체입니다(app.js:12) |
| T.body.noBlood | 피는 흐르지 않았다. | 아무도 처형되지 않았습니다. | |
| T.body.hunterLine | 사냥꾼 ${a}의 마지막 화살이 ${b:을/를} 꿰뚫었다. | 사냥꾼 ${a}의 투표로 ${b}도 함께 죽었습니다. | 조사 쌍이 없어 라틴 이름도 깨지지 않습니다. 사냥꾼 효과는 처형이 아니므로 "죽다"로 씁니다 |
| T.body.doppelArrow | 도플갱어 → ${r} | 도플갱어 → ${r} | 변경 없음 |

### 3.12 T.body — 결과 화면

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.cols.name | 이름 | 이름 | 변경 없음 |
| T.body.cols.first | 처음 | 처음 카드 | |
| T.body.cols.last | 마지막 | 최종 카드 | |
| T.body.cols.vote | 지목 | 투표 | |
| T.body.cols.votes | 표 | 득표 | |
| T.body.cols.end | 결말 | 결과 | |
| T.body.altarWord | 제단 | 가운데 카드 | 쓰는 곳이 없습니다(결과 보드는 T.altar[i]를 씁니다, app.js:818) |
| T.body.altarFirst | 처음 ${r} | 처음: ${r} | 쓰는 곳이 없습니다 |
| T.body.noNight | 그 밤, 아무도 움직이지 않았다. | 이번 밤에는 아무도 행동하지 않았습니다. | |
| T.body.journeyStay | 밤새 그대로였다. | 밤새 바뀌지 않았습니다. | |
| T.body.waitChiefNext | 촌장을 기다린다 | 방장 대기 중 | 비활성 버튼 |

### 3.13 T.body — 시스템·토스트·문서·aria

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.body.error | 무언가 어긋났다. | 오류가 발생했습니다. 다시 시도해 주세요. | |
| T.body.reconnecting | 횃불이 꺼졌다. 다시 지핀다 · ${n} | 다시 연결하는 중… ${n}초 | 375px 연결 막대 폭에 맞춥니다 |
| T.body.reconnected | 돌아왔다. | 다시 연결되었습니다. | |
| T.body.voiceOnToast | 촌장의 목소리가 밤을 읽는다. | 음성 안내를 켰습니다. | |
| T.body.voiceOffToast | 촌장이 입을 다문다. | 음성 안내를 껐습니다. | |
| T.body.nightNoChat | 밤에는 입을 다물어라. | 밤에는 채팅할 수 없습니다. | |
| T.body.newVersion | 새 법도가 내려왔다. | 새 버전으로 업데이트합니다. | |
| T.body.docTitle / index.html `<title>` / h1.home-title | 한밤의 늑대인간 | 한밤의 늑대인간 | 변경 없음 |
| T.body.docDesc / index.html meta description | 하룻밤. 한 번의 심판. 늑대를 찾아 처형하라. | 3~10명이 함께하는 온라인 한밤의 늑대인간입니다. 단 한 번의 투표로 늑대인간을 찾아내세요. | |
| T.body.ariaSend | 보낸다 | 보내기 | |
| T.body.ariaClose | 닫는다 | 닫기 | |
| T.body.ariaMenu | 메뉴 | 메뉴 | 변경 없음 |
| T.body.ariaPrev | 앞 박자 | 이전 장면 보기 | 아이콘 버튼 aria도 "-기"로 씁니다 |
| T.body.ariaNext | 다음 박자 | 다음 장면 보기 | |
| T.body.ariaFast | 빠르게 본다 | 2배속으로 보기 | |
| T.body.ariaNormal | 제 속도로 본다 | 1배속으로 보기 | |
| T.body.ariaRuler | 그 밤의 박자 | 재생 위치 | 슬라이더 |

### 3.14 T.body.law / lawEnd (규칙 모달)

| 위치 | 현재 | 새 문구 |
|---|---|---|
| T.body.law[0].h | 패 | 카드 |
| T.body.law[0].t | 모두 한 장. 남은 셋은 제단에 엎는다. | 모든 플레이어가 카드를 한 장씩 받습니다. 남은 3장은 가운데에 뒷면으로 놓습니다. |
| T.body.law[1].h | 밤 | 밤 |
| T.body.law[1].t | 정해진 순서대로 깨어난다. 패는 바뀐다. 네가 누구인지 장담하지 마라. | 역할마다 정해진 순서대로 눈을 뜨고 능력을 사용합니다. 밤사이 카드가 바뀔 수 있으므로 처음 받은 카드가 지금의 역할이라는 보장은 없습니다. |
| T.body.law[2].h | 낮 | 낮 |
| T.body.law[2].t | 말하라. 거짓말도 무기다. | 정해진 시간 동안 자유롭게 토론합니다. 자신의 역할을 거짓으로 말해도 됩니다. |
| T.body.law[3].h | 심판 | 투표 |
| T.body.law[3].t | 동시에 하나를 지목한다. 가장 많이 지목된 자가 처형된다. 모두 한 표씩이면 아무도 죽지 않고, 동표면 모두 죽는다. | 모두 동시에 한 명에게 투표합니다. 가장 많은 표를 받은 사람이 처형됩니다. 2표 이상 받은 사람이 없으면 아무도 처형되지 않으며, 최다 득표자가 여럿이면 모두 처형됩니다. |
| T.body.law[4].h | 결말 | 승패 |
| T.body.law[4].t | 마지막에 쥔 패가 네 편을 정한다. | 게임이 끝났을 때 마지막에 가진 카드로 소속 팀이 정해집니다. |
| T.body.lawEnd[0].h | 마을 | 마을 팀 |
| T.body.lawEnd[0].t | 늑대를 하나라도 처형하면 이긴다. 늑대가 없다면 아무도 죽지 않아야 이긴다. | 늑대인간을 한 명 이상 처형하면 승리합니다. 플레이어 중 늑대인간이 없다면 아무도 처형되지 않아야 승리합니다. |
| T.body.lawEnd[1].h | 늑대 | 늑대인간 팀 |
| T.body.lawEnd[1].t | 늑대가 아무도 처형되지 않으면 이긴다. | 늑대인간이 한 명도 처형되지 않으면 승리합니다. 하수인만 처형되어도 승리합니다. |
| T.body.lawEnd[2].h | 무두장이 | 무두장이 |
| T.body.lawEnd[2].t | 처형되면 홀로 이긴다. | 자신이 처형되면 승리합니다. 이 경우 늑대인간 팀은 승리할 수 없습니다. |

### 3.15 T.narr (TTS 내레이션)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.narr.close | 눈을 감아라. | 눈을 감으세요. | 각 역할 차례 끝에 그 역할에게 하는 말이라 "모두"를 붙이지 않습니다 |
| T.narr.night | 밤이 왔다. 눈을 감아라. | 밤이 되었습니다. 모두 눈을 감으세요. | |
| T.narr.dawn | 날이 밝았다. | 아침이 되었습니다. 모두 눈을 뜨세요. | |

### 3.16 T.chat

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.chat.log / index.html .sheet-tab 2번째 / app.js:17 X.log 폴백 | 기록 | 기록 | 변경 없음 |
| T.chat.title / index.html .sheet-tab 1번째 | 속삭임 | 채팅 | |
| T.chat.placeholder | 말하라 | 메시지를 입력하세요 | |
| T.chat.send | 보낸다 | 보내기 | |
| T.chat.locked | 밤에는 입을 다물어라. | 밤에는 채팅할 수 없습니다. | |

### 3.17 T.msg (서버 메시지)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.msg.newChief | ${n:이/가} 촌장이 되었다. | ${n:이/가} 방장이 되었습니다. | |
| T.msg.left | ${n:이/가} 마을을 떠났다. | ${n:이/가} 방을 나갔습니다. | |
| T.msg.needPlayers | 셋에서 열이 모여야 밤이 온다. | 3~10명이 모여야 시작할 수 있습니다. | |
| T.msg.needCards | 패는 ${n}장이어야 한다. | 카드를 ${n}장 선택해야 합니다. | |
| T.msg.nightStart | 밤이 왔다. 입을 다물어라. | 밤이 되었습니다. 지금부터 채팅할 수 없습니다. | |
| T.msg.pack | 무리: ${names} | 다른 늑대인간: ${names} | |
| T.msg.packAlone | 무리는 없다. 너 혼자다. | 늑대인간은 당신 혼자입니다. | |
| T.msg.owners | 네 주인: ${names} | 늑대인간: ${names} | |
| T.msg.noWolfInPlay | 늑대는 모두 제단에 잠들어 있다. | 플레이어 중에 늑대인간이 없습니다. | |
| T.msg.brothers | 형제: ${names} | 다른 프리메이슨: ${names} | |
| T.msg.noBrothers | 형제는 이 마을에 없다. | 다른 프리메이슨이 없습니다. | |
| T.msg.nowCard | 네 패는 지금 ${r:이다/다}. | 당신의 현재 카드는 ${r}입니다. | 조사 쌍이 빠집니다 |
| T.msg.notNow | 지금은 아니다. | 지금은 행동할 수 없습니다. | |
| T.msg.autoPicked | — 밤이 대신 골랐다 | (시간 초과로 자동 선택) | |
| T.msg.pickAltar | 제단의 패를 골라라. | 가운데 카드를 한 장 선택하세요. | |
| T.msg.altarSeen | ${pos}: ${r} | ${pos}: ${r} | 변경 없음. "가운데 카드 1: 늑대인간"으로 나옵니다 |
| T.msg.pickOther | 다른 이를 골라라. | 다른 플레이어를 선택하세요. | |
| T.msg.copied | ${t}의 패는 ${r}. 너는 이제 ${r:이다/다}. | ${t}의 카드는 ${r}입니다. 이제 당신은 ${r}입니다. | |
| T.msg.rewake | ${r}의 차례에 다시 깨어난다. | ${r} 차례에 다시 눈을 뜹니다. | |
| T.msg.seerSaw | ${t}의 패: ${r} | ${t}의 카드는 ${r}입니다. | |
| T.msg.pickTwoAltar | 제단의 두 장을 골라라. | 가운데 카드 두 장을 선택하세요. | |
| T.msg.altarTwo | ${pos} ${r} | ${pos}: ${r} | server.js가 ', '로 이어 붙입니다 |
| T.msg.altarTwoHead | 제단: ${list} | ${list} | 항목마다 이미 "가운데 카드 n"이 들어 있어 머리말을 뺍니다 |
| T.msg.noTouch | 손대지 않았다. | 아무 행동도 하지 않았습니다. | |
| T.msg.stole | ${t}의 패를 훔쳤다. 이제 너는 ${r:이다/다}. | ${t}의 카드를 훔쳤습니다. 당신의 새 카드는 ${r}입니다. | |
| T.msg.pickTwoOthers | 너를 뺀 둘을 골라라. | 자신을 제외한 플레이어 두 명을 선택하세요. | |
| T.msg.swapped | ${a:과/와} ${b}의 패를 뒤바꿨다. | ${a:과/와} ${b}의 카드를 서로 바꿨습니다. | |
| T.msg.drunkSwapped | ${pos}의 패와 맞바꿨다. 무엇인지는 모른다. | ${pos:과/와} 당신의 카드를 바꿨습니다. 새 카드는 확인할 수 없습니다. | 플레이스홀더에 조사 쌍이 추가됩니다(1과, 2와, 3과) |
| T.msg.timedOut | 밤이 지났다. 너는 아무것도 하지 않았다. | 시간이 초과되어 아무 행동도 하지 않았습니다. | |
| T.msg.dawn | 날이 밝았다. 누군가는 거짓말을 하고 있다. | 아침이 되었습니다. 토론을 시작하세요. | |
| T.msg.voteStart | 심판의 시간이다. | 투표 시간입니다. | |
| T.msg.endLine | 결말: ${verdict} | 결과: ${verdict} | |
| T.msg.needName | 이름을 대라. | 닉네임을 입력해 주세요. | |
| T.msg.badRequest | 지금은 아니다. | 잘못된 요청입니다. | |
| T.msg.slowDown | | 잠시 후 다시 시도해 주세요. | 채팅 외 이벤트가 요청 한도를 넘었을 때 |
| T.msg.chatFast | | 메시지를 너무 빨리 보내고 있습니다. 잠시 뒤 다시 보내 주세요. | 채팅 전송 응답 |
| T.msg.chatNight | | 밤에는 채팅할 수 없습니다. | 채팅 전송 응답 |
| T.msg.townOpened | ${name:이/가} 마을을 열었다. | ${name:이/가} 방을 만들었습니다. | |
| T.msg.noTown | 그런 마을은 없다. | 존재하지 않는 방입니다. 방 코드를 확인해 주세요. | |
| T.msg.cannotReturn | 그 마을로는 돌아갈 수 없다. | 이 방에는 다시 참가할 수 없습니다. | |
| T.msg.alreadyStarted | 이미 밤이 시작됐다. 다음 밤을 기다려라. | 이미 게임이 진행 중입니다. 게임이 끝난 뒤 다시 시도해 주세요. | |
| T.msg.townFull | 자리가 없다. 열 명이 이미 앉았다. | 방이 가득 찼습니다(최대 10명). | |
| T.msg.sat | ${n:이/가} 불가에 앉았다. | ${n:이/가} 입장했습니다. | |
| T.msg.cannotStart | 아직 밤을 부를 수 없다. | 아직 게임을 시작할 수 없습니다. | |
| T.msg.noGame | 진행 중인 밤이 없다. | 진행 중인 게임이 없습니다. | |
| T.msg.notVoteTime | 지금은 심판의 시간이 아니다. | 지금은 투표 시간이 아닙니다. | |
| T.msg.noSelfVote | 너는 너를 지목할 수 없다. | 자신에게는 투표할 수 없습니다. | |

### 3.18 T.altar

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.altar[0] | 왼쪽 제단 | 가운데 1번 카드 | 주정뱅이 버튼 nm, 밤 메시지 ${pos}, 리플레이 ${P}/${Q}, 결과 보드에 쓰입니다 |
| T.altar[1] | 가운데 제단 | 가운데 2번 카드 | |
| T.altar[2] | 오른쪽 제단 | 가운데 3번 카드 | |

### 3.19 T.replay — 공용·자막

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.replay.hunt_rule_join / sep / dot | ' ' / ', ' / ' · ' | 변경 없음 | |
| T.replay.you | 너 | 나 | |
| T.replay.doppel | 도플갱어 | 도플갱어 | 변경 없음 |
| T.replay.doppelOf | 도플갱어 ${a} | 도플갱어 ${a} | 변경 없음 |
| T.replay.copyOf | 도플갱어 → ${r} | 도플갱어 → ${r} | 변경 없음 |
| T.replay.pro.top | 그 밤, 패는 이렇게 놓였다. | 게임 시작 시 카드 배치입니다. | |
| T.replay.pro.bot | 너는 ${r:으로/로} 시작했다. 제단: ${list}. | 당신의 시작 카드는 ${r}입니다. 가운데 카드: ${list} | list는 역할 칩만 담습니다(replay.js:26) |
| T.replay.quiet.top | 그 밤, 아무도 움직이지 않았다. | 이번 밤에는 아무도 행동하지 않았습니다. | |
| T.replay.quiet.bot | 깨어날 패는 모두 처음부터 제단에 있었다. | 밤에 깨어나는 카드가 모두 가운데에 있었습니다. | |
| T.replay.idle.one.top | ${r:은/는} 깨지 않았다. | ${r:은/는} 깨어나지 않았습니다. | |
| T.replay.idle.one.bot | 그 패는 처음부터 제단에 있었다. | 이 카드는 처음부터 가운데에 있었습니다. | |
| T.replay.idle.many.top | ${list:은/는} 깨지 않았다. | ${list:은/는} 깨어나지 않았습니다. | |
| T.replay.idle.many.bot | 그 패들은 처음부터 제단에 있었다. | 이 카드들은 처음부터 가운데에 있었습니다. | |
| T.replay.idle.moved.bot | 처음 그 패를 받은 자가 없었다. | 처음에 이 카드를 받은 사람이 없었습니다. | |
| T.replay.copy.top | 도플갱어 ${a}, ${t}의 얼굴을 훔쳤다. | 도플갱어 ${a:이/가} ${t}의 카드를 확인했습니다. | |
| T.replay.copy.bot | 이제 ${r:이다/다}. | ${r:이/가} 되었습니다. | |
| T.replay.copyWake.top | 도플갱어 ${a}, ${t}의 얼굴을 훔쳤다. | 도플갱어 ${a:이/가} ${t}의 카드를 확인했습니다. | |
| T.replay.copyWake.bot | 이제 ${r:이다/다}. ${r}의 차례에 다시 깬다. | ${r:이/가} 되었습니다. ${r} 차례에 다시 깨어납니다. | |
| T.replay.copySleep.top | 도플갱어 ${a}, ${t}의 얼굴을 훔쳤다. | 도플갱어 ${a:이/가} ${t}의 카드를 확인했습니다. | |
| T.replay.copySleep.bot | 이제 ${r:이다/다}. 다시 깨지 않는다. | ${r:이/가} 되었습니다. 밤에 다시 깨어나지 않습니다. | |
| T.replay.know.werewolf.top | 늑대들이 눈을 떴다. 서로를 알아봤다. | 늑대인간이 눈을 뜨고 서로를 확인했습니다. | |
| T.replay.know.werewolf.bot | 무리: ${list} | 늑대인간: ${list} | |
| T.replay.know.minion.top | 하수인 ${a}, 주인을 우러렀다. | 하수인 ${a:이/가} 늑대인간을 확인했습니다. | |
| T.replay.know.minion.bot | 주인: ${list}. 주인은 그를 모른다. | 늑대인간: ${list}. 늑대인간은 하수인을 모릅니다. | |
| T.replay.know.minion0.top | 하수인 ${a}, 주인을 찾았다. | 하수인 ${a:이/가} 눈을 떴습니다. | |
| T.replay.know.minion0.bot | 늑대 패를 처음 받은 자는 없었다. | 처음에 늑대인간 카드를 받은 사람이 없었습니다. | |
| T.replay.know.minion0.botNoDeck | 이 밤의 패에는 늑대가 없었다. | 이번 게임에는 늑대인간 카드가 없었습니다. | |
| T.replay.know.mason.top | 프리메이슨들이 서로의 손을 쥐었다. | 프리메이슨이 서로를 확인했습니다. | |
| T.replay.know.mason.bot | 형제: ${list} | 프리메이슨: ${list} | |
| T.replay.know.mason1.top | 프리메이슨 ${a}, 홀로 깼다. | 프리메이슨 ${a:은/는} 혼자 깨어났습니다. | |
| T.replay.know.mason1.bot | 형제는 없었다. | 다른 프리메이슨은 없었습니다. | |
| T.replay.peek.werewolf.top | 늑대 ${a}, 홀로 깼다. ${P}의 패를 들췄다. | 늑대인간 ${a:은/는} 혼자 깨어나 ${P:을/를} 확인했습니다. | ${P}는 T.altar 값입니다 |
| T.replay.peek.werewolf.bot | ${r}. | ${r}입니다. | |
| T.replay.peek.werewolfD.top | 도플갱어 ${a}, 늑대가 되어 홀로 깼다. ${P}의 패를 들췄다. | 도플갱어 늑대인간 ${a:은/는} 혼자 깨어나 ${P:을/를} 확인했습니다. | |
| T.replay.peek.werewolfD.bot | ${r}. | ${r}입니다. | |
| T.replay.peek.seer.top | ${role} ${a}, ${t}의 패를 들췄다. | ${role} ${a:이/가} ${t}의 카드를 확인했습니다. | |
| T.replay.peek.seer.bot | ${r} | ${r}입니다. | 윗줄에 이름이 있으므로 반복하지 않습니다 |
| T.replay.peek.seer2.top | ${role} ${a}, 제단의 두 장을 들췄다. | ${role} ${a:이/가} 가운데 카드 두 장을 확인했습니다. | |
| T.replay.peek.seer2.bot | ${P} ${r} · ${Q} ${r2} | ${P}: ${r} · ${Q}: ${r2} | |
| T.replay.peek.insomniac.top | ${role} ${a}, 새벽에 제 패를 다시 봤다. | ${role} ${a:이/가} 자신의 카드를 다시 확인했습니다. | |
| T.replay.peek.insomniac.same | ${r}. 그대로였다. | 카드는 그대로 ${r}입니다. | |
| T.replay.peek.insomniac.changed | 패가 바뀌어 있었다. ${r}. | 카드가 ${r:으로/로} 바뀌어 있었습니다. | |
| T.replay.peek.insomniacMany.top | 불면증환자 ${a:과/와} 도플갱어 ${b}, 새벽에 제 패를 다시 봤다. | 불면증환자 ${a:과/와} 도플갱어 ${b:이/가} 자신의 카드를 다시 확인했습니다. | |
| T.replay.peek.insomniacMany.bot | ${a} ${r} · ${b} ${r2} | ${a}: ${r} · ${b}: ${r2} | |
| T.replay.skip.werewolf.top | 늑대 ${a}, 홀로 깼다. 제단에 손대지 않았다. | 늑대인간 ${a:은/는} 혼자 깨어났지만 가운데 카드를 보지 않았습니다. | |
| T.replay.skip.werewolf.topD | 도플갱어 ${a}, 늑대가 되어 홀로 깼다. 제단에 손대지 않았다. | 도플갱어 늑대인간 ${a:은/는} 혼자 깨어났지만 가운데 카드를 보지 않았습니다. | |
| T.replay.skip.self.top | ${role} ${a}, 손대지 않았다. | ${role} ${a:은/는} 아무 행동도 하지 않았습니다. | |
| T.replay.skip.seer.top | ${role} ${a}, 눈을 감은 채였다. | ${role} ${a:은/는} 아무 카드도 보지 않았습니다. | |
| T.replay.skip.auto.top | ${role} ${a}, 망설이다 때를 놓쳤다. | ${role} ${a:은/는} 제한 시간 안에 행동하지 않았습니다. | |
| T.replay.other.at | 다른 늑대 패는 ${where}에 있었다. | 다른 늑대인간 카드: ${where} | "가운데 카드 2에 있었습니다"(카드 안의 카드)를 피합니다 |
| T.replay.other.hand | ${t}의 손 | ${t} | |
| T.replay.other.none | 늑대 패는 그 한 장뿐이었다. | 늑대인간 카드는 이 한 장뿐이었습니다. | |
| T.replay.swap.robber.top | ${role} ${a}, ${t}의 패를 훔쳤다. | ${role} ${a:이/가} ${t}의 카드를 훔쳤습니다. | |
| T.replay.swap.robber.bot | 빼앗은 패: ${r}. ${t}에게는 ${r2:이/가} 남았다. | ${a:은/는} ${r:이/가}, ${t:은/는} ${r2:이/가} 되었습니다. | |
| T.replay.swap.troublemaker.top | ${role} ${a}, ${b:과/와} ${c}의 패를 뒤바꿨다. | ${role} ${a:이/가} ${b:과/와} ${c}의 카드를 서로 바꿨습니다. | |
| T.replay.swap.troublemaker.bot | ${b} ${rc} · ${c} ${rb}. 아무도 보지 못했다. | ${b:은/는} ${rc:이/가}, ${c:은/는} ${rb:이/가} 되었습니다. | |
| T.replay.swap.drunk.top | ${role} ${a}, ${P}의 패와 제 패를 맞바꿨다. | ${role} ${a:이/가} 자신의 카드를 ${P:과/와} 바꿨습니다. | |
| T.replay.swap.drunk.bot | 받은 패: ${r}. 그는 끝내 몰랐다. | 받은 카드는 ${r}입니다. ${a:은/는} 확인하지 못했습니다. | |
| T.replay.auto | 밤이 대신 골랐다. | (시간 초과로 자동 선택) | 윗줄 끝에 붙습니다 |
| T.replay.note.wake | 패가 바뀌었어도, 처음 받은 패대로 깨어난다. | ${a:은/는} 카드를 빼앗겼지만 처음 받은 역할(${r})로 깨어났습니다. | 변수 a: 이름, r: 역할 칩 |
| T.replay.dawn.top | 날이 밝았다. 패는 이렇게 남았다. | 아침이 되었습니다. 최종 카드 배치입니다. | |
| T.replay.dawn.bot | 바뀐 패 ${n}장. | 바뀐 카드: ${n}장 | |
| T.replay.dawn.botNone | 바뀐 패는 없다. | 바뀐 카드가 없습니다. | |
| T.replay.dawn.seat.top | ${a}: ${from} → ${to}. | ${a}: ${from} → ${to} | |
| T.replay.dawn.seat.bot | 이제 ${team}. | 이제 ${team}입니다. | "이제 무두장이 팀입니다." |
| T.replay.vote.top | 모두가 동시에 지목했다. | 모두 동시에 투표했습니다. | |
| T.replay.vote.bot | ${list} | ${list} | 변경 없음 |
| T.replay.vote.item | ${t} ${n}표 | ${t} ${n}표 | 변경 없음 |
| T.replay.vote.abstain | 지목 없음 ${n} | 미투표 ${n}명 | |
| T.replay.vote.one | 모두 한 표 이하. 아무도 죽지 않는다. | 2표 이상 받은 사람이 없어 아무도 처형되지 않았습니다. | |
| T.replay.vote.none | ${a}, 지목하지 않았다. | ${a:은/는} 투표하지 않았습니다. | |
| T.replay.exec.top | ${list} 처형. | ${list:이/가} 처형되었습니다. | |
| T.replay.exec.bot | 그의 패는 ${r:이었다/였다}. | 카드: ${r} | 주어가 없는 템플릿이라 라벨형으로 씁니다 |
| T.replay.exec.botMany | ${list} | ${list} | 변경 없음 |
| T.replay.exec.item | ${t} ${r} | ${t}: ${r} | |
| T.replay.nodeath.top | 피는 흐르지 않았다. | 아무도 처형되지 않았습니다. | |
| T.replay.hunt.top | ${h}의 마지막 화살이 ${t:을/를} 꿰뚫었다. | ${h}의 투표로 ${t}도 함께 죽었습니다. | ${h}는 HTML 문자열이라 뒤에 조사 쌍을 붙이지 않습니다(replay.js:115) |
| T.replay.hunt.bot | ${t}의 패는 ${r:이었다/였다}. | ${t}의 카드: ${r} | |
| T.replay.hunt.top0 | ${h}의 화살이 겨눈 ${t:은/는} 이미 쓰러져 있었다. | ${h}의 투표 대상인 ${t:은/는} 이미 처형되었습니다. | |
| T.replay.hunt.topNone | ${h}, 아무도 겨누지 않았다. | ${h}의 투표 대상이 없었습니다. | |
| T.replay.hunt.rule | 사냥꾼은 죽으며 제가 지목한 자를 데려간다. | 사냥꾼이 죽으면 사냥꾼이 투표한 사람도 함께 죽습니다. | roles.hunter.desc와 같은 문장입니다 |
| T.replay.hunt.title.both | 사냥꾼 ${a} | 사냥꾼 ${a} | 변경 없음 |
| T.replay.hunt.title.last | 사냥꾼 패를 쥔 ${a} | 사냥꾼 카드를 가진 ${a} | |
| T.replay.hunt.title.copy | 사냥꾼을 베낀 패를 쥔 ${a} | 도플갱어(사냥꾼) ${a} | |

### 3.20 T.replay.why / self (승패 이유·내 결과)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.replay.why.wolf_died | 늑대 ${list:이/가} 처형됐다. | 늑대인간 ${list:이/가} 처형되었습니다. | |
| T.replay.why.tanner_too | 무두장이 ${t}도 바라던 대로 죽었다. | 무두장이 ${t}도 처형되어 함께 승리했습니다. | |
| T.replay.why.wolf_lived | 늑대 ${list:은/는} 살아남았다. | 늑대인간 ${list:은/는} 처형되지 않았습니다. | |
| T.replay.why.tanner_blocked | 무두장이 ${t:이/가} 죽었다. 늑대도 이기지 못한다. | 무두장이 ${t:이/가} 처형되어 늑대인간 팀은 승리하지 못했습니다. | |
| T.replay.why.wolf_center | 새벽에 늑대 패는 모두 제단에 있었다. | 늑대인간 카드가 모두 가운데에 있었습니다. | |
| T.replay.why.wolf_none | 이 밤의 패에는 늑대가 없었다. | 이번 게임에는 늑대인간 카드가 없었습니다. | |
| T.replay.why.no_death | 피도 흐르지 않았다. | 아무도 처형되지 않아 마을 팀이 승리했습니다. | |
| T.replay.why.no_wolf_tanner | 무두장이 ${t}만 바라던 죽음을 얻었다. | 처형된 사람은 무두장이 ${t}뿐입니다. | |
| T.replay.why.minion_only_died | 죽은 자는 하수인 ${t}뿐이었다. | 처형된 사람은 하수인 ${t}뿐입니다. | |
| T.replay.why.minion_lived | 무고한 피가 흘렀다. 하수인 ${a:이/가} 웃는다. | 하수인 ${a:은/는} 처형되지 않아 늑대인간 팀이 승리했습니다. | |
| T.replay.why.innocent_died | 무고한 피만 흘렀다. | 늑대인간이 없는데 처형된 사람이 있어 모두 패배했습니다. | |
| T.replay.self.same | 너는 끝까지 ${f:이었다/였다}. | 당신의 최종 카드는 ${f}입니다. 밤사이 바뀌지 않았습니다. | 새 조사 쌍 없이 처리합니다 |
| T.replay.self.diff | 너는 ${b:이라/라} 믿었다. 너는 ${f:이었다/였다}. | 당신은 자신이 ${b}인 줄 알았지만, 최종 카드는 ${f}입니다. | "인 줄"은 받침과 관계없이 붙습니다 |
| T.replay.self.blind | 너는 제 패를 몰랐다. 너는 ${f:이었다/였다}. | 당신은 자신의 카드를 알지 못했습니다. 최종 카드는 ${f}입니다. | |
| T.replay.self.doppel | 네가 쥔 도플갱어 패는 ${r:을/를} 베낀 패였다. | 당신의 도플갱어 카드는 ${r:을/를} 복사했습니다. | |
| T.replay.self.team | 그래서 ${team:이었다/였다}. | 최종 소속은 ${team}입니다. | |
| T.replay.self.win | 이겼다. | ${team} 승리. | |
| T.replay.self.lose | 졌다. | ${team} 패배. | |

### 3.21 T.replay.ui (리플레이 조작)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| T.replay.ui.hudCenter | 결말 | 결과 | |
| T.replay.ui.hudSkip | 건너뛴다 | 건너뛰기 | |
| T.replay.ui.pause | 멈춘다 | 멈추기 | |
| T.replay.ui.resume | 잇는다 | 계속하기 | |
| T.replay.ui.restart | 처음부터 | 처음부터 보기 | |
| T.replay.ui.tapResume | 눌러서 잇는다 | 눌러서 계속하기 | 메인 버튼 둘째 줄 |
| T.replay.ui.pos | ${act} ${i}/${n} | ${act} ${i}/${n} | 변경 없음 |
| T.replay.ui.prev | 앞 박자 | 이전 장면 보기 | |
| T.replay.ui.next | 다음 박자 | 다음 장면 보기 | |
| T.replay.ui.fast | 빠르게 본다 | 2배속으로 보기 | |
| T.replay.ui.normal | 제 속도로 본다 | 1배속으로 보기 | |
| T.replay.ui.x1 / x2 | ×1 / ×2 | ×1 / ×2 | 변경 없음 |
| T.replay.ui.acts.pro | 서막 | 시작 | |
| T.replay.ui.acts.night | 밤 | 밤 | 변경 없음 |
| T.replay.ui.acts.dawn | 새벽 | 새벽 | 변경 없음 |
| T.replay.ui.acts.vote | 심판 | 투표 | |
| T.replay.ui.acts.verdict | 판결 | 결과 | |
| T.replay.ui.ruler | 그 밤의 박자 | 재생 위치 | |
| T.replay.ui.board | 모든 기록 | 전체 기록 | |
| T.replay.ui.happened | 그 밤에 일어난 일 | 밤에 일어난 일 | |
| T.replay.ui.link | 그 밤을 다시 본다 | 리플레이 보기 | T.btn.replay와 같습니다 |
| T.replay.ui.journey | 믿은 패 | 알고 있던 카드 | |
| T.replay.ui.stayed | 밤새 그대로였다. | 밤새 바뀌지 않았습니다. | |
| **T.replay.ui.unknown (신규)** | (replay.js:389 하드코딩 "모른다") | 알 수 없음 | "알고 있던 카드 알 수 없음"으로 읽힙니다 |

### 3.22 roles.js — 역할 한 줄 소개(line)·설명(desc)

| 위치 | 현재 | 새 문구 |
|---|---|---|
| roles.doppelganger.line | 남의 얼굴로 산다. | 다른 사람의 역할을 복사합니다. |
| roles.doppelganger.desc | 누군가의 패를 보고 그가 된다. 예언자·강도·말썽쟁이·주정뱅이가 되면 그 자리에서 행동하고, 늑대인간·하수인·프리메이슨·불면증환자가 되면 그 차례에 함께 깬다. 그 편에 선다. | 밤에 다른 플레이어의 카드 한 장을 보고 그 역할이 됩니다. 예언자·강도·말썽쟁이·주정뱅이를 복사하면 바로 그 능력을 사용하고, 늑대인간·하수인·프리메이슨·불면증환자를 복사하면 해당 역할의 차례에 함께 눈을 뜹니다. 복사한 역할의 팀이 됩니다. |
| roles.werewolf.line | 무리를 알아본다. | 다른 늑대인간을 확인합니다. |
| roles.werewolf.desc | 다른 늑대를 본다. 혼자라면 제단의 패 하나를 본다. 늑대가 아무도 처형되지 않으면 이긴다. | 밤에 다른 늑대인간을 확인합니다. 늑대인간이 혼자라면 가운데 카드 한 장을 볼 수 있습니다. 늑대인간이 한 명도 처형되지 않으면 승리합니다. |
| roles.minion.line | 주인을 섬긴다. | 늑대인간이 누구인지 압니다. |
| roles.minion.desc | 누가 늑대인지 안다. 늑대는 너를 모른다. 네가 처형되어도 늑대가 살면 이긴다. | 밤에 누가 늑대인간인지 확인합니다. 늑대인간은 하수인이 누구인지 모릅니다. 하수인이 처형되더라도 늑대인간이 처형되지 않으면 늑대인간 팀이 승리합니다. |
| roles.mason.line | 형제를 안다. | 다른 프리메이슨을 압니다. |
| roles.mason.desc | 다른 프리메이슨을 본다. | 밤에 다른 프리메이슨을 확인합니다. |
| roles.seer.line | 남의 패를 엿본다. | 다른 사람의 카드를 확인합니다. |
| roles.seer.desc | 한 명의 패, 혹은 제단의 두 장을 본다. | 밤에 다른 플레이어의 카드 한 장 또는 가운데 카드 두 장을 볼 수 있습니다. |
| roles.robber.line | 빼앗고, 그가 된다. | 카드를 훔쳐 그 역할이 됩니다. |
| roles.robber.desc | 누군가와 패를 바꾸고 새 패를 본다. 그 편에 서되, 능력은 쓰지 못한다. | 밤에 다른 플레이어의 카드를 훔쳐 자신의 카드와 바꾸고 새 카드를 확인할 수 있습니다. 새 역할의 팀이 되지만 그 능력은 사용하지 않습니다. |
| roles.troublemaker.line | 남의 패를 뒤바꾼다. | 다른 두 사람의 카드를 바꿉니다. |
| roles.troublemaker.desc | 다른 둘의 패를 바꾼다. 보지 않는다. | 밤에 다른 플레이어 두 명의 카드를 서로 바꿀 수 있습니다. 바꾼 카드는 확인하지 않습니다. |
| roles.drunk.line | 제가 누군지 모른다. | 자신이 누구인지 모릅니다. |
| roles.drunk.desc | 제단의 패 하나와 제 패를 반드시 바꾼다. 새 패는 보지 못한다. | 밤에 자신의 카드를 가운데 카드 한 장과 반드시 바꿉니다. 새 카드는 확인할 수 없습니다. |
| roles.insomniac.line | 잠들지 못한다. | 마지막에 자신의 카드를 확인합니다. |
| roles.insomniac.desc | 밤의 끝에 제 패를 다시 본다. | 밤의 마지막에 자신의 카드를 다시 확인합니다. |
| roles.villager.line | 아무것도 모른다. | 특별한 능력이 없습니다. |
| roles.villager.desc | 능력이 없다. 말로 살아남아라. | 특별한 능력이 없습니다. 대화로 늑대인간을 찾아내세요. |
| roles.hunter.line | 홀로 죽지 않는다. | 처형되면 투표한 사람을 함께 데려갑니다. |
| roles.hunter.desc | 처형되면, 제가 지목한 자도 함께 죽는다. | 사냥꾼이 죽으면 사냥꾼이 투표한 사람도 함께 죽습니다. |
| roles.tanner.line | 죽음을 원한다. | 처형되면 승리합니다. |
| roles.tanner.desc | 처형되면 홀로 이긴다. 그 경우 늑대는 이길 수 없다. | 무두장이가 처형되면 무두장이 혼자 승리합니다. 이 경우 늑대인간 팀은 승리할 수 없습니다. |
| roles.*.name (12개) | 도플갱어 … 무두장이 | 변경 없음 | 

### 3.23 roles.js — NIGHT_TEXT (TTS 겸 밤 화면 띠 문구)

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| roles.NIGHT_TEXT._check | 각자 패를 봐라. 누구에게도 보이지 마라. | 자신의 카드를 확인하세요. 다른 사람에게 보이지 않도록 주의하세요. | |
| roles.NIGHT_TEXT.doppelganger | 도플갱어. 눈을 떠라. 누군가의 얼굴을 훔쳐라. | 도플갱어는 눈을 뜨세요. 다른 사람의 카드 한 장을 보고 그 역할이 됩니다. | |
| roles.NIGHT_TEXT.werewolf | 늑대인간. 눈을 떠라. 서로를 알아봐라. | 늑대인간은 눈을 뜨고 서로를 확인하세요. | 공식 앱 문장. 혼자일 때는 뒤에 msg.packAlone이 붙습니다(app.js:325) |
| roles.NIGHT_TEXT.minion | 하수인. 눈을 떠라. 네 주인을 봐라. | 하수인은 눈을 뜨고 늑대인간이 누구인지 확인하세요. | |
| roles.NIGHT_TEXT.mason | 프리메이슨. 눈을 떠라. 형제를 찾아라. | 프리메이슨은 눈을 뜨고 서로를 확인하세요. | |
| roles.NIGHT_TEXT.seer | 예언자. 눈을 떠라. 한 명의 패를 봐라. 아니면 제단의 두 장을. | 예언자는 눈을 뜨세요. 다른 사람의 카드 한 장 또는 가운데 카드 두 장을 볼 수 있습니다. | |
| roles.NIGHT_TEXT.robber | 강도. 눈을 떠라. 누군가의 패를 훔쳐라. | 강도는 눈을 뜨세요. 다른 사람의 카드를 훔쳐 자신의 카드와 바꾸고 새 카드를 확인할 수 있습니다. | |
| roles.NIGHT_TEXT.troublemaker | 말썽쟁이. 눈을 떠라. 둘의 패를 뒤바꿔라. | 말썽쟁이는 눈을 뜨세요. 다른 두 사람의 카드를 서로 바꿀 수 있습니다. | |
| roles.NIGHT_TEXT.drunk | 주정뱅이. 눈을 떠라. 제단의 패와 네 패를 바꿔라. 보지는 마라. | 주정뱅이는 눈을 뜨세요. 자신의 카드를 가운데 카드 한 장과 바꿉니다. 새 카드는 볼 수 없습니다. | |
| roles.NIGHT_TEXT.insomniac | 불면증환자. 눈을 떠라. 네 패를 다시 봐라. | 불면증환자는 눈을 뜨고 자신의 카드를 확인하세요. | |
| roles.js 주석(74행) | …'눈을 감아라.'를 붙여 읽는다(T.narr.close). | …'눈을 감으세요.'를 붙여 읽습니다(T.narr.close). | 주석 |

### 3.24 roles.js — TEAM_NAME

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| roles.TEAM_NAME.village | 마을 편 | 마을 팀 | |
| roles.TEAM_NAME.wolf | 늑대 편 | 늑대인간 팀 | |
| roles.TEAM_NAME.tanner | 홀로 | 무두장이 팀 | "이제 무두장이입니다"라고 쓰면 역할이 바뀐 것처럼 읽히므로 "팀"을 붙입니다 |

### 3.25 index.html 하드코딩 (strings.js 실행 전에 보이므로 위 값과 글자 하나까지 같아야 합니다)

| 위치 | 현재 | 새 문구 | 짝 키 |
|---|---|---|---|
| 6행 `<title>` | 한밤의 늑대인간 | 한밤의 늑대인간 | T.body.docTitle (변경 없음) |
| 7행 meta description | 하룻밤. 한 번의 심판. 늑대를 찾아 처형하라. | 3~10명이 함께하는 온라인 한밤의 늑대인간입니다. 단 한 번의 투표로 늑대인간을 찾아내세요. | T.body.docDesc |
| 42행 h1.home-title span | 한밤의 늑대인간 | 한밤의 늑대인간 | T.title.game (변경 없음) |
| 46행 #nameInput placeholder / aria-label | 이름 / 이름 | 닉네임 / 닉네임 | T.body.namePh |
| 48행 #homeBootSub | 깊이 잠든 마을이다. 1분은 걸린다. | 서버를 준비하고 있습니다. 최대 1분 정도 걸릴 수 있습니다. | T.body.coldNote |
| 49행 #createBtn .lbl | 마을을 연다 | 방 만들기 | T.btn.open |
| 50행 .home-or span | 혹은 | 또는 | T.btn.or |
| 52행 #codeInput placeholder / aria-label | 표식 / 표식 | 방 코드 / 방 코드 | T.body.codePh |
| 53행 #joinBtn .lbl | 들어간다 | 참가하기 | T.btn.join |
| 55행 #otherLink | 다른 마을을 연다 | 새 방 만들기 | T.btn.otherTown |
| 56행 #lawLink | 법도 | 규칙 보기 | T.btn.law |
| 63행 .sheet-tab 1번째 | 속삭임 | 채팅 | T.chat.title |
| 63행 .sheet-tab 2번째 | 기록 | 기록 | T.chat.log (변경 없음) |
| 75행 #hold-hint (sr-only) | 길게 눌러 확정한다 | 길게 눌러 확정하세요. | 짝 키 없음 |

### 3.26 app.js / replay.js / art.js 하드코딩

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| app.js:17 X.log 폴백 | 기록 | 기록 | 변경 없음 |
| app.js:17 X.lobby 폴백 | 모닥불 | 대기실 | |
| app.js:17 X.min 폴백 | 분 | 분 | 변경 없음 |
| app.js:17 X.less 폴백 | 빼기 | 한 장 빼기 | |
| app.js:17 X.more 폴백 | 더하기 | 한 장 더하기 | |
| app.js:18 MARK 폴백 (werewolf) | 무리 | 동료 | |
| app.js:18 MARK 폴백 (minion) | 주인 | 늑대인간 | |
| app.js:18 MARK 폴백 (mason) | 형제 | 동료 | |
| app.js:703 메뉴 item('law', TH.law) | 법도 | 규칙 보기 | TBT.law로 바꿉니다 |
| app.js:703 메뉴 item('deck', TH.deck) | 이번 밤의 패 | 카드 구성 보기 | 새 키 TBT.deck으로 바꿉니다 |
| replay.js:389 하드코딩 | 모른다 | 알 수 없음 | 새 키 T.replay.ui.unknown으로 뺍니다 |
| art.js:200, 213 카드 aria (앞면) | `${name} 카드` | `${name} 카드` | 변경 없음 |
| art.js:200, 213 카드 aria (뒷면) | 엎어진 카드 | 뒷면 카드 | |

### 3.27 server.js

| 위치 | 현재 | 새 문구 | 메모 |
|---|---|---|---|
| server.js:1087 console.log | 한밤의 늑대인간 서버 실행 중: http://localhost:${PORT} | 변경 없음 | 개발 로그라 화면에 나오지 않습니다. 사용자에게 보이는 서버 문구는 모두 T.msg를 거칩니다. 나머지 한글은 주석뿐입니다 |

**완전성 확인:** strings.js, roles.js, index.html, app.js, replay.js, art.js, fx.js, server.js에서 한글이 들어간 줄을 grep해 주석 줄을 뺀 뒤 대조했습니다. 위 표에 빠진 사용자 노출 문자열은 없습니다(fx.js는 주석뿐입니다).

---

## 4. 새로 필요한 키 / 삭제할 키 / 코드 변경

### 4.1 새 키 (코드 변경 필요)

| 키 | 값 | 필요한 코드 변경 |
|---|---|---|
| `T.btn.deck` | 카드 구성 보기 | app.js:703 `item('deck', TH.deck)` → `item('deck', TBT.deck)`. 디스플레이 그룹이라 서브셋에 들어갑니다 |
| `T.replay.ui.unknown` | 알 수 없음 | replay.js:389 `'모른다'` → `UI.unknown` |
| (선택) `T.body.yourCardIs` | 당신의 카드는 ${r}입니다. | 오너 예시 문장을 그대로 쓰려면 이 키를 씁니다. 카드를 길게 누르고 있는 동안에만 check-t1을 이 문장으로 바꿉니다(app.js:519 근처). 계속 띄워 두면 옆 사람에게 역할이 보이므로 기본값으로는 쓰지 않습니다 |
| (선택) `T.btn.voteFor` | ${n}에게 투표하기 | "민수에게 투표하기" 어순을 원할 때만 씁니다. app.js:309에서 lbl과 nm을 합쳐야 합니다. "에게"는 받침과 관계없어 조사 쌍이 필요 없습니다. 기본안은 지금 구조("투표하기" + 이름) 유지입니다 |

### 4.2 기존 키에서 코드를 함께 바꿔야 하는 곳

- **app.js:703 메뉴 규칙 항목:** `TH.law` → `TBT.law`. 키는 그대로이고 참조만 바꿉니다.
- **app.js:17–18 폴백:** 3.26절 값으로 맞춥니다.
- **art.js:200, 213:** "엎어진 카드" → "뒷면 카드".
- **index.html:** 3.25절 값으로 맞춥니다.

### 4.3 플레이스홀더 형태만 바뀌는 키 (키 이름은 그대로)

- 조사 쌍 **추가:** `T.msg.drunkSwapped`(`${pos:과/와}`), `T.body.execLine`(`${names:이/가}`), `T.replay.exec.top`(`${list:이/가}`), `T.replay.copy*.top`/`know.*.top`/`peek.*.top`/`skip.*.top`/`vote.none`/`swap.*`(이름 뒤 `:이/가`, `:은/는`), `T.replay.peek.werewolf*.top`·`swap.drunk.top`(`${P:을/를}`, `${P:과/와}`), `T.replay.peek.insomniac.changed`(`${r:으로/로}`).
- 조사 쌍 **제거:** `T.msg.nowCard`, `T.msg.copied`, `T.msg.stole`(`${r:이다/다}` → `${r}입니다`), `T.body.hunterLine`(`${b:을/를}` → `${b}도`), `T.replay.hunt.top`, `T.replay.pro.bot`(`${r:으로/로}`), `T.replay.self.*`(`${f:이었다/였다}`, `${b:이라/라}`, `${team:이었다/였다}`), `T.replay.exec.bot`, `T.replay.hunt.bot`.
- 결과적으로 `이다/다`, `이었다/였다`, `이라/라` 세 쌍은 더 이상 쓰이지 않습니다. JOSA 표에 남겨 두어도 문제는 없습니다.
- 사용하는 쌍은 모두 JOSA 표에 있거나(`이/가`, `을/를`, `과/와`, `은/는`) 특수 처리됩니다(`으로/로`). **새 조사 쌍은 추가하지 않습니다.** 표에 없는 쌍을 쓰면 조사가 사라지니 주의하세요.

### 4.4 삭제해도 되는 키 (사용처 없음, 이번에는 새 문구로 바꿔만 둠)

`T.body.wake`, `T.body.sleeping`, `T.body.pickStealBtn`, `T.body.nightFalls`, `T.body.altarWord`, `T.body.altarFirst`, `T.phase.awake`, `T.phase.nightFalls`, `T.phase.closeEyes`.
삭제하면 디스플레이 서브셋에서도 빠집니다(T.phase 3개).

### 4.5 오너 결정이 필요한 것

1. **라틴 닉네임 조사 폴백(strings.js:44):** 지금은 판정할 수 없는 이름 뒤에 `" —"`를 붙여 "Tom — 방장이 되었습니다."처럼 나옵니다. 존댓말 문장에서는 어색합니다. 권장안은 괄호 병기입니다: `이(가)`, `을(를)`, `은(는)`, `과(와)`, `(으)로`. 정식 한국어판 게임에서도 표준으로 쓰는 처리입니다. DESIGN_SPEC §10.0의 괄호 병기 금지 조항은 폐기해야 합니다. hunterLine과 hunt.top은 조사 없이 쓰도록 바꿔 두었으므로 이 결정과 관계없이 깨지지 않습니다.
2. **design/DESIGN_SPEC.md §10.0 보이스 원칙 개정:** 지금 원칙은 반말 명령형과 마을·표식·패·제단·법도·촌장을 규정합니다. 그대로 두면 다음 작업에서 옛 문체가 다시 들어옵니다. 이 문서의 1·2절로 교체하기를 권합니다.

### 4.6 기능 추가(F1~F5) 새 키 / 삭제 키

출처는 design/FEATURES_SPEC.md §2입니다. 값은 strings.js와 같아야 합니다.

| 키 | 값 | 용도 |
|---|---|---|
| `T.btn.chatOff` | 채팅 끄기 | 메뉴 항목 (F1). 디스플레이 그룹 |
| `T.btn.chatOn` | 채팅 켜기 | 메뉴 항목 (F1). 디스플레이 그룹 |
| `T.btn.bgmOn` | 배경음악 켜기 | 메뉴 항목 (F3). 디스플레이 그룹. 기본값은 켜짐(첫 제스처 뒤, 작은 음량)이므로 처음에는 bgmOff가 보입니다 |
| `T.btn.bgmOff` | 배경음악 끄기 | 메뉴 항목 (F3). 디스플레이 그룹 |
| `T.chat.reply` | 답글 달기 | 답글 버튼 |
| `T.chat.replyAria` | ${n}의 메시지에 답글 달기 | 답글 버튼 aria-label |
| `T.chat.replyCancel` | 취소하기 | 답글 바 취소 버튼 |
| `T.chat.replyBar` | ${n}의 메시지에 답글을 씁니다. | 스크린리더 상태 문장 |
| `T.chat.jump` | ${n}의 원래 메시지로 이동하기 | 인용 줄 aria-label |
| `T.chat.gone` | 원래 메시지를 찾을 수 없습니다. 오래된 메시지는 지워졌을 수 있습니다. | 토스트 |
| `T.chat.reGone` | 원래 메시지가 지워져 답글 없이 보냈습니다. | 토스트 (전송 응답이 reDropped일 때) |
| `T.chat.offNote` | 채팅을 꺼 두었습니다. 알림 메시지만 표시됩니다. 오른쪽 위 메뉴에서 다시 켤 수 있습니다. | 채팅 끈 상태의 채팅 탭 안내 |
| `T.body.chatOffToast / chatOnToast` | 채팅을 껐습니다. / 채팅을 켰습니다. | 토스트 |
| `T.body.whoCard` | ${n}의 카드 | F2 큰 카드 캡션 |
| `T.body.whoMine / whoNew / whoNow` | 당신의 카드 / 당신의 새 카드 / 지금 당신의 카드 | F2 캡션, 독 엿보기 |
| `T.body.whoCopy` | 이제 당신은 이 역할입니다. | 도플갱어 부제 |
| `T.body.whoFrom` | ${n}에게서 가져온 카드 | 강도 부제 |
| `T.body.whoWoke` | 새벽에 다시 확인한 카드 | 독 엿보기, 불면증환자 |
| `T.body.whoCopied` | ${n}의 카드를 따라 했습니다. | 독 엿보기, 도플갱어 |
| `T.body.whoPack / whoOwners / whoBros` | 함께 깨어난 늑대인간 / 당신이 섬기는 늑대인간 / 함께 깨어난 프리메이슨 | F2 이름 판 |
| `T.body.bgmOnToast / bgmOffToast` | 배경음악을 켰습니다. / 배경음악을 껐습니다. | 토스트 (F3) |
| `T.body.bgmVol` | 배경음악 음량 | 메뉴 .seg 라벨. 기본값은 켜짐, 음량 1(작게) |
| `T.body.dockCoach` | 왼쪽 아래 카드로 밤에 본 정보를 다시 볼 수 있습니다. | 독 안내 (360px에서 3줄 안) |
| `T.body.heroDeadMe` | 당신 · 처형 | 결과 화면, 처형된 사람이 본인일 때 (heroDead의 본인판) |
| `T.body.bgmLv` | 작게 / 보통 / 크게 | 배열 3개. 기본은 작게(1) |

- **삭제:** `T.body.peekLast` (F2 이후 쓰지 않음). `peekFirst`는 F2 부제로 계속 씁니다.
- **오너 결정(배경음악):** 기본값은 켜짐입니다. 첫 사용자 제스처 뒤에 작은 음량으로 시작하고, 메뉴에서 끌 수 있습니다. 끈 선택은 저장됩니다.
- **밤 행동 시간:** 카드를 보는 행동의 제한 시간을 약 +50%(역할 30초에서 45초, 도플갱어 45초에서 68초)로 늘렸고, 카드를 본 행동 뒤에는 최소 10초 동안 단계가 끝나지 않습니다. 화면 문구는 바꾸지 않습니다.
- **빌드 표식:** strings.js의 `@client:drop-start/end`(T.msg)와 `@client:replay-start/end`(replay 일부)는 tools/stamp.js가 읽습니다. 서버와 테스트는 파일 전체를 씁니다.

---

## 5. 폰트 서브셋 참고 (디스플레이 그룹: title, btn, head, phase, verdict, stamp)

아래 문자열이 바뀌었거나 새로 생겼습니다. Hanbam 서브셋을 다시 만들어야 하며, 다시 만들지 않으면 새 글자가 대체 폰트로 표시됩니다.

**T.btn:** 방 만들기 · 참가하기 · 새 방 만들기 · 규칙 보기 · 또는 · 링크 복사하기 · 강퇴하기 · 게임 시작하기 · 확인하기 · 보지 않기 · 역할 복사하기 · 카드 보기 · 가운데 카드 보기 · 카드 훔치기 · 훔치지 않기 · 카드 바꾸기 · 바꾸지 않기 · 투표하기 · 투표 준비하기 · 준비 취소하기 · 투표 시작하기 · 다시 하기 · 건너뛰기 · 멈추기 · 계속하기 · 처음부터 보기 · 나가기 · 방 나가기 · 음성 켜기 · 음성 끄기 · 대기 중 · 닫기 · 리플레이 보기 · 카드 구성 보기(신규)

**T.head:** 게임 규칙 · 채팅 · 방 코드 · 카드 구성 · 자동 구성하기 · 토론 시간 · 가운데 카드 · 밤에 확인한 정보 · 전체 기록 · 밤에 일어난 일 · 알고 있던 카드 · 결과 · 투표 시간입니다. (깨어나는 순서, 이름은 변경 없음)

**T.phase:** 대기실 · 카드 확인 · 투표 · 결과 · 시작 · 눈을 뜨세요 · 밤이 되었습니다. · 아침이 되었습니다. · 눈을 감으세요. (밤, 새벽, 낮은 변경 없음)

**T.verdict:** 늑대인간 팀 승리 · 마을 팀 승리 · 무두장이 승리 · 승자 없음

**T.stamp:** 승리 · 패배 · 나 · 내 카드 · 바뀜

**T.title:** 변경 없음

서브셋에 새로 들어갈 가능성이 큰 글자(참고): 방 만 참 가 또 링 크 복 사 강 퇴 게 임 시 작 확 인 카 드 훔 치 투 표 준 비 취 소 계 속 음 성 켜 끄 닫 리 플 레 이 구 성 규 칙 채 팅 코 동 토 론 정 보 전 체 결 과 일 대 실 뜨 세 요 되 었 습 니 아 침 감 으 승 패 배 팀 없 내 뀜 중 행 자 처 부 터 원 장 면. 실제 서브셋은 스크립트로 T 디스플레이 그룹 전체에서 글자를 다시 뽑아 만드세요.

---

**총 문구 수:** 3절 표 450행입니다(행 하나가 여러 위치를 묶은 경우가 있습니다). 이 가운데 변경 없음은 36행, 바뀌는 행은 414행입니다. 새 키는 2개(필수)와 선택 키 2개입니다.

---

## 부록. 결과 화면·리플레이 문구 개정 (이 표가 위 표와 다르면 이 표가 맞습니다)

조사 쌍 `${r:이었/였}`을 JOSA 표에 추가했습니다(받침 있으면 이었, 없으면 였). 예: `${r:이었/였}습니다` -> 늑대인간이었습니다 / 사냥꾼이었습니다.

| 키 | 확정 문구 |
|---|---|
| T.msg.busy | 지금은 방을 만들 수 없습니다. 잠시 후 다시 시도해 주세요. |
| T.replay.cause.robbed | ${role} ${a:이/가} 당신의 카드를 가져갔습니다. |
| T.replay.cause.swapped | ${role} ${a:이/가} 당신의 카드를 ${t}의 카드와 바꿨습니다. |
| T.replay.cause.rob | 당신은 ${t}의 카드를 가져왔습니다. |
| T.replay.cause.drunk | 당신은 자신의 카드를 ${P:과/와} 바꿨습니다. |
| T.replay.cause.end | 그래서 마지막 카드는 ${r}입니다. |
| T.replay.self.end | 마지막 카드는 ${f}였습니다. |
| T.replay.self.diff | ${b}인 줄 알았지만 마지막 카드는 ${f}였습니다. |
| T.replay.self.same | 카드는 끝까지 ${f}였습니다. |
| T.replay.self.blind | 바뀐 카드는 확인하지 못했습니다. 마지막 카드는 ${f}였습니다. |
| T.replay.exec.card | ${t:은/는} ${r:이었/였}습니다. |
| T.body.execCard | ${n:은/는} ${r:이었/였}습니다. |
| T.replay.why.wolf_lived_you | 늑대인간인 당신은 처형되지 않았습니다. |
| T.replay.why.wolf_died_you | 늑대인간인 당신이 처형되었습니다. |
| T.replay.vote.by | ${list} → ${t} |
| T.replay.dawn.bot | 카드가 바뀐 사람: ${list} |
| T.replay.note.wake | 처음 받은 역할로 깨어납니다. |
| T.replay.uiR.hop.robSelf | ${t}에게서 훔쳐 옴 |
| T.replay.uiR.hop.robTarget | ${a:이/가} 훔쳐 감 |
| T.replay.uiR.hop.swap | ${a:이/가} 바꿔 놓음 |
| T.replay.uiR.hop.drunkSelf | ${P:과/와} 바꿈 |
| T.replay.uiR.hop.drunkCenter | ${a:이/가} 자기 카드와 바꿈 |
| T.replay.uiR.hop.copy | ${a:이/가} 복사함 |
| T.replay.ui.diffNote | ` · 실제와 다름` |
| T.stamp.exec | 처형 |
| T.phase.dawn / T.replay.uiR.acts.dawn | 아침 |
| T.body.dayAsk | 토론을 시작하세요. |
| T.btn.voiceOn / voiceOff | 음성 안내 켜기 / 음성 안내 끄기 |
| T.btn.unfold | 최종 카드 보기 |
| T.body.pickExec | 처형할 사람을 고른 뒤 버튼을 길게 누르세요. |
| T.body.votedFor | ${n}에게 투표했습니다. 다시 고르면 바꿀 수 있습니다. |
| T.body.coverHint | 확인했다면 카드를 눌러 덮으세요. |
| T.body.sleeping | 대기 중 (독 상태 표시 전용) |
| T.body.dockHint | 내 카드 |
| T.body.voteRuleBtn | 투표 규칙 보기 (투표 '?' 버튼 aria-label) |
| T.body.centerMore | 가운데 +${n} |

## 부록. 2차 수정 (서버/문구)

| 키 | 문구 | 비고 |
|---|---|---|
| T.body.yourCard, T.head.yourCard | 당신의 역할은 아직 가려져 있습니다. | 카드 뒷면이 늑대 얼굴이라 이전 문구가 오해를 줬습니다 |
| T.body.otherTab | 다른 창에서 이 게임에 접속했습니다. | 서버의 replaced 이벤트 수신 시 |
| T.btn.continueHere | 이 창에서 계속하기 | |
| T.body.loadFail | 게임을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요. | |
| T.btn.reload | 다시 불러오기 | |
| T.body.daySwapHint | 밤사이 바뀌었을 수 있습니다. | |
| T.body.seenLine | 밤에 본 것: ${t} | |
| T.body.cardHint | 카드를 길게 눌러 역할을 확인하세요. | |
| T.body.deckCenterOk | 가운데 카드 3장 포함 | |
| T.body.youHappened | 당신에게 일어난 일 | |
| T.btn.resend | 다시 보내기 | |
| T.msg.slowDown | 잠시 후 다시 시도해 주세요. | 위 본문 표에도 추가 |
| T.replay.uiR.hop.copy | ${t}의 카드를 복사함 | 변수 t: 복사한 대상 이름 |
| T.replay.cause.end | 결국 마지막 카드는 ${r:이었/였}습니다. | r: 역할 칩, 칩과 서술어를 .nw로 묶습니다 |
| T.body.pickExec | 처형할 사람을 고르고 투표하기를 길게 누르세요. | |
| T.body.raised | 투표 준비 ${r}/${n} · 모두 준비하면 바로 투표합니다. | |
| T.body.votedFor | ${n}에게 투표했습니다. 다시 고르면 바뀝니다. | |
| T.btn.leave | 방 나가기 | |

## 개정 (서버+문구 패스)

| 키 | 최종 문구 |
|---|---|
| T.body.daySwapHint | 내 카드가 밤사이 바뀌었을 수 있습니다. |
| T.body.yourCard | 내 역할은 아직 가려져 있습니다. |
| T.body.holdHint | 모든 카드의 뒷면은 같습니다. 길게 눌러 확인하세요. (cardHint는 더 이상 렌더하지 않음) |
| T.body.youHappened | 내 카드의 행방 |
| T.body.heroDead | ${n} (이름만. 처형은 스탬프가 표시) |
| T.body.whoMine / whoNew / whoNow | 내 카드 / 내 새 카드 / 지금 내 카드 |
| T.body.hunterLine | 사냥꾼 ${a}의 능력으로 ${b}도 함께 처형되었습니다. |
| T.replay.hunt.rule | 사냥꾼이 처형되면 사냥꾼이 투표한 사람도 함께 처형됩니다. |
| T.replay.cause.robbed | ${role} ${a:이/가} 내 카드를 가져갔습니다. |
| T.replay.cause.swapped | ${role} ${a:이/가} 내 카드를 ${t}의 카드와 바꿨습니다. |
| T.replay.cause.end | 최종 카드는 ${r:이었/였}습니다. |
| T.replay.pro.top | 처음 나눠 받은 카드입니다. |
| T.replay.ui.acts | 카드 배치 / 밤 / 낮 / 투표 / 결과 (ruler 라벨 dawn도 낮) |
| T.body.deckCount | 카드 ${n}장 / 필요 ${m}장 (로비 푸터. 긴 안내문은 덱 시트에서만) |
| T.body.seenOther | ${w}: ${r} |
| T.body.seenMore | 외 ${n}장 |
| T.body.reconnectSlow | 연결이 오래 걸리고 있습니다. |
| T.body.reload / goHome | 새로 고치기 / 홈으로 가기 |
| T.body.resFallback / resRetry | 결과를 불러오지 못했습니다. / 다시 불러오기 |
| T.body.waking | 서버를 깨우는 중입니다. |
| T.body.bgmVol | 배경음악 크기 |
| T.replay.self.noneButMoved | 밤새 카드가 오갔지만 모두 처음 카드로 돌아왔습니다. |

## 개정 (v3 보안·문구 패스)

| 키 | 최종 문구 |
|---|---|
| T.body.deckCount | 카드 ${total}장 / 필요 ${need}장 (호출부: app.js, result.js 가 {total, need} 전달. 이전 ${n}/${m} 표기는 오류였음) |
| T.body.holdHint | 카드를 길게 눌러 역할을 확인하세요. |
| T.body.readyMark | 준비 완료 |
| T.body.dayTalk | 토론 중입니다. 준비되면 투표 준비하기를 누르세요. (낮 시작 약 8초 뒤) |
| T.body.youWin / youLose | 당신의 승리입니다. / 당신은 패배했습니다. |
| T.body.teamMoved | ${from}에서 ${team} 팀으로 바뀌었습니다. |
| T.body.pickTarget | 대상을 선택하세요 (예언자 빈 선택) |
| T.body.altarPick | 가운데 카드 보기 (${n}/2) |
| T.body.roomCodeLbl | 방 코드 |
| T.btn.result | 결과 보기 (폰트 서브셋 포함용. 리플레이는 T.replay.uiR.result 사용) |
| T.replay.uiR.nowCard | 지금 카드 ${r} |
| T.replay.uiR.result | 결과 보기 |
| T.replay.uiR.acts.dawn | 최종 카드 (타임라인 라벨. T.phase.dawn 은 HUD용으로 낮 유지) |
| T.replay.dawn.seat | top: ${a}: ${from} → ${to} / bot: 팀이 ${team:으로/로} 바뀌었습니다. / botSame: 팀은 그대로입니다. |
| T.replay.cause.robbed / swapped | 당신의 카드를 (서술문에서는 당신, 라벨·태그에서만 내 카드) |
| 사냥꾼 line / desc | 처형되면 자신이 투표한 사람도 함께 처형됩니다. / 사냥꾼이 처형되면 사냥꾼이 투표한 사람도 함께 처형됩니다. |
| 서버 id | players[].id, me, 채팅 id 는 불투명한 공개 sid(playerId 의 sha256 앞 12자). 원본 playerId 는 create/join 페이로드에서만 전송 |
| 소켓 핸드셰이크 | auth.v 가 배포 ver 와 다르면 서버가 outdated 를 1회 emit (v 없으면 무시) |

## 최종 다듬기 (이 절이 위 표보다 우선)
시점은 한 가지로 통일합니다. 라벨은 "내", 문장은 주어를 생략합니다. RP.you('당신')는 3인칭 나열에 치환되므로 그대로 둡니다.

| 키 | 문구 | 비고 |
|---|---|---|
| T.body.youWin / youLose | 승리했습니다. / 패배했습니다. | 옆에 도장이 붙음 |
| T.body.teamMoved | ${from} 카드가 밤사이 바뀌어 ${team:으로/로} 넘어갔습니다. | ${team} 은 이미 "팀"으로 끝남 |
| T.body.heroWolf | 처형되지 않은 늑대인간 · ${n} | 신규 |
| T.body.heroKey | 승부를 가른 카드 · ${n} | |
| T.body.heroDeadMe | 나 · 처형 | |
| T.body.voteTo / noVote / got | ${n}에게 투표 / 투표 안 함 / ${n}표 받음 | 신규 |
| T.body.dayTalk | 토론 중입니다. 투표할 준비가 되면 버튼을 누르세요. | |
| T.body.dayReadyWait | 준비를 마쳤습니다. 다른 사람을 기다리고 있습니다. | 신규 |
| T.body.raised | 준비 ${r}/${n} · 모두 준비하면 바로 투표합니다. | |
| T.body.deckCount | 카드 ${total}/${need}장 (가운데 3장 포함) | lack, deckLack 삭제 |
| T.body.yourCardIs | 내 카드는 ${r}입니다. | |
| T.body.yourCard | 역할이 아직 가려져 있습니다. | |
| T.body.whoCopy | 이제 이 역할로 행동합니다. | |
| T.body.awakeTab | ● 내 차례 | |
| T.body.reload | 새로고침하기 | |
| T.msg.stole | ${t}의 카드를 훔쳤습니다. 새 카드는 ${r}입니다. | |
| T.msg.townFull | 방이 가득 찼습니다. (최대 10명) | |
| T.replay.pro.bot | 내 시작 카드는 ${r}입니다. 가운데 카드: ${list} | |
| T.replay.cause.rob / drunk | ${t}의 카드를 가져왔습니다. / 내 카드를 ${P:과/와} 바꿨습니다. | |
| T.replay.dawn.bot | 카드가 바뀐 자리: ${list} | |
| T.replay.dawn.seat.same | ${a:은/는} 같은 역할의 카드를 받았습니다: ${to}. | 신규. 같은 역할 이름일 때 |
| T.replay.uiR.mine | 내 행동 | 신규. 리플레이 중 "내 차례" 도장 대체 |
| T.replay.why.wolf_lived | 늑대인간 ${list:은/는} 끝까지 정체를 숨겼습니다. | |
| T.replay.why.wolf_lived_you | 늑대인간인 당신은 끝까지 정체를 숨겼습니다. | |
| T.replay.why.no_death | 처형된 사람이 없고 늑대인간도 없어 마을 팀이 승리했습니다. | |
| T.replay.uiR.stayed | 바뀌지 않음 | |
| T.replay.uiR.hop.drunkCenter | 주정뱅이 ${a:이/가} 가져감 | |

## 최종 정리 (strings.js와 일치)

화면에서 본인을 가리킬 때는 "당신" 대신 "나/내"를 씁니다. 은/는, 을/를, 와/과, 의는 "나"에 그대로 맞고, 이/가는 "내가"여야 하므로 이/가 자리에는 "나"를 넣지 않습니다.

| 키 | 문구 | 비고 |
|---|---|---|
| T.altar | 가운데 1번 카드 / 가운데 2번 카드 / 가운데 3번 카드 | "가운데 3번 카드와 바꿨습니다". altarShort(가운데 1)는 그대로 |
| T.replay.uiR.hop.drunkCenter | ${a:이/가} 가져감 | a에 이미 역할 이름이 붙어 있어 "주정뱅이"를 중복하지 않습니다 |
| T.replay.you | 나 | 도장, 좌석, 리플레이 이름 자리 |
| T.body.lone / T.msg.packAlone | 늑대인간은 나 혼자입니다. | |
| T.msg.nowCard | 내 현재 카드는 ${r}입니다. | |
| T.msg.copied | ${t}의 카드는 ${r}입니다. 이제 나는 ${r}입니다. | |
| T.msg.drunkSwapped | ${pos:과/와} 내 카드를 바꿨습니다. 새 카드는 볼 수 없습니다. | |
| T.replay.why.wolf_lived_you | 늑대인간인 나는 끝까지 정체를 숨겼습니다. | |
| T.replay.why.wolf_died_you | 늑대인간인 내가 처형되었습니다. | |
| T.replay.why.tanner_blocked | 무두장이 ${t}의 처형으로 늑대인간 팀은 승리하지 못했습니다. | 이/가를 쓰면 "나가"가 되어 의로 바꿨습니다 |
| T.replay.why.no_wolf_tanner | 무두장이 ${t}의 처형으로 무두장이만 승리했습니다. | 위와 같음 |
| T.replay.self.doppel | 내 도플갱어 카드는 ${r:을/를} 복사했습니다. | |
| T.replay.cause.robbed | ${role} ${a:이/가} 내 카드를 가져갔습니다. | |
| T.replay.cause.swapped | ${role} ${a:이/가} 내 카드를 ${t}의 카드와 바꿨습니다. | |
| T.body.yourCard | 내 카드를 확인하세요. | |
| T.body.dayTalk | 준비가 되면 투표 준비하기를 눌러 주세요. | 버튼 btn.ready = 투표 준비하기 |
| T.body.raised | 준비 ${r}/${n} · 모두 준비하면 투표가 시작됩니다. | |
| T.body.pickExec | 처형할 사람을 고른 뒤 투표하기 버튼을 길게 누르세요. | |
| T.body.heroWolf | 살아남은 늑대인간 | 이름은 result.js가 별도 줄로 붙입니다 |
| T.body.heroKey | 승부를 가른 카드 | 위와 같음 |
| T.replay.vote.allNone | 모두 투표하지 않아 아무도 처형되지 않았습니다. | 아무도 투표하지 않았을 때. 표가 있었지만 2표 이상이 없으면 vote.one |
| T.body.leftAway | 자리를 오래 비워 방에서 나왔습니다. | 대기실에서 오래 자리를 비워 제외된 뒤 다시 들어올 때 cannotReturn 대신 표시 |


## 최종 문구 수정 (카드 확인, 낮, 밤 정보)

| 키 | 문구 |
|---|---|
| T.body.yourCard | 카드를 받았습니다. |
| T.body.holdHint | 카드를 길게 누르면 역할이 보입니다. |
| T.body.checkBand | 주변 사람에게 화면이 보이지 않게 하세요. |
| T.body.dayTalk | 토론이 끝나면 아래 버튼을 눌러 주세요. |
| T.body.dayReadyWait | 다른 사람을 기다리는 중입니다. |
| T.body.raised | 준비 ${r}/${n} · 모두 준비하면 투표를 시작합니다. |
| T.body.seenLine | 내 카드: ${t} |
| (낮 한 줄) | 강도/불면증환자/도플갱어는 seenLine 뒤에 T.body.whoFrom / whoWoke / whoCopied 를 " · " 로 덧붙인다 (예산 때문에 별도 문구 키를 두지 않음) |
| T.body.dockMaybe | 바뀌었을 수 있음 |
| T.body.teamMoved | 밤사이 카드가 바뀌어 ${team} 소속이 되었습니다. |
| T.btn.judgeNow | 바로 투표 시작하기 |
| T.phase.awake | 눈을 뜨세요. |
| T.body.waitMore | 시작하려면 ${need}명이 더 필요합니다. |

## Final fixes: server+strings (latest, supersedes earlier rows)

| Key | Final |
|---|---|
| T.body.dockMaybe | 바뀌었을 수도 |
| T.replay.note.wake | 카드가 바뀌었어도 처음 역할대로 깨어났습니다. |
| T.replay.cause.robbed | ${role} ${a:이/가} 내 카드를 가져가고 ${r} 카드를 남겼습니다. |
| T.replay.cause.swapped | ${role} ${a:이/가} 내 자리의 카드를 ${t}의 ${r} 카드와 바꿨습니다. |
| T.replay.vote.topNone | 아무도 투표하지 않았습니다. |
| T.replay.self.end / diff / blind | 용어를 '마지막 카드'에서 '최종 카드'로 통일 |
| T.body.pickExec | 처형할 사람을 고르고 투표하기를 길게 누르세요. |
| T.body.deckNote | 카드는 인원수보다 3장 많아야 합니다. 남는 3장은 가운데에 놓입니다. |
| T.body.teamMoved | 밤사이 카드가 바뀌어 ${team:이/가} 되었습니다. |
| T.replay.why.wolf_lived_you | 늑대인간 카드를 가진 나는 끝까지 정체를 들키지 않았습니다. |
| chat error code | night / fast (서버 응답 code 필드) |
| T.body.troublemakerSub | 바꿀 플레이어 두 명을 선택하세요. 바뀐 카드는 볼 수 없습니다. |
| T.body.robberSub | 훔칠 플레이어를 선택하세요. 훔친 카드는 바로 봅니다. |
| T.body.doppelSub | 복사할 플레이어를 선택하세요. 그 사람의 역할이 됩니다. |
| T.body.voteRule | 2표 이상 받은 사람이 없으면 아무도 처형되지 않고, 동점이면 모두 처형됩니다. |
| T.body.raised | 준비 ${r}/${n} · 모두 준비하면 투표합니다. |
| T.body.masonWarn | 프리메이슨은 2장을 함께 넣어야 합니다. |
