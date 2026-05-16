import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { AuditEvent, EventName } from "../../../../packages/shared/src";

const auditEventsCollection = "auditEvents";

export type AuditEventInput = {
  eventName: EventName;
  entityType: AuditEvent["entityType"];
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const actorId = auth.currentUser?.uid;
  if (!actorId) return;

  try {
    await addDoc(collection(db, auditEventsCollection), {
      actorId,
      eventName: input.eventName,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (__DEV__) {
      console.error("Audit event write failed:", error);
    }
  }
}
