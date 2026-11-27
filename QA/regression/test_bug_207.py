# BUG-207: restoring a backup while offline entries are unsent must not lose them.
from rlib import *
C = Check('BUG-207')
with QA(port=8901, prefix='rg207') as qa:
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner'); full(p)
    mua(p, 'QA1_R207 cũ', '1.000', '20'); qa.sync(p, 1500)
    old = wr('r207_old.json', p.evaluate("()=>JSON.stringify(DB)"))
    qa.offline(p, True)
    for i in range(3):
        mua(p, 'QA1_R207 mới', '1.000', str(10 + i))
    conf(p, True); restore(p, old); msg = ' '.join(confmsgs(p))
    C.ok('chưa gửi' in msg.lower(), 'restore confirm mentions unsent entries: ' + msg[:200].replace('\n', ' '))
    kg_local = sorted(p.evaluate("()=>DB.purchases.map(r=>r.kg)"))
    C.ok(kg_local == [10, 11, 12, 20], f'local purchases after restore keep unsent ones: {kg_local}')
    qa.offline(p, False); qa.sync(p, 2000); qa.sync(p, 2000)
    srv = sorted(v['json']['kg'] for v in qa.server_rows('purchases').values() if not v.get('del'))
    C.ok(srv == [10, 11, 12, 20], f'server has all purchases after reconnect: {srv}')
    n0 = cnt(p, 'purchases'); conf(p, False); restore(p, wr('r207_min.json', '{"version":1,"settings":{}}'))
    C.ok(cnt(p, 'purchases') == n0, 'Cancel keeps data')
C.done()
