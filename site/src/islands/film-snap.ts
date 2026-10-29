/**
 * One grade per flick, and where you are on the page.
 *
 * Down to the last grade, the page snaps, mandatory, to the film's snap points
 * (styles/film.css, .vp-film-snaps), each with scroll-snap-stop: always, so a
 * flick, a trackpad swipe, a wheel notch or Space moves exactly one frame. The
 * browser does the snapping: scrolling itself is never scripted. A pixel past
 * the last grade the snapping stops (an IntersectionObserver, never per frame),
 * so a flick from there carries on out of the film instead of springing back.
 *
 * The chapter anchor (nav.vp-chapters) marks the chapter under the middle of
 * the screen with aria-current, updated only as a chapter's edge crosses it.
 * Only where the film plays (lib/film.ts).
 */
import { filmPlays } from "../lib/film.ts";

const film = document.querySelector<HTMLElement>(".vp-film");
if (film && filmPlays()) {
  const root = document.documentElement;
  // Snapping is on while the last grade's frame is at or below the screen's top: a root stretched far below the screen.
  const last = film.querySelector(".vp-film-snaps-grades > span:last-child");
  if (last) new IntersectionObserver(([e]) => root.classList.toggle("vp-snap", e?.isIntersecting ?? false), { rootMargin: "0px 0px 10000% 0px" }).observe(last);

  const links = [...document.querySelectorAll<HTMLAnchorElement>(".vp-chapters a[data-chapter]")];
  const marks = links.map((a) => document.getElementById(a.dataset.chapter ?? "")).filter((m): m is HTMLElement => m !== null);
  const mark = () => {
    const middle = innerHeight / 2;
    let current = 0;
    marks.forEach((m, i) => {
      if (m.getBoundingClientRect().top <= middle) current = i;
    });
    links.forEach((a, i) => (i === current ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  };
  const io = new IntersectionObserver(mark, { rootMargin: "-50% 0px -50% 0px" });
  marks.forEach((m) => io.observe(m));
  mark();
  // A chapter in the film is reached with snapping on, so the jump lands on its frame; one past the film with it off,
  // or the browser would hold the jump at the film's way out.
  links.forEach((a) => a.addEventListener("click", () => {
    root.classList.toggle("vp-snap", film.contains(document.getElementById(a.dataset.chapter ?? "")));
  }));
}

export {};
