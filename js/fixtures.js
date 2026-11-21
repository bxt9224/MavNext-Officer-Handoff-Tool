/* MavNext — demo fixtures. Entirely fictional people and organizations.
   Dates are generated relative to the day the demo is opened or reset, so
   "upcoming" meetings stay upcoming. All screens read these same records. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});

  MN.DEMO_USERS = [
    { id: 'u_maya', name: 'Maya Lin', email: 'maya.lin@example.edu' },
    { id: 'u_jordan', name: 'Jordan Smith', email: 'jordan.smith@example.edu' },
    { id: 'u_aisha', name: 'Aisha Rahman', email: 'aisha.rahman@example.edu' },
    { id: 'u_carlos', name: 'Carlos Mendez', email: 'carlos.mendez@example.edu' },
    { id: 'u_david', name: 'David Kim', email: 'david.kim@example.edu' },
    { id: 'u_priya', name: 'Priya Shah', email: 'priya.shah@example.edu' }
  ];

  MN.buildDemoWorkspace = function () {
    const T = MN.todayISO();
    const D = (n) => MN.addDays(T, n);
    const ts = (n, hh) => new Date(`${D(n)}T${hh || '15:00'}:00`).toISOString();
    const tz = 'America/Chicago';
    const org = 'org_rrs';
    const org2 = 'org_wic';

    const orgs = [
      { id: org, name: 'Riverside Robotics Society', currentTerm: { label: 'Fall 2026', start: '2026-08-15', end: '2026-12-15' }, nextTerm: { label: 'Spring 2027', start: '2027-01-10', end: '2027-05-15' }, createdAt: ts(-90) },
      { id: org2, name: 'Women in Computing', currentTerm: { label: 'Fall 2026', start: '2026-08-15', end: '2026-12-15' }, nextTerm: { label: 'Spring 2027', start: '2027-01-10', end: '2027-05-15' }, createdAt: ts(-2) }
    ];
    const m = (id, userId, title, permission, termStart, termEnd, status, orgId) => {
      const u = MN.DEMO_USERS.find((x) => x.id === userId);
      return { id, orgId: orgId || org, userId, name: u.name, email: u.email, title, permission, termStart, termEnd, status: status || 'active', joinedAt: ts(-60) };
    };
    const members = [
      m('m_maya', 'u_maya', 'President', 'admin', '2026-01-10', '2026-12-15'),
      m('m_jordan', 'u_jordan', 'Treasurer', 'officer', '2026-08-15', '2027-05-15'),
      m('m_aisha', 'u_aisha', 'Secretary', 'officer', '2026-08-15', '2027-05-15'),
      m('m_carlos', 'u_carlos', 'Events Chair', 'officer', '2026-08-15', '2026-12-15'),
      m('m_david', 'u_david', 'President-elect', 'incoming', '2027-01-10', '2027-12-15'),
      m('m_priya', 'u_priya', 'Treasurer (former)', 'officer', '2026-01-10', '2026-08-14', 'former'),
      m('m_maya_wic', 'u_maya', 'Founding member', 'admin', '2026-11-01', '2027-05-15', 'active', org2)
    ];

    const meetings = [
      {
        id: 'mt_exec', orgId: org, kind: 'meeting', title: 'Executive board meeting', date: D(-9), time: '18:00', timezone: tz,
        location: 'Engineering Hall, Room 204', status: 'scheduled',
        agenda: [{ id: 'ag1', text: 'Fall budget check-in' }, { id: 'ag2', text: 'Spring kickoff planning' }, { id: 'ag3', text: 'Officer transition timeline' }],
        notes: 'Budget is on track; $420 remains for the term.\nSpring kickoff will be the second week of classes — room request needed.\nMaya will start her President handoff this month; David shadows the December meetings.',
        attendeeIds: ['m_maya', 'm_jordan', 'm_aisha', 'm_carlos'], createdBy: 'm_maya', createdAt: ts(-14), updatedAt: ts(-9, '20:00')
      },
      {
        id: 'mt_gbm', orgId: org, kind: 'meeting', title: 'General body meeting', date: D(4), time: '18:30', timezone: tz,
        location: 'Student Center, Room 314', status: 'scheduled',
        agenda: [{ id: 'ag4', text: 'Welcome and build-night recap' }, { id: 'ag5', text: 'Introduce President-elect David Kim' }, { id: 'ag6', text: 'Spring competition sign-ups' }],
        notes: 'Bring the sign-up sheet and the spare controller kits.',
        attendeeIds: ['m_maya', 'm_jordan', 'm_aisha', 'm_carlos', 'm_david'], createdBy: 'm_aisha', createdAt: ts(-6), updatedAt: ts(-6)
      },
      {
        id: 'mt_transition', orgId: org, kind: 'meeting', title: 'Officer transition meeting', date: D(11), time: '17:00', timezone: tz,
        location: 'Library, Group Study Room 3', status: 'scheduled',
        agenda: [{ id: 'ag7', text: 'Walk through the President handoff' }, { id: 'ag8', text: 'Transfer Discord ownership' }],
        notes: '',
        attendeeIds: ['m_maya', 'm_david', 'm_jordan'], createdBy: 'm_maya', createdAt: ts(-3), updatedAt: ts(-3)
      }
    ];

    const tasks = [
      { id: 't_vendor', orgId: org, title: 'Confirm T-shirt vendor delivery date', description: 'Order of 60 shirts. Ask the vendor to deliver to the club mailbox.', assigneeId: 'm_jordan', dueDate: D(3), status: 'in_progress', meetingId: 'mt_exec', handoffId: null, createdBy: 'm_maya', createdAt: ts(-9, '19:00'), updatedAt: ts(-2) },
      { id: 't_room', orgId: org, title: 'Submit room request for spring kickoff', description: 'Event rooms need 14 business days of lead time.', assigneeId: 'm_carlos', dueDate: D(6), status: 'todo', meetingId: 'mt_exec', handoffId: null, createdBy: 'm_maya', createdAt: ts(-9, '19:00'), updatedAt: ts(-9, '19:00') },
      { id: 't_roster', orgId: org, title: 'Update the campus org roster with the President-elect', description: '', assigneeId: 'm_maya', dueDate: D(8), status: 'todo', meetingId: 'mt_exec', handoffId: 'h_pres', createdBy: 'm_maya', createdAt: ts(-9, '19:00'), updatedAt: ts(-9, '19:00') },
      { id: 't_agenda', orgId: org, title: 'Draft agenda for the transition meeting', description: '', assigneeId: 'm_maya', dueDate: D(9), status: 'todo', meetingId: 'mt_transition', handoffId: null, createdBy: 'm_maya', createdAt: ts(-3), updatedAt: ts(-3) },
      { id: 't_bylaws', orgId: org, title: 'Share the bylaws folder with David', description: '', assigneeId: 'm_maya', dueDate: D(-2), status: 'done', meetingId: null, handoffId: 'h_pres', createdBy: 'm_maya', createdAt: ts(-8), updatedAt: ts(-2), completedAt: ts(-2) },
      { id: 't_budget', orgId: org, title: 'Prepare the spring budget request', description: 'Itemized quotes for two competition kits.', assigneeId: 'm_jordan', dueDate: D(14), status: 'todo', meetingId: null, handoffId: null, createdBy: 'm_jordan', createdAt: ts(-5), updatedAt: ts(-5) },
      { id: 't_intro', orgId: org, title: 'Read last year\'s competition rules summary', description: '', assigneeId: 'm_david', dueDate: D(10), status: 'todo', meetingId: null, handoffId: null, createdBy: 'm_maya', createdAt: ts(-4), updatedAt: ts(-4) }
    ];

    const presAnswers = MN.blankAnswers();
    Object.assign(presAnswers, {
      q_mission: { status: 'answered', text: 'Lead the five-person board, keep the society registered and in good standing, and represent us to our faculty advisor and the engineering student council.' },
      q_duties_routine: { status: 'answered', text: 'Mondays 6 PM: board meeting (agenda posted Sunday night).\nEvery other Thursday: general body meeting.\nMonthly: budget check-in with the Treasurer.' },
      q_campus_relations: { status: 'answered', text: 'Faculty advisor (Mechanical Engineering) — meets twice a semester.\nStudent organizations office — roster and registration questions.' },
      q_mavorgs_transfer: { status: 'answered', text: 'Org platform → Roster → Manage roster. Add David with the President position, then set him as primary contact. Remove my officer position after the transition meeting.' },
      q_comms_channels: { status: 'followup', text: 'Discord ownership transfer planned for the transition meeting; confirm David has two-factor turned on first.' },
      q_reregistration: { status: 'unknown', text: 'I did not handle registration this year — check with the student organizations office.' },
      q_bank_signees: { status: 'na', text: '' },
      q_pitfalls_lessons: { status: 'answered', text: 'Avoid midterm weeks for build nights. Test the projector an hour before general meetings — it failed twice this fall.' }
    });

    const treasAnswers = MN.blankAnswers();
    Object.assign(treasAnswers, {
      q_mission: { status: 'answered', text: 'Track the budget, approve reimbursements, and report balances at every board meeting.' },
      q_duties_routine: { status: 'answered', text: 'Weekly: reconcile receipts. Monthly: budget report to the board.' },
      q_campus_relations: { status: 'answered', text: 'Student organizations finance desk for funding questions.' },
      q_success_tips: { status: 'answered', text: 'Keep a running spreadsheet and file receipts the same day.' },
      q_mavorgs_transfer: { status: 'answered', text: 'President updates the roster; Treasurer position is assigned in the platform.' },
      q_drive_storage: { status: 'answered', text: 'Finance folder in the shared drive; ownership transferred to the new Treasurer.' },
      q_comms_channels: { status: 'na', text: '' },
      q_social_email: { status: 'na', text: '' },
      q_reregistration: { status: 'answered', text: 'Handled by the President.' },
      q_activity_fairs: { status: 'na', text: '' },
      q_room_reservations: { status: 'na', text: '' },
      q_elections_transitions: { status: 'answered', text: 'Treasurer election in late spring; transition meeting in August.' },
      q_sg_funding: { status: 'answered', text: 'Fall funding window opens in September. Submit itemized quotes.' },
      q_bank_signees: { status: 'answered', text: 'Both treasurers visit the bank branch with IDs and the meeting minutes naming the new Treasurer.' },
      q_reimbursements: { status: 'answered', text: 'Receipts within 14 days via the reimbursement form; Treasurer approves within 5 business days.' },
      q_vendor_invoices: { status: 'answered', text: 'Get an itemized quote and W-9 before ordering.' },
      q_signature_events: { status: 'answered', text: 'Spring build night stayed under budget by buying parts in bulk.' },
      q_pitfalls_lessons: { status: 'answered', text: 'Late receipts made the March report wrong. Set a firm deadline.' },
      q_venues_logistics: { status: 'na', text: '' },
      q_attendance_promo: { status: 'na', text: '' },
      q_pending_contracts: { status: 'answered', text: 'None outstanding at handoff.' },
      q_university_inquiries: { status: 'unknown', text: 'Not sure whether the spring funding request was closed out.' },
      q_ongoing_initiatives: { status: 'answered', text: 'Moving the budget spreadsheet to the shared drive template.' },
      q_immediate_next_steps: { status: 'answered', text: '1. Visit the bank to update signers. 2. Review the budget spreadsheet. 3. Submit fall funding request.' }
    });

    const handoffs = [
      {
        id: 'h_pres', orgId: org, role: 'President', outgoingMemberId: 'm_maya', incomingMemberId: 'm_david',
        outgoingTerm: 'Fall 2026', incomingTerm: 'Spring 2027', answers: presAnswers,
        includes: { taskIds: ['t_roster'], meetingIds: ['mt_exec'] },
        createdBy: 'm_maya', createdAt: ts(-7), updatedAt: ts(-1, '21:10'), lastSavedAt: ts(-1, '21:10')
      },
      {
        id: 'h_treas', orgId: org, role: 'Treasurer', outgoingMemberId: 'm_priya', incomingMemberId: 'm_jordan',
        outgoingTerm: 'Spring 2026', incomingTerm: 'Fall 2026', answers: treasAnswers,
        includes: { taskIds: [], meetingIds: [] },
        createdBy: 'm_priya', createdAt: ts(-120), updatedAt: ts(-100), lastSavedAt: ts(-100)
      }
    ];

    const treasSnapshot = {
      role: 'Treasurer', orgName: orgs[0].name, outgoingName: 'Priya Shah', incomingName: 'Jordan Smith',
      outgoingTerm: 'Spring 2026', incomingTerm: 'Fall 2026', answers: MN.clone(treasAnswers), included: { tasks: [], meetings: [] }
    };
    const handoffVersions = [
      { id: 'hv_treas_1', orgId: org, handoffId: 'h_treas', version: 1, submittedAt: ts(-100), submittedBy: 'm_priya', snapshot: treasSnapshot }
    ];
    const handoffReviews = [
      { id: 'hr_treas_1', orgId: org, handoffId: 'h_treas', version: 1, type: 'acknowledged', by: 'm_jordan', at: ts(-98), message: 'Received. I will schedule the bank visit.' }
    ];

    const activity = [
      { id: 'a1', orgId: org, at: ts(-1, '21:10'), actorId: 'm_maya', type: 'handoff.saved', text: 'saved the President handoff draft', ref: { kind: 'handoff', id: 'h_pres' } },
      { id: 'a2', orgId: org, at: ts(-2), actorId: 'm_maya', type: 'task.done', text: 'completed "Share the bylaws folder with David"', ref: { kind: 'task', id: 't_bylaws' } },
      { id: 'a3', orgId: org, at: ts(-2, '10:00'), actorId: 'm_jordan', type: 'task.status', text: 'started "Confirm T-shirt vendor delivery date"', ref: { kind: 'task', id: 't_vendor' } },
      { id: 'a4', orgId: org, at: ts(-3), actorId: 'm_maya', type: 'meeting.created', text: 'scheduled "Officer transition meeting"', ref: { kind: 'meeting', id: 'mt_transition' } },
      { id: 'a5', orgId: org, at: ts(-6), actorId: 'm_aisha', type: 'meeting.created', text: 'scheduled "General body meeting"', ref: { kind: 'meeting', id: 'mt_gbm' } }
    ];

    return {
      schemaVersion: 1, mode: 'demo', seededOn: T,
      users: MN.clone(MN.DEMO_USERS),
      orgs, members, meetings, tasks, handoffs, handoffVersions, handoffReviews, activity, invitations: []
    };
  };
})();
