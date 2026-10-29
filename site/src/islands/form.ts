/**
 * Public forms (quote, sample, source, contact, TDS): sends the form as JSON,
 * shows errors next to their fields, and swaps the form for its confirmation
 * with the enquiry reference. The server repeats every check (VP-SEC-005).
 */
type Payload = Record<string, string | string[]>;
type ServerReply = { ok?: boolean; reference?: string; url?: string; message?: string; errors?: Record<string, string> };

declare global {
  interface Window {
    turnstile?: { reset: (el?: Element | string) => void };
  }
}

function payload(form: HTMLFormElement): Payload {
  const out: Payload = {};
  // `new FormData` fires the form's "formdata" event, where the quote list adds its lines.
  for (const [key, value] of new FormData(form)) {
    if (typeof value !== "string") continue;
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}

function fieldError(form: HTMLFormElement, name: string, message: string) {
  const slot = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(name)}"]`);
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLElement) control.setAttribute("aria-invalid", "true");
  if (slot) {
    slot.textContent = message;
    slot.hidden = false;
  }
}

function clearErrors(form: HTMLFormElement) {
  for (const el of form.querySelectorAll<HTMLElement>("[aria-invalid]")) el.removeAttribute("aria-invalid");
  for (const el of form.querySelectorAll<HTMLElement>("[data-error-for]")) el.hidden = true;
  const alert = form.querySelector<HTMLElement>("[data-form-error]");
  if (alert) alert.hidden = true;
}

function showAlert(form: HTMLFormElement, message?: string) {
  const alert = form.querySelector<HTMLElement>("[data-form-error]");
  if (!alert) return;
  const text = alert.querySelector("[data-form-error-text]");
  if (message && text) text.textContent = message;
  alert.hidden = false;
  alert.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function succeed(form: HTMLFormElement, reply: ServerReply) {
  const tpl = form.querySelector<HTMLTemplateElement>("template[data-form-success]");
  if (!tpl) return;
  const done = tpl.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
  if (!done) return;
  const ref = done.querySelector("[data-reference]");
  if (ref) {
    if (reply.reference) ref.textContent = reply.reference;
    else ref.parentElement?.remove();
  }
  const link = done.querySelector<HTMLAnchorElement>("[data-download]");
  if (link && reply.url) {
    link.href = reply.url;
    link.hidden = false;
  }
  // data-done names what the confirmation replaces, when it is more than the form (the quote page's whole section).
  (form.closest(form.dataset.done ?? "form") ?? form).replaceWith(done);
  done.focus();
  dispatchEvent(new CustomEvent("vp:sent", { detail: { form: form.id, reference: reply.reference ?? null } }));
}

function setup(form: HTMLFormElement) {
  const started = form.querySelector<HTMLInputElement>("[data-started-at]");
  if (started) started.value = String(Date.now());
  form.noValidate = true; // errors appear next to their fields, in the page's own words

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form);
    if (!form.checkValidity()) {
      const invalid = [...form.elements].filter(
        (el): el is HTMLInputElement => (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) && !el.validity.valid,
      );
      for (const el of invalid) fieldError(form, el.name, el.dataset.msg ?? el.validationMessage);
      invalid[0]?.focus();
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload(form)),
      });
      const reply = (await res.json().catch(() => ({}))) as ServerReply;
      if (res.ok && reply.ok) return succeed(form, reply);
      for (const [name, message] of Object.entries(reply.errors ?? {})) fieldError(form, name, message);
      showAlert(form, reply.message);
    } catch {
      showAlert(form);
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
      window.turnstile?.reset();
    }
  });
}

for (const form of document.querySelectorAll<HTMLFormElement>("form[data-vp-form]")) setup(form);

export {};
