# BUG-101: re-counting the till on the same day must not silently undo a posted difference.
from rlib import *
C = Check('BUG-101')
with QA(port=8902, prefix='rg101') as qa:
    p = qa.new_device('o', mobile=False); qa.connect(p, 'owner'); full(p)
    p.evaluate("()=>{addCash({date:today(),dir:'thu',cat:'Thu khác',amount:10000000});save();}")
    def quy():
        return p.evaluate("()=>DB.cash.reduce((s,c)=>s+(c.dir==='thu'?1:-1)*c.amount,0)")
    p.evaluate("()=>{const r=cqApply({date:today(),counted:9800000});cqPostNow(r.id);}")
    C.ok(quy() == 9800000, f'after posting diff cash = {quy()}')
    # the wizard preview for a 2nd count today (no edit id) must compare with the book WITHOUT today's own adjustment
    fresh(p, 'quy')
    bk = p.evaluate("()=>cqPreviewBook(today(),null)")
    C.ok(bk == 10000000, f'preview book for re-count = {bk}')
    p.evaluate("()=>cqApply({date:today(),counted:9800000})")
    st = p.evaluate("()=>{const c=DB.cashCounts[0];return {posted:c.posted,diff:c.diff,n:DB.cashCounts.length}}")
    C.ok(quy() == 9800000, f'after re-count same 9.8m cash still = {quy()}')
    C.ok(st['posted'] is True and st['diff'] == -200000 and st['n'] == 1, f'count stays posted: {st}')
    p.evaluate("()=>cqApply({date:today(),counted:9700000})")
    st = p.evaluate("()=>{const c=DB.cashCounts[0];return {posted:c.posted,diff:c.diff}}")
    C.ok(quy() == 9700000 and st['posted'] and st['diff'] == -300000, f're-count 9.7m re-posts new diff: cash={quy()} {st}')
    p.evaluate("()=>cqApply({date:today(),counted:10000000})")
    C.ok(quy() == 10000000 and not p.evaluate("()=>DB.cash.some(c=>c.phieuKind==='cq')"), 're-count matching book removes adjustment')
C.done()
