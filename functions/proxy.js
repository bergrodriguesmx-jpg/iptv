export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const targetUrl = url.searchParams.get("url");
  if (!targetUrl) {
    return new Response("Use: /proxy?url=<URL>", { status: 400, headers: corsHeaders });
  }

  try {
    const target = new URL(targetUrl);
    const proxyBase = url.origin + "/proxy?url=";

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Referer": target.origin,
        "Origin": target.origin,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const isM3U8 = targetUrl.includes(".m3u8") || contentType.includes("mpegurl");

    if (isM3U8) {
      const body = await response.text();
      const lines = body.split("\n");
      const rewritten = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
            return trimmed.replace(/URI="([^"]+)"/g, (m, uri) => {
              const abs = new URL(uri, targetUrl).href;
              return 'URI="' + proxyBase + encodeURIComponent(abs) + '"';
            });
          }
          return line;
        }
        const abs = new URL(trimmed, targetUrl).href;
        return proxyBase + encodeURIComponent(abs);
      });

      const nr = new Response(rewritten.join("\n"), { status: 200 });
      Object.keys(corsHeaders).forEach((k) => nr.headers.set(k, corsHeaders[k]));
      nr.headers.set("Content-Type", "application/vnd.apple.mpegurl");
      return nr;
    }

    const nr = new Response(response.body, { status: response.status });
    Object.keys(corsHeaders).forEach((k) => nr.headers.set(k, corsHeaders[k]));
    if (contentType) nr.headers.set("Content-Type", contentType);
    return nr;

  } catch (err) {
    return new Response("Erro no proxy: " + err.message, { status: 500, headers: corsHeaders });
  }
}
