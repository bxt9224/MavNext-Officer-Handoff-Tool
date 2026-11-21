"""MavNext RLS policy tests against a local PostgreSQL (NOT Supabase).
Setup: initdb/pg_ctl on port 5499 with socket in /tmp, user pg; then
  psql -h /tmp -p 5499 -U pg -d postgres -f tests/auth_stub.sql -f supabase/schema.sql
  python tests/rls_test.py
"""
import subprocess, json
U={'alice':'11111111-1111-1111-1111-111111111111','bob':'22222222-2222-2222-2222-222222222222','cara':'33333333-3333-3333-3333-333333333333','eve':'44444444-4444-4444-4444-444444444444'}
def q(sql, who=None):
    pre=''
    if who:
        pre=f"set role authenticated; set request.jwt.claim.sub='{U[who]}'; set request.jwt.claims='{json.dumps({'email':who+'@x.edu','sub':U[who]})}';"
    r=subprocess.run(['psql','-h','/tmp','-p','5499','-U','pg','-d','postgres','-tAq','-v','ON_ERROR_STOP=1','-c',pre+sql],capture_output=True,text=True)
    return (r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''), r.stderr.strip()
R=[]
def t(name, ok, detail=''): R.append((name,ok)); print('PASS' if ok else 'FAIL', name, '-', detail[:150])
for k,v in U.items(): q(f"insert into auth.users values ('{v}','{k}@x.edu') on conflict do nothing")
org,_=q("select create_organization('Org A','Alice','Fall 2026')",'alice'); org=org.strip()
t('create_organization makes caller admin', q(f"select permission from memberships where org_id='{org}'",'alice')[0]=='admin', org)
orgB,_=q("select create_organization('Org B','Eve','')",'eve'); orgB=orgB.strip()
# invitations
tok,e=q(f"insert into invitations(org_id,email,permission,data) values('{org}','Bob@X.edu','officer','{{\"name\":\"Bob\"}}') returning token",'alice'); tok=tok.split('|')[0] if tok else tok
t('admin creates invitation', bool(tok), e)
o,e=q(f"insert into invitations(org_id,email,permission) values('{org}','x@x.edu','admin')",'eve'); t('non-member cannot create invitation', 'row-level security' in e, e)
o,e=q(f"select accept_invitation('{tok}')",'cara'); t('invitation rejected for different email', 'different email' in e, e)
bobm,e=q(f"select accept_invitation('{tok}')",'bob'); t('invitation accepted by matching email', bool(bobm) and not e, e)
o,e=q(f"select accept_invitation('{tok}')",'bob'); t('invitation cannot be reused', 'already used' in e, e)
tok2,_=q(f"insert into invitations(org_id,email,permission,data) values('{org}','cara@x.edu','incoming','{{\"name\":\"Cara\"}}') returning token",'alice'); q(f"select accept_invitation('{tok2.split('|')[0]}')",'cara')
mem=lambda who,o=org: q(f"select id from memberships where org_id='{o}' and user_id='{U[who]}'")[0]
A,B,C=mem('alice'),mem('bob'),mem('cara')
# self promotion
o,e=q(f"update memberships set permission='admin' where id='{B}' returning id",'bob'); t('officer cannot self-promote', o=='' , f'rows={o!r} {e}')
o,e=q(f"update memberships set permission='officer' where id='{A}'",'alice'); t('last admin cannot demote self', 'last administrator' in e, e)
# isolation
o,_=q(f"select count(*) from organizations",'eve'); t('Eve sees only her org', o=='1', o)
o,_=q(f"select count(*) from memberships where org_id='{org}'",'eve'); t('Eve cannot read Org A memberships', o=='0', o)
o,e=q(f"insert into meetings(id,org_id,data) values('mX','{org}','{{\"createdBy\":\"{mem('eve',orgB)}\"}}')",'eve'); t('Eve cannot write into Org A', 'row-level security' in e, e)
# meetings
o,e=q(f"insert into meetings(id,org_id,data) values('m1','{org}','{{\"title\":\"M\",\"createdBy\":\"{A}\",\"status\":\"scheduled\"}}')",'alice'); t('admin creates meeting', not e, e)
o,e=q(f"insert into meetings(id,org_id,data) values('m2','{org}','{{\"createdBy\":\"{C}\"}}')",'cara'); t('incoming officer cannot create meeting', 'row-level security' in e, e)
o,e=q(f"update meetings set data=data||'{{\"status\":\"cancelled\"}}' where id='m1'",'bob'); t('officer cannot cancel others\' meeting', 'only an administrator' in e, e)
o,_=q("select count(*) from meetings",'eve'); t('Eve cannot read Org A meetings', o=='0', o)
# tasks
q(f"insert into tasks(id,org_id,data) values('t1','{org}','{{\"title\":\"T\",\"createdBy\":\"{A}\",\"assigneeId\":\"{C}\",\"status\":\"todo\"}}')",'alice')
q(f"insert into tasks(id,org_id,data) values('t2','{org}','{{\"title\":\"T2\",\"createdBy\":\"{A}\",\"assigneeId\":\"{B}\",\"status\":\"todo\"}}')",'alice')
o,_=q("select string_agg(id,',' order by id) from tasks",'cara'); t('incoming sees only assigned tasks', o=='t1', o)
o,e=q("update tasks set data=data||'{\"status\":\"done\"}' where id='t1' returning id",'cara'); t('incoming can complete own task', o=='t1', e)
o,e=q("update tasks set data=data||'{\"title\":\"hacked\"}' where id='t1'",'cara'); t('incoming cannot edit other task fields', 'only change the status' in e, e)
o,e=q("update tasks set data=data||'{\"status\":\"done\"}' where id='t2' returning id",'cara'); t('incoming cannot touch unassigned task', o=='', f'{o!r} {e}')
# handoffs
o,e=q(f"insert into handoffs(id,org_id,data) values('h1','{org}','{{\"role\":\"Pres\",\"outgoingMemberId\":\"{B}\",\"incomingMemberId\":\"{C}\"}}')",'bob'); t('officer creates own handoff', not e, e)
o,e=q(f"insert into handoffs(id,org_id,data) values('h2','{org}','{{\"outgoingMemberId\":\"{A}\"}}')",'bob'); t('officer cannot create handoff for someone else', 'row-level security' in e, e)
o,_=q("select count(*) from handoffs",'cara'); t('incoming cannot see unsubmitted draft', o=='0', o)
o,e=q(f"insert into handoff_versions(id,org_id,handoff_id,version,submitted_by,snapshot) values('v1','{org}','h1',1,'{B}','{{\"a\":1}}')",'bob'); t('outgoing submits v1', not e, e)
o,e=q(f"insert into handoff_versions(id,org_id,handoff_id,version,submitted_by,snapshot) values('v3','{org}','h1',3,'{B}','{{}}')",'bob'); t('version numbers must be sequential', 'version must follow' in e, e)
o,e=q("update handoff_versions set snapshot='{\"a\":2}' where id='v1' returning id",'bob'); t('submitted snapshot cannot be modified', o=='', f'{o!r} {e}')
o,e=q("delete from handoff_versions where id='v1' returning id",'alice'); t('submitted snapshot cannot be deleted (even admin)', o=='', f'{o!r} {e}')
o,e=q("delete from handoffs where id='h1' returning id",'bob'); t('submitted handoff cannot be deleted', o=='', f'{o!r} {e}')
o,_=q("select count(*) from handoffs",'cara'); t('incoming sees handoff after submission', o=='1', o)
o,e=q(f"insert into handoff_reviews(id,org_id,handoff_id,version,type,by_member) values('r0','{org}','h1',1,'acknowledged','{B}')",'bob'); t('outgoing cannot acknowledge own handoff', 'row-level security' in e, e)
o,e=q(f"insert into handoff_reviews(id,org_id,handoff_id,version,type,by_member) values('r1','{org}','h1',1,'acknowledged','{C}')",'cara'); t('incoming acknowledges', not e, e)
o,_=q(f"select permission from memberships where id='{C}'"); t('acknowledging does not grant admin', o=='incoming', o)
o,e=q("update handoffs set data=data||'{\"role\":\"x\"}' where id='h1' returning id",'cara'); t('incoming cannot edit handoff', o=='', f'{o!r} {e}')
o,_=q("select count(*) from handoff_versions",'eve'); t('Eve cannot read Org A versions', o=='0', o)
o,_=q("select count(*) from handoffs"); 
o,e=q("select count(*) from organizations",None)
o,e=q(f"select create_organization('X','Y','')") ; t('anonymous cannot create organization', 'permission denied' in e or 'sign in required' in e, e)
print(f"\n{sum(ok for _,ok in R)}/{len(R)} passed")
json.dump([{'test':n,'pass':ok} for n,ok in R], open('rls_results.json','w'), indent=1)
