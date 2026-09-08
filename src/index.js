/**
 * omegam9-ui-assets Worker
 * Static Assets serve the site (index.html/css/js/images) with zero Worker
 * invocation. Only /img/thumb/{provider}/{code}.webp runs this script, which
 * reads the image straight out of the shared game-assets2 R2 bucket -
 * same-origin, no external CDN domain, no ISP-block exposure.
 */

const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/img\/thumb\/([a-z0-9]+)\/([a-f0-9]+\.webp)$/i);

    if (!match) {
      // Shouldn't normally happen since run_worker_first is scoped to
      // /img/thumb/*, but fall back to static assets just in case.
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const [, provider, filename] = match;
    const key = `${provider}/${filename}`;
    const object = await env.GAME_ASSETS.get(key);

    if (!object) {
      return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", CACHE_CONTROL_IMMUTABLE);
    if (!headers.get("content-type")) headers.set("content-type", "image/webp");

    if (request.method === "HEAD") return new Response(null, { headers });
    return new Response(object.body, { headers });
  },
};
