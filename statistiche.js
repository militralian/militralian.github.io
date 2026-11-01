'use strict';
(() => {
 const config=window.SITE_ANALYTICS||{};
 const local=['127.0.0.1','localhost'].includes(location.hostname);
 const demo=local&&new URLSearchParams(location.search).get('demo')==='1';
 const ready=Boolean(config.enabled&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)&&config.publishableKey);
 const $=id=>document.getElementById(id);
 const fmt=new Intl.NumberFormat('it-IT');
 const dayFmt=new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',timeZone:'Europe/Rome'});
 let days=30,session=null,requestId=0,busy=false;
 const showStatus=(id,text,error=false)=>{ $(id).textContent=text;$(id).classList.toggle('error',error); };
 function clearSession(){session=null;try{sessionStorage.removeItem('fn-owner-session');}catch{} }
 function saveSession(value){session={access_token:value.access_token,refresh_token:value.refresh_token,expires_at:Math.floor(Date.now()/1000)+(value.expires_in||3600)};try{sessionStorage.setItem('fn-owner-session',JSON.stringify(session));}catch{} }
 async function call(path,{method='POST',body,token}={}){
  const res=await fetch(config.url+path,{method,headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await res.json().catch(()=>null);
  if(!res.ok){const e=new Error('request_failed');e.status=res.status;throw e;}
  return data;
 }
 async function accessToken(){
  if(!session)throw Object.assign(new Error('not_signed_in'),{status:401});
  if(session.expires_at<Date.now()/1000+60){const fresh=await call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:session.refresh_token}});saveSession(fresh);}
  return session.access_token;
 }
 function loginView(message='',error=false){$('dashboard').hidden=true;$('login-panel').hidden=false;showStatus('login-status',message,error);}
 function makeList(id,items){const root=$(id);root.replaceChildren();if(!items.length){const p=document.createElement('p');p.className='list-empty';p.textContent='Nessun dato nel periodo selezionato.';root.append(p);return;}
 const max=Math.max(...items.map(x=>Number(x.value)||0),1);
 for(const item of items){const row=document.createElement('div');row.className='data-row';row.style.setProperty('--bar',Math.round((Number(item.value)||0)/max*100)+'%');const label=document.createElement('span');label.textContent=item.label;const value=document.createElement('strong');value.textContent=fmt.format(Number(item.value)||0);row.append(label,value);root.append(row);}}
 function chart(rows){const root=$('trend-chart');root.replaceChildren();const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 220');svg.setAttribute('role','img');
 const title=document.createElementNS(ns,'title');title.textContent='Visite giornaliere: '+rows.map(r=>r.day+': '+r.visits).join('; ');svg.append(title);
 const max=Math.max(...rows.map(r=>Number(r.visits)||0),1);const yMax=Math.max(4,Math.ceil(max/4)*4);const left=30,right=990,top=8,bottom=178;
 for(let i=0;i<=4;i++){const y=bottom-i*(bottom-top)/4;const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:left,x2:right,y1:y,y2:y}))line.setAttribute(k,v);svg.append(line);const t=document.createElementNS(ns,'text');t.setAttribute('x','0');t.setAttribute('y',y+4);t.textContent=fmt.format(yMax*i/4);svg.append(t);}
 const step=(right-left)/Math.max(rows.length,1);rows.forEach((r,i)=>{const h=(Number(r.visits)||0)/yMax*(bottom-top);const bar=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:left+i*step+step*.15,y:bottom-h,width:Math.max(step*.7,1),height:h,rx:2}))bar.setAttribute(k,v);const bt=document.createElementNS(ns,'title');bt.textContent=dayFmt.format(new Date(r.day+'T12:00:00Z'))+': '+r.visits+' visite';bar.append(bt);svg.append(bar);if(i===0||i===rows.length-1||i%Math.max(Math.floor(rows.length/5),1)===0){const t=document.createElementNS(ns,'text');t.setAttribute('x',left+i*step);t.setAttribute('y','208');t.setAttribute('text-anchor',i===rows.length-1?'end':'start');t.textContent=dayFmt.format(new Date(r.day+'T12:00:00Z'));svg.append(t);}});root.append(svg);}
 function draw(report){for(const [id,key] of Object.entries({'total-visits':'visits','total-views':'views','total-linkedin':'linkedin','total-contacts':'contacts'}))$(id).textContent=fmt.format(Number(report[key])||0);
 chart(report.daily||[]);$('empty-message').hidden=Boolean(report.views);makeList('sources-list',report.sources||[]);makeList('sections-list',report.sections||[]);makeList('devices-list',report.devices||[]);makeList('contacts-list',report.contactDetails||[]);
 const rows=report.daily||[];if(rows.length)$('date-range').textContent=dayFmt.format(new Date(rows[0].day+'T12:00:00Z'))+' – '+dayFmt.format(new Date(rows.at(-1).day+'T12:00:00Z'));
 $('updated-at').textContent=demo?'Dati di esempio':'Aggiornato alle '+new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}).format(new Date(report.updatedAt));}
 function demoReport(){const daily=Array.from({length:days},(_,i)=>{const d=new Date();d.setDate(d.getDate()-days+1+i);const visits=2+(i*7+3)%17;return{day:d.toISOString().slice(0,10),visits,views:visits+3+(i*5)%13};});const visits=daily.reduce((n,x)=>n+x.visits,0);const linkedin=Math.round(visits*.55),google=Math.round(visits*.12),phone=Math.round(visits*.6),tablet=Math.round(visits*.04),email=Math.round(days*.2),contactLinkedIn=Math.round(days*.35),tel=Math.max(1,Math.round(days*.04));return{visits,views:daily.reduce((n,x)=>n+x.views,0),linkedin,contacts:email+contactLinkedIn+tel,daily,sources:[{label:'LinkedIn',value:linkedin},{label:'Accesso diretto o non rilevato',value:visits-linkedin-google},{label:'Google',value:google}],sections:[{label:'ShellBay',value:Math.round(visits*.38)},{label:'Progetti',value:Math.round(visits*.32)},{label:'Trasporti e logistica',value:Math.round(visits*.27)},{label:'Progetti professionali',value:Math.round(visits*.17)},{label:'Contatti',value:Math.round(visits*.08)}],devices:[{label:'Telefono',value:phone},{label:'Computer',value:visits-phone-tablet},{label:'Tablet',value:tablet}],contactDetails:[{label:'LinkedIn',value:contactLinkedIn},{label:'Email',value:email},{label:'Norma',value:Math.round(days*.13)},{label:'Telefono',value:tel}]};}
 async function loadReport(){const current=++requestId;showStatus('report-status','Caricamento delle statistiche…');$('refresh').disabled=true;
 try{const report=demo?demoReport():await call('/rest/v1/rpc/read_site_analytics',{body:{p_days:days},token:await accessToken()});if(current!==requestId)return;draw(report);showStatus('report-status','');}
 catch(e){if(current!==requestId)return;if([401,403].includes(e.status)){clearSession();loginView('Accesso scaduto o account non autorizzato. Accedi con l’account del proprietario.',true);}else{showStatus('report-status','Non riesco a caricare i dati. Riprova tra poco.',true);}}
 finally{if(current===requestId)$('refresh').disabled=false;}}
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();if(!ready||busy)return;busy=true;$('login-submit').disabled=true;showStatus('login-status','Invio del link…');
 try{await call('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{body:{email:$('email').value.trim(),create_user:false}});showStatus('login-status','Se l’indirizzo è autorizzato, riceverai un link di accesso. Controlla anche la posta indesiderata.');}
 catch{showStatus('login-status','Non è stato possibile inviare il link. Attendi qualche minuto e riprova.',true);}finally{busy=false;$('login-submit').disabled=false;}});
 $('periods').addEventListener('click',e=>{const b=e.target.closest('button[data-days]');if(!b)return;days=Number(b.dataset.days);for(const btn of $('periods').querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn===b));loadReport();});$('refresh').addEventListener('click',loadReport);
 $('logout').addEventListener('click',async()=>{requestId++;if(ready&&session)try{await call('/auth/v1/logout',{token:await accessToken()});}catch{}clearSession();if(demo){location.href='statistiche.html';return;}loginView('Accesso terminato.');$('trend-chart').replaceChildren();});
 async function start(){if(demo){$('login-panel').hidden=true;$('dashboard').hidden=false;$('demo-banner').hidden=false;await loadReport();return;}
 const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('access_token')){const incoming={access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in'))||3600};history.replaceState(null,'',location.pathname);if(ready)saveSession(incoming);}else if(hash.has('error')){history.replaceState(null,'',location.pathname);loginView('Il link di accesso non è valido o è scaduto. Richiedine uno nuovo.',true);}
 if(!ready){$('login-submit').disabled=true;$('setup-notice').hidden=false;$('demo-link').hidden=!local;return;}
 if(!session)try{session=JSON.parse(sessionStorage.getItem('fn-owner-session'));}catch{}
 if(session?.access_token){$('login-panel').hidden=true;$('dashboard').hidden=false;await loadReport();}}
 start();
})();
