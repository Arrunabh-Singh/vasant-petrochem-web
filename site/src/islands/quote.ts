/**
 * The quote list on /quote: renders the buyer's lines from localStorage, keeps
 * them in sync as they edit, takes products from links (?add=slug, a shared
 * ?list=...), and hands the lines to the form when it is sent.
 */
import { addLine, decodeLines, encodeLines, readBasket, removeLine, writeBasket, UNITS, type Line, type Unit } from "./basket.ts";

type Item = { slug: string; name: string; code: string; packs: string[]; density: number | null };

const form = document.querySelector<HTMLFormElement>("form[data-quote]");
const catalog = JSON.parse(document.getElementById("vp-catalog")?.textContent ?? "[]") as Item[];
const bySlug = new Map(catalog.map((i) => [i.slug, i]));
const known = (l: Line) => bySlug.has(l.slug);

if (form) {
  const list = form.querySelector<HTMLUListElement>("[data-lines]")!;
  const empty = form.querySelector<HTMLElement>("[data-lines-empty]")!;
  const tpl = document.querySelector<HTMLTemplateElement>("template[data-line-template]")!;
  const add = form.querySelector<HTMLSelectElement>("[data-add-product]")!;
  const contract = form.querySelector<HTMLElement>("[data-contract]")!;
  const offerRef = form.querySelector<HTMLInputElement>("[data-offer-ref]")!;
  const share = form.querySelector<HTMLButtonElement>("[data-share]")!;
  const shareStatus = form.querySelector<HTMLElement>("[data-share-status]")!;
  const wa = document.querySelector<HTMLAnchorElement>("[data-wa-list]");

  // Links into the page: ?list= (a shared list), ?add= (one product), ?type=, ?offer=.
  const params = new URLSearchParams(location.search);
  const shared = decodeLines(params.get("list")).filter(known);
  if (shared.length) {
    const mine = readBasket();
    writeBasket([...mine, ...shared.filter((s) => !mine.some((m) => m.slug === s.slug))]);
  }
  const added = params.get("add");
  if (added && bySlug.has(added)) addLine(added);
  const type = params.get("type");
  const radio = form.querySelector<HTMLInputElement>(`input[name="type"][value="${CSS.escape(type ?? "")}"]`);
  if (radio) radio.checked = true;
  const offer = params.get("offer");
  if (offer && /^[0-9a-f-]{36}$/.test(offer)) offerRef.value = offer;
  if (params.size) history.replaceState(null, "", location.pathname);

  form.querySelector<HTMLElement>("[data-add-wrap]")!.hidden = false;
  share.hidden = false;

  const lines = () => readBasket().filter(known);

  function convertNote(line: Line, item: Item): string {
    const qty = Number(line.qty);
    if (!item.density || !qty) return "";
    // Mass to volume through the verified density at 15 °C (kg/L = MT/kL).
    if (line.unit === "MT") return `About ${(qty / item.density).toFixed(1)} kL at 15 °C`;
    if (line.unit === "kL") return `About ${(qty * item.density).toFixed(1)} MT at 15 °C`;
    return "";
  }

  function update(slug: string, patch: Partial<Line>) {
    writeBasket(readBasket().map((l) => (l.slug === slug ? { ...l, ...patch } : l)));
  }

  function render() {
    const current = lines();
    list.replaceChildren();
    for (const [i, line] of current.entries()) {
      const item = bySlug.get(line.slug)!;
      const li = tpl.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
      li.querySelector("[data-line-name]")!.textContent = item.name;
      li.querySelector("[data-line-code]")!.textContent = item.code;
      for (const label of li.querySelectorAll<HTMLLabelElement>("label[data-for]")) label.htmlFor = `line-${i}-${label.dataset.for}`;
      const qty = li.querySelector<HTMLInputElement>('[data-field="qty"]')!;
      const unit = li.querySelector<HTMLSelectElement>('[data-field="unit"]')!;
      const pack = li.querySelector<HTMLSelectElement>('[data-field="pack"]')!;
      const notes = li.querySelector<HTMLInputElement>('[data-field="notes"]')!;
      qty.id = `line-${i}-qty`;
      unit.id = `line-${i}-unit`;
      pack.id = `line-${i}-pack`;
      notes.id = `line-${i}-notes`;
      for (const p of item.packs) pack.add(new Option(p, p));
      qty.value = line.qty;
      unit.value = line.unit;
      pack.value = item.packs.includes(line.pack) ? line.pack : "";
      notes.value = line.notes;
      const convert = li.querySelector<HTMLElement>("[data-convert]")!;
      const showConvert = () => {
        const note = convertNote({ ...line, qty: qty.value, unit: unit.value as Unit }, item);
        convert.textContent = note;
        convert.hidden = !note;
      };
      showConvert();
      qty.addEventListener("input", () => {
        qty.value = qty.value.replace(/[^\d.]/g, "");
        update(line.slug, { qty: /^\d{0,7}(\.\d{0,3})?$/.test(qty.value) ? qty.value : line.qty });
        showConvert();
      });
      unit.addEventListener("change", () => {
        update(line.slug, { unit: (UNITS as readonly string[]).includes(unit.value) ? (unit.value as Unit) : "MT" });
        showConvert();
      });
      pack.addEventListener("change", () => update(line.slug, { pack: pack.value }));
      notes.addEventListener("input", () => update(line.slug, { notes: notes.value }));
      li.querySelector("[data-line-remove]")!.addEventListener("click", () => {
        removeLine(line.slug);
        render();
        add.focus();
      });
      list.append(li);
    }
    empty.hidden = current.length > 0;
    for (const opt of add.options) opt.disabled = current.some((l) => l.slug === opt.value);
    if (wa) {
      const text = current.length
        ? `Hello, I would like a quote for:\n${current.map((l) => `- ${bySlug.get(l.slug)!.name}${l.qty ? `: ${l.qty} ${l.unit}` : ""}${l.pack ? `, ${l.pack}` : ""}`).join("\n")}`
        : "Hello, I would like a quote.";
      wa.href = `${wa.href.split("?")[0]}?text=${encodeURIComponent(text)}`;
    }
  }

  add.addEventListener("change", () => {
    if (add.value) addLine(add.value);
    add.value = "";
    render();
  });

  const syncType = () => {
    contract.hidden = (form.querySelector<HTMLInputElement>('input[name="type"]:checked')?.value ?? "") !== "contract";
  };
  for (const r of form.querySelectorAll('input[name="type"]')) r.addEventListener("change", syncType);
  syncType();

  share.addEventListener("click", async () => {
    const url = `${location.origin}/quote?list=${encodeLines(lines())}`;
    try {
      await navigator.clipboard.writeText(url);
      shareStatus.textContent = "Link copied. Anyone with it can open this list.";
    } catch {
      shareStatus.textContent = url;
    }
  });

  // Hand the lines to the request (islands/form.ts builds it from FormData).
  form.addEventListener("formdata", (e) => {
    e.formData.set("lines", JSON.stringify(lines().map(({ slug, qty, unit, pack, notes }) => ({ slug, qty, unit, pack, notes }))));
  });
  addEventListener("vp:sent", () => writeBasket([]));
  addEventListener("vp:basket", () => {
    if (!list.contains(document.activeElement)) render();
  });

  render();
}
