# BUG-203: paying a supplier (or collecting from a buyer) more than the debt must ask before saving.
from rlib import *
C = Check('BUG-203')
with QA(port=8903, prefix='rg203') as qa:
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner'); full(p)
    cid = seed_cust(p, 'QA1_R203')
    mua(p, 'QA1_R203', '100.000', '20')

    def pay(amt):
        fresh(p, 'quy'); setv(p, 'quy-dir', 'chi'); setv(p, 'quy-cat', 'Trả nợ người bán'); setv(p, 'quy-amt', amt); setv(p, 'quy-cust', 'QA1_R203')
        return submit(p, 'f-quy')
    conf(p, False); n0 = cnt(p, 'cash'); pay('2.500.000')
    C.ok(any('2.000.000' in m and 'dư' in m for m in confmsgs(p)), f'overpay asks: {confmsgs(p)[:1]}')
    C.ok(cnt(p, 'cash') == n0, 'Cancel -> not saved')
    conf(p, False); pay('1.500.000')
    C.ok(not confmsgs(p) and cnt(p, 'cash') == n0 + 1, 'normal payment saves without asking')
    C.ok(stat(p, cid)['debtBuy'] == 500000, f"debt after 1.5m = {stat(p, cid)['debtBuy']}")
    conf(p, False)
    r = p.evaluate("(c)=>WRITE.quy({k:'quy',d:{date:today(),dir:'chi',cat:CAT_NO,amount:900000,custId:c}})", cid)
    C.ok(r is None and bool(confmsgs(p)), f'easy-mode overpay asks and Cancel returns null (result={r})')
C.done()
