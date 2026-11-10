(() => {
  if (window.__EASE_AI_ASSISTANT__) return;
  window.__EASE_AI_ASSISTANT__ = true;

  const CONFIG = window.EASE_AI_CONFIG || {};
  const API_BASE = String(CONFIG.apiBase || "").replace(/\/+$/, "");
  const GEMINI_TIMEOUT_MS = Math.max(1000, Math.min(30000, Number(CONFIG.geminiTimeoutMs) || 8000));
  let language = "both", busy = false, recognition = null;
  const history = [];
  const root = document.createElement("div");
  root.id = "ease-ai-root";
  root.innerHTML = `
    <button id="ease-ai-launcher" type="button" aria-label="Open Ease AI Assistant" title="Ask Ease AI"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></button>
    <section id="ease-ai-panel" role="dialog" aria-label="Ease AI Assistant" aria-modal="false">
      <header id="ease-ai-header"><span aria-hidden="true">✦</span><div class="ease-ai-brand"><strong>Ease AI Assistant</strong><small>Accounting • Tax • Advisory | Hindi & English</small></div><button id="ease-ai-close" aria-label="Close assistant" type="button">×</button></header>
      <div id="ease-ai-toolbar"><select id="ease-ai-language" aria-label="Chat language"><option value="both">Auto language</option><option value="en">English</option><option value="hi">हिन्दी</option></select><button id="ease-ai-updates" type="button">Latest updates</button></div>
      <div id="ease-ai-messages" aria-live="polite"></div>
      <div id="ease-ai-suggestions">
        <button type="button" data-prompt="What services does Ease Consultancy provide?">Our services</button>
        <button type="button" data-prompt="Give me a document checklist for GST registration.">GST checklist</button>
        <button type="button" data-prompt="I want to book a consultation. What should I do?">Book consultation</button>
      </div>
      <div id="ease-ai-quicklinks"><a href="consultation-availability.html">Book a consultation</a><a href="contact.html">Contact Ease</a></div>
      <form id="ease-ai-compose"><button class="ease-ai-action" id="ease-ai-mic" type="button" aria-label="Speak your question" title="Voice input">🎙</button><textarea id="ease-ai-input" rows="1" maxlength="1200" placeholder="Ask in Hindi or English..." aria-label="Your question"></textarea><button class="ease-ai-action" id="ease-ai-send" type="submit" aria-label="Send question">➤</button></form>
      <div id="ease-ai-status">Answers are based on Ease Consultancy information and may need professional verification. Do not enter PAN, Aadhaar, bank details, passwords, OTPs or confidential documents.</div>
    </section>`;
  document.body.appendChild(root);

  const $ = id => document.getElementById(id);
  const panel = $("ease-ai-panel"), messages = $("ease-ai-messages"), input = $("ease-ai-input");
  const say = (text, who = "assistant") => {
    const bubble = document.createElement("div");
    bubble.className = `ease-ai-message ${who}`;
    const textNode = document.createElement("div");
    textNode.className = "ease-ai-message-text";
    textNode.textContent = text;
    bubble.appendChild(textNode);
    if (who === "assistant") {
      const speak = document.createElement("button");
      speak.type = "button"; speak.className = "ease-ai-speak"; speak.textContent = "🔊 Read aloud";
      speak.addEventListener("click", () => {
        if (!window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(textNode.textContent || text);
        utterance.lang = /[\u0900-\u097F]/.test(textNode.textContent || text) ? "hi-IN" : (language === "hi" ? "hi-IN" : "en-IN");
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
      });
      bubble.appendChild(speak);
    }
    messages.appendChild(bubble); messages.scrollTop = messages.scrollHeight;
    return bubble;
  };
  const addSources = (bubble, sources, title = "Website sources") => {
    if (!Array.isArray(sources) || !sources.length) return;
    const wrap = document.createElement("div"); wrap.className = "ease-ai-sources";
    const label = document.createElement("strong"); label.textContent = title; wrap.appendChild(label);
    const seen = new Set();
    sources.slice(0, 5).forEach(src => {
      try {
        const url = new URL(src.url, location.href);
        if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href)) return;
        seen.add(url.href);
        const a = document.createElement("a"); a.href = url.href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = src.title || url.hostname;
        wrap.appendChild(a);
      } catch (_) { /* Ignore malformed local knowledge URLs. */ }
    });
    if (wrap.childElementCount > 1) bubble.appendChild(wrap);
  };
  const open = () => {
    panel.classList.add("is-open"); $("ease-ai-launcher").setAttribute("aria-expanded", "true"); input.focus();
    if (!messages.childElementCount) say("Namaste! Welcome to Ease Consultancy. I can help you explore services, website information, document preparation and the consultation process. How may I help?");
  };
  $("ease-ai-launcher").addEventListener("click", open);
  $("ease-ai-close").addEventListener("click", () => { panel.classList.remove("is-open"); $("ease-ai-launcher").setAttribute("aria-expanded", "false"); });
  $("ease-ai-language").addEventListener("change", e => { language = e.target.value; });

  const STOP = new Set(["what","which","where","when","how","does","do","is","are","the","a","an","and","or","for","to","of","in","on","my","me","please","tell","about","can","you","i","need","want","with","from","your","our","ease","consultancy","service","services","मुझे","क्या","कैसे","कहाँ","कब","है","हैं","का","की","के","को","में","पर","और","बताओ","बताइए","करना","चाहिए","मेरे","लिए","कृपया"]);
  const SYNONYMS = [
    { aliases:["services","service","what do you offer","हमारी सेवाएं","सेवाएं","सेवा"], terms:["gst","income tax","audit","accounting","business","certification","advisory"] },
    { aliases:["जीएसटी","जी एस टी","gst","goods and services tax"], terms:["gst"] },
    { aliases:["रजिस्ट्रेशन","पंजीकरण","registration","register"], terms:["registration"] },
    { aliases:["रिटर्न","रिटर्न फाइल","return filing","returns"], terms:["return","filing"] },
    { aliases:["आयकर","इनकम टैक्स","income tax"], terms:["income","tax"] },
    { aliases:["आईटीआर","itr","रिटर्न भरना"], terms:["itr","income tax return"] },
    { aliases:["ऑडिट","अंकेक्षण","audit"], terms:["audit"] },
    { aliases:["हिसाब","बहीखाता","लेखा","accounting","bookkeeping"], terms:["accounting","bookkeeping"] },
    { aliases:["कंपनी","कम्पनी","company"], terms:["company"] },
    { aliases:["एलएलपी","llp"], terms:["llp"] },
    { aliases:["सलाह","परामर्श","कंसल्टेशन","consultation","appointment","अपॉइंटमेंट"], terms:["consultation","appointment","advisory"] },
    { aliases:["कागज","कागजात","दस्तावेज","दस्तावेज़","documents","papers","checklist"], terms:["documents","documentation"] },
    { aliases:["फीस","शुल्क","कीमत","price","pricing","charges"], terms:["fees","pricing"] },
    { aliases:["ई वे बिल","ई-वे बिल","e way bill","e-way bill"], terms:["e-way bill"] },
    { aliases:["ई इनवॉइस","ई-इनवॉइस","e invoice","e-invoice"], terms:["e-invoice"] },
    { aliases:["पैन","pan card"], terms:["pan"] },
    { aliases:["टीडीएस","tds"], terms:["tds"] },
    { aliases:["startup","स्टार्टअप","व्यवसाय शुरू"], terms:["startup","business"] }
  ];
  const normalize = value => String(value || "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  function getKnowledge(query) {
    const normalized = normalize(query);
    const terms = normalized.split(/\s+/).filter(t => t.length > 1 && !STOP.has(t));
    SYNONYMS.forEach(group => {
      if (group.aliases.some(alias => normalized.includes(normalize(alias)))) group.terms.forEach(term => terms.push(normalize(term)));
    });
    const uniqueTerms = [...new Set(terms)].filter(Boolean);
    const records = Array.isArray(window.EASE_AI_KNOWLEDGE) ? window.EASE_AI_KNOWLEDGE : [];
    return records.map(page => {
      const title = normalize(page.title), description = normalize(page.description);
      const headings = normalize((page.headings || []).join(" "));
      const summary = normalize((page.summary || []).join(" "));
      let score = 0;
      uniqueTerms.forEach(term => {
        if (title.includes(term)) score += 7;
        if (description.includes(term)) score += 4;
        if (headings.includes(term)) score += 3;
        if (summary.includes(term)) score += 1;
      });
      if (normalized.length > 3 && title.includes(normalized)) score += 12;
      return { ...page, score };
    }).filter(page => page.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  }
  function localReply(query, hits) {
    const isHindi = language === "hi" || (language === "both" && (/[\u0900-\u097F]/.test(query) || /\b(kya|kaise|hai|hain|mujhe|chahiye|batao|bataye|ke|ka|ki|mein|mera|hamari)\b/i.test(query)));
    if (!hits.length) {
      return {
        answer: isHindi
          ? "Ease Self AI: Is sawal ka jawab mujhe abhi Ease Consultancy ki website ki available information mein nahi mila. Kripya service ka naam ya sawal thoda alag tarike se poochhein, ya Contact Us page se team se sampark karein. Main website ke bahar ki jankari ka andaza nahi lagaunga."
          : "Ease Self AI: I couldn't find a reliable answer to this question in the available Ease Consultancy website information. Please rephrase the question or contact the team through the Contact Us page. I won't guess beyond the website's published information.",
        sources: [{ title: "Contact Us | Ease Consultancy", url: "contact.html" }]
      };
    }
    const best = hits[0];
    const selected = hits.filter((page, i) => i === 0 || (i < 3 && page.score >= best.score * 0.55)).slice(0, 3);
    const blocks = selected.map(page => {
      const lines = [];
      if (page.description && page.description.trim()) lines.push(page.description.trim());
      const summaries = [...new Set((page.summary || []).map(s => String(s || "").trim()).filter(s => s.length > 25))];
      summaries.filter(s => !/(content note:|reference card|the page follows|original page|starting price preserved|quick guidance about|click a service card|explore each service|the following scope is taken)/i.test(s)).slice(0, 3).forEach(s => {
        if (!lines.some(existing => existing.toLowerCase() === s.toLowerCase())) lines.push(s);
      });
      if (!lines.length) {
        const headings = (page.headings || []).filter(h => h && !/frequently asked|what does|what information|how do i get/i.test(h)).slice(0, 5);
        if (headings.length) lines.push("This page covers: " + headings.join(", ") + ".");
      }
      if (!lines.length) lines.push("A dedicated page for this topic is available on the Ease Consultancy website. Open the source page for the published details.");
      return page.title + "\n" + lines.map(line => "• " + line).join("\n");
    });
    const intro = isHindi
      ? "Ease Self AI — neeche ka jawab sirf Ease Consultancy website par available jankari par aadharit hai:"
      : "Ease Self AI — this answer is based only on information available on the Ease Consultancy website:";
    const note = isHindi
      ? "Dhyan dein: exact eligibility, documents, fees aur timelines case ke hisaab se alag ho sakte hain. Final details team se confirm karein."
      : "Please note: exact eligibility, documents, fees and timelines may vary by case. Confirm the final details with the Ease Consultancy team.";
    return { answer: intro + "\n\n" + blocks.join("\n\n") + "\n\n" + note, sources: selected.map(page => ({ title: page.title, url: page.url })) };
  }

  async function send(explicit) {
    const question = (explicit || input.value).trim();
    if (!question || busy) return;
    input.value = ""; say(question, "user");
    history.push({ role: "user", text: question });
    if (history.length > 8) history.splice(0, 2);
    busy = true; $("ease-ai-send").disabled = true;
    const loading = say("Gemini is checking your question…");
    const matches = getKnowledge(question);
    const fallback = reason => {
      const local = localReply(question, matches);
      const textNode = loading.querySelector(".ease-ai-message-text");
      if (textNode) textNode.textContent = local.answer;
      addSources(loading, local.sources, "Ease Consultancy website sources");
      history.push({ role: "model", text: local.answer });
    };
    try {
      if (!API_BASE) {
        fallback("Gemini API is not configured");
        return;
      }
      const controller = new AbortController();
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Gemini exceeded the " + Math.round(GEMINI_TIMEOUT_MS / 1000) + " second response limit"));
        }, GEMINI_TIMEOUT_MS);
      });
      const request = fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ message: question, language, history: history.slice(-8), knowledge: matches.slice(0, 6).map(p => ({ title: p.title, url: p.url, description: p.description, headings: p.headings, summary: p.summary })), currentPage: location.pathname })
      }).then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || ("AI service unavailable (" + response.status + ")"));
        if (!data || typeof data.answer !== "string" || !data.answer.trim()) throw new Error("AI returned an empty answer");
        return data;
      });
      let data;
      try { data = await Promise.race([request, deadline]); }
      finally { clearTimeout(timer); }
      const textNode = loading.querySelector(".ease-ai-message-text");
      if (textNode) textNode.textContent = data.answer;
      const sources = [...(Array.isArray(data.sources) ? data.sources : []), ...matches.slice(0, 3).map(p => ({ title: p.title, url: new URL(p.url, location.href).href }))];
      addSources(loading, sources, "Helpful sources");
      history.push({ role: "model", text: data.answer });
    } catch (error) {
      fallback(error && error.message ? error.message : "AI service temporarily unavailable");
    } finally {
      busy = false; $("ease-ai-send").disabled = false; messages.scrollTop = messages.scrollHeight;
    }
  }

  $("ease-ai-suggestions").addEventListener("click", e => {
    const button = e.target.closest("button[data-prompt]");
    if (button) { input.value = button.dataset.prompt; send(); }
  });
  $("ease-ai-compose").addEventListener("submit", e => { e.preventDefault(); send(); });

  $("ease-ai-updates").addEventListener("click", async () => {
    if (busy) return;
    open(); busy = true; $("ease-ai-updates").disabled = true;
    const item = say("Checking the website's published regulatory update information…");
    try {
      if (!API_BASE) throw new Error("The live updates service is not connected.");
      const response = await fetch(API_BASE + "/api/updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Update service unavailable");
      item.querySelector(".ease-ai-message-text").textContent = data.answer || "No update summary is available right now.";
      addSources(item, data.sources || [], "Official / reference sources");
    } catch (error) {
      item.querySelector(".ease-ai-message-text").textContent = "Live regulatory updates are unavailable right now. The assistant can still answer questions from Ease Consultancy's website information. For current legal or tax deadlines, please verify the official notification or contact the team.";
    } finally {
      busy = false; $("ease-ai-updates").disabled = false; messages.scrollTop = messages.scrollHeight;
    }
  });

  $("ease-ai-mic").addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { say("Voice input is not supported in this browser. Please type your question."); return; }
    try {
      if (recognition) { recognition.stop(); recognition = null; return; }
      recognition = new SpeechRecognition();
      recognition.lang = language === "hi" ? "hi-IN" : language === "en" ? "en-IN" : (navigator.language && navigator.language.startsWith("hi") ? "hi-IN" : "en-IN");
      recognition.interimResults = false; recognition.maxAlternatives = 1;
      recognition.onresult = event => { input.value = event.results[0][0].transcript; recognition = null; input.focus(); };
      recognition.onerror = () => { say("Microphone access or speech recognition was unavailable. Please check browser permissions or type your question."); recognition = null; };
      recognition.onend = () => { recognition = null; };
      recognition.start();
    } catch (_) { say("Could not start voice input. Please check microphone permission."); }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) $("ease-ai-close").click();
  });
})();
