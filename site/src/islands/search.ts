/**
 * Site search: the navigation's search link opens a dialog that filters a
 * small prebuilt index (/search-index.json). Without JavaScript the link goes
 * to /search, which lists everything. No keyboard shortcut is taken over:
 * browser and system shortcuts stay the reader's.
 */
type Hit = { t: string; u: string; s: string; k: string };

const dialog = document.getElementById("vp-search") as HTMLDialogElement | null;
const input = document.getElementById("vp-search-input") as HTMLInputElement | null;
const list = document.getElementById("vp-search-results") as HTMLUListElement | null;
let index: Hit[] | null = null;

async function load(): Promise<Hit[]> {
  if (!index) {
    const res = await fetch("/search-index.json");
    index = res.ok ? ((await res.json()) as Hit[]) : [];
  }
  return index;
}

function item(text: string, href?: string, note?: string): HTMLLIElement {
  const li = document.createElement("li");
  if (!href) {
    li.className = "vp-small";
    li.textContent = text;
    return li;
  }
  const a = document.createElement("a");
  a.href = href;
  const strong = document.createElement("span");
  strong.textContent = text;
  a.append(strong);
  if (note) {
    const small = document.createElement("small");
    small.textContent = note;
    a.append(small);
  }
  li.append(a);
  return li;
}

function render() {
  if (!list || !input) return;
  const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
  list.replaceChildren();
  if (terms.length === 0) {
    list.append(item("Search grades, codes, uses and industries."));
    return;
  }
  const hits = (index ?? []).filter((h) => terms.every((term) => `${h.t} ${h.k} ${h.s}`.toLowerCase().includes(term))).slice(0, 12);
  if (hits.length === 0) {
    list.append(item("No matches. Tell us what you need and we will source it.", "/source", "Source any grade"));
    return;
  }
  list.append(...hits.map((h) => item(h.t, h.u, h.s)));
}

function open() {
  if (!dialog || !input) return;
  dialog.showModal();
  input.select();
  void load().then(render);
}

document.addEventListener("click", (e) => {
  const trigger = (e.target as Element | null)?.closest?.("[data-search-open]");
  if (trigger && dialog) {
    e.preventDefault();
    open();
  }
});
input?.addEventListener("input", render);
// A click on the backdrop (the dialog element itself, outside its content) closes it.
dialog?.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});
