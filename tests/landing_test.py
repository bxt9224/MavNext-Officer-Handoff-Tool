"""MavNext landing page checks (run: python -m http.server 8000, then python tests/landing_test.py)."""
import asyncio, json
from playwright.async_api import async_playwright
import os
HTTP=os.environ.get('MAVNEXT_URL','http://localhost:8000/index.html')
FILE='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'..','index.html'))
os.makedirs('test-output/shots', exist_ok=True)
async def probe(b, url, name, vp={'width':1440,'height':900}, reduced=False, block_libs=False, shots=True):
    ctx=await b.new_context(viewport=vp, reduced_motion='reduce' if reduced else 'no-preference')
    if block_libs:
        await ctx.route('**/vendor/**', lambda r: r.abort())
    pg=await ctx.new_page(); errs=[]; warns=[]; failed=[]
    pg.on('requestfailed', lambda rq: failed.append(rq.url))
    pg.on('response', lambda rs: failed.append(rs.url) if rs.status>=400 else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: (errs if m.type=='error' else warns).append(m.text) if m.type in ('error','warning') and 'Failed to load resource' not in m.text else None)
    await pg.goto(url); await pg.evaluate('localStorage.clear()'); await pg.goto(url); await pg.wait_for_timeout(1500)
    r={}
    r['fonts']=await pg.evaluate("document.fonts.ready.then(()=>[...document.fonts].filter(f=>f.family.includes('Noto')&&f.status==='loaded').map(f=>f.weight).sort().join(','))")
    r['h1_font']=await pg.evaluate("getComputedStyle(document.querySelector('.lx-hero h1')).fontFamily + ' / ' + getComputedStyle(document.querySelector('.lx-hero h1')).fontWeight")
    r['libs']=await pg.evaluate("[!!window.gsap, !!window.ScrollTrigger, !!window.Lenis, document.documentElement.classList.contains('lenis')]")
    r['overflow']=await pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    if shots: await pg.screenshot(path=f'test-output/shots/lx_{name}_top.png')
    # scroll through the whole page
    H=await pg.evaluate('document.documentElement.scrollHeight')
    for y in range(0, H, 400):
        await pg.mouse.wheel(0, 400); await pg.wait_for_timeout(60)
    await pg.wait_for_timeout(1500)
    # all text visible?
    r['hidden_text']=await pg.evaluate("""[...document.querySelectorAll('.lx h1,.lx h2,.lx h3,.lx p,.lx dt,.lx dd,.lx li')].filter(e=>{const s=getComputedStyle(e);return parseFloat(s.opacity)<0.99||s.visibility==='hidden'}).map(e=>e.textContent.trim().slice(0,30))""")
    if shots: await pg.screenshot(path=f'test-output/shots/lx_{name}_full.png', full_page=True)
    r['errors']=[e for e in errs if 'photos' not in e]; r['photo404s']=len([u for u in failed if '/photos/' in u]); r['other404']=[u for u in failed if '/photos/' not in u]; r['warnings']=[w for w in warns if 'font' in w.lower() or 'preload' in w.lower()][:3]
    await ctx.close(); return r
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(**({'executable_path':os.environ['CHROME_PATH']} if os.environ.get('CHROME_PATH') else {}))
    for args in [(HTTP,'desk'),(FILE,'file'),(HTTP,'reduced',{'width':1440,'height':900},True),(HTTP,'nolibs',{'width':1440,'height':900},False,True),(HTTP,'mobile',{'width':390,'height':844}),(HTTP,'tablet',{'width':820,'height':1180})]:
        r=await probe(b,*args); print(args[1], json.dumps(r))
    await b.close()
asyncio.run(main())
