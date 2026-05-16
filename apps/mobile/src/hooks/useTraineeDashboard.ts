import { useState, useEffect, useMemo } from "react";
import { subscribeWithCache } from "../data/subscriptions/subscriptionCache";
import {
  subscribeToDailyMeals,
  subscribeToDailyWorkouts,
  subscribeToUserProfile,
  subscribeToPrescribedWorkouts,
  subscribeToPrescribedMeals,
  subscribeToOpenCheckInTasks,
  subscribeToLatestMetrics,
  subscribeToTraineePrograms,
  type Meal,
  type WorkoutLog,
  type UserProfile,
  type PrescribedWorkout,
  type PrescribedMeal,
  type BodyMetric,
  type Program,
  type CheckInTask
} from "../services/userSession";
import { getChatThreadId, subscribeToLatestMessage, type ChatThreadSummary } from "../services/chatService";
import { buildTodayMission } from "../features/retention/todayMission";
import { toLocalDateKey } from "../utils/dateKeys";
import { useCurrentUser } from "./useCurrentUser";
import { useLocalDateKey } from "./useLocalDateKey";
import { Ionicons } from "@expo/vector-icons";

export type DashboardAction = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  actionLabel: string;
  actionType: "workout" | "nutrition" | "chat" | "progress" | "workout_prescription";
  payload?: any;
};

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
  const [checkInTasks, setCheckInTasks] = useState<CheckInTask[]>([]);
  const [lastMessage, setLastMessage] = useState<ChatThreadSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const unsubMeals = subscribeWithCache<Meal[]>(
      `dailyMeals:${uid}:${dateKey}`,
      (emit) => subscribeToDailyMeals(uid, emit),
      setMeals
    );

    const unsubWorkouts = subscribeWithCache<WorkoutLog[]>(
      `dailyWorkouts:${uid}:${dateKey}`,
      (emit) => subscribeToDailyWorkouts(uid, dateKey, emit),
      setWorkouts
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

    const unsubCheckInTasks = subscribeWithCache<CheckInTask[]>(
      `openCheckInTasks:${uid}`,
      (emit) => subscribeToOpenCheckInTasks(uid, emit),
      setCheckInTasks
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

    let unsubChat: (() => void) | undefined;
    if (profile?.selectedCoachId) {
      const tid = getChatThreadId(uid, profile.selectedCoachId);
      unsubChat = subscribeToLatestMessage(tid, setLastMessage);
    }

    return () => {
      unsubMeals();
      unsubWorkouts();
      unsubPrescribed();
      unsubPrescribedMeals();
      unsubCheckInTasks();
      unsubProfile();
      unsubMetrics();
      unsubPrograms();
      unsubChat?.();
    };
  }, [uid, dateKey, profile?.selectedCoachId]);

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

    const hasMessagedToday = lastMessage && 
      toLocalDateKey(new Date(lastMessage.lastMessageAt || "")) === today &&
      lastMessage.lastSenderId === uid;

    return buildTodayMission({
      hasWorkoutToday: workouts.length > 0,
      caloriesLogged: nutritionStats.current,
      calorieTarget: nutritionStats.target,
      hasCoachAssigned: !!profile?.selectedCoachId,
      hasMessagedToday: !!hasMessagedToday,
      hasPendingWorkoutPlan: prescribed.length > 0,
      hasPendingMealPlan: prescribedMeals.length > 0,
      hasBodyMetricToday: latestMetricDate === today,
    });
  }, [metrics, nutritionStats.current, nutritionStats.target, prescribed.length, prescribedMeals.length, profile?.selectedCoachId, workouts.length, dateKey, lastMessage, uid]);

  const primaryAction = useMemo((): DashboardAction => {
    if (prescribed.length > 0) {
      return {
        eyebrow: "Coach assigned",
        title: prescribed[0].title,
        subtitle: `${prescribed[0].exercises.length} exercises ready`,
        icon: "play",
        actionLabel: "Start session",
        actionType: "workout_prescription",
        payload: { prescriptionId: prescribed[0].id }
      };
    }

    if (workouts.length === 0) {
      return {
        eyebrow: "Training focus",
        title: "Log today's workout",
        subtitle: "Keep the streak alive with a fast session log.",
        icon: "barbell",
        actionLabel: "Start workout",
        actionType: "workout"
      };
    }

    if (nutritionStats.current < nutritionStats.target * 0.6) {
      return {
        eyebrow: "Recovery support",
        title: "Log nutrition",
        subtitle: `${nutritionStats.current}/${nutritionStats.target} kcal tracked today`,
        icon: "nutrition",
        actionLabel: "Open nutrition",
        actionType: "nutrition"
      };
    }

    if (profile?.assignmentStatus === "assigned") {
      return {
        eyebrow: "Accountability",
        title: "Send a coach update",
        subtitle: "Share how the session felt while it is fresh.",
        icon: "chatbubble-ellipses",
        actionLabel: "Ask coach",
        actionType: "chat"
      };
    }

    return {
      eyebrow: "Transformation",
      title: "Review progress",
      subtitle: "See what your consistency is building.",
      icon: "stats-chart",
      actionLabel: "View progress",
      actionType: "progress"
    };
  }, [prescribed, workouts.length, nutritionStats.current, nutritionStats.target, profile?.assignmentStatus]);

  return {
    meals,
    workouts,
    profile,
    prescribed,
    prescribedMeals,
    metrics,
    programs,
    checkInTasks,
    isLoading,
    isPremium,
    nutritionStats,
    workoutStatus,
    greeting,
    todayMission,
    primaryAction,
  };
}
