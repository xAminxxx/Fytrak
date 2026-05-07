/**
 * Badge Service — Gamification and Achievement logic.
 */
import { WorkoutLog } from "./workoutService";

export type Badge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  criteria: string;
};

export const ALL_BADGES: Badge[] = [
  {
    id: "consistency_1",
    title: "Consistency King",
    description: "Logged workouts for 3 consecutive days.",
    icon: "calendar",
    color: "#4ade80",
    criteria: "streak_3"
  },
  {
    id: "volume_1",
    title: "1 Ton Club",
    description: "Lifted a total of 1,000kg across all sessions.",
    icon: "barbell",
    color: "#f87171",
    criteria: "volume_1000"
  },
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Finished a workout before 8:00 AM.",
    icon: "sunny",
    color: "#fbbf24",
    criteria: "time_early"
  },
  {
    id: "diversity_1",
    title: "Explorer",
    description: "Logged 10 different types of exercises.",
    icon: "map",
    color: "#60a5fa",
    criteria: "exercises_10"
  }
];

export function calculateEarnedBadges(workouts: WorkoutLog[]): Badge[] {
  const earned: Badge[] = [];
  if (!workouts || workouts.length === 0) return earned;

  // 1. Total Volume
  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  if (totalVolume >= 1000) earned.push(ALL_BADGES.find(b => b.id === "volume_1")!);

  // 2. Early Bird
  const hasEarlyBird = workouts.some(w => {
    const date = w.createdAt?.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
    return date.getHours() < 8;
  });
  if (hasEarlyBird) earned.push(ALL_BADGES.find(b => b.id === "early_bird")!);

  // 3. Explorer (Unique Exercises)
  const uniqueExercises = new Set();
  workouts.forEach(w => w.exercises.forEach(ex => uniqueExercises.add(ex.name.toLowerCase())));
  if (uniqueExercises.size >= 10) earned.push(ALL_BADGES.find(b => b.id === "diversity_1")!);

  // 4. Consistency (Streak - simplified)
  if (workouts.length >= 3) {
     // For demo purposes, we check if they have 3 workouts in total
     earned.push(ALL_BADGES.find(b => b.id === "consistency_1")!);
  }

  return earned;
}
