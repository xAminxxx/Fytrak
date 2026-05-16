#!/usr/bin/env node

const admin = require("firebase-admin");

const USERS = "users";
const COACH_REQUESTS = "coachRequests";
const ASSIGNMENTS = "assignments";
const CHAT_THREADS = "chatThreads";
const SUMMARIES = "summaries";

const DEFAULT_LIMIT = 0;
const DEFAULT_SUBCOLLECTION_LIMIT = 250;
const MAX_BATCH_WRITES = 400;

function parseArgs(argv) {
  const options = {
    commit: false,
    limit: DEFAULT_LIMIT,
    subcollectionLimit: DEFAULT_SUBCOLLECTION_LIMIT,
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID,
  };

  argv.forEach((arg) => {
    if (arg === "--commit") options.commit = true;
    if (arg.startsWith("--limit=")) options.limit = Number(arg.split("=")[1]) || DEFAULT_LIMIT;
    if (arg.startsWith("--subcollectionLimit=")) {
      options.subcollectionLimit = Number(arg.split("=")[1]) || DEFAULT_SUBCOLLECTION_LIMIT;
    }
    if (arg.startsWith("--project=")) options.project = arg.split("=")[1];
  });

  return options;
}

function initAdmin(projectId) {
  if (admin.apps.length > 0) return admin.firestore();

  admin.initializeApp(projectId ? { projectId } : undefined);
  return admin.firestore();
}

function sortedThreadId(traineeId, coachId) {
  return [traineeId, coachId].sort().join("_");
}

function toDateKey(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function nonEmptyObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function pickDefined(source, keys) {
  const out = {};
  keys.forEach((key) => {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      out[key] = source[key];
    }
  });
  return out;
}

function buildProfilePatch(userData) {
  const profile = nonEmptyObject(userData.profile) ? userData.profile : {};
  const patch = {};

  if (!nonEmptyObject(profile.basic)) {
    const legacyBasic = {
      ...pickDefined(profile, ["goal", "weight", "height", "birthDate", "gender", "city", "country", "level"]),
      ...pickDefined(userData, ["goal", "weight", "height", "birthDate", "gender", "city", "country", "level"]),
    };
    if (Object.keys(legacyBasic).length > 0) patch["profile.basic"] = legacyBasic;
  }

  if (!nonEmptyObject(profile.training)) {
    const legacyTraining = {
      ...pickDefined(profile, ["lastTrainedDate", "trainingExperience", "healthIssues", "flexibility", "injuries", "work"]),
      ...pickDefined(userData, ["lastTrainedDate", "trainingExperience", "healthIssues", "flexibility", "injuries", "work"]),
    };
    if (Object.keys(legacyTraining).length > 0) patch["profile.training"] = legacyTraining;
  }

  if (!nonEmptyObject(profile.nutritionProfile)) {
    const legacyNutrition = {
      ...pickDefined(profile, ["activityLevel", "medical", "lifestyle", "nutrition"]),
      ...pickDefined(userData, ["activityLevel", "medical", "lifestyle", "nutrition"]),
    };
    if (Object.keys(legacyNutrition).length > 0) patch["profile.nutritionProfile"] = legacyNutrition;
  }

  return patch;
}

function buildClientSummaryPatch(userData) {
  if (!nonEmptyObject(userData.clientSummary)) return null;
  return {
    ...userData.clientSummary,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function latestThreadSummary(db, threadId) {
  const latest = await db
    .collection("chats")
    .doc(threadId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get()
    .catch(() => null);

  if (!latest || latest.empty) {
    return {
      lastMessageText: "",
      lastMessageType: "text",
      lastSenderId: null,
      lastMessageAt: null,
    };
  }

  const message = latest.docs[0].data();
  return {
    lastMessageText: message.type === "image" ? "Image" : String(message.text || ""),
    lastMessageType: message.type === "image" ? "image" : "text",
    lastSenderId: typeof message.senderId === "string" ? message.senderId : null,
    lastMessageAt: message.createdAt || null,
  };
}

function createWriter(db, options, stats) {
  let batch = db.batch();
  let pendingWrites = 0;

  const flush = async () => {
    if (pendingWrites === 0) return;
    if (options.commit) await batch.commit();
    stats.batches += 1;
    batch = db.batch();
    pendingWrites = 0;
  };

  const set = async (ref, data, merge = true) => {
    stats.writes += 1;
    if (!options.commit) {
      console.log(`[dry-run] set ${ref.path}`, JSON.stringify(data));
      return;
    }

    batch.set(ref, data, { merge });
    pendingWrites += 1;
    if (pendingWrites >= MAX_BATCH_WRITES) await flush();
  };

  return { set, flush };
}

async function backfillWorkoutDates(db, writer, userRef, options, stats) {
  const workouts = await userRef
    .collection("workouts")
    .limit(options.subcollectionLimit)
    .get();

  for (const workoutDoc of workouts.docs) {
    const data = workoutDoc.data();
    if (data.date) continue;

    const dateKey = toDateKey(data.createdAt) || toDateKey(data.completedAt);
    if (!dateKey) {
      stats.skippedWorkoutDates += 1;
      continue;
    }

    await writer.set(workoutDoc.ref, {
      date: dateKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    stats.workoutDates += 1;
  }
}

async function backfillUser(db, writer, userDoc, options, stats) {
  const userData = userDoc.data();
  const userRef = userDoc.ref;
  const uid = userDoc.id;

  const profilePatch = buildProfilePatch(userData);
  if (Object.keys(profilePatch).length > 0) {
    await writer.set(userRef, {
      ...profilePatch,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    stats.profiles += 1;
  }

  const clientSummaryPatch = buildClientSummaryPatch(userData);
  if (clientSummaryPatch) {
    await writer.set(userRef.collection(SUMMARIES).doc("client"), clientSummaryPatch);
    stats.clientSummaries += 1;
  }

  await backfillWorkoutDates(db, writer, userRef, options, stats);

  const coachId = userData.selectedCoachId;
  if (typeof coachId !== "string" || coachId.length === 0) return;

  const coachName = userData.selectedCoachName || "Coach";
  const profile = nonEmptyObject(userData.profile) ? userData.profile : {};
  const basic = nonEmptyObject(profile.basic) ? profile.basic : profile;
  const traineeName = userData.name || "Anonymous";
  const traineeGoal = basic.goal || userData.goal || "General Fitness";
  const requestId = `${uid}_${coachId}`;
  const threadId = sortedThreadId(uid, coachId);

  if (userData.assignmentStatus === "pending") {
    await writer.set(db.collection(COACH_REQUESTS).doc(requestId), {
      traineeId: uid,
      coachId,
      coachName,
      traineeName,
      traineeGoal,
      status: "pending",
      createdAt: userData.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    stats.coachRequests += 1;
    return;
  }

  if (userData.assignmentStatus !== "assigned") return;

  await writer.set(db.collection(COACH_REQUESTS).doc(requestId), {
    traineeId: uid,
    coachId,
    coachName,
    traineeName,
    traineeGoal,
    status: "accepted",
    createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    respondedAt: userData.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  stats.coachRequests += 1;

  await writer.set(db.collection(ASSIGNMENTS).doc(requestId), {
    traineeId: uid,
    coachId,
    status: "active",
    sourceRequestId: requestId,
    createdAt: userData.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  stats.assignments += 1;

  const threadRef = db.collection(CHAT_THREADS).doc(threadId);
  const threadDoc = await threadRef.get();
  const threadData = threadDoc.exists ? threadDoc.data() : {};
  const summary = threadData?.lastMessageText === undefined
    ? await latestThreadSummary(db, threadId)
    : {};

  await writer.set(threadRef, {
    threadId,
    traineeId: uid,
    coachId,
    participants: [uid, coachId],
    unreadByCoach: Number(threadData?.unreadByCoach) || 0,
    unreadByTrainee: Number(threadData?.unreadByTrainee) || 0,
    createdAt: threadData?.createdAt || userData.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...summary,
  });
  stats.chatThreads += 1;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = initAdmin(options.project);
  const stats = {
    users: 0,
    writes: 0,
    batches: 0,
    profiles: 0,
    clientSummaries: 0,
    coachRequests: 0,
    assignments: 0,
    chatThreads: 0,
    workoutDates: 0,
    skippedWorkoutDates: 0,
  };
  const writer = createWriter(db, options, stats);

  console.log(`Fytrak SaaS backfill starting in ${options.commit ? "COMMIT" : "DRY-RUN"} mode.`);
  if (!options.commit) console.log("Use --commit to write changes after reviewing dry-run output.");

  let usersQuery = db.collection(USERS).orderBy(admin.firestore.FieldPath.documentId());
  if (options.limit > 0) usersQuery = usersQuery.limit(options.limit);

  const users = await usersQuery.get();
  for (const userDoc of users.docs) {
    stats.users += 1;
    await backfillUser(db, writer, userDoc, options, stats);
  }

  await writer.flush();

  console.log("Fytrak SaaS backfill complete.");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exitCode = 1;
});
