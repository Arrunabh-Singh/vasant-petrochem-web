// The home film on real Apple WebKit, for .github/workflows/ios.yml:
//   node --experimental-strip-types tests/ios/film.mjs iphone <out>
//     Mobile Safari in the iOS 27 Simulator through Appium's XCUITest driver.
//     Real finger swipes (flicks, fast flicks, slow drags, then back up), so
//     Safari's toolbar hides and shows as it does on a phone.
//   node --experimental-strip-types tests/ios/film.mjs mac <out>
//     Desktop Safari through safaridriver: the film frame by frame, then Space and
//     Page Down with the page's snapping on. (safaridriver's wheel actions don't scroll.)
// After each step it saves a screenshot and runs tests/film-checks.ts in the
// page. Writes <out>/report.json, prints one line per step, and exits 1 if any
// frame has a problem. Env: WD (WebDriver URL), UDID, DEVICE, OS, BASE.
import { mkdirSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { filmProblems, filmState, filmTop, frameGaps, scrollFilm, startFrameLog } from "../film-checks.ts";

const [mode = "iphone", out = "ios-film"] = process.argv.slice(2);
const iphone = mode !== "mac";
const WD = process.env.WD ?? (iphone ? "http://127.0.0.1:4723" : "http://127.0.0.1:4444");
const BASE = process.env.BASE ?? "http://localhost:4321";
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// node:http, not fetch: fetch gives up after five minutes without an answer, and
// Appium answers a new session only once it has built WebDriverAgent, which can take longer.
function wd(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = request(WD + path, { method, agent: false, headers: { "content-type": "application/json" } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (text += c));
      res.on("end", () => {
        let j = {};
        try {
          j = JSON.parse(text);
        } catch {}
        if (res.statusCode >= 400 || j?.value?.error) reject(new Error(`${method} ${path}: ${res.statusCode} ${j?.value?.error ?? ""} ${String(j?.value?.message ?? "").slice(0, 400)}`));
        else resolve(j.value);
      });
    });
    req.on("error", reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

const caps = iphone
  ? {
      platformName: "iOS",
      browserName: "Safari",
      "appium:automationName": "XCUITest",
      "appium:udid": process.env.UDID,
      "appium:deviceName": process.env.DEVICE,
      "appium:platformVersion": process.env.OS,
      "appium:newCommandTimeout": 900,
      "appium:wdaLaunchTimeout": 900_000,
      "appium:wdaConnectionTimeout": 900_000,
      "appium:webviewConnectTimeout": 120_000,
      // A busy runner's Web Inspector once took 151 s to answer; the default gives up at 120 s.
      "appium:webviewAtomWaitTimeout": 300_000,
      "appium:safariInitialUrl": `${BASE}/`,
    }
  : { browserName: "safari" };
const { sessionId: s } = await wd("POST", "/session", { capabilities: { alwaysMatch: caps } });
const run = (fn, arg = null) => wd("POST", `/session/${s}/execute/sync`, { script: `return (${fn})(arguments[0]);`, args: [arg] });

// Mobile Safari is a web context inside the native app: swipes and full-screen
// shots (with Safari's toolbar) need the native one, the page's checks the web one.
async function context(native) {
  if (!iphone) return;
  const list = await wd("GET", `/session/${s}/contexts`);
  const name = native ? "NATIVE_APP" : list.map((c) => c?.id ?? c).find((c) => String(c).startsWith("WEBVIEW"));
  if (!name) throw new Error(`no web context in ${JSON.stringify(list)}`);
  await wd("POST", `/session/${s}/context`, { name });
}

async function go(path) {
  await context(false);
  await wd("POST", `/session/${s}/url`, { url: BASE + path });
  await sleep(3000);
  await run(startFrameLog);
}

/** One finger stroke from y0 to y1 (shares of the screen's height) in ms milliseconds: short and fast is a flick. */
async function swipe(y0, y1, ms) {
  await context(true);
  const { width, height } = await wd("GET", `/session/${s}/window/rect`);
  const x = Math.round(width * 0.5);
  const finger = [
    { type: "pointerMove", duration: 0, x, y: Math.round(height * y0) },
    { type: "pointerDown", button: 0 },
    { type: "pause", duration: 40 },
    { type: "pointerMove", duration: ms, x, y: Math.round(height * y1) },
    { type: "pointerUp", button: 0 },
  ];
  await wd("POST", `/session/${s}/actions`, { actions: [{ type: "pointer", id: "finger", parameters: { pointerType: "touch" }, actions: finger }] });
  await wd("DELETE", `/session/${s}/actions`).catch(() => {});
}

const steps = [];
let failed = 0;
async function record(page, kind, film = true) {
  await sleep(film ? 1600 : 900); // momentum settles
  await context(true);
  const n = String(steps.length).padStart(3, "0");
  writeFileSync(`${out}/${n}-${page}-${kind}.png`, Buffer.from(await wd("GET", `/session/${s}/screenshot`), "base64"));
  await context(false);
  const state = await run(filmState);
  const problems = film && page === "home" ? await run(filmProblems, iphone) : [];
  const frames = await run(frameGaps);
  failed += problems.length;
  steps.push({ n, page, kind, state, frames, problems });
  console.log(`${n} ${page} ${kind.padEnd(6)} y=${state.y} vh=${state.vh} share=${state.share} grade=${state.grade} engine=${state.engine} native=${state.native} touch=${state.touch} reduced=${state.reduced} film=${state.tall}x slow-frames=${frames.slow}/${frames.frames} worst=${frames.worst}ms ${problems.length ? "PROBLEMS: " + problems.join("; ") : "ok"}`);
}

try {
  if (iphone) {
    await go("/");
    await record("home", "start");
    // A visitor's thumb: normal flicks down the film, a few fast ones, slow drags, then flicks back up.
    for (let i = 0; i < 12; i++) await swipe(0.72, 0.4, 180).then(() => record("home", "flick"));
    for (let i = 0; i < 3; i++) await swipe(0.8, 0.25, 90).then(() => record("home", "fast"));
    for (let i = 0; i < 3; i++) await swipe(0.62, 0.48, 900).then(() => record("home", "drag"));
    for (let i = 0; i < 10; i++) await swipe(0.35, 0.72, 160).then(() => record("home", "up"));
    for (const page of ["/products/base-oil-sn500", "/marketplace"]) {
      const name = page.split("/").pop();
      await go(page);
      await record(name, "start", false);
      for (let i = 0; i < 4; i++) await swipe(0.72, 0.4, 180).then(() => record(name, "flick", false));
    }
  } else {
    await wd("POST", `/session/${s}/window/rect`, { width: 1440, height: 900 });
    await go("/");
    await record("home", "start");
    for (let i = 0; i <= 40; i++) {
      await run(scrollFilm, i / 40);
      await record("home", `s${String(i).padStart(2, "0")}`);
    }
    const key = (k) => wd("POST", `/session/${s}/actions`, { actions: [{ type: "key", id: "keys", actions: [{ type: "keyDown", value: k }, { type: "keyUp", value: k }] }] });
    await key("\uE008"); // Shift first: the session's first key only gives Safari's window the keyboard
    for (const [kind, k] of [["space", " "], ["pgdn", "\uE00F"]]) {
      await run(filmTop); // the page's own snapping back on, from the top
      for (let i = 0; i < 4; i++) await key(k).then(() => record("home", kind));
    }
  }
} finally {
  writeFileSync(`${out}/report.json`, JSON.stringify({ mode, device: process.env.DEVICE ?? "Safari (macOS)", os: process.env.OS ?? "", steps }, null, 2));
  await wd("DELETE", `/session/${s}`).catch(() => {});
}
console.log(`${steps.length} steps, ${failed} problems`);
process.exitCode = failed > 0 ? 1 : 0;
