"""Shared helpers for regression tests (QA/regression). Uses the QA harness (fake Sheet running the real Code.gs)."""
import sys, os, json, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'harness'))
from qa_lib import QA, FAKE_URL  # noqa
TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_tmp')
def full(p): p.evaluate("()=>{ui.mode='full';Store.setPref('mode','full');ui.edit={};render();}")
def toasts(p): return p.evaluate("()=>Array.from(document.querySelectorAll('#toast .toast')).map(t=>t.textContent)")
def clear_toasts(p): p.evaluate("()=>{document.querySelector('#toast').innerHTML=''}")
def go(p, tab, sub=None): p.evaluate("([t,s])=>go(t,s)", [tab, sub]); p.wait_for_timeout(80)
def fresh(p, tab): go(p, tab); p.evaluate("()=>{ui.edit={}}"); go(p, tab)
def setv(p, i, v): p.evaluate("([i,v])=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}", [i, v])
def submit(p, form):
    clear_toasts(p); p.evaluate("(f)=>document.getElementById(f).requestSubmit()", form); p.wait_for_timeout(150); return toasts(p)
def conf(p, res=True):
    """window.confirm -> returns res and records the message (window.__cm)."""
    p.evaluate("(r)=>{window.__cm=[];window.__cres=r;window.confirm=m=>{window.__cm.push(String(m));return window.__cres;};}", res)
def confmsgs(p): return p.evaluate("()=>window.__cm||[]")
def cnt(p, c): return p.evaluate("(c)=>DB[c].length", c)
def seed_cust(p, name): return p.evaluate("(n)=>{const c=newCust({name:n});save();return c.id}", name)
def stat(p, cid): return p.evaluate("(i)=>JSON.parse(JSON.stringify(cs(i)))", cid)
def mua(p, cust, price, kg, paid=''):
    fresh(p, 'mua'); setv(p, 'mua-cust', cust); setv(p, 'mua-price', price); setv(p, 'mua-kg', kg); setv(p, 'mua-paid', paid)
    return submit(p, 'f-mua')
def wr(name, text):
    os.makedirs(TMP, exist_ok=True); fp = os.path.join(TMP, name); open(fp, 'w', encoding='utf-8').write(text); return fp
def restore(p, path):
    go(p, 'cd'); clear_toasts(p); p.set_input_files('#restoreFile', path); p.wait_for_timeout(900); return toasts(p)
def api(qa, who, body):
    b = json.dumps(dict(body, token=qa.TOK[who]))
    t = qa.server_eval('async b=>{const r=await S.fetch("x",{body:b});return await r.text();}', b)
    try: return json.loads(t)
    except Exception: return t
def now():
    n = datetime.datetime.utcnow(); return n.strftime('%Y-%m-%dT%H:%M:%S.') + '%03dZ' % (n.microsecond // 1000)
class Check:
    def __init__(self, name): self.name, self.fails = name, []
    def ok(self, cond, msg):
        print(('  ok   ' if cond else '  FAIL ') + msg)
        if not cond: self.fails.append(msg)
    def done(self):
        print(f'{self.name}: ' + ('PASS' if not self.fails else 'FAIL'))
        sys.exit(1 if self.fails else 0)
