# Ease Consultancy AI Assistant — Hybrid deployment

This package adds a bilingual (Hindi/English) AI assistant to the existing static website.

## Included features

- Website-aware answers using a compact index generated from the 102 existing HTML pages.
- Gemini 3.8 Flash via a Cloudflare Worker (API key remains server-side).
- Hindi / English / automatic language selection.
- Service discovery and recommendations based on the site's own service pages.
- Indicative tax/GST/business document checklists.
- Consultation and contact shortcuts.
- Latest regulatory update digest using Gemini Google Search grounding, with source links.
- Browser voice input (where `SpeechRecognition` is supported) and read-aloud via browser speech synthesis.
- Knowledge-only fallback while the API endpoint is not configured.

## Cost and important limits

The design uses free tiers only; it does **not** guarantee unlimited free AI usage. Google's Gemini API free tier has model-specific rate limits and its free-tier terms state that submitted content may be used to improve Google products. The regulatory-update feature uses Google Search grounding and is subject to its free quota. Cloudflare Workers Free has request/CPU limits. Providers can change free-tier availability and quotas. Review current provider terms before launch.

Do not promise customers unlimited service. If free quota is exhausted, the assistant will show a temporary-unavailable message and the rest of the website will continue working.

## Deployment steps

### A. Create a Gemini API key

1. Open Google AI Studio: https://aistudio.google.com/app/apikey
2. Sign in and create a Gemini API key for a project.
3. Do not paste this key into any website JavaScript, HTML, GitHub repository, or public configuration file.
4. Keep it ready for the Worker secret step below.

### B. Deploy the Cloudflare Worker

Requirements: a free Cloudflare account and Node.js/npm installed on your computer.

1. Open a terminal in the `ease-ai-worker` folder.
2. Run:

   ```bash
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   ```

3. Paste the Gemini API key only into the secure prompt shown by Wrangler.
4. Deploy:

   ```bash
   npx wrangler deploy
   ```

5. Wrangler will print a Worker URL, normally similar to:

   `https://ease-consultancy-ai.<your-account>.workers.dev`

6. Test:

   `https://ease-consultancy-ai.<your-account>.workers.dev/health`

   It should return JSON with `"ok": true`.

`wrangler.toml` already restricts browser requests to:
- `https://easeconsultancy.in`
- `https://www.easeconsultancy.in`

If your website uses a different exact hostname, edit `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.

### C. Connect the website to the Worker

1. Open `ease-ai-config.js` in the website root.
2. Set `apiBase` to the Worker URL, without a trailing slash:

   ```js
   window.EASE_AI_CONFIG = {
     apiBase: "https://ease-consultancy-ai.<your-account>.workers.dev"
   };
   ```

3. Upload the complete website folder to your existing static host.
4. Hard-refresh the website (`Ctrl + Shift + R`).
5. Open the AI sparkle button and test a simple service question, Hindi question, consultation prompt and Latest updates.

Until `apiBase` is configured, the assistant runs in knowledge-only fallback mode and does not call Gemini.

## Security and privacy

- The Gemini key is stored as a Cloudflare Worker secret named `GEMINI_API_KEY`.
- The browser only receives the Worker URL; it never receives the key.
- The Worker allows only the configured website origins, limits request size, truncates user input, applies a basic per-isolate request throttle and does not write chat messages to a database.
- The site does not persist chat transcripts in localStorage.
- Do not request or accept PAN, Aadhaar, bank account details, passwords, OTPs, tax portal credentials or confidential documents in chat.
- Gemini's free tier may use submitted content to improve Google products under Google's terms. The privacy policy on the site discloses this. Do not use the free tier for sensitive or confidential customer information.
- Browser speech recognition support varies. Some browsers send audio to a speech service and require internet access. Users can type instead.
- The in-memory throttle is a basic abuse deterrent, not a globally consistent quota system. For a public high-traffic launch, configure Cloudflare rate limiting/WAF rules and monitor usage.

## Regulatory updates

The Latest updates button uses Google Search grounding and asks the model to prioritize official Indian regulator/government sources. The Worker returns source URLs supplied in grounding metadata. Always verify the original notification/circular and effective date before acting. This is an informational digest, not an official government feed or professional advice.

## Testing checklist

- [ ] `/health` returns `ok: true`
- [ ] API key is set as a Worker secret (never in public JS)
- [ ] `ease-ai-config.js` contains the deployed Worker URL
- [ ] English and Hindi text chat both work
- [ ] Service recommendation uses actual site pages
- [ ] Document checklist includes an indicative/non-exhaustive caveat
- [ ] Consultation shortcut opens `consultation-availability.html`
- [ ] Latest updates returns source links
- [ ] Voice input works in supported browser with microphone permission
- [ ] Read aloud works with device voices
- [ ] Test on desktop and mobile
- [ ] No sensitive personal data is entered during testing

## Troubleshooting

- `AI key is not configured`: run `npx wrangler secret put GEMINI_API_KEY` and deploy again.
- `Origin not allowed`: add the exact website origin to `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.
- `AI free-tier limit reached`: wait for the provider quota reset; do not enable paid billing if maintaining ₹0 cost is mandatory.
- Assistant stays in fallback mode: confirm `apiBase` is set correctly and the Worker `/health` endpoint opens.
- Voice input unavailable: use a supported browser/device or type the question.


### Strict ₹0 note about live regulatory search
The chat model uses Gemini 3.8 Flash. Google's current pricing page lists Gemini 3.8 Flash text generation as free-tier eligible, but Google Search grounding is not available on the free tier for this model. Therefore the Worker `/api/updates` live-search endpoint may require a paid tier. If you must keep spending at ₹0, do not enable paid billing for this feature; use the assistant's website knowledge mode and manually curated official update links until an RSS-based free update feed is implemented. Do not add a payment method or upgrade just to make this button work.
