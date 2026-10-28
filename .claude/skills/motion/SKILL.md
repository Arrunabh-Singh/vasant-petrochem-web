---
name: motion
description: Change the home page's scroll film or any scroll-driven motion on Vasant Petrochem's site (styles/film.css, styles/motion.css, the film islands), keep it smooth on iPhones, and check it on Apple's browsers with the Apple rig. Use when changing the film's scenes, timing, snapping, chapter anchor or cues, adding a grade's frame, or when someone reports the site glitching, jumping or skipping on an iPhone, iPad or Mac.
---

# Motion

The brand book's "Motion" chapter (`design-system/README.md`) says what the film is. This skill is how it works, the rules that keep it smooth, and how to check a change.

## Where things are

| File | What it does |
| --- | --- |
| `site/src/styles/film.css` | The film: its scenes, its timing (`--fill-end`, `--scale-from`, `--scale-span` on `.vp-film`, and `--sfn`, `--ssn` as plain numbers), the pacing block (snap frames), the scale's links, the grade count, the chapter anchor and the cues |
| `site/src/styles/motion.css` | Site-wide motion (the page title, statements lit word by word) and the blocks that hand Firefox and Mac Safari to the engine |
| `site/src/lib/film.ts` | `iosWebKit()` and `filmPlays()`: where the film plays at all |
| `site/src/islands/motion.ts` | Loads `scrub.ts` for Firefox and Mac Safari; `?film=scrub` forces it |
| `site/src/islands/scrub.ts` | The engine: plays the same CSS animations from each rule's `--tl` and `--ar` |
| `site/src/islands/film-snap.ts` | Turns snapping on and off, marks the current chapter, and sets snapping before a chapter jump |
| `site/src/islands/film-focus.ts`, `liquid.ts` | The keyboard path through the grades; the WebGL liquid (geometry cached on resize, never read per frame) |
| `site/tests/film-checks.ts` | In-page checks shared by e2e and the rig: `scrollFilm`, `filmTop`, `filmProblems`, `filmState`, `frameGaps` |
| `site/tests/unit/motion-css.test.ts` | The rules below that a test can hold |
| `site/tests/e2e/film.spec.ts` | The film at 390 and 1440, including "one frame per input" |
| `site/tests/ios/film.mjs`, `.github/workflows/ios.yml` | The Apple rig |

## Rules

Each comes from a real glitch. "Test" means a unit test fails if it's broken.

1. **Two copies of every timeline and range.** Write `animation-timeline` and `animation-range` literally, and the same values as `--tl` and `--ar` beside them, for the engine. Safari drops a range that is a single `var()`. (Test.)
2. **Motion and hit-testing in separate animations.** A keyframe that moves (opacity, transform, translate, scale, filter) never also changes `z-index` or `pointer-events`: that keeps iOS's scroll animations on the compositor, in step with the finger. Taps are switched by `vp-gone`, `vp-live` and `vp-hit`, as an extra animation on the same element. (Test.)
3. **`translate` names both ends, never `none`.** iOS 27 and Safari 27 draw a `translate: none` keyframe wrongly (WebKit bug 327193). End on `0 0`. (Test.)
4. **No media query on the screen's height inside the film.** A phone's toolbar changes it mid-scroll. Size by `@container` on the 100svh stage. The only height query is the film's own `min-height: 480px` gate. (Test.)
5. **No view timeline on a sticky element.** WebKit computes its progress wrongly (bug 283582). Put the timeline on the tall parent.
6. **`--sfn` and `--ssn` equal `--scale-from` and `--scale-span`.** The snap frames use the plain numbers. (Test.)
7. **Scrolling is never scripted.** Snapping is native CSS scroll snap, on only while the film plays to its last grade. No smooth-scroll library, no `scrollTo` on wheel or touch.
8. **Faded is not gone.** An element that fades out must also stop taking taps (`vp-gone`), or it covers the links beneath it.

## Pacing: the gap rule

**How the browser snaps.** After a flick or swipe, the browser picks the snap point nearest where the scroll would naturally have stopped, capped at the first point with `scroll-snap-stop: always`. The finger's own travel can pass a point; the stop caps only the momentum. Measured in Chromium: a normal flick travels 245–540 px, a fast one about 1100–1300 px.

**So every gap between frames is 40–55% of a screen.**
- Too wide, and the nearest point is the frame just left, so flicks spring back. This happened at one screen apart.
- Too narrow, and a finger's travel passes a frame.

**The frames,** all `scroll-snap-align: start` with `scroll-snap-stop: always`:
- `.vp-snap-top`: the hero;
- `.vp-snap-drop`, at 9%: the drop filled, before the hero's words leave;
- `.vp-snap-title`, at 17.8%: inside the title's hold (16.6–19.4%), so the gaps either side of it match the grades';
- one per grade, at the middle of its slot: `--sfn + (i + .5) × --ssn / --n`;
- `.vp-statement`: the way out for Space and Page Down.

**How a frame is placed.** `--at` is a frame's share of the pinned stretch. Its top is `--at × (100% − 50svh − 50lvh)`: the screen's height taken halfway between a phone's toolbar shown and hidden, so the frame lands inside its hold either way.

**When snapping is on.** `film-snap.ts` watches the last grade's frame. A pixel past it, snapping turns off, so a flick from the last grade carries on out of the film instead of springing back.

| Screen | top → drop | drop → title | title → first grade | between grades |
| --- | --- | --- | --- | --- |
| Phone 390×844 | 426 px | 356 px | 353 px | 364 px |
| Laptop 1440×900 | 462 px | 380 px | 376 px | 389 px |

Each grade adds 60svh to the film (`--n` counts them), so adding a product keeps the gaps. When you change the timing:
- recompute these gaps at both sizes;
- keep every frame inside its scene's hold;
- run the "one frame per input" tests.

## Check a change

1. **Build with Cloudflare's test key** (the real one fails on localhost): `PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm --prefix site run check`.
2. **Run the e2e tests.** Restart the preview after every build (`pkill -f "[w]rangler dev"`, then `npm --prefix site run preview`), then run `npx playwright test tests/e2e/film.spec.ts` from `site/`. Locally only Chromium runs; WebKit and Firefox run in CI. Never run `playwright install`.
   - Flicks use `Input.dispatchTouchEvent`: touchStart, 8 touchMoves, touchEnd.
   - The trackpad uses `Input.synthesizeScrollGesture` with `gestureSourceType: "mouse"`.
   - Never `page.mouse.wheel`: each event is its own gesture, and each snaps back.
   - Never a touch `synthesizeScrollGesture`: it doesn't scroll in headless Chromium.
3. **Look at it.** Run `npm --prefix site run shots -- --film` and `-- --film --reduce`, then the `design-review` skill.
4. **Run the Apple rig.** `.github/workflows/ios.yml` runs on every pull request that touches `site/`, or by hand (workflow_dispatch). It has three jobs:

   | Job | Artifact | What it does |
   | --- | --- | --- |
   | iPhone 18 Pro (iOS 27.0) | `ios-film-27.0` | Real finger swipes in Mobile Safari, so the toolbar hides and shows |
   | iPhone Duo (iOS 27.1) | `ios-film-27.1` | The same |
   | Safari 27 on macOS | `mac-film` | The film at 41 positions, then Space and Page Down |

   - **Download** with the GitHub MCP: `actions_list` (`list_workflow_run_artifacts`), then `actions_get` (`download_workflow_run_artifact`).
   - **Read `report.json`.** It has one entry per step: scroll position, share, grade, `engine` (scrub.ts running), `native` (native animations), slow frames, and the problems found. The in-page checks are the signal.
   - **Don't judge from the Mac's screenshots:** they come out blank on the runner.
   - safaridriver's wheel actions don't scroll, so the Mac steps use `scrollFilm`, and keys after `filmTop`.
   - Appium answers a new session only after it builds WebDriverAgent, which can take more than five minutes. `film.mjs` uses `node:http` because `fetch` gives up at five.
5. **The owner's iPhone is the last check.** The Simulator proves WebKit's behaviour, not a phone's GPU.

## When an iPhone glitches

Check in this order:
1. Read `engine` and `native` in the report. An iPhone should run native animations with no engine.
2. Look for a keyframe that mixes motion with `pointer-events` or `z-index` (rule 2).
3. Look for a `translate` that is `none` or set at one end only (rule 3).
4. Look for anything sized by the screen's height, or by `dvh`, inside the film (rule 4).
5. Look for a view timeline on a sticky element (rule 5).
6. Look for layout reads per frame in `liquid.ts` or another island.

Platform notes from 28 October are in `docs/plans/2026-10-28-lead-engine.md`, "Platform facts".
