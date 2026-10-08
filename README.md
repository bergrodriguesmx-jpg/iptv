# 📺 IPTV Player

Player IPTV com proxy CORS via Cloudflare Workers.

## Estrutura

- `index.html` — Player (Cloudflare Pages)
- `worker.js` — Proxy CORS (Cloudflare Workers)
- `wrangler.toml` — Configuração do Worker

## Como usar

1. Faça deploy do Worker no Cloudflare
2. Cole a URL do Worker no player
3. Carregue uma playlist e assista

## Tecnologias

- hls.js
- Cloudflare Pages
- Cloudflare Workers
