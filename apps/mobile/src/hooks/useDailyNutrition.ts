/**
 * useDailyNutrition — Subscribes to today's meals for the current user.
 * Encapsulates the subscribeToDailyMeals pattern.
 */
import { useEffect, useState } from "react";
import { subscribeWithCache } from "../data/subscriptions/subscriptionCache";
import { subscribeToDailyMeals, type Meal } from "../services/nutritionService";
import { useCurrentUser } from "./useCurrentUser";
import { useLocalDateKey } from "./useLocalDateKey";

export function useDailyNutrition() {
  const uid = useCurrentUser();
  const [meals, setMeals] = useState<Meal[]>([]);
  const dateKey = useLocalDateKey();

  useEffect(() => {
    if (!uid) {
      setMeals([]);
      return;
    }

    return subscribeWithCache(
      `dailyMeals:${uid}:${dateKey}`,
      (emit) => subscribeToDailyMeals(uid, emit),
      setMeals
    );
  }, [uid, dateKey]);

  return meals;
}
