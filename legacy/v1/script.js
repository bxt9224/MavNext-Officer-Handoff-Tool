/**
 * MavNext — Officer Handoff for Student Organizations
 * Pure Vanilla JavaScript, zero dependencies, browser-only persistence.
 * All answers stay in localStorage. Nothing is transmitted.
 */

(function () {
  'use strict';

  // --- Constants & Storage Namespace ---
  const STORAGE_KEY = 'uta_officer_handoff_data';
  const CHAR_LIMIT = 1200;
  const CHAR_WARN = 1000;

  // --- Questionnaire Definitions (All 6 Standard Sections) ---
  const QUESTIONNAIRE_SECTIONS = [
    {
      id: 1,
      title: 'Responsibilities',
      shortTitle: 'Responsibilities',
      heading: 'Core Responsibilities & Recurring Routines',
      description: 'Define your role mission, core officer duties, weekly/monthly routines, key campus relationships, and expectations.',
      questions: [
        {
          id: 'q_mission',
          title: 'Role Mission & Core Purpose',
          help: 'What is the primary objective of this role? What should the incoming officer strive to accomplish?',
          placeholder: 'e.g., Lead executive meetings, maintain organizational alignment with university student life standards, and represent our student chapter at campus fairs.'
        },
        {
          id: 'q_duties_routine',
          title: 'Weekly & Monthly Routines',
          help: 'Describe recurring operational duties, standing meetings, officer syncs, and routine administration.',
          placeholder: 'e.g., Every Monday at 6 PM: Chair Executive Board sync. Monthly: Review budget with Treasurer and submit monthly event updates on MavOrgs.'
        },
        {
          id: 'q_campus_relations',
          title: 'Key Campus Relationships & Advisor Contact',
          help: 'Which campus advisors, department staff, or campus partners should the incoming officer stay in contact with? List roles or offices, not private phone numbers.',
          placeholder: 'e.g., Faculty Advisor (Engineering dept) — quarterly meetings. Student Organizations office in University Center Suite B120 assists with MavOrgs rosters.'
        },
        {
          id: 'q_success_tips',
          title: 'Officer Success Tips & Recommendations',
          help: 'What habits, communication practices, or practical tips helped you navigate this position effectively?',
          placeholder: 'e.g., Book campus rooms at least 3 weeks early. Keep Discord announcements concise and post reminder polls 48 hours before meetings.'
        }
      ]
    },
    {
      id: 2,
      title: 'Account Access',
      shortTitle: 'Account Access',
      heading: 'Account Access Transfer Steps',
      description: 'Document approved procedural steps to transfer administrative ownership. Procedural steps only — never record passwords or credentials.',
      questions: [
        {
          id: 'q_mavorgs_transfer',
          title: 'MavOrgs Organization Management Transfer',
          help: 'Describe how to update the primary contact, officer roster, and admin permissions on MavOrgs.',
          placeholder: 'e.g., Log into MavOrgs > Organization Roster > Manage Roster. Search incoming officer by NetID, assign Executive Role, then set as Primary Contact.'
        },
        {
          id: 'q_drive_storage',
          title: 'Cloud Storage & Document Repository Transfer',
          help: 'Where are shared documents kept, and what steps transfer folder ownership?',
          placeholder: 'e.g., Shared Google Drive with bylaws, branding, and flyers. Outgoing officer transfers root folder ownership to the incoming officer\'s university email address.'
        },
        {
          id: 'q_comms_channels',
          title: 'Communication Channels (Discord, Slack, GroupMe, Teams)',
          help: 'What is the approved procedure for transferring server ownership or workspace admin roles?',
          placeholder: 'e.g., Discord: Server Settings > Members > Select incoming officer > Transfer Ownership. Keep outgoing officers in an Alumni role.'
        },
        {
          id: 'q_social_email',
          title: 'Social Media Accounts & Official Email Transition',
          help: 'How are Instagram, LinkedIn, or the student org email safely handed off? Describe the procedural steps — no credentials here.',
          placeholder: 'e.g., Instagram: Update two-factor phone number to incoming officer during the transition meeting. Add incoming officer as Super Admin in Meta Business Suite.'
        }
      ]
    },
    {
      id: 3,
      title: 'Recurring Deadlines',
      shortTitle: 'Deadlines',
      heading: 'Recurring Deadlines & Semester Milestones',
      description: 'Identify critical calendar dates: student org re-registration, activity fairs, room booking cutoffs, and election timelines.',
      questions: [
        {
          id: 'q_reregistration',
          title: 'Annual Student Org Re-Registration Timeline',
          help: 'When does annual registration take place, and what officer training or roster requirements must be completed?',
          placeholder: 'e.g., Annual re-registration window typically opens in late spring and closes in early September on MavOrgs. Mandatory officer orientation modules must be completed.'
        },
        {
          id: 'q_activity_fairs',
          title: 'Activity Fairs & Involvement Fair Participation',
          help: 'When are student involvement fairs held each semester, and how is a table secured?',
          placeholder: 'e.g., Fall Involvement Fair registration opens in July on MavOrgs. Spring fair signup is in the first week of January. Bring a banner and QR sign-in sheet.'
        },
        {
          id: 'q_room_reservations',
          title: 'Campus Space & Room Reservation Cutoffs',
          help: 'What are the required lead times and booking procedures for campus spaces?',
          placeholder: 'e.g., UC conference rooms require reservations at least 14 business days in advance via MavOrgs Space Reservation. General classrooms require 7 business days.'
        },
        {
          id: 'q_elections_transitions',
          title: 'Elections & Leadership Transition Timeline',
          help: 'When are nominations opened, elections conducted, and final transition meetings held?',
          placeholder: 'e.g., Nominations open in March; elections in the first week of April. Joint transition meetings between outgoing and incoming teams occur in late April.'
        }
      ]
    },
    {
      id: 4,
      title: 'Funding Procedures',
      shortTitle: 'Funding',
      heading: 'Funding Procedures & Financial Workflows',
      description: 'Explain how your organization handles Student Government funding, bank account transitions, reimbursements, and invoices. Free-text explanation based on observed experience — do not assume UTA policies.',
      questions: [
        {
          id: 'q_sg_funding',
          title: 'Student Government (SG) Funding & Activity Fee Guidelines',
          help: 'How does your group apply for and manage allocations from Student Government or university funding committees?',
          placeholder: 'e.g., Submit Student Government budget requests via MavOrgs funding portal during the designated budget application window. Keep itemized quotes for all equipment requests.'
        },
        {
          id: 'q_bank_signees',
          title: 'Bank Account Signee Transition Workflow',
          help: 'What is the procedure for updating authorized signers on the organization bank account, if applicable?',
          placeholder: 'e.g., Schedule an in-person appointment at the bank. Both outgoing and incoming President and Treasurer must bring student IDs and updated officer meeting minutes.'
        },
        {
          id: 'q_reimbursements',
          title: 'Reimbursement & Payment Process',
          help: 'What is the internal process for requesting reimbursement for authorized event expenses?',
          placeholder: 'e.g., Submit itemized receipts via our internal form within 14 days of purchase. The Treasurer verifies budget availability and issues reimbursement within 5 business days.'
        },
        {
          id: 'q_vendor_invoices',
          title: 'Invoicing & Vendor Purchase Guidelines',
          help: 'How are outside vendors invoiced and paid? What documentation is required?',
          placeholder: 'e.g., Request a W-9 and itemized estimate from vendors before placing orders. Ensure all campus catering complies with university food policy.'
        }
      ]
    },
    {
      id: 5,
      title: 'Event Lessons',
      shortTitle: 'Lessons',
      heading: 'Event Lessons & Campus Logistics',
      description: 'Document lessons learned from signature events: what worked, common pitfalls, preferred campus venues, catering tips, and promotion.',
      questions: [
        {
          id: 'q_signature_events',
          title: 'Major Signature Events & Successful Practices',
          help: 'Which events were most successful this year, and what key factors made them work well?',
          placeholder: 'e.g., Annual Tech Hackathon in October drew 120 attendees. Sponsor workshops in the afternoon and food at 7 PM kept retention high.'
        },
        {
          id: 'q_pitfalls_lessons',
          title: 'Common Pitfalls & Lessons Learned',
          help: 'What did not go as expected? What adjustments should the incoming officer make?',
          placeholder: 'e.g., Avoid scheduling major events during midterm weeks. University Center AV equipment must be tested with staff at least 1 hour before doors open.'
        },
        {
          id: 'q_venues_logistics',
          title: 'Recommended Campus Venues & Setup Logistics',
          help: 'Which campus locations, room configurations, and AV setups worked best for your activities?',
          placeholder: 'e.g., UC Rio Grande Room is great for interactive workshops (round tables of 6). Nedderman Hall atrium works well for casual showcases.'
        },
        {
          id: 'q_attendance_promo',
          title: 'Attendance Promotion & Marketing Channels',
          help: 'Which promotional strategies produced the highest student turnout?',
          placeholder: 'e.g., Instagram carousel posts 5 days in advance + Discord announcements + physical flyers in SEIR and Nedderman bulletin boards.'
        }
      ]
    },
    {
      id: 6,
      title: 'Unfinished Commitments',
      shortTitle: 'Commitments',
      heading: 'Open Commitments & Immediate Next Steps',
      description: 'Flag unresolved business, pending vendor orders, active university inquiries, and immediate action items for the incoming officer.',
      questions: [
        {
          id: 'q_pending_contracts',
          title: 'Pending Vendor Orders & Open Invoices',
          help: 'Are there active vendor orders, unfulfilled contracts, or outstanding balances?',
          placeholder: 'e.g., Pending invoice for 100 club t-shirts with a vendor ($850) — delivery expected mid-August to the Student Org mailroom.'
        },
        {
          id: 'q_university_inquiries',
          title: 'Active Campus Inquiries & University Approvals',
          help: 'Are there open room reservations, pending advisor signatures, or administrative questions awaiting a response?',
          placeholder: 'e.g., Submitted room reservation for Fall Kickoff in UC Bluebonnet Ballroom — awaiting final approval from Student Event Services.'
        },
        {
          id: 'q_ongoing_initiatives',
          title: 'Incomplete Projects & Multi-Semester Initiatives',
          help: 'What projects or partnerships are mid-stream and need continued leadership?',
          placeholder: 'e.g., In discussion with another student chapter for a joint workshop in November. Draft outline is in Google Drive / Partnerships folder.'
        },
        {
          id: 'q_immediate_next_steps',
          title: 'Top 3 Immediate Next Steps (First 14 Days)',
          help: 'What are the 3 most urgent tasks the incoming officer should handle right away?',
          placeholder: 'e.g., 1. Complete MavOrgs primary contact transfer. 2. Schedule intro meeting with Faculty Advisor. 3. Confirm pending vendor delivery with Treasurer.'
        }
      ]
    }
  ];

  // --- Initial Blank State Schema ---
  const defaultState = {
    meta: {
      orgName: '',
      officerRole: '',
      officerRoleOther: '',
      outgoingOfficer: '',
      incomingOfficer: '',
      lastReviewedDate: new Date().toISOString().split('T')[0]
    },
    answers: {}
  };

  QUESTIONNAIRE_SECTIONS.forEach(sec => {
    sec.questions.forEach(q => {
      defaultState.answers[q.id] = {
        text: '',
        status: 'standard'
      };
    });
  });

  // Current Application State
  let appState = JSON.parse(JSON.stringify(defaultState));
  let currentScreen = 'welcome';
  let saveTimeout = null;
  let hasSavedDraft = false;

  // --- Synthetic Demonstration Data (Fictional UTA Student Org) ---
  const SYNTHETIC_DEMO_DATA = {
    meta: {
      orgName: 'UTA Maverick Robotics Society',
      officerRole: 'President',
      officerRoleOther: '',
      outgoingOfficer: 'Maya Lin (Outgoing President)',
      incomingOfficer: 'David Kim (Incoming President)',
      lastReviewedDate: new Date().toISOString().split('T')[0]
    },
    answers: {
      q_mission: {
        text: 'Lead the executive board of 6 officers, represent the Maverick Robotics Society in the College of Engineering Student Council, and coordinate competitive robotics teams for regional university challenges.',
        status: 'standard'
      },
      q_duties_routine: {
        text: 'Weekly: Host executive board sync every Tuesday at 6:00 PM in NH 100. Monthly: Send general body newsletter via MavOrgs email tool and reconcile treasury balance with treasurer before the 25th.',
        status: 'standard'
      },
      q_campus_relations: {
        text: 'Faculty Advisor: Mechanical & Aerospace Engineering department — quarterly meetings. Key contact for lab access: Engineering Lab Coordinator in Woolf Hall. Student Org office (UC Suite B120) for MavOrgs roster changes.',
        status: 'standard'
      },
      q_success_tips: {
        text: 'Submit room reservations at least 3 weeks before major workshop dates. Delegate team leads for sub-projects early so the president can focus on sponsorship and university compliance.',
        status: 'standard'
      },
      q_mavorgs_transfer: {
        text: 'Log into MavOrgs > Navigate to Maverick Robotics Society page > Manage Organization > Roster. Find David Kim, click pencil icon to edit membership status to President, and select Set as Primary Contact.',
        status: 'standard'
      },
      q_drive_storage: {
        text: 'Shared Google Drive contains all CAD files, constitution, sponsorship brochures, and past competition docs. Outgoing president transfers primary ownership of root folder to incoming president\'s netid@mavs.uta.edu address.',
        status: 'standard'
      },
      q_comms_channels: {
        text: 'Discord Server (850 members): Transfer server ownership via Server Settings > Members > David Kim > Transfer Ownership. Keep outgoing seniors in an "Alumni / Veteran Member" role to preserve chat history.',
        status: 'standard'
      },
      q_social_email: {
        text: 'Instagram (@utamavrobotics): Update 2FA recovery phone to the incoming president during transition meeting. LinkedIn Organization page: Add incoming president as Super Admin under Page Settings.',
        status: 'standard'
      },
      q_reregistration: {
        text: 'Annual re-registration on MavOrgs takes place in late April through August. President and Treasurer must complete online compliance training modules and upload updated constitution.',
        status: 'standard'
      },
      q_activity_fairs: {
        text: 'Fall Activity Fair: Register via MavOrgs form by late July. Spring Activity Fair: Register by January 10th. Set up an interactive robot driving station at the table to attract recruits.',
        status: 'standard'
      },
      q_room_reservations: {
        text: 'Book classroom spaces for weekly meetings through MavOrgs Space Reservation at least 10 business days prior. University Center ballroom reservations require 21 business days.',
        status: 'standard'
      },
      q_elections_transitions: {
        text: 'Elections are held annually during the third week of April via MavOrgs anonymous voting ballot. Official joint transition meeting is held during the first week of May.',
        status: 'standard'
      },
      q_sg_funding: {
        text: 'Apply for Student Government annual allocation in February. For travel and competition funding, submit supplemental funding requests at least 30 days prior to the travel date with itemized quotes.',
        status: 'standard'
      },
      q_bank_signees: {
        text: 'Off-campus org checking account requires outgoing and incoming President & Treasurer to visit the branch in-person with signed meeting minutes and UTA NetID cards to update authorized signers.',
        status: 'standard'
      },
      q_reimbursements: {
        text: 'Officers or project leads submit itemized receipts and purchase verification through our internal expense form within 14 days of purchase. Treasurer issues reimbursement check.',
        status: 'standard'
      },
      q_vendor_invoices: {
        text: 'For parts purchases above $500 (e.g., custom motor controllers), request official invoice with UTA tax-exempt certificate provided by the faculty advisor.',
        status: 'standard'
      },
      q_signature_events: {
        text: 'Maverick Combat Robotics Invitational (March): 140 participants. Live video stream to Discord and food truck parking outside Woolf Hall made this our highest engagement event of the year.',
        status: 'standard'
      },
      q_pitfalls_lessons: {
        text: 'Do not host weekend hackathons during spring break or midterms. Ensure all battery charging stations comply with campus safety rules and have fire-safe battery bags on hand.',
        status: 'standard'
      },
      q_venues_logistics: {
        text: 'Woolf Hall Room 104 is ideal for technical workshops (plenty of power outlets). University Center Bluebonnet Ballroom is best for public robot demonstrations.',
        status: 'standard'
      },
      q_attendance_promo: {
        text: 'Best attendance came from announcements in freshman intro to engineering classes during week 2, paired with video reels posted on Instagram and Discord.',
        status: 'standard'
      },
      q_pending_contracts: {
        text: 'Pending invoice with a PCB manufacturer (~$380) for summer competition circuit boards. Order placed — awaiting shipment confirmation and final receipt.',
        status: 'unresolved'
      },
      q_university_inquiries: {
        text: 'Awaiting response from Student Event Services regarding approval for outdoor canopy reservation on University Green for the Fall Kickoff event.',
        status: 'unresolved'
      },
      q_ongoing_initiatives: {
        text: 'Exploring partnership with UTA SAE Racing Team for a shared composite materials workshop in October. Draft outline is in Google Drive / Partnerships folder.',
        status: 'standard'
      },
      q_immediate_next_steps: {
        text: '1. Finalize MavOrgs primary contact transfer with Student Org office. 2. Meet with Faculty Advisor to confirm Fall lab hours. 3. Confirm PCB vendor delivery receipt with Treasurer.',
        status: 'unresolved'
      }
    }
  };

  // --- DOM Elements Cache ---
  const elements = {};

  function cacheDomElements() {
    elements.saveStatus = document.getElementById('save-status');
    elements.saveStatusText = document.getElementById('save-status-text');
    elements.saveDot = document.getElementById('save-dot');
    elements.stepperNav = document.getElementById('stepper-nav');
    elements.stepperProgressFill = document.getElementById('stepper-progress-fill');
    elements.stepperItems = document.querySelectorAll('.step-item');

    // Welcome Screen Controls
    elements.orgName = document.getElementById('org-name');
    elements.officerRole = document.getElementById('officer-role');
    elements.roleOtherContainer = document.getElementById('role-other-container');
    elements.officerRoleOther = document.getElementById('officer-role-other');
    elements.outgoingOfficer = document.getElementById('outgoing-officer');
    elements.incomingOfficer = document.getElementById('incoming-officer');
    elements.lastReviewedDate = document.getElementById('last-reviewed-date');
    elements.btnStartHandoff = document.getElementById('btn-start-handoff');
    elements.btnWelcomeSample = document.getElementById('btn-welcome-sample');
    elements.btnLoadSample = document.getElementById('btn-load-sample');
    elements.btnClearData = document.getElementById('btn-clear-data');
    elements.resumeBanner = document.getElementById('resume-banner');
    elements.btnResumeHandoff = document.getElementById('btn-resume-handoff');
    elements.btnStartFresh = document.getElementById('btn-start-fresh');
    elements.startActions = document.getElementById('start-actions');

    // Review Screen Controls
    elements.metricAnswered = document.getElementById('metric-answered-count');
    elements.metricUnresolved = document.getElementById('metric-unresolved-count');
    elements.metricUnknown = document.getElementById('metric-unknown-count');
    elements.metricNa = document.getElementById('metric-na-count');
    elements.metricMissing = document.getElementById('metric-missing-count');
    elements.reviewAccordion = document.getElementById('review-sections-accordion');
    elements.btnGenerateSummary = document.getElementById('btn-generate-summary');

    // Summary Screen Controls
    elements.btnSummaryToReview = document.getElementById('btn-summary-to-review');
    elements.btnSummaryToEdit = document.getElementById('btn-summary-to-edit');
    elements.btnPrintSummary = document.getElementById('btn-print-summary');
    elements.btnCopyMarkdown = document.getElementById('btn-copy-markdown');

    // Summary Document Fields
    elements.docDispOrgName = document.getElementById('doc-disp-org-name');
    elements.docDispRole = document.getElementById('doc-disp-role');
    elements.docDispOutgoing = document.getElementById('doc-disp-outgoing');
    elements.docDispIncoming = document.getElementById('doc-disp-incoming');
    elements.docDispDate = document.getElementById('doc-disp-date');
    elements.docDispStatusBadge = document.getElementById('doc-disp-status-badge');
    elements.docCalloutUnresolvedBox = document.getElementById('doc-callout-unresolved-box');
    elements.docUnresolvedList = document.getElementById('doc-unresolved-list');

    // Modal: Clear Data
    elements.modalClearConfirm = document.getElementById('modal-clear-confirm');
    elements.btnModalClearCancel = document.getElementById('btn-modal-clear-cancel');
    elements.btnModalClearConfirm = document.getElementById('btn-modal-clear-confirm');

    // Modal: Demo overwrite
    elements.modalDemoConfirm = document.getElementById('modal-demo-confirm');
    elements.btnModalDemoCancel = document.getElementById('btn-modal-demo-cancel');
    elements.btnModalDemoConfirm = document.getElementById('btn-modal-demo-confirm');

    // Toast & footer
    elements.toast = document.getElementById('toast');
    elements.footerRestart = document.getElementById('footer-restart-link');
  }

  // --- Dynamic Questionnaire Generation ---
  function renderQuestionnaireSections() {
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      const container = document.getElementById(`questions-section-${sec.id}`);
      if (!container) return;
      container.innerHTML = '';

      sec.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'question-item-card';
        card.id = `card-${q.id}`;

        card.innerHTML = `
          <div class="question-header">
            <div class="question-title-group">
              <h3 class="question-title">${idx + 1}. ${escapeHtml(q.title)}</h3>
              <p class="question-help">${escapeHtml(q.help)}</p>
            </div>
            <div id="badge-wrapper-${q.id}">
              <span class="status-badge badge-missing" id="badge-${q.id}">Blank</span>
            </div>
          </div>

          <div class="question-toolbar">
            <span class="toolbar-label">Response status:</span>
            <div class="status-button-group" role="group" aria-label="Status for ${escapeHtml(q.title)}">
              <button type="button" class="status-btn selected-standard" data-qid="${q.id}" data-status="standard" aria-pressed="true">
                Standard Response
              </button>
              <button type="button" class="status-btn" data-qid="${q.id}" data-status="unknown" aria-pressed="false">
                Mark as Unknown
              </button>
              <button type="button" class="status-btn" data-qid="${q.id}" data-status="na" aria-pressed="false">
                Not Applicable
              </button>
              <button type="button" class="status-btn" data-qid="${q.id}" data-status="unresolved" aria-pressed="false">
                Flag as Unresolved
              </button>
            </div>
          </div>

          <div class="question-input-wrapper">
            <textarea
              id="input-${q.id}"
              class="form-textarea question-textarea"
              placeholder="${escapeHtml(q.placeholder)}"
              aria-label="${escapeHtml(q.title)}"
              maxlength="${CHAR_LIMIT}"
              rows="4"></textarea>
            <div class="char-counter" id="counter-${q.id}" aria-live="polite">0 / ${CHAR_LIMIT}</div>
          </div>
        `;

        container.appendChild(card);

        // Status button listeners
        const statusButtons = card.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const qid = btn.getAttribute('data-qid');
            const newStatus = btn.getAttribute('data-status');
            setQuestionStatus(qid, newStatus);
            scheduleSave();
          });
        });

        // Textarea listener
        const textarea = card.querySelector(`#input-${q.id}`);
        textarea.addEventListener('input', () => {
          if (!appState.answers[q.id]) {
            appState.answers[q.id] = { text: '', status: 'standard' };
          }
          appState.answers[q.id].text = textarea.value;
          updateQuestionCardUI(q.id);
          scheduleSave();
        });
      });
    });
  }

  // --- Question UI & Status Handling ---
  function setQuestionStatus(qid, newStatus) {
    if (!appState.answers[qid]) {
      appState.answers[qid] = { text: '', status: 'standard' };
    }
    appState.answers[qid].status = newStatus;
    updateQuestionCardUI(qid);
  }

  function updateQuestionCardUI(qid) {
    const card = document.getElementById(`card-${qid}`);
    const textarea = document.getElementById(`input-${qid}`);
    const badge = document.getElementById(`badge-${qid}`);
    const counter = document.getElementById(`counter-${qid}`);
    if (!card || !textarea || !badge) return;

    const answerData = appState.answers[qid] || { text: '', status: 'standard' };
    const status = answerData.status || 'standard';
    const textVal = answerData.text || '';

    // Update character counter
    if (counter) {
      const len = textVal.length;
      counter.textContent = `${len} / ${CHAR_LIMIT}`;
      counter.className = 'char-counter';
      if (len >= CHAR_LIMIT) {
        counter.classList.add('at-limit');
      } else if (len >= CHAR_WARN) {
        counter.classList.add('near-limit');
      }
    }

    // Update status button active/pressed states
    const buttons = card.querySelectorAll('.status-btn');
    buttons.forEach(btn => {
      const bStatus = btn.getAttribute('data-status');
      btn.className = 'status-btn';
      const isSelected = bStatus === status;
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      if (isSelected) {
        btn.classList.add(`selected-${bStatus}`);
      }
    });

    // Reset card highlight classes
    card.classList.remove('is-unresolved', 'is-unknown', 'is-na');

    // Update badge and card styling
    if (status === 'unresolved') {
      card.classList.add('is-unresolved');
      badge.className = 'status-badge badge-unresolved';
      badge.textContent = 'Action Required';
    } else if (status === 'unknown') {
      card.classList.add('is-unknown');
      badge.className = 'status-badge badge-unknown';
      badge.textContent = 'Marked Unknown';
    } else if (status === 'na') {
      card.classList.add('is-na');
      badge.className = 'status-badge badge-na';
      badge.textContent = 'Not Applicable';
    } else {
      if (textVal.trim().length > 0) {
        badge.className = 'status-badge badge-answered';
        badge.textContent = 'Answered';
      } else {
        badge.className = 'status-badge badge-missing';
        badge.textContent = 'Blank';
      }
    }
  }

  function syncAllQuestionCardsFromState() {
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      sec.questions.forEach(q => {
        const textarea = document.getElementById(`input-${q.id}`);
        const data = appState.answers[q.id];
        if (textarea && data) {
          textarea.value = data.text || '';
        }
        updateQuestionCardUI(q.id);
      });
    });
  }

  // --- Meta Form Inputs Sync ---
  function syncMetaFormFromState() {
    if (elements.orgName) elements.orgName.value = appState.meta.orgName || '';
    if (elements.officerRole) {
      elements.officerRole.value = appState.meta.officerRole || '';
      handleRoleChange(appState.meta.officerRole);
    }
    if (elements.officerRoleOther) elements.officerRoleOther.value = appState.meta.officerRoleOther || '';
    if (elements.outgoingOfficer) elements.outgoingOfficer.value = appState.meta.outgoingOfficer || '';
    if (elements.incomingOfficer) elements.incomingOfficer.value = appState.meta.incomingOfficer || '';
    if (elements.lastReviewedDate) {
      elements.lastReviewedDate.value = appState.meta.lastReviewedDate || new Date().toISOString().split('T')[0];
    }
  }

  function handleRoleChange(selectedRole) {
    if (selectedRole === 'Other') {
      elements.roleOtherContainer.classList.remove('hidden');
      elements.officerRoleOther.setAttribute('required', 'required');
    } else {
      elements.roleOtherContainer.classList.add('hidden');
      elements.officerRoleOther.removeAttribute('required');
    }
  }

  function attachMetaListeners() {
    const handleMetaInput = () => {
      appState.meta.orgName = elements.orgName.value.trim();
      appState.meta.officerRole = elements.officerRole.value;
      appState.meta.officerRoleOther = elements.officerRoleOther.value.trim();
      appState.meta.outgoingOfficer = elements.outgoingOfficer.value.trim();
      appState.meta.incomingOfficer = elements.incomingOfficer.value.trim();
      appState.meta.lastReviewedDate = elements.lastReviewedDate.value;
      scheduleSave();
    };

    elements.orgName.addEventListener('input', handleMetaInput);
    elements.officerRole.addEventListener('change', (e) => {
      handleRoleChange(e.target.value);
      handleMetaInput();
    });
    elements.officerRoleOther.addEventListener('input', handleMetaInput);
    elements.outgoingOfficer.addEventListener('input', handleMetaInput);
    elements.incomingOfficer.addEventListener('input', handleMetaInput);
    elements.lastReviewedDate.addEventListener('change', handleMetaInput);
  }

  // --- Draft Detection ---
  function detectDraft() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      // A meaningful draft has at least org name or some answered text
      if (!parsed || !parsed.meta) return false;
      const hasOrgName = parsed.meta.orgName && parsed.meta.orgName.trim().length > 0;
      const hasAnswers = parsed.answers && Object.values(parsed.answers).some(a => a.text && a.text.trim().length > 0);
      return hasOrgName || hasAnswers;
    } catch (e) {
      return false;
    }
  }

  function updateResumeBanner() {
    hasSavedDraft = detectDraft();
    if (elements.resumeBanner) {
      if (hasSavedDraft) {
        elements.resumeBanner.classList.add('has-draft');
        // Hide the primary start actions below the form when resume is shown
      } else {
        elements.resumeBanner.classList.remove('has-draft');
      }
    }
  }

  // --- Local Storage Persistence ---
  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          if (parsed.meta) {
            appState.meta = Object.assign({}, defaultState.meta, parsed.meta);
          }
          if (parsed.answers) {
            QUESTIONNAIRE_SECTIONS.forEach(sec => {
              sec.questions.forEach(q => {
                if (parsed.answers[q.id]) {
                  appState.answers[q.id] = Object.assign({}, defaultState.answers[q.id], parsed.answers[q.id]);
                }
              });
            });
          }
          showToast('Loaded saved draft from this browser.');
        }
      }
    } catch (err) {
      console.warn('Could not read local draft:', err);
      showToast('Could not load your saved draft — it may have been corrupted. Starting fresh.');
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      indicateSaved(true);
      updateResumeBanner();
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
      indicateSaved(false);
    }
  }

  function scheduleSave() {
    if (elements.saveStatusText) {
      elements.saveStatusText.textContent = 'Saving…';
    }
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveToLocalStorage();
    }, 300);
  }

  function indicateSaved(success) {
    if (!elements.saveStatusText || !elements.saveDot) return;
    if (success) {
      elements.saveStatusText.textContent = 'Saved to browser';
      elements.saveDot.style.background = '#22C55E';
    } else {
      elements.saveStatusText.textContent = 'Save failed — storage may be full';
      elements.saveDot.style.background = '#DC2626';
    }
  }

  // --- Clear Answers Protocol ---
  function openClearModal() {
    elements.modalClearConfirm.classList.remove('hidden');
    // Focus on Cancel (safe default)
    elements.btnModalClearCancel.focus();
  }

  function closeClearModal() {
    elements.modalClearConfirm.classList.add('hidden');
  }

  function executeClearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
    appState = JSON.parse(JSON.stringify(defaultState));
    syncMetaFormFromState();
    syncAllQuestionCardsFromState();
    closeClearModal();
    updateResumeBanner();
    if (elements.saveStatusText) elements.saveStatusText.textContent = 'No draft yet';
    if (elements.saveDot) elements.saveDot.style.background = '#64748B';
    navigateToScreen('welcome');
    showToast('All answers have been cleared from this browser.');
  }

  // --- Demo Data Loading ---
  function loadSyntheticDemo() {
    appState = JSON.parse(JSON.stringify(SYNTHETIC_DEMO_DATA));
    syncMetaFormFromState();
    syncAllQuestionCardsFromState();
    saveToLocalStorage();
    showToast('Sample data loaded: UTA Maverick Robotics Society (fictional).');
    navigateToScreen('1');
  }

  function requestLoadDemo() {
    if (hasSavedDraft) {
      // Show overwrite confirmation
      elements.modalDemoConfirm.classList.remove('hidden');
      elements.btnModalDemoCancel.focus();
    } else {
      loadSyntheticDemo();
    }
  }

  // --- Navigation & Screen Management ---
  function navigateToScreen(targetScreen) {
    const screens = document.querySelectorAll('.app-screen');
    screens.forEach(screen => screen.classList.remove('active'));

    const activeScreenElem = document.getElementById(`screen-${targetScreen}`) || document.getElementById(`screen-section-${targetScreen}`);
    if (activeScreenElem) {
      activeScreenElem.classList.add('active');
    }

    currentScreen = targetScreen;
    updateStepperUI(targetScreen);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (targetScreen === 'review') {
      renderReviewScreen();
    } else if (targetScreen === 'summary') {
      renderSummaryScreen();
    }
  }

  function updateStepperUI(activeStep) {
    if (!elements.stepperNav) return;

    if (activeStep === 'welcome') {
      elements.stepperNav.classList.add('hidden');
      return;
    }

    elements.stepperNav.classList.remove('hidden');

    const stepOrder = ['welcome', '1', '2', '3', '4', '5', '6', 'review', 'summary'];
    const activeIdx = stepOrder.indexOf(String(activeStep));

    const percentage = activeIdx >= 0 ? Math.round(((activeIdx) / (stepOrder.length - 1)) * 100) : 0;
    if (elements.stepperProgressFill) {
      elements.stepperProgressFill.style.width = `${percentage}%`;
    }

    elements.stepperItems.forEach(item => {
      const stepKey = item.getAttribute('data-step');
      const itemIdx = stepOrder.indexOf(stepKey);
      const btn = item.querySelector('.step-btn');

      item.classList.remove('active', 'completed');
      if (itemIdx === activeIdx) {
        item.classList.add('active');
        if (btn) btn.setAttribute('aria-current', 'step');
      } else {
        if (btn) btn.removeAttribute('aria-current');
        if (itemIdx < activeIdx) {
          item.classList.add('completed');
        }
      }
    });
  }

  // --- Validation ---
  function validateWelcomeForm() {
    if (!appState.meta.orgName || appState.meta.orgName.trim() === '') {
      showToast('Please enter your organization name before continuing.');
      elements.orgName.focus();
      return false;
    }
    if (!appState.meta.officerRole || appState.meta.officerRole === '') {
      showToast('Please select the officer role being handed off.');
      elements.officerRole.focus();
      return false;
    }
    if (appState.meta.officerRole === 'Other' && (!appState.meta.officerRoleOther || appState.meta.officerRoleOther.trim() === '')) {
      showToast('Please specify the custom officer role title.');
      elements.officerRoleOther.focus();
      return false;
    }
    return true;
  }

  // --- Review Screen ---
  function renderReviewScreen() {
    let countAnswered = 0;
    let countUnresolved = 0;
    let countUnknown = 0;
    let countNa = 0;
    let countMissing = 0;

    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      sec.questions.forEach(q => {
        const item = appState.answers[q.id] || { text: '', status: 'standard' };
        if (item.status === 'unresolved') {
          countUnresolved++;
        } else if (item.status === 'unknown') {
          countUnknown++;
        } else if (item.status === 'na') {
          countNa++;
        } else {
          if (item.text && item.text.trim().length > 0) {
            countAnswered++;
          } else {
            countMissing++;
          }
        }
      });
    });

    elements.metricAnswered.textContent = countAnswered;
    elements.metricUnresolved.textContent = countUnresolved;
    elements.metricUnknown.textContent = countUnknown;
    elements.metricNa.textContent = countNa;
    elements.metricMissing.textContent = countMissing;

    elements.reviewAccordion.innerHTML = '';

    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      const secBlock = document.createElement('div');
      secBlock.className = 'review-section-block';
      secBlock.setAttribute('role', 'listitem');

      const header = document.createElement('div');
      header.className = 'review-section-header';
      header.innerHTML = `
        <div class="review-sec-title-group">
          <span class="review-sec-num" aria-hidden="true">${sec.id}</span>
          <span class="review-sec-title">${escapeHtml(sec.heading)}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm btn-edit-section" data-target="${sec.id}">
          Edit Section ${sec.id}
        </button>
      `;

      const itemsList = document.createElement('div');
      itemsList.className = 'review-items-list';

      sec.questions.forEach(q => {
        const item = appState.answers[q.id] || { text: '', status: 'standard' };
        const row = document.createElement('div');
        row.className = 'review-item-row';

        let badgeHtml = '';
        let snippetText = item.text && item.text.trim() ? item.text.trim() : 'No response provided.';

        if (item.status === 'unresolved') {
          badgeHtml = '<span class="status-badge badge-unresolved">Action Required</span>';
        } else if (item.status === 'unknown') {
          badgeHtml = '<span class="status-badge badge-unknown">Marked Unknown</span>';
          snippetText = item.text && item.text.trim() ? item.text.trim() : 'Flagged as unknown.';
        } else if (item.status === 'na') {
          badgeHtml = '<span class="status-badge badge-na">Not Applicable</span>';
          snippetText = item.text && item.text.trim() ? item.text.trim() : 'Marked not applicable.';
        } else {
          if (item.text && item.text.trim().length > 0) {
            badgeHtml = '<span class="status-badge badge-answered">Answered</span>';
          } else {
            badgeHtml = '<span class="status-badge badge-missing">Missing</span>';
            snippetText = 'No text entered — will appear as [Not Provided] in the summary.';
          }
        }

        row.innerHTML = `
          <div class="review-item-left">
            <div class="review-item-title">${escapeHtml(q.title)}</div>
            <div class="review-item-snippet">${escapeHtml(snippetText)}</div>
          </div>
          <div class="review-item-right">
            ${badgeHtml}
          </div>
        `;
        itemsList.appendChild(row);
      });

      secBlock.appendChild(header);
      secBlock.appendChild(itemsList);
      elements.reviewAccordion.appendChild(secBlock);

      secBlock.querySelector('.btn-edit-section').addEventListener('click', () => {
        navigateToScreen(sec.id);
      });
    });
  }

  // --- Summary Screen (Anti-Hallucination) ---
  function renderSummaryScreen() {
    const meta = appState.meta;

    elements.docDispOrgName.textContent = meta.orgName || 'Student Organization';
    const roleText = meta.officerRole === 'Other' && meta.officerRoleOther ? meta.officerRoleOther : (meta.officerRole || 'Officer');
    elements.docDispRole.textContent = roleText;
    elements.docDispOutgoing.textContent = meta.outgoingOfficer || '—';
    elements.docDispIncoming.textContent = meta.incomingOfficer || '—';

    // Format date — use the value the officer set; do not auto-update it
    if (meta.lastReviewedDate) {
      try {
        const parts = meta.lastReviewedDate.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          elements.docDispDate.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } else {
          elements.docDispDate.textContent = meta.lastReviewedDate;
        }
      } catch (e) {
        elements.docDispDate.textContent = meta.lastReviewedDate;
      }
    } else {
      elements.docDispDate.textContent = '—';
    }

    // Build unresolved callout
    const unresolvedItems = [];
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      sec.questions.forEach(q => {
        const item = appState.answers[q.id];
        if (item && item.status === 'unresolved') {
          unresolvedItems.push({
            secId: sec.id,
            secTitle: sec.shortTitle,
            title: q.title,
            note: item.text && item.text.trim() ? item.text.trim() : 'Unresolved — incoming officer to follow up.'
          });
        }
      });
    });

    elements.docUnresolvedList.innerHTML = '';
    if (unresolvedItems.length === 0) {
      elements.docDispStatusBadge.textContent = 'No unresolved items';
      elements.docCalloutUnresolvedBox.style.display = 'block';
      elements.docUnresolvedList.innerHTML = `
        <div class="unresolved-item" style="border-color: #A7F3D0; background-color: #F0FDF4;">
          <div class="unresolved-item-content">
            <span class="unresolved-item-title" style="color: #065F46;">No unresolved commitments flagged.</span>
            <p class="unresolved-item-note" style="color: #065F46;">Verify all procedures with the incoming officer during your in-person transition meeting.</p>
          </div>
        </div>
      `;
    } else {
      elements.docDispStatusBadge.textContent = `${unresolvedItems.length} Action Item${unresolvedItems.length !== 1 ? 's' : ''} Pending`;
      elements.docCalloutUnresolvedBox.style.display = 'block';
      unresolvedItems.forEach((u, i) => {
        const itemElem = document.createElement('div');
        itemElem.className = 'unresolved-item';
        itemElem.innerHTML = `
          <input type="checkbox" class="unresolved-checkbox" id="unres-check-${i}" aria-label="Action: ${escapeHtml(u.title)}">
          <div class="unresolved-item-content">
            <label for="unres-check-${i}" class="unresolved-item-title">
              [Section ${u.secId}: ${escapeHtml(u.secTitle)}] ${escapeHtml(u.title)}
            </label>
            <div class="unresolved-item-note">${escapeHtml(u.note)}</div>
          </div>
        `;
        elements.docUnresolvedList.appendChild(itemElem);
      });
    }

    // Render 6 Digest Blocks
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      const container = document.getElementById(`doc-content-sec-${sec.id}`);
      if (!container) return;
      container.innerHTML = '';

      sec.questions.forEach(q => {
        const block = document.createElement('div');
        block.className = 'doc-entry-block';

        const item = appState.answers[q.id] || { text: '', status: 'standard' };
        let bodyHtml = '';

        if (item.status === 'unresolved') {
          const note = item.text && item.text.trim() ? escapeHtml(item.text.trim()) : 'Action item flagged — follow up required.';
          bodyHtml = `
            <div class="doc-entry-body">
              <span class="status-badge badge-unresolved" style="font-size:0.7rem;margin-bottom:0.2rem;">[Unresolved Action Item]</span><br>
              ${note}
            </div>
          `;
        } else if (item.status === 'unknown') {
          const extra = item.text && item.text.trim() ? ` — Note: ${escapeHtml(item.text.trim())}` : '';
          bodyHtml = `
            <div class="doc-entry-body">
              <span class="doc-tag-unknown">[Marked as Unknown / Research Needed${extra}]</span>
            </div>
          `;
        } else if (item.status === 'na') {
          const extra = item.text && item.text.trim() ? ` (${escapeHtml(item.text.trim())})` : '';
          bodyHtml = `
            <div class="doc-entry-body">
              <span class="doc-tag-na">[Not Applicable to this role${extra}]</span>
            </div>
          `;
        } else {
          if (item.text && item.text.trim().length > 0) {
            bodyHtml = `<div class="doc-entry-body">${escapeHtml(item.text.trim())}</div>`;
          } else {
            bodyHtml = `
              <div class="doc-entry-body">
                <span class="doc-tag-missing">[Not Provided — Outgoing Officer Did Not Enter a Response]</span>
              </div>
            `;
          }
        }

        block.innerHTML = `
          <div class="doc-entry-title">${escapeHtml(q.title)}</div>
          ${bodyHtml}
        `;
        container.appendChild(block);
      });
    });
  }

  // --- Markdown Export ---
  function generateMarkdownSummary() {
    const meta = appState.meta;
    const roleText = meta.officerRole === 'Other' && meta.officerRoleOther ? meta.officerRoleOther : (meta.officerRole || 'Officer');

    let md = `# MavNext — Officer Handoff Summary\n\n`;
    md += `**Organization:** ${meta.orgName || 'N/A'}\n`;
    md += `**Role:** ${roleText}\n`;
    md += `**Outgoing Officer:** ${meta.outgoingOfficer || 'N/A'}\n`;
    md += `**Incoming Officer:** ${meta.incomingOfficer || 'N/A'}\n`;
    md += `**Last-Reviewed Date:** ${meta.lastReviewedDate || 'N/A'}\n\n`;
    md += `---\n\n`;

    const unresolved = [];
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      sec.questions.forEach(q => {
        const item = appState.answers[q.id];
        if (item && item.status === 'unresolved') {
          unresolved.push(`- [ ] **[Section ${sec.id}: ${sec.shortTitle}] ${q.title}:** ${item.text || 'Action required'}`);
        }
      });
    });

    if (unresolved.length > 0) {
      md += `## ⚠️ Unresolved Action Items\n\n`;
      md += unresolved.join('\n') + `\n\n---\n\n`;
    }

    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      md += `## ${sec.id}. ${sec.heading}\n\n`;
      sec.questions.forEach(q => {
        const item = appState.answers[q.id] || { text: '', status: 'standard' };
        md += `### ${q.title}\n`;
        if (item.status === 'unresolved') {
          md += `*[UNRESOLVED]* ${item.text || 'Action item'}\n\n`;
        } else if (item.status === 'unknown') {
          md += `*[UNKNOWN / RESEARCH NEEDED]* ${item.text || ''}\n\n`;
        } else if (item.status === 'na') {
          md += `*[NOT APPLICABLE]* ${item.text || ''}\n\n`;
        } else {
          md += item.text && item.text.trim().length > 0 ? `${item.text.trim()}\n\n` : `*[Not Provided]*\n\n`;
        }
      });
    });

    md += `---\n*Generated with MavNext — an independent student-developed handoff tool. Not an official UTA service.*\n`;
    return md;
  }

  // --- Toast Feedback ---
  let toastTimer = null;
  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.classList.add('hidden');
    }, 3800);
  }

  // --- HTML Escaping ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Clipboard Fallback ---
  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Summary copied to clipboard.');
    } catch (err) {
      showToast('Could not copy automatically. Use Print / Save PDF instead.');
    }
    document.body.removeChild(ta);
  }

  // --- Event Listeners ---
  function attachEventListeners() {
    // Start Handoff
    elements.btnStartHandoff.addEventListener('click', () => {
      if (validateWelcomeForm()) {
        navigateToScreen('1');
      }
    });

    // Resume handoff (loads saved draft, then goes to Section 1)
    if (elements.btnResumeHandoff) {
      elements.btnResumeHandoff.addEventListener('click', () => {
        if (validateWelcomeForm()) {
          navigateToScreen('1');
        }
      });
    }

    // Start fresh (clear draft, stay on welcome)
    if (elements.btnStartFresh) {
      elements.btnStartFresh.addEventListener('click', () => {
        openClearModal();
      });
    }

    // Sample data buttons — both trigger the same confirm-then-load flow
    elements.btnWelcomeSample.addEventListener('click', requestLoadDemo);
    elements.btnLoadSample.addEventListener('click', requestLoadDemo);

    // Demo overwrite modal
    elements.btnModalDemoCancel.addEventListener('click', () => {
      elements.modalDemoConfirm.classList.add('hidden');
    });
    elements.btnModalDemoConfirm.addEventListener('click', () => {
      elements.modalDemoConfirm.classList.add('hidden');
      loadSyntheticDemo();
    });
    elements.modalDemoConfirm.addEventListener('click', (e) => {
      if (e.target === elements.modalDemoConfirm) {
        elements.modalDemoConfirm.classList.add('hidden');
      }
    });

    // Clear answers
    elements.btnClearData.addEventListener('click', openClearModal);
    elements.btnModalClearCancel.addEventListener('click', closeClearModal);
    elements.btnModalClearConfirm.addEventListener('click', executeClearAllData);
    elements.modalClearConfirm.addEventListener('click', (e) => {
      if (e.target === elements.modalClearConfirm) closeClearModal();
    });

    // Stepper navigation
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target !== 'welcome' && !validateWelcomeForm()) return;
        navigateToScreen(target);
      });
    });

    // Prev/Next buttons inside sections
    document.querySelectorAll('.nav-prev').forEach(btn => {
      btn.addEventListener('click', () => navigateToScreen(btn.getAttribute('data-target')));
    });
    document.querySelectorAll('.nav-next').forEach(btn => {
      btn.addEventListener('click', () => navigateToScreen(btn.getAttribute('data-target')));
    });

    // Review → Summary
    elements.btnGenerateSummary.addEventListener('click', () => navigateToScreen('summary'));

    // Summary actions
    elements.btnSummaryToReview.addEventListener('click', () => navigateToScreen('review'));
    elements.btnSummaryToEdit.addEventListener('click', () => navigateToScreen('1'));
    elements.btnPrintSummary.addEventListener('click', () => window.print());

    elements.btnCopyMarkdown.addEventListener('click', () => {
      const md = generateMarkdownSummary();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).then(() => {
          showToast('Summary copied to clipboard.');
        }).catch(() => fallbackCopyText(md));
      } else {
        fallbackCopyText(md);
      }
    });

    // Footer restart
    if (elements.footerRestart) {
      elements.footerRestart.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen('welcome');
      });
    }

    // Keyboard: Escape closes any open modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!elements.modalClearConfirm.classList.contains('hidden')) closeClearModal();
        if (!elements.modalDemoConfirm.classList.contains('hidden')) {
          elements.modalDemoConfirm.classList.add('hidden');
        }
      }
    });
  }

  // --- Initialization ---
  function init() {
    cacheDomElements();
    renderQuestionnaireSections();
    attachMetaListeners();
    attachEventListeners();
    loadFromLocalStorage();
    syncMetaFormFromState();
    syncAllQuestionCardsFromState();
    updateResumeBanner();
    navigateToScreen('welcome');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
