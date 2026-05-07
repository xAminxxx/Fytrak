type AnalyticsEventMap = {
  workout_completed: {
    setsCompleted: number;
    totalVolume: number;
    durationMinutes: number;
    personalRecords: number;
    source: "manual" | "coach_prescribed";
  };
  active_workout_resumed: {
    exerciseCount: number;
    ageMinutes: number;
  };
  today_mission_action_pressed: {
    missionId: "workout" | "nutrition" | "coach" | "bodyMetric";
    completionPercent: number;
  };
  coach_risk_card_opened: {
    risk: "high" | "medium" | "low";
    complianceScore: number;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

const sanitizePayload = <T extends AnalyticsEventName>(payload: AnalyticsEventMap[T]) => {
  return JSON.parse(JSON.stringify(payload)) as AnalyticsEventMap[T];
};

export function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  payload: AnalyticsEventMap[T]
): void {
  const safePayload = sanitizePayload(payload);

  if (__DEV__) {
    console.log(`[Analytics] ${eventName}`, safePayload);
  }

  // Production adapter goes here: Firebase Analytics, Segment, Amplitude, etc.
}
