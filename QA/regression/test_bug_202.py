# BUG-202: stock-in / exchange / deposit / advance must ask on unusually large numbers.
from rlib import *
C = Check('BUG-202')
with QA(port=8904, prefix='rg202') as qa:
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner'); full(p)
    cid = seed_cust(p, 'QA1_R202')
    cases = [('nk', 'f-nk', 'stockIns', {'nk-kg': '1.000.000.000'}),
             ('doi', 'f-doi', 'exchanges', {'doi-cust': 'QA1_R202', 'doi-kg': '1.000.000.000'}),
             ('kg', 'f-kgi', 'deposits', {'kgi-cust': 'QA1_R202', 'kgi-kind': 'in', 'kgi-kg': '1.000.000.000'}),
             ('ug', 'f-ug', 'advances', {'ug-cust': 'QA1_R202', 'ug-kind': 'cash', 'ug-amt': '1.000.000.000.000.000'})]
    for tab, form, coll, vals in cases:
        fresh(p, tab)
        for k, v in vals.items():
            setv(p, k, v)
        conf(p, False); n0 = cnt(p, coll); submit(p, form)
        C.ok(bool(confmsgs(p)) and cnt(p, coll) == n0, f'{tab}: asks and Cancel keeps it unsaved (asked={bool(confmsgs(p))}, saved={cnt(p, coll) - n0})')
    fresh(p, 'nk'); setv(p, 'nk-kg', '500'); conf(p, False); n0 = cnt(p, 'stockIns'); submit(p, 'f-nk')
    C.ok(not confmsgs(p) and cnt(p, 'stockIns') == n0 + 1, 'normal stock-in saves without asking')
    conf(p, False)
    r = p.evaluate("(c)=>WRITE.doi({k:'doi',d:{date:today(),custId:c,total:1000000000,bags:[],tareTotal:0,ratio:4.5}})", cid)
    C.ok(r is None and bool(confmsgs(p)), f'easy-mode exchange 1e9 kg asks (result={r})')
    # round-1 retest finding: easy-mode wizards for stock-in, deposit, advance
    tid = p.evaluate("()=>DB.settings.beanTypeId||DB.types[0].id")
    for k, d in [('nk', {'method': 'phoi', 'total': 10000000, 'bags': [], 'tareTotal': 0}),
                 ('kgi', {'custId': cid, 'typeId': tid, 'total': 10000000, 'bags': [], 'tareTotal': 0}),
                 ('ug', {'custId': cid, 'amount': 20000000000, 'ukind': 'cash'})]:
        conf(p, False); n0 = p.evaluate("()=>DB.stockIns.length+DB.deposits.length+DB.advances.length")
        r = p.evaluate("([k,d])=>WRITE[k]({kind:k,d:Object.assign({date:today()},d)})", [k, d])
        n1 = p.evaluate("()=>DB.stockIns.length+DB.deposits.length+DB.advances.length")
        C.ok(r is None and bool(confmsgs(p)) and n1 == n0, f'easy-mode {k} unusual number asks, Cancel not saved (asked={bool(confmsgs(p))}, saved={n1 - n0})')
C.done()
