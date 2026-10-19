export const meta = {
  name: 'werewolf-night-cycle',
  description: '밤샘 개선 사이클: 재촬영 → 평가 5 + 성능 3 → Sonnet 수정 → 검증 (커밋·푸시 없음)',
  phases: [
    { title: 'Capture', model: 'sonnet' },
    { title: 'Evaluate' },
    { title: 'Merge' },
    { title: 'Fix', model: 'sonnet' },
    { title: 'Verify', model: 'sonnet' },
  ],
}
const R = (args && args.round) || 1
const BASE = `PROJECT: "한밤의 늑대인간" online (Korean). Repo = current working directory (Windows, Git Bash, Node 24). Specs: design/DESIGN_SPEC.md, design/FEATURES_SPEC.md, design/COPY_DECK.md (buttons end in -기, polite 존댓말, professional localized-game wording). Owner: 살벌, professional-game quality (never an AI template), extremely high-quality cards, ~1MB/s mobile data, replay/result must make clear what happened at night. Hard rules: no emoji, no confirm/alert, animations transform/opacity only, budgets in tools/check-budget.mjs must pass. NO git commit, NO git push. Never modify tools/capture.mjs. No servers left running. TIME LIMIT: fixers and the verifier must NOT run tools/capture.mjs, copies of it, or any puppeteer/browser measurement loops — reason from code, CSS and the existing screenshots; finish within ~20 minutes.`
const SCORE = { type: 'object', properties: { score: { type: 'number' }, good: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, title: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['severity', 'title', 'fix'] } } }, required: ['score', 'good', 'remaining'] }
const L = [
  ['아트', 'Art director: premium, menacing, consistent woodcut look on every screen; cards, typography, animations.'],
  ['초보자', 'First-time player in a voice call: clarity of every screen, night prompts with whose-card labels, result and replay.'],
  ['모바일·PC', 'Layout at 360x640, 375x812, 412x915 and 1280x800: overlaps, clipping, chat sheet, dock, safe areas.'],
  ['카피', 'Korean copy: -기 buttons, 존댓말, natural, concise, fits layouts; no AI-sounding text.'],
  ['리플레이·결과', 'Replay and result: what happened at night, card movements, verdict, final board, controls.'],
  ['성능:네트워크', 'Network on 1MB/s/300ms: budgets, review/metrics.json, lazy modules, caching, cold start.'],
  ['성능:런타임', 'Runtime on low-end Android (6x CPU): long tasks, animations, WebAudio cost, re-render strategy.'],
  ['성능:안정성', 'Resilience: reconnects, bad payloads, chat/reply edge cases, tab hidden, images blocked, console errors.'],
]
phase('Capture')
await agent(`${BASE}\n\nRun \`npm run capture\` ONCE in the background (Bash run_in_background; takes ~10 minutes) and wait for it to finish. Do not edit any file. Accept missing shots. Return the summary line it prints and the list of missed shots.`, { label: `R${R} 촬영`, phase: 'Capture', model: 'sonnet' })
phase('Evaluate')
const ev = await parallel(L.map(([k, lens]) => () => agent(`${BASE}\n\nDo NOT edit files. LENS — ${k}: ${lens}\nLook at many screenshots in review/shots/* (Read the PNGs), review/metrics.json and the code. Strict 1-10 score (8.5+ means genuinely shippable professional quality), what is good, remaining problems ranked with exact fixes and files. Max 8.`, { label: `R${R} 평가:${k}`, phase: 'Evaluate', schema: SCORE })))
const scores = ev.map((x, i) => x && { lens: L[i][0], score: x.score })
log('점수: ' + scores.filter(Boolean).map(s => `${s.lens} ${s.score}`).join(', '))
const all = []
ev.forEach((x, i) => x && x.remaining.forEach(r => all.push({ ...r, by: L[i][0] })))
const serious = all.filter(r => r.severity !== 'minor')
if (!serious.length && ev.filter(Boolean).every(x => x.score >= 8.5)) return { scores, done: true, findings: all }
phase('Merge')
const PLAN = { type: 'object', properties: { groups: { type: 'array', items: { type: 'object', properties: { key: { type: 'string', enum: ['server+strings', 'app+base', 'css+fx+replay', 'modules+tools'] }, tasks: { type: 'array', items: { type: 'string' } } }, required: ['key', 'tasks'] } } }, required: ['groups'] }
const plan = await agent(`${BASE}\n\nMerge these evaluator findings into exact, code-verified tasks (all critical+major, cheap minors), deduplicated. Groups: server+strings (server.js, public/strings.js, test/*, design/COPY_DECK.md), app+base (public/js/app.js, public/index.html, public/css/base.css), css+fx+replay (public/css/screens.css, card.css, replay.css, public/js/fx.js, replay.js, art.js), modules+tools (public/js/audio.js, public/js/chatx.js, public/css/chatx.css, tools/stamp.js, tools/check-budget.mjs — never tools/capture.mjs). Split cross-group fixes with clear contracts.\nFINDINGS:\n${JSON.stringify(all, null, 1)}`, { label: `R${R} 지적 통합`, phase: 'Merge', schema: PLAN })
const OWN = { 'server+strings': 'server.js, public/strings.js, test/*, design/COPY_DECK.md', 'app+base': 'public/js/app.js, public/index.html, public/css/base.css', 'css+fx+replay': 'public/css/screens.css, public/css/card.css, public/css/replay.css, public/js/fx.js, public/js/replay.js, public/js/art.js', 'modules+tools': 'public/js/audio.js, public/js/chatx.js, public/css/chatx.css, tools/stamp.js, tools/check-budget.mjs' }
phase('Fix')
const fixes = await parallel(plan.groups.filter(g => g.tasks.length).map(g => () => agent(`${BASE}\n\nSonnet fixer "${g.key}". Edit ONLY: ${OWN[g.key]}.\nTASKS:\n${g.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}\nnode --check changed JS. Return done / skipped / requests to other groups.`, { label: `R${R} 수정:${g.key}`, phase: 'Fix', model: 'sonnet' })))
phase('Verify')
const ver = await agent(`${BASE}\n\nIntegration lead (any file except tools/capture.mjs). Resolve cross-group requests; grep contracts. npm test, npm run smoke, node tools/stamp.js, npm run check:budget, npm run check:waterfall must ALL pass; run npm run subset if strings changed (may exit 127 on Windows after writing — check outputs). Do not run capture. Return results with numbers. No commit/push.\nFIX REPORTS:\n${fixes.filter(Boolean).join('\n\n---\n\n')}`, { label: `R${R} 검증`, phase: 'Verify', model: 'sonnet' })
return { scores, done: false, verify: ver, tasks: plan.groups }
