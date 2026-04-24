const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { spawnSync } = require("node:child_process");
const { MongoClient } = require("mongodb");

const BASE_DIR = __dirname;
const SESSION_COOKIE = "arena_session";
const ROUND_TIME_LIMIT = 180;
const TAB_SWITCH_PENALTY = 15;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/event";
const LANGUAGE_CONFIG = detectLanguageSupport();

const DEFAULT_ROUNDS = [
  {
    id: "round-1",
    title: "Round 1 - Aptitude Sprint",
    type: "mcq",
    description: "Quick multiple-choice aptitude questions.",
    locked: false,
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
    locked: false,
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
      }
    ]
  },
  {
    id: "round-3",
    title: "Round 3 - Writing Round",
    type: "single-line",
    description: "Short text answer round.",
    locked: false,
    questions: [
      {
        id: "q5",
        prompt: "Which structure works in FIFO order?",
        answer_text: "queue",
        marks: 30
      }
    ]
  },
  {
    id: "round-4",
    title: "Round 4 - Coding Round",
    type: "coding",
    description: "Write a function and pass the test cases.",
    locked: false,
    questions: [
      {
        id: "code-1",
        prompt: "Create a function named solve that returns the sum of two numbers.",
        starterCode: "function solve(a, b) {\n  return a + b;\n}",
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

let mongoClient;
let db;
let collections;

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

async function start() {
  mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  db = mongoClient.db();
  collections = {
    users: db.collection("users"),
    sessions: db.collection("sessions"),
    events: db.collection("events"),
    participants: db.collection("participants"),
    participantMembers: db.collection("participant_members"),
    attempts: db.collection("attempts")
  };

  await ensureIndexes();
  await seedDefaults();

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://127.0.0.1:8000");
      if (requestUrl.pathname.startsWith("/api/")) {
        await routeApi(req, res, requestUrl);
        return;
      }
      serveStatic(res, requestUrl.pathname);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { ok: false, error: "Internal server error" });
    }
  });

  const PORT = process.env.PORT || 8000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Auto Event Arena running on port ${PORT}`);
});
}

async function ensureIndexes() {
  await collections.users.createIndex({ email: 1 }, { unique: true });
  await collections.sessions.createIndex({ token: 1 }, { unique: true });
  await collections.events.createIndex({ created_at: -1 });
  await collections.participants.createIndex({ event_id: 1, team_name_lower: 1 });
  await collections.participantMembers.createIndex({ participant_id: 1, user_id: 1 }, { unique: true });
  await collections.participantMembers.createIndex({ user_id: 1, event_id: 1 }, { unique: true });
  await collections.attempts.createIndex({ participant_id: 1, round_id: 1 }, { unique: true });
}

async function seedDefaults() {
  const admin = await collections.users.findOne({ email: "admin@arena.com" });
  if (admin) {
    return;
  }

  const adminId = crypto.randomUUID();
  await collections.users.insertOne({
    _id: adminId,
    name: "Arena Admin",
    email: "admin@arena.com",
    password_hash: hashPassword("admin123"),
    role: "admin",
    created_at: nowIso()
  });

  await collections.events.insertOne({
    _id: crypto.randomUUID(),
    name: "Code Clash",
    description: "Automatic 4-round inter-college event",
    event_mode: "solo",
    shuffle_questions: true,
    locked: false,
    rounds: structuredClone(DEFAULT_ROUNDS),
    created_by: adminId,
    created_at: nowIso()
  });
}

async function routeApi(req, res, requestUrl) {
  if (req.method === "GET" && requestUrl.pathname === "/api/bootstrap") {
    return sendJson(res, 200, { ok: true, user: await currentUser(req) });
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/register") {
    const body = await readJson(req);
    if (!body.name || !body.email || !body.password || !body.role) {
      return sendJson(res, 400, { ok: false, error: "All fields are required" });
    }

    try {
      await collections.users.insertOne({
        _id: crypto.randomUUID(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        password_hash: hashPassword(body.password),
        role: body.role,
        created_at: nowIso()
      });
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 409, { ok: false, error: "Email already exists" });
    }
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/login") {
    const body = await readJson(req);
    const user = await collections.users.findOne({ email: (body.email || "").trim().toLowerCase() });
    if (!user || !verifyPassword(body.password || "", user.password_hash)) {
      return sendJson(res, 401, { ok: false, error: "Invalid email or password" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    await collections.sessions.insertOne({
      _id: crypto.randomUUID(),
      token,
      user_id: user._id,
      created_at: nowIso()
    });

    return sendJson(res, 200, { ok: true }, [
      `Set-Cookie: ${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax`
    ]);
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/logout") {
    const token = sessionToken(req);
    if (token) {
      await collections.sessions.deleteOne({ token });
    }
    return sendJson(res, 200, { ok: true }, [
      `Set-Cookie: ${SESSION_COOKIE}=deleted; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    ]);
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/admin/overview") {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const events = await collections.events.find({}).sort({ created_at: -1 }).toArray();
    return sendJson(res, 200, {
      ok: true,
      events: events.map(serializeEvent),
      leaderboard: await leaderboardForEvent()
    });
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/admin/database") {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const users = await collections.users.find({}, { projection: { password_hash: 0 } }).limit(20).toArray();
    const events = await collections.events.find({}).limit(20).toArray();
    const participants = await collections.participants.find({}).limit(20).toArray();
    const participantMembers = await collections.participantMembers.find({}).limit(20).toArray();
    const attempts = await collections.attempts.find({}).limit(20).toArray();
    const sessions = await collections.sessions.find({}).limit(20).toArray();

    return sendJson(res, 200, {
      ok: true,
      database: {
        name: db.databaseName,
        uri: MONGO_URI
      },
      collections: [
        { key: "users", label: "Users", count: await collections.users.countDocuments() },
        { key: "events", label: "Events", count: await collections.events.countDocuments() },
        { key: "participants", label: "Participants", count: await collections.participants.countDocuments() },
        { key: "participant_members", label: "Participant Members", count: await collections.participantMembers.countDocuments() },
        { key: "attempts", label: "Attempts", count: await collections.attempts.countDocuments() },
        { key: "sessions", label: "Sessions", count: await collections.sessions.countDocuments() }
      ],
      tables: {
        users,
        events,
        participants,
        participant_members: participantMembers,
        attempts,
        sessions
      }
    });
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/admin/events") {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const body = await readJson(req);
    if (!body.name || !Array.isArray(body.rounds) || body.rounds.length === 0) {
      return sendJson(res, 400, { ok: false, error: "Event name and rounds are required" });
    }

    await collections.events.insertOne({
      _id: crypto.randomUUID(),
      name: body.name.trim(),
      description: (body.description || "").trim() || "Automatic event created from admin dashboard",
      event_mode: body.event_mode === "team" ? "team" : "solo",
      shuffle_questions: Boolean(body.shuffle_questions),
      locked: false,
      rounds: normalizeRounds(body.rounds),
      created_by: user.id,
      created_at: nowIso()
    });

    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && /\/api\/admin\/events\/[^/]+\/update$/.test(requestUrl.pathname)) {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const body = await readJson(req);
    const eventId = requestUrl.pathname.split("/")[4];
    const event = await collections.events.findOne({ _id: eventId });
    if (!event) {
      return sendJson(res, 404, { ok: false, error: "Event not found" });
    }

    await collections.events.updateOne(
      { _id: eventId },
      {
        $set: {
          name: body.name.trim(),
          description: (body.description || "").trim() || "Automatic event updated from admin dashboard",
          event_mode: body.event_mode === "team" ? "team" : "solo",
          shuffle_questions: Boolean(body.shuffle_questions),
          rounds: normalizeRounds(body.rounds)
        }
      }
    );
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && /\/api\/admin\/events\/[^/]+\/toggle-lock$/.test(requestUrl.pathname)) {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const eventId = requestUrl.pathname.split("/")[4];
    const event = await collections.events.findOne({ _id: eventId });
    if (!event) {
      return sendJson(res, 404, { ok: false, error: "Event not found" });
    }
    await collections.events.updateOne({ _id: eventId }, { $set: { locked: !Boolean(event.locked) } });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && /\/api\/admin\/events\/[^/]+\/rounds\/[^/]+\/toggle-lock$/.test(requestUrl.pathname)) {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const [, , , , eventId, , roundId] = requestUrl.pathname.split("/");
    const event = await collections.events.findOne({ _id: eventId });
    if (!event) {
      return sendJson(res, 404, { ok: false, error: "Event not found" });
    }

    const rounds = event.rounds.map((round) => (
      round.id === roundId ? { ...round, locked: !Boolean(round.locked) } : round
    ));
    await collections.events.updateOne({ _id: eventId }, { $set: { rounds } });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && /\/api\/admin\/events\/[^/]+\/reset$/.test(requestUrl.pathname)) {
    const user = await requireRole(req, res, "admin");
    if (!user) {
      return;
    }

    const eventId = requestUrl.pathname.split("/")[4];
    await collections.attempts.deleteMany({ event_id: eventId });
    await collections.participants.updateMany({ event_id: eventId }, { $set: { total_score: 0 } });
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/student/overview") {
    const user = await requireRole(req, res, "student");
    if (!user) {
      return;
    }

    const availableEvents = await collections.events.find({ locked: false }).sort({ created_at: -1 }).project({
      _id: 1,
      name: 1,
      event_mode: 1
    }).toArray();

    const memberRows = await collections.participantMembers.find({ user_id: user.id }).sort({ joined_at: -1 }).toArray();
    const participantIds = memberRows.map((row) => row.participant_id);
    const participants = participantIds.length
      ? await collections.participants.find({ _id: { $in: participantIds } }).toArray()
      : [];
    const eventMap = new Map((await collections.events.find({ _id: { $in: participants.map((item) => item.event_id) } }).toArray())
      .map((item) => [item._id, item]));

    return sendJson(res, 200, {
      ok: true,
      available_events: availableEvents.map((event) => ({
        id: event._id,
        name: event.name,
        event_mode: event.event_mode || "solo"
      })),
      participants: participants.map((participant) => ({
        id: participant._id,
        event_id: participant.event_id,
        team_name: participant.team_name,
        total_score: participant.total_score,
        event_name: eventMap.get(participant.event_id)?.name || "Unknown Event"
      }))
    });
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/student/join") {
    const user = await requireRole(req, res, "student");
    if (!user) {
      return;
    }

    const body = await readJson(req);
    if (!body.event_id || !body.team_name) {
      return sendJson(res, 400, { ok: false, error: "Event and team name are required" });
    }

    const event = await collections.events.findOne({ _id: body.event_id, locked: false });
    if (!event) {
      return sendJson(res, 404, { ok: false, error: "Event is unavailable" });
    }

    const existingMembership = await collections.participantMembers.findOne({
      user_id: user.id,
      event_id: body.event_id
    });
    if (existingMembership) {
      return sendJson(res, 200, { ok: true, participant_id: existingMembership.participant_id });
    }

    const teamName = body.team_name.trim();
    let participant = null;
    if ((event.event_mode || "solo") === "team") {
      participant = await collections.participants.findOne({
        event_id: body.event_id,
        team_name_lower: teamName.toLowerCase()
      });
    }

    if (!participant) {
      const participantId = crypto.randomUUID();
      participant = {
        _id: participantId,
        owner_user_id: user.id,
        event_id: body.event_id,
        team_name: teamName,
        team_name_lower: teamName.toLowerCase(),
        total_score: 0,
        joined_at: nowIso()
      };
      await collections.participants.insertOne(participant);
    }

    await collections.participantMembers.updateOne(
      { participant_id: participant._id, user_id: user.id },
      {
        $setOnInsert: {
          _id: crypto.randomUUID(),
          participant_id: participant._id,
          user_id: user.id,
          event_id: body.event_id,
          joined_at: nowIso()
        }
      },
      { upsert: true }
    );

    return sendJson(res, 200, { ok: true, participant_id: participant._id });
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/student/dashboard") {
    const user = await requireRole(req, res, "student");
    if (!user) {
      return;
    }

    const eventId = requestUrl.searchParams.get("event_id");
    if (!eventId) {
      return sendJson(res, 400, { ok: false, error: "Event is required" });
    }

    const event = await collections.events.findOne({ _id: eventId });
    const participant = await participantForUserAndEvent(user.id, eventId);
    if (!event || !participant) {
      return sendJson(res, 404, { ok: false, error: "Join the event first" });
    }

    return sendJson(res, 200, {
      ok: true,
      event: serializeEvent(event),
      participant: {
        id: participant._id,
        event_id: participant.event_id,
        team_name: participant.team_name,
        total_score: participant.total_score,
        attempts: await participantAttempts(participant._id),
        members: await participantMembers(participant._id)
      },
      leaderboard: await leaderboardForEvent(eventId)
    });
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/student/rounds/start") {
    const user = await requireRole(req, res, "student");
    if (!user) {
      return;
    }

    const body = await readJson(req);
    const event = await collections.events.findOne({ _id: body.event_id });
    const participant = await participantForUserAndEvent(user.id, body.event_id);
    if (!event || !participant) {
      return sendJson(res, 404, { ok: false, error: "Join the event first" });
    }

    const existing = await collections.attempts.findOne({ participant_id: participant._id, round_id: body.round_id });
    if (existing) {
      return sendJson(res, 409, { ok: false, error: "Round already completed" });
    }

    const round = event.rounds.find((item) => item.id === body.round_id);
    if (!round) {
      return sendJson(res, 404, { ok: false, error: "Round not found" });
    }
    if (round.locked) {
      return sendJson(res, 403, { ok: false, error: "This round is locked by admin" });
    }
    if ((event.event_mode || "solo") === "team") {
      const nextRoundId = await nextAvailableTeamRoundId(event, participant._id);
      if (nextRoundId && nextRoundId !== body.round_id) {
        return sendJson(res, 403, { ok: false, error: "For team events, only the next round in sequence can be attempted." });
      }
    }

    return sendJson(res, 200, { ok: true, round: publicRound(round, event.shuffle_questions) });
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/student/rounds/run") {
    const user = await requireRole(req, res, "student");
    if (!user) {
      return;
    }

    const body = await readJson(req);
    const event = await collections.events.findOne({ _id: body.event_id });
    const participant = await participantForUserAndEvent(user.id, body.event_id);
    if (!event || !participant) {
      return sendJson(res, 404, { ok: false, error: "Join the event first" });
    }

    const round = event.rounds.find((item) => item.id === body.round_id);
    if (!round || !["coding", "debugging"].includes(round.type)) {
      return sendJson(res, 404, { ok: false, error: "Coding round not found" });
    }
    if (round.locked) {
      return sendJson(res, 403, { ok: false, error: "This round is locked by admin" });
    }
    if ((event.event_mode || "solo") === "team") {
      const nextRoundId = await nextAvailableTeamRoundId(event, participant._id);
      if (nextRoundId && nextRoundId !== body.round_id) {
        return sendJson(res, 403, { ok: false, error: "For team events, only the next round in sequence can be opened." });
      }
    }

    const preview = previewCoding(round.questions[0], body.code || "", body.language || "javascript");
    if (!preview.ok) {
      return sendJson(res, 400, preview);
    }
    return sendJson(res, 200, preview);
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/student/rounds/submit") {
    const user = await requireRole(req, res, "student");
    if (!user) {
      return;
    }

    const body = await readJson(req);
    const event = await collections.events.findOne({ _id: body.event_id });
    const participant = await participantForUserAndEvent(user.id, body.event_id);
    if (!event || !participant) {
      return sendJson(res, 404, { ok: false, error: "Join the event first" });
    }

    const existing = await collections.attempts.findOne({ participant_id: participant._id, round_id: body.round_id });
    if (existing) {
      return sendJson(res, 409, { ok: false, error: "Round already completed" });
    }

    const round = event.rounds.find((item) => item.id === body.round_id);
    if (!round) {
      return sendJson(res, 404, { ok: false, error: "Round not found" });
    }
    if (round.locked) {
      return sendJson(res, 403, { ok: false, error: "This round is locked by admin" });
    }
    if ((event.event_mode || "solo") === "team") {
      const nextRoundId = await nextAvailableTeamRoundId(event, participant._id);
      if (nextRoundId && nextRoundId !== body.round_id) {
        return sendJson(res, 403, { ok: false, error: "For team events, only the next round in sequence can be submitted." });
      }
    }

    const elapsed = Math.max(0, Math.min(Number(body.elapsed || ROUND_TIME_LIMIT), ROUND_TIME_LIMIT));
    const tabSwitches = Math.max(0, Number(body.tab_switches || 0));
    const maxMarks = round.questions.reduce((sum, question) => sum + Number(question.marks || 0), 0);

    let rawScore = 0;
    let details = {};
    if (["coding", "debugging"].includes(round.type)) {
      rawScore = evaluateCoding(round.questions[0], body.code || "", body.language || "javascript");
      details = { code_submitted: true, language: body.language || "javascript" };
    } else if (["single-line", "multi-line"].includes(round.type)) {
      const answers = body.answers || {};
      for (const question of round.questions) {
        if (normalizeAnswer(answers[question.id]) === normalizeAnswer(question.answer_text)) {
          rawScore += Number(question.marks || 0);
        }
      }
      details = { answers };
    } else {
      const answers = body.answers || {};
      for (const question of round.questions) {
        if (Number(answers[question.id]) === Number(question.answer)) {
          rawScore += Number(question.marks || 0);
        }
      }
      details = { answers };
    }

    const bonus = speedBonus(rawScore, maxMarks, elapsed);
    const penalties = tabSwitches * TAB_SWITCH_PENALTY;
    const finalScore = Math.max(0, rawScore + bonus - penalties);

    await collections.attempts.insertOne({
      _id: crypto.randomUUID(),
      participant_id: participant._id,
      event_id: event._id,
      round_id: round.id,
      score: finalScore,
      raw_score: rawScore,
      speed_bonus: bonus,
      penalties,
      elapsed,
      tab_switches: tabSwitches,
      details_json: details,
      submitted_at: nowIso()
    });

    const totalScore = await recalculateParticipantTotal(participant._id);
    return sendJson(res, 200, {
      ok: true,
      attempt: {
        score: finalScore,
        raw_score: rawScore,
        speed_bonus: bonus,
        penalties,
        elapsed,
        tab_switches: tabSwitches,
        total_score: totalScore
      }
    });
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
}

async function currentUser(req) {
  const token = sessionToken(req);
  if (!token) {
    return null;
  }

  const session = await collections.sessions.findOne({ token });
  if (!session) {
    return null;
  }

  const user = await collections.users.findOne(
    { _id: session.user_id },
    { projection: { password_hash: 0 } }
  );
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

async function requireRole(req, res, role) {
  const user = await currentUser(req);
  if (!user || user.role !== role) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return user;
}

function sessionToken(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookieMap = Object.fromEntries(cookieHeader.split(";").filter(Boolean).map((pair) => {
    const index = pair.indexOf("=");
    return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()];
  }));
  return cookieMap[SESSION_COOKIE] || null;
}

function serializeEvent(event) {
  return {
    id: event._id,
    name: event.name,
    description: event.description,
    event_mode: event.event_mode || "solo",
    shuffle_questions: Boolean(event.shuffle_questions),
    locked: Boolean(event.locked),
    rounds: normalizeRounds(event.rounds || [])
  };
}

function normalizeRounds(rounds) {
  return (rounds || []).map((round, roundIndex) => ({
    id: round.id || `round-${roundIndex + 1}`,
    title: round.title || `Round ${roundIndex + 1}`,
    type: round.type || "mcq",
    description: round.description || "",
    locked: Boolean(round.locked),
    questions: normalizeQuestions(round.type || "mcq", round.questions || [])
  }));
}

function normalizeQuestions(type, questions) {
  return questions.map((question, index) => {
    const base = {
      id: question.id || `q-${index + 1}`,
      prompt: question.prompt || "",
      marks: Number(question.marks || 10)
    };

    if (type === "mcq") {
      return {
        ...base,
        options: question.options || ["Option 1", "Option 2", "Option 3", "Option 4"],
        answer: Number(question.answer || 0)
      };
    }

    if (type === "single-line" || type === "multi-line") {
      return {
        ...base,
        answer_text: question.answer_text || ""
      };
    }

    return {
      ...base,
      starterCode: question.starterCode || "function solve(a, b) {\n  return a + b;\n}",
      testCases: Array.isArray(question.testCases) ? question.testCases : [{ input: [1, 2], expected: 3 }]
    };
  });
}

function publicRound(round, shuffleQuestions) {
  const questions = JSON.parse(JSON.stringify(round.questions));
  if (shuffleQuestions && round.type === "mcq") {
    shuffleArray(questions);
  }

  if (["coding", "debugging"].includes(round.type)) {
    const question = questions[0];
    const starterTemplates = getStarterTemplates(question);
    return {
      id: round.id,
      title: round.title,
      type: round.type,
      description: round.description,
      locked: Boolean(round.locked),
      questions: [
        {
          id: question.id,
          prompt: question.prompt,
          starterCode: starterTemplates.javascript,
          starterTemplates,
          marks: question.marks,
          visibleTestCases: question.testCases,
          languages: ["javascript", "python", "java", "c"],
          languageAvailability: LANGUAGE_CONFIG,
          instructions: round.type === "debugging"
            ? "Fix the buggy code in the selected language and make the test cases pass."
            : "Write the required solve function in the selected language. Java should expose static solve(a, b) inside class Main. C should expose int solve(int a, int b). Python should expose def solve(a, b)."
        }
      ]
    };
  }

  for (const question of questions) {
    delete question.answer;
    delete question.answer_text;
  }

  return {
    id: round.id,
    title: round.title,
    type: round.type,
    description: round.description,
    locked: Boolean(round.locked),
    questions
  };
}

async function participantForUserAndEvent(userId, eventId) {
  const membership = await collections.participantMembers.findOne({ user_id: userId, event_id: eventId });
  if (!membership) {
    return null;
  }
  return collections.participants.findOne({ _id: membership.participant_id });
}

async function participantMembers(participantId) {
  const memberships = await collections.participantMembers.find({ participant_id: participantId }).toArray();
  if (!memberships.length) {
    return [];
  }
  const users = await collections.users.find(
    { _id: { $in: memberships.map((item) => item.user_id) } },
    { projection: { password_hash: 0 } }
  ).toArray();
  return users.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email
  }));
}

async function participantAttempts(participantId) {
  const attempts = await collections.attempts.find({ participant_id: participantId }).toArray();
  return Object.fromEntries(attempts.map((attempt) => [
    attempt.round_id,
    {
      round_id: attempt.round_id,
      score: attempt.score,
      raw_score: attempt.raw_score,
      speed_bonus: attempt.speed_bonus,
      penalties: attempt.penalties,
      elapsed: attempt.elapsed,
      tab_switches: attempt.tab_switches,
      language: attempt.details_json?.language || null
    }
  ]));
}

async function leaderboardForEvent(eventId = null) {
  const participantFilter = eventId ? { event_id: eventId } : {};
  const participants = await collections.participants.find(participantFilter).toArray();
  if (!participants.length) {
    return [];
  }

  const eventIds = [...new Set(participants.map((item) => item.event_id))];
  const events = await collections.events.find({ _id: { $in: eventIds } }).toArray();
  const eventMap = new Map(events.map((event) => [event._id, event]));

  const attempts = await collections.attempts.find({
    participant_id: { $in: participants.map((item) => item._id) }
  }).toArray();

  const attemptsByParticipant = new Map();
  for (const attempt of attempts) {
    const list = attemptsByParticipant.get(attempt.participant_id) || [];
    list.push(attempt);
    attemptsByParticipant.set(attempt.participant_id, list);
  }

  return participants
    .map((participant) => {
      const participantAttemptsList = attemptsByParticipant.get(participant._id) || [];
      const bestElapsed = participantAttemptsList.length
        ? Math.min(...participantAttemptsList.map((item) => item.elapsed))
        : 999999;

      return {
        participant_id: participant._id,
        team_name: participant.team_name,
        total_score: participant.total_score || 0,
        event_id: participant.event_id,
        event_name: eventMap.get(participant.event_id)?.name || "Unknown Event",
        completed_rounds: participantAttemptsList.length,
        best_elapsed: bestElapsed,
        joined_at: participant.joined_at
      };
    })
    .sort((a, b) => b.total_score - a.total_score || a.best_elapsed - b.best_elapsed || a.joined_at.localeCompare(b.joined_at));
}

async function nextAvailableTeamRoundId(event, participantId) {
  const attempts = await participantAttempts(participantId);
  const nextRound = event.rounds.find((round) => !attempts[round.id]);
  return nextRound ? nextRound.id : null;
}

async function recalculateParticipantTotal(participantId) {
  const attempts = await collections.attempts.find({ participant_id: participantId }).toArray();
  const total = attempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0);
  await collections.participants.updateOne({ _id: participantId }, { $set: { total_score: total } });
  return total;
}

function previewCoding(question, code, language) {
  if (!LANGUAGE_CONFIG[language]) {
    return { ok: false, error: `${language.toUpperCase()} runtime is not available on this server.` };
  }
  if (language === "javascript") {
    return executeJavascript(question, code);
  }
  if (language === "python") {
    return executePython(question, code);
  }
  if (language === "java") {
    return executeJava(question, code);
  }
  if (language === "c") {
    return executeC(question, code);
  }
  return { ok: false, error: "Unsupported language." };
}

function evaluateCoding(question, code, language) {
  const result = previewCoding(question, code, language);
  if (!result.ok) {
    return 0;
  }
  return Math.round((result.passed / Math.max(result.total, 1)) * question.marks);
}

function executeJavascript(question, code) {
  const tempPath = path.join(BASE_DIR, `temp-${crypto.randomUUID()}.js`);
  try {
    const script = `
${code}
if (typeof solve !== "function") {
  console.log(JSON.stringify({ passed: 0, total: ${question.testCases.length}, output: "solve function not found" }));
  process.exit(0);
}
const tests = ${JSON.stringify(question.testCases)};
let passed = 0;
const output = [];
for (const test of tests) {
  try {
    const result = solve(...test.input);
    output.push("input=" + JSON.stringify(test.input) + " result=" + JSON.stringify(result) + " expected=" + JSON.stringify(test.expected));
    if (JSON.stringify(result) === JSON.stringify(test.expected)) {
      passed += 1;
    }
  } catch (error) {
    output.push("error=" + error.message);
  }
}
console.log(JSON.stringify({ passed, total: tests.length, output: output.join("\\n") }));
`;
    fs.writeFileSync(tempPath, script, "utf8");
    const result = spawnSync("node", [tempPath], { encoding: "utf8", timeout: 5000 });
    const parsed = safeJsonParse((result.stdout || "").trim(), {});
    const passed = Number(parsed.passed || 0);
    const total = Math.max(Number(parsed.total || question.testCases.length), 1);
    return {
      ok: true,
      language: "javascript",
      passed,
      total,
      preview_score: Math.round((passed / total) * question.marks),
      output: parsed.output || ""
    };
  } catch (error) {
    return { ok: false, error: "JavaScript execution failed." };
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function executePython(question, code) {
  const tempPath = path.join(BASE_DIR, `temp-${crypto.randomUUID()}.py`);
  try {
    const script = `
${code}
import json
tests = ${JSON.stringify(question.testCases)}
if 'solve' not in globals():
    print(json.dumps({"passed": 0, "total": len(tests), "output": "solve function not found"}))
    raise SystemExit(0)
passed = 0
logs = []
for test in tests:
    try:
        result = solve(*test["input"])
        logs.append(f'input={test["input"]} result={result} expected={test["expected"]}')
        if result == test["expected"]:
            passed += 1
    except Exception:
        logs.append("runtime error")
print(json.dumps({"passed": passed, "total": len(tests), "output": "\\n".join(logs)}))
`;
    fs.writeFileSync(tempPath, script, "utf8");
    const result = spawnSync("py", [tempPath], { encoding: "utf8", timeout: 5000 });
    const parsed = safeJsonParse((result.stdout || "").trim(), {});
    const passed = Number(parsed.passed || 0);
    const total = Math.max(Number(parsed.total || question.testCases.length), 1);
    return {
      ok: true,
      language: "python",
      passed,
      total,
      preview_score: Math.round((passed / total) * question.marks),
      output: parsed.output || ""
    };
  } catch (error) {
    return { ok: false, error: "Python execution failed." };
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

function executeJava(question, code) {
  const tempDir = path.join(BASE_DIR, `temp-${crypto.randomUUID()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const sourcePath = path.join(tempDir, "Main.java");

  try {
    const checks = question.testCases.map((testCase) => {
      const args = testCase.input.map((value) => serializeCodeLiteral(value)).join(", ");
      const expected = serializeCodeLiteral(testCase.expected);
      return `    try { if (Main.solve(${args}) == ${expected}) passed++; } catch (Exception ignored) {}`;
    }).join("\n");

    const script = `
${code}
class __ArenaRunner {
  public static void main(String[] args) {
    int passed = 0;
    int total = ${question.testCases.length};
${checks}
    System.out.print("{\\"passed\\":" + passed + ",\\"total\\":" + total + ",\\"output\\":\\"Java preview completed\\"}");
  }
}
`;
    fs.writeFileSync(sourcePath, script, "utf8");
    const compile = spawnSync("javac", ["Main.java"], { cwd: tempDir, encoding: "utf8", timeout: 5000 });
    if (compile.status !== 0) {
      return { ok: false, error: compile.stderr || "Java compilation failed." };
    }
    const result = spawnSync("java", ["-cp", tempDir, "__ArenaRunner"], { encoding: "utf8", timeout: 5000 });
    const parsed = safeJsonParse((result.stdout || "").trim(), {});
    const passed = Number(parsed.passed || 0);
    const total = Math.max(Number(parsed.total || question.testCases.length), 1);
    return {
      ok: true,
      language: "java",
      passed,
      total,
      preview_score: Math.round((passed / total) * question.marks),
      output: parsed.output || ""
    };
  } catch (error) {
    return { ok: false, error: "Java execution failed." };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function executeC(question, code) {
  const compiler = commandExists("gcc") ? "gcc" : (commandExists("clang") ? "clang" : null);
  if (!compiler) {
    return { ok: false, error: "C compiler is not available on this server." };
  }

  const tempDir = path.join(BASE_DIR, `temp-${crypto.randomUUID()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const sourcePath = path.join(tempDir, "main.c");
  const exePath = path.join(tempDir, "main.exe");

  try {
    const checks = question.testCases.map((testCase) => {
      const args = testCase.input.map((value) => serializeCodeLiteral(value)).join(", ");
      const expected = serializeCodeLiteral(testCase.expected);
      return `  if (solve(${args}) == ${expected}) passed++;`;
    }).join("\n");

    const script = `
#include <stdio.h>
${code}
int main(void) {
  int passed = 0;
  int total = ${question.testCases.length};
${checks}
  printf("{\\"passed\\":%d,\\"total\\":%d}", passed, total);
  return 0;
}
`;
    fs.writeFileSync(sourcePath, script, "utf8");
    const compile = spawnSync(compiler, [sourcePath, "-o", exePath], { encoding: "utf8", timeout: 5000 });
    if (compile.status !== 0) {
      return { ok: false, error: compile.stderr || "C compilation failed." };
    }
    const result = spawnSync(exePath, [], { encoding: "utf8", timeout: 5000 });
    const parsed = safeJsonParse((result.stdout || "").trim(), {});
    const passed = Number(parsed.passed || 0);
    const total = Math.max(Number(parsed.total || question.testCases.length), 1);
    return {
      ok: true,
      language: "c",
      passed,
      total,
      preview_score: Math.round((passed / total) * question.marks),
      output: "C preview completed"
    };
  } catch (error) {
    return { ok: false, error: "C execution failed." };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function getStarterTemplates(question) {
  return {
    javascript: question.starterCode || "function solve(a, b) {\n  return a + b;\n}",
    python: "def solve(a, b):\n    return a + b\n",
    java: "public class Main {\n  public static int solve(int a, int b) {\n    return a + b;\n  }\n}\n",
    c: "int solve(int a, int b) {\n  return a + b;\n}\n"
  };
}

function speedBonus(rawScore, maxMarks, elapsed) {
  if (rawScore <= 0 || maxMarks <= 0) {
    return 0;
  }
  const timeFactor = Math.max(0, ROUND_TIME_LIMIT - elapsed) / ROUND_TIME_LIMIT;
  return Math.round((rawScore / maxMarks) * 25 * timeFactor);
}

function normalizeAnswer(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function serveStatic(res, pathname) {
  const target = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(BASE_DIR, target));
  if (!filePath.startsWith(BASE_DIR)) {
    return sendJson(res, 403, { ok: false, error: "Forbidden" });
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".md": "text/markdown; charset=utf-8"
    }[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(buffer);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = []) {
  const body = Buffer.from(JSON.stringify(payload));
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length
  };

  for (const header of extraHeaders) {
    const separator = header.indexOf(":");
    headers[header.slice(0, separator)] = header.slice(separator + 1).trim();
  }

  res.writeHead(statusCode, headers);
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return `${salt}$${digest}`;
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || "").split("$");
  if (!salt || !digest) {
    return false;
  }
  const check = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return digest === check;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function shuffleArray(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
}

function nowIso() {
  return new Date().toISOString();
}

function commandExists(command) {
  const result = spawnSync("where", [command], { encoding: "utf8" });
  return result.status === 0;
}

function commandWorks(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 5000 });
  return result.status === 0 || Boolean(result.stderr) || Boolean(result.stdout);
}

function hasInstalledPython() {
  const result = spawnSync("py", ["-0p"], { encoding: "utf8", timeout: 5000 });
  return result.status === 0 && !/No Installed Pythons Found/i.test(`${result.stdout}${result.stderr}`);
}

function detectLanguageSupport() {
  return {
    javascript: true,
    python: hasInstalledPython(),
    java: commandWorks("javac", ["-version"]) && commandWorks("java", ["-version"]),
    c: commandExists("gcc") || commandExists("clang") || commandExists("cl")
  };
}

function serializeCodeLiteral(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}
