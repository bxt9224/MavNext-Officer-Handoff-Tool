"""MavNext account-flow tests against an in-browser stand-in for Supabase (no network).
Run: python -m http.server 8000 (repo root), then python tests/accounts_mock.py
"""
import asyncio, json
from playwright.async_api import async_playwright
import os
URL=os.environ.get('MAVNEXT_URL','http://localhost:8000/index.html')
CHROME=os.environ.get('CHROME_PATH')
os.makedirs('test-output/shots', exist_ok=True)
MOCK = r"""
(function(){
  const saved = JSON.parse(sessionStorage.getItem('__mock')||'null');
  const S = saved || { user:null, users:{}, profiles:{}, orgs:[], mems:[], reqs:[], sent:[], resets:[] };
  window.__mock = S; const save=()=>sessionStorage.setItem('__mock', JSON.stringify(S)); setInterval(save, 30);
  const uid=()=>Math.random().toString(16).slice(2,10)+'-0000-4000-8000-'+Math.random().toString(16).slice(2,14).padEnd(12,'0');
  const rows=(t)=>({organizations:S.orgs, memberships:S.mems, profiles:Object.values(S.profiles), join_requests:S.reqs}[t]||[]);
  const q=(t)=>{ let filt=[]; let op='select', payload=null, single=false, maybe=false;
    const b={ select(){return b}, order(){return b}, limit(){return b}, is(){return b},
      eq(c,v){filt.push([c,v]);return b}, insert(p){op='insert';payload=p;return b}, update(p){op='update';payload=p;return b},
      upsert(p){op='upsert';payload=p;return b}, delete(){op='delete';return b}, single(){single=true;return b}, maybeSingle(){maybe=true;return b},
      then(f,r){ let data;
        if(op==='upsert' && t==='profiles'){ S.profiles[payload.user_id]=Object.assign({consent_at:new Date().toISOString()},payload); data=S.profiles[payload.user_id]; }
        else if(op==='update' && t==='organizations'){ const o=S.orgs.find(x=>x.id===filt[0][1]); Object.assign(o,payload); data=[o]; }
        else { data=rows(t).filter(x=>filt.every(([c,v])=>x[c]===v)); if(t==='join_requests' && !filt.length) data=data.filter(x=>x.user_id===S.user.id || S.mems.some(m=>m.org_id===x.org_id&&m.user_id===S.user.id&&m.permission==='admin')); if(single||maybe) data=data[0]||null; }
        return Promise.resolve({data, error:null}).then(f,r);} };
    return b; };
  const addMem=(org,u,perm,d)=>{ const m={id:uid(),org_id:org,user_id:u,permission:perm,status:'active',data:d,created_at:new Date().toISOString()}; S.mems.push(m); return m.id; };
  window.supabase={ createClient(){ return {
    auth:{
      onAuthStateChange(){ return {data:{subscription:{unsubscribe(){}}}}; },
      getSession: async()=>({data:{session:S.user?{user:S.user}:null}}),
      signUp: async({email,password,options})=>{ if(S.users[email]) return {data:{user:{identities:[]},session:null},error:null};
        const u={id:uid(),email}; S.users[email]={u,password,confirmed:false}; if(options.data.consent_version) S.profiles[u.id]={user_id:u.id,full_name:options.data.full_name,grad_term:options.data.grad_term,major:options.data.major,consent_version:options.data.consent_version,consent_at:new Date().toISOString()}; S.sent.push(['confirm',email]); return {data:{user:u,session:null},error:null}; },
      signInWithPassword: async({email,password})=>{ const r=S.users[email]; if(!r||r.password!==password) return {data:{},error:{message:'Invalid login credentials'}}; if(!r.confirmed) return {data:{},error:{message:'Email not confirmed'}}; S.user=r.u; return {data:{user:r.u},error:null}; },
      resend: async({email})=>{ S.sent.push(['resend',email]); return {error:null}; },
      resetPasswordForEmail: async(email)=>{ S.resets.push(email); return {error:null}; },
      updateUser: async({password})=>{ S.users[S.user.email].password=password; return {data:{},error:null}; },
      signOut: async()=>{ S.user=null; return {error:null}; }
    },
    from:q,
    rpc: async(fn,a)=>{ const me=S.user;
      if(fn==='org_directory') return {data:S.orgs.filter(o=>o.listed!==false && (!a.search||o.name.toLowerCase().includes(a.search.toLowerCase()))).map(o=>({id:o.id,name:o.name})),error:null};
      if(fn==='create_organization'){ const o={id:uid(),name:a.org_name,current_term:{label:a.term_label},next_term:{},listed:true,created_at:new Date().toISOString()}; S.orgs.push(o); addMem(o.id,me.id,'admin',{name:S.profiles[me.id].full_name,email:me.email,title:a.officer_title}); return {data:o.id,error:null}; }
      if(fn==='request_to_join'){ const o=S.orgs.find(x=>x.id===a.org); if(S.reqs.some(r=>r.org_id===a.org&&r.user_id===me.id&&r.status==='pending')) return {data:null,error:{message:'you already have a pending request for this organization'}};
        const r={id:uid(),org_id:a.org,org_name:o.name,user_id:me.id,requester_name:S.profiles[me.id].full_name,requester_email:me.email,desired_title:a.title,message:a.note,status:'pending',created_at:new Date().toISOString()}; S.reqs.push(r); return {data:r.id,error:null}; }
      if(fn==='decide_join_request'){ const r=S.reqs.find(x=>x.id===a.req); r.status=a.approve?'approved':'declined'; if(a.approve) addMem(r.org_id,r.user_id,a.perm,{name:r.requester_name,email:r.requester_email,title:a.title||r.desired_title}); return {data:null,error:null}; }
      if(fn==='cancel_join_request'){ const r=S.reqs.find(x=>x.id===a.req); r.status='cancelled'; return {data:null,error:null}; }
      return {data:null,error:{message:'unknown rpc '+fn}}; }
  }; } };
  window.__confirm=(email)=>{ S.users[email].confirmed=true; };
})();
"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(**({'executable_path':CHROME} if CHROME else {})); ctx=await b.new_context(viewport={'width':1280,'height':900}); pg=await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await ctx.route('**/js/config.js', lambda r: r.fulfill(body="window.MAVNEXT_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'sb_publishable_test'};", content_type='application/javascript'))
    await ctx.add_init_script(MOCK)
    R=[]
    def rec(n,ok,d=''): R.append(ok); print('PASS' if ok else 'FAIL', n, '-', d)
    await pg.goto(URL); await pg.evaluate('localStorage.clear(); sessionStorage.clear()'); await pg.goto(URL+'#/signup'); await pg.reload(); await pg.wait_for_timeout(500)
    await pg.screenshot(path='test-output/shots/acct_signup.png', full_page=True)
    # validation
    await pg.click('button:has-text("Create account")'); await pg.wait_for_timeout(150)
    errs_shown=await pg.evaluate("[...document.querySelectorAll('[data-err-for]:not([hidden])')].map(e=>e.dataset.errFor)")
    rec('sign-up validation (name, grad term, email, password, consent)', set(['fullName','gradTerm','email','password','consent'])<=set(errs_shown), str(errs_shown))
    await pg.fill('#pf-name','Bishnu Thapa'); await pg.select_option('#pf-grad', label='Spring 2027'); await pg.fill('#pf-major','Information Systems')
    await pg.fill('#su-email','Bishnu@Example.edu'); await pg.fill('#pw-new','short1'); await pg.fill('#pw-confirm','short1'); await pg.check('input[name="consent"]')
    await pg.click('button:has-text("Create account")'); await pg.wait_for_timeout(150)
    rec('weak password rejected', 'at least 10' in await pg.inner_text('[data-err-for="password"]'))
    await pg.fill('#pw-new','Chess club 2027 rocks'); await pg.fill('#pw-confirm','Chess club 2027 rockz'); await pg.click('button:has-text("Create account")'); await pg.wait_for_timeout(150)
    rec('password confirmation must match', "don't match" in await pg.inner_text('[data-err-for="confirm"]'))
    await pg.fill('#pw-confirm','Chess club 2027 rocks'); meter=await pg.inner_text('#pw-meter')
    await pg.click('button:has-text("Create account")'); await pg.wait_for_timeout(500)
    t=await pg.inner_text('body'); prof=await pg.evaluate("Object.values(__mock.profiles)[0]")
    rec('sign-up → check email; profile + consent stored', 'Confirm your email' in t and prof['grad_term']=='Spring 2027' and prof['consent_version']=='2026-11-21', f"meter={meter}; email lowercased={list((await pg.evaluate('__mock.users')).keys())}")
    await pg.click('text=Go to sign in'); await pg.wait_for_timeout(300)
    await pg.fill('#si-pw','Chess club 2027 rocks'); await pg.click('form[data-form="signIn"] button[type="submit"]'); await pg.wait_for_timeout(400)
    rec('unconfirmed sign-in blocked with resend option', 'Confirm your email first' in await pg.inner_text('[data-status]') and await pg.locator('[data-status] button:has-text("Resend")').count()==1)
    await pg.evaluate("__confirm('bishnu@example.edu')"); await pg.fill('#si-pw','wrong password 1'); await pg.click('form[data-form="signIn"] button[type="submit"]'); await pg.wait_for_timeout(400)
    rec('wrong password message', 'incorrect' in await pg.inner_text('[data-status]'))
    await pg.fill('#si-pw','Chess club 2027 rocks'); await pg.click('form[data-form="signIn"] button[type="submit"]'); await pg.wait_for_timeout(700)
    rec('confirmed sign-in → welcome (no org yet)', (await pg.evaluate('location.hash')).startswith('#/welcome'), await pg.evaluate('location.hash'))
    await pg.screenshot(path='test-output/shots/acct_welcome.png', full_page=True)
    # create org
    await pg.click('a.tab:has-text("Create organization")'); await pg.wait_for_timeout(300)
    await pg.click('button:has-text("Create workspace")'); await pg.wait_for_timeout(150)
    rec('create org requires name, title, leadership confirmation', await pg.locator('[data-err-for="confirmLead"]:not([hidden])').count()==1)
    await pg.fill('#co-name','Nepalese Student Association'); await pg.fill('#co-title','President'); await pg.fill('#co-term','Spring 2027'); await pg.check('input[name="confirmLead"]')
    await pg.click('button:has-text("Create workspace")'); await pg.wait_for_timeout(800)
    rec('workspace created; you are admin', 'Nepalese Student Association' in await pg.inner_text('h1') and 'administrator' in (await pg.evaluate("document.getElementById('profile-menu').textContent")).lower(), await pg.evaluate('location.hash'))
    await pg.click('.profile-btn'); await pg.click('#profile-menu button:has-text("Sign out")'); await pg.wait_for_timeout(500)
    rec('sign out → sign-in page', (await pg.evaluate('location.hash')).startswith('#/signin'))
    # second user, legacy account without profile, requests to join
    await pg.evaluate("""(()=>{ const u={id:'u-old',email:'priya@example.edu'}; __mock.users['priya@example.edu']={u,password:'Treasurer 2027 ok',confirmed:true}; })()""")
    await pg.fill('#si-email','priya@example.edu'); await pg.fill('#si-pw','Treasurer 2027 ok'); await pg.click('form[data-form="signIn"] button[type="submit"]'); await pg.wait_for_timeout(700)
    rec('account without profile must complete it', (await pg.evaluate('location.hash'))=='#/profile-setup')
    await pg.fill('#pf-name','Priya Shah'); await pg.select_option('#pf-grad', label='Fall 2027'); await pg.check('input[name="consent"]'); await pg.click('button:has-text("Continue")'); await pg.wait_for_timeout(800)
    await pg.wait_for_selector('[data-dir-results] .row'); d=await pg.inner_text('[data-dir-results]')
    rec('directory shows listed org names', 'Nepalese Student Association' in d)
    await pg.click('[data-action="requestJoin"]'); await pg.fill('#rq-title','Treasurer'); await pg.fill('#rq-note','Elected in April.'); await pg.click('.dialog button:has-text("Send request")'); await pg.wait_for_timeout(600)
    mr=await pg.inner_text('[data-my-requests]')
    rec('request sent; shows waiting status; no access yet', 'Waiting for approval' in mr and (await pg.evaluate('location.hash')).startswith('#/welcome'), mr.replace('\n',' | ')[:90])
    await pg.goto(URL+'#/overview'); await pg.wait_for_timeout(500)
    rec('pending user cannot open workspace pages', (await pg.evaluate('location.hash')).startswith('#/welcome'))
    await pg.click('button[data-action="signOut"]'); await pg.wait_for_timeout(600)
    await pg.fill('#si-email','bishnu@example.edu'); await pg.fill('#si-pw','Chess club 2027 rocks'); await pg.click('form[data-form="signIn"] button[type="submit"]'); await pg.wait_for_timeout(800)
    ov=await pg.inner_text('main'); rec('admin overview shows waiting request', 'asking to join' in ov)
    await pg.goto(URL+'#/members'); await pg.wait_for_timeout(400); await pg.screenshot(path='test-output/shots/acct_requests.png', full_page=True)
    await pg.click('[data-action="approveRequest"]'); await pg.click('.dialog button:has-text("Approve")'); await pg.wait_for_timeout(800)
    m=await pg.inner_text('main'); rec('admin approves → member listed as Officer/Treasurer', 'Priya Shah' in m and 'No pending requests' in m, '')
    await pg.goto(URL+'#/settings'); await pg.wait_for_timeout(500); st=await pg.inner_text('main')
    await pg.screenshot(path='test-output/shots/acct_settings.png', full_page=True)
    rec('settings: account panel, consent record, security center, directory toggle', all(x in st for x in ['Your account','accepted','How MavNext protects your club','List in the organization directory']))
    await pg.uncheck('input[name="listed"]'); await pg.click('button:has-text("Save organization")'); await pg.wait_for_timeout(400)
    rec('admin can hide org from directory', await pg.evaluate("__mock.orgs[0].listed")==False)
    await pg.click('button:has-text("Change password")'); await pg.fill('#cp-new','New password 2028'); await pg.fill('#cp-confirm','New password 2028'); await pg.click('.dialog button:has-text("Update password")'); await pg.wait_for_timeout(400)
    rec('change password', await pg.evaluate("__mock.users['bishnu@example.edu'].password")=='New password 2028')
    rec('last admin cannot leave (button disabled)', await pg.locator('button[data-action="leaveOrg"][disabled]').count()==1)
    # forgot password + recovery
    await pg.click('.profile-btn'); await pg.click('#profile-menu button:has-text("Sign out")'); await pg.wait_for_timeout(400)
    await pg.goto(URL+'#/forgot'); await pg.fill('#fg-email','bishnu@example.edu'); await pg.click('button:has-text("Send reset link")'); await pg.wait_for_timeout(300)
    rec('forgot password: neutral message (no account enumeration)', 'If an account exists' in await pg.inner_text('[data-status]') and await pg.evaluate("__mock.resets.length")==1)
    await pg.evaluate("__mock.user=__mock.users['bishnu@example.edu'].u; sessionStorage.setItem('__mock', JSON.stringify(__mock))"); await pg.goto(URL+'#/overview'); await pg.reload(); await pg.wait_for_timeout(1500)
    rec('recovery link → forced new-password screen', (await pg.evaluate('location.hash'))=='#/reset-password')
    await pg.fill('#pw-new','Recovered pass 2029'); await pg.fill('#pw-confirm','Recovered pass 2029'); await pg.click('button:has-text("Save new password")'); await pg.wait_for_timeout(700)
    rec('new password saved, back in workspace', (await pg.evaluate('location.hash'))=='#/overview' and await pg.evaluate("__mock.users['bishnu@example.edu'].password")=='Recovered pass 2029')
    # invitation while signed out
    await pg.evaluate("__mock.user=null; localStorage.removeItem('mavnext.session.v1')"); await pg.wait_for_timeout(100); await pg.goto(URL+'#/invite/11111111-2222-4333-8444-555555555555'); await pg.reload(); await pg.wait_for_timeout(600)
    rec('invite link signed out → sign up / sign in, token remembered', "You've been invited" in await pg.inner_text('.auth-card') and await pg.evaluate("localStorage.getItem('mavnext.pendingInvite')")=='11111111-2222-4333-8444-555555555555')
    await pg.goto(URL+'#/privacy'); await pg.wait_for_timeout(300); rec('privacy notice page', 'What we collect' in await pg.inner_text('.auth-card'))
    # mobile render of signup
    m=await b.new_context(viewport={'width':375,'height':800}); mp=await m.new_page()
    await m.route('**/js/config.js', lambda r: r.fulfill(body="window.MAVNEXT_CONFIG={supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'k'};", content_type='application/javascript'))
    await m.add_init_script(MOCK); await mp.goto(URL+'#/signup'); await mp.wait_for_timeout(600)
    w=await mp.evaluate('[document.documentElement.scrollWidth, document.documentElement.clientWidth]'); await mp.screenshot(path='test-output/shots/acct_signup_mobile.png', full_page=True)
    rec('sign-up fits on mobile', w[0]<=w[1], str(w))
    rec('no page errors', not errs, '; '.join(errs[:3]))
    print(f"\n{sum(R)}/{len(R)} passed")
    await b.close()
asyncio.run(main())
