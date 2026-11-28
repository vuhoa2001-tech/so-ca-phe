# Lịch âm: so với các ngày chuẩn đã biết (Tết, tháng nhuận) + hiện ở trang chủ và phiếu in.
from rlib import *
C = Check('LUNAR')
KNOWN = {'2026-02-17': '1/1', '2027-02-06': '1/1', '2025-01-29': '1/1', '2024-02-10': '1/1',
         '2025-07-25': '1/6 nhuận', '2025-06-25': '1/6', '2023-03-22': '1/2 nhuận', '2026-02-16': '29/12',
         '2024-09-17': '15/8', '2030-02-02': '1/1', '2030-02-03': '2/1', '2007-02-17': '1/1', '2026-11-09': '1/10'}
with QA(port=8913, prefix='rglun') as qa:
    p = qa.new_device('o', mobile=True); qa.connect(p, 'owner')
    for d, want in KNOWN.items():
        got = p.evaluate("(d)=>lunarDM(d)", d)
        C.ok(got == want, f'{d} -> {got} (đúng: {want})')
    C.ok(p.evaluate("()=>lunarStr('2026-11-28')").endswith('Bính Ngọ'), 'năm 2026 là Bính Ngọ: ' + p.evaluate("()=>lunarStr('2026-11-28')"))
    C.ok(p.evaluate("()=>lunarNote('2027-02-01')") == 'Còn 5 ngày đến Tết', 'đếm ngày đến Tết: ' + p.evaluate("()=>lunarNote('2027-02-01')"))
    C.ok(p.evaluate("()=>lunarNote('2027-02-06')") == 'Mùng 1 Tết', 'mùng 1 Tết')
    C.ok(p.evaluate("()=>lunarNote('2024-09-17')") == 'Hôm nay rằm', 'rằm')
    C.ok(p.evaluate("()=>lunarNote('2024-09-16')") == 'Mai là rằm', 'mai là rằm')
    bad = p.evaluate("()=>{let n=0,d='2020-01-01';for(let i=0;i<4000;i++){const l=lunar(d);if(!l||l.d<1||l.d>30||l.m<1||l.m>12)n++;d=lAdd(d,1);}return n}")
    C.ok(bad == 0, f'4000 ngày liên tiếp đều hợp lệ (lỗi: {bad})')
    ez = p.evaluate("()=>{const e=document.querySelector('.ehm-al');return e?e.textContent:''}")
    C.ok('Âm lịch' in ez, 'trang chủ dễ dùng hiện lịch âm: ' + ez)
    p.screenshot(path=str(EV / 'lunar_home.png')) if 'EV' in globals() else p.screenshot(path='lunar_home.png')
    rc = p.evaluate("()=>receipt({title:'X',code:'PM26-1',date:'2026-02-17',partyLabel:'Khách',party:'A',rows:[]})")
    C.ok('(ÂL 1/1)' in rc, 'phiếu in có ngày âm')
    d = qa.new_device('d', mobile=False); qa.connect(d, 'owner'); full(d); go(d, 'tq')
    h = d.evaluate("()=>[...document.querySelectorAll('h2')].map(e=>e.textContent).find(t=>t.startsWith('Hôm nay'))||''")
    C.ok('Âm lịch' in h, 'trang chủ máy tính: ' + h)
C.done()
