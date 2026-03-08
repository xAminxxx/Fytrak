import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { logOut } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { auth } from "../../config/firebase";
import {
  subscribeToDailyMeals,
  subscribeToWorkouts,
  subscribeToUserProfile,
  subscribeToPrescribedWorkouts,
  subscribeToPrescribedMeals,
  type Meal,
  type WorkoutLog,
  type UserProfile,
  type PrescribedWorkout,
  type PrescribedMeal
} from "../../services/userSession";

type TraineeHomeScreenProps = {
  onQuickAskCoach: () => void;
};

export function TraineeHomeScreen({ onQuickAskCoach }: TraineeHomeScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [prescribedMeals, setPrescribedMeals] = useState<PrescribedMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubMeals = subscribeToDailyMeals(user.uid, setMeals);
    const unsubWorkouts = subscribeToWorkouts(user.uid, (data) => {
      const today = new Date().toISOString().split("T")[0];
      const todayFlows = data.filter(w => {
        const wDate = (w.createdAt?.toDate ? w.createdAt.toDate() : new Date()).toISOString().split("T")[0];
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

    return () => {
      unsubMeals();
      unsubWorkouts();
      unsubPrescribed();
      unsubPrescribedMeals();
      unsubProfile();
    };
  }, []);

  const nutritionStats = useMemo(() => {
    const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const targetCals = profile?.macroTargets?.calories || 2100;
    return { current: totalCals, target: targetCals };
  }, [meals, profile]);

  const workoutStatus = useMemo(() => {
    return workouts.length > 0 ? "Completed" : "Pending";
  }, [workouts]);

  return (
    <ScreenShell
      title="Dashboard"
      subtitle="Your adherence and today's progress"
      contentStyle={styles.shellContent}
      rightActionIcon="person-circle-outline"
      onRightAction={() => navigation.navigate("Profile")}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="stats-chart" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Today status</Text>
            </View>
            <View style={styles.statsGrid}>
              <StatusLine
                label="Workout"
                status={workoutStatus}
                color={workoutStatus === "Completed" ? colors.primary : "#ff4444"}
              />
              <StatusLine
                label="Nutrition"
                status={`${nutritionStats.current} / ${nutritionStats.target} kcal`}
              />
              <StatusLine
                label="Daily Goal"
                status={nutritionStats.current >= nutritionStats.target * 0.9 ? "On Track" : "Logging..."}
                color={nutritionStats.current >= nutritionStats.target * 0.9 ? colors.primary : colors.textMuted}
              />
            </View>
          </View>

          {prescribed.length > 0 && (
            <View style={[styles.card, { borderColor: colors.primary, backgroundColor: "#1a1a10" }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>Upcoming Workout</Text>
                <View style={styles.coachBadge}>
                  <Text style={styles.coachBadgeText}>COACH ASSIGNED</Text>
                </View>
              </View>
              <View style={styles.prescribedContent}>
                <Text style={styles.prescribedTitle}>{prescribed[0].title}</Text>
                <Text style={styles.prescribedSub}>
                  {prescribed[0].exercises.length} exercises • By {prescribed[0].coachName}
                </Text>
              </View>
              <Pressable
                style={styles.startPrescribedBtn}
                onPress={() => Alert.alert("Start Workout", `Prepare for ${prescribed[0].title}?`, [
                  { text: "Later", style: "cancel" },
                  { text: "Start Now", onPress: () => navigation.navigate("Workouts" as any) }
                ])}
              >
                <Text style={styles.startPrescribedText}>START SESSION</Text>
                <Ionicons name="play" size={16} color={colors.primaryText} />
              </Pressable>
            </View>
          )}

          {prescribedMeals.length > 0 && (
            <View style={[styles.card, { borderColor: "#4ade80", backgroundColor: "#101a14" }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="restaurant-outline" size={18} color="#4ade80" />
                <Text style={styles.cardTitle}>New Nutrition Plan</Text>
                <View style={[styles.coachBadge, { backgroundColor: "#4ade80" }]}>
                  <Text style={[styles.coachBadgeText, { color: "#000" }]}>COACH ASSIGNED</Text>
                </View>
              </View>
              <View style={styles.prescribedContent}>
                <Text style={styles.prescribedTitle}>{prescribedMeals[0].title}</Text>
                <Text style={styles.prescribedSub}>
                  {prescribedMeals[0].macros.calories} kcal • {prescribedMeals[0].macros.protein}g Protein
                </Text>
              </View>
              <Pressable
                style={[styles.startPrescribedBtn, { backgroundColor: "#4ade80" }]}
                onPress={() => navigation.navigate("Nutrition" as any)}
              >
                <Text style={[styles.startPrescribedText, { color: "#000" }]}>REVIEW PLAN</Text>
                <Ionicons name="nutrition" size={16} color="#000" />
              </Pressable>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Quick actions</Text>
            </View>
            <View style={styles.actionsGrid}>
              <Pressable style={styles.actionButton} onPress={onQuickAskCoach}>
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primaryText} />
                <Text style={styles.actionButtonText}>Ask Coach</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333" }]}
                onPress={() => {
                  Alert.alert("Logout", "Are you sure you want to sign out?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Logout", style: "destructive", onPress: () => void logOut() },
                  ]);
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#ff4444" />
                <Text style={[styles.actionButtonText, { color: "#ff4444" }]}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

function StatusLine({ label, status, color }: { label: string; status: string; color?: string }) {
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, color ? { color } : {}]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingBottom: 100,
  },
  loader: {
    paddingTop: 40,
    alignItems: "center",
  },
  container: {
    gap: 16,
    marginTop: 10,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333333",
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  statsGrid: {
    gap: 12,
  },
  statusLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  statusLabel: {
    color: "#8c8c8c",
    fontSize: 15,
    fontWeight: "600",
  },
  statusValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    color: colors.primaryText,
    fontWeight: "900",
    fontSize: 14,
    textTransform: "uppercase",
  },
  coachBadge: {
    marginLeft: "auto",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coachBadgeText: {
    color: colors.primaryText,
    fontSize: 9,
    fontWeight: "900",
  },
  prescribedContent: {
    gap: 4,
    marginTop: 4,
  },
  prescribedTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  prescribedSub: {
    color: "#8c8c8c",
    fontSize: 14,
    fontWeight: "600",
  },
  startPrescribedBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    marginTop: 10,
  },
  startPrescribedText: {
    color: colors.primaryText,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
