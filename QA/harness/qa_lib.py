"""QA harness for Sổ Cà Phê (HOAVU).

Runs the REAL app (index.html served over http://127.0.0.1) in Microsoft Edge via Playwright,
and the REAL google-apps-script/Code.gs inside a separate browser page backed by a FAKE in-memory
Google Sheet (harness_gs.js). All requests to the fake sync URL are intercepted by Playwright and
answered by that fake server, so nothing ever reaches Google or the owner's real data.

Usage (from any script):
    import sys; sys.path.insert(0, r'D:\\CÁ NHÂN\\SoSachCaPhe\\QA\\harness')
    from qa_lib import QA
    with QA(port=8801) as qa:                 # pick a unique port per agent (8801.. agent1, 8851.. agent2)
        p = qa.new_device('owner')            # fresh browser context = a fresh device (own localStorage)
        qa.connect(p, 'owner')                # connects through the real "#ket-noi=" link flow
        p.screenshot(path=qa.ev('home.png'))
        rows = qa.server_rows('purchases')    # inspect the fake Google Sheet ("database")
Devices: new_device(role, mobile=True|False, dark=False). Tokens: qa.TOK['owner'], qa.TOK['staff'].
Network faults: qa.offline(p, True/False) for one device; qa.server.fail_next() makes the next sync fail.
Evidence path helper: qa.ev(name) -> QA/evidence/screenshots/<prefix>_<name>.
Data prefixes (protocol 2.2): Agent 1 creates data named QA1_*, Agent 2 QA2_*.
Never point the app at a real https://script.google.com URL other than FAKE_URL below.
"""
import json, os, threading, http.server, socketserver, functools, base64, time
from playwright.sync_api import sync_playwright

ROOT = r'D:\CÁ NHÂN\SoSachCaPhe'
HARN = os.path.join(ROOT, 'QA', 'harness')
EVID = os.path.join(ROOT, 'QA', 'evidence', 'screenshots')
FAKE_URL = 'https://script.google.com/macros/s/QA-FAKE-SERVER/exec'
EDGE = 'msedge'


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class QA:
    TOK = {'owner': 'QAOW-NER1-TEST', 'owner2': 'QAOW-NER2-TEST', 'staff': 'QAST-AFF1-TEST', 'staff2': 'QAST-AFF2-TEST'}
    NAMES = {'owner': 'QA Chủ', 'owner2': 'QA Chủ 2', 'staff': 'QA Lan', 'staff2': 'QA Hoa'}

    def __init__(self, port=8801, prefix='qa', headless=True, slow_mo=0):
        self.port, self.prefix, self.headless, self.slow_mo = port, prefix, headless, slow_mo
        self.base = f'http://127.0.0.1:{port}/'
        self.console = []          # (device_label, type, text)
        self.page_errors = []      # (device_label, message)
        self.devices = []

    # ---------- lifecycle ----------
    def __enter__(self):
        H = functools.partial(_Quiet, directory=ROOT)
        socketserver.TCPServer.allow_reuse_address = True
        self.httpd = socketserver.ThreadingTCPServer(('127.0.0.1', self.port), H)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(channel=EDGE, headless=self.headless, slow_mo=self.slow_mo)
        self._start_server_page()
        return self

    def __exit__(self, *a):
        try:
            self.browser.close()
        finally:
            self.pw.stop()
            self.httpd.shutdown()
            self.httpd.server_close()

    # ---------- fake Google server (real Code.gs) ----------
    def _start_server_page(self):
        gs = open(os.path.join(ROOT, 'google-apps-script', 'Code.gs'), encoding='utf-8').read()
        head = open(os.path.join(HARN, 'harness_head.js'), encoding='utf-8').read()
        hgs = open(os.path.join(HARN, 'harness_gs.js'), encoding='utf-8').read()
        ctx = self.browser.new_context()
        self.srv = ctx.new_page()
        self.srv.set_content('<!doctype html><meta charset=utf-8><body>fake server</body>')
        self.srv.evaluate('([g,s])=>{window.SRC="";window.GS=g;(0,eval)(s);}', [gs, head + '\n' + hgs])
        self.srv.evaluate('''(t)=>{window.S=mkServerGS();for(const k in t.TOK){S.addUser(t.TOK[k],t.NAMES[k],k.startsWith('owner')?'owner':'staff');}
            window.S_failNext=false;}''', {'TOK': self.TOK, 'NAMES': self.NAMES})
        self.server = _ServerCtl(self)

    BLOCKED = []  # external URLs the app (or a test) tried to reach – for evidence

    def _only_local(self, route, request):
        from urllib.parse import urlparse
        u = urlparse(request.url)
        if u.scheme in ('data', 'blob', 'about') or u.hostname in ('127.0.0.1', 'localhost'):
            return route.continue_()
        QA.BLOCKED.append(request.url)
        return route.abort('blockedbyclient')

    def _route(self, route, request):
        if getattr(request.frame.page, '_qa_cut', False):   # device is "offline": drop the request for real
            return route.abort('internetdisconnected')
        if request.method != 'POST':
            return route.fulfill(status=200, content_type='text/plain', body='OK')
        body = request.post_data or ''
        try:
            txt = self.srv.evaluate('async b=>{const r=await S.fetch("x",{body:b});return await r.text();}', body)
        except Exception as e:  # simulated network failure (fail_next)
            return route.abort('failed')
        return route.fulfill(status=200, content_type='application/json', body=txt)

    def server_rows(self, coll):
        """Rows of the fake Google Sheet for a collection: {id: {ts, del, srv, json(dict)}}"""
        rows = self.srv.evaluate('c=>S.rowsOf(c)', coll)
        for r in rows.values():
            try:
                r['json'] = json.loads(r.get('json') or '{}') if isinstance(r.get('json'), str) else r.get('json')
            except Exception:
                pass
        return rows

    def server_eval(self, js, arg=None):
        return self.srv.evaluate(js, arg)

    # ---------- devices ----------
    def new_device(self, label='dev', mobile=True, dark=False):
        opts = dict(locale='vi-VN', timezone_id='Asia/Ho_Chi_Minh', color_scheme='dark' if dark else 'light')
        if mobile:
            opts.update(viewport={'width': 375, 'height': 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
        else:
            opts.update(viewport={'width': 1366, 'height': 820})
        ctx = self.browser.new_context(**opts)
        # Playwright: the route registered LAST wins, so catch-alls go first.
        # 1) anything not on 127.0.0.1 is aborted (Phase 0 finding: other internet hosts were not blocked)
        ctx.route('**/*', self._only_local)
        # 2) real Google is never reachable
        ctx.route('https://script.google.com/**', lambda r, q: r.abort('blockedbyclient'))
        ctx.route(FAKE_URL + '*', self._route)
        p = ctx.new_page()
        p._qa_label = label
        p.on('console', lambda m, l=label: self.console.append((l, m.type, m.text)))
        p.on('pageerror', lambda e, l=label: self.page_errors.append((l, str(e))))
        p.on('dialog', lambda d: d.accept())  # confirm()/alert() auto-accept; override per test with p.once('dialog',...)
        p.goto(self.base + 'index.html')
        p.wait_for_load_state('networkidle')
        self.devices.append(p)
        return p

    def connect(self, p, who='owner'):
        """Real connect-link flow: open index.html#ket-noi=<b64url {u,t}> and press the connect button."""
        payload = base64.urlsafe_b64encode(json.dumps({'u': FAKE_URL, 't': self.TOK[who]}).encode()).decode().rstrip('=')
        p.goto(self.base + 'index.html#ket-noi=' + payload)
        p.wait_for_timeout(600)
        btn = p.locator('#dlg[open] button:has-text("Kết nối")')
        if btn.count():
            btn.first.click()
        p.wait_for_timeout(2000)
        return p

    def offline(self, p, flag=True):
        """Real offline for this device: navigator.onLine=false AND every sync request is aborted.
        (Before 26/11 fix this only flipped navigator.onLine – reported by Agent 1.)"""
        p.context.set_offline(flag)
        p._qa_cut = flag

    def sync(self, p, wait_ms=1500):
        """Force a sync on a device via the app's own Store.syncNow."""
        p.evaluate('()=>Store.syncNow(true)')
        p.wait_for_timeout(wait_ms)

    def js(self, p, code, arg=None):
        return p.evaluate(code, arg)

    def ev(self, name):
        os.makedirs(EVID, exist_ok=True)
        return os.path.join(EVID, f'{self.prefix}_{name}')

    def errors(self):
        return [e for e in self.page_errors] + [c for c in self.console if c[1] == 'error' and 'QA-FAKE' not in c[2]]


class _ServerCtl:
    def __init__(self, qa):
        self.qa = qa

    def fail_next(self):
        self.qa.srv.evaluate('()=>{S.failNext=true;}')

    def drop_response_next(self):
        self.qa.srv.evaluate('()=>{S.dropResponseNext=true;}')

    def calls(self):
        return self.qa.srv.evaluate('()=>S.calls')
