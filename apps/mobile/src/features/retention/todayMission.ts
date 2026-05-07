export type TodayMissionItemId = "workout" | "nutrition" | "coach" | "bodyMetric";

export type TodayMissionItem = {
  id: TodayMissionItemId;
  title: string;
  subtitle: string;
  icon: string;
  isComplete: boolean;
  priority: number;
};

export type TodayMission = {
  completionPercent: number;
  completedCount: number;
  totalCount: number;
  headline: string;
  items: TodayMissionItem[];
};

type BuildTodayMissionInput = {
  hasWorkoutToday: boolean;
  caloriesLogged: number;
  calorieTarget: number;
  hasCoachAssigned: boolean;
  hasPendingWorkoutPlan: boolean;
  hasPendingMealPlan: boolean;
  hasBodyMetricToday: boolean;
};

export function buildTodayMission(input: BuildTodayMissionInput): TodayMission {
  const nutritionComplete = input.calorieTarget > 0
    ? input.caloriesLogged >= input.calorieTarget * 0.7
    : input.caloriesLogged > 0;

  const unsortedItems: TodayMissionItem[] = [
    {
      id: "workout",
      title: input.hasPendingWorkoutPlan ? "Complete coach session" : "Log today's workout",
      subtitle: input.hasWorkoutToday ? "Training complete" : input.hasPendingWorkoutPlan ? "Coach plan is waiting" : "One logged session keeps the chain alive",
      icon: input.hasWorkoutToday ? "checkmark-circle" : "barbell-outline",
      isComplete: input.hasWorkoutToday,
      priority: input.hasPendingWorkoutPlan ? 1 : 2,
    },
    {
      id: "nutrition",
      title: input.hasPendingMealPlan ? "Review nutrition plan" : "Hit nutrition baseline",
      subtitle: nutritionComplete ? "Nutrition is on track" : `${input.caloriesLogged}/${input.calorieTarget || 2100} kcal logged`,
      icon: nutritionComplete ? "checkmark-circle" : "nutrition-outline",
      isComplete: nutritionComplete,
      priority: input.hasPendingMealPlan ? 1 : 3,
    },
    {
      id: "coach",
      title: input.hasCoachAssigned ? "Check coach channel" : "Find your coach",
      subtitle: input.hasCoachAssigned ? "Keep accountability warm" : "Unlock human accountability",
      icon: input.hasCoachAssigned ? "chatbubble-ellipses-outline" : "person-add-outline",
      isComplete: input.hasCoachAssigned,
      priority: 4,
    },
    {
      id: "bodyMetric",
      title: "Update body signal",
      subtitle: input.hasBodyMetricToday ? "Today's body metric saved" : "Add weight or progress data",
      icon: input.hasBodyMetricToday ? "checkmark-circle" : "speedometer-outline",
      isComplete: input.hasBodyMetricToday,
      priority: 5,
    },
  ];
  const items = unsortedItems.sort((a, b) => Number(a.isComplete) - Number(b.isComplete) || a.priority - b.priority);

  const completedCount = items.filter((item) => item.isComplete).length;
  const totalCount = items.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  let headline = "Win today";
  if (completionPercent === 100) headline = "Mission complete";
  else if (completionPercent >= 50) headline = "Strong day in progress";
  else if (input.hasPendingWorkoutPlan || input.hasPendingMealPlan) headline = "Coach plan waiting";

  return {
    completionPercent,
    completedCount,
    totalCount,
    headline,
    items,
  };
}
