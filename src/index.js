/**
 * omegam9asia Worker
 *
 * 1. /img/thumb/{provider}/{code}.webp -> served straight from the shared
 *    game-assets2 R2 bucket, same-origin.
 * 2. Every other request -> served from Workers Static Assets. If the
 *    response is an HTML document, patch `PageConfig.isMobile = false;` to
 *    `true` when the request's User-Agent looks like a mobile device.
 *
 *    This flag is hardcoded false in the static index.html and drives the
 *    site's responsive layout branching (js/gameHallRWD.js). On the old
 *    Vercel setup something upstream must have been rewriting it per-request
 *    based on User-Agent; Workers Static Assets serves the raw file as-is,
 *    so real mobile visitors were always getting desktop-branch layout.
 *    This restores that per-request behavior at the edge.
 */

const MOBILE_UA_RE = /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini|Mobile/i;
const IS_MOBILE_FLAG_RE = /PageConfig\.isMobile\s*=\s*false\s*;/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- Image serving from R2 ---
    const imgMatch = url.pathname.match(/^\/img\/thumb\/([a-z0-9]+)\/([a-f0-9]+\.webp)$/i);
    if (imgMatch) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      const [, provider, filename] = imgMatch;
      const key = `${provider}/${filename}`;
      const object = await env.GAME_ASSETS.get(key);

      if (!object) {
        return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      if (!headers.get("content-type")) headers.set("content-type", "image/webp");

      if (request.method === "HEAD") return new Response(null, { headers });
      return new Response(object.body, { headers });
    }

    // --- Everything else: static assets, with mobile-flag patch for HTML ---
    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return assetResponse;
    }

    const isMobileUA = MOBILE_UA_RE.test(request.headers.get("User-Agent") || "");
    if (!isMobileUA) {
      return assetResponse;
    }

    let html = await assetResponse.text();
    html = html.replace(IS_MOBILE_FLAG_RE, "PageConfig.isMobile = true;");

    const headers = new Headers(assetResponse.headers);
    headers.delete("content-length");

    return new Response(html, { status: assetResponse.status, headers });
  },
};
