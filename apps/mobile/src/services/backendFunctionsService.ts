import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

export const callRequestCoachAssignment = async (coach: {
  id: string;
  name: string;
}): Promise<void> => {
  const callable = httpsCallable(functions, "requestCoachAssignment");
  await callable({ coachId: coach.id, coachName: coach.name });
};

export const callCancelCoachAssignmentRequest = async (): Promise<void> => {
  const callable = httpsCallable(functions, "cancelCoachAssignmentRequest");
  await callable({});
};

export const callResolveCoachRequest = async (params: {
  traineeId: string;
  accept: boolean;
}): Promise<void> => {
  const callable = httpsCallable(functions, "resolveCoachRequest");
  await callable(params);
};

export const callMarkCoachThreadRead = async (threadId: string): Promise<void> => {
  const callable = httpsCallable(functions, "markCoachThreadRead");
  await callable({ threadId });
};

export const callRebuildClientSummary = async (traineeId: string): Promise<void> => {
  const callable = httpsCallable(functions, "rebuildClientSummary");
  await callable({ traineeId });
};
