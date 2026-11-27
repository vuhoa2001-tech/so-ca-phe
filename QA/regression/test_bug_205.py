# BUG-205: server must reject staff-created records with invalid, far-past or future dates.
from rlib import *
C = Check('BUG-205')


def pur(i, date, cid='cuR205'):
    return dict(id=i, code='PM26-' + i[-4:], ts=1, date=date, customerId=cid, typeId='qua_tuoi', bags=[], kg=10, price=1000, amount=10000, paid=0,
                note='', tareTotal=0, gross=10, tare=0, createdAt=now(), updatedAt=now())


with QA(port=8905, prefix='rg205') as qa:
    api(qa, 'owner', {'push': [{'coll': 'customers', 'rec': dict(id='cuR205', name='QA1_R205', code='QR', createdAt=now(), updatedAt=now())}], 'since': ''})
    td = datetime.date.today()
    bad = [('r205bad1', '99/99/9999'), ('r205bad2', str(td + datetime.timedelta(days=400))), ('r205bad3', '2026-02-30'),
           ('r205bad4', '1900-01-01'), ('r205bad5', str(td + datetime.timedelta(days=2)))]
    good = [('r205ok01', str(td)), ('r205ok02', str(td - datetime.timedelta(days=3)))]
    r = api(qa, 'staff', {'push': [{'coll': 'purchases', 'rec': pur(i, d)} for i, d in bad + good], 'since': ''})
    rows = qa.server_rows('purchases')
    for i, d in bad:
        C.ok(i not in rows, f'staff purchase dated {d} rejected')
    for i, d in good:
        C.ok(i in rows, f'staff purchase dated {d} accepted')
    rj = r.get('rejected', []) if isinstance(r, dict) else []
    C.ok(len(rj) == len(bad), f'rejected list has {len(rj)} items: {[x.get("reason") for x in rj][:2]}')
    r2 = api(qa, 'owner', {'push': [{'coll': 'purchases', 'rec': pur('r205own1', str(td - datetime.timedelta(days=200)))}], 'since': ''})
    C.ok('r205own1' in qa.server_rows('purchases'), 'owner can still enter old-dated records')
C.done()
