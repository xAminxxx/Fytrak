import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutSet, WorkoutSetType } from "../../services/userSession";

export type ActiveWorkoutExerciseDraft = {
  exerciseId?: string;
  name: string;
  type: WorkoutSetType;
  sets: WorkoutSet[];
};

export type ActiveWorkoutDraft = {
  version: 1;
  userId: string;
  workoutName: string;
  activePrescriptionId: string | null;
  exercises: ActiveWorkoutExerciseDraft[];
  startedAt: string;
  updatedAt: string;
};

const keyForUser = (userId: string) => `fytrak:active-workout:${userId}`;

export function createEmptyWorkoutExercise(): ActiveWorkoutExerciseDraft {
  return {
    name: "",
    type: "WEIGHT_REPS",
    sets: [{ type: "WEIGHT_REPS", isCompleted: false }],
  };
}

export function hasMeaningfulWorkoutDraft(draft: Pick<ActiveWorkoutDraft, "workoutName" | "exercises">): boolean {
  const hasNamedWorkout = draft.workoutName.trim() !== "" && draft.workoutName !== "Today's Session";
  const hasExerciseData = draft.exercises.some((exercise) => {
    return (
      exercise.name.trim() !== "" ||
      exercise.sets.some((set) => set.isCompleted || Boolean(set.reps) || Boolean(set.weight) || Boolean(set.durationSec))
    );
  });

  return hasNamedWorkout || hasExerciseData;
}

export async function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): Promise<void> {
  await AsyncStorage.setItem(keyForUser(draft.userId), JSON.stringify(draft));
}

export async function loadActiveWorkoutDraft(userId: string): Promise<ActiveWorkoutDraft | null> {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ActiveWorkoutDraft;
    if (parsed.version !== 1 || parsed.userId !== userId || !Array.isArray(parsed.exercises)) {
      await clearActiveWorkoutDraft(userId);
      return null;
    }

    return parsed;
  } catch {
    await clearActiveWorkoutDraft(userId);
    return null;
  }
}

export async function clearActiveWorkoutDraft(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyForUser(userId));
}
