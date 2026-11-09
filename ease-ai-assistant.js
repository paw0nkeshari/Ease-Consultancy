
(() => {
  if (window.__EASE_AI_ASSISTANT__) return;
  window.__EASE_AI_ASSISTANT__ = true;
  const API_BASE = (window.EASE_AI_CONFIG && window.EASE_AI_CONFIG.apiBase || "").replace(/\/+$/,"");
  const LANG_DEFAULT = "both";
  let language = LANG_DEFAULT, busy = false, recognition = null;
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
      <div id="ease-ai-status">AI answers need verification. Do not enter PAN, Aadhaar, bank details or confidential documents. Voice input may use your browser speech service.</div>
    </section>`;
  document.body.appendChild(root);
  const $ = id => document.getElementById(id);
  const panel=$("ease-ai-panel"), messages=$("ease-ai-messages"), input=$("ease-ai-input");
  const say = (text, who="assistant", sources=[]) => {
    const bubble=document.createElement("div"); bubble.className=`ease-ai-message ${who}`;
    const textNode=document.createElement("div"); textNode.className="ease-ai-message-text"; textNode.textContent=text; bubble.appendChild(textNode);
    if(who==="assistant"){
      const speak=document.createElement("button");speak.type="button";speak.className="ease-ai-speak";speak.textContent="🔊 Read aloud";
      speak.addEventListener("click",()=>{if(!window.speechSynthesis)return;const utterance=new SpeechSynthesisUtterance(text);utterance.lang=/[\\u0900-\\u097F]/.test(text)?"hi-IN":(language==="hi"?"hi-IN":"en-IN");window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);});
      bubble.appendChild(speak);
    }
    if(sources && sources.length){
      const wrap=document.createElement("div");wrap.className="ease-ai-sources";
      const label=document.createElement("strong");label.textContent="Sources";wrap.appendChild(label);
      sources.slice(0,5).forEach(src=>{
        try{const u=new URL(src.url);if(u.protocol!=="https:")return;const a=document.createElement("a");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=src.title||u.hostname;wrap.appendChild(a);}catch(_){}
      });
      bubble.appendChild(wrap);
    }
    messages.appendChild(bubble);messages.scrollTop=messages.scrollHeight;return bubble;
  };
  const open = () => {panel.classList.add("is-open");$("ease-ai-launcher").setAttribute("aria-expanded","true");input.focus();if(!messages.childElementCount){
    say("Namaste! Welcome to Ease Consultancy. I can help you explore our services, tax and GST basics, document checklists and consultation process. How may I help?");}
  };
  $("ease-ai-launcher").addEventListener("click",open);
  $("ease-ai-close").addEventListener("click",()=>{panel.classList.remove("is-open");$("ease-ai-launcher").setAttribute("aria-expanded","false");});
  $("ease-ai-language").addEventListener("change",e=>language=e.target.value);
  $("ease-ai-suggestions").addEventListener("click",e=>{const b=e.target.closest("button[data-prompt]");if(b){input.value=b.dataset.prompt;send();}});
  function getKnowledge(query){
    const tokens=query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(x=>x.length>2);
    const data=window.EASE_AI_KNOWLEDGE||[];
    return data.map(p=>{
      const hay=[p.title,p.description,(p.headings||[]).join(" "),(p.summary||[]).join(" ")].join(" ").toLowerCase();
      return {...p,score:tokens.reduce((n,t)=>n+(hay.includes(t)?1:0),0)};
    }).filter(p=>p.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(p=>({title:p.title,url:p.url,description:p.description,headings:(p.headings||[]).slice(0,5)}));
  }
  function localReply(q, hits){
    if(!hits.length)return "I can help with Ease Consultancy's website services. For a precise answer, please connect the AI service or visit our Contact Us page. You can also book a consultation: consultation-availability.html.";
    return "I found these relevant pages on Ease Consultancy. Open the links below to review the service details. For case-specific tax, GST or legal advice, please request a consultation.";
  }
  async function send(explicit){
    const q=(explicit||input.value).trim();if(!q||busy)return;
    input.value="";say(q,"user");history.push({role:"user",text:q});if(history.length>8)history.splice(0,2);
    busy=true;$("ease-ai-send").disabled=true;
    const loading=say("Thinking…");
    const hits=getKnowledge(q);
    try{
      if(!API_BASE){
        loading.textContent=localReply(q,hits);
        if(hits.length){
          const sources=hits.map(p=>({title:p.title,url:new URL(p.url,location.href).href}));
          const extra=document.createElement("div");extra.className="ease-ai-sources";
          sources.forEach(src=>{const a=document.createElement("a");a.href=src.url;a.textContent=src.title;extra.appendChild(a);});
          loading.appendChild(extra);
        }
        history.push({role:"model",text:loading.textContent});
        return;
      }
      const res=await fetch(API_BASE+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q,language,history:history.slice(-8),knowledge:hits,currentPage:location.pathname})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||`Service unavailable (${res.status})`);
      loading.querySelector(".ease-ai-message-text").textContent=data.answer||"I couldn't prepare an answer. Please try again.";
      const combinedSources=[...(data.sources||[]),...hits.map(p=>({title:p.title,url:new URL(p.url,location.href).href}))];
      if(combinedSources.length){
        const wrap=document.createElement("div");wrap.className="ease-ai-sources";const label=document.createElement("strong");label.textContent="Helpful sources";wrap.appendChild(label);
        const seen=new Set();
        combinedSources.slice(0,8).forEach(src=>{try{const u=new URL(src.url);if(!["https:","http:"].includes(u.protocol)||seen.has(u.href))return;seen.add(u.href);const a=document.createElement("a");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=src.title||u.hostname;wrap.appendChild(a);}catch(_){}});
        loading.appendChild(wrap);
      }
      history.push({role:"model",text:data.answer||""});
    }catch(err){loading.textContent="Sorry, the AI service is temporarily unavailable. Please try again later or use our Contact Us page. ("+String(err.message||"Connection issue").slice(0,120)+")";}
    finally{busy=false;$("ease-ai-send").disabled=false;messages.scrollTop=messages.scrollHeight;}
  }
  $("ease-ai-compose").addEventListener("submit",e=>{e.preventDefault();send();});
  $("ease-ai-updates").addEventListener("click",async()=>{
    if(busy)return;open();busy=true;$("ease-ai-updates").disabled=true;
    const item=say("Checking recent official regulatory updates…");
    try{
      if(!API_BASE)throw new Error("Connect the AI Worker to enable live regulatory updates.");
      const res=await fetch(API_BASE+"/api/updates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language})});
      const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Update service unavailable");
      item.querySelector(".ease-ai-message-text").textContent=data.answer||"No update summary is available right now.";
      if(data.sources&&data.sources.length){const wrap=document.createElement("div");wrap.className="ease-ai-sources";const label=document.createElement("strong");label.textContent="Official / reference sources";wrap.appendChild(label);data.sources.slice(0,7).forEach(src=>{try{const u=new URL(src.url);if(u.protocol!=="https:")return;const a=document.createElement("a");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=src.title||u.hostname;wrap.appendChild(a);}catch(_){}});item.appendChild(wrap);}
    }catch(err){item.textContent="Live updates are not connected yet. "+String(err.message||"").slice(0,140);}
    finally{busy=false;$("ease-ai-updates").disabled=false;messages.scrollTop=messages.scrollHeight;}
  });
  $("ease-ai-mic").addEventListener("click",()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){say("Voice input is not supported in this browser. Please type your question. Voice playback may still be available.");return;}
    try{
      if(recognition){recognition.stop();recognition=null;return;}
      recognition=new SR();recognition.lang=language==="hi"?"hi-IN":language==="en"?"en-IN":(navigator.language&&navigator.language.startsWith("hi")?"hi-IN":"en-IN");recognition.interimResults=false;recognition.maxAlternatives=1;
      recognition.onresult=e=>{input.value=e.results[0][0].transcript;recognition=null;input.focus();};
      recognition.onerror=()=>{say("Microphone access or speech recognition was unavailable. Please check browser permissions or type your question.");recognition=null;};
      recognition.onend=()=>{recognition=null;};
      recognition.start();
    }catch(_){say("Could not start voice input. Please check microphone permission.");}
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&panel.classList.contains("is-open")){$("ease-ai-close").click();}});
})();
