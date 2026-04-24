const ROUND_TIME_LIMIT = 180;
const TAB_SWITCH_PENALTY = 15;
const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  c: "C"
};

const DEFAULT_ROUNDS = [
  {
    id: "round-1",
    title: "Round 1 - Aptitude Sprint",
    type: "mcq",
    description: "Quick multiple-choice aptitude questions.",
    questions: [
      {
        id: "q1",
        prompt: "If a team solves 5 questions in 10 minutes, what is the average time per question?",
        options: ["1 minute", "2 minutes", "3 minutes", "5 minutes"],
        answer: 1,
        marks: 25
      },
      {
        id: "q2",
        prompt: "Which data type stores only true/false values?",
        options: ["String", "Number", "Boolean", "Array"],
        answer: 2,
        marks: 25
      }
    ]
  },
  {
    id: "round-2",
    title: "Round 2 - Rapid Fire",
    type: "mcq",
    description: "Speed-based quiz with automatic scoring bonus.",
    questions: [
      {
        id: "q3",
        prompt: "What does HTML stand for?",
        options: [
          "Hyper Trainer Marking Language",
          "HyperText Markup Language",
          "HighText Machine Language",
          "Hyperlink and Text Markup Language"
        ],
        answer: 1,
        marks: 20
      },
      {
        id: "q4",
        prompt: "Which method converts JSON text into a JavaScript object?",
        options: ["JSON.parse()", "JSON.stringify()", "JSON.convert()", "JSON.object()"],
        answer: 0,
        marks: 20
      },
      {
        id: "q5",
        prompt: "Which CSS property changes text color?",
        options: ["font-style", "background", "color", "text-transform"],
        answer: 2,
        marks: 20
      }
    ]
  },
  {
    id: "round-3",
    title: "Round 3 - Logic Puzzle",
    type: "mcq",
    description: "A logic-heavy elimination round.",
    questions: [
      {
        id: "q6",
        prompt: "A number is divisible by 3 and 4. Which of these could it be?",
        options: ["10", "12", "14", "18"],
        answer: 1,
        marks: 30
      },
      {
        id: "q7",
        prompt: "Which structure works in FIFO order?",
        options: ["Stack", "Tree", "Queue", "Graph"],
        answer: 2,
        marks: 30
      }
    ]
  },
  {
    id: "round-4",
    title: "Round 4 - Coding Round",
    type: "coding",
    description: "Write a JavaScript function. Output is auto-evaluated using test cases.",
    questions: [
      {
        id: "code-1",
        prompt: "Create a function named solve that returns the sum of two numbers.",
        starterCode:
`function solve(a, b) {
  return a + b;
}`,
        marks: 100,
        testCases: [
          { input: [1, 2], expected: 3 },
          { input: [10, 25], expected: 35 },
          { input: [-5, 8], expected: 3 }
        ]
      }
    ]
  }
];

const ROUND_TYPE_OPTIONS = [
  { value: "mcq", label: "MCQ" },
  { value: "single-line", label: "Single-line Answer" },
  { value: "multi-line", label: "Multi-line Answer" },
  { value: "coding", label: "Coding" },
  { value: "debugging", label: "Debugging" }
];

let currentUser = null;
let currentStudentDashboard = null;
let currentStudentEventId = null;
let activeRoundSession = null;
let roundTimer = null;
let adminOverviewState = {
  events: [],
  leaderboard: [],
  selectedEventId: "all"
};
let builderState = {
  editingEventId: null,
  rounds: structuredClone(DEFAULT_ROUNDS)
};

const elements = {
  authShell: document.getElementById("auth-shell"),
  appShell: document.getElementById("app-shell"),
  flashMessage: document.getElementById("flash-message"),
  loginPane: document.getElementById("login-pane"),
  registerPane: document.getElementById("register-pane"),
  userSummary: document.getElementById("user-summary"),
  userRoleBadge: document.getElementById("user-role-badge"),
  logoutBtn: document.getElementById("logout-btn"),
  adminView: document.getElementById("admin-view"),
  studentView: document.getElementById("student-view"),
  roundBuilderList: document.getElementById("round-builder-list"),
  eventForm: document.getElementById("event-form"),
  resetDemo: document.getElementById("reset-demo"),
  addRoundBtn: document.getElementById("add-round-btn"),
  saveEventBtn: document.getElementById("save-event-btn"),
  builderEditingChip: document.getElementById("builder-editing-chip"),
  builderModeTitle: document.getElementById("builder-mode-title"),
  eventMode: document.getElementById("event-mode"),
  adminEvents: document.getElementById("admin-events"),
  adminLeaderboard: document.getElementById("admin-leaderboard"),
  adminDatabaseView: document.getElementById("admin-database-view"),
  refreshDbView: document.getElementById("refresh-db-view"),
  studentForm: document.getElementById("student-form"),
  studentEventSelect: document.getElementById("student-event-select"),
  studentHome: document.getElementById("student-home"),
  studentTitle: document.getElementById("student-event-title"),
  studentTeamChip: document.getElementById("student-team-chip"),
  studentLeaderboard: document.getElementById("student-leaderboard"),
  roundScreen: document.getElementById("round-screen"),
  roundForm: document.getElementById("round-form"),
  roundLabel: document.getElementById("round-label"),
  roundTitle: document.getElementById("round-title"),
  roundTeam: document.getElementById("round-team"),
  roundTimer: document.getElementById("round-timer"),
  submitRound: document.getElementById("submit-round"),
  runCodeBtn: document.getElementById("run-code-btn")
};

init();

function init() {
  bindAuthSwitch();
  bindForms();
  renderRoundBuilder();
  showAuth();
}

function bindAuthSwitch() {
  document.querySelectorAll("[data-auth-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-target]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".auth-form").forEach((pane) => pane.classList.remove("active", "hidden"));
      button.classList.add("active");
      const target = document.getElementById(button.dataset.authTarget);
      document.querySelectorAll(".auth-form").forEach((pane) => pane.classList.add("hidden"));
      target.classList.remove("hidden");
      target.classList.add("active");
    });
  });

  document.querySelectorAll(".auth-form").forEach((pane, index) => {
    if (index === 1) {
      pane.classList.add("hidden");
    }
  });
}

function bindForms() {
  elements.loginPane.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      email: document.getElementById("login-email").value.trim(),
      password: document.getElementById("login-password").value
    };

    const result = await api("/api/login", "POST", payload);
    if (result.ok) {
      await bootstrap();
      return;
    }

    showFlash(result.error || "Login failed");
  });

  elements.registerPane.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById("register-name").value.trim(),
      email: document.getElementById("register-email").value.trim(),
      password: document.getElementById("register-password").value,
      role: document.getElementById("register-role").value
    };

    const result = await api("/api/register", "POST", payload);
    showFlash(result.ok ? "Account created. You can log in now." : (result.error || "Registration failed"));
    if (result.ok) {
      elements.registerPane.reset();
    }
  });

  elements.logoutBtn.addEventListener("click", async () => {
    await api("/api/logout", "POST");
    currentUser = null;
    currentStudentDashboard = null;
    currentStudentEventId = null;
    showAuth();
  });

  elements.refreshDbView?.addEventListener("click", async () => {
    await loadDatabaseViewer();
  });

  elements.eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById("event-name").value.trim(),
      description: document.getElementById("event-description").value.trim(),
      event_mode: elements.eventMode.value,
      shuffle_questions: document.getElementById("shuffle-questions").value === "true",
      rounds: collectRoundsFromBuilder()
    };

    const wasEditing = Boolean(builderState.editingEventId);
    const endpoint = builderState.editingEventId
      ? `/api/admin/events/${builderState.editingEventId}/update`
      : "/api/admin/events";
    const result = await api(endpoint, "POST", payload);
    if (!result.ok) {
      showFlash(result.error || "Event creation failed");
      return;
    }

    resetBuilder();
    await loadAdminDashboard();
    showFlash(wasEditing ? "Event updated successfully" : "Event created successfully");
  });

  elements.resetDemo.addEventListener("click", () => resetBuilder());
  elements.addRoundBtn.addEventListener("click", () => {
    builderState.rounds.push(createRound());
    renderRoundBuilder();
  });

  elements.studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      event_id: elements.studentEventSelect.value,
      team_name: document.getElementById("team-name").value.trim()
    };

    const result = await api("/api/student/join", "POST", payload);
    if (!result.ok) {
      showFlash(result.error || "Unable to join event");
      return;
    }

    currentStudentEventId = payload.event_id;
    await loadStudentDashboard(currentStudentEventId);
    showFlash("Joined event successfully");
  });

  elements.submitRound.addEventListener("click", () => submitActiveRound());
  elements.runCodeBtn.addEventListener("click", () => runCodePreview());

  document.addEventListener("visibilitychange", () => {
    if (!activeRoundSession || document.visibilityState !== "hidden") {
      return;
    }

    activeRoundSession.tabSwitches += 1;
    setRoundBanner(`Tab switch detected. ${TAB_SWITCH_PENALTY} marks penalty will apply for this round.`);
  });
}

async function bootstrap() {
  const result = await api("/api/bootstrap", "GET");
  if (!result.ok || !result.user) {
    showAuth();
    return;
  }

  currentUser = result.user;
  showApp();
  if (currentUser.role === "admin") {
    await loadAdminDashboard();
  } else {
    await loadStudentOverview();
  }
}

function showAuth() {
  elements.appShell.classList.add("hidden");
  elements.adminView.classList.add("hidden");
  elements.studentView.classList.add("hidden");
  elements.authShell.classList.remove("hidden");
}

function showApp() {
  elements.authShell.classList.add("hidden");
  elements.appShell.classList.remove("hidden");
  elements.userSummary.textContent = currentUser.role === "admin"
    ? "Admin dashboard"
    : `${currentUser.name} team dashboard`;
  elements.userRoleBadge.textContent = currentUser.role.toUpperCase();
  elements.adminView.classList.toggle("hidden", currentUser.role !== "admin");
  elements.studentView.classList.toggle("hidden", currentUser.role !== "student");
}

async function loadAdminDashboard() {
  const result = await api("/api/admin/overview", "GET");
  if (!result.ok) {
    showFlash(result.error || "Failed to load admin dashboard");
    return;
  }

  adminOverviewState.events = result.events || [];
  adminOverviewState.leaderboard = result.leaderboard || [];
  if (
    adminOverviewState.selectedEventId !== "all" &&
    !adminOverviewState.events.some((event) => event.id === adminOverviewState.selectedEventId)
  ) {
    adminOverviewState.selectedEventId = "all";
  }

  renderAdminEvents(adminOverviewState.events);
  renderAdminLeaderboard();
  await loadDatabaseViewer();
}

async function loadDatabaseViewer() {
  const result = await api("/api/admin/database", "GET");
  if (!result.ok) {
    elements.adminDatabaseView.innerHTML = `<div class="empty-state"><h3>Database unavailable</h3><p>${result.error || "Could not load database data."}</p></div>`;
    return;
  }

  const collectionMeta = new Map((result.collections || []).map((item) => [item.key, item]));
  elements.adminDatabaseView.innerHTML = `
    <section class="db-overview-card">
      <div>
        <p class="panel-kicker">MongoDB Connection</p>
        <h3>${escapeHtml(result.database?.name || "event")}</h3>
        <p class="score-note">${escapeHtml(result.database?.uri || "")}</p>
      </div>
      <div class="db-stats-grid">
        ${(result.collections || []).map((item) => `
          <div class="db-stat-chip">
            <strong>${item.count}</strong>
            <span>${escapeHtml(item.label)}</span>
          </div>
        `).join("")}
      </div>
    </section>
    ${Object.entries(result.tables || {}).map(([collectionName, rows]) => {
      const meta = collectionMeta.get(collectionName);
      return `
        <section class="db-collection-card">
          <div class="db-collection-head">
            <div>
              <p class="panel-kicker">Collection</p>
              <h3>${escapeHtml(meta?.label || prettyCollectionName(collectionName))}</h3>
            </div>
            <span class="chip">${rows.length} loaded / ${meta?.count ?? rows.length} total</span>
          </div>
          ${rows.length ? buildMongoDocuments(rows) : `<p class="score-note">No documents found.</p>`}
        </section>
      `;
    }).join("")}
  `;
}

function buildMongoDocuments(rows) {
  return `
    <div class="mongo-doc-list">
      ${rows.map((row, index) => `
        <article class="mongo-doc-card">
          <div class="mongo-doc-head">
            <strong>Document ${index + 1}</strong>
            <span class="tag">Protected View</span>
          </div>
          ${buildMongoFields(row)}
          <details class="mongo-json-toggle">
            <summary>View full JSON</summary>
            <pre>${escapeHtml(JSON.stringify(sanitizeMongoDocument(row), null, 2))}</pre>
          </details>
        </article>
      `).join("")}
    </div>
  `;
}

function buildMongoFields(document) {
  const visibleEntries = Object.entries(sanitizeMongoDocument(document));
  return `
    <div class="mongo-field-list">
      ${visibleEntries.map(([key, value]) => `
        <div class="mongo-field-row">
          <span class="mongo-field-key">${escapeHtml(key)}</span>
          <span class="mongo-field-value">${formatMongoValue(value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function sanitizeMongoDocument(document) {
  const hiddenKeys = new Set(["_id", "password_hash", "token", "session_token"]);
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => !hiddenKeys.has(key))
  );
}

function formatMongoValue(value) {
  if (value === null || value === undefined) {
    return '<em>null</em>';
  }

  if (Array.isArray(value)) {
    const text = JSON.stringify(value);
    return `<code>${escapeHtml(text.length > 120 ? `${text.slice(0, 117)}...` : text)}</code>`;
  }

  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return `<code>${escapeHtml(text.length > 120 ? `${text.slice(0, 117)}...` : text)}</code>`;
  }

  return escapeHtml(String(value));
}

function prettyCollectionName(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function loadStudentOverview() {
  const result = await api("/api/student/overview", "GET");
  if (!result.ok) {
    showFlash(result.error || "Failed to load student dashboard");
    return;
  }

  const unlockedEvents = result.available_events || [];
  elements.studentEventSelect.innerHTML = unlockedEvents.length
    ? unlockedEvents.map((event) => `<option value="${event.id}">${event.name} (${event.event_mode === "team" ? "Team" : "Solo"})</option>`).join("")
    : `<option value="">No unlocked events</option>`;

  if (result.participants?.length) {
    currentStudentEventId = currentStudentEventId || result.participants[0].event_id;
    await loadStudentDashboard(currentStudentEventId);
  } else {
    currentStudentDashboard = null;
    elements.studentTitle.textContent = "No Event Selected";
    elements.studentTeamChip.textContent = "Waiting for team";
    elements.studentLeaderboard.innerHTML = buildLeaderboardHtml([]);
    elements.studentHome.innerHTML = `
      <div class="empty-state">
        <h3>Join an event to continue</h3>
        <p>Your rounds, team information, and live scores will appear here after joining.</p>
      </div>
    `;
  }
}

async function loadStudentDashboard(eventId) {
  if (!eventId) {
    return;
  }

  const result = await api(`/api/student/dashboard?event_id=${encodeURIComponent(eventId)}`, "GET");
  if (!result.ok) {
    showFlash(result.error || "Failed to load event dashboard");
    return;
  }

  currentStudentDashboard = result;
  currentStudentEventId = eventId;
  renderStudentDashboard();
}

function renderAdminEvents(events) {
  elements.adminEvents.innerHTML = "";

  if (!events.length) {
    elements.adminEvents.innerHTML = `<div class="empty-state"><h3>No events yet</h3><p>Create one from the admin form.</p></div>`;
    return;
  }

  events.forEach((event) => {
    const template = document.getElementById("event-card-template");
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".event-name").textContent = event.name;
    card.querySelector(".event-desc").textContent = event.description;
    card.querySelector(".status-pill").textContent = event.locked ? "Locked" : "Open";
    card.querySelector(".status-pill").classList.add(event.locked ? "locked" : "open");
    card.querySelector(".event-card-meta").innerHTML = `
      <span class="chip">${event.rounds.length} rounds</span>
      <span class="chip">${event.event_mode === "team" ? "Team Event" : "Solo Event"}</span>
      <span class="chip">${event.shuffle_questions ? "Shuffle ON" : "Shuffle OFF"}</span>
    `;

    const actions = card.querySelector(".event-card-actions");
    const actionRow = document.createElement("div");
    actionRow.className = "admin-action-row";

    actionRow.appendChild(buildActionButton(event.locked ? "Unlock Event" : "Lock Event", async () => {
      await api(`/api/admin/events/${event.id}/toggle-lock`, "POST");
      await loadAdminDashboard();
    }));
    actionRow.appendChild(buildActionButton("Reset Scores", async () => {
      await api(`/api/admin/events/${event.id}/reset`, "POST");
      await loadAdminDashboard();
    }, true));
    actionRow.appendChild(buildActionButton("Edit Structure", () => {
      loadEventIntoBuilder(event);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, true));
    actions.appendChild(actionRow);

    const roundControls = document.createElement("div");
    roundControls.className = "round-lock-list";
    roundControls.innerHTML = event.rounds.map((round, index) => `
      <div class="round-lock-item">
        <span>Round ${index + 1}: ${round.title}</span>
        <button
          type="button"
          class="${round.locked ? "ghost-btn" : "primary-btn"}"
          data-event-round-lock="${event.id}:${round.id}"
        >
          ${round.locked ? "Unlock Round" : "Lock Round"}
        </button>
      </div>
    `).join("");
    actions.appendChild(roundControls);

    elements.adminEvents.appendChild(card);
  });

  elements.adminEvents.querySelectorAll("[data-event-round-lock]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [eventId, roundId] = button.dataset.eventRoundLock.split(":");
      await api(`/api/admin/events/${eventId}/rounds/${roundId}/toggle-lock`, "POST");
      await loadAdminDashboard();
    });
  });
}

function renderStudentDashboard() {
  if (!currentStudentDashboard) {
    return;
  }

  const { event, participant, leaderboard } = currentStudentDashboard;
  elements.studentTitle.textContent = event.name;
  elements.studentTeamChip.textContent = participant.team_name;
  elements.studentLeaderboard.innerHTML = buildLeaderboardHtml(leaderboard || []);

  const currentRank = (leaderboard || []).findIndex((entry) => entry.participant_id === participant.id) + 1;
  const currentTeamRoundId = event.event_mode === "team"
    ? event.rounds.find((round) => !participant.attempts[round.id])?.id || null
    : null;

  elements.studentHome.innerHTML = `
    <div class="student-summary">
      <div>
        <h3>${participant.team_name}</h3>
        <p class="student-note">${event.description}</p>
        <p class="student-note">Team members: ${(participant.members || []).map((member) => member.name).join(", ") || "Only you"}</p>
        <p class="student-note">Mode: ${event.event_mode === "team" ? "Team event with sequential round progression" : "Solo event"}</p>
      </div>
      <div class="score-box">
        <strong>${participant.total_score}</strong>
        <div class="score-note">Current score</div>
      </div>
      <div class="score-box">
        <strong>#${currentRank || "-"}</strong>
        <div class="score-note">Leaderboard rank</div>
      </div>
    </div>
    ${event.rounds.map((round, index) => buildRoundEntry(round, participant.attempts[round.id], index, event, currentTeamRoundId)).join("")}
  `;

  elements.studentHome.querySelectorAll("[data-start-round]").forEach((button) => {
    button.addEventListener("click", () => startRound(button.dataset.startRound));
  });
}

function buildRoundEntry(round, attempt, index, event, currentTeamRoundId) {
  const teamLockedBySequence = event.event_mode === "team" && !attempt && currentTeamRoundId && currentTeamRoundId !== round.id;
  return `
    <article class="round-entry">
      <div class="round-entry-head">
        <div>
          <p class="panel-kicker">Round ${index + 1}</p>
          <h3>${round.title}</h3>
          <p class="round-desc">${round.description}</p>
        </div>
        <span class="chip">${round.type.toUpperCase()}</span>
      </div>
      <ul class="round-points">
        <li><strong>Status:</strong> ${attempt ? "Completed" : "Pending"}</li>
        <li><strong>Admin Access:</strong> ${round.locked ? "Locked" : "Open"}</li>
        ${event.event_mode === "team" ? `<li><strong>Team Sequence:</strong> ${currentTeamRoundId === round.id ? "Current round for the team" : (attempt ? "Already completed by team" : "Waiting for previous round")}</li>` : ""}
        <li><strong>Max Score:</strong> ${getRoundMaxMarks(round)}</li>
        ${attempt ? `<li><strong>Scored:</strong> ${attempt.score}</li>` : ""}
        ${attempt ? `<li><strong>Speed Bonus:</strong> ${attempt.speed_bonus}</li>` : ""}
        ${attempt?.language ? `<li><strong>Language:</strong> ${LANGUAGE_LABELS[attempt.language] || attempt.language}</li>` : ""}
      </ul>
      ${attempt
        ? `<p class="score-note">Submitted in ${attempt.elapsed}s with ${attempt.tab_switches} tab switches.</p>`
        : round.locked
          ? `<p class="score-note">This round is currently locked by admin.</p>`
          : teamLockedBySequence
            ? `<p class="score-note">For team events, only the next round in sequence can be attempted.</p>`
          : `<button type="button" class="primary-btn" data-start-round="${round.id}">Start Round</button>`}
    </article>
  `;
}

function renderAdminLeaderboard() {
  const filterOptions = [
    `<option value="all">All Events</option>`,
    ...adminOverviewState.events.map((event) => `
      <option value="${event.id}" ${adminOverviewState.selectedEventId === event.id ? "selected" : ""}>${event.name}</option>
    `)
  ].join("");

  const filteredEntries = adminOverviewState.selectedEventId === "all"
    ? adminOverviewState.leaderboard
    : adminOverviewState.leaderboard.filter((entry) => entry.event_id === adminOverviewState.selectedEventId);

  elements.adminLeaderboard.innerHTML = `
    <div class="leaderboard-toolbar">
      <label>
        Event Ranking
        <select id="admin-leaderboard-filter">${filterOptions}</select>
      </label>
    </div>
    ${buildLeaderboardHtml(filteredEntries, adminOverviewState.selectedEventId !== "all")}
  `;

  const filter = document.getElementById("admin-leaderboard-filter");
  if (filter) {
    filter.addEventListener("change", () => {
      adminOverviewState.selectedEventId = filter.value;
      renderAdminLeaderboard();
    });
  }
}

async function startRound(roundId) {
  const result = await api("/api/student/rounds/start", "POST", {
    event_id: currentStudentEventId,
    round_id: roundId
  });

  if (!result.ok) {
    showFlash(result.error || "Unable to start round");
    return;
  }

  activeRoundSession = {
    roundId,
    eventId: currentStudentEventId,
    round: result.round,
    remainingSeconds: ROUND_TIME_LIMIT,
    tabSwitches: 0
  };

  renderRoundScreen();
  elements.roundScreen.classList.remove("hidden");
  elements.roundScreen.setAttribute("aria-hidden", "false");

  if (document.fullscreenEnabled) {
    try {
      await elements.roundScreen.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen request failed", error);
    }
  }

  clearInterval(roundTimer);
  roundTimer = setInterval(() => {
    activeRoundSession.remainingSeconds -= 1;
    updateTimer();
    if (activeRoundSession.remainingSeconds <= 0) {
      submitActiveRound();
    }
  }, 1000);
}

function renderRoundScreen() {
  const { round } = activeRoundSession;
  elements.roundLabel.textContent = round.type === "coding" ? "Coding Round" : "Objective Round";
  elements.roundTitle.textContent = round.title;
  elements.roundTeam.textContent = currentStudentDashboard.participant.team_name;
  updateTimer();
  setRoundBanner("Fullscreen is requested when a round starts. Browsers cannot fully disable tab switching, so this app warns and applies penalties if the page is hidden during a live round.");

  if (round.type === "coding" || round.type === "debugging") {
    const codingQuestion = round.questions[0];
    const languageOptions = (codingQuestion.languages || ["javascript"]).map((language) => {
      const unavailable = codingQuestion.languageAvailability && codingQuestion.languageAvailability[language] === false;
      return `
        <option value="${language}" ${unavailable ? "disabled" : ""}>
          ${LANGUAGE_LABELS[language] || language}${unavailable ? " (Unavailable on server)" : ""}
        </option>
      `;
    }).join("");

    elements.roundForm.innerHTML = `
      <article class="question-block">
        <h3>${codingQuestion.prompt}</h3>
        <div class="coding-box">
          <div class="testcase-box">
            <strong>Instructions</strong>
            <p class="question-note">${codingQuestion.instructions}</p>
          </div>
          <label class="language-picker">
            Programming Language
            <select id="coding-language">${languageOptions}</select>
          </label>
          <textarea id="coding-answer" class="code-editor" spellcheck="false">${codingQuestion.starterCode}</textarea>
          <div class="compiler-bar">
            <span class="tag">Online Compiler</span>
            <span class="tag">Run before final submit</span>
          </div>
          <div id="compiler-output" class="compiler-output">
            <strong>Output</strong>
            <pre>Click "Run Code" to test your program before submitting.</pre>
          </div>
          <div class="testcase-box">
            <strong>Visible Test Cases</strong>
            <pre>${codingQuestion.visibleTestCases.map((item, index) => `Case ${index + 1}: solve(${item.input.join(", ")}) => ${item.expected}`).join("\n")}</pre>
          </div>
        </div>
      </article>
    `;

    const languageSelect = document.getElementById("coding-language");
    const firstAvailableLanguage = (codingQuestion.languages || []).find(
      (language) => codingQuestion.languageAvailability?.[language] !== false
    ) || "javascript";
    languageSelect.value = activeRoundSession.language || firstAvailableLanguage;
    activeRoundSession.language = languageSelect.value;
    elements.runCodeBtn.classList.remove("hidden");
    syncCodingTemplate();
    languageSelect.addEventListener("change", () => {
      activeRoundSession.language = languageSelect.value;
      syncCodingTemplate();
    });
    return;
  }

  elements.runCodeBtn.classList.add("hidden");

  if (round.type === "single-line" || round.type === "multi-line") {
    elements.roundForm.innerHTML = round.questions.map((question, questionIndex) => `
      <article class="question-block">
        <h3>Q${questionIndex + 1}. ${question.prompt}</h3>
        ${round.type === "single-line"
          ? `<input type="text" data-text-answer="${question.id}" placeholder="Type your answer here">`
          : `<textarea rows="5" data-text-answer="${question.id}" placeholder="Type your answer here"></textarea>`}
      </article>
    `).join("");
    return;
  }

  elements.roundForm.innerHTML = round.questions.map((question, questionIndex) => `
    <article class="question-block">
      <h3>Q${questionIndex + 1}. ${question.prompt}</h3>
      <div class="choices">
        ${question.options.map((option, optionIndex) => `
          <label class="choice">
            <input type="radio" name="question-${question.id}" value="${optionIndex}">
            <span>${option}</span>
          </label>
        `).join("")}
      </div>
    </article>
  `).join("");
}

async function submitActiveRound() {
  if (!activeRoundSession) {
    return;
  }

  let payload;
  if (activeRoundSession.round.type === "coding" || activeRoundSession.round.type === "debugging") {
    payload = {
      event_id: activeRoundSession.eventId,
      round_id: activeRoundSession.roundId,
      language: activeRoundSession.language || "javascript",
      code: document.getElementById("coding-answer")?.value || "",
      elapsed: ROUND_TIME_LIMIT - activeRoundSession.remainingSeconds,
      tab_switches: activeRoundSession.tabSwitches
    };
  } else if (activeRoundSession.round.type === "single-line" || activeRoundSession.round.type === "multi-line") {
    const answers = {};
    activeRoundSession.round.questions.forEach((question) => {
      answers[question.id] = document.querySelector(`[data-text-answer="${question.id}"]`)?.value || "";
    });
    payload = {
      event_id: activeRoundSession.eventId,
      round_id: activeRoundSession.roundId,
      answers,
      elapsed: ROUND_TIME_LIMIT - activeRoundSession.remainingSeconds,
      tab_switches: activeRoundSession.tabSwitches
    };
  } else {
    const answers = {};
    activeRoundSession.round.questions.forEach((question) => {
      const checked = document.querySelector(`input[name="question-${question.id}"]:checked`);
      answers[question.id] = checked ? Number(checked.value) : null;
    });
    payload = {
      event_id: activeRoundSession.eventId,
      round_id: activeRoundSession.roundId,
      answers,
      elapsed: ROUND_TIME_LIMIT - activeRoundSession.remainingSeconds,
      tab_switches: activeRoundSession.tabSwitches
    };
  }

  const result = await api("/api/student/rounds/submit", "POST", payload);
  if (!result.ok) {
    showFlash(result.error || "Round submission failed");
    return;
  }

  const eventId = activeRoundSession.eventId;
  closeRoundScreen();
  await loadStudentDashboard(eventId);
  showFlash(`Round submitted. Score: ${result.attempt.score}`);
}

function closeRoundScreen() {
  clearInterval(roundTimer);
  roundTimer = null;
  const exitingEventId = activeRoundSession?.eventId || currentStudentEventId;
  activeRoundSession = null;
  elements.roundScreen.classList.add("hidden");
  elements.roundScreen.setAttribute("aria-hidden", "true");
  elements.roundForm.innerHTML = "";
  elements.runCodeBtn.classList.add("hidden");

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  return exitingEventId;
}

function renderRoundBuilder() {
  elements.roundBuilderList.innerHTML = "";
  elements.builderEditingChip.classList.toggle("hidden", !builderState.editingEventId);
  elements.saveEventBtn.textContent = builderState.editingEventId ? "Update Event" : "Create Event";

  builderState.rounds.forEach((round, roundIndex) => {
    const roundCard = document.createElement("article");
    roundCard.className = "round-editor";
    roundCard.innerHTML = `
      <header class="builder-header">
        <div class="builder-title-row">
          <h3>Round ${roundIndex + 1}</h3>
          <span class="chip">${round.type.toUpperCase()}</span>
        </div>
        <div class="builder-actions">
          <button type="button" class="ghost-btn" data-add-question="${roundIndex}">Add Question</button>
          <button type="button" class="ghost-btn" data-remove-round="${roundIndex}">Remove Round</button>
        </div>
      </header>
      <div class="question-editor">
        <label class="full">
          Round Title
          <input data-round-field="title" data-round="${roundIndex}" value="${escapeAttribute(round.title)}">
        </label>
        <label class="full">
          Round Description
          <textarea data-round-field="description" data-round="${roundIndex}" rows="2">${escapeText(round.description || "")}</textarea>
        </label>
        <label>
          Round Type
          <select data-round-field="type" data-round="${roundIndex}">
            ${ROUND_TYPE_OPTIONS.map((option) => `<option value="${option.value}" ${option.value === round.type ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="builder-question-list" data-round-questions="${roundIndex}"></div>
    `;

    const questionList = roundCard.querySelector("[data-round-questions]");
    round.questions.forEach((question, questionIndex) => {
      questionList.appendChild(buildQuestionEditor(round, question, roundIndex, questionIndex));
    });

    elements.roundBuilderList.appendChild(roundCard);
  });

  bindBuilderEvents();
}

function buildQuestionEditor(round, question, roundIndex, questionIndex) {
  const wrapper = document.createElement("div");
  wrapper.className = "question-line";

  const commonTop = `
    <div class="builder-title-row full">
      <strong>Question ${questionIndex + 1}</strong>
      <button type="button" class="ghost-btn" data-remove-question="${roundIndex}:${questionIndex}">Remove Question</button>
    </div>
    <label class="full">
      Prompt
      <textarea data-question-field="prompt" data-round="${roundIndex}" data-question="${questionIndex}" rows="3">${escapeText(question.prompt || "")}</textarea>
    </label>
    <label>
      Marks
      <input type="number" min="1" data-question-field="marks" data-round="${roundIndex}" data-question="${questionIndex}" value="${question.marks || 10}">
    </label>
  `;

  if (round.type === "mcq") {
    wrapper.innerHTML = `
      ${commonTop}
      ${[0, 1, 2, 3].map((index) => `
        <label>
          Option ${index + 1}
          <input data-question-field="option-${index}" data-round="${roundIndex}" data-question="${questionIndex}" value="${escapeAttribute(question.options?.[index] || "")}">
        </label>
      `).join("")}
      <label>
        Correct Option Index
        <input type="number" min="0" max="3" data-question-field="answer" data-round="${roundIndex}" data-question="${questionIndex}" value="${question.answer ?? 0}">
      </label>
    `;
    return wrapper;
  }

  if (round.type === "single-line" || round.type === "multi-line") {
    wrapper.innerHTML = `
      ${commonTop}
      <label class="full">
        Correct Answer
        <textarea data-question-field="answer_text" data-round="${roundIndex}" data-question="${questionIndex}" rows="${round.type === "single-line" ? 2 : 4}">${escapeText(question.answer_text || "")}</textarea>
      </label>
    `;
    return wrapper;
  }

  wrapper.innerHTML = `
    ${commonTop}
    <label class="full">
      Starter Code
      <textarea class="code-editor" data-question-field="starterCode" data-round="${roundIndex}" data-question="${questionIndex}" rows="6">${escapeText(question.starterCode || "")}</textarea>
    </label>
    <label class="full">
      Test Cases JSON
      <textarea class="code-editor" data-question-field="testCases" data-round="${roundIndex}" data-question="${questionIndex}" rows="6">${escapeText(JSON.stringify(question.testCases || [{ input: [1, 2], expected: 3 }], null, 2))}</textarea>
    </label>
  `;
  return wrapper;
}

function collectRoundsFromBuilder() {
  return structuredClone(builderState.rounds);
}

function bindBuilderEvents() {
  elements.roundBuilderList.querySelectorAll("[data-round-field]").forEach((field) => {
    field.addEventListener("input", handleRoundFieldUpdate);
    field.addEventListener("change", handleRoundFieldUpdate);
  });

  elements.roundBuilderList.querySelectorAll("[data-question-field]").forEach((field) => {
    field.addEventListener("input", handleQuestionFieldUpdate);
    field.addEventListener("change", handleQuestionFieldUpdate);
  });

  elements.roundBuilderList.querySelectorAll("[data-add-question]").forEach((button) => {
    button.addEventListener("click", () => {
      const roundIndex = Number(button.dataset.addQuestion);
      const round = builderState.rounds[roundIndex];
      round.questions.push(createQuestion(round.type));
      renderRoundBuilder();
    });
  });

  elements.roundBuilderList.querySelectorAll("[data-remove-round]").forEach((button) => {
    button.addEventListener("click", () => {
      const roundIndex = Number(button.dataset.removeRound);
      builderState.rounds.splice(roundIndex, 1);
      if (builderState.rounds.length === 0) {
        builderState.rounds.push(createRound());
      }
      renderRoundBuilder();
    });
  });

  elements.roundBuilderList.querySelectorAll("[data-remove-question]").forEach((button) => {
    button.addEventListener("click", () => {
      const [roundIndex, questionIndex] = button.dataset.removeQuestion.split(":").map(Number);
      const round = builderState.rounds[roundIndex];
      round.questions.splice(questionIndex, 1);
      if (round.questions.length === 0) {
        round.questions.push(createQuestion(round.type));
      }
      renderRoundBuilder();
    });
  });
}

function handleRoundFieldUpdate(event) {
  const field = event.target;
  const round = builderState.rounds[Number(field.dataset.round)];
  const fieldName = field.dataset.roundField;
  if (!round) {
    return;
  }

  if (fieldName === "type") {
    round.type = field.value;
    round.questions = round.questions.map(() => createQuestion(round.type));
    renderRoundBuilder();
    return;
  }

  round[fieldName] = field.value;
}

function handleQuestionFieldUpdate(event) {
  const field = event.target;
  const round = builderState.rounds[Number(field.dataset.round)];
  const question = round?.questions?.[Number(field.dataset.question)];
  const fieldName = field.dataset.questionField;
  if (!question) {
    return;
  }

  if (fieldName.startsWith("option-")) {
    const optionIndex = Number(fieldName.split("-")[1]);
    question.options = question.options || ["", "", "", ""];
    question.options[optionIndex] = field.value;
    return;
  }

  if (fieldName === "marks" || fieldName === "answer") {
    question[fieldName] = Number(field.value || 0);
    return;
  }

  if (fieldName === "testCases") {
    question.testCasesText = field.value;
    try {
      question.testCases = JSON.parse(field.value);
    } catch (error) {}
    return;
  }

  question[fieldName] = field.value;
}

function resetBuilder() {
  builderState = {
    editingEventId: null,
    rounds: structuredClone(DEFAULT_ROUNDS)
  };
  elements.eventForm.reset();
  elements.eventMode.value = "solo";
  elements.builderModeTitle.textContent = "Round Builder";
  renderRoundBuilder();
}

function loadEventIntoBuilder(event) {
  builderState = {
    editingEventId: event.id,
    rounds: structuredClone(event.rounds).map(normalizeRoundForBuilder)
  };
  document.getElementById("event-name").value = event.name;
  document.getElementById("event-description").value = event.description;
  document.getElementById("shuffle-questions").value = event.shuffle_questions ? "true" : "false";
  elements.eventMode.value = event.event_mode || "solo";
  elements.builderModeTitle.textContent = `Editing ${event.name}`;
  renderRoundBuilder();
}

function createRound(type = "mcq") {
  return normalizeRoundForBuilder({
    id: `round-${crypto.randomUUID()}`,
    title: "New Round",
    description: "Describe this round",
    type,
    locked: false,
    questions: [createQuestion(type)]
  });
}

function createQuestion(type = "mcq") {
  const base = {
    id: `q-${crypto.randomUUID()}`,
    prompt: "",
    marks: type === "coding" || type === "debugging" ? 100 : 10
  };

  if (type === "mcq") {
    return {
      ...base,
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      answer: 0
    };
  }

  if (type === "single-line" || type === "multi-line") {
    return {
      ...base,
      answer_text: ""
    };
  }

  return {
    ...base,
    starterCode: "function solve(a, b) {\n  return a + b;\n}",
    testCases: [{ input: [1, 2], expected: 3 }]
  };
}

function normalizeRoundForBuilder(round) {
  return {
    id: round.id || `round-${crypto.randomUUID()}`,
    title: round.title || "New Round",
    description: round.description || "",
    type: round.type || "mcq",
    locked: Boolean(round.locked),
    questions: (round.questions || [createQuestion(round.type || "mcq")]).map((question) => normalizeQuestionForBuilder(round.type || "mcq", question))
  };
}

function normalizeQuestionForBuilder(type, question) {
  if (type === "mcq") {
    return {
      id: question.id || `q-${crypto.randomUUID()}`,
      prompt: question.prompt || "",
      marks: question.marks || 10,
      options: question.options || ["Option 1", "Option 2", "Option 3", "Option 4"],
      answer: Number(question.answer ?? 0)
    };
  }

  if (type === "single-line" || type === "multi-line") {
    return {
      id: question.id || `q-${crypto.randomUUID()}`,
      prompt: question.prompt || "",
      marks: question.marks || 10,
      answer_text: question.answer_text || ""
    };
  }

  return {
    id: question.id || `q-${crypto.randomUUID()}`,
    prompt: question.prompt || "",
    marks: question.marks || 100,
    starterCode: question.starterCode || "function solve(a, b) {\n  return a + b;\n}",
    testCases: Array.isArray(question.testCases) ? question.testCases : [{ input: [1, 2], expected: 3 }]
  };
}

function buildActionButton(label, onClick, ghost = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ghost ? "ghost-btn" : "primary-btn";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function buildLeaderboardHtml(entries, eventWise = false) {
  if (!entries.length) {
    return `<div class="empty-state"><h3>No teams yet</h3><p>Leaderboard updates automatically after round submissions.</p></div>`;
  }

  return entries.map((entry, index) => `
    <div class="leader-row ${index === 0 ? "topper" : ""}">
      <div>
        <strong>#${index + 1} ${entry.team_name}</strong>
        <span>${eventWise ? `${entry.event_name} • Event rank ${index + 1}` : entry.event_name}</span>
      </div>
      <div>
        <strong>${entry.total_score}</strong>
        <span>${entry.completed_rounds} rounds completed</span>
      </div>
    </div>
  `).join("");
}

function getRoundMaxMarks(round) {
  return round.questions.reduce((sum, question) => sum + question.marks, 0);
}

function updateTimer() {
  const remaining = Math.max(activeRoundSession?.remainingSeconds ?? 0, 0);
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  elements.roundTimer.textContent = `${minutes}:${seconds}`;
}

function setRoundBanner(text) {
  const banner = document.querySelector(".warning-banner");
  if (banner) {
    banner.textContent = text;
  }
}

function showFlash(message) {
  elements.flashMessage.textContent = message;
  elements.flashMessage.classList.remove("hidden");
  clearTimeout(showFlash.timeoutId);
  showFlash.timeoutId = setTimeout(() => {
    elements.flashMessage.classList.add("hidden");
  }, 3000);
}

function syncCodingTemplate() {
  if (!activeRoundSession || activeRoundSession.round.type !== "coding") {
    return;
  }

  const codingQuestion = activeRoundSession.round.questions[0];
  const editor = document.getElementById("coding-answer");
  if (!editor) {
    return;
  }

  const selectedLanguage = activeRoundSession.language || "javascript";
  const templates = codingQuestion.starterTemplates || {};
  editor.value = templates[selectedLanguage] || codingQuestion.starterCode || "";
}

async function runCodePreview() {
  if (!activeRoundSession || activeRoundSession.round.type !== "coding") {
    return;
  }

  const output = document.getElementById("compiler-output");
  if (!output) {
    return;
  }

  output.innerHTML = `<strong>Output</strong><pre>Running...</pre>`;
  const result = await api("/api/student/rounds/run", "POST", {
    event_id: activeRoundSession.eventId,
    round_id: activeRoundSession.roundId,
    language: activeRoundSession.language || "javascript",
    code: document.getElementById("coding-answer")?.value || ""
  });

  if (!result.ok) {
    output.innerHTML = `<strong>Output</strong><pre>${escapeHtml(result.error || "Unable to run code.")}</pre>`;
    return;
  }

  const lines = [
    `Language: ${LANGUAGE_LABELS[result.language] || result.language}`,
    `Passed: ${result.passed}/${result.total}`,
    `Preview Score: ${result.preview_score}`,
    "",
    result.output || "Program executed successfully."
  ];
  output.innerHTML = `<strong>Output</strong><pre>${escapeHtml(lines.join("\n"))}</pre>`;
}

async function api(url, method, body) {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined
    });

    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: "Network error. Start the backend server and try again."
    };
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value || "")).replaceAll('"', "&quot;");
}

function escapeText(value) {
  return escapeHtml(String(value || ""));
}
