/**
 * useDailyNutrition — Subscribes to today's meals for the current user.
 * Encapsulates the subscribeToDailyMeals pattern.
 */
import { useEffect, useState } from "react";
import { subscribeToDailyMeals, type Meal } from "../services/nutritionService";
import { useCurrentUser } from "./useCurrentUser";

export function useDailyNutrition() {
  const uid = useCurrentUser();
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToDailyMeals(uid, setMeals);
    return unsubscribe;
  }, [uid]);

  return meals;
}
