"""MavNext landing page checks (run: python -m http.server 8000, then python tests/landing_keyboard.py)."""
import asyncio
from playwright.async_api import async_playwright
import os
URL=os.environ.get('MAVNEXT_URL','http://localhost:8000/index.html')
os.makedirs('test-output/shots', exist_ok=True)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(**({'executable_path':os.environ['CHROME_PATH']} if os.environ.get('CHROME_PATH') else {})); R=[]
    def rec(n,ok,d=''): R.append(ok); print('PASS' if ok else 'FAIL', n, '-', d)
    pg=await (await b.new_context(viewport={'width':1440,'height':900})).new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.goto(URL); await pg.wait_for_timeout(1200)
    n0=await pg.evaluate('ScrollTrigger.getAll().length')
    await pg.keyboard.press('Tab'); a=await pg.evaluate('document.activeElement.className'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
    rec('skip link first, moves focus to main', a=='skip-link' and await pg.evaluate('document.activeElement.id')=='main-content')
    order=[]
    for _ in range(6):
        await pg.keyboard.press('Tab'); order.append(await pg.evaluate("(document.activeElement.textContent||document.activeElement.getAttribute('aria-label')||'').trim().slice(0,20)"))
    rec('tab order', True, ' → '.join(order))
    await pg.click('.lx-menu a:has-text("How it works")'); await pg.wait_for_timeout(1800)
    top=await pg.evaluate("document.getElementById('lx-how').getBoundingClientRect().top")
    rec('nav "How it works" scrolls under header and focuses heading', 40<=top<=90 and await pg.evaluate('document.activeElement.id')=='lx-how-h' and await pg.evaluate('location.hash')=='', f'top={round(top)}')
    await pg.click('.lx-menu a:has-text("Product")'); await pg.wait_for_timeout(1800)
    rec('nav "Product" -> why section', await pg.evaluate('document.activeElement.id')=='lx-why-h')
    n1=await pg.evaluate('ScrollTrigger.getAll().length')
    await pg.click('.lx-menu button:has-text("Explore demo")'); await pg.wait_for_timeout(700)
    inapp=await pg.evaluate("[location.hash, ScrollTrigger.getAll().length, document.documentElement.classList.contains('lenis')]")
    rec('entering demo tears down landing motion', inapp==['#/overview',0,False], str(inapp))
    await pg.click('.profile-btn'); await pg.click('#profile-menu button:has-text("Exit demo")'); await pg.click('.dialog button:has-text("Exit demo")'); await pg.wait_for_timeout(1200)
    n2=await pg.evaluate('ScrollTrigger.getAll().length')
    rec('returning to landing re-creates the same triggers (no duplicates)', n0==n2 and n0>0, f'fresh {n0} vs after return {n2} (mid-scroll {n1}: once-reveals remove themselves)')
    # mobile menu
    mp=await (await b.new_context(viewport={'width':390,'height':844})).new_page()
    await mp.goto(URL); await mp.wait_for_timeout(1000)
    vis=await mp.evaluate("getComputedStyle(document.getElementById('lx-menu')).display")
    await mp.focus('.lx-menu-btn'); await mp.keyboard.press('Enter'); await mp.wait_for_timeout(200)
    st=await mp.evaluate("[document.querySelector('.lx-menu-btn').getAttribute('aria-expanded'), getComputedStyle(document.getElementById('lx-menu')).display, document.activeElement.textContent.trim()]")
    await mp.screenshot(path='test-output/shots/v_m_menu.png')
    await mp.keyboard.press('Escape'); await mp.wait_for_timeout(150)
    st2=await mp.evaluate("[document.querySelector('.lx-menu-btn').getAttribute('aria-expanded'), document.activeElement.classList.contains('lx-menu-btn')]")
    rec('mobile menu: hidden, opens with focus, Escape closes + returns focus', vis=='none' and st==['true','flex','Product'] and st2==['false',True], f'{st} {st2}')
    await mp.click('.lx-menu-btn'); await mp.click('.lx-menu a:has-text("How it works")'); await mp.wait_for_timeout(1600)
    rec('mobile menu link navigates and closes menu', await mp.evaluate("document.querySelector('.lx-menu-btn').getAttribute('aria-expanded')")=='false' and await mp.evaluate('document.activeElement.id')=='lx-how-h')
    # sign in link target
    await pg.goto(URL); await pg.wait_for_timeout(800); await pg.click('.lx-hero a:has-text("Sign in")'); await pg.wait_for_timeout(500)
    rec('hero Sign in opens the arrival (lamp) screen', (await pg.evaluate('location.hash'))=='#/enter', await pg.evaluate('location.hash'))
    rec('no page errors', not errs, str(errs[:2]))
    print(f'{sum(R)}/{len(R)} passed'); await b.close()
asyncio.run(main())
