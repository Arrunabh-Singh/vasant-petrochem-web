/**
 * The quote list on /quote: renders the buyer's lines from localStorage, keeps
 * them in sync as they edit, takes products from links (?add=slug, a shared
 * ?list=...), and hands the lines to the form when it is sent. It also shows
 * how far the request has come (three steps), keeps the rest of the request on
 * this device as a draft (never the contact details), and once it is sent
 * fills "Request received" with the reference and what was sent.
 */
import { addLine, decodeLines, encodeLines, readBasket, removeLine, writeBasket, UNITS, type Line, type Unit } from "./basket.ts";
import { play } from "./sound.ts";

type Item = {
  slug: string;
  name: string;
  code: string;
  tint: string;
  packs: string[];
  density: number | null;
  tanker: { qty: string; unit: string; pack: string } | null;
};

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
  const steps = form.querySelector<HTMLElement>("[data-progress]");
  const stepText = form.querySelector<HTMLElement>("[data-step-text]");
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const text = (name: string) => field(name)?.value.trim() ?? "";

  // The draft: everything but the contact details and the message, which stay off the device.
  const DRAFT = "vp-quote-draft";
  const KEEP = ["type", "products_text", "monthly_volume", "contract_months", "delivery_city", "delivery_country", "delivery_port", "required_by", "docs"];
  const saveDraft = () => {
    const data = new FormData(form);
    const draft = Object.fromEntries(KEEP.map((k) => [k, data.getAll(k).filter((v): v is string => typeof v === "string" && v !== "")]));
    try {
      localStorage.setItem(DRAFT, JSON.stringify(draft));
      return true;
    } catch {
      return false; // blocked storage: the draft just isn't kept
    }
  };
  const loadDraft = () => {
    let draft: unknown;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT) ?? "null");
    } catch {
      return;
    }
    if (!draft || typeof draft !== "object") return;
    for (const k of KEEP) {
      const v = (draft as Record<string, unknown>)[k];
      const values = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      const els = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${k}"]`)];
      const choices = els.filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox"));
      if (!choices.length) for (const el of els) el.value = values[0] ?? "";
      // Radios only when the draft names one of them, so a bad draft never leaves none chosen.
      else if (choices.some((c) => c.type === "checkbox" || values.includes(c.value))) for (const c of choices) c.checked = values.includes(c.value);
    }
  };

  /** Grades in, then quantities and where, then who: the first step not done is the one shown. */
  function progress() {
    if (!steps) return;
    const current = lines();
    const grades = current.length > 0 || text("products_text") !== "";
    const delivery = grades && current.every((l) => l.qty) && text("delivery_city") !== "";
    const details = text("name") !== "" && text("email") !== "" && Boolean(field("email")?.validity.valid);
    const done = [grades, delivery, details];
    const at = done.indexOf(false);
    for (const [i, li] of steps.querySelectorAll("li").entries()) {
      li.toggleAttribute("data-done", done[i]);
      if (i === at) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    }
    if (stepText) stepText.textContent = at < 0 ? "Ready to send" : `Step ${at + 1} of 3`;
    steps.querySelector("[data-step-label]")!.textContent = current.length ? `Grades, ${current.length} chosen` : "Grades";
  }

  // Links into the page: ?list= (a shared list), ?add= (one product), ?type=, ?offer=.
  // Applied only once the page is really shown: a page prerendered while a link
  // is hovered must not add anything to the buyer's list.
  const takeLinks = () => {
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
    syncType();
    render();
    saveDraft();
  };


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
      // Quick quantities: one of the grade's own tankers, or 10 MT. They fill the fields below.
      const tanker = item.tanker && (UNITS as readonly string[]).includes(item.tanker.unit) ? item.tanker : null;
      const tankerChip = li.querySelector<HTMLButtonElement>('[data-chip="tanker"]')!;
      if (tanker) tankerChip.textContent = `One tanker (${tanker.qty} ${tanker.unit})`;
      const presets: [HTMLButtonElement, { qty: string; unit: Unit; pack: string } | null][] = [
        [tankerChip, tanker && { qty: tanker.qty, unit: tanker.unit as Unit, pack: tanker.pack }],
        [li.querySelector<HTMLButtonElement>('[data-chip="10-mt"]')!, { qty: "10", unit: "MT", pack: "" }],
      ];
      const pressed = () => {
        for (const [chip, p] of presets) chip.setAttribute("aria-pressed", String(qty.value === p?.qty && unit.value === p.unit));
      };
      for (const [chip, p] of presets) {
        if (!p) continue;
        chip.hidden = false;
        chip.addEventListener("click", () => {
          qty.value = p.qty;
          unit.value = p.unit;
          if (item.packs.includes(p.pack)) pack.value = p.pack;
          update(line.slug, { qty: p.qty, unit: p.unit, pack: pack.value });
          showConvert();
          pressed();
          progress();
        });
      }
      pressed();
      qty.addEventListener("input", () => {
        qty.value = qty.value.replace(/[^\d.]/g, "");
        update(line.slug, { qty: /^\d{0,7}(\.\d{0,3})?$/.test(qty.value) ? qty.value : line.qty });
        showConvert();
        pressed();
      });
      unit.addEventListener("change", () => {
        update(line.slug, { unit: (UNITS as readonly string[]).includes(unit.value) ? (unit.value as Unit) : "MT" });
        showConvert();
        pressed();
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
    progress();
  }

  add.addEventListener("change", () => {
    if (add.value) {
      addLine(add.value);
      play("add");
    }
    add.value = "";
    render();
  });

  const syncType = () => {
    contract.hidden = (form.querySelector<HTMLInputElement>('input[name="type"]:checked')?.value ?? "") !== "contract";
  };
  for (const r of form.querySelectorAll('input[name="type"]')) r.addEventListener("change", syncType);

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
  // "Saved on this device" shows once the visitor has typed something and it was kept.
  form.addEventListener("input", () => {
    progress();
    if (saveDraft()) form.querySelector<HTMLElement>("[data-saved]")!.hidden = false;
  });

  /** "Request received": the reference to copy and quote on WhatsApp, and what was sent. */
  function fillPeak(peak: HTMLElement, reference: string | null, sent: Line[]) {
    const box = peak.querySelector<HTMLElement>("[data-ref-box]");
    if (reference && box) {
      box.hidden = false;
      const chat = peak.querySelector<HTMLAnchorElement>("[data-wa-chat]");
      if (chat?.dataset.textRef) chat.href = `${chat.href.split("?")[0]}?text=${encodeURIComponent(chat.dataset.textRef.replace("{ref}", reference))}`;
      const copy = peak.querySelector<HTMLButtonElement>("[data-copy-ref]");
      copy?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(reference);
          copy.querySelector("[data-copy-label]")!.textContent = copy.dataset.copied ?? "Copied";
        } catch {
          /* the reference stays on screen to copy by hand */
        }
      });
    }
    const rows: [tint: string | null, name: string, detail: string][] = sent.map((l) => {
      const item = bySlug.get(l.slug)!;
      const tanker = item.tanker?.qty === l.qty && item.tanker.unit === l.unit ? item.tanker : null;
      const qty = tanker ? `One tanker (${l.qty} ${l.unit})` : l.qty && `${l.qty} ${l.unit}`;
      return [item.tint, item.name, [qty, l.pack !== tanker?.pack && l.pack].filter(Boolean).join(", ")];
    });
    const city = text("delivery_city");
    const by = /^\d{4}-\d{2}-\d{2}$/.test(text("required_by"))
      ? `Needed by ${new Date(`${text("required_by")}T00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
      : "";
    if (city || by) rows.push([null, city || by, city ? by : ""]);
    const list = peak.querySelector<HTMLUListElement>("[data-sent-lines]");
    if (!list || !rows.length) return;
    for (const [tint, name, detail] of rows) {
      const li = document.createElement("li");
      const swatch = li.appendChild(document.createElement("span"));
      swatch.className = "vp-peak-swatch";
      if (tint) swatch.dataset.tint = tint;
      li.appendChild(document.createElement("strong")).textContent = name;
      if (detail) li.appendChild(document.createElement("span")).textContent = detail;
      list.append(li);
    }
    peak.querySelector<HTMLElement>("[data-sent-summary]")!.hidden = false;
  }

  addEventListener("vp:sent", (e) => {
    const peak = document.querySelector<HTMLElement>("[data-peak]");
    if (peak) fillPeak(peak, (e as CustomEvent<{ reference?: string | null }>).detail?.reference ?? null, lines());
    writeBasket([]);
    try {
      localStorage.removeItem(DRAFT);
    } catch {
      /* nothing kept */
    }
    play("sent");
  });
  addEventListener("vp:basket", () => {
    if (!list.contains(document.activeElement)) render();
  });

  loadDraft();
  syncType();
  render();
  if ((document as Document & { prerendering?: boolean }).prerendering) document.addEventListener("prerenderingchange", takeLinks, { once: true });
  else takeLinks();
}
