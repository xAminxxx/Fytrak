import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();

const usersCollection = "users";
const coachRequestsCollection = "coachRequests";
const assignmentsCollection = "assignments";
const chatThreadsCollection = "chatThreads";
const auditEventsCollection = "auditEvents";

type AssignmentResolution = {
  traineeId?: unknown;
  accept?: unknown;
};

type CoachRequestInput = {
  coachId?: unknown;
  coachName?: unknown;
};

type MarkReadInput = {
  threadId?: unknown;
};

type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "EXPIRATION"
  | "SUBSCRIBER_ALIAS"
  | "TRANSFER";

function requireAuth(uid: string | undefined): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  return uid;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return value.trim();
}

function coachRequestId(traineeId: string, coachId: string): string {
  return `${traineeId}_${coachId}`;
}

function chatThreadId(traineeId: string, coachId: string): string {
  return [traineeId, coachId].sort().join("_");
}

function toDateKey(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
}

async function logAuditEvent(input: {
  actorId: string;
  eventName: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await db.collection(auditEventsCollection).add({
    ...input,
    metadata: input.metadata ?? {},
    trusted: true,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function assertRole(userData: FirebaseFirestore.DocumentData | undefined, role: string) {
  if (!userData || userData.role !== role) {
    throw new HttpsError("permission-denied", `Expected ${role} account.`);
  }
}

async function recomputeClientSummary(traineeId: string) {
  const since = Timestamp.fromMillis(Date.now() - 7 * 86400000);
  const dateSince = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const userRef = db.collection(usersCollection).doc(traineeId);

  const [workouts, meals] = await Promise.all([
    userRef.collection("workouts").where("createdAt", ">=", since).get(),
    userRef.collection("meals").where("date", ">=", dateSince).get(),
  ]);

  const totalProtein = meals.docs.reduce((sum, meal) => {
    return sum + (Number(meal.data().protein) || 0);
  }, 0);

  const summary = {
    workoutsLast7Days: workouts.size,
    mealsLast7Days: meals.size,
    avgDailyProtein: Math.round(totalProtein / 7),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await Promise.all([
    userRef.set({ clientSummary: summary, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    userRef.collection("summaries").doc("client").set(summary, { merge: true }),
  ]);
}

export const requestCoachAssignment = onCall(async (request) => {
  const traineeId = requireAuth(request.auth?.uid);
  const input = request.data as CoachRequestInput;
  const coachId = requireString(input.coachId, "coachId");
  const coachName = requireString(input.coachName, "coachName");
  const requestRef = db.collection(coachRequestsCollection).doc(coachRequestId(traineeId, coachId));
  const traineeRef = db.collection(usersCollection).doc(traineeId);
  const coachRef = db.collection(usersCollection).doc(coachId);

  await db.runTransaction(async (transaction) => {
    const [traineeSnapshot, coachSnapshot] = await Promise.all([
      transaction.get(traineeRef),
      transaction.get(coachRef),
    ]);
    const trainee = traineeSnapshot.data();
    const coach = coachSnapshot.data();
    assertRole(trainee, "trainee");
    assertRole(coach, "coach");

    if (trainee?.assignmentStatus === "assigned") {
      throw new HttpsError("failed-precondition", "You already have an assigned coach.");
    }

    const profile = trainee?.profile ?? {};
    const basic = profile.basic ?? profile;

    transaction.set(traineeRef, {
      assignmentStatus: "pending",
      selectedCoachId: coachId,
      selectedCoachName: coachName,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(requestRef, {
      traineeId,
      coachId,
      coachName,
      traineeName: trainee?.name || "Anonymous",
      traineeGoal: basic.goal || trainee?.goal || "General Fitness",
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  await logAuditEvent({
    actorId: traineeId,
    eventName: "assignment_requested",
    entityType: "coachRequest",
    entityId: requestRef.id,
    metadata: { traineeId, coachId },
  });

  return { requestId: requestRef.id };
});

export const cancelCoachAssignmentRequest = onCall(async (request) => {
  const traineeId = requireAuth(request.auth?.uid);
  const traineeRef = db.collection(usersCollection).doc(traineeId);
  const pendingRequests = await db.collection(coachRequestsCollection)
    .where("traineeId", "==", traineeId)
    .where("status", "==", "pending")
    .get();

  const batch = db.batch();
  batch.set(traineeRef, {
    assignmentStatus: "unassigned",
    selectedCoachId: null,
    selectedCoachName: null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  pendingRequests.docs.forEach((requestDoc) => {
    batch.set(requestDoc.ref, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  await batch.commit();
  await logAuditEvent({
    actorId: traineeId,
    eventName: "assignment_cancelled",
    entityType: "coachRequest",
    entityId: traineeId,
    metadata: { traineeId, cancelledCount: pendingRequests.size },
  });

  return { cancelledCount: pendingRequests.size };
});

export const resolveCoachRequest = onCall(async (request) => {
  const coachId = requireAuth(request.auth?.uid);
  const input = request.data as AssignmentResolution;
  const traineeId = requireString(input.traineeId, "traineeId");
  const accept = input.accept === true;
  const requestId = coachRequestId(traineeId, coachId);
  const requestRef = db.collection(coachRequestsCollection).doc(requestId);
  const traineeRef = db.collection(usersCollection).doc(traineeId);
  const assignmentRef = db.collection(assignmentsCollection).doc(requestId);
  const threadId = chatThreadId(traineeId, coachId);
  const threadRef = db.collection(chatThreadsCollection).doc(threadId);

  await db.runTransaction(async (transaction) => {
    const [requestSnapshot, traineeSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(traineeRef),
    ]);
    const coachSnapshot = await transaction.get(db.collection(usersCollection).doc(coachId));
    assertRole(coachSnapshot.data(), "coach");

    const requestData = requestSnapshot.data();
    const traineeData = traineeSnapshot.data();
    if (!requestSnapshot.exists || requestData?.status !== "pending") {
      throw new HttpsError("failed-precondition", "This coach request is no longer pending.");
    }
    if (requestData.coachId !== coachId || requestData.traineeId !== traineeId) {
      throw new HttpsError("permission-denied", "You cannot resolve this request.");
    }
    if (!traineeSnapshot.exists || traineeData?.assignmentStatus !== "pending") {
      throw new HttpsError("failed-precondition", "Trainee assignment state is invalid.");
    }
    if (traineeData.selectedCoachId !== coachId) {
      throw new HttpsError("permission-denied", "This trainee requested another coach.");
    }

    transaction.set(requestRef, {
      status: accept ? "accepted" : "rejected",
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(traineeRef, {
      assignmentStatus: accept ? "assigned" : "rejected",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (!accept) return;

    transaction.set(assignmentRef, {
      traineeId,
      coachId,
      status: "active",
      sourceRequestId: requestId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(threadRef, {
      threadId,
      traineeId,
      coachId,
      participants: [traineeId, coachId],
      lastMessageText: "",
      lastMessageType: "text",
      lastSenderId: null,
      lastMessageAt: null,
      unreadByCoach: 0,
      unreadByTrainee: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  await logAuditEvent({
    actorId: coachId,
    eventName: accept ? "assignment_approved" : "assignment_rejected",
    entityType: "coachRequest",
    entityId: requestId,
    metadata: { traineeId, coachId, accepted: accept },
  });

  return { requestId, threadId: accept ? threadId : null };
});

export const markCoachThreadRead = onCall(async (request) => {
  const coachId = requireAuth(request.auth?.uid);
  const threadId = requireString((request.data as MarkReadInput).threadId, "threadId");
  const threadRef = db.collection(chatThreadsCollection).doc(threadId);
  const threadSnapshot = await threadRef.get();
  const thread = threadSnapshot.data();
  if (!threadSnapshot.exists || thread?.coachId !== coachId) {
    throw new HttpsError("permission-denied", "You cannot update this thread.");
  }

  const traineeId = requireString(thread.traineeId, "traineeId");
  await Promise.all([
    threadRef.set({
      unreadByCoach: 0,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    db.collection(usersCollection).doc(traineeId).set({
      clientSummary: {
        unreadCoachCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    db.collection(usersCollection).doc(traineeId).collection("summaries").doc("client").set({
      unreadCoachCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]);

  return { threadId };
});

export const rebuildClientSummary = onCall(async (request) => {
  const actorId = requireAuth(request.auth?.uid);
  const traineeId = requireString((request.data as { traineeId?: unknown }).traineeId, "traineeId");
  const traineeSnapshot = await db.collection(usersCollection).doc(traineeId).get();
  const trainee = traineeSnapshot.data();
  if (actorId !== traineeId && trainee?.selectedCoachId !== actorId) {
    throw new HttpsError("permission-denied", "You cannot rebuild this summary.");
  }

  await recomputeClientSummary(traineeId);
  await logAuditEvent({
    actorId,
    eventName: "client_summary_rebuilt",
    entityType: "clientSummary",
    entityId: traineeId,
  });
  return { traineeId };
});

export const onChatMessageCreated = onDocumentCreated("chats/{threadId}/messages/{messageId}", async (event) => {
  const message = event.data?.data();
  if (!message) return;

  const threadId = String(event.params.threadId);
  const senderId = String(message.senderId || "");
  const traineeId = String((message.participants || []).find((id: string) => id !== message.receiverId) || message.traineeId || "");
  const threadSnapshot = await db.collection(chatThreadsCollection).doc(threadId).get();
  const thread = threadSnapshot.data();
  const canonicalTraineeId = thread?.traineeId || traineeId;
  const coachId = thread?.coachId || message.receiverId;
  const isTraineeSender = senderId === canonicalTraineeId;
  const summaryText = message.type === "image" ? "Image" : String(message.text || "");

  await Promise.all([
    db.collection(chatThreadsCollection).doc(threadId).set({
      lastMessageText: summaryText,
      lastMessageType: message.type === "image" ? "image" : "text",
      lastSenderId: senderId,
      lastMessageAt: message.createdAt || FieldValue.serverTimestamp(),
      unreadByCoach: isTraineeSender ? FieldValue.increment(1) : FieldValue.increment(0),
      unreadByTrainee: !isTraineeSender ? FieldValue.increment(1) : FieldValue.increment(0),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    db.collection(usersCollection).doc(canonicalTraineeId).set({
      clientSummary: {
        lastMessageAt: message.createdAt || FieldValue.serverTimestamp(),
        lastMessageText: summaryText,
        lastMessageSenderId: senderId,
        unreadCoachCount: isTraineeSender ? FieldValue.increment(1) : FieldValue.increment(0),
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    db.collection(usersCollection).doc(canonicalTraineeId).collection("summaries").doc("client").set({
      lastMessageAt: message.createdAt || FieldValue.serverTimestamp(),
      lastMessageText: summaryText,
      lastMessageSenderId: senderId,
      unreadCoachCount: isTraineeSender ? FieldValue.increment(1) : FieldValue.increment(0),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    logAuditEvent({
      actorId: senderId,
      eventName: "coach_message_sent",
      entityType: "chatThread",
      entityId: threadId,
      metadata: { coachId, traineeId: canonicalTraineeId, type: message.type || "text" },
    }),
  ]);
});

export const onWorkoutWritten = onDocumentWritten("users/{userId}/workouts/{workoutId}", async (event) => {
  const userId = String(event.params.userId);
  const after = event.data?.after;
  if (after?.exists) {
    const data = after.data();
    if (data && !data.date) {
      const date = toDateKey(data.createdAt) || new Date().toISOString().slice(0, 10);
      await after.ref.set({ date, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  }
  await recomputeClientSummary(userId);
});

export const onMealWritten = onDocumentWritten("users/{userId}/meals/{mealId}", async (event) => {
  await recomputeClientSummary(String(event.params.userId));
});

export const revenueCatWebhook = onRequest(async (request, response) => {
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (expectedSecret) {
    const auth = request.header("authorization") || "";
    if (auth !== `Bearer ${expectedSecret}`) {
      response.status(401).send("Unauthorized");
      return;
    }
  }

  const event = request.body?.event ?? request.body;
  const userId = event?.app_user_id || event?.appUserId || event?.userId;
  const eventType = event?.type as RevenueCatEventType | undefined;
  if (!userId || !eventType) {
    response.status(400).send("Missing RevenueCat user or event type.");
    return;
  }

  const grantsPremium = ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE"].includes(eventType);
  const revokesPremium = ["EXPIRATION", "BILLING_ISSUE"].includes(eventType);
  const userRef = db.collection(usersCollection).doc(String(userId));

  await Promise.all([
    userRef.collection("subscriptionEvents").add({
      userId,
      eventType,
      productId: event.product_id || null,
      environment: event.environment || null,
      store: event.store || null,
      purchasedAt: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
      rawPayload: request.body,
      createdAt: FieldValue.serverTimestamp(),
    }),
    (grantsPremium || revokesPremium)
      ? userRef.set({
        isPremium: grantsPremium,
        subscription: {
          plan: event.product_id || null,
          expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
          store: event.store || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      : Promise.resolve(),
    logAuditEvent({
      actorId: "revenuecat",
      eventName: "subscription_event_received",
      entityType: "subscription",
      entityId: String(userId),
      metadata: { eventType, grantsPremium, revokesPremium },
    }),
  ]);

  logger.info("RevenueCat webhook processed", { userId, eventType });
  response.status(200).json({ ok: true });
});
