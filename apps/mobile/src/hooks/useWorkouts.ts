/**
 * useWorkouts — Subscribes to the current user's workout history.
 * Encapsulates the subscribeToWorkouts pattern used in 3+ screens.
 */
import { useEffect, useState } from "react";
import { subscribeWithCache } from "../data/subscriptions/subscriptionCache";
import { subscribeToWorkouts, type WorkoutLog } from "../services/workoutService";
import { useCurrentUser } from "./useCurrentUser";

export function useWorkouts() {
  const uid = useCurrentUser();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    if (!uid) {
      setWorkouts([]);
      return;
    }

    return subscribeWithCache(
      `workouts:${uid}`,
      (emit) => subscribeToWorkouts(uid, emit),
      setWorkouts
    );
  }, [uid]);

  return workouts;
}
