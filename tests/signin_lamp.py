"""MavNext arrival + sign-in (lamp) and registration checks, against an in-browser stand-in for Supabase.
Run from the repo root:  python -m http.server 8000   then   python tests/signin_lamp.py
Env: MAVNEXT_URL (default http://localhost:8000/index.html), CHROME_PATH (optional).
"""
import asyncio, os, re, json
from playwright.async_api import async_playwright

URL = os.environ.get('MAVNEXT_URL', 'http://localhost:8000/index.html')
CHROME = os.environ.get('CHROME_PATH')
HERE = os.path.dirname(os.path.abspath(__file__))
FILE_URL = 'file://' + os.path.abspath(os.path.join(HERE, '..', 'index.html'))
os.makedirs('test-output/shots', exist_ok=True)
MOCK = re.search(r'MOCK = r"""(.*?)"""', open(os.path.join(HERE, 'accounts_mock.py')).read(), re.S).group(1)
MOCK += r"""
(function(){ const orig = window.supabase.createClient; window.supabase.createClient = function(){ const c = orig.apply(this, arguments);
  c.auth.signInWithOAuth = async (o) => { window.__mock.oauth = o; return { data: {}, error: null }; };
  return c; }; })();
"""
CFG = "window.MAVNEXT_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'sb_publishable_test',siteUrl:'https://example.github.io/site/'};"
R = []
def rec(name, ok, detail=''):
    R.append(bool(ok)); print('PASS' if ok else 'FAIL', name, '-', detail)

async def new_ctx(b, google=False, reduced=False, config=True, **kw):
    ctx = await b.new_context(reduced_motion='reduce' if reduced else 'no-preference', **kw)
    body = CFG if config else 'window.MAVNEXT_CONFIG={};'
    await ctx.route('**/js/config.js', lambda r: r.fulfill(body=body, content_type='application/javascript'))
    await ctx.route('https://x.supabase.co/auth/v1/settings', lambda r: r.fulfill(body=json.dumps({'external': {'email': True, 'google': google}}), content_type='application/json', headers={'access-control-allow-origin': '*'}))
    await ctx.add_init_script(MOCK)
    return ctx

def watch(pg):
    errs = []
    blank = lambda: pg.url.startswith('about:')   # the test stand-in also runs on about:blank between loads
    pg.on('pageerror', lambda e: blank() or 'Access is denied for this document' in str(e) or errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and not blank() and errs.append(m.text))
    pg.on('requestfailed', lambda r: errs.append('FAILED ' + r.url))
    pg.on('response', lambda r: r.status >= 400 and 'supabase' not in r.url and errs.append(f'{r.status} {r.url}'))
    return errs

async def fresh(pg, path):
    await pg.goto(URL); await pg.evaluate('localStorage.clear(); sessionStorage.clear()')
    await pg.goto('about:blank'); await pg.goto(URL + path); await pg.wait_for_selector('#main-content'); await pg.wait_for_timeout(400)

async def ring_xy(pg):
    bb = await pg.locator('.lp-ring').bounding_box(); return bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
async def st(pg): return await pg.evaluate("(document.getElementById('auth-scene')||{dataset:{}}).dataset.state")
LIGHT = "['.lp-lit','.au-beam','.lp-bloom'].map(s => +getComputedStyle(document.querySelector(s)).opacity)"
LAMPBOX = "(() => { const r = document.querySelector('.lp-img').getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); })()"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}))

        # ================= arrival =================
        ctx = await new_ctx(b, viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = watch(pg)
        await fresh(pg, '#/enter')
        a = await pg.evaluate(f"""(() => ({{ state: document.getElementById('auth-scene').dataset.state, light: {LIGHT},
          copy: [...document.querySelectorAll('.au-eyebrow,.au-headline,.au-lede,[data-go],.lp-hint span')].map(e => e.textContent.trim()),
          headerLinks: [...document.querySelectorAll('.au-header a')].map(a => a.getAttribute('href') + ' ' + a.textContent.trim()),
          inert: document.getElementById('auth-panel').inert, cardVis: getComputedStyle(document.getElementById('auth-panel')).visibility,
          ring: document.querySelector('.lp-ring').getAttribute('aria-label'), hit: Math.round(document.querySelector('.lp-ring').getBoundingClientRect().width),
          imgs: [...document.querySelectorAll('.lp-img')].map(i => i.complete && i.naturalWidth) }}))()""")
        rec('arrival: lamp truly off (lit layer, beam, bloom all 0)', a['light'] == [0, 0, 0], str(a['light']))
        rec('arrival copy matches the design', a['copy'] == ['For student organization leaders', 'Keep your club’s next chapter bright.', 'Plan meetings, keep your board connected, and pass on what the next team needs.', 'Go straight to sign in', 'Pull to enter your workspace'], str(a['copy']))
        rec('header: logo + "Back to home" only', a['headerLinks'] == ['#/ ', '#/ Back to home'], str(a['headerLinks']))
        rec('form hidden + inert; ring named with ≥44px target; lamp images loaded', a['inert'] and a['cardVis'] == 'hidden' and a['ring'] and a['hit'] >= 44 and all(a['imgs']), f"hit={a['hit']} imgs={a['imgs']}")
        order = []
        for _ in range(5):
            await pg.keyboard.press('Tab'); order.append(await pg.evaluate("document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim().slice(0,30) || document.activeElement.id"))
        rec('Tab order: header, go button, ring — never the hidden form', 'Go straight to sign in' in order and 'Turn on the lamp and open sign in' in order and not any('Email' in o or o.startswith('si-') for o in order), str(order))
        box0 = await pg.evaluate(LAMPBOX)
        # short pull, cancelled pull
        x, y = await ring_xy(pg)
        await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x, y + 25, steps=5); await pg.mouse.up(); await pg.wait_for_timeout(600)
        pull = await pg.evaluate("getComputedStyle(document.querySelector('.lp')).getPropertyValue('--pull').trim()")
        rec('25px pull (below 40px threshold) springs back, nothing happens', await st(pg) == 'arrival' and pull in ('0px', '0'), pull)
        await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x, y + 70, steps=6)
        await pg.evaluate("document.querySelector('.lp-ring').dispatchEvent(new PointerEvent('pointercancel', {pointerId: 1, bubbles: true}))")
        await pg.mouse.up(); await pg.wait_for_timeout(600)
        rec('cancelled pull returns the ring without activating', await st(pg) == 'arrival')
        await pg.screenshot(path='test-output/shots/arrival_desktop.png')
        # full drag, capped, released outside the ring
        await pg.mouse.move(x, y); await pg.mouse.down(); mx = 0
        for dy in range(0, 280, 20):
            await pg.mouse.move(x - dy * 0.8, y + dy)
            mx = max(mx, await pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.lp')).getPropertyValue('--pull'))"))
        t0 = await pg.evaluate('performance.now()'); await pg.mouse.up()
        await pg.wait_for_timeout(120)
        mid = await pg.evaluate(f"[document.getElementById('auth-scene').dataset.state, {LIGHT}, location.hash]")
        await pg.wait_for_function("document.getElementById('auth-scene').dataset.state === 'signin'", timeout=3000)
        t1 = await pg.evaluate('performance.now()')
        await pg.wait_for_timeout(500)
        rec('drag travel capped at 60–80px; release outside the ring still counts', 60 <= mx <= 80, f'{mx:.1f}px')
        rec('transition: state transitioning, light rising from zero, URL → #/signin', mid[0] == 'transitioning' and all(0 <= v < 1 for v in mid[1]) and mid[2] == '#/signin', str(mid))
        rec('transition settles in ~0.5–0.8 s (no lag)', 500 <= t1 - t0 <= 800, f'{t1 - t0:.0f} ms')
        s = await pg.evaluate(f"""(() => ({{ light: {LIGHT}, box: {LAMPBOX}, copy: !!document.querySelector('.au-copy'), focus: document.activeElement.tagName + '#' + document.activeElement.id,
          title: document.getElementById('au-title').textContent, inert: document.getElementById('auth-panel').inert,
          pe: ['.au-beam','.lp-bloom'].map(q => getComputedStyle(document.querySelector(q)).pointerEvents), z: [getComputedStyle(document.querySelector('.au-beam')).zIndex, getComputedStyle(document.querySelector('.au-card > *')).zIndex, getComputedStyle(document.querySelector('.lp')).zIndex] }}))()""")
        rec('lamp lit (all light layers at full)', s['light'] == [1, 1, 1], str(s['light']))
        rec('lamp base + arms did not move (identical box)', s['box'] == box0, f"{box0} → {s['box']}")
        rec('sign-in card shown, heading focused (h1), hero copy removed', s['title'] == 'Welcome Back Maverick' and s['focus'] == 'H1#au-title' and not s['copy'] and not s['inert'], s['focus'])
        rec('light is non-interactive and sits behind the card text', s['pe'] == ['none', 'none'] and int(s['z'][0]) < int(s['z'][1]), str(s))
        # light points at the fields: beam axis passes left/down from the shade toward the card
        aim = await pg.evaluate("""(() => { const lp = document.querySelector('.lp').getBoundingClientRect(); const ox = lp.x + lp.width * 134/726, oy = lp.y + lp.height * 253/835;
          const f = document.getElementById('si-email').getBoundingClientRect(); const fx = f.x + f.width/2, fy = f.y + f.height/2;
          const ang = Math.atan2(fx - ox, -(fy - oy)) * 180 / Math.PI; return [Math.round(ox), Math.round(oy), Math.round(fx), Math.round(fy), Math.round((ang + 360) % 360)]; })()""")
        rec('beam (220°–272°) covers the direction from the shade to the email field', 220 <= aim[4] <= 272, f'direction {aim[4]}°')
        await pg.screenshot(path='test-output/shots/signin_desktop.png')
        # pulling again is harmless
        await pg.fill('#si-email', 'Maya@Example.edu'); await pg.fill('#si-pw', 'pasted-Secret#2027')
        x, y = await ring_xy(pg)
        await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x, y + 90, steps=5); await pg.mouse.up(); await pg.mouse.click(x, y); await pg.wait_for_timeout(700)
        v = await pg.evaluate("[document.getElementById('si-email').value, document.getElementById('si-pw').value, document.getElementById('auth-scene').dataset.state, getComputedStyle(document.getElementById('auth-panel')).visibility]")
        rec('pulling again keeps the form and typed values', v == ['Maya@Example.edu', 'pasted-Secret#2027', 'signin', 'visible'], str(v))
        # password visibility
        await pg.click('[data-eye="si-pw"]')
        e1 = await pg.evaluate("[document.getElementById('si-pw').type, document.querySelector('[data-eye=\"si-pw\"]').getAttribute('aria-pressed'), document.querySelector('[data-eye=\"si-pw\"]').getAttribute('aria-label')]")
        await pg.click('[data-eye="si-pw"]')
        rec('password show/hide icon toggles type, aria-pressed and name', e1 == ['text', 'true', 'Hide password'] and await pg.evaluate("document.getElementById('si-pw').type") == 'password', str(e1))
        # validation: card stays put
        await pg.wait_for_timeout(900)  # let the card's entrance animation settle before measuring
        top0 = await pg.evaluate("Math.round(document.querySelector('.au-card').getBoundingClientRect().top)")
        await pg.fill('#si-email', 'nope'); await pg.fill('#si-pw', ''); await pg.click('.au-form[data-form="signin"] button[type="submit"]'); await pg.wait_for_timeout(150)
        ve = await pg.evaluate("[[...document.querySelectorAll('[data-show=\"signin\"] .ap-err:not([hidden])')].map(e => e.textContent), Math.round(document.querySelector('.au-card').getBoundingClientRect().top)]")
        rec('validation messages appear and the card does not move', len(ve[0]) == 2 and ve[1] == top0, str(ve))
        # forgot password in place
        await pg.fill('#si-email', 'maya@example.edu'); await pg.click('[data-mode-to="forgot"]'); await pg.wait_for_timeout(150)
        f = await pg.evaluate(f"[location.hash, document.getElementById('fg-email').value, document.activeElement.id, document.getElementById('auth-scene').dataset.state, {LIGHT}]")
        rec('Forgot password? swaps the card in place, keeps email and the lit lamp', f[0] == '#/forgot' and f[1] == 'maya@example.edu' and f[2] == 'au-title-forgot' and f[4] == [1, 1, 1], str(f[:3]))
        await pg.click('[data-form="forgot"] button[type="submit"]'); await pg.wait_for_timeout(300)
        rec('reset link requested with clear feedback', 'reset link is on its way' in await pg.inner_text('[data-show="forgot"] [data-status]') and await pg.evaluate("__mock.resets.includes('maya@example.edu')"))
        await pg.click('.au-back'); await pg.wait_for_timeout(100)
        rec('back to sign in', await pg.evaluate("location.hash") == '#/signin' and await pg.is_visible('#si-email'))
        # Create an account → separate page, no lamp
        await pg.click('.au-alt a'); await pg.wait_for_timeout(500)
        g = await pg.evaluate("[location.hash, document.querySelectorAll('.lp').length, !!document.querySelector('[data-google]'), document.getElementById('rg-title').textContent, !!document.querySelector('.ap-reqs'), !!document.getElementById('rg-confirm'), !!document.querySelector('input[name=consent]'), document.getElementById('pf-grad') && document.getElementById('pf-grad').options.length > 3]")
        rec('"Create an account" opens the registration page: no lamp; Google; rules; grad term; confirm; consent', g[0] == '#/signup' and g[1] == 0 and all(g[2:]) and g[3] == 'Create your officer account', str(g))
        await pg.screenshot(path='test-output/shots/register_desktop.png', full_page=True)
        rec('no console errors or failed assets (desktop run)', not errs, str(errs))
        await ctx.close()

        # ================= registration + sign-in flow =================
        ctx = await new_ctx(b, viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = watch(pg)
        await fresh(pg, '#/signup')
        await pg.click('.rg-submit'); await pg.wait_for_timeout(150)
        shown = await pg.evaluate("[...document.querySelectorAll('.rg-form [data-err-for]:not([hidden])')].map(e => e.dataset.errFor)")
        rec('registration validation: name, term, email, password, consent', set(['fullName', 'gradTerm', 'email', 'password', 'consent']) <= set(shown), str(shown))
        await pg.fill('#pf-name', 'Bishnu Thapa'); await pg.select_option('#pf-grad', label='Spring 2027'); await pg.fill('#pf-major', 'Information Systems')
        await pg.fill('#rg-email', 'Bishnu@Example.edu'); await pg.fill('#rg-pw', 'password12345'); await pg.wait_for_timeout(50)
        m = await pg.evaluate("[document.querySelector('.ap-meter-label').textContent, [...document.querySelectorAll('.ap-reqs li')].map(l => l.dataset.ok)]")
        rec('live rules + strength: "password12345" is Weak, case/symbol rules unmet', m[0].startswith('Weak') and m[1] == ['true', 'false', 'true', 'false'], str(m))
        await pg.click('[data-eye="rg-pw"]')
        rec('eye button reveals the password and its label becomes "Hide password"', await pg.evaluate("[document.getElementById('rg-pw').type, document.querySelector('[data-eye=\"rg-pw\"]').getAttribute('aria-label')]") == ['text', 'Hide password'])
        rec('no separate "Show" text button on the register page', await pg.evaluate("!document.querySelector('.ap-show')"))
        await pg.fill('#rg-pw', 'Chess club 2027 rocks!'); await pg.fill('#rg-confirm', 'Chess club 2027 rock'); await pg.check('input[name=consent]')
        await pg.click('.rg-submit'); await pg.wait_for_timeout(150)
        rec('confirm-password mismatch caught', 'match' in await pg.inner_text('#rg-confirm-err'))
        await pg.fill('#rg-confirm', 'Chess club 2027 rocks!'); await pg.click('.rg-submit'); await pg.wait_for_timeout(600)
        sent = await pg.evaluate("[location.hash, document.getElementById('rg-title').textContent, JSON.stringify(Object.values(__mock.profiles))]")
        rec('sign-up → "Check your email"; profile with consent stored by Supabase trigger', sent[0].startswith('#/check-email') and sent[1] == 'Check your email' and 'Spring 2027' in sent[2] and 'consent_version' in sent[2], sent[0])
        await pg.click('[data-resend]'); await pg.wait_for_timeout(200)
        rec('resend confirmation feedback', 'on its way' in await pg.inner_text('[data-sent-scope] [data-status]'))
        await pg.click('a.rg-submit'); await pg.wait_for_timeout(400)
        rec('"Go to sign in" opens the usable form directly (no lamp intro again)', await st(pg) == 'signin' and await pg.evaluate(LIGHT) == [1, 1, 1])
        await pg.fill('#si-email', 'bishnu@example.edu'); await pg.fill('#si-pw', 'Chess club 2027 rocks!'); await pg.click('[data-form="signin"] button[type="submit"]'); await pg.wait_for_timeout(400)
        rec('unconfirmed account: clear error + resend link', 'Confirm your email first' in await pg.inner_text('[data-show="signin"] [data-status]') and await pg.locator('[data-resend-inline]').count() == 1)
        await pg.evaluate("__confirm('bishnu@example.edu')")
        await pg.fill('#si-pw', 'wrong'); await pg.click('[data-form="signin"] button[type="submit"]'); await pg.wait_for_timeout(400)
        rec('wrong password: friendly error', 'incorrect' in await pg.inner_text('[data-show="signin"] [data-status]'))
        await pg.fill('#si-pw', 'Chess club 2027 rocks!'); await pg.click('[data-form="signin"] button[type="submit"]'); await pg.wait_for_timeout(900)
        rec('successful sign-in follows existing routing (no org yet → onboarding)', await pg.evaluate('location.hash') == '#/welcome')
        await pg.goto(URL + '#/enter'); await pg.wait_for_timeout(500)
        rec('signed-in visitors to #/enter go to the workspace', await pg.evaluate('location.hash') in ('#/welcome', '#/overview'))
        rec('no console errors (flow run)', not errs, str(errs))
        await ctx.close()

        # ================= other entry paths =================
        for how in ('go', 'Enter', 'Space', 'click'):
            ctx = await new_ctx(b, viewport={'width': 1366, 'height': 820}); pg = await ctx.new_page(); errs = watch(pg)
            await fresh(pg, '#/enter')
            if how == 'go':
                for _ in range(4): await pg.click('[data-go]', force=True, no_wait_after=True)
                await pg.wait_for_timeout(1200)
                rec('"Go straight to sign in" (clicked 4×) → one transition to the same form', await st(pg) == 'signin' and await pg.evaluate("document.querySelectorAll('#au-title').length") == 1 and await pg.evaluate(LIGHT) == [1, 1, 1] and not errs, str(errs))
            elif how == 'click':
                await pg.click('.lp-ring'); await pg.click('.lp-ring', force=True); await pg.wait_for_timeout(1200)
                rec('clicking the ring (twice) → one transition', await st(pg) == 'signin' and not errs, str(errs))
            else:
                await pg.focus('.lp-ring'); await pg.keyboard.press(how); await pg.wait_for_timeout(1200)
                rec(f'{how} on the focused ring → sign in', await st(pg) == 'signin' and await pg.evaluate('document.activeElement.id') == 'au-title')
            await ctx.close()
        # touch
        ctx = await new_ctx(b, viewport={'width': 1280, 'height': 800}, has_touch=True); pg = await ctx.new_page()
        await fresh(pg, '#/enter'); cdp = await ctx.new_cdp_session(pg); x, y = await ring_xy(pg)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        for dy in range(0, 120, 10): await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y + dy}]})
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(1200)
        rec('touch pull → sign in', await st(pg) == 'signin')
        await pg.goto(URL + '#/enter'); await pg.wait_for_timeout(400); await pg.tap('.lp-ring'); await pg.wait_for_timeout(1200)
        rec('tap on the ring → sign in', await st(pg) == 'signin')
        await ctx.close()

        # ================= navigation safety =================
        ctx = await new_ctx(b, viewport={'width': 1366, 'height': 820}); pg = await ctx.new_page(); errs = watch(pg)
        await fresh(pg, '#/')
        await pg.click('.lx-header a[href="#/enter"]') if await pg.locator('.lx-header a[href="#/enter"]').count() else await pg.goto(URL + '#/enter')
        await pg.wait_for_timeout(400)
        rec('landing "Sign in" opens the arrival screen', await pg.evaluate('location.hash') == '#/enter' and await st(pg) == 'arrival')
        await pg.click('.lp-ring'); await pg.wait_for_timeout(200); await pg.click('.au-home'); await pg.wait_for_timeout(1200)
        rec('Back to home during the transition: lands home cleanly, no errors', await pg.evaluate('location.hash') == '#/' and await pg.locator('#auth-scene').count() == 0 and not errs, str(errs))
        await pg.goto(URL + '#/enter'); await pg.wait_for_timeout(300); await pg.click('[data-go]'); await pg.wait_for_timeout(1100)
        await pg.go_back(); await pg.wait_for_timeout(500)
        back = await pg.evaluate("location.hash")
        await pg.go_forward(); await pg.wait_for_timeout(500)
        fw = await pg.evaluate(f"[location.hash, document.getElementById('auth-scene') && document.getElementById('auth-scene').dataset.state, getComputedStyle(document.getElementById('auth-panel')).visibility, document.getElementById('auth-panel').inert]")
        rec('browser Back leaves the scene; Forward shows a visible, usable form (no stale overlay)', back == '#/' and fw[0] == '#/signin' and fw[1] == 'signin' and fw[2] == 'visible' and not fw[3], f'{back} {fw}')
        await pg.goto(URL + '#/signin'); await pg.reload(); await pg.wait_for_timeout(400)
        rec('direct #/signin shows the usable form immediately (lamp on, no animation)', await st(pg) == 'signin' and await pg.evaluate("document.getElementById('auth-scene').classList.contains('is-static')") and await pg.evaluate("document.getAnimations().length") == 0)
        rec('no console errors (navigation run)', not errs, str(errs))
        await ctx.close()

        # ================= reduced motion =================
        ctx = await new_ctx(b, reduced=True, viewport={'width': 1366, 'height': 820}); pg = await ctx.new_page()
        await fresh(pg, '#/enter')
        rec('reduced motion: arrival still offered (lamp off)', await st(pg) == 'arrival' and await pg.evaluate(LIGHT) == [0, 0, 0])
        await pg.click('.lp-ring'); await pg.wait_for_timeout(50)
        rm = await pg.evaluate(f"[document.getElementById('auth-scene').dataset.state, {LIGHT}, document.getAnimations().length, document.activeElement.id]")
        rec('reduced motion: activation shows the usable form at once, no animation', rm[0] == 'signin' and rm[1] == [1, 1, 1] and rm[2] == 0 and rm[3] == 'au-title', str(rm))
        await ctx.close()

        # ================= Google (registration page) =================
        for enabled in (False, True):
            ctx = await new_ctx(b, google=enabled, viewport={'width': 1366, 'height': 820}); pg = await ctx.new_page()
            await fresh(pg, '#/signup'); await pg.click('[data-google]'); await pg.wait_for_timeout(400)
            if enabled:
                o = await pg.evaluate('__mock.oauth')
                rec('Google on → Supabase OAuth returning to this page', o and o['provider'] == 'google' and o['options']['redirectTo'].endswith('/index.html'), json.dumps(o))
            else:
                rec('Google off in Supabase → clear message, no redirect', 'isn\'t turned on' in await pg.inner_text('[data-google-scope]') and await pg.evaluate('!__mock.oauth'))
            await ctx.close()

        # ================= file://, failures, no config =================
        ctx = await new_ctx(b, viewport={'width': 1366, 'height': 820}); pg = await ctx.new_page(); errs = watch(pg)
        await pg.goto(FILE_URL + '#/enter'); await pg.wait_for_timeout(700)
        imgs = await pg.evaluate("[...document.querySelectorAll('.lp-img')].map(i => i.naturalWidth)")
        await pg.click('[data-go]'); await pg.wait_for_timeout(1100)
        rec('opened as a file: lamp images load, transition works', all(imgs) and await st(pg) == 'signin' and not errs, f'{imgs} {errs}')
        await ctx.close()
        ctx = await new_ctx(b, viewport={'width': 1366, 'height': 820})
        await ctx.route('**/js/auth-scene.js', lambda r: r.fulfill(body='throw new Error("blocked")', content_type='application/javascript'))
        pg = await ctx.new_page(); await fresh(pg, '#/enter')
        fb = await pg.evaluate("[!!document.getElementById('si-email'), getComputedStyle(document.getElementById('auth-panel')).visibility, document.getElementById('auth-panel').inert]")
        rec('lamp script fails → sign-in form still visible and usable', fb[0] and fb[1] == 'visible' and not fb[2], str(fb))
        await ctx.close()
        ctx = await new_ctx(b, config=False, viewport={'width': 1366, 'height': 820}); pg = await ctx.new_page()
        await fresh(pg, '#/signin')
        t = await pg.inner_text('#auth-panel')
        rec('no Supabase config → says accounts aren\'t set up, collects nothing', 'aren\'t set up' in t and await pg.locator('#auth-panel input').count() == 0)
        await pg.click('#auth-panel [data-action="enterDemo"]'); await pg.wait_for_timeout(600)
        rec('labeled demo still opens', await pg.evaluate('location.hash') == '#/overview')
        await ctx.close()

        # ================= narrow window =================
        ctx = await new_ctx(b, viewport={'width': 700, 'height': 900}); pg = await ctx.new_page()
        await fresh(pg, '#/enter')
        n = await pg.evaluate("[document.getElementById('auth-scene').dataset.state, document.documentElement.scrollWidth <= document.documentElement.clientWidth, getComputedStyle(document.getElementById('auth-panel')).visibility]")
        rec('narrow window: usable form, no sideways scroll', n == ['signin', True, 'visible'], str(n))
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')

asyncio.run(main())
