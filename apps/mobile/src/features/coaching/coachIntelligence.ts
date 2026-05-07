export type CoachClientSignal = {
  traineeId: string;
  lastWorkoutAt: Date | null;
  workoutsLast7Days: number;
  mealsLast7Days: number;
  avgDailyProtein: number;
  proteinTarget: number | null;
};

export type CoachClientRisk = "high" | "medium" | "low";

export type CoachClientIntelligence = CoachClientSignal & {
  complianceScore: number;
  risk: CoachClientRisk;
  riskReason: string;
  suggestedNudge: string;
};

export type CoachDashboardIntelligence = {
  avgCompliance: number;
  workoutsThisWeek: number;
  highRiskCount: number;
  clients: CoachClientIntelligence[];
  insights: {
    title: string;
    sub: string;
    icon: string;
    tone: "positive" | "warning" | "neutral";
  }[];
};

const daysSince = (date: Date | null): number | null => {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
};

export function scoreCoachClient(signal: CoachClientSignal): CoachClientIntelligence {
  const inactiveDays = daysSince(signal.lastWorkoutAt);
  const workoutScore = Math.min(signal.workoutsLast7Days / 3, 1) * 55;
  const mealScore = Math.min(signal.mealsLast7Days / 7, 1) * 25;
  const proteinRatio = signal.proteinTarget && signal.proteinTarget > 0
    ? Math.min(signal.avgDailyProtein / signal.proteinTarget, 1)
    : 0.6;
  const proteinScore = proteinRatio * 20;
  const complianceScore = Math.round(workoutScore + mealScore + proteinScore);

  let risk: CoachClientRisk = "low";
  let riskReason = "On track this week";
  let suggestedNudge = "Nice consistency this week. Keep the momentum going.";

  if (inactiveDays === null) {
    risk = "high";
    riskReason = "No workout logged yet";
    suggestedNudge = "Start with one short session today. I can adjust the plan if time is tight.";
  } else if (inactiveDays >= 5) {
    risk = "high";
    riskReason = `${inactiveDays} days since last workout`;
    suggestedNudge = "I noticed training has slipped this week. What blocked you, schedule or recovery?";
  } else if (signal.workoutsLast7Days < 2) {
    risk = "medium";
    riskReason = "Workout frequency is below plan";
    suggestedNudge = "Let us get one more session in this week. I can shorten it if needed.";
  } else if (signal.proteinTarget && proteinRatio < 0.7) {
    risk = "medium";
    riskReason = "Protein is below target";
    suggestedNudge = "Protein is the main gap this week. Add one high-protein meal or shake today.";
  } else if (signal.mealsLast7Days < 3) {
    risk = "medium";
    riskReason = "Nutrition logging is sparse";
    suggestedNudge = "Send me quick meal photos today. Precision can come later; consistency first.";
  }

  return {
    ...signal,
    complianceScore,
    risk,
    riskReason,
    suggestedNudge,
  };
}

export function buildCoachDashboardIntelligence(signals: CoachClientSignal[]): CoachDashboardIntelligence {
  const clients = signals.map(scoreCoachClient).sort((a, b) => {
    const riskRank = { high: 0, medium: 1, low: 2 };
    return riskRank[a.risk] - riskRank[b.risk] || a.complianceScore - b.complianceScore;
  });

  const avgCompliance = clients.length
    ? Math.round(clients.reduce((sum, client) => sum + client.complianceScore, 0) / clients.length)
    : 0;
  const workoutsThisWeek = clients.reduce((sum, client) => sum + client.workoutsLast7Days, 0);
  const highRiskCount = clients.filter((client) => client.risk === "high").length;
  const mediumRiskCount = clients.filter((client) => client.risk === "medium").length;

  const insights: CoachDashboardIntelligence["insights"] = [];

  if (clients.length === 0) {
    insights.push({
      title: "Roster is empty",
      sub: "New trainees will appear here once they request you.",
      icon: "people-outline",
      tone: "neutral",
    });
  } else if (highRiskCount > 0) {
    insights.push({
      title: "Clients need attention",
      sub: `${highRiskCount} client${highRiskCount === 1 ? "" : "s"} at high risk this week. Start with the first nudge below.`,
      icon: "warning-outline",
      tone: "warning",
    });
  } else {
    insights.push({
      title: "Compliance is steady",
      sub: `${workoutsThisWeek} workouts logged this week across ${clients.length} active client${clients.length === 1 ? "" : "s"}.`,
      icon: "trending-up",
      tone: "positive",
    });
  }

  if (mediumRiskCount > 0) {
    insights.push({
      title: "Prevent drop-off",
      sub: `${mediumRiskCount} client${mediumRiskCount === 1 ? "" : "s"} showing early friction. A quick check-in can save the week.`,
      icon: "chatbubble-ellipses-outline",
      tone: "warning",
    });
  }

  return {
    avgCompliance,
    workoutsThisWeek,
    highRiskCount,
    clients,
    insights,
  };
}
