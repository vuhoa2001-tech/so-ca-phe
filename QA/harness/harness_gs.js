/* Chạy CHÍNH Code.gs (không phải bản port) với Google Sheet giả */
function mkServerGS(){
 const S={reads:{},props:{},noProps:false,sheets:{},calls:0,lastT:Date.now(),busyNext:false,failNext:false,dropResponseNext:false,pre:null};
 const mkSheet=(name)=>{const sh={name,data:[[]],_frozen:0,fmt:{}};
  const ensure=(r,c)=>{while(sh.data.length<r)sh.data.push([]);for(let i=0;i<r;i++){while(sh.data[i].length<c)sh.data[i].push('');}};
  sh.getLastRow=()=>{let l=0;sh.data.forEach((row,i)=>{if(row.some(v=>v!==''&&v!==undefined))l=i+1;});return l;};
  sh.getMaxRows=()=>Math.max(sh.data.length,1000);
  sh.insertRowsAfter=()=>{};sh.setFrozenRows=()=>{};sh.setColumnWidth=()=>{};
  sh.getRange=(r,c,nr,nc)=>{nr=nr||1;nc=nc||1;const rg={
    getValues(){S.reads[sh.name]=(S.reads[sh.name]||0)+1;ensure(r+nr-1,c+nc-1);const o=[];for(let i=0;i<nr;i++){o.push(sh.data[r-1+i].slice(c-1,c-1+nc));}return JSON.parse(JSON.stringify(o));},
    getValue(){return rg.getValues()[0][0];},
    setValues(v){if(S.failWrite&&S.failWrite(v))throw new Error('Exception: Your input contains more than the maximum of 50000 characters in a single cell.');ensure(r+nr-1,c+nc-1);for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){let x=v[i][j];/* như Google Sheets thật: ô không định dạng chữ mà nhận chuỗi toàn chữ số thì thành SỐ (mất số 0 đầu) */if(typeof x==='string'&&/^\d+$/.test(x)&&sh.fmt[(r+i)+','+(c+j)]!=='@')x=Number(x);sh.data[r-1+i][c-1+j]=x;}return rg;},
    setValue(v){return rg.setValues([[v]]);},
    setNumberFormat(f){for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)sh.fmt[(r+i)+','+(c+j)]=f;return rg;},setFontWeight(){return rg;},setBackground(){return rg;}};return rg;};
  return sh;};
 const ss={getSheetByName:n=>S.sheets[n]||null,insertSheet:n=>(S.sheets[n]=mkSheet(n)),getId:()=>'x'};
 const fakeHash=(s)=>{const out=[];let h=7;for(let k=0;k<32;k++){for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i)+k)|0;out.push((h&255)>127?(h&255)-256:(h&255));}return out;};
 let uu=0;
 const env={
  SpreadsheetApp:{getActiveSpreadsheet:()=>ss},
  LockService:{getScriptLock:()=>({waitLock(){if(S.lockBusy)throw new Error('lock');S.locked=true;S.lockEvents.push('wait');},releaseLock(){S.locked=false;S.lockEvents.push('release');}})},
  ContentService:{MimeType:{JSON:'j',TEXT:'t'},createTextOutput:t=>({c:t,setMimeType(){return this;},getContent(){return this.c;}})},
  Utilities:{computeDigest:(a,t)=>fakeHash(String(t)),DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},getUuid:()=>'uuid-'+(++uu)+'-'+Math.random(),formatDate:(d)=>d.toISOString().slice(0,10)},
  Logger:{log(){}},
  DriveApp:{},ScriptApp:{},
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>JSON.parse(JSON.stringify(S.props)),setProperties:(o)=>{Object.assign(S.props,o)},setProperty:(k,v)=>{S.props[k]=String(v)},getProperty:k=>k in S.props?S.props[k]:null,deleteProperty:k=>{delete S.props[k]}})}};
 S.lockEvents=[];
 class GD extends Date{constructor(...a){if(a.length===0){S.lastT=Math.max(S.lastT+1,Date.now());super(S.lastT);}else super(...a);}static now(){S.lastT=Math.max(S.lastT+1,Date.now());return S.lastT;}}
 const names=Object.keys(env).concat(['Date']);
 const fn=new Function(...names,GS+"\n;return {doPost,hash_,saoLuuHangNgay,DEF,ORDER,lamMoiDauThoiGian};");
 const G=fn(...names.map(n=>n==='Date'?GD:env[n]));S.G=G;
 S.addUser=(token,name,role)=>{const sh=env.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Người dùng')||ss.insertSheet('Người dùng');if(!sh.data[0].length)sh.data[0]=['h'];const n=sh.getLastRow()+1;sh.data[n-1]=['U'+n,name,role==='owner'?'Chủ':'Nhân viên',G.hash_(token),true,'2026-01-01T00:00:00.000Z','',''];};
 S.users={};
 S.collReads=()=>{let n=0;const o={};Object.keys(S.reads).forEach(k=>{if(k!=='Người dùng'){n+=S.reads[k];o[k]=S.reads[k];}});return{n,o};};S.resetReads=()=>{S.reads={};};
 S.rowsOf=(coll)=>{const sh=ss.getSheetByName(G.DEF[coll].tab);if(!sh)return{};const o={};const n=4+G.DEF[coll].cols.length+2;sh.data.slice(1).forEach(r=>{if(r[0])o[r[0]]={ts:r[1],del:r[2]==='ĐÃ XÓA',srv:r[n-2],json:r[n-1]};});return o;};
 S.fetch=async(url,o)=>{if(S.failNext){S.failNext=false;throw new Error('net');}S.calls++;const out=S.G.doPost({postData:{contents:o.body}});const t=out.getContent();if(S.dropResponseNext){S.dropResponseNext=false;throw new Error('timeout');}if(S.pre){const f=S.pre;S.pre=null;f();}return{text:async()=>t};};
 return S;}
function connectG(c,S,name,role,tok){if(!S.users[tok]){S.users[tok]=1;S.addUser(tok,name,role);}c.Store.setPref('syncUrl','https://srv.test/exec');c.Store.setPref('syncToken',tok);c.Store.setPref('srvUser',{name,role});}
