export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    // Se tem ?url= então faz PROXY CORS
    if (targetUrl) {
      try {
        const target = new URL(targetUrl);
        const proxyBase = `${url.origin}?url=`;

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
          let body = await response.text();
          const lines = body.split("\n");
          const rewritten = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
              if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
                return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                  const abs = new URL(uri, targetUrl).href;
                  return `URI="${proxyBase}${encodeURIComponent(abs)}"`;
                });
              }
              return line;
            }
            const abs = new URL(trimmed, targetUrl).href;
            return `${proxyBase}${encodeURIComponent(abs)}`;
          });

          const newResponse = new Response(rewritten.join("\n"), response);
          Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
          newResponse.headers.set("Content-Type", "application/vnd.apple.mpegurl");
          return newResponse;
        }

        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
        return newResponse;

      } catch (err) {
        return new Response(`Erro no proxy: ${err.message}`, {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Senão, serve o site (index.html e outros arquivos)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Assets não configurados", { status: 500 });
  },
};
