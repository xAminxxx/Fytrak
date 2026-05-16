import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { CoachRequest } from "../../../../packages/shared/src";
import {
  callCancelCoachAssignmentRequest,
  callRequestCoachAssignment,
  callResolveCoachRequest,
} from "./backendFunctionsService";

const coachRequestsCollection = "coachRequests";

export type CoachRequestWithTrainee = CoachRequest & {
  traineeName: string;
  traineeGoal?: string;
};

export const getCoachRequestId = (traineeId: string, coachId: string): string => {
  return `${traineeId}_${coachId}`;
};

export const requestCoachAssignment = async (
  _traineeId: string,
  coach: { id: string; name: string }
): Promise<void> => {
  await callRequestCoachAssignment(coach);
};

export const cancelCoachAssignmentRequest = async (_traineeId: string): Promise<void> => {
  await callCancelCoachAssignmentRequest();
};

export const resolveCoachRequest = async (traineeId: string, accept: boolean): Promise<void> => {
  await callResolveCoachRequest({ traineeId, accept });
};

export const subscribeToPendingCoachRequests = (
  coachId: string,
  callback: (requests: CoachRequestWithTrainee[]) => void
) => {
  const q = query(
    collection(db, coachRequestsCollection),
    where("coachId", "==", coachId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, async (snapshot) => {
    const requests = snapshot.docs.map((requestDoc) => {
      const data = requestDoc.data() as Omit<CoachRequest, "id">;

      return {
        id: requestDoc.id,
        ...data,
        traineeName: data.traineeName || "Anonymous",
        traineeGoal: data.traineeGoal || "General Fitness",
      };
    });

    callback(requests);
  });
};
