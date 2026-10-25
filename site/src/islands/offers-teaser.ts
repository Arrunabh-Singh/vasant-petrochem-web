/** The home page's "Live offers" section: shown only when the board has open lots. */
type Offer = { id: string; product_slug: string; title: string; quantity: number; uom: string; location: string; basis: string; valid_until: string };

const section = document.querySelector<HTMLElement>("[data-offers-teaser]");
const list = section?.querySelector<HTMLUListElement>("[data-offers-list]");

function row(label: string, value: string) {
  const div = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  div.append(dt, dd);
  return div;
}

if (section && list) {
  fetch("/api/offers", { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : { offers: [] }))
    .then(({ offers }: { offers: Offer[] }) => {
      if (!offers?.length) return;
      for (const o of offers.slice(0, 3)) {
        const li = document.createElement("li");
        li.className = "vp-offer";
        const head = document.createElement("h3");
        head.className = "vp-h-title";
        head.textContent = o.title;
        const dl = document.createElement("dl");
        dl.append(
          row("Quantity", `${Number(o.quantity).toLocaleString("en-IN")} ${o.uom}`),
          row("Location", o.location),
          row("Basis", o.basis),
          row("Valid until", new Date(o.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })),
        );
        const a = document.createElement("a");
        a.className = "vp-btn vp-btn-primary vp-btn-small";
        a.href = `/quote?add=${encodeURIComponent(o.product_slug)}&offer=${encodeURIComponent(o.id)}`;
        a.textContent = "Request this lot";
        li.append(head, dl, a);
        list.append(li);
      }
      section.hidden = false;
    })
    .catch(() => {
      /* the board is optional: no offers section when it cannot load */
    });
}

export {};
