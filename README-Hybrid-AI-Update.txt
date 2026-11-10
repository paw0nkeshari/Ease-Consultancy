Ease Consultancy — 8-Second Gemini + Self AI fallback update

Files in this package:
- ease-ai-assistant.js  (replacement assistant logic)
- ease-ai-config.js     (API base URL + 8000 ms timeout)

Deployment steps:
1. Open your GitHub repository: paw0nkeshari/Ease-Consultancy.
2. On the main branch, replace the existing root-level ease-ai-assistant.js with this file.
3. Replace the existing root-level ease-ai-config.js with this file.
4. Do NOT delete or replace ease-ai-knowledge.js, ease-ai-knowledge.json, ease-ai-assistant.css, or any HTML pages.
5. Commit both replacements to main and wait for GitHub Pages to publish.
6. Open the website in an Incognito window or hard-refresh with Ctrl+Shift+R.
7. Test once with a normal service question while Gemini is available.
8. Then test the fallback by temporarily using an invalid API base in a local test copy only. Do not change the live URL to an invalid value for visitors.

Expected behaviour:
- Gemini is attempted first.
- If a valid Gemini answer arrives within 8 seconds, it is displayed.
- If the request times out, fails, returns a non-2xx response, or returns an empty answer, the browser answers using the existing embedded Ease Consultancy knowledge index.
- Only one final assistant message is shown; the timed-out request is aborted.
- If the website knowledge index has no good match, the assistant says it could not find the answer and points the visitor to Contact Us. It does not invent an answer.

Security and cost notes:
- No Gemini API key is included in these files.
- Keep GEMINI_API_KEY only as a Cloudflare Worker secret.
- This code does not remove Gemini. It continues to use the currently configured Worker first.
- The fallback is a local, retrieval-based knowledge assistant, not a generative language model.
- Existing /api/updates behaviour remains dependent on the Worker. The 8-second fallback applies to chat questions.
