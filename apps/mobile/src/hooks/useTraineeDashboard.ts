import { useState, useEffect, useMemo } from "react";
import { auth } from "../config/firebase";
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

export function useTraineeDashboard() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [prescribedMeals, setPrescribedMeals] = useState<PrescribedMeal[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubMeals = subscribeToDailyMeals(user.uid, setMeals);
    const unsubWorkouts = subscribeToWorkouts(user.uid, (data) => {
      const today = toLocalDateKey();
      const todayFlows = data.filter(w => {
        const wDate = toLocalDateKey(w.createdAt?.toDate ? w.createdAt.toDate() : new Date());
        return wDate === today;
      });
      setWorkouts(todayFlows);
    });

    const unsubPrescribed = subscribeToPrescribedWorkouts(user.uid, setPrescribed);
    const unsubPrescribedMeals = subscribeToPrescribedMeals(user.uid, setPrescribedMeals);

    const unsubProfile = subscribeToUserProfile(user.uid, (data) => {
      setProfile(data);
      setIsLoading(false);
    });

    const unsubMetrics = subscribeToLatestMetrics(user.uid, setMetrics);
    const unsubPrograms = subscribeToTraineePrograms(user.uid, setPrograms);

    return () => {
      unsubMeals();
      unsubWorkouts();
      unsubPrescribed();
      unsubPrescribedMeals();
      unsubProfile();
      unsubMetrics();
      unsubPrograms();
    };
  }, []);

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
    const today = toLocalDateKey();
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
  }, [metrics, nutritionStats.current, nutritionStats.target, prescribed.length, prescribedMeals.length, profile?.assignmentStatus, workouts.length]);

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
