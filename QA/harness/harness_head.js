function mkProxy(){const f=function(){};return new Proxy(f,{get:(t,p)=>p===Symbol.toPrimitive?()=>'':p==='length'?0:mkProxy(),apply:()=>mkProxy(),construct:()=>mkProxy(),set:()=>true});}
function mkDate(off){class D extends Date{constructor(...a){if(a.length===0)super(Date.now()+off);else super(...a);}static now(){return Date.now()+off;}}return D;}
function make(opts){opts=opts||{};
 const store=opts.store||{};const st={quota:opts.quota};
 const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{if(st.failKey===k)throw new Error('Quota');if(st.quota!==undefined&&(JSON.stringify(store).length+String(v).length)>st.quota)throw new Error('QuotaExceeded');store[k]=String(v);},removeItem:k=>{delete store[k]},get length(){return Object.keys(store).length},key:i=>Object.keys(store)[i]||null};
 const timers=[];const g={};
 const names=['localStorage','document','navigator','location','history','setTimeout','clearTimeout','setInterval','addEventListener','fetch','confirm','alert','prompt','window','self','screen','performance','ResizeObserver','MutationObserver','IntersectionObserver','Notification','requestAnimationFrame','Date'];
 const vals=[ls,mkProxy(),{onLine:true},{hash:'',protocol:'https:',pathname:'/',search:''},mkProxy(),(f)=>{timers.push(f);return timers.length},()=>{},()=>0,()=>{},opts.fetch||(async()=>{throw new Error('no net')}),()=>true,()=>{},()=>'',mkProxy(),mkProxy(),{},{now:()=>0},mkProxy(),mkProxy(),mkProxy(),mkProxy(),()=>0,mkDate(opts.skew||0)];
 const body=SRC+"\n;return {Store,DB:()=>DB,setDB:(d)=>{DB=d},defaults,normalizeDB,save,load,nextCode,reconcileDeposits,migrateOwedToDeposit,ensureCodes,ARR_KEYS,isStaff,nfList,renumDup,nfEvent,nfDevEvent,nfMarkSeen,lockHit,wipeSel:typeof wipeSel!=='undefined'?wipeSel:null,KEY};";
 const fn=new Function(...names,body);
 const r=fn(...vals);r.store=store;r.timers=timers;r.st=st;return r;}
const OUT=[];function log(...a){OUT.push(a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '));}
function done(){document.body.textContent=OUT.join('\n');document.title='DONE';}

/* ---- server simulator: port of Code.gs doPost/upsert_ (owner path, staff settings path, basic staff rules) ---- */
const ORDER=['settings','types','customers','purchases','exchanges','beanPayments','sales','adjustments','cash','stockIns','stocktakes','openings','advances','deposits','cashCounts','auditLog'];
const STAFF_CREATE={purchases:1,exchanges:1,beanPayments:1,sales:1,stockIns:1,deposits:1,advances:1,cash:1,customers:1,cashCounts:1,auditLog:1};
function mkServer(){const S={rows:{},users:{},last:0,calls:0,failNext:false,dropResponseNext:false,pre:null};
 ORDER.forEach(c=>S.rows[c]={});
 S.time=()=>{let t=Date.now();if(t<=S.last)t=S.last+1;S.last=t;return new Date(t).toISOString();};
 S.today=()=>new Date().toISOString().slice(0,10);
 S.post=(body)=>{S.calls++;const user=S.users[body.token]||(body.secret&&S.users['secret']);if(!user)return{ok:false,error:'auth'};
  const serverTime=S.time(),since=body.since||'',staff=user.role!=='owner',rej=[],extra=[],stale=[],failed=[];if(S.busyNext){S.busyNext=false;return{ok:false,error:'busy'};}
  const push=(body.push||[]).slice().sort((a,b)=>ORDER.indexOf(a.coll)-ORDER.indexOf(b.coll));
  for(const it of push){if(!S.rows[it.coll])continue;const R=S.rows[it.coll];const id=it.deleted?it.id:it.rec.id;const ts=it.deleted?(it.at||''):(it.rec.updatedAt||'');const row=R[id];
   if(staff&&it.coll==='settings'){if(it.deleted){rej.push({coll:'settings',id,reason:'no del'});continue;}if(!row||row.del)continue;const cs=JSON.parse(row.json);const seq=cs.seq||{};let chg=false;const inc=it.rec.seq;for(const k in inc){const v=Number(inc[k]);if(isFinite(v)&&!(Number(seq[k])>=v)){seq[k]=v;chg=true;}}if(chg){cs.seq=seq;cs.updatedAt=serverTime;R[id]={ts:serverTime,del:false,srv:serverTime,json:JSON.stringify(cs)};}continue;}
   if(!S.legacy&&!staff&&it.coll==='settings'&&!it.deleted&&row&&!row.del){const cs=JSON.parse(row.json),s0=cs.seq||{},i0=it.rec.seq||{},m0=Object.assign({},s0);let ch0=false;for(const k in i0){const v=Number(i0[k]);if(isFinite(v)&&!(Number(m0[k])>=v)){m0[k]=v;ch0=true;}}
     if(row.ts>ts){if(ch0){cs.seq=m0;R[id]={ts:row.ts,del:false,srv:serverTime,json:JSON.stringify(cs)};}continue;}it.rec.seq=m0;}
   if(row!==undefined&&row.ts>ts){if(row&&!S.legacy){stale.push({coll:it.coll,id});const cur=row.del?null:JSON.parse(row.json);extra.push(row.del?{coll:it.coll,id,deleted:true,at:row.ts}:{coll:it.coll,id,deleted:false,updatedAt:cur.updatedAt,rec:cur});}continue;}
   if(!S.legacy&&!it.deleted&&JSON.stringify(it.rec).length>49000){failed.push({coll:it.coll,id,error:'Phiếu quá lớn'});continue;}
   if(staff){const cur=row?JSON.parse(row.json):null;
     if(it.deleted){rej.push({coll:it.coll,id,reason:'no delete'});extra.push(row?(row.del?{coll:it.coll,id,deleted:true,at:row.ts}:{coll:it.coll,id,deleted:false,updatedAt:cur.updatedAt,rec:cur}):{coll:it.coll,id,deleted:true,at:serverTime});continue;}
     if(!STAFF_CREATE[it.coll]){rej.push({coll:it.coll,id,reason:'no coll'});extra.push(row?{coll:it.coll,id,deleted:false,updatedAt:cur.updatedAt,rec:cur}:{coll:it.coll,id,deleted:true,at:serverTime});continue;}
     if(row){if(row.del){rej.push({coll:it.coll,id,reason:'deleted'});extra.push({coll:it.coll,id,deleted:true,at:row.ts});continue;}
       if(cur.date!==S.today()||it.rec.date!==S.today()||cur.createdBy!==user.name){rej.push({coll:it.coll,id,reason:'rule'});extra.push({coll:it.coll,id,deleted:false,updatedAt:cur.updatedAt,rec:cur});continue;}}
     else it.rec.createdBy=user.name;}
   if(it.deleted)R[id]={ts,del:true,srv:serverTime,json:JSON.stringify({id,deleted:true,at:ts})};
   else R[id]={ts,del:false,srv:serverTime,json:JSON.stringify(it.rec)};}
  let changes=[];for(const coll of ORDER)for(const id in S.rows[coll]){const r=S.rows[coll][id];if(r.srv<=since)continue;if(r.del)changes.push({coll,id,deleted:true,at:r.ts});else{const rec=JSON.parse(r.json);changes.push({coll,id,deleted:false,updatedAt:rec.updatedAt||r.ts,rec});}}
  for(const c of extra){changes=changes.filter(x=>!(x.coll===c.coll&&x.id===c.id));changes.push(c);}
  return Object.assign({ok:true,serverTime,changes,rejected:rej,user:{name:user.name,role:user.role}},S.legacy?{}:{stale,failed});};
 S.fetch=async(url,o)=>{if(S.failNext){S.failNext=false;throw new Error('net');}const body=JSON.parse(o.body);const resp=S.post(body);if(S.dropResponseNext){S.dropResponseNext=false;throw new Error('timeout');}if(S.pre){const f=S.pre;S.pre=null;f();}return{text:async()=>JSON.stringify(resp)};};
 return S;}
function connect(c,S,name,role,tok){S.users[tok]={name,role};c.Store.setPref('syncUrl','https://srv.test/exec');c.Store.setPref('syncToken',tok);c.Store.setPref('srvUser',{name,role});}
