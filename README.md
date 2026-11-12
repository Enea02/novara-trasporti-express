# Novara Trasporti Express — sito

Sito statico (HTML + CSS + JS), nessuna build. Animazioni con GSAP (ScrollTrigger, SplitText) e Lenis, tutto self-hosted in `js/`.

## Struttura
- `index.html` — pagina (CSS inline)
- `js/app.js` — animazioni e interazioni; `js/*.min.js` — librerie (GSAP 3, Lenis)
- `img/` — immagini AVIF/WebP in più misure
- `fonts/` — Open Sans variabile, ridotto ai caratteri usati
- `_headers` — cache per Cloudflare Pages

## Deploy su Cloudflare Pages
Workers & Pages → Create → Pages → Connect to Git → questa repo
- Framework preset: **None**
- Build command: *(vuoto)*
- Build output directory: `/`

Ogni push su `main` pubblica il sito.

## Form contatti
Usa [Web3Forms](https://web3forms.com) (gratuito, 250 invii/mese). In `index.html` sostituire
`INSERISCI-ACCESS-KEY-WEB3FORMS` con la access key legata all'email che deve ricevere le richieste.

## Dopo aver modificato i JS
I file in `js/` sono in cache per un anno: aggiornare il parametro `?v=AAAAMMGG` negli `<script>` di `index.html`.
