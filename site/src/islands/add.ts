/**
 * "Add to quote" buttons. On a card the button toggles the product in the
 * quote list; in a product hero, once the product is in the list, it opens
 * the list (data-go).
 */
import { addLine, readBasket, removeLine } from "./basket.ts";

const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-add]")];

function sync() {
  const inList = new Set(readBasket().map((l) => l.slug));
  for (const b of buttons) {
    const on = inList.has(b.dataset.add ?? "");
    b.setAttribute("aria-pressed", String(on));
    b.querySelector<HTMLElement>("[data-label-off]")!.hidden = on;
    b.querySelector<HTMLElement>("[data-label-on]")!.hidden = !on;
  }
}

for (const b of buttons) {
  b.addEventListener("click", () => {
    const slug = b.dataset.add ?? "";
    const on = b.getAttribute("aria-pressed") === "true";
    if (on && b.dataset.go) {
      location.href = b.dataset.go;
      return;
    }
    if (on) removeLine(slug);
    else addLine(slug);
    sync();
  });
}
sync();
addEventListener("vp:basket", sync);
