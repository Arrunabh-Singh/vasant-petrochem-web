import { defineMiddleware } from "astro:middleware";
import { securityHeaders } from "./server/headers.ts";

/** The Worker's own responses carry the same security headers as the static files (public/_headers). */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const apply = (headers: Headers) => {
    for (const [name, value] of Object.entries(securityHeaders)) if (!headers.has(name)) headers.set(name, value);
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
