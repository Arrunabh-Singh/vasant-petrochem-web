/**
 * Marketplace filters and the compare tray. Facets combine with AND across
 * groups and OR within a group; the state lives in the URL, so a filtered view
 * can be shared. Without JavaScript the filters stay hidden and every product
 * is listed.
 */
type Facet = "family" | "industry" | "pack" | "docs";
const FACETS: Facet[] = ["family", "industry", "pack", "docs"];
const MAX_COMPARE = 3;
const COMPARE_KEY = "vp-compare";

const root = document.querySelector<HTMLElement>("[data-market]");
const form = root?.querySelector<HTMLFormElement>("[data-filters]");

if (root && form) {
  form.hidden = false;
  const query = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const chips = [...form.querySelectorAll<HTMLButtonElement>("[data-facet]")];
  const items = [...root.querySelectorAll<HTMLElement>("[data-results] > li")];
  const count = root.querySelector<HTMLElement>("[data-count]")!;
  const empty = root.querySelector<HTMLElement>("[data-empty]")!;

  const selected = (facet: Facet) => chips.filter((c) => c.dataset.facet === facet && c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.value!);

  function matches(card: HTMLElement): boolean {
    const terms = query.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((t) => (card.dataset.search ?? "").includes(t))) return false;
    const fields: Record<Facet, string[]> = {
      family: [card.dataset.family ?? ""],
      industry: (card.dataset.industries ?? "").split(" "),
      pack: (card.dataset.packaging ?? "").split("|"),
      docs: (card.dataset.docs ?? "").split(" "),
    };
    return FACETS.every((f) => {
      const want = selected(f);
      return want.length === 0 || want.some((v) => fields[f].includes(v));
    });
  }

  function apply(writeUrl = true) {
    let shown = 0;
    for (const li of items) {
      const card = li.querySelector<HTMLElement>("[data-product]")!;
      const ok = matches(card);
      li.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = shown === items.length ? `${shown} products` : `${shown} of ${items.length} products`;
    empty.hidden = shown > 0;
    if (writeUrl) {
      const params = new URLSearchParams();
      if (query.value.trim()) params.set("q", query.value.trim());
      for (const f of FACETS) for (const v of selected(f)) params.append(f, v);
      const qs = params.toString();
      history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
    }
  }

  // Restore a shared view from the URL.
  const params = new URLSearchParams(location.search);
  query.value = params.get("q") ?? "";
  for (const c of chips) if (params.getAll(c.dataset.facet!).includes(c.dataset.value!)) c.setAttribute("aria-pressed", "true");

  for (const c of chips) {
    c.addEventListener("click", () => {
      c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"));
      apply();
    });
  }
  query.addEventListener("input", () => apply());
  form.addEventListener("submit", (e) => e.preventDefault());
  const clear = () => {
    query.value = "";
    for (const c of chips) c.setAttribute("aria-pressed", "false");
    apply();
  };
  for (const b of root.querySelectorAll("[data-clear]")) b.addEventListener("click", (e) => {
    e.preventDefault();
    clear();
  });
  apply(false);
}

// ---------------------------------------------------------------- compare tray
const tray = document.querySelector<HTMLElement>("[data-tray]");
const boxes = [...document.querySelectorAll<HTMLInputElement>("[data-compare]")];

function readCompare(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(COMPARE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}
function writeCompare(slugs: string[]) {
  try {
    sessionStorage.setItem(COMPARE_KEY, JSON.stringify(slugs));
  } catch {
    /* storage blocked: the tray still works for this page */
  }
}

let picked = readCompare().filter((s) => boxes.some((b) => b.dataset.compare === s));

function renderTray() {
  for (const b of boxes) {
    b.checked = picked.includes(b.dataset.compare!);
    b.disabled = !b.checked && picked.length >= MAX_COMPARE;
  }
  if (!tray) return;
  tray.hidden = picked.length === 0;
  tray.querySelector("[data-tray-text]")!.textContent =
    picked.length < 2 ? `${picked.length} selected. Pick another grade to compare.` : `${picked.length} grades selected`;
  const go = tray.querySelector<HTMLAnchorElement>("[data-tray-go]")!;
  go.href = `/marketplace/compare?p=${picked.join(",")}`;
  go.setAttribute("aria-disabled", String(picked.length < 2));
}

for (const b of boxes) {
  b.addEventListener("change", () => {
    const slug = b.dataset.compare!;
    picked = b.checked ? [...picked, slug].slice(0, MAX_COMPARE) : picked.filter((s) => s !== slug);
    writeCompare(picked);
    renderTray();
  });
}
tray?.querySelector("[data-tray-go]")?.addEventListener("click", (e) => {
  if (picked.length < 2) e.preventDefault();
});
renderTray();

export {};
