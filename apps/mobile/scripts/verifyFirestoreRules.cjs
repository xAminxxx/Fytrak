const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  writeBatch,
} = require("firebase/firestore");

setLogLevel("error");

const projectId = process.env.GCLOUD_PROJECT || "demo-fytrak";
const rulesPath = path.resolve(__dirname, "../../../firestore.rules");
const rules = fs.readFileSync(rulesPath, "utf8");

const requestId = "trainee_1_coach_1";
const threadId = "coach_1_trainee_1";

async function seed(testEnv, seedFn) {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await seedFn(context.firestore());
  });
}

async function seedUsers(testEnv, traineeOverrides = {}) {
  await seed(testEnv, async (db) => {
    await setDoc(doc(db, "users", "coach_1"), {
      role: "coach",
      name: "Coach One",
      assignmentStatus: "unassigned",
    });
    await setDoc(doc(db, "users", "coach_2"), {
      role: "coach",
      name: "Coach Two",
      assignmentStatus: "unassigned",
    });
    await setDoc(doc(db, "users", "trainee_1"), {
      role: "trainee",
      name: "Trainee One",
      assignmentStatus: "unassigned",
      profile: { basic: { goal: "strength" } },
      ...traineeOverrides,
    });
  });
}

async function seedPendingRequest(testEnv) {
  await seedUsers(testEnv, {
    assignmentStatus: "pending",
    selectedCoachId: "coach_1",
    selectedCoachName: "Coach One",
  });
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "coachRequests", requestId), {
      traineeId: "trainee_1",
      coachId: "coach_1",
      coachName: "Coach One",
      traineeName: "Trainee One",
      traineeGoal: "strength",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

async function seedAssignedRelationship(testEnv) {
  await seedUsers(testEnv, {
    assignmentStatus: "assigned",
    selectedCoachId: "coach_1",
    selectedCoachName: "Coach One",
  });
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "coachRequests", requestId), {
      traineeId: "trainee_1",
      coachId: "coach_1",
      coachName: "Coach One",
      traineeName: "Trainee One",
      traineeGoal: "strength",
      status: "accepted",
      createdAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "assignments", requestId), {
      traineeId: "trainee_1",
      coachId: "coach_1",
      status: "active",
      sourceRequestId: requestId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "chatThreads", threadId), {
      threadId,
      traineeId: "trainee_1",
      coachId: "coach_1",
      participants: ["trainee_1", "coach_1"],
      lastMessageText: "",
      lastMessageType: "text",
      lastSenderId: null,
      lastMessageAt: null,
      unreadByCoach: 0,
      unreadByTrainee: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });

  try {
    await seedUsers(testEnv);
    const traineeDb = testEnv.authenticatedContext("trainee_1").firestore();
    const otherDb = testEnv.authenticatedContext("other_user").firestore();

    await assertSucceeds(updateDoc(doc(traineeDb, "users", "trainee_1"), {
      bio: "Training for strength.",
      updatedAt: serverTimestamp(),
    }));

    await assertFails(updateDoc(doc(traineeDb, "users", "trainee_1"), {
      assignmentStatus: "assigned",
      updatedAt: serverTimestamp(),
    }));

    await assertFails(updateDoc(doc(traineeDb, "users", "trainee_1"), {
      "clientSummary.internalFlag": true,
      "clientSummary.updatedAt": serverTimestamp(),
    }));

    await assertFails(setDoc(doc(traineeDb, "coachRequests", requestId), {
      traineeId: "trainee_1",
      coachId: "coach_1",
      coachName: "Coach One",
      traineeName: "Trainee One",
      traineeGoal: "strength",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertFails(setDoc(doc(otherDb, "coachRequests", "trainee_1_coach_2"), {
      traineeId: "trainee_1",
      coachId: "coach_2",
      coachName: "Coach Two",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await seedPendingRequest(testEnv);
    const coachDb = testEnv.authenticatedContext("coach_1").firestore();
    const outsiderCoachDb = testEnv.authenticatedContext("coach_2").firestore();

    await assertFails(getDoc(doc(outsiderCoachDb, "users", "trainee_1")));
    await assertSucceeds(getDoc(doc(coachDb, "coachRequests", requestId)));

    const unsafeApproval = writeBatch(coachDb);
    unsafeApproval.set(doc(coachDb, "coachRequests", requestId), {
      status: "accepted",
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    unsafeApproval.set(doc(coachDb, "users", "trainee_1"), {
      assignmentStatus: "assigned",
      updatedAt: serverTimestamp(),
    }, { merge: true });
    unsafeApproval.set(doc(coachDb, "assignments", requestId), {
      traineeId: "trainee_1",
      coachId: "coach_1",
      status: "active",
      sourceRequestId: requestId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    unsafeApproval.set(doc(coachDb, "chatThreads", threadId), {
      threadId,
      traineeId: "trainee_1",
      coachId: "coach_1",
      participants: ["trainee_1", "coach_1"],
      lastMessageText: "",
      lastMessageType: "text",
      lastSenderId: null,
      lastMessageAt: null,
      unreadByCoach: 0,
      unreadByTrainee: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await assertFails(unsafeApproval.commit());

    await seedAssignedRelationship(testEnv);
    const assignedCoachDb = testEnv.authenticatedContext("coach_1").firestore();
    const assignedTraineeDb = testEnv.authenticatedContext("trainee_1").firestore();

    await assertSucceeds(getDoc(doc(assignedCoachDb, "users", "trainee_1")));
    await assertSucceeds(getDoc(doc(assignedCoachDb, "assignments", requestId)));
    await assertSucceeds(getDoc(doc(assignedCoachDb, "chatThreads", threadId)));

    await assertFails(updateDoc(doc(assignedCoachDb, "chatThreads", threadId), {
      unreadByCoach: 0,
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(setDoc(doc(assignedCoachDb, "users", "trainee_1", "coachNotes", "note_1"), {
      coachId: "coach_1",
      text: "Follow up on sleep quality.",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertFails(setDoc(doc(outsiderCoachDb, "users", "trainee_1", "coachNotes", "note_2"), {
      coachId: "coach_2",
      text: "This should not be allowed.",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    await assertSucceeds(addDoc(collection(assignedTraineeDb, "chats", threadId, "messages"), {
      threadId,
      senderId: "trainee_1",
      receiverId: "coach_1",
      participants: ["trainee_1", "coach_1"],
      type: "text",
      text: "Coach, here is my update.",
      status: "sent",
      createdAt: serverTimestamp(),
      readAt: null,
    }));

    await assertFails(addDoc(collection(outsiderCoachDb, "chats", threadId, "messages"), {
      threadId,
      senderId: "coach_2",
      receiverId: "trainee_1",
      participants: ["coach_2", "trainee_1"],
      type: "text",
      text: "Unauthorized message.",
      status: "sent",
      createdAt: serverTimestamp(),
      readAt: null,
    }));

    await assertFails(addDoc(collection(assignedTraineeDb, "auditEvents"), {
      actorId: "trainee_1",
      eventName: "assignment_requested",
      entityType: "coachRequest",
      entityId: requestId,
      createdAt: serverTimestamp(),
    }));

    const requestSnap = await getDoc(doc(assignedCoachDb, "coachRequests", requestId));
    assert.equal(requestSnap.data().status, "accepted");

    console.log("Firestore rules checks passed.");
  } finally {
    await testEnv.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
