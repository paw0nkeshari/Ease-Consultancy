EASE CONSULTANCY — 5,304+ QUESTION-TO-RESPONSE MAPPINGS
Version: 2.0

WHAT THIS UPDATE ADDS
1. 5,304 page-specific question mappings: 52 natural-language question forms for each of the 102 pages in the current indexed site knowledge set. The forms cover English, Hinglish and Hindi.
2. Richer answer content: visible section text is extracted from the website pages and stored with page descriptions, headings and summaries. This includes service scope, FAQ text, document-preparation guidance and consultation steps where those details are published.
3. Human-style conversation handling: greetings (hi/hii/hello/namaste), thanks, goodbye, how-are-you, assistant identity, capability questions, human-support requests, service overview, privacy reminders, confusion/clarification, simple acknowledgements, apologies, compliments and short follow-ups.
4. Context-aware follow-ups: short prompts such as “documents?”, “fees?”, “process?”, “more details” and “aur batao” can refer to the service discussed immediately before.
5. The existing 8-second Gemini-first / Ease Self AI fallback remains in place. Basic conversation intents are handled locally without calling Gemini.

IMPORTANT MEANING OF “5,304”
These are 5,304 searchable question-to-page response mappings (52 per indexed page). They are not 5,304 separately hand-written or independently verified answers. The assistant composes a relevant answer from the matched page's extracted visible text, headings, descriptions and summaries. It must not invent missing fees, eligibility, turnaround times or statutory advice.

FILES TO REPLACE IN GITHUB
- ease-ai-assistant.js
- ease-ai-knowledge.js

OPTIONAL REFERENCE / BACKUP FILES
- ease-ai-knowledge.json is a readable JSON backup of the enriched 102-page index. The website loads ease-ai-knowledge.js, not this JSON file.
- ease-ai-question-library.csv contains all 5,304 question patterns with their mapped page title and URL. It is for review; the website does not load the CSV.

DO NOT REPLACE
- ease-ai-config.js: keep your already configured Worker URL and geminiTimeoutMs: 8000.
- ease-ai-assistant.css: leave the current design and styling unchanged.
- ease-ai-worker: no Worker code or secret needs to change for this knowledge expansion.

GITHUB PUBLISHING STEPS
1. Download and extract this ZIP.
2. Open https://github.com/paw0nkeshari/Ease-Consultancy
3. Open ease-ai-knowledge.js, click Edit, replace its complete contents with the downloaded file, and commit to the GitHub Pages publishing branch (currently main).
4. Open ease-ai-assistant.js, click Edit, replace its complete contents with the downloaded file, and commit to the same branch.
5. Keep the script order in HTML: ease-ai-config.js, then ease-ai-knowledge.js, then ease-ai-assistant.js. Existing pages already use this order; do not add duplicate script tags.
6. Wait for GitHub Pages deployment. Open the website and hard-refresh using Ctrl+Shift+R.

TEST QUESTIONS
- “hii” — friendly local greeting.
- “aap kaise hain?” — Hinglish/Hindi conversational reply.
- “How are you?” — friendly conversational reply.
- “What services does Ease Consultancy provide?” — website service overview with service-page links.
- “Tell me about GST Registration” — answer from the GST registration page sections.
- “What documents are useful for ITR filing?” — relevant ITR preparation/document section where available.
- After a service question, “documents?” / “fees?” / “aur batao” — contextual follow-up.
- “I want to speak to a consultant” — Contact Us and consultation links.
- If Gemini is unavailable or slower than 8 seconds — the website Self AI fallback supplies the response.

PRIVACY AND LIMITS
- No Gemini API key is included in frontend files.
- The local fallback reads the website knowledge loaded in the visitor's browser; it does not send questions to an external AI provider.
- When Gemini responds within the configured deadline, the Gemini answer is used; otherwise the local website answer is used.
- Do not ask clients to enter PAN, Aadhaar, bank details, passwords, OTPs or confidential documents in chat.
- Current legal/tax requirements and live regulatory updates must be verified against current official sources or confirmed by the consultancy team. The knowledge-based Self AI is not a substitute for professional advice.
