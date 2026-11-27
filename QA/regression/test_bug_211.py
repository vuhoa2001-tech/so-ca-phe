# BUG-211: display text starting with = + - @ must be written to the Sheet as literal text, not a formula.
from rlib import *
C = Check('BUG-211')
with QA(port=8906, prefix='rg211') as qa:
    api(qa, 'staff', {'push': [{'coll': 'customers', 'rec': dict(id='cuR211', name='=HYPERLINK("http://x","a")', code='', phone='=1+1', address='+84 912',
                                                               note='@SUM(1)', group='Khác', createdAt=now(), updatedAt=now())}], 'since': ''})
    row = qa.server_eval("()=>S.sheets['Khách hàng'].data.slice(1).find(r=>r[0]==='cuR211')")
    cells = [c for c in row[4:-2] if isinstance(c, str)]
    C.ok(all(c[:1] not in ('=', '+', '-', '@') for c in cells), f'no display cell starts with = + - @: {cells}')
    js = json.loads(row[-1])
    C.ok(js['phone'] == '=1+1' and js['note'] == '@SUM(1)', 'JSON copy keeps original text')
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner')
    ph = p.evaluate("()=>(DB.customers.find(c=>c.id==='cuR211')||{}).phone")
    C.ok(ph == '=1+1', f'app reads back original text: {ph}')
C.done()
