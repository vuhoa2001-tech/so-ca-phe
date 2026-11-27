# Owner report 27/11 (real Sheet screenshot): phone numbers like 0345421755 show as 345421755 in the
# "Khách hàng" sheet – the phone column was not text-formatted, so Google Sheets turned them into numbers.
# The fake Sheet (harness_gs.js) now models that coercion.
from rlib import *
C = Check('PHONE-0')
PH = 6  # column: 4 technical columns + Tên + Số điện thoại
with QA(port=8912, prefix='rgph') as qa:
    def cell(cid):
        return qa.server_eval("(i)=>{const r=S.sheets['Khách hàng'].data.find(r=>r[0]===i);return r?r[%d]:null}" % (PH - 1), cid)
    api(qa, 'owner', {'push': [{'coll': 'customers', 'rec': dict(id='cuPH1', name='QA1_PH1', code='QP1', phone='0345421755', createdAt=now(), updatedAt=now())}], 'since': ''})
    v = cell('cuPH1')
    C.ok(v == '0345421755', f'new customer phone keeps leading 0: {v!r}')
    # an OLD row written before the fix (cell already a number, no text format) must be repaired automatically, once
    qa.server_eval("()=>{const sh=S.sheets['Khách hàng'];const i=sh.data.findIndex(r=>r[0]==='cuPH1');sh.data[i][%d]=345421755;delete sh.fmt[(i+1)+',%d'];delete S.props.fix_phone_v1;}" % (PH - 1, PH))
    api(qa, 'owner', {'push': [], 'since': ''})
    v = cell('cuPH1')
    C.ok(v == '0345421755', f'old number cell repaired from the saved data: {v!r}')
    api(qa, 'owner', {'push': [], 'since': ''})
    C.ok(qa.server_eval("()=>S.props.fix_phone_v1") == '1', 'repair runs only once (flag set)')
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner')
    C.ok(p.evaluate("()=>(DB.customers.find(c=>c.id==='cuPH1')||{}).phone") == '0345421755', 'app still reads the original phone')
C.done()
