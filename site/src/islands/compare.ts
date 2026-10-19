/** Builds the comparison table for ?p=slug,slug(,slug) from data embedded in the page. */
import { addLine } from "./basket.ts";

type Item = { slug: string; family: string; specs: [string, string][]; packaging: string };

const all = JSON.parse(document.getElementById("vp-compare-data")?.textContent ?? "[]") as Item[];
const wanted = (new URLSearchParams(location.search).get("p") ?? "").split(",").filter(Boolean).slice(0, 3);
const items = wanted.map((s) => all.find((i) => i.slug === s)).filter((i): i is Item => Boolean(i));

const wrap = document.querySelector<HTMLElement>("[data-compare-table]");
if (wrap && items.length >= 2) {
  const headRow = wrap.querySelector("thead tr")!;
  for (const it of items) {
    const tpl = document.querySelector<HTMLTemplateElement>(`template[data-compare-head="${CSS.escape(it.slug)}"]`);
    if (tpl) headRow.append(tpl.content.cloneNode(true));
  }
  // Rows: every property any selected grade lists, in the order they first appear.
  const props: string[] = [];
  for (const it of items) for (const [p] of it.specs) if (!props.includes(p)) props.push(p);
  const rows: [string, string[]][] = [
    ["Family", items.map((i) => i.family)],
    ...props.map((p): [string, string[]] => [p, items.map((i) => i.specs.find(([q]) => q === p)?.[1] ?? "—")]),
    ["Packaging", items.map((i) => i.packaging)],
  ];
  const body = wrap.querySelector("tbody")!;
  for (const [label, values] of rows) {
    const tr = document.createElement("tr");
    if (new Set(values).size > 1 && label !== "Family") tr.className = "vp-differs";
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = label;
    tr.append(th);
    for (const v of values) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.append(td);
    }
    body.append(tr);
  }
  wrap.hidden = false;
  document.querySelector<HTMLElement>("[data-compare-note]")!.hidden = false;
  document.querySelector<HTMLElement>("[data-compare-intro]")!.textContent =
    "Typical properties side by side. Rows where the grades differ are shaded.";
  const add = document.querySelector<HTMLButtonElement>("[data-compare-add]")!;
  add.hidden = false;
  add.addEventListener("click", () => {
    for (const it of items) addLine(it.slug);
    location.href = "/quote";
  });
}
