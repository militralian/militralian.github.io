'use strict';
(() => {
 const c=window.SITE_ANALYTICS||{};
 if(!c.enabled||!c.url||!c.publishableKey||location.hostname!=='militralian.github.io')return;
 const choiceKey='fn-analytics-consent';let consent=false,visit=null,viewSent=false,observer=null;
 const seen=new Set();
 const sections={approccio:'Approccio',progetti:'Progetti',shellbay:'ShellBay','trasporti-logistica':'Trasporti e logistica','progetti-professionali':'Progetti professionali',percorso:'Percorso',contatti:'Contatti'};
 const safeGet=(storage,key)=>{try{return storage.getItem(key);}catch{return null;}};
 const safeSet=(storage,key,value)=>{try{storage.setItem(key,value);}catch{}};
 function source(){if(!document.referrer)return 'Accesso diretto o non rilevato';try{const h=new URL(document.referrer).hostname.toLowerCase();if(h===location.hostname)return 'Interno';if(h==='linkedin.com'||h.endsWith('.linkedin.com'))return 'LinkedIn';if(h==='google.com'||h.startsWith('www.google.'))return 'Google';if(h==='bing.com'||h.endsWith('.bing.com'))return 'Bing';return h.replace(/[^a-z0-9.-]/g,'').slice(0,80);}catch{return 'Accesso diretto o non rilevato';}}
 const ref=source();const device=innerWidth<600?'Telefono':innerWidth<1000?'Tablet':'Computer';
 function send(kind,label){if(!consent||!visit)return;fetch(c.url+'/rest/v1/rpc/collect_site_event',{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_visit:visit,p_kind:kind,p_label:label,p_source:ref,p_device:device}),keepalive:true}).catch(()=>{});}
 function activate(){consent=true;try{const stored=JSON.parse(safeGet(sessionStorage,'fn-visit'));if(stored?.id&&stored.expires>Date.now())visit=stored.id;}catch{}
 if(!visit)visit=crypto.randomUUID();safeSet(sessionStorage,'fn-visit',JSON.stringify({id:visit,expires:Date.now()+30*60*1000}));
 if(!viewSent){send('page',location.pathname.endsWith('privacy.html')?'Privacy':'Home');viewSent=true;}
 if(!observer&&'IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&!seen.has(entry.target.id)){seen.add(entry.target.id);send('section',sections[entry.target.id]);}}},{threshold:.15});for(const id of Object.keys(sections)){const el=document.getElementById(id);if(el)observer.observe(el);}}}
 function deactivate(){consent=false;visit=null;observer?.disconnect();observer=null;try{sessionStorage.removeItem('fn-visit');}catch{}}
 const banner=document.createElement('section');banner.className='privacy-choice';banner.setAttribute('aria-label','Preferenze statistiche');
 const copy=document.createElement('div');const title=document.createElement('strong');title.textContent='Mi aiuti a capire cosa interessa?';const text=document.createElement('p');text.textContent='Con il tuo consenso raccolgo statistiche sulle visite e sui contenuti consultati, senza registrare il tuo nome o identificarti personalmente.';const info=document.createElement('a');info.href='privacy.html';info.textContent='Informazioni sulla privacy';copy.append(title,text,info);
 const actions=document.createElement('div');const no=document.createElement('button');no.type='button';no.textContent='Non consentire';const yes=document.createElement('button');yes.type='button';yes.textContent='Consenti statistiche';yes.className='allow-analytics';actions.append(no,yes);banner.append(copy,actions);
 function choose(value){safeSet(localStorage,choiceKey,value?'yes':'no');if(value)activate();else deactivate();banner.remove();}
 no.addEventListener('click',()=>choose(false));yes.addEventListener('click',()=>choose(true));
 const saved=safeGet(localStorage,choiceKey);if(saved==='yes'&&navigator.globalPrivacyControl!==true)activate();else if(saved!=='no'&&navigator.globalPrivacyControl!==true)document.body.append(banner);
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;if(a.id==='analytics-preferences'){e.preventDefault();document.body.append(banner);return;}if(!consent)return;const href=a.getAttribute('href')||'';let label=null;if(href.startsWith('mailto:'))label='Email';else if(href.startsWith('tel:'))label='Telefono';else{try{const h=new URL(href,location.href).hostname;if(h==='www.linkedin.com'||h==='linkedin.com')label='LinkedIn';if(h==='github.com')label='GitHub';if(h==='normalizer.it')label='Norma';}catch{}}if(label)send('contact',label);});
})();
