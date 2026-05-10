import { useState, useEffect, useMemo } from "react";
import { subscribeWithCache } from "../data/subscriptions/subscriptionCache";
import {
  subscribeToDailyMeals,
  subscribeToWorkouts,
  subscribeToUserProfile,
  subscribeToPrescribedWorkouts,
  subscribeToPrescribedMeals,
  subscribeToLatestMetrics,
  subscribeToTraineePrograms,
  type Meal,
  type WorkoutLog,
  type UserProfile,
  type PrescribedWorkout,
  type PrescribedMeal,
  type BodyMetric,
  type Program
} from "../services/userSession";
import { buildTodayMission } from "../features/retention/todayMission";
import { toLocalDateKey } from "../utils/dateKeys";
import { useCurrentUser } from "./useCurrentUser";
import { useLocalDateKey } from "./useLocalDateKey";

export function useTraineeDashboard() {
  const uid = useCurrentUser();
  const dateKey = useLocalDateKey();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [prescribedMeals, setPrescribedMeals] = useState<PrescribedMeal[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const unsubMeals = subscribeWithCache<Meal[]>(
      `dailyMeals:${uid}:${dateKey}`,
      (emit) => subscribeToDailyMeals(uid, emit),
      setMeals
    );

    const unsubWorkouts = subscribeWithCache<WorkoutLog[]>(
      `workouts:${uid}`,
      (emit) => subscribeToWorkouts(uid, emit),
      (data) => {
        const todayFlows = data.filter((w) => {
          const wDate = toLocalDateKey(w.createdAt?.toDate ? w.createdAt.toDate() : new Date());
          return wDate === dateKey;
        });
        setWorkouts(todayFlows);
      }
    );

    const unsubPrescribed = subscribeWithCache<PrescribedWorkout[]>(
      `prescribedWorkouts:${uid}`,
      (emit) => subscribeToPrescribedWorkouts(uid, emit),
      setPrescribed
    );

    const unsubPrescribedMeals = subscribeWithCache<PrescribedMeal[]>(
      `prescribedMeals:${uid}`,
      (emit) => subscribeToPrescribedMeals(uid, emit),
      setPrescribedMeals
    );

    const unsubProfile = subscribeWithCache<UserProfile>(
      `profile:${uid}`,
      (emit) => subscribeToUserProfile(uid, emit),
      (data) => {
        setProfile(data);
        setIsLoading(false);
      }
    );

    const unsubMetrics = subscribeWithCache<BodyMetric[]>(
      `latestMetrics:${uid}`,
      (emit) => subscribeToLatestMetrics(uid, emit),
      setMetrics
    );

    const unsubPrograms = subscribeWithCache<Program[]>(
      `programs:${uid}`,
      (emit) => subscribeToTraineePrograms(uid, emit),
      setPrograms
    );

    return () => {
      unsubMeals();
      unsubWorkouts();
      unsubPrescribed();
      unsubPrescribedMeals();
      unsubProfile();
      unsubMetrics();
      unsubPrograms();
    };
  }, [uid, dateKey]);

  useEffect(() => {
    if (!uid) return;
    setIsLoading(true);
  }, [uid]);

  const isPremium = profile?.isPremium === true;

  const nutritionStats = useMemo(() => {
    const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const targetCals = profile?.macroTargets?.calories || 2100;
    return { current: totalCals, target: targetCals };
  }, [meals, profile]);

  const workoutStatus = useMemo(() => {
    return workouts.length > 0 ? "Completed" : "Pending";
  }, [workouts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const todayMission = useMemo(() => {
    const today = dateKey;
    const latestMetricDate = metrics[0]?.date;

    return buildTodayMission({
      hasWorkoutToday: workouts.length > 0,
      caloriesLogged: nutritionStats.current,
      calorieTarget: nutritionStats.target,
      hasCoachAssigned: profile?.assignmentStatus === "assigned",
      hasPendingWorkoutPlan: prescribed.length > 0,
      hasPendingMealPlan: prescribedMeals.length > 0,
      hasBodyMetricToday: latestMetricDate === today,
    });
  }, [metrics, nutritionStats.current, nutritionStats.target, prescribed.length, prescribedMeals.length, profile?.assignmentStatus, workouts.length, dateKey]);

  return {
    meals,
    workouts,
    profile,
    prescribed,
    prescribedMeals,
    metrics,
    programs,
    isLoading,
    isPremium,
    nutritionStats,
    workoutStatus,
    greeting,
    todayMission,
  };
}
