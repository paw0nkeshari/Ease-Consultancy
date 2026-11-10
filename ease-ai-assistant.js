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
  // Each indexed site page receives 52 searchable English/Hinglish/Hindi question forms.
  // With 102 indexed pages the library exposes 5,304 page-specific query patterns. Answers remain source-grounded.
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
  const normalize = value => String(value || "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const RESPONSE_LIBRARY_RECORDS = Array.isArray(window.EASE_AI_KNOWLEDGE) ? window.EASE_AI_KNOWLEDGE : [];
  const RESPONSE_PATTERN_RECORDS = Array.isArray(window.EASE_AI_RESPONSE_LIBRARY) ? window.EASE_AI_RESPONSE_LIBRARY : [];
  const QUESTION_PATTERN_INDEX = new Map();
  RESPONSE_PATTERN_RECORDS.forEach(record => {
    if (!record || !record.pageUrl || !record.question) return;
    if (!QUESTION_PATTERN_INDEX.has(record.pageUrl)) QUESTION_PATTERN_INDEX.set(record.pageUrl, []);
    QUESTION_PATTERN_INDEX.get(record.pageUrl).push(record.question);
  });
  const RESPONSE_PATTERN_COUNT = RESPONSE_PATTERN_RECORDS.length;
  window.EASE_AI_RESPONSE_STATS = {
    version: (window.EASE_AI_RESPONSE_LIBRARY_META || {}).version || "2.0",
    indexedPages: RESPONSE_LIBRARY_RECORDS.length,
    questionAnswerMappings: RESPONSE_PATTERN_COUNT
  };

  function getKnowledge(query) {
    const normalized = normalize(query);
    const terms = normalized.split(/\s+/).filter(t => t.length > 1 && !STOP.has(t));
    SYNONYMS.forEach(group => {
      if (group.aliases.some(alias => normalized.includes(normalize(alias)))) group.terms.forEach(term => terms.push(normalize(term)));
    });
    const uniqueTerms = [...new Set(terms)].filter(Boolean);
    const records = RESPONSE_LIBRARY_RECORDS;
    return records.map(page => {
      const title = normalize(page.title), description = normalize(page.description);
      const headings = normalize((page.headings || []).join(" "));
      const summary = normalize((page.summary || []).join(" "));
      const sections = normalize((page.sections || []).map(section => [section.heading, section.text].join(" ")).join(" "));
      const bodyText = normalize(page.bodyText || "");
      const questionPatterns = QUESTION_PATTERN_INDEX.get(page.url) || [];
      const questionText = normalize(questionPatterns.join(" "));
      let score = 0;
      uniqueTerms.forEach(term => {
        if (title.includes(term)) score += 7;
        if (description.includes(term)) score += 4;
        if (headings.includes(term)) score += 3;
        if (summary.includes(term)) score += 1;
        if (sections.includes(term)) score += 2.5;
        if (bodyText.includes(term)) score += 1.5;
        if (questionText.includes(term)) score += 0.35;
      });
      if (normalized.length > 3 && title.includes(normalized)) score += 12;
      if (questionPatterns.some(pattern => normalize(pattern) === normalized)) score += 16;
      // Contextual query phrase matching helps with natural-language variations without inventing facts.
      if (uniqueTerms.length >= 2) {
        const bestPhraseCoverage = questionPatterns.reduce((best, pattern) => {
          const pTerms = new Set(normalize(pattern).split(/\s+/).filter(t => t.length > 1 && !STOP.has(t)));
          const overlap = uniqueTerms.filter(term => pTerms.has(term)).length;
          return Math.max(best, overlap / uniqueTerms.length);
        }, 0);
        if (bestPhraseCoverage >= 0.5) score += Math.round(bestPhraseCoverage * 7);
      }
      return { ...page, score };
    }).filter(page => page.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  }
  let lastKnowledgeHits = [];
  function quickLocalReply(query) {
    const text = normalize(query).replace(/\s+/g, " ").trim();
    const isHindi = language === "hi" || (language === "both" && (/[\u0900-\u097F]/.test(query) || /\b(namaste|namaskar|kya|kaise|hai|hain|mujhe|chahiye|batao|bataye|aap|mera|hamari|ke|ka|ki|mein)\b/i.test(query)));
    const matches = pattern => pattern.test(text);
    const records = RESPONSE_LIBRARY_RECORDS;
    const byUrl = url => records.find(page => page.url === url);
    const isGreeting = matches(/^(hi+|h+i+|hello+|helo+|hey+|heyy+|hello there|hey there|namaste|namaskar|good morning|good afternoon|good evening|morning|नमस्ते|नमस्कार|राम राम|सुप्रभात|शुभ संध्या)[.!\s]*$/i);
    const isThanks = matches(/^(thanks|thank you|thankyou|thx|ty|thanks a lot|many thanks|धन्यवाद|शुक्रिया|बहुत धन्यवाद|आभार)[.!\s]*$/i);
    const isGoodbye = matches(/^(bye|goodbye|see you|see ya|talk to you later|take care|फिर मिलेंगे|अलविदा|चलता हूँ|चलती हूँ)[.!\s]*$/i);
    const isHowAreYou = matches(/^(how are you|how r you|how are u|how is it going|how s it going|how s your day|what s up|whats up|what is up|kaise ho|kaise hain|aap kaise hain|कैसे हो|कैसे हैं|आप कैसे हैं)[?!.,\s]*$/i);
    const isIdentity = matches(/^(who are you|what are you|what is your name|your name|aap kaun ho|aapka naam kya hai|आप कौन हैं|आपका नाम क्या है)[?!.,\s]*$/i);
    const isCapabilities = matches(/^(what can you do|how can you help|help me|what do you know|what can you help me with|aap kya kar sakte hain|aap meri kya help kar sakte hain|आप क्या कर सकते हैं|आप मेरी क्या मदद कर सकते हैं)[?!.,\s]*$/i);
    const isHuman = matches(/^(are you human|are you a real person|are you a bot|are you ai|kya aap insaan hain|kya aap real ho|kya aap human ho|क्या आप इंसान हैं|क्या आप असली व्यक्ति हैं)[?!.,\s]*$/i);
    const isHumanSupport = /(talk to (a person|someone|human|consultant|team|staff)|speak to (a person|a consultant|a human|someone|human|consultant|the team|team)|real person|human support|customer care|contact details|contact number|phone number|email address|team se baat|consultant se baat|kisi se baat|किसी व्यक्ति से बात|किसी से बात|टीम से बात|कंसल्टेंट से बात|संपर्क नंबर)/i.test(text);
    const isServiceOverview = /(what services|services do you provide|services do you offer|list your services|your services|service list|aapki services|aap kya services|kaun kaun si services|आप कौन सी सेवाएँ|आपकी सेवाएँ|कौन कौन सी सेवाएँ)/i.test(text);
    const isHelpConfusion = /(i do not understand|i don't understand|not understand|confused|samajh nahi|samajh nhi|समझ नहीं आया|समझ नहीं आ रहा)/i.test(text);
    const isAffirmative = matches(/^(ok|okay|okk|alright|sure|great|good|yes|yep|yeah|right|ठीक है|ठीक|हाँ|जी|बिल्कुल|अच्छा)[.!\s]*$/i);
    const isNegative = matches(/^(no|nope|not now|नहीं|अभी नहीं)[.!\s]*$/i);
    const isPrivacy = /(is my data safe|privacy|do you store my data|will you ask for otp|personal data|mera data|data safe|क्या मेरा डेटा सुरक्षित|गोपनीयता)/i.test(text);
    const isApology = matches(/^(sorry|i am sorry|my bad|apologies|maaf kijiye|माफ कीजिए|क्षमा करें)[.!\s]*$/i);
    const isCompliment = /(you are helpful|good job|nice work|great response|well done|bahut achha|बहुत अच्छा|शानदार)/i.test(text);

    if (isGreeting) return isHindi
      ? "नमस्ते! Ease Consultancy में आपका स्वागत है। 😊 मैं आपकी वेबसाइट का Self AI Assistant हूँ। आप Accounting, GST, Income Tax, Audit, Company/LLP, Certificates या Business Advisory के बारे में पूछ सकते हैं। बताइए, आज किस काम में मदद करूँ?"
      : "Hello! Welcome to Ease Consultancy. 😊 I’m your website assistant. I can help you explore Accounting, GST, Income Tax, Audit, Company/LLP, Certification and Business Advisory information. What can I help you with today?";
    if (isThanks) return isHindi
      ? "आपका बहुत-बहुत स्वागत है! 😊 क्या Ease Consultancy की किसी सेवा, दस्तावेज़ या consultation के बारे में और कुछ जानना चाहेंगे?"
      : "You’re very welcome! 😊 Is there anything else about our services, documents or consultation process I can help you with?";
    if (isGoodbye) return isHindi
      ? "धन्यवाद! Ease Consultancy पर आने के लिए आपका आभार। आपका दिन शुभ हो। जब भी ज़रूरत हो, वापस आइए।"
      : "Thank you for visiting Ease Consultancy. Have a lovely day! Come back whenever you need help.";
    if (isHowAreYou) return isHindi
      ? "मैं बढ़िया हूँ, धन्यवाद! 😊 आपकी सहायता के लिए तैयार हूँ। बताइए, आपको किस सेवा या जानकारी की ज़रूरत है?"
      : "I’m doing well, thank you! 😊 Ready to help. What service or information are you looking for today?";
    if (isIdentity) return isHindi
      ? "मेरा नाम Ease AI Assistant है। मैं Ease Consultancy की वेबसाइट में प्रकाशित जानकारी खोजकर आपको सरल भाषा में समझाने में मदद करता हूँ। मैं वेबसाइट से बाहर की जानकारी को तथ्य बताकर पेश नहीं करता।"
      : "I’m Ease AI Assistant, the website assistant for Ease Consultancy. I help visitors find and understand information published on this website. I don’t present information outside the website as verified facts.";
    if (isCapabilities) return isHindi
      ? "मैं Accounting & Bookkeeping, GST, Income Tax & ITR, Audit, Company/LLP compliance, Certificates, Business Startup Advisory, Digital Services और Consultation से जुड़ी वेबसाइट जानकारी खोज सकता हूँ। आप Hindi, Hinglish या English में पूछ सकते हैं।"
      : "I can help you find website information about Accounting & Bookkeeping, GST, Income Tax & ITR, Auditing, Company/LLP compliance, Certificates, Business Startup Advisory, Digital Services and consultations. Ask in English, Hindi or Hinglish.";
    if (isHuman) return isHindi
      ? "मैं एक website-based AI assistant हूँ, इंसान नहीं। मैं वेबसाइट की उपलब्ध जानकारी खोजता हूँ। किसी व्यक्ति से बात करने के लिए Contact Us या Book a Consultation पेज खोलें।"
      : "I’m an AI assistant on the Ease Consultancy website, not a human. I search the website’s published information. To speak with the team, use Contact Us or Book a Consultation.";
    if (isHumanSupport) return isHindi
      ? "ज़रूर। आप हमारी टीम से सीधे संपर्क करने के लिए Contact Us पेज खोल सकते हैं या consultation request भेज सकते हैं। टीम उपलब्धता देखकर आपसे संपर्क करेगी।"
      : "Certainly. You can contact the Ease Consultancy team through the Contact Us page or submit a consultation request. The team will review your request and get back to you.";
    if (isServiceOverview) {
      const page = byUrl("index.html");
      const summary = page && (page.summary || []).find(x => x && x.length > 30);
      return (isHindi ? "Ease Consultancy की वेबसाइट पर Accounting, Taxation, Audit, Compliance और Financial/Business Advisory से जुड़ी सेवाओं की जानकारी उपलब्ध है. " : "Ease Consultancy’s website covers services across accounting, taxation, audit, compliance and financial/business advisory. ") + (summary || "Explore the service pages to see the published scope and next steps.") + (isHindi ? " आप किसी एक सेवा का नाम बताइए, मैं उसका विवरण और संबंधित पेज दिखाऊँगा।" : " Tell me which service interests you and I’ll find its details and page.");
    }
    if (isHelpConfusion) return isHindi
      ? "कोई बात नहीं, मैं आसान भाषा में समझाने की कोशिश करूँगा। आप बस सेवा का नाम या अपना सवाल छोटे वाक्य में लिख दीजिए—जैसे ‘GST registration’, ‘ITR filing’ या ‘documents’."
      : "No problem. I can break it down in simpler language. Just share the service name or ask a short question, such as ‘GST registration’, ‘ITR filing’ or ‘required documents’.";
    if (isAffirmative) return isHindi
      ? "ठीक है! 😊 बताइए, आगे किस जानकारी में मदद करूँ?"
      : "Sounds good! 😊 What would you like to explore next?";
    if (isNegative) return isHindi
      ? "ठीक है, कोई बात नहीं। जब भी मदद चाहिए, मैं यहीं हूँ।"
      : "No problem. I’ll be here whenever you need assistance.";
    if (isPrivacy) return isHindi
      ? "कृपया chat में PAN, Aadhaar, बैंक विवरण, पासवर्ड, OTP या confidential documents साझा न करें। किसी दस्तावेज़ की ज़रूरत हो तो टीम से सुरक्षित प्रक्रिया की पुष्टि करें।"
      : "Please do not share PAN, Aadhaar, bank details, passwords, OTPs or confidential documents in this chat. Ask the team to confirm a secure process before sharing documents.";
    if (isApology) return isHindi
      ? "कोई बात नहीं! 😊 आराम से बताइए, आपको किस जानकारी में मदद चाहिए?"
      : "No worries at all! 😊 Take your time. What would you like help with?";
    if (isCompliment) return isHindi
      ? "बहुत धन्यवाद! 😊 मेरा उद्देश्य आपकी मदद करना है। Ease Consultancy की किसी सेवा के बारे में और जानना चाहेंगे?"
      : "Thank you — glad I could help! 😊 Would you like to explore another Ease Consultancy service?";

    // Short follow-up questions inherit the previous service topic.
    const isFollowUp = matches(/^(more|more details|details|explain more|tell me more|documents?|papers?|checklist|fees?|price|pricing|charges?|process|steps?|timeline|how long|next step|what next|aur|aur batao|thoda aur|detail mein|documents kya|fees kya|कागज़|दस्तावेज़|फीस|प्रक्रिया|और बताइए|आगे क्या|थोड़ा और समझाइए)[?!.,\s]*$/i);
    if (isFollowUp && lastKnowledgeHits.length) {
      const prior = lastKnowledgeHits[0];
      const docsQuestion = /(document|paper|checklist|दस्तावेज़|कागज़)/i.test(text);
      const feeQuestion = /(fee|price|pricing|charge|फीस)/i.test(text);
      const timeQuestion = /(time|timeline|long|समय)/i.test(text);
      const intentPattern = docsQuestion ? /(document|paper|checklist|keep ready|prepare|record|information)/i
        : feeQuestion ? /(fee|pricing|price|starting|cost|quotation)/i
        : timeQuestion ? /(time|timeline|duration|days|working day)/i
        : /(process|procedure|step|how to|getting started|application|filing|scope|service)/i;
      const relatedSections = (prior.sections || []).filter(section => intentPattern.test((section.heading || "") + " " + (section.text || ""))).slice(0, 3);
      const detail = relatedSections.map(section => (section.heading ? section.heading + " — " : "") + section.text);
      if (!detail.length) detail.push(...(prior.summary || []).filter(x => x && x.length > 25 && !/(content note:|reference card|starting price preserved|quick guidance about)/i.test(x)).slice(0, 2));
      let opening = isHindi ? `ज़रूर। हम ${prior.title} की बात कर रहे थे।` : `Sure — we were discussing ${prior.title}.`;
      if (docsQuestion && !relatedSections.length) opening += isHindi ? " इस indexed page में पूरी case-specific document checklist नहीं मिली, इसलिए मैं अनुमान से सूची नहीं दूँगा। exact checklist टीम से confirm करें।" : " I couldn't find a complete case-specific document checklist in the indexed page, so I won't invent one. Please confirm the exact checklist with the team.";
      else if (feeQuestion && !relatedSections.length) opening += isHindi ? " इस indexed page में final case-specific fee confirm नहीं है। quotation के लिए टीम से संपर्क करें।" : " The indexed page does not confirm a final case-specific fee. Please contact the team for a quotation.";
      else if (timeQuestion && !relatedSections.length) opening += isHindi ? " इस indexed page में final turnaround time confirm नहीं है। कृपया टीम से पुष्टि करें।" : " The indexed page does not confirm a final turnaround time. Please confirm with the team.";
      const middle = detail.length ? "\n\n" + detail.join("\n\n") : "";
      return opening + middle + (isHindi ? "\n\nक्या आप इस सेवा की प्रक्रिया या शुरुआत के बारे में जानना चाहेंगे?" : "\n\nWould you like to know about the process or how to get started?");
    }
    return "";
  }
  function localReply(query, hits) {
    const normalizedQuery = normalize(query);
    const isHindi = language === "hi" || (language === "both" && (/[\u0900-\u097F]/.test(query) || /\b(namaste|kya|kaise|hai|hain|mujhe|chahiye|batao|bataye|aap|mera|hamari|ke|ka|ki|mein)\b/i.test(query)));
    const docsIntent = /(document|documents|paper|papers|checklist|record|दस्तावेज|कागज|काग़ज़|कागजात)/i.test(normalizedQuery);
    const feeIntent = /(fee|fees|price|pricing|charge|cost|शुल्क|फीस|कीमत)/i.test(normalizedQuery);
    const timeIntent = /(time|timeline|duration|how long|समय|कितना समय)/i.test(normalizedQuery);
    const processIntent = /(process|procedure|steps|how to|apply|registration|filing|प्रक्रिया|तरीका|कैसे)/i.test(normalizedQuery);
    const isFollowUpOnly = /^(more|more details|details|explain more|tell me more|documents?|papers?|checklist|fees?|price|pricing|charges?|process|steps?|timeline|how long|next step|what next|aur|aur batao|thoda aur|detail mein|documents kya|fees kya|कागज़|दस्तावेज़|फीस|प्रक्रिया|और बताइए|आगे क्या|थोड़ा और समझाइए)$/i.test(normalizedQuery);
    if ((!hits || !hits.length) && isFollowUpOnly && lastKnowledgeHits.length) hits = lastKnowledgeHits;
    if (!hits || !hits.length) {
      return {
        answer: isHindi
          ? "मुझे इस सवाल का भरोसेमंद जवाब अभी Ease Consultancy की indexed website information में नहीं मिला। कृपया service का नाम बताकर दोबारा पूछें। मैं अनुमान लगाकर tax, legal या fee-related जानकारी नहीं दूँगा। जरूरत हो तो Contact Us पेज से टीम से संपर्क करें।"
          : "I couldn't find a reliable answer to this question in the indexed Ease Consultancy website information. Please mention the service name and try again. I won't guess tax, legal or fee-related facts. You can also contact the team through the Contact Us page.",
        sources: [{ title: "Contact Us | Ease Consultancy", url: "contact.html" }]
      };
    }
    const best = hits[0];
    const selected = hits.filter((page, index) => index === 0 || (index < 2 && page.score >= best.score * 0.65)).slice(0, 2);
    lastKnowledgeHits = selected;
    const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2 && !STOP.has(term));
    const blocks = selected.map(page => {
      const lines = [];
      if (page.description && page.description.trim()) lines.push(page.description.trim());
      const sections = (page.sections || []).map(section => {
        const content = normalize([section.heading, section.text].join(" "));
        let score = queryTerms.reduce((n, term) => n + (content.includes(term) ? 2 : 0), 0);
        if (docsIntent && /(document|paper|checklist|keep ready|prepare|record|information)/i.test(section.heading + " " + section.text)) score += 8;
        if (feeIntent && /(fee|pricing|price|starting|cost|quotation)/i.test(section.heading + " " + section.text)) score += 8;
        if (timeIntent && /(time|timeline|duration|days|working day)/i.test(section.heading + " " + section.text)) score += 8;
        if (processIntent && /(process|procedure|step|how to|getting started|application|filing)/i.test(section.heading + " " + section.text)) score += 5;
        return { ...section, score };
      }).filter(section => section.score > 0).sort((a,b) => b.score-a.score).slice(0, docsIntent || feeIntent || timeIntent || processIntent ? 3 : 2);
      sections.forEach(section => {
        const text = String(section.text || "").trim();
        if (text && !lines.some(line => line.toLowerCase() === text.toLowerCase())) lines.push(text);
      });
      const summaries = [...new Set((page.summary || []).map(value => String(value || "").trim()).filter(value => value.length > 25))];
      summaries.filter(value => !/(content note:|reference card|the page follows|original page|starting price preserved|quick guidance about|click a service card|explore each service|the following scope is taken)/i.test(value)).slice(0, sections.length ? 1 : 3).forEach(value => {
        if (!lines.some(line => line.toLowerCase() === value.toLowerCase())) lines.push(value);
      });
      if (!lines.length) {
        const headings = (page.headings || []).filter(heading => heading && !/frequently asked|what does|what information|how do i get/i.test(heading)).slice(0, 6);
        if (headings.length) lines.push((isHindi ? "इस पेज पर इन विषयों की जानकारी है: " : "This page covers: ") + headings.join(", ") + ".");
      }
      if (!lines.length) lines.push(isHindi ? "इस सेवा के लिए वेबसाइट पर अलग पेज उपलब्ध है। पूरी प्रकाशित जानकारी के लिए स्रोत पेज खोलें।" : "A dedicated page for this service is available. Open the source page for its published details.");
      return page.title + "\n" + lines.map(line => "• " + line).join("\n");
    });
    let specificNote = "";
    if (docsIntent && !selected.some(page => (page.sections || []).some(section => /(document|paper|checklist|keep ready|prepare)/i.test(section.heading + " " + section.text)))) {
      specificNote = isHindi ? "इस सेवा की पूरी case-specific document checklist indexed content में नहीं मिली; इसलिए मैं कोई सूची अनुमान से नहीं बना रहा। exact checklist टीम से confirm करें।" : "A complete case-specific document checklist was not present in the indexed material, so I won't invent one. Please confirm the exact checklist with the team.";
    } else if (feeIntent && !selected.some(page => (page.sections || []).some(section => /(fee|pricing|price|starting|cost)/i.test(section.heading + " " + section.text)))) {
      specificNote = isHindi ? "इस indexed page content में final case-specific fee confirm नहीं है। quotation के लिए टीम से संपर्क करें।" : "The indexed page content does not confirm a final case-specific fee. Please contact the team for a quotation.";
    } else if (timeIntent && !selected.some(page => (page.sections || []).some(section => /(time|timeline|duration|working day)/i.test(section.heading + " " + section.text)))) {
      specificNote = isHindi ? "इस indexed content में final turnaround time confirm नहीं है। समय case scope और records पर निर्भर हो सकता है; टीम से पुष्टि करें।" : "The indexed content does not confirm a final turnaround time. Timing may depend on the case scope and records; please confirm with the team.";
    }
    const intro = isHindi
      ? "Bilkul — main aapko Ease Consultancy ki website par published jankari ke aadhar par samjhata hoon:"
      : "Absolutely — here’s what the Ease Consultancy website currently says:";
    const note = isHindi
      ? "Dhyan dein: exact eligibility, documents, fees aur timelines case ke hisaab se alag ho sakte hain. Final details team se confirm karein."
      : "Please note: exact eligibility, documents, fees and timelines may vary by case. Confirm final details with the Ease Consultancy team.";
    const followUp = isHindi
      ? "Aap chahein to main isi service ki process, documents ya consultation ke next step mein bhi madad kar sakta hoon."
      : "I can also help you explore the process, document preparation or the next consultation step for this service.";
    return { answer: intro + "\n\n" + blocks.join("\n\n") + (specificNote ? "\n\n" + specificNote : "") + "\n\n" + note + "\n\n" + followUp, sources: selected.map(page => ({ title: page.title, url: page.url })) };
  }

  async function send(explicit) {
    const question = (explicit || input.value).trim();
    if (!question || busy) return;
    input.value = ""; say(question, "user");
    history.push({ role: "user", text: question });
    if (history.length > 8) history.splice(0, 2);
    busy = true; $("ease-ai-send").disabled = true;
    const quickReply = quickLocalReply(question);
    if (quickReply) {
      const bubble = say(quickReply);
      if (/^(hi+|h+i+|hello|hey|namaste|नमस्ते)/i.test(normalize(question))) {
        addSources(bubble, [{ title: "Ease Consultancy Home", url: "index.html" }], "Explore Ease Consultancy");
      } else if (/(what services|services do you provide|services do you offer|list your services|your services|service list|aapki services|aap kya services|kaun kaun si services|आप कौन सी सेवाएँ|आपकी सेवाएँ|कौन कौन सी सेवाएँ)/i.test(normalize(question))) {
        const serviceUrls = ["Accounting.html", "GST Services.html", "Income Tax Services.html", "Auditing.html", "Company Services.html", "Certifications.html", "Business Startup.html"];
        addSources(bubble, serviceUrls.map(url => { const page = RESPONSE_LIBRARY_RECORDS.find(item => item.url === url); return page ? { title: page.title, url: page.url } : null; }).filter(Boolean), "Explore our service pages");
      } else if (/(talk to|speak to|human support|customer care|contact details|contact number|team se baat|consultant se baat|किसी व्यक्ति से बात|टीम से बात|कंसल्टेंट से बात|संपर्क नंबर)/i.test(normalize(question))) {
        addSources(bubble, [{ title: "Contact Us | Ease Consultancy", url: "contact.html" }, { title: "Book a Consultation | Ease Consultancy", url: "consultation-availability.html" }], "Contact the team");
      }
      history.push({ role: "model", text: quickReply });
      busy = false; $("ease-ai-send").disabled = false; messages.scrollTop = messages.scrollHeight;
      return;
    }
    const loading = say("Gemini is checking your question…");
    const matches = getKnowledge(question);
    if (matches.length) lastKnowledgeHits = matches.slice(0, 6);
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
