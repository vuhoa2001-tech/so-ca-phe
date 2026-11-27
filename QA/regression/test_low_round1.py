# Round-1 Low bugs: one check group per bug. Usage: python -X utf8 test_low_round1.py [BUG-201 BUG-204 ...]
# Exit 0 only if every selected bug passes.
from rlib import *
SEL = set(a.upper() for a in sys.argv[1:])
RES = {}


def want(b):
    return not SEL or b in SEL


def rec(b, cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + b + ': ' + msg)
    RES.setdefault(b, True)
    if not cond:
        RES[b] = False


with QA(port=8910, prefix='rglow') as qa:
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner'); full(p)
    if want('BUG-201'):
        q = qa.new_device('u', mobile=True)
        for h in ('#ket-noi=@@@@', '#ket-noi='):
            q.goto(qa.base + 'index.html' + h); q.wait_for_timeout(700)
            rec('BUG-201', any('không hợp lệ' in t for t in toasts(q)), f'{h} -> toast {toasts(q)}')
            q.goto(qa.base + 'index.html'); q.wait_for_timeout(300)
    if want('BUG-204'):
        fut = str(datetime.date.today() + datetime.timedelta(days=5))
        fresh(p, 'mua'); setv(p, 'mua-date', fut); setv(p, 'mua-cust', 'QA1_R204'); setv(p, 'mua-price', '1.000'); setv(p, 'mua-kg', '10')
        conf(p, False); n0 = cnt(p, 'purchases'); submit(p, 'f-mua')
        rec('BUG-204', bool(confmsgs(p)) and cnt(p, 'purchases') == n0, f'future date asks, Cancel not saved ({confmsgs(p)[:1]})')
        conf(p, True); submit(p, 'f-mua')
        rec('BUG-204', cnt(p, 'purchases') == n0 + 1, 'OK saves')
        rec('BUG-204', p.evaluate("()=>dfltDate()") == str(datetime.date.today()), 'next form default date stays today')
        fresh(p, 'mua'); setv(p, 'mua-cust', 'QA1_R204'); setv(p, 'mua-price', '1.000'); setv(p, 'mua-kg', '10'); conf(p, False); submit(p, 'f-mua')
        rec('BUG-204', not confmsgs(p), 'today does not ask')
    if want('BUG-206'):
        qa.sync(p, 1500); conf(p, True); n0 = cnt(p, 'purchases')
        t = restore(p, wr('low206.json', '{"version":1,"settings":{"shopName":"x"}}'))
        rec('BUG-206', cnt(p, 'purchases') == n0 and n0 > 0 and not any('Đã khôi phục' in x for x in t), f'file without any ledger data refused: toast={t}')
        t = restore(p, wr('low206b.json', '{"version":1,"settings":{},"customers":[]}'))
        rec('BUG-206', cnt(p, 'purchases') == n0 and not any('Đã khôi phục' in x for x in t), f'file with only an empty list refused too: toast={t}')
    if want('BUG-209'):
        go(p, 'od'); p.evaluate("()=>{ui.od=null;}"); go(p, 'od'); p.evaluate("()=>ACT.odAdd({dataset:{k:'cash'}})"); p.wait_for_timeout(100)
        p.evaluate("()=>{const i=[...document.querySelectorAll('#f-od tr[data-oi] [data-f=amount]')].pop();i.value='0';}")
        before = p.evaluate("()=>JSON.stringify(DB.openings)")
        t = submit(p, 'f-od')
        rec('BUG-209', p.evaluate("()=>JSON.stringify(DB.openings)") == before and not any('Đã lưu' in x for x in t), f'invalid cash row is refused: {t}')
    if want('BUG-103'):
        opts = p.evaluate("()=>{EZ.w={kind:'kk',d:{}};const h=EBODY.date().html;return [...h.matchAll(/data-d=\"(\\d{4}-\\d\\d-\\d\\d)\"/g)].map(m=>m[1])}")
        rec('BUG-103', bool(opts) and all(o <= str(datetime.date.today()) for o in opts), f'stocktake date options not in the future: {opts}')
        p.evaluate("()=>{EZ.w=null;}"); full(p)
    if want('BUG-105'):
        r = api(qa, 'staff', {'push': [{'coll': 'sales', 'rec': dict(id='low105s1', code='PB26-9001', ts=1, date=str(datetime.date.today()), customerId='x', typeId='nhan_xo', kg=1, price=1, amount=1, paid=0, createdAt=now(), updatedAt=now())}], 'since': ''})
        rec('BUG-105', 'low105s1' not in qa.server_rows('sales'), f'staff cannot create sales via API: rejected={len(r.get("rejected", []))}')
    if want('BUG-106'):
        qa.sync(p, 1500)
        t = p.evaluate("()=>syncMsLine()")
        rec('BUG-106', ':' in t.split('</b>')[0] and 'gần nhất' in t and 'mất' in t, f'line shows time of last sync + duration: {t[:160]}')
    if want('BUG-104'):
        qa.offline(p, True); mua(p, 'QA1_R104', '1.000', '10')
        conf(p, False); p.evaluate("()=>ACT.disconnect()")
        m = ' '.join(confmsgs(p))
        rec('BUG-104', 'chưa gửi' in m, f'disconnect warns about unsent entries: {m[:160]}')
        qa.offline(p, False)
    if want('BUG-214'):
        s = qa.new_device('s', mobile=True); qa.connect(s, 'staff')
        s.evaluate("()=>{NF.c=null;}")
        keys = s.evaluate("()=>{const o=stockView;stockView=()=>Object.assign(o(),{negKg:50});DB.settings.lastBackup='';DB.purchases.push({id:'x',date:today(),kg:1,amount:1});NF.c=null;const k=nfList().map(n=>n.key);stockView=o;DB.purchases.pop();return k}")
        rec('BUG-214', 'neg' not in keys and 'bk' not in keys, f'staff notices: {keys}')
    if want('BUG-108'):
        m = qa.new_device('m', mobile=True); qa.connect(m, 'staff')
        hs = m.evaluate("()=>[...document.querySelectorAll('[data-act=syncNow]')].filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect().height)")
        rec('BUG-108', bool(hs) and min(hs) >= 44, f'sync buttons heights: {hs}')
        mh = m.evaluate("()=>{const e=document.getElementById('syncPill');return e&&document.body.classList.contains('easy')?parseFloat(getComputedStyle(e).minHeight):null}")
        rec('BUG-108', mh is not None and mh >= 44, f'easy-mode #syncPill min-height (entry screens): {mh}')
bad = [b for b, v in RES.items() if not v]
print('LOW:', 'PASS' if not bad else 'FAIL ' + ' '.join(sorted(bad)))
sys.exit(1 if bad else 0)
