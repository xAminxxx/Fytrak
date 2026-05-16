import { useEffect, useMemo, useState } from "react";
import { auth } from "../../../config/firebase";
import {
  subscribeToUserProfile,
  subscribeToWorkouts,
  type UserProfile,
  type WorkoutLog,
} from "../../../services/userSession";

export type ProfileChartPoint = {
  value: number;
  label: string;
};

export type ProfileOverview = {
  profile: UserProfile | null;
  isLoading: boolean;
  workoutsCount: number;
  totalVolume: number;
  totalSets: number;
  weeklyWorkouts: number;
  streakDays: number;
  chartData: ProfileChartPoint[];
  completionPercent: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function workoutDate(log: WorkoutLog): Date | null {
  const raw = log.createdAt;
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw.seconds === "number") return new Date(raw.seconds * 1000);
  if (typeof raw.toDate === "function") return raw.toDate();
  return null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calculateStreak(workouts: WorkoutLog[]): number {
  const workoutDays = new Set(
    workouts
      .map(workoutDate)
      .filter((date): date is Date => Boolean(date))
      .map(dayKey)
  );

  let streak = 0;
  const cursor = new Date();

  while (workoutDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  if (streak === 0) {
    cursor.setDate(cursor.getDate() - 1);
    while (workoutDays.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return streak;
}

function completionPercent(profile: UserProfile | null): number {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.name),
    Boolean(profile.profileImageUrl),
    Boolean(profile.goal && profile.goal !== "Not set"),
    Boolean(profile.weight),
    Boolean(profile.height),
    Boolean(profile.workoutProfileCompleted),
    Boolean(profile.nutritionProfileCompleted),
    Boolean(profile.selectedCoachName),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildWeeklyChart(workouts: WorkoutLog[]): ProfileChartPoint[] {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * DAY_MS);
    return {
      date,
      key: dayKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      value: 0,
    };
  });

  workouts.forEach((log) => {
    const date = workoutDate(log);
    if (!date) return;
    const match = days.find((day) => day.key === dayKey(date));
    if (match) {
      match.value += Math.max(1, Math.round((log.totalVolume || 0) / 100));
    }
  });

  return days.map(({ label, value }) => ({ label, value }));
}

export function useProfileOverview(): ProfileOverview {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribeProfile = subscribeToUserProfile(user.uid, (data) => {
      setProfile(data);
      setIsLoading(false);
    });
    const unsubscribeWorkouts = subscribeToWorkouts(user.uid, setWorkouts);

    return () => {
      unsubscribeProfile();
      unsubscribeWorkouts();
    };
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const recentWorkouts = workouts.filter((log) => {
      const date = workoutDate(log);
      return date ? now - date.getTime() <= 7 * DAY_MS : false;
    });

    const totalSets = workouts.reduce(
      (sum, workout) => sum + workout.exercises.reduce((exerciseSum, exercise) => exerciseSum + exercise.sets.length, 0),
      0
    );

    return {
      profile,
      isLoading,
      workoutsCount: workouts.length,
      totalVolume: workouts.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0),
      totalSets,
      weeklyWorkouts: recentWorkouts.length,
      streakDays: calculateStreak(workouts),
      chartData: buildWeeklyChart(workouts),
      completionPercent: completionPercent(profile),
    };
  }, [isLoading, profile, workouts]);
}
