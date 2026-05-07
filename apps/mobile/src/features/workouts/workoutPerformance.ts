import type { WorkoutLog, WorkoutSet } from "../../services/userSession";
import type { ActiveWorkoutExerciseDraft } from "./activeWorkoutDraft";

export type CompletedWorkoutExercise = {
  name: string;
  sets: WorkoutSet[];
};

export type WorkoutPersonalRecord = {
  exerciseName: string;
  estimatedOneRepMax: number;
  previousBest: number;
};

export function getCompletedWorkoutExercises(exercises: ActiveWorkoutExerciseDraft[]): CompletedWorkoutExercise[] {
  return exercises
    .map((exercise) => ({
      name: exercise.name.trim() || "Untitled",
      sets: exercise.sets.filter((set) => set.isCompleted),
    }))
    .filter((exercise) => exercise.sets.length > 0);
}

export function calculateWorkoutVolume(exercises: CompletedWorkoutExercise[]): number {
  return exercises.reduce((sum, exercise) => {
    return sum + exercise.sets.reduce((setSum, set) => {
      return setSum + ((set.weight || 0) * (set.reps || 0));
    }, 0);
  }, 0);
}

export function duplicateSetForNextEntry(set: WorkoutSet, type: WorkoutSet["type"]): WorkoutSet {
  return {
    type,
    reps: set.reps,
    weight: set.weight,
    durationSec: set.durationSec,
    rpe: set.rpe,
    isCompleted: false,
  };
}

function estimateOneRepMax(set: WorkoutSet): number {
  if (!set.weight || !set.reps || set.reps <= 0) return 0;
  return set.weight / (1.0278 - 0.0278 * set.reps);
}

export function detectWorkoutPersonalRecords(
  completedExercises: CompletedWorkoutExercise[],
  workoutHistory: WorkoutLog[]
): WorkoutPersonalRecord[] {
  const previousBestByExercise = new Map<string, number>();

  workoutHistory.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const key = exercise.name.trim().toLowerCase();
      const bestInWorkout = exercise.sets.reduce((best, set) => Math.max(best, estimateOneRepMax(set)), 0);
      previousBestByExercise.set(key, Math.max(previousBestByExercise.get(key) || 0, bestInWorkout));
    });
  });

  return completedExercises.flatMap((exercise) => {
    const key = exercise.name.trim().toLowerCase();
    const currentBest = exercise.sets.reduce((best, set) => Math.max(best, estimateOneRepMax(set)), 0);
    const previousBest = previousBestByExercise.get(key) || 0;

    if (currentBest > 0 && currentBest > previousBest + 0.5) {
      return [{
        exerciseName: exercise.name,
        estimatedOneRepMax: Math.round(currentBest),
        previousBest: Math.round(previousBest),
      }];
    }

    return [];
  });
}
