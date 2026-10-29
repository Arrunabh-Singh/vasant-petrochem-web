// Whether the home page opens with its opening (components/Intro.astro),
// decided before the first paint so the page never shows and is then covered:
// a person's first visit to the home page in this tab, with motion welcome and
// a screen tall enough for it. Agents and automated browsers
// (navigator.webdriver), a link into the page (#grades), a return in the same
// tab and readers who reduce motion go straight in. ?loader=on shows it to an
// automated browser too, for the tests and the Apple rig.
// A classic script in the head, without defer or async: it runs before the page paints.
try {
  var forced = new URLSearchParams(location.search).get("loader") === "on";
  if (
    (forced || !navigator.webdriver) &&
    !location.hash &&
    !sessionStorage.getItem("vp-entered") &&
    matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 480px)").matches
  )
    document.documentElement.classList.add("vp-opening");
} catch (e) {
  // Storage blocked: the visit can't be remembered, so the page opens without it.
}
