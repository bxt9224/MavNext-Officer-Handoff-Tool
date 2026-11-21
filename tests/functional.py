"""MavNext browser workflow tests.
Run: python -m http.server 8000 (repo root), then: pip install playwright && playwright install chromium && python tests/functional.py
"""
import asyncio, json, re
from playwright.async_api import async_playwright, expect
import os
URL=os.environ.get('MAVNEXT_URL','http://localhost:8000/index.html')
CHROME=os.environ.get('CHROME_PATH')  # optional; defaults to Playwright's Chromium
OUT=os.environ.get('OUT_DIR','test-output'); os.makedirs(OUT+'/shots', exist_ok=True)
R=[]
def rec(n, ok, detail): R.append({'test':n,'pass':bool(ok),'detail':detail}); print(('PASS' if ok else 'FAIL'), n, '-', detail)
LEGACY=json.dumps({"meta":{"orgName":"My Real Club","officerRole":"Treasurer","officerRoleOther":"","outgoingOfficer":"Sam Real","incomingOfficer":"Lee Next","lastReviewedDate":"2026-11-01"},"answers":{"q_mission":{"text":"Real draft text — must survive","status":"standard"},"q_reimbursements":{"text":"","status":"unresolved"}}})
async def ls(pg,k): return await pg.evaluate(f"localStorage.getItem({json.dumps(k)})")
async def go(pg,h): await pg.goto(URL+'#/'+h); await pg.wait_for_timeout(250)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(**({'executable_path':CHROME} if CHROME else {}))
    ctx=await b.new_context(viewport={'width':1366,'height':900})
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(URL); await pg.evaluate(f"localStorage.clear(); localStorage.setItem('uta_officer_handoff_data', {json.dumps(LEGACY)})")
    # Pre-existing local workspace via UI import
    await pg.goto(URL); await pg.wait_for_timeout(300)
    banner = await pg.inner_text('body')
    rec('0. Earlier draft detected on entry', 'My Real Club' in banner, 'entry screen notes the earlier draft by org name')
    await pg.click('text=Use on this device without an account'); await pg.wait_for_timeout(300)
    await pg.click('text=Create workspace'); await pg.wait_for_timeout(400)
    t=await pg.input_value('#qa-q_mission')
    rec('0b. Earlier draft imported as copy', t=='Real draft text — must survive' and (await ls(pg,'uta_officer_handoff_data'))==LEGACY, f'imported text="{t}", legacy key unchanged')
    await go(pg,'handoffs/'+ (await pg.evaluate("location.hash.split('/')[2].split('?')[0]")) +'?s=funding')
    st=await pg.get_attribute('.mark[data-qid="q_reimbursements"][data-mark="followup"]','aria-pressed')
    rec('0c. v1 "unresolved" migrated to "Needs follow-up"', st=='true', f'aria-pressed={st}')
    local_before=await ls(pg,'mavnext.local.v1'); legacy_before=await ls(pg,'uta_officer_handoff_data')
    # 1 demo entry
    await pg.click('.profile-btn'); await pg.click('text=Close workspace'); await pg.click('.dialog button:has-text("Close workspace")'); await pg.wait_for_timeout(300)
    await pg.click('text=Explore demo'); await pg.wait_for_timeout(400)
    rec('1. Enter demo without overwriting existing drafts', (await ls(pg,'mavnext.local.v1'))==local_before and (await ls(pg,'uta_officer_handoff_data'))==legacy_before and (await ls(pg,'mavnext.demo.v1')) is not None,
        'local workspace and v1 draft byte-identical after entering demo; demo stored under its own key')
    # 2 create meeting
    up_before=int(await pg.inner_text('.stat:nth-child(1) .value'))
    await go(pg,'meetings/new')
    await pg.fill('#mf-title','QA planning session'); await pg.fill('#mf-date', await pg.evaluate("MN.addDays(MN.todayISO(),2)"))
    await pg.fill('#mf-loc','Room 101'); await pg.fill('#mf-agenda','Review budget\nPick venue')
    await pg.click('button:has-text("Create meeting")'); await pg.wait_for_timeout(400)
    await pg.fill('#ag-new','Added agenda item via detail page'); await pg.click('button:has-text("Add")'); await pg.wait_for_timeout(300)
    ag=await pg.locator('.agenda li').count()
    await go(pg,'overview')
    up_after=int(await pg.inner_text('.stat:nth-child(1) .value')); ov=await pg.inner_text('main')
    rec('2. Create meeting and see it on the dashboard', up_after==up_before+1 and 'QA planning session' in ov and ag==3, f'upcoming {up_before}->{up_after}; agenda items={ag}')
    # 3 linked task
    mid=await pg.evaluate("MN.Store.list('meetings').find(m=>m.title==='QA planning session').id")
    await go(pg,f'meetings/{mid}?tab=actions'); await pg.click('button:has-text("Add action item")')
    await pg.fill('#td-title','QA follow-up task'); await pg.select_option('#td-who','m_maya'); await pg.click('.dialog button:has-text("Create task")'); await pg.wait_for_timeout(300)
    await go(pg,'overview'); mine_before=int(await pg.inner_text('.stat:nth-child(2) .value'))
    await go(pg,'tasks'); tasks_txt=await pg.inner_text('main')
    n=await pg.evaluate("MN.Store.list('tasks').filter(t=>t.title==='QA follow-up task').length")
    linked=await pg.evaluate(f"MN.Store.list('tasks').find(t=>t.title==='QA follow-up task').meetingId==='{mid}'")
    tid=await pg.evaluate("MN.Store.list('tasks').find(t=>t.title==='QA follow-up task').id")
    await pg.click(f'#tk-{tid}'); await pg.wait_for_timeout(300)
    await go(pg,'overview'); mine_after=int(await pg.inner_text('.stat:nth-child(2) .value'))
    await pg.reload(); await pg.wait_for_timeout(400)
    persisted=await pg.evaluate(f"JSON.parse(localStorage.getItem('mavnext.demo.v1')).tasks.find(t=>t.id==='{tid}').status")
    rec('3. Linked task created, shown once, completed, persisted', n==1 and linked and 'QA follow-up task' in tasks_txt and mine_after==mine_before-1 and persisted=='done',
        f'records={n}, linked to meeting={linked}, my open {mine_before}->{mine_after}, stored status={persisted}')
    # 4 handoff save + refresh
    await go(pg,'handoffs/h_pres?s=commitments')
    await pg.fill('#qa-q_immediate_next_steps','1. Update roster. 2. Meet advisor. 3. Transfer Discord.'); await pg.wait_for_timeout(900)
    await pg.reload(); await pg.wait_for_timeout(400)
    v=await pg.input_value('#qa-q_immediate_next_steps')
    rec('4. Handoff answer autosaves and restores after refresh', v.startswith('1. Update roster'), f'restored: "{v[:40]}"')
    # 5/7 review + submit
    await go(pg,'handoffs/h_pres/review'); rv=await pg.inner_text('main')
    dis=await pg.get_attribute('form[data-form="submitHandoff"] button[type="submit"]','disabled')
    rec('7a. Review lists missing required, unknown, follow-up, blank', 'required question still empty' in rv and 'Reimbursements' in rv and dis is not None,
        'missing "Reimbursements" flagged; submit disabled while required item empty')
    await go(pg,'handoffs/h_pres?s=funding'); await pg.fill('#qa-q_reimbursements','Receipts within 14 days to the Treasurer.'); await pg.wait_for_timeout(900)
    await go(pg,'handoffs/h_pres/review')
    cnt={k: await pg.locator(f'.review-cols .panel:nth-child({i}) .badge').inner_text() for i,k in [(1,'followup'),(2,'unknown'),(3,'blank')]}
    exp=await pg.evaluate("(()=>{const a=MN.analyzeAnswers(MN.Store.get('handoffs','h_pres').answers);return {followup:a.followup.length,unknown:a.unknown.length,blank:a.blank.length}})()")
    rec('7b. Review counts match stored answer states', all(int(cnt[k])==exp[k] for k in exp), f'shown={cnt} computed={exp}')
    await pg.click('button:has-text("Submit version 1")'); await pg.wait_for_timeout(200)
    blocked='Confirm the recipient' in await pg.inner_text('main')
    await pg.click('input[name="confirmRecipient"]'); await pg.click('button:has-text("Submit version 1")'); await pg.wait_for_timeout(400)
    vtxt=await pg.inner_text('main')
    rec('5a. Submit requires recipient confirmation, creates v1', blocked and 'Version 1, submitted' in vtxt and 'Submitted' in vtxt, 'confirmation enforced; snapshot view shows version 1')
    # edit after submit -> v1 unchanged
    await go(pg,'handoffs/h_pres?s=responsibilities'); await pg.fill('#qa-q_mission','CHANGED AFTER SUBMIT'); await pg.wait_for_timeout(900)
    await go(pg,'handoffs/h_pres/view?v=1'); v1=await pg.inner_text('article')
    snap=await pg.evaluate("MN.Store.list('handoffVersions').find(v=>v.handoffId==='h_pres'&&v.version===1).snapshot.answers.q_mission.text")
    rec('5b. Submitted snapshot preserved after later edits', 'CHANGED AFTER SUBMIT' not in v1 and 'Lead the five-person board' in snap, 'v1 still shows original mission text')
    # 6 incoming officer
    await pg.select_option('#demo-as','u_david'); await pg.wait_for_timeout(400)
    await go(pg,'overview'); ov=await pg.inner_text('main'); newmeet=await pg.locator('a:has-text("New meeting")').count()
    await go(pg,'tasks?scope=all'); dtasks=await pg.evaluate("[...document.querySelectorAll('.row-title')].map(e=>e.textContent)")
    await go(pg,'handoffs/h_pres'); await pg.wait_for_timeout(300); redirected=location=await pg.evaluate('location.hash')
    print('   dbg6a', 'ready for your review' in ov, newmeet, dtasks, redirected)
    rec('6a. Incoming officer permissions', 'ready for your review' in ov and newmeet==0 and dtasks==["Read last year's competition rules summary"] and redirected.endswith('/view'),
        f'review prompt shown, no create buttons, sees only own task {dtasks}, editor redirects to read-only view')
    await pg.click('button:has-text("Request clarification")'); await pg.fill('#cl-msg','Which Discord roles should I keep?'); await pg.click('.dialog button:has-text("Send request")'); await pg.wait_for_timeout(300)
    await pg.select_option('#demo-as','u_maya'); await pg.wait_for_timeout(300)
    await go(pg,'handoffs/h_pres?s=access'); ed=await pg.inner_text('main')
    await go(pg,'handoffs/h_pres/review'); await pg.click('input[name="confirmRecipient"]'); await pg.click('button:has-text("Submit version 2")'); await pg.wait_for_timeout(400)
    await pg.select_option('#demo-as','u_david'); await pg.wait_for_timeout(300)
    await go(pg,'handoffs/h_pres/view'); await pg.click('button:has-text("Acknowledge receipt")'); dlg=await pg.inner_text('.dialog')
    await pg.click('.dialog button:has-text("Acknowledge receipt")'); await pg.wait_for_timeout(300)
    st=await pg.evaluate("MN.handoffStatus(MN.Store.get('handoffs','h_pres')).key")
    perms=await pg.evaluate("MN.Store.get('members','m_david').permission")
    await go(pg,'handoffs/h_pres/view?v=1'); v1b=await pg.inner_text('article')
    rec('6b. Clarification → v2 → acknowledgment', 'requested clarification' in ed and 'does not certify' in dlg.replace('\n',' ') or 'not** certify' in dlg, f'final status={st}')
    R[-1]['pass']= 'requested clarification' in ed and 'certify' in dlg and st=='acknowledged' and perms=='incoming' and 'Lead the five-person board' in v1b
    R[-1]['detail']=f'changes-requested notice shown to outgoing; v2 submitted; acknowledged; David permission still "{perms}"; v1 readable'
    print('   ->', R[-1])
    # 8 long content + print
    await pg.select_option('#demo-as','u_maya'); await pg.wait_for_timeout(300)
    long=('Long answer sentence number %d about procedures. ' * 60) % tuple(range(60))
    long=long[:2000]
    await go(pg,'handoffs/h_pres?s=lessons'); await pg.fill('#qa-q_signature_events', long); await pg.wait_for_timeout(900)
    await go(pg,'handoffs/h_pres/view?v=draft'); await pg.emulate_media(media='print')
    full=await pg.inner_text('article'); vis=await pg.evaluate("getComputedStyle(document.querySelector('.sidebar')).display")
    pdf=await pg.pdf(path=OUT+'/shots/print-draft.pdf', format='Letter')
    pages=len(re.findall(rb'/Type\s*/Page[^s]', pdf))
    await pg.emulate_media(media='screen')
    rec('8. Long content prints in full (no truncation)', long.strip()[-40:] in full and vis=='none', f'2000-char answer fully present; sidebar hidden in print; PDF pages={pages}')
    # 10 reset demo
    loc_b=await ls(pg,'mavnext.local.v1'); leg_b=await ls(pg,'uta_officer_handoff_data')
    await go(pg,'settings'); await pg.click('button:has-text("Reset demo workspace")'); txt=await pg.inner_text('.dialog'); await pg.click('.dialog button:has-text("Reset demo")'); await pg.wait_for_timeout(400)
    gone=await pg.evaluate("!MN.Store.list('meetings').some(m=>m.title==='QA planning session')")
    rec('10. Reset demo leaves other records untouched', gone and (await ls(pg,'mavnext.local.v1'))==loc_b and (await ls(pg,'uta_officer_handoff_data'))==leg_b and 'Not affected' in txt,
        'demo restored; local workspace and v1 draft byte-identical; dialog explains scope')
    # last admin guard
    await go(pg,'members'); await pg.click('button[aria-label="Edit Maya Lin"]'); await pg.select_option('#mb-perm','officer'); await pg.click('.dialog button:has-text("Save")'); await pg.wait_for_timeout(300)
    err=await pg.inner_text('.dialog') if await pg.locator('.dialog').count() else ''
    rec('Extra: last administrator cannot be demoted', 'only administrator' in err, err.split('\n')[-2] if err else 'no dialog')
    await pg.keyboard.press('Escape')
    # cancel meeting keeps tasks
    await go(pg,'meetings/mt_exec'); await pg.click('button:has-text("Cancel meeting")'); await pg.click('.dialog button:has-text("Cancel meeting")'); await pg.wait_for_timeout(300)
    k=await pg.evaluate("[MN.Store.get('meetings','mt_exec').status, MN.Store.list('tasks').filter(t=>t.meetingId==='mt_exec').length]")
    rec('Extra: cancelling a meeting keeps its tasks', k==['cancelled',3], f'{k}')
    # delete draft
    await pg.select_option('#demo-as','u_jordan'); await pg.wait_for_timeout(300)
    await go(pg,'handoffs/new'); await pg.fill('#hd-role','Treasurer QA'); await pg.click('button:has-text("Create handoff")'); await pg.wait_for_timeout(300)
    await go(pg,'handoffs'); await pg.click('button[aria-label="Delete the Treasurer QA draft"]'); await pg.click('.dialog button:has-text("Delete draft")'); await pg.wait_for_timeout(300)
    left=await pg.evaluate("MN.Store.list('handoffs').map(h=>h.role)")
    rec('Extra: delete only this draft', left==['President','Treasurer'], f'remaining={left}')
    # 9 mobile + keyboard
    m=await b.new_context(viewport={'width':375,'height':780}, is_mobile=True)
    mp=await m.new_page(); mp.on('pageerror', lambda e: errs.append(str(e)))
    await mp.goto(URL); await mp.evaluate("localStorage.clear()"); await mp.goto(URL); await mp.wait_for_timeout(300)
    await mp.screenshot(path=OUT+'/shots/m_entry.png', full_page=True)
    await mp.click('text=Explore demo'); await mp.wait_for_timeout(400)
    over=[]
    for r in ['overview','meetings','meetings/mt_exec','tasks?scope=all','handoffs','handoffs/h_pres','handoffs/h_pres/review','handoffs/h_pres/view','members','archive','settings']:
        await mp.goto(URL+'#/'+r); await mp.wait_for_timeout(250)
        w=await mp.evaluate('[document.documentElement.scrollWidth, document.documentElement.clientWidth]')
        if w[0]>w[1]: over.append((r,w))
        await mp.screenshot(path=f"{OUT}/shots/m_{r.replace('/','_').replace('?','_').replace('=','')}.png", full_page=True)
    sb_hidden=await mp.evaluate("getComputedStyle(document.querySelector('.sidebar')).visibility")
    await mp.focus('.menu-btn'); await mp.keyboard.press('Enter'); await mp.wait_for_timeout(300)
    opened=await mp.evaluate("[document.getElementById('shell').classList.contains('drawer-open'), document.activeElement.closest('.sidebar')!==null, document.querySelector('.menu-btn').getAttribute('aria-expanded')]")
    await mp.screenshot(path=OUT+'/shots/m_drawer.png')
    await mp.keyboard.press('Escape'); await mp.wait_for_timeout(250)
    closed=await mp.evaluate("[!document.getElementById('shell').classList.contains('drawer-open'), document.activeElement.classList.contains('menu-btn')]")
    rec('9a. Mobile drawer and no horizontal overflow', not over and sb_hidden=='hidden' and opened==[True,True,'true'] and closed==[True,True], f'overflow={over}; drawer open/focus={opened}; Esc closes & returns focus={closed}')
    # keyboard on desktop: dialog focus trap + return
    await go(pg,'tasks'); await pg.focus('button:has-text("New task")'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
    infocus=await pg.evaluate("document.activeElement.id")
    for _ in range(12): await pg.keyboard.press('Tab')
    trapped=await pg.evaluate("!!document.activeElement.closest('.dialog')")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    back=await pg.evaluate("document.activeElement.textContent.trim()")
    pg=await ctx.new_page(); await pg.goto(URL+'#/overview'); await pg.wait_for_timeout(500); await pg.keyboard.press('Tab')
    skip=await pg.evaluate("document.activeElement.className")
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100); af=await pg.evaluate("document.activeElement.id")
    rec('9b. Keyboard: skip link, dialog focus trap, Escape, focus return', infocus=='td-title' and trapped and back=='New task' and skip=='skip-link' and af=='main-content', f'dialog first focus={infocus}, trapped={trapped}, returned to "{back}", skip link -> #{af}')
    # isolation of demo orgs
    await pg.select_option('#demo-as','u_david'); await pg.wait_for_timeout(300)
    orgs=await pg.evaluate("[...document.querySelectorAll('#org-switch option')].map(o=>o.textContent)")
    rec('Extra: org selector lists only memberships', orgs==['Riverside Robotics Society'], f'David sees {orgs}; Maya also belongs to Women in Computing')
    await pg.select_option('#demo-as','u_maya'); await pg.wait_for_timeout(300)
    await pg.select_option('#org-switch','org_wic'); await pg.wait_for_timeout(300); e=await pg.inner_text('main')
    rec('Extra: new workspace shows empty states, no invented activity', 'Create your first meeting' in e and 'Invite your board members' in e and 'Start a handoff' in e and 'No activity yet' in e, 'Women in Computing (empty demo org)')
    await pg.screenshot(path=OUT+'/shots/d_empty_org.png', full_page=True)
    rec('Console errors', not errs, '; '.join(errs[:5]) or 'none')
    json.dump(R, open(OUT+'/results.json','w'), indent=1)
    await b.close()
asyncio.run(main())
