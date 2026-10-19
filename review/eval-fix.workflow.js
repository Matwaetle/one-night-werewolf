export const meta = {
  name: 'werewolf-evaluate-fix',
  description: '자동 촬영 도구 → 평가 5 + 성능 3 → Sonnet 수정(파일 소유권별) → 재촬영·재평가',
  phases: [
    { title: 'Capture', detail: 'puppeteer-core + 로컬 Edge로 한 판 전체 자동 촬영·성능 측정', model: 'sonnet' },
    { title: 'Evaluate', detail: '평가 5 + 성능 3' },
    { title: 'Fix', detail: 'Sonnet 수정 (파일 그룹별 병렬)', model: 'sonnet' },
    { title: 'Verify', detail: '테스트·예산·재촬영', model: 'sonnet' },
    { title: 'Re-evaluate', detail: '평가 5 재채점' },
  ],
}

const BASE = `PROJECT: "한밤의 늑대인간" (One Night Ultimate Werewolf online, Korean UI). Repo = current working directory (Windows, Git Bash, Node 24). Design source of truth: design/DESIGN_SPEC.md (concept 「피의 판화」: 1510s German woodcut, ink/bone/blood only, menacing, single light). KOREAN COPY HAS BEEN REDECIDED BY THE OWNER: the old terse village-elder 반말 voice is rejected. The new final copy deck is design/COPY_DECK.md — every action button ends in noun form "-기" (방 만들기, 참가하기, 건너뛰기, 투표하기), all instructions/narration in polite 존댓말 ("당신의 카드는 늑대인간입니다.", "카드를 길게 눌러 확인하세요."), professional localized-game wording, terms 카드/가운데 카드/방 코드/방장/대기실/투표/규칙. Screenshots still show the OLD copy — do not report old-voice strings individually; the copy deck will be applied in the Fix phase. Code: server.js, public/strings.js, public/roles.js, public/index.html, public/css/{base,card,screens,replay}.css, public/js/{app,art,fx,replay}.js, tools/*.mjs|js (stamp build, image pipeline, budget checks), test/{sim,replay,smoke}.js. Owner's real art is applied (public/img/*.webp). Owner requirements: must feel 살벌 and like a professional game (not an AI web template), card design extremely high quality, no filler copy, must work on ~1 MB/s flaky mobile data, post-game replay must make clear exactly what happened at night.`

// 촬영 도구는 이미 완성됨 (tools/capture.mjs, review/shots 109장, review/metrics.json)
const cap = args.capture

const SEED = `Lead's own observations from a manual playthrough on 375x812 (verify, then include if real):
1) While asleep at night the screen is 100% black (eyelids fully closed over everything) — players cannot even see the narration of whose turn it is; feels broken rather than tense.
2) Day: the "날이 밝았다." title and its subtitle overlap the three center altar cards.
3) Final board: verdict sentence text over the verdict art has low contrast.
4) Final board: the "그 밤을 다시 본다" button overlaps the record list.
5) Replay: the enlarged card covers a seat token; red vote lines appear during night beats.
6) The lobby start button has class "hold" but no data-hold, so it is a plain click (check spec intent).`

const FIND = { type: 'object', properties: { score: { type: 'number', description: '1-10 overall in your lens' }, summary: { type: 'string' }, findings: { type: 'array', items: { type: 'object', properties: {
  severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
  title: { type: 'string' }, evidence: { type: 'string', description: 'screenshot file / metric / code location' },
  fix: { type: 'string', description: 'concrete fix with exact values/strings' },
  files: { type: 'array', items: { type: 'string' } } }, required: ['severity', 'title', 'fix', 'files'] } } }, required: ['score', 'summary', 'findings'] }

const LENSES = [
  ['평가:아트', 'Art director (AAA dark-fantasy): does every screen look premium and menacing — or still like a web template? Card quality, typography, composition, lighting, texture, consistency with the woodcut art. Be specific per screenshot.'],
  ['평가:초보자', 'First-time player in a voice call who never played One Night: can you understand what to do on each screen, what happened at night from the replay, and why you won/lost? Where were you confused?'],
  ['평가:모바일', 'Mobile UX specialist: 375x812 and 360x640 — tap targets, thumb reach, overlaps, clipping, text size, hold/peek gestures, chat sheet, scroll traps, safe areas.'],
  ['평가:카피', 'Korean game localization reviewer: review design/COPY_DECK.md (the new copy) against the owner rules (-기 buttons, polite 존댓말, natural professionally localized wording, no AI-sounding text) and against the layouts in the screenshots (will each new string fit its button/band at 375px?). Also find Korean strings in code that COPY_DECK.md missed. Fixes go to the files that hold the strings.'],
  ['평가:리플레이', 'Replay/post-game specialist: the owner insists players must clearly see what happened at night after the game. Judge the replay beats and final board: clarity of each action, card movement readability, pacing, controls, and drama.'],
  ['성능:네트워크', 'Network performance on 1 MB/s / 300ms RTT: read review/metrics.json, check-budget output (run npm run check:budget and npm run check:waterfall), image/font/JS weights, caching, service worker, cold start on Render free tier.'],
  ['성능:런타임', 'Runtime performance on low-end Android (6x CPU throttle): long tasks, layout thrash, re-render strategy in public/js/app.js, animation properties (transform/opacity only), number of layers, image decode cost, memory during replay.'],
  ['성능:안정성', 'Resilience: flaky connections, reconnect during night/vote/result, server restart, duplicate actions, tab backgrounding, slow image loads (game must be fully playable with images blocked), and console errors in metrics.'],
]

phase('Evaluate')
const evals = await parallel(LENSES.map(([k, lens]) => () => agent(`${BASE}

Capture tool report:\n${cap}

YOUR LENS — ${k}: ${lens}
Look at the screenshots in review/shots/ (use the Read tool on PNG files; look at many of them), review/metrics.json, and the relevant code. ${SEED}
Return findings ranked by severity with concrete fixes (exact CSS values / strings / code changes) and the files to change. Max 12 findings.`, { label: k, phase: 'Evaluate', schema: FIND })))

const all = []
evals.forEach((e, i) => { if (e) e.findings.forEach((f) => all.push({ ...f, by: LENSES[i][0] })) })
log(`발견 ${all.length}건 (critical ${all.filter(f => f.severity === 'critical').length}, major ${all.filter(f => f.severity === 'major').length})`)

// 파일 소유권 그룹으로 나눠 충돌 없이 병렬 수정
const GROUPS = [
  { key: 'server+strings', match: /server\.js|strings\.js|roles\.js|test\/|COPY_DECK|DESIGN_SPEC/, owns: 'server.js, public/strings.js, public/roles.js, test/*, design/DESIGN_SPEC.md (only §10 copy sections: replace the voice principle §10.0 with the new rules and point §10 to design/COPY_DECK.md as the source of truth)' },
  { key: 'app', match: /js\/app\.js|index\.html|base\.css/, owns: 'public/js/app.js, public/index.html, public/css/base.css' },
  { key: 'screens+cards', match: /screens\.css|card\.css|js\/art\.js|js\/fx\.js/, owns: 'public/css/screens.css, public/css/card.css, public/js/art.js, public/js/fx.js' },
  { key: 'replay', match: /replay\.(js|css)/, owns: 'public/js/replay.js, public/css/replay.css, test/replay.js' },
  { key: 'tools+sw', match: /tools\/|sw\.js|render\.yaml|package\.json/, owns: 'tools/*, public/sw.js, render.yaml, package.json' },
]
const byGroup = GROUPS.map((g) => ({ g, items: all.filter((f) => (f.files || []).some((x) => g.match.test(x))) }))
const unassigned = all.filter((f) => !GROUPS.some((g) => (f.files || []).some((x) => g.match.test(x))))
if (unassigned.length) log(`그룹 미배정 ${unassigned.length}건 → app 그룹에 포함`)
byGroup[1].items.push(...unassigned)

phase('Fix')
const fixes = await parallel(byGroup.filter((x) => x.items.length || ['server+strings', 'app', 'replay'].includes(x.g.key)).map(({ g, items }) => () => agent(`${BASE}

You are a Sonnet fixer for the file group "${g.key}". You may edit ONLY: ${g.owns}. Other fixers are editing the other files right now. If a finding needs a change in a file you do not own, implement only your part and report the rest.
COPY DECK (mandatory): apply EVERY row of design/COPY_DECK.md whose location is in your owned files (strings.js keys, roles.js desc/NIGHT_TEXT/TEAM_NAME, server.js texts, index.html hard-coded text and aria-labels, app.js / replay.js hard-coded Korean and the new keys it lists such as T.btn.deck at app.js and T.replay.ui.unknown at replay.js). Owner decision: for names whose josa cannot be determined (Latin etc.) use the bracket form 이(가), 을(를), 은(는), 와(과) instead of " —". Keep all template placeholders working. Grep your files afterwards: no 반말 command forms, buttons end in -기.
Reviewer findings assigned to your group (some also list other files — only do your part). Triage: fix every critical and major one; fix minor ones when cheap. Verify a finding against the code before fixing; skip invalid ones with a reason. Keep the spec's hard rules (no emoji, no confirm/alert, transform/opacity animations, budgets: game.js ≤22KB br is nearly full — if you add JS, remove or simplify something else; replay ≤12KB br). Run node --check on changed JS. Do not commit; do not leave servers running.
FINDINGS:\n${JSON.stringify(items, null, 1)}
Return: fixed (by title), skipped with reason, cross-file requests.`, { label: `수정:${g.key}`, phase: 'Fix', model: 'sonnet' })))

phase('Verify')
const ver = await agent(`${BASE}

All fixers are done (reports below). As integration lead you may edit any file. 1) npm test, npm run smoke, node tools/stamp.js, npm run check:budget, npm run check:waterfall — make all pass (fix regressions; respect budgets). 2) Implement any cross-file requests the fixers left, and grep ALL of public/, server.js for leftover old-voice copy (반말 commands like "-라.", "-다." status lines from the old deck, old terms 패/제단/표식/촌장/모닥불/심판/법도) and fix per design/COPY_DECK.md. 3) Re-run the font subset (npm run subset; it may exit 127 on Windows after writing files — check the output files) so all new display strings are in the fonts, then stamp + budgets again. 4) Re-run npm run capture to refresh review/shots and review/metrics.json — it takes ~10 minutes, so run it in the background (Bash run_in_background) and wait for it to finish; do not run it in the foreground. Return a report with results and numbers.
FIXER REPORTS:\n${fixes.filter(Boolean).join('\n\n---\n\n')}`, { label: '통합 검증', phase: 'Verify', model: 'sonnet' })

phase('Re-evaluate')
const SCORE = { type: 'object', properties: { score: { type: 'number' }, improved: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, title: { type: 'string' }, fix: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['severity', 'title', 'fix'] } } }, required: ['score', 'improved', 'remaining'] }
const re = await parallel(LENSES.slice(0, 5).map(([k, lens]) => () => agent(`${BASE}

YOUR LENS — ${k}: ${lens}
Re-review the refreshed screenshots in review/shots/ and the code after fixes. Your earlier score in this lens was ${(evals[LENSES.findIndex(l => l[0] === k)] || {}).score ?? 'n/a'}. Give a new 1-10 score, what improved, and the remaining problems (ranked, with concrete fixes). Be strict.`, { label: `재평가:${k}`, phase: 'Re-evaluate', schema: SCORE })))

return {
  before: evals.map((e, i) => e && { lens: LENSES[i][0], score: e.score, summary: e.summary }),
  after: re.map((r, i) => r && { lens: LENSES[i][0], score: r.score, improved: r.improved, remaining: r.remaining }),
  verify: ver,
}
