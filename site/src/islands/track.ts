/**
 * First-party attribution, no cookies, no third parties (VP-LEAD-006/007):
 * - the campaign a visit came from (utm_*), its landing page and referrer are
 *   kept for the session and copied into enquiry forms;
 * - taps on call, WhatsApp and email links are counted with the page they
 *   came from, so ad spend can be traced to phone calls too.
 * Also keeps the quote-list count in the navigation current.
 */
import { readBasket } from "./basket.ts";

const KEY = "vp-attr";
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type Attr = Partial<Record<(typeof UTM)[number] | "landing_page" | "referrer", string>>;

function session(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function attribution(): Attr {
  const store = session();
  let attr: Attr = {};
  try {
    attr = JSON.parse(store?.getItem(KEY) ?? "{}");
  } catch {
    attr = {};
  }
  const params = new URLSearchParams(location.search);
  // First touch in the session wins; a new campaign link starts a new attribution.
  if (UTM.some((k) => params.has(k)) || !attr.landing_page) {
    attr = {};
    for (const k of UTM) {
      const v = params.get(k);
      if (v) attr[k] = v.slice(0, 120);
    }
    attr.landing_page = location.pathname.slice(0, 200);
    try {
      const ref = document.referrer && new URL(document.referrer);
      if (ref && ref.host !== location.host) attr.referrer = ref.host.slice(0, 120);
    } catch {
      /* unparseable referrer: leave it out */
    }
    try {
      store?.setItem(KEY, JSON.stringify(attr));
    } catch {
      /* storage blocked */
    }
  }
  return attr;
}

const attr = attribution();

for (const input of document.querySelectorAll<HTMLInputElement>("input[data-attr]")) {
  const value = attr[input.name as keyof Attr];
  if (value) input.value = value;
}

document.addEventListener("click", (e) => {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href") ?? "";
  const kind = href.startsWith("tel:") ? "tel" : href.startsWith("mailto:") ? "email" : /^https:\/\/wa\.me\//.test(href) ? "whatsapp" : null;
  if (!kind) return;
  const body = JSON.stringify({ kind, page: location.pathname.slice(0, 200), ...attr });
  navigator.sendBeacon?.("/api/click", new Blob([body], { type: "application/json" }));
});

function updateCount() {
  const n = readBasket().length;
  for (const el of document.querySelectorAll<HTMLElement>("[data-basket-count]")) {
    el.textContent = String(n);
    el.hidden = n === 0;
  }
}
updateCount();
addEventListener("vp:basket", updateCount);
addEventListener("storage", (e) => e.key === "vp-basket" && updateCount());
