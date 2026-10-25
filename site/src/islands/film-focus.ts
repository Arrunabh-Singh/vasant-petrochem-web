/**
 * Keyboard focus drives the home film (styles/film.css): a grade's link that
 * takes focus scrolls the film to that grade's slot, so the grade is on
 * screen and lit; the hero's buttons, once the film has moved past them,
 * scroll back to the top. Only where the film itself plays, and only for
 * keyboard focus (:focus-visible), never a tap.
 */
const film = document.querySelector<HTMLElement>(".vp-film");
if (film && CSS.supports("animation-timeline: view()") && matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  const grades = [...film.querySelectorAll<HTMLElement>(".vp-oil")];
  const css = getComputedStyle(film);
  const share = (name: string) => parseFloat(css.getPropertyValue(name)) / 100;
  const top = () => film.getBoundingClientRect().top + scrollY;
  const length = () => film.offsetHeight - innerHeight;
  film.addEventListener("focusin", (e) => {
    const target = e.target as Element;
    // Only keyboard focus moves the film; a tap that focuses a link must not jump the page.
    if (!target.matches?.(":focus-visible")) return;
    if (film.querySelector(".vp-film-copy")?.contains(target)) {
      if (scrollY > top() + share("--fill-end") * length()) scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const i = grades.findIndex((g) => g.contains(target));
    if (i < 0) return;
    const at = share("--scale-from") + (share("--scale-span") * (i + 0.5)) / grades.length;
    scrollTo({ top: top() + at * length(), behavior: "instant" });
  });
}

export {};
