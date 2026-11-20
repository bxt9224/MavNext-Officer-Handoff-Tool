/**
 * Officer Handoff Tool - UT Arlington Student Organizations
 * Pure Vanilla JavaScript Client-Side Application
 * Strictly adheres to zero-backend, zero-credential, local-only specifications.
 */

(function () {
  'use strict';

  // --- Constants & Storage Namespace ---
  const STORAGE_KEY = 'uta_officer_handoff_data';

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
          help: 'What is the primary objective of this role and what should the incoming officer strive to accomplish?',
          placeholder: 'e.g., Lead executive meetings, maintain organizational alignment with university student life standards, and represent our student chapter at campus fairs.'
        },
        {
          id: 'q_duties_routine',
          title: 'Weekly & Monthly Routines',
          help: 'Detail regular operational duties, recurring meetings, officer synchs, and routine administration.',
          placeholder: 'e.g., Every Monday at 6 PM: Chair Executive Board synch. Monthly: Review budget balance with Treasurer and submit monthly event updates on MavOrgs.'
        },
        {
          id: 'q_campus_relations',
          title: 'Key Campus Relationships & Advisor Interactions',
          help: 'Who are the primary campus advisors, department staff, or campus partners to stay in touch with?',
          placeholder: 'e.g., Faculty Advisor Dr. Miller (Engineering dept) meets once a month. Student Organizations advisor in University Center Suite B120 assists with MavOrgs rosters.'
        },
        {
          id: 'q_success_tips',
          title: 'Officer Success Tips & Recommendations',
          help: 'What habits, communication practices, or practical tips helped you navigate this position effectively?',
          placeholder: 'e.g., Book campus rooms at least 3 weeks early in the semester. Keep Discord announcements concise and post reminder polls 48 hours prior to meetings.'
        }
      ]
    },
    {
      id: 2,
      title: 'Account Access',
      shortTitle: 'Account Access',
      heading: 'Account Access Transfer Steps',
      description: 'Document approved procedural steps to transfer administrative ownership. Security Reminder: Document procedural delegation steps only—never write passwords or credentials.',
      questions: [
        {
          id: 'q_mavorgs_transfer',
          title: 'MavOrgs Organization Management Transfer',
          help: 'Describe the process to update the primary contact, officer roster, and administrative permissions on MavOrgs.',
          placeholder: 'e.g., Current President logs into MavOrgs > Organization Roster > Manage Roster. Search incoming officer by NetID, assign Executive Role, then designate as Primary Contact.'
        },
        {
          id: 'q_drive_storage',
          title: 'Cloud Storage & Document Repository Transfer',
          help: 'Where are shared archives, constitution drafts, and flyers kept, and how is folder ownership transferred?',
          placeholder: 'e.g., Shared Google Drive containing bylaws, branding logos, and flyers. Outgoing officer transfers folder ownership to the incoming officer’s university email address.'
        },
        {
          id: 'q_comms_channels',
          title: 'Communication Channels (Discord, Slack, GroupMe, Teams)',
          help: 'What is the approved procedure for transferring server ownership, channel administration, or workspace roles?',
          placeholder: 'e.g., Discord server ownership transfer: Server Settings > Members > Select incoming officer > Transfer Ownership. Retain outgoing officers in an Alumni role.'
        },
        {
          id: 'q_social_email',
          title: 'Social Media Accounts & Official Email Transition',
          help: 'How are Instagram, LinkedIn, or student org email accounts safely handed off without compromising security?',
          placeholder: 'e.g., Instagram account: Update two-factor verification phone number to incoming officer during the transition meeting. Transfer Meta Business Suite manager access.'
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
          help: 'When does annual registration take place at UTA, and what officer training or roster requirements must be met?',
          placeholder: 'e.g., Annual re-registration window typically opens in late spring and closes early September on MavOrgs. Mandatory officer orientation modules must be completed.'
        },
        {
          id: 'q_activity_fairs',
          title: 'Activity Fairs & Maverick Stampede Participation',
          help: 'When are student involvement fairs held each semester, and how is a table secured?',
          placeholder: 'e.g., Fall Maverick Stampede Involvement Fair registration opens in July on MavOrgs. Spring fair signup occurs during the first week of January. Bring a banner and QR sign-in.'
        },
        {
          id: 'q_room_reservations',
          title: 'Campus Space & Room Reservation Cutoffs',
          help: 'What are the required reservation windows and booking procedures for campus spaces (e.g., University Center rooms, classrooms)?',
          placeholder: 'e.g., UC conference rooms and Palo Duro Lounge must be requested via MavOrgs Space Reservation at least 14 business days in advance. General classrooms require 7 days.'
        },
        {
          id: 'q_elections_transitions',
          title: 'Elections & Leadership Transition Timeline',
          help: 'When are nominations opened, elections conducted, and final transition meetings held?',
          placeholder: 'e.g., Nominations open in March; officer elections take place during the first week of April. Joint transition meetings between outgoing and incoming teams occur in late April.'
        }
      ]
    },
    {
      id: 4,
      title: 'Funding Procedures',
      shortTitle: 'Funding',
      heading: 'Funding Procedures & Financial Workflows',
      description: 'Explain how your organization handles Student Government funding, off-campus bank accounts, reimbursements, and invoices. Free-text explanation based on observed experience; do not assume UTA policies.',
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
          help: 'What is the procedure for updating authorized signers on the organization bank account (if applicable)?',
          placeholder: 'e.g., Schedule an in-person appointment at Chase Bank branch on Cooper St. Both outgoing and incoming President and Treasurer must bring student IDs and updated officer minutes.'
        },
        {
          id: 'q_reimbursements',
          title: 'Reimbursement & Payment Process',
          help: 'What is the internal process for members or officers requesting reimbursement for authorized event expenses?',
          placeholder: 'e.g., Members submit itemized receipts via our Google Form within 14 days of purchase. The Treasurer verifies budget availability and issues check or bank disbursement within 5 business days.'
        },
        {
          id: 'q_vendor_invoices',
          title: 'Invoicing & Vendor Purchase Guidelines',
          help: 'How are outside vendors (e.g., merchandise printers, catering, special equipment) invoiced and paid?',
          placeholder: 'e.g., Request a W-9 and itemized estimate from vendors prior to placing orders. Ensure all catering on campus complies with university food policy guidelines.'
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
          placeholder: 'e.g., Annual Tech Hackathon in October drew 120 attendees. Holding sponsor workshops in the afternoon and offering pizza at 7 PM kept student retention high.'
        },
        {
          id: 'q_pitfalls_lessons',
          title: 'Common Pitfalls & Lessons Learned',
          help: 'What did not go as expected, and what adjustments should the incoming officer make in the future?',
          placeholder: 'e.g., Do not schedule major events during midterm weeks. University Center audiovisual equipment must be tested with staff at least 1 hour before doors open.'
        },
        {
          id: 'q_venues_logistics',
          title: 'Recommended Campus Venues & Setup Logistics',
          help: 'Which campus locations, room configurations, and AV setups worked best for your organization’s activities?',
          placeholder: 'e.g., UC Rio Grande Room is great for interactive workshops (round tables of 6). Nedderman Hall atrium is ideal for casual showcases and project demos.'
        },
        {
          id: 'q_attendance_promo',
          title: 'Attendance Promotion & Marketing Channels',
          help: 'Which promotional strategies produced the highest turnout among UTA students?',
          placeholder: 'e.g., Instagram carousel posts 5 days in advance + announcements in major Discord channels + physical flyers in the SEIR and Nedderman bulletin boards.'
        }
      ]
    },
    {
      id: 6,
      title: 'Unfinished Commitments',
      shortTitle: 'Unfinished',
      heading: 'Unfinished Commitments & Next Steps',
      description: 'Flag open initiatives, pending vendor contracts, active university inquiries, and immediate action items for the incoming officer.',
      questions: [
        {
          id: 'q_pending_contracts',
          title: 'Pending Vendor Orders & Open Invoices',
          help: 'Are there any active vendor orders, unfulfilled contracts, or outstanding balances owed?',
          placeholder: 'e.g., Pending invoice for 100 club t-shirts with CustomInk ($850) - delivery expected on August 15th to the Student Org mailroom.'
        },
        {
          id: 'q_university_inquiries',
          title: 'Active Campus Inquiries & University Approvals',
          help: 'Are there any open room reservation requests, pending advisor signatures, or administrative questions awaiting response?',
          placeholder: 'e.g., Submitted room reservation for Fall Kickoff in UC Bluebonnet Ballroom; awaiting final approval notification from Student Event Services.'
        },
        {
          id: 'q_ongoing_initiatives',
          title: 'Incomplete Projects & Multi-Semester Initiatives',
          help: 'What projects or partnerships are mid-stream and need continued leadership by the incoming officer?',
          placeholder: 'e.g., In discussion with UTA IEEE chapter for a joint robotics workshop in November. Outline draft is saved in Google Drive / Partnerships.'
        },
        {
          id: 'q_immediate_next_steps',
          title: 'Top 3 Immediate Next Steps (First 14 Days)',
          help: 'What are the 3 most urgent tasks the incoming officer should execute immediately upon taking office?',
          placeholder: 'e.g., 1. Complete primary contact transition on MavOrgs. 2. Schedule summer intro synch with Faculty Advisor Dr. Miller. 3. Finalize table registration for Fall Activity Fair.'
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

  // Populate answer keys in blank state
  QUESTIONNAIRE_SECTIONS.forEach(sec => {
    sec.questions.forEach(q => {
      defaultState.answers[q.id] = {
        text: '',
        status: 'standard' // 'standard' | 'unknown' | 'na' | 'unresolved'
      };
    });
  });

  // Current Application State
  let appState = JSON.parse(JSON.stringify(defaultState));
  let currentScreen = 'welcome';
  let saveTimeout = null;

  // --- Synthetic Demonstration Data (Fictional UTA Student Org) ---
  const SYNTHETIC_DEMO_DATA = {
    meta: {
      orgName: 'UTA Maverick Robotics Society',
      officerRole: 'President',
      officerRoleOther: '',
      outgoingOfficer: 'Maya Lin (Outgoing President, Class of \'26)',
      incomingOfficer: 'David Kim (Incoming President, Class of \'27)',
      lastReviewedDate: new Date().toISOString().split('T')[0]
    },
    answers: {
      // Section 1
      q_mission: {
        text: 'Lead the executive board of 6 officers, represent the Maverick Robotics Society in the College of Engineering Student Council, and coordinate competitive robotics teams for regional university challenges.',
        status: 'standard'
      },
      q_duties_routine: {
        text: 'Weekly: Host executive board synch every Tuesday at 6:00 PM in NH 100. Monthly: Send general body newsletter via MavOrgs email tool and reconcile treasury balance with treasurer before the 25th.',
        status: 'standard'
      },
      q_campus_relations: {
        text: 'Faculty Advisor: Dr. Raymond Torres (Mechanical & Aerospace Engineering). Meets quarterly. Key contact for lab access: Engineering Lab Coordinator Mr. Henderson in Woolf Hall.',
        status: 'standard'
      },
      q_success_tips: {
        text: 'Submit room reservations at least 3 weeks before major workshop dates. Delegate team leads for sub-projects early so the president can focus on sponsorship and university compliance.',
        status: 'standard'
      },

      // Section 2
      q_mavorgs_transfer: {
        text: 'Log into MavOrgs > Navigate to Maverick Robotics Society page > Manage Organization > Roster. Find David Kim, click pencil icon to edit membership status to President, and select Set as Primary Contact.',
        status: 'standard'
      },
      q_drive_storage: {
        text: 'Shared Google Drive contains all CAD files, constitution, sponsorship brochures, and past competition docs. Outgoing president transfers primary ownership of root folder to incoming president’s netid email.',
        status: 'standard'
      },
      q_comms_channels: {
        text: 'Discord Server (850 members): Transfer server ownership via Server Settings > Members > David Kim > Transfer Ownership. Demote outgoing seniors to "Alumni / Veteran Member" role to preserve chat history.',
        status: 'standard'
      },
      q_social_email: {
        text: 'Instagram (@utamediarobotics): Set 2FA recovery phone to the incoming president during transition session. LinkedIn Organization page: Add incoming president as Super Admin under Page Settings.',
        status: 'standard'
      },

      // Section 3
      q_reregistration: {
        text: 'Annual re-registration on MavOrgs takes place in late April through August. President and Treasurer must complete online compliance training modules and upload updated constitution.',
        status: 'standard'
      },
      q_activity_fairs: {
        text: 'Fall Activity Fair (Maverick Stampede): Register via MavOrgs form by late July. Spring Activity Fair: Register by January 10th. Setup interactive robot driving station at table to attract recruits.',
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

      // Section 4
      q_sg_funding: {
        text: 'Apply for Student Government annual allocation in February. For travel and competition funding, submit supplemental funding requests at least 30 days prior to the travel date with itemized quotes.',
        status: 'standard'
      },
      q_bank_signees: {
        text: 'Off-campus org checking account is with Wells Fargo on Center St. Outgoing and incoming President & Treasurer must visit branch in-person with signed meeting minutes and UTA NetID cards.',
        status: 'standard'
      },
      q_reimbursements: {
        text: 'Officers or project leads submit itemized receipts and tax-exemption verification through our internal expense Google Form within 14 days of purchase. Treasurer issues reimbursement check.',
        status: 'standard'
      },
      q_vendor_invoices: {
        text: 'For parts purchases above $500 (e.g., custom motor controllers or aluminum stock), request official invoice with UTA tax-exempt certificate provided by faculty advisor.',
        status: 'standard'
      },

      // Section 5
      q_signature_events: {
        text: 'Maverick Combat Robotics Invitational (March): 140 participants. Live video stream to Discord and food truck parking outside Woolf Hall made this our highest engagement event of the academic year.',
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
        text: 'Best attendance came from announcements in freshman intro to engineering classes during week 2, paired with video reels posted on Instagram.',
        status: 'standard'
      },

      // Section 6 (With Flagged Unfinished Items)
      q_pending_contracts: {
        text: 'Pending invoice #8492 with PCBWay ($380) for summer competition circuit boards. Order is placed, awaiting shipment confirmation and final receipt.',
        status: 'unresolved'
      },
      q_university_inquiries: {
        text: 'Awaiting response from Student Event Services regarding approval for outdoor arena canopy reservation on University Green for the Fall Kickoff.',
        status: 'unresolved'
      },
      q_ongoing_initiatives: {
        text: 'Exploring partnership with UTA SAE Racing Team for a shared composite materials workshop in October. Draft outline is in Google Drive.',
        status: 'standard'
      },
      q_immediate_next_steps: {
        text: '1. Finalize MavOrgs primary contact transfer with Student Org office. 2. Meet with Dr. Torres to confirm Fall lab hours. 3. Confirm PCBWay delivery receipt with Treasurer.',
        status: 'unresolved'
      }
    }
  };

  // --- DOM Elements Cache ---
  const elements = {};

  function cacheDomElements() {
    elements.saveStatus = document.getElementById('save-status');
    elements.saveStatusText = document.getElementById('save-status-text');
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

    // Modal Clear Elements
    elements.modalClearConfirm = document.getElementById('modal-clear-confirm');
    elements.btnModalClearCancel = document.getElementById('btn-modal-clear-cancel');
    elements.btnModalClearConfirm = document.getElementById('btn-modal-clear-confirm');

    // Toast element
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
            <span class="toolbar-label">Response Status:</span>
            <div class="status-button-group" role="group" aria-label="Status for ${escapeHtml(q.title)}">
              <button type="button" class="status-btn selected-standard" data-qid="${q.id}" data-status="standard" title="Answer with standard guidance">
                Standard Response
              </button>
              <button type="button" class="status-btn" data-qid="${q.id}" data-status="unknown" title="Mark as unknown / research needed">
                Mark as Unknown
              </button>
              <button type="button" class="status-btn" data-qid="${q.id}" data-status="na" title="Not applicable to this specific role">
                Not Applicable (N/A)
              </button>
              <button type="button" class="status-btn" data-qid="${q.id}" data-status="unresolved" title="Flag as an unresolved commitment requiring incoming officer action">
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
              rows="4"></textarea>
          </div>
        `;

        container.appendChild(card);

        // Attach Question Status Switchers
        const statusButtons = card.querySelectorAll('.status-btn');
        statusButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const qid = btn.getAttribute('data-qid');
            const newStatus = btn.getAttribute('data-status');
            setQuestionStatus(qid, newStatus);
            scheduleSave();
          });
        });

        // Attach Textarea Input Listener
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
    if (!card || !textarea || !badge) return;

    const answerData = appState.answers[qid] || { text: '', status: 'standard' };
    const status = answerData.status || 'standard';
    const textVal = answerData.text || '';

    // Update status buttons active classes
    const buttons = card.querySelectorAll('.status-btn');
    buttons.forEach(btn => {
      const bStatus = btn.getAttribute('data-status');
      btn.className = 'status-btn';
      if (bStatus === status) {
        btn.classList.add(`selected-${bStatus}`);
      }
    });

    // Reset card highlight classes
    card.classList.remove('is-unresolved', 'is-unknown', 'is-na');

    // Update Card & Badge appearance
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
      // standard
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
    if (elements.lastReviewedDate) elements.lastReviewedDate.value = appState.meta.lastReviewedDate || new Date().toISOString().split('T')[0];
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

  // --- Local Storage Persistence ---
  function loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Merge metadata
          if (parsed.meta) {
            appState.meta = Object.assign({}, defaultState.meta, parsed.meta);
          }
          // Merge answers
          if (parsed.answers) {
            QUESTIONNAIRE_SECTIONS.forEach(sec => {
              sec.questions.forEach(q => {
                if (parsed.answers[q.id]) {
                  appState.answers[q.id] = Object.assign({}, defaultState.answers[q.id], parsed.answers[q.id]);
                }
              });
            });
          }
          showToast('Loaded saved handoff draft from this browser.');
        }
      }
    } catch (err) {
      console.warn('Could not read existing local draft:', err);
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      indicateSaved(true);
    } catch (err) {
      console.error('Failed to save answers to localStorage:', err);
      indicateSaved(false);
    }
  }

  function scheduleSave() {
    if (elements.saveStatusText) {
      elements.saveStatusText.textContent = 'Saving locally...';
    }
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveToLocalStorage();
    }, 250);
  }

  function indicateSaved(success) {
    if (!elements.saveStatusText) return;
    if (success) {
      elements.saveStatusText.textContent = 'Saved to browser';
    } else {
      elements.saveStatusText.textContent = 'Local save failed';
    }
  }

  // --- Clear Answers Protocol ---
  function openClearModal() {
    elements.modalClearConfirm.classList.remove('hidden');
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
    navigateToScreen('welcome');
    showToast('All answers have been cleared from this browser.');
  }

  // --- Navigation & Screen Management ---
  function navigateToScreen(targetScreen) {
    const screens = document.querySelectorAll('.app-screen');
    screens.forEach(screen => {
      screen.classList.remove('active');
    });

    const activeScreenElem = document.getElementById(`screen-${targetScreen}`) || document.getElementById(`screen-section-${targetScreen}`);
    if (activeScreenElem) {
      activeScreenElem.classList.add('active');
    }

    currentScreen = targetScreen;
    updateStepperUI(targetScreen);

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Conditional screen renderers
    if (targetScreen === 'review') {
      renderReviewScreen();
    } else if (targetScreen === 'summary') {
      renderSummaryScreen();
    }
  }

  function updateStepperUI(activeStep) {
    if (!elements.stepperNav) return;

    // Hide stepper on welcome screen for cleaner intro
    if (activeStep === 'welcome') {
      elements.stepperNav.classList.add('hidden');
      return;
    }

    elements.stepperNav.classList.remove('hidden');

    const stepOrder = ['welcome', '1', '2', '3', '4', '5', '6', 'review', 'summary'];
    const activeIdx = stepOrder.indexOf(String(activeStep));

    // Progress bar calculation
    const percentage = activeIdx >= 0 ? Math.round(((activeIdx) / (stepOrder.length - 1)) * 100) : 0;
    if (elements.stepperProgressFill) {
      elements.stepperProgressFill.style.width = `${percentage}%`;
    }

    // Step items styling
    elements.stepperItems.forEach(item => {
      const stepKey = item.getAttribute('data-step');
      const itemIdx = stepOrder.indexOf(stepKey);

      item.classList.remove('active', 'completed');
      if (itemIdx === activeIdx) {
        item.classList.add('active');
      } else if (itemIdx < activeIdx) {
        item.classList.add('completed');
      }
    });
  }

  // --- Validation Helper ---
  function validateWelcomeForm() {
    if (!appState.meta.orgName || appState.meta.orgName.trim() === '') {
      showToast('Please enter your Student Organization Name before proceeding.');
      elements.orgName.focus();
      return false;
    }
    if (!appState.meta.officerRole || appState.meta.officerRole === '') {
      showToast('Please select the Officer Role being handed off.');
      elements.officerRole.focus();
      return false;
    }
    if (appState.meta.officerRole === 'Other' && (!appState.meta.officerRoleOther || appState.meta.officerRoleOther.trim() === '')) {
      showToast('Please specify the custom officer role name.');
      elements.officerRoleOther.focus();
      return false;
    }
    return true;
  }

  // --- Review Screen Audit Logic ---
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
          // standard
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

    // Render Section-by-Section Audit List
    elements.reviewAccordion.innerHTML = '';

    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      const secBlock = document.createElement('div');
      secBlock.className = 'review-section-block';

      // Section Header
      const header = document.createElement('div');
      header.className = 'review-section-header';
      header.innerHTML = `
        <div class="review-sec-title-group">
          <span class="review-sec-num">${sec.id}</span>
          <span class="review-sec-title">${escapeHtml(sec.heading)}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm btn-edit-section" data-target="${sec.id}">
          ✏️ Edit Section ${sec.id}
        </button>
      `;

      // Items list
      const itemsList = document.createElement('div');
      itemsList.className = 'review-items-list';

      sec.questions.forEach(q => {
        const item = appState.answers[q.id] || { text: '', status: 'standard' };
        const row = document.createElement('div');
        row.className = 'review-item-row';

        let badgeHtml = '';
        let snippetText = item.text && item.text.trim() ? item.text.trim() : 'No response provided yet.';

        if (item.status === 'unresolved') {
          badgeHtml = '<span class="status-badge badge-unresolved">Action Required</span>';
        } else if (item.status === 'unknown') {
          badgeHtml = '<span class="status-badge badge-unknown">Marked Unknown</span>';
          snippetText = item.text && item.text.trim() ? item.text.trim() : 'Flagged as unknown at this time.';
        } else if (item.status === 'na') {
          badgeHtml = '<span class="status-badge badge-na">Not Applicable</span>';
          snippetText = item.text && item.text.trim() ? item.text.trim() : 'Marked as not applicable.';
        } else {
          if (item.text && item.text.trim().length > 0) {
            badgeHtml = '<span class="status-badge badge-answered">Completed</span>';
          } else {
            badgeHtml = '<span class="status-badge badge-missing">Missing / Blank</span>';
            snippetText = 'No text entered. Will be flagged as [Not Provided] in summary.';
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

      // Attach jump-to-section edit listener
      const editBtn = secBlock.querySelector('.btn-edit-section');
      editBtn.addEventListener('click', () => {
        navigateToScreen(sec.id);
      });
    });
  }

  // --- Summary Screen Generation (Strict Anti-Hallucination) ---
  function renderSummaryScreen() {
    const meta = appState.meta;

    // Header metadata presentation
    elements.docDispOrgName.textContent = meta.orgName || 'UTA Student Organization';
    const roleText = meta.officerRole === 'Other' && meta.officerRoleOther ? meta.officerRoleOther : (meta.officerRole || 'Officer');
    elements.docDispRole.textContent = roleText;
    elements.docDispOutgoing.textContent = meta.outgoingOfficer || 'Outgoing Officer';
    elements.docDispIncoming.textContent = meta.incomingOfficer || 'Incoming Officer';
    
    // Format date nicely
    if (meta.lastReviewedDate) {
      try {
        const parts = meta.lastReviewedDate.split('-');
        if (parts.length === 3) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          elements.docDispDate.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } else {
          elements.docDispDate.textContent = meta.lastReviewedDate;
        }
      } catch (e) {
        elements.docDispDate.textContent = meta.lastReviewedDate;
      }
    } else {
      elements.docDispDate.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Compile Unresolved Action Items Callout
    const unresolvedItems = [];
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      sec.questions.forEach(q => {
        const item = appState.answers[q.id];
        if (item && item.status === 'unresolved') {
          unresolvedItems.push({
            secId: sec.id,
            secTitle: sec.shortTitle,
            title: q.title,
            note: item.text && item.text.trim() ? item.text.trim() : 'Unresolved commitment flagged for incoming officer action.'
          });
        }
      });
    });

    elements.docUnresolvedList.innerHTML = '';
    if (unresolvedItems.length === 0) {
      elements.docDispStatusBadge.textContent = 'All Fields Accounted For';
      elements.docCalloutUnresolvedBox.style.display = 'block';
      elements.docUnresolvedList.innerHTML = `
        <div class="unresolved-item" style="border-color: #A7F3D0; background-color: #F0FDF4;">
          <div class="unresolved-item-content">
            <span class="unresolved-item-title" style="color: #065F46;">No unresolved commitments or open questions flagged.</span>
            <p class="unresolved-item-note" style="color: #065F46;">Verify all procedures with the incoming officer during your final in-person transition meeting.</p>
          </div>
        </div>
      `;
    } else {
      elements.docDispStatusBadge.textContent = `${unresolvedItems.length} Action Items Pending`;
      elements.docCalloutUnresolvedBox.style.display = 'block';
      unresolvedItems.forEach((u, i) => {
        const itemElem = document.createElement('div');
        itemElem.className = 'unresolved-item';
        itemElem.innerHTML = `
          <input type="checkbox" class="unresolved-checkbox" id="unres-check-${i}" aria-label="Action Item: ${escapeHtml(u.title)}">
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

    // Render 6 Digest Blocks with Strict Flagging
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
          const note = item.text && item.text.trim() ? escapeHtml(item.text.trim()) : 'Action item flagged.';
          bodyHtml = `
            <div class="doc-entry-body">
              <span class="status-badge badge-unresolved" style="font-size: 0.7rem; margin-bottom: 0.2rem;">[Unresolved Action Item]</span><br>
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
          // Standard
          if (item.text && item.text.trim().length > 0) {
            bodyHtml = `<div class="doc-entry-body">${escapeHtml(item.text.trim())}</div>`;
          } else {
            bodyHtml = `
              <div class="doc-entry-body">
                <span class="doc-tag-missing">[Not Provided — Pending Outgoing Officer Input]</span>
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

  // --- Markdown Export Utility ---
  function generateMarkdownSummary() {
    const meta = appState.meta;
    const roleText = meta.officerRole === 'Other' && meta.officerRoleOther ? meta.officerRoleOther : (meta.officerRole || 'Officer');
    
    let md = `# UT Arlington Student Organizations — Officer Handoff Summary\n\n`;
    md += `**Organization:** ${meta.orgName || 'N/A'}\n`;
    md += `**Role:** ${roleText}\n`;
    md += `**Outgoing Officer:** ${meta.outgoingOfficer || 'N/A'}\n`;
    md += `**Incoming Officer:** ${meta.incomingOfficer || 'N/A'}\n`;
    md += `**Last-Reviewed Date:** ${meta.lastReviewedDate || 'N/A'}\n\n`;
    md += `---\n\n`;

    // Unresolved Commitments Callout
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
      md += `## ⚠️ Unresolved Action Items & Next Steps\n\n`;
      md += unresolved.join('\n') + `\n\n---\n\n`;
    }

    // 6 Sections
    QUESTIONNAIRE_SECTIONS.forEach(sec => {
      md += `## ${sec.id}. ${sec.heading}\n\n`;
      sec.questions.forEach(q => {
        const item = appState.answers[q.id] || { text: '', status: 'standard' };
        md += `### ${q.title}\n`;
        if (item.status === 'unresolved') {
          md += `*Status: [UNRESOLVED]* ${item.text || 'Action item'}\n\n`;
        } else if (item.status === 'unknown') {
          md += `*Status: [UNKNOWN / RESEARCH NEEDED]* ${item.text || ''}\n\n`;
        } else if (item.status === 'na') {
          md += `*Status: [NOT APPLICABLE]* ${item.text || ''}\n\n`;
        } else {
          if (item.text && item.text.trim().length > 0) {
            md += `${item.text.trim()}\n\n`;
          } else {
            md += `*[Not Provided]*\n\n`;
          }
        }
      });
    });

    md += `---\n*Generated client-side via UT Arlington Officer Handoff Tool.*\n`;
    return md;
  }

  // --- Load Synthetic Demo Data ---
  function loadSyntheticDemo() {
    appState = JSON.parse(JSON.stringify(SYNTHETIC_DEMO_DATA));
    syncMetaFormFromState();
    syncAllQuestionCardsFromState();
    saveToLocalStorage();
    showToast('Loaded demonstration sample data (UTA Maverick Robotics Society).');
    navigateToScreen('review');
  }

  // --- Toast Feedback Helper ---
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

  // --- HTML Escaping Helper ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Attachment ---
  function attachEventListeners() {
    // Start Handoff button on Welcome screen
    elements.btnStartHandoff.addEventListener('click', () => {
      if (validateWelcomeForm()) {
        navigateToScreen('1');
      }
    });

    // Sample data buttons
    elements.btnWelcomeSample.addEventListener('click', loadSyntheticDemo);
    elements.btnLoadSample.addEventListener('click', loadSyntheticDemo);

    // Clear answers triggers
    elements.btnClearData.addEventListener('click', openClearModal);
    elements.btnModalClearCancel.addEventListener('click', closeClearModal);
    elements.btnModalClearConfirm.addEventListener('click', executeClearAllData);

    // Modal background close on click outside
    elements.modalClearConfirm.addEventListener('click', (e) => {
      if (e.target === elements.modalClearConfirm) {
        closeClearModal();
      }
    });

    // Stepper navigation clicks
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target !== 'welcome' && !validateWelcomeForm()) {
          return;
        }
        navigateToScreen(target);
      });
    });

    // Previous and Next buttons inside question sections
    document.querySelectorAll('.nav-prev').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        navigateToScreen(target);
      });
    });

    document.querySelectorAll('.nav-next').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        navigateToScreen(target);
      });
    });

    // Review to Summary transition
    elements.btnGenerateSummary.addEventListener('click', () => {
      navigateToScreen('summary');
    });

    // Summary screen toolbar actions
    elements.btnSummaryToReview.addEventListener('click', () => {
      navigateToScreen('review');
    });

    elements.btnSummaryToEdit.addEventListener('click', () => {
      navigateToScreen('1');
    });

    elements.btnPrintSummary.addEventListener('click', () => {
      window.print();
    });

    elements.btnCopyMarkdown.addEventListener('click', () => {
      const md = generateMarkdownSummary();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).then(() => {
          showToast('Summary copied to clipboard in markdown format.');
        }).catch(() => {
          fallbackCopyText(md);
        });
      } else {
        fallbackCopyText(md);
      }
    });

    // Footer restart link
    if (elements.footerRestart) {
      elements.footerRestart.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToScreen('welcome');
      });
    }

    // Keyboard Esc shortcut to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elements.modalClearConfirm.classList.contains('hidden')) {
        closeClearModal();
      }
    });
  }

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
      showToast('Could not copy text automatically. Please use browser print.');
    }
    document.body.removeChild(ta);
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
    navigateToScreen('welcome');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
