/* MavNext — the six handoff sections (core feature).
   Question ids are unchanged from v1 so earlier drafts migrate without loss. */
(function () {
  'use strict';
  const MN = (window.MN = window.MN || {});

  MN.SECTIONS = [
    {
      id: 'responsibilities', n: 1, title: 'Responsibilities',
      intro: 'What this role does week to week, and who the next officer works with.',
      questions: [
        { id: 'q_mission', required: true, title: 'Role purpose', help: 'In two or three sentences, what is this role responsible for?', example: 'Runs board meetings, keeps the org registered, and represents us to the advisor.' },
        { id: 'q_duties_routine', title: 'Weekly and monthly routines', help: 'Standing meetings, recurring reports, and routine admin work.', example: 'Mondays 6 PM: board sync. Monthly: budget check-in with the treasurer.' },
        { id: 'q_campus_relations', title: 'Key contacts and offices', help: 'Offices, advisors, or partners to stay in touch with. List roles or offices, not private phone numbers.', example: 'Faculty advisor (meets twice a semester); student organizations office for roster questions.' },
        { id: 'q_success_tips', title: 'Tips for doing this role well', help: 'Habits or practices that made the work easier.', example: 'Book rooms three weeks early. Post reminders 48 hours before meetings.' }
      ]
    },
    {
      id: 'access', n: 2, title: 'Account access procedures',
      intro: 'Describe how access is transferred. Never enter passwords, recovery codes, or account numbers here.',
      privacy: true,
      questions: [
        { id: 'q_mavorgs_transfer', required: true, title: 'Campus organization platform', help: 'Steps to update the roster, primary contact, and admin roles on your campus org platform.', example: 'Roster → Manage → assign the new officer, then set them as primary contact.' },
        { id: 'q_drive_storage', title: 'Shared files and drives', help: 'Where shared documents live and how ownership is transferred.', example: 'Shared drive "Club Docs" — transfer folder ownership to the new officer\'s school email.' },
        { id: 'q_comms_channels', title: 'Chat and communication channels', help: 'How admin or owner roles move on Discord, GroupMe, Slack, or Teams.', example: 'Discord: Server Settings → Members → Transfer Ownership during the transition meeting.' },
        { id: 'q_social_email', title: 'Social media and shared email', help: 'The procedure for handing over social accounts or a shared inbox. Procedure only — no credentials.', example: 'Add the new officer as admin in Meta Business Suite, then remove the outgoing officer.' }
      ]
    },
    {
      id: 'deadlines', n: 3, title: 'Recurring deadlines',
      intro: 'Dates that come back every term or year.',
      questions: [
        { id: 'q_reregistration', required: true, title: 'Annual registration', help: 'When re-registration happens and what it requires.', example: 'Opens late spring, closes early September; officer training required.' },
        { id: 'q_activity_fairs', title: 'Involvement fairs', help: 'When fairs happen and how to get a table.', example: 'Fall fair sign-up opens in July. Bring the banner and sign-up QR code.' },
        { id: 'q_room_reservations', title: 'Room and space booking lead times', help: 'How far ahead to book and where.', example: 'Event rooms: 14 business days ahead. Classrooms: 7.' },
        { id: 'q_elections_transitions', title: 'Elections and transition timeline', help: 'Nominations, elections, and transition meetings.', example: 'Nominations in March, elections first week of April, transition meeting late April.' }
      ]
    },
    {
      id: 'funding', n: 4, title: 'Funding procedures',
      intro: 'How money moves in your organization, as you have experienced it. Do not enter account numbers.',
      questions: [
        { id: 'q_sg_funding', title: 'Applying for funding', help: 'How your org requests allocations and what to keep on file.', example: 'Submit the budget request during the fall window with itemized quotes.' },
        { id: 'q_bank_signees', title: 'Changing authorized signers', help: 'How signers on an org account are updated, if your org has one.', example: 'Both treasurers visit the bank together with IDs and meeting minutes.' },
        { id: 'q_reimbursements', required: true, title: 'Reimbursements', help: 'How members are reimbursed for approved expenses.', example: 'Submit receipts within 14 days through the internal form; treasurer approves.' },
        { id: 'q_vendor_invoices', title: 'Vendors and invoices', help: 'How outside vendors are paid and what paperwork is needed.', example: 'Get an itemized quote and W-9 before ordering.' }
      ]
    },
    {
      id: 'lessons', n: 5, title: 'Lessons learned',
      intro: 'What worked, what did not, and what you would do differently.',
      questions: [
        { id: 'q_signature_events', title: 'What worked well', help: 'Events or practices that succeeded, and why.', example: 'October build night: food at 7 PM kept people until the end.' },
        { id: 'q_pitfalls_lessons', required: true, title: 'What to avoid or change', help: 'What did not go as planned and what to adjust.', example: 'Avoid midterm weeks. Test room AV an hour before doors open.' },
        { id: 'q_venues_logistics', title: 'Venues and setup', help: 'Rooms and setups that worked best.', example: 'Round tables of six for workshops; atrium for showcases.' },
        { id: 'q_attendance_promo', title: 'Promotion that drove attendance', help: 'Channels and timing that brought people in.', example: 'Instagram post five days ahead plus a Discord reminder the day before.' }
      ]
    },
    {
      id: 'commitments', n: 6, title: 'Open commitments',
      intro: 'Anything in progress the next officer must pick up.',
      questions: [
        { id: 'q_pending_contracts', title: 'Pending orders and invoices', help: 'Active orders, unpaid invoices, or expected deliveries.', example: 'T-shirt order ($850) arriving mid-January to the club mailbox.' },
        { id: 'q_university_inquiries', title: 'Pending approvals and requests', help: 'Room requests, signatures, or questions awaiting a response.', example: 'Spring kickoff room request submitted; awaiting approval.' },
        { id: 'q_ongoing_initiatives', title: 'Projects in progress', help: 'Multi-term projects or partnerships that need an owner.', example: 'Joint workshop with another chapter — outline in the shared drive.' },
        { id: 'q_immediate_next_steps', required: true, title: 'First steps for the next officer', help: 'The most urgent things to do in the first two weeks.', example: '1. Update the roster. 2. Meet the advisor. 3. Confirm the vendor delivery.' }
      ]
    }
  ];

  MN.ALL_QUESTIONS = MN.SECTIONS.flatMap((s) => s.questions.map((q) => Object.assign({ sectionId: s.id }, q)));
  MN.CHAR_LIMIT = 2000;

  MN.ANSWER_MARKS = {
    unknown: { label: 'Unknown', doc: 'Marked unknown — research needed', badge: 'b-amber' },
    na: { label: 'Not applicable', doc: 'Not applicable to this role', badge: 'b-gray' },
    followup: { label: 'Needs follow-up', doc: 'Needs follow-up', badge: 'b-purple' }
  };

  MN.blankAnswers = () => {
    const a = {};
    MN.ALL_QUESTIONS.forEach((q) => { a[q.id] = { text: '', status: 'answered' }; });
    return a;
  };

  /** A question is "addressed" when it has text or an explicit mark. */
  MN.isAddressed = (ans) => !!ans && (ans.status !== 'answered' || (ans.text || '').trim().length > 0);

  MN.sectionProgress = (answers, section) => {
    const total = section.questions.length;
    const done = section.questions.filter((q) => MN.isAddressed(answers[q.id])).length;
    return { done, total, state: done === 0 ? 'empty' : done === total ? 'done' : 'partial' };
  };

  MN.handoffProgress = (answers) => {
    const total = MN.ALL_QUESTIONS.length;
    const done = MN.ALL_QUESTIONS.filter((q) => MN.isAddressed(answers[q.id])).length;
    const sectionsDone = MN.SECTIONS.filter((s) => MN.sectionProgress(answers, s).state === 'done').length;
    return { done, total, pct: Math.round((done / total) * 100), sectionsDone };
  };

  /** Pre-submission analysis used by review page, snapshot, and print. */
  MN.analyzeAnswers = (answers) => {
    const out = { missingRequired: [], blank: [], unknown: [], na: [], followup: [] };
    MN.ALL_QUESTIONS.forEach((q) => {
      const a = answers[q.id] || { text: '', status: 'answered' };
      if (a.status === 'answered' && !(a.text || '').trim()) {
        (q.required ? out.missingRequired : out.blank).push(q);
      } else if (a.status !== 'answered') out[a.status].push(q);
    });
    return out;
  };
})();
