import { defineMiddleware } from "astro:middleware";
import { workerHeaders } from "./server/headers.ts";

/** The Worker's own responses carry the static files' security headers (public/_headers), plus CORP. */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const apply = (headers: Headers) => {
    for (const [name, value] of Object.entries(workerHeaders)) if (!headers.has(name)) headers.set(name, value);
  };
  try {
    apply(response.headers);
    return response;
  } catch {
    // A response from fetch() (an asset passed through) has immutable headers: copy it.
    const copy = new Response(response.body, response);
    apply(copy.headers);
    return copy;
  }
});
