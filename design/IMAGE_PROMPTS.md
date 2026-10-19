# 이미지 생성 프롬프트 — 한밤의 늑대인간 「피의 판화」 (2차 개정)

## 사용 방법 (먼저 읽어 주세요)

1. **한 장마다 새 대화를 여세요.** 한 대화에서 여러 장을 만들면 5~6장째부터 그림체가 흐트러지고, 앞 그림의 소재가 다음 그림에 섞여 들어갑니다.
2. **순서를 지키세요.**
   - 맨 먼저 `card-werewolf.png`(늑대인간)를 만들어 마음에 드는 한 장을 고릅니다. 이것이 **카드 기준 이미지**입니다.
   - 배경류(검은 판에 흰 선)는 `card-back.png`를 먼저 만들어 고릅니다. 이것이 **배경 기준 이미지**입니다.
3. **두 번째 카드부터는 새 대화에 기준 이미지를 첨부하고** 프롬프트를 붙여 넣으세요. 카드 2~12번과 배경 3~6번 프롬프트는 맨 앞에 기준 이미지 안내 문장이 이미 들어 있습니다.
   - 카드 2~12번 → `card-werewolf.png` 첨부
   - `key-home`, `bg-horizon`, `verdict-*` → `card-back.png` 첨부
4. 각 프롬프트는 **통째로 복사해서 붙여 넣으면 됩니다.** 스타일 문구가 이미 안에 들어 있습니다.
5. **비율을 꼭 지정하세요.** 카드와 뒷면은 **1024×1536 세로**, 배경류는 **1536×1024 가로**입니다.
6. **PNG로 저장**하고, 아래 표의 **파일명 그대로** 이름을 바꿔서 주세요. (예: `card-seer.png`)
7. 한 장당 2~4번 다시 뽑는 건 정상입니다. 아래 **버려야 하는 경우**에 하나라도 걸리면 다시 뽑아 주세요.
8. 색을 정확히 맞추려고 애쓰지 않아도 됩니다. 사이트에 넣을 때 스크립트가 모든 그림을 **똑같은 검정·종이색·피색 세 가지**로 다시 찍어 냅니다. 피색이 **한 곳에만** 있는지만 보면 됩니다.

### 버려야 하는 경우 (재생성)
- 그림 안에 **글자·숫자·서명 비슷한 것**이 있다
- **테두리·액자·카드 틀**이 그려져 있다 (틀은 사이트가 직접 그립니다)
- **가장자리가 밝은 빈 종이**로 남아 있다 (가운데만 그려지고 주변이 종이색으로 흐려지는 "빈티지 삽화" 느낌) → 이 디자인에서 가장 싸 보이는 실패입니다
- 화면의 **절반 이상이 검정**이 아니다 (카드). 어둠 속에서 빛이 인물을 파내야 합니다
- 카드인데 **아래쪽 약 1/5이 가장 어둡지 않다**, 또는 거기에 얼굴·손 같은 중요한 것이 있다 (이름 띠가 그 위에 올라갑니다)
- 머리가 위 가장자리에 붙어 있다, 또는 얼굴이 화면을 꽉 채운다 (머리는 그림 높이의 약 1/7)
- 휴대폰에서 **엄지손톱만 하게 줄여 봤을 때** 무엇인지 모르겠다 (식별 소품이 커다랗게 보여야 합니다)
- 선이 **머리카락처럼 가늘고 촘촘한 망사 해칭**이다, 또는 종이 얼룩·잡티가 많다 (용량이 커지고 작게 보면 회색 덩어리가 됩니다)
- 피색이 **지정한 한 곳 외에** 보인다, 또는 회색 그라데이션·주황·파랑·금색이 보인다
- 손가락 개수·모양이 이상하다 (강도·말썽쟁이·예언자·사냥꾼은 특히 확인)
- 두 사람이 나오는 카드(도플갱어·프리메이슨)에서 두 얼굴이 뭉개져 하나로 붙었다

### 우선순위
| 등급 | 뜻 | 자산 |
|---|---|---|
| **필수** | 이게 있어야 새 디자인이 완성됨 | 역할 카드 12장, 카드 뒷면, 홈 키아트 (총 14장) |
| **권장** | 게임 중 화면의 분위기를 크게 올림 (없어도 동작) | 배경 지평선 1장 |
| **선택** | 결말 화면 배경 (없어도 검은 띠와 큰 글자만으로 완성) | 결말 3장 |

### 막힐 때
- **무두장이가 거절되면** 피사체 문장의 `holding a hangman's noose` 를 `holding out a coiled rope with a hangman's knot` 로 바꿔 보세요.
- **늑대인간이 거절되면** `near-naked` 를 `barefoot, in a torn linen shirt` 로 바꿔 보세요.
- **가장자리가 자꾸 밝은 종이로 남으면** 끝에 `Fill the entire frame edge to edge with black ink.` 를 덧붙이세요.
- **선이 너무 가늘고 촘촘하면** 끝에 `Fewer, bolder lines. Carve with a wide knife.` 를 덧붙이세요.
- **그림이 회화처럼 나오면** 끝에 `Carved woodblock print, hard knife-cut lines, no brushstrokes.` 를 덧붙이세요.
- **피색이 여기저기 번지면** 끝에 `Red appears in exactly one place.` 를 덧붙이세요.

---

## 공통 스타일 블록 (참고용 — 아래 각 프롬프트에 이미 들어 있음)

**R. 기준 이미지 문장 (카드 2~12, 배경 3~6번 맨 앞)**
> Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

**A. 카드용 (종이 위 검은 잉크, 어둠이 지배)**
> Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

**A-2. 카드 구도 규칙**
> Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

**B. 뒷면·배경용 (검은 판에 흰 선 — 화이트라인 목판화)**
> Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

**N. 끝 문장 (모든 프롬프트 맨 끝)**
> The image contains only the picture: no lettering, no border, no frame.

---

## 전체 목록

| # | 파일명 | 용도 | 생성 크기 | 첨부할 기준 | 등급 |
|---|---|---|---|---|---|
| 1 | `card-werewolf.png` | 역할 카드: 늑대인간 (★ 카드 기준 — 가장 먼저) | 1024×1536 | 없음 | 필수 |
| 2 | `card-doppelganger.png` | 역할 카드: 도플갱어 | 1024×1536 | card-werewolf | 필수 |
| 3 | `card-minion.png` | 역할 카드: 하수인 | 1024×1536 | card-werewolf | 필수 |
| 4 | `card-mason.png` | 역할 카드: 프리메이슨 | 1024×1536 | card-werewolf | 필수 |
| 5 | `card-seer.png` | 역할 카드: 예언자 | 1024×1536 | card-werewolf | 필수 |
| 6 | `card-robber.png` | 역할 카드: 강도 | 1024×1536 | card-werewolf | 필수 |
| 7 | `card-troublemaker.png` | 역할 카드: 말썽쟁이 | 1024×1536 | card-werewolf | 필수 |
| 8 | `card-drunk.png` | 역할 카드: 주정뱅이 | 1024×1536 | card-werewolf | 필수 |
| 9 | `card-insomniac.png` | 역할 카드: 불면증환자 | 1024×1536 | card-werewolf | 필수 |
| 10 | `card-villager.png` | 역할 카드: 마을주민 | 1024×1536 | card-werewolf | 필수 |
| 11 | `card-hunter.png` | 역할 카드: 사냥꾼 | 1024×1536 | card-werewolf | 필수 |
| 12 | `card-tanner.png` | 역할 카드: 무두장이 | 1024×1536 | card-werewolf | 필수 |
| 13 | `card-back.png` | 카드 뒷면 (★ 배경 기준 — 배경류 중 가장 먼저) | 1024×1536 | 없음 | 필수 |
| 14 | `key-home.png` | 홈 화면 키아트 (제목 배경) | 1536×1024 | card-back | 필수 |
| 15 | `bg-horizon.png` | 게임 중 배경 지평선 (밤·낮·심판 공용, 조명만 CSS로 바꿈) | 1536×1024 | card-back | 권장 |
| 16 | `verdict-wolf.png` | 결말 배경: 늑대 승리 | 1536×1024 | card-back | 선택 |
| 17 | `verdict-village.png` | 결말 배경: 마을 승리 | 1536×1024 | card-back | 선택 |
| 18 | `verdict-tanner.png` | 결말 배경: 무두장이 승리 | 1536×1024 | card-back | 선택 |

---

## 1. 역할 카드 12장 (전부 1024×1536 세로, 필수)

### 1-1. `card-werewolf.png` — 늑대인간 (★ 카드 기준 이미지 — 가장 먼저, 첨부 없음)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 늑대 머리 + 입에 문 죽은 양

```
Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a gaunt, near-naked man in a torn loincloth crouched on all fours in a village doorway at night. His body is fully human, with a knotted spine and long cracked nails, but his head is a wolf's head. He carries a dead lamb in his jaws. His eyes are lit and fixed on the viewer. Blood-red only on the lamb's throat.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-2. `card-doppelganger.png` — 도플갱어 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 코를 맞댄 똑같은 두 얼굴

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: two identical gaunt men in the same torn coat standing face to face in profile, nose to nose, in a dark lane. Their two faces are clearly separate. One of them is smiling slightly, the other is terrified. Blood-red only on the smiling one's lips.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-3. `card-minion.png` — 하수인 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 위에서 내려오는 거대한 늑대 발

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a gaunt kneeling servant in a ragged hooded cloak, head tilted up in devotion, eyes rolled back, lips pressed to a huge clawed wolf paw that reaches down out of the darkness from the upper right. A broken iron collar hangs around the servant's neck. Wretched and fanatical. Blood-red only on two small puncture wounds on the neck.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-4. `card-mason.png` — 프리메이슨 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 맞잡은 두 손, 망치와 정

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: two hooded stonemasons in leather aprons standing shoulder to shoulder, faces hidden in the shadow of deep hoods. Each holds a mallet in his outer hand. Their inner hands are clasped tightly together at the centre of the image in a blood oath. Mirror-symmetrical, watchful, silent. Blood-red only on fresh cuts across both clasped palms.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-5. `card-seer.png` — 예언자 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 검은 물 대야 + 촛불

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a hollow-cheeked woman leaning over a wide bowl of black water by the light of a single candle. The reflection in the water is not her face but a wolf's face looking back up at her. Blood-red only on the candle flame.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-6. `card-robber.png` — 강도 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 쇠 열쇠 꾸러미 + 낮게 든 칼

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a masked thief bending over a sleeping man, lifting the man's large iron key-ring off his chest with one hand, a knife held low in the other. The thief's eyes, above the cloth mask, are on the viewer. Blood-red only on the knife edge.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-7. `card-troublemaker.png` — 말썽쟁이 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 바꿔치기 중인 두 요람

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a smiling woman with wild tangled hair, one finger to her lips, swapping two swaddled babies between two wooden cradles in the dark, the changeling legend. One baby is lifted in her arm, the other lies in the far cradle. Blood-red only on a ribbon tied in her hair.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-8. `card-drunk.png` — 주정뱅이 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 우물 + 두레박

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a bloated drunk on his knees at a stone well at night, drinking straight from the wooden bucket. In the water below, his reflection is someone else's face. Blood-red only on the wine dripping from his chin.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-9. `card-insomniac.png` — 불면증환자 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 거의 다 탄 초 + 부릅뜬 눈

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a pale emaciated woman sitting bolt upright in bed in the dark, clutching a rough blanket up to her chin with both hands, eyes wide open with heavy dark rings, staring straight at the viewer. Beside her head, a tall candle burned almost to the stub. Blood-red only on the raw rims of her eyes.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-10. `card-villager.png` — 마을주민 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 쇠스랑 + 등불

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a frightened peasant man in a rough wool tunic and cap, gripping a pitchfork upright in one hand and a small iron lantern in the other, glancing back over his shoulder into the darkness. Sweat on the brow. Ordinary and doomed. Blood-red only on the lantern flame.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-11. `card-hunter.png` — 사냥꾼 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 어깨에 멘 석궁 + 늑대 가죽 두건

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a grim scarred hunter with a short beard in three-quarter view, a loaded crossbow resting on his shoulder. He wears a wolf pelt as a hood, the wolf's upper jaw over his brow. A string of wolf teeth hangs around his neck. Blood-red only on the bolt tip.

The image contains only the picture: no lettering, no border, no frame.
```

### 1-12. `card-tanner.png` — 무두장이 (card-werewolf 첨부)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 식별 소품: 두 손으로 내미는 올가미

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density, black-to-paper ratio, head size and framing. Do not copy its subject.

Early-16th-century German chiaroscuro woodcut in the manner of Hans Baldung Grien's "Witches' Sabbath" (1510) and Dürer's Apocalypse series: virtuoso knife-cut lines, swelling and tapering strokes, bold widely spaced parallel hatching that follows the form, deep solid blacks, carved highlights. Master-printmaker quality, museum print-room plate, not a modern linocut. Black ink on warm off-white paper, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no fine crosshatching, no paper texture, no specks. Grim, cold, menacing.

Full-bleed vertical composition: the background is heavy black ink, at least half of the image is solid black, and the subject is carved out of the darkness by one hard light from the upper left. No paper margins. The top of the head sits 18% below the top edge. The head is about one-seventh of the image height. Everything important stays inside the central 70% of the width. The bottom 20% is dense black, darker than the rest, with no important detail. The subject must still read instantly as a clear lit shape against the black when shrunk to 64 pixels wide, with one bold identifying prop, large and clearly separated from the background.

Subject: a gaunt tanner in a stained leather apron standing among stretched animal hides hanging on wooden frames. He holds a hangman's noose out toward the viewer with both hands, like a gift, with a calm faint smile. Blood-red only on his raw hands.

The image contains only the picture: no lettering, no border, no frame.
```

---

## 2. 공용 이미지 (검은 판에 흰 선)

### 2-1. `card-back.png` — 카드 뒷면 (★ 배경 기준 이미지 — 첨부 없음)
- 크기: **1024×1536 (세로)** · 등급: 필수
- 참고: 사이트에 넣을 때 왼쪽 절반을 거울처럼 복사해 완벽한 좌우 대칭으로 만듭니다. 왼쪽 절반만 잘 나오면 됩니다.

```
Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

Vertical emblem that still reads clearly when shrunk to 40 pixels wide. Subject: a single frontal wolf's head, perfectly bilaterally symmetrical, carved in off-white line out of solid black, ears up, eyes narrow slits, filling the central 60% of the image. Plain solid black margin all around it. Blood-red only in the two eye slits.

The image contains only the picture: no lettering, no border, no frame.
```

### 2-2. `key-home.png` — 홈 화면 키아트 (card-back 첨부)
- 크기: **1536×1024 (가로)** · 등급: 필수
- 참고: 휴대폰에서는 가운데 세로 띠만 보이고, 데스크톱에서는 위 10%와 아래 15%가 잘립니다.

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density and black-to-white ratio. Do not copy its subject or composition.

Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

Wide landscape. All key elements sit inside the central 40% of the width. The upper 40% is black night sky with a pale moon, and the bottom 15% is solid black. Subject: looking straight down a narrow lane of crooked timber houses at night, every shutter nailed shut. Far down the lane, small, a tall gaunt figure with a wolf's head stands perfectly still on two legs, facing the viewer, its long shadow reaching toward us. Blood-red only on a single handprint on one door.

The image contains only the picture: no lettering, no border, no frame.
```

### 2-3. `bg-horizon.png` — 게임 중 배경 지평선 (card-back 첨부)
- 크기: **1536×1024 (가로)** · 등급: 권장
- 참고: 아래 1/3 띠만 사용합니다.

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density and black-to-white ratio. Do not copy its subject or composition.

Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

Wide landscape. The upper 65% is completely empty solid black. All detail sits in the bottom 35% as a horizontal frieze, low contrast and quiet, because interface elements will sit on top of it. Subject: a jagged line of dead pine trees, a few crooked village roofs, a church spire on the left and a small wooden gallows on the right, all as a dark silhouette strip with off-white carved edges. Between the tree trunks, three tiny pairs of eyes. Blood-red only on those tiny eyes.

The image contains only the picture: no lettering, no border, no frame.
```

### 2-4. `verdict-wolf.png` — 결말 배경: 늑대 승리 (card-back 첨부)
- 크기: **1536×1024 (가로)** · 등급: 선택

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density and black-to-white ratio. Do not copy its subject or composition.

Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

Wide landscape. The central horizontal band, from 35% to 65% of the height, is calm, dark and low in detail, because a large title will sit across it. Subject: an empty village square at night, an overturned lantern and torn cloth on the ground, and on the wooden gallows platform a wolf throwing its head back and howling at the moon. No gore. Blood-red only on a dark stain on the ground.

The image contains only the picture: no lettering, no border, no frame.
```

### 2-5. `verdict-village.png` — 결말 배경: 마을 승리 (card-back 첨부)
- 크기: **1536×1024 (가로)** · 등급: 선택

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density and black-to-white ratio. Do not copy its subject or composition.

Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

Wide landscape. The central horizontal band, from 35% to 65% of the height, is calm, dark and low in detail, because a large title will sit across it. Subject: dawn over an empty village square. A wolf pelt is nailed to the church door. Villagers, seen from behind, walk away in silence. Blood-red only on the nails.

The image contains only the picture: no lettering, no border, no frame.
```

### 2-6. `verdict-tanner.png` — 결말 배경: 무두장이 승리 (card-back 첨부)
- 크기: **1536×1024 (가로)** · 등급: 선택

```
Use the attached image strictly as a style and scale reference: same line weight, hatching density and black-to-white ratio. Do not copy its subject or composition.

Early-16th-century German woodcut in the manner of Hans Baldung Grien and Dürer's Apocalypse series, printed as a white-line woodcut: the block is almost entirely solid black, and the subject is carved out of the black as off-white lines and bold, widely spaced hatching, like a night scene cut into a black wooden block. Virtuoso knife-cut lines, swelling and tapering strokes, carved highlights. Master-printmaker quality, not a modern linocut. Off-white lines on black, with a single small area of dark blood-red ink, nowhere else. Flat print, no brushwork, no grey tones, no glow, no fine crosshatching, no specks. Grim, cold, menacing.

Wide landscape. The central horizontal band, from 35% to 65% of the height, is calm, dark and low in detail, because a large title will sit across it. Subject: at dawn, an empty hangman's rope swaying from a lone wooden gallows, a folded leather apron left on the platform beneath it, and the villagers in the distance turning away in shock. Quiet, wry stillness, no body shown. Blood-red only on the folded apron.

The image contains only the picture: no lettering, no border, no frame.
```

---

## 만들지 않는 것 (요청하지 마세요)
- 로고 이미지: 제목은 폰트(Song Myung)로 씁니다. AI는 한글을 정확히 못 그립니다.
- 역할 아이콘·문양: SVG로 직접 그립니다.
- 종이 질감·노이즈 타일: 스크립트로 생성합니다.
- 카드 프레임·테두리·이름 띠: CSS로 그립니다.
- 같은 역할의 2번째 그림(늑대인간 2장, 마을주민 3장 등): 같은 그림을 재사용합니다.
