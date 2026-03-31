import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View, ActivityIndicator, ScrollView } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { logOut } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { auth } from "../../config/firebase";
import { Typography } from "../../components/Typography";
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

  const isPremium = profile?.isPremium === true;

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
      title="Home"
      subtitle={isPremium ? "Premium Access Active" : "Your daily training tracking"}
      contentStyle={styles.shellContent}
      rightActionIcon="person-circle-outline"
      onRightAction={() => navigation.navigate("Profile")}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>

            {!isPremium && (
              <Pressable 
                style={styles.premiumBanner}
                onPress={() => {
                  if (profile?.assignmentStatus === 'pending') {
                    navigation.navigate("PendingCoach");
                  } else if (profile?.assignmentStatus === 'assigned') {
                    Alert.alert("Fytrak Premium", "Connect with your coach and unlock plans.");
                  } else {
                    navigation.navigate("CoachAssignment");
                  }
                }}
              >
                <View style={styles.bannerInfo}>
                  <Ionicons 
                      name={profile?.assignmentStatus === 'pending' ? "hourglass-outline" : "sparkles"} 
                      size={24} 
                      color={colors.primary} 
                  />
                  <View>
                    <Typography variant="h2" style={{ fontSize: 16 }}>
                      {profile?.assignmentStatus === 'pending' ? "Coach Request Pending" : "Find Your Coach"}
                    </Typography>
                    <Typography variant="label" color="#8c8c8c">
                      {profile?.assignmentStatus === 'pending' ? `Waiting for ${profile?.selectedCoachName}` : "Unlock custom plans from elite coaches"}
                    </Typography>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
                <Typography variant="h2">Today Status</Typography>
                {isPremium && <PremiumBadge />}
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.mainStatsRow}>
                  <View style={styles.mainStat}>
                    <Typography variant="label" color="#444">CURRENT MISSION</Typography>
                    <Typography variant="h2" style={{ color: colors.primary, fontSize: 22 }}>{profile?.goal?.replace('_', ' ') || "FITNESS"}</Typography>
                  </View>
                  <View style={[styles.statDivider, { height: 40 }]} />
                  <View style={styles.mainStat}>
                    <Typography variant="label" color="#444">BODY WEIGHT</Typography>
                    <Typography variant="h2" style={{ fontSize: 22 }}>{profile?.weight || "--"} <Typography style={{ fontSize: 10, color: '#444' }}>kg</Typography></Typography>
                  </View>
                </View>

                <View style={styles.progressSeparator} />

                <StatusLine
                  label="Daily Nutrition"
                  status={`${nutritionStats.current} / ${nutritionStats.target} kcal`}
                  color={nutritionStats.current >= nutritionStats.target ? "#f87171" : "#fff"}
                />
                <StatusLine
                  label="Workout"
                  status={workoutStatus}
                  color={workouts.length > 0 ? colors.primary : "#ff4444"}
                />
              </View>
            </View>

            {isPremium && prescribed.length > 0 && (
              <View style={[styles.card, { borderColor: colors.primary, backgroundColor: "#1a1a10" }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                  <Typography variant="h2">Upcoming Workout</Typography>
                  <View style={styles.coachBadge}>
                    <Typography style={{ fontSize: 9, color: '#000', fontWeight: '900' }}>COACH ASSIGNED</Typography>
                  </View>
                </View>
                <View style={styles.prescribedContent}>
                  <Typography variant="h2" style={{ fontSize: 20 }}>{prescribed[0].title}</Typography>
                  <Typography variant="label" color="#8c8c8c">
                    {prescribed[0].exercises.length} exercises • By {prescribed[0].coachName}
                  </Typography>
                </View>
                <Pressable
                  style={styles.startPrescribedBtn}
                  onPress={() => Alert.alert("Start Workout", `Prepare for ${prescribed[0].title}?`, [
                    { text: "Later", style: "cancel" },
                    {
                      text: "Start Now",
                      onPress: () => navigation.navigate("Workouts" as any, { autoLoadPrescriptionId: prescribed[0].id })
                    }
                  ])}
                >
                  <Typography style={{ color: colors.primaryText, fontWeight: "900", fontSize: 14 }}>START SESSION</Typography>
                  <Ionicons name="play" size={16} color={colors.primaryText} />
                </Pressable>
              </View>
            )}

            {isPremium && prescribedMeals.length > 0 && (
              <View style={[styles.card, { borderColor: "#4ade80", backgroundColor: "#101a14" }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="restaurant-outline" size={18} color="#4ade80" />
                  <Typography variant="h2">New Nutrition Plan</Typography>
                  <View style={[styles.coachBadge, { backgroundColor: "#4ade80" }]}>
                    <Typography style={{ fontSize: 9, color: '#000', fontWeight: '900' }}>COACH ASSIGNED</Typography>
                  </View>
                </View>
                <View style={styles.prescribedContent}>
                  <Typography variant="h2" style={{ fontSize: 20 }}>{prescribedMeals[0].title}</Typography>
                  <Typography variant="label" color="#8c8c8c">
                    {prescribedMeals[0].macros.calories} kcal • {prescribedMeals[0].macros.protein}g Protein
                  </Typography>
                </View>
                <Pressable
                  style={[styles.startPrescribedBtn, { backgroundColor: "#4ade80" }]}
                  onPress={() => navigation.navigate("Nutrition" as any)}
                >
                  <Typography style={{ color: "#000", fontWeight: "900", fontSize: 14 }}>REVIEW PLAN</Typography>
                  <Ionicons name="nutrition" size={16} color="#000" />
                </Pressable>
              </View>
            )}

            {!isPremium && (
              <View style={[styles.card, { borderStyle: 'dashed', opacity: 0.8 }]}>
                <View style={[styles.cardHeader, { opacity: 0.5 }]}>
                  <Ionicons name="lock-closed" size={18} color="#888" />
                  <Typography variant="h2" style={{ color: '#888' }}>Custom Coach Plans</Typography>
                </View>
                <Typography variant="label" color="#444">Upgrade to premium to receive personalized training and nutrition plans from your coach.</Typography>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="flash" size={18} color={colors.primary} />
                <Typography variant="h2">Quick actions</Typography>
              </View>
              <View style={styles.actionsGrid}>
                {profile?.assignmentStatus === 'assigned' ? (
                  <Pressable 
                    style={[styles.actionButton, !isPremium && styles.disabledAction]} 
                    onPress={() => isPremium ? onQuickAskCoach() : Alert.alert("Premium Only", "Asking a coach directly is a premium feature.")}
                  >
                    <Ionicons name={isPremium ? "chatbubble-ellipses" : "lock-closed"} size={20} color={isPremium ? colors.primaryText : "#666"} />
                    <Typography style={[styles.actionButtonText, !isPremium && { color: '#666' }] as any}>Ask Coach</Typography>
                  </Pressable>
                ) : (
                  <Pressable 
                    style={[styles.actionButton, { backgroundColor: colors.primary }]} 
                    onPress={() => navigation.navigate("CoachAssignment")}
                  >
                    <Ionicons name="search" size={20} color={colors.primaryText} />
                    <Typography style={styles.actionButtonText}>Find Coach</Typography>
                  </Pressable>
                )}

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
                  <Typography style={[styles.actionButtonText, { color: "#ff4444" }] as any}>Log Out</Typography>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function PremiumBadge() {
  return (
    <View style={styles.premiumBadge}>
      <Ionicons name="star" size={10} color="#000" />
      <Typography style={{ fontSize: 9, color: '#000', fontWeight: '900' }}>PREMIUM</Typography>
    </View>
  );
}

function StatusLine({ label, status, color }: { label: string; status: string; color?: string }) {
  return (
    <View style={styles.statusLine}>
      <Typography variant="label" color="#8c8c8c">{label}</Typography>
      <Typography style={{ color: color || '#fff', fontSize: 15, fontWeight: '700' }}>{status}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  scrollContainer: { paddingBottom: 140 },
  loader: { paddingTop: 40, alignItems: "center" },
  container: {
    gap: 16,
    marginTop: 10,
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
  },
  bannerInfo: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
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
  statsGrid: {
    gap: 4,
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
  disabledAction: {
    backgroundColor: "#222",
    borderColor: "#333",
    borderWidth: 1,
  },
  actionButtonText: {
    color: colors.primaryText,
    fontWeight: "900",
    fontSize: 14,
    textTransform: "uppercase",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginLeft: 8,
  },
  coachBadge: {
    marginLeft: "auto",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  prescribedContent: {
    gap: 4,
    marginTop: 4,
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
  mainStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1c1c1e', marginBottom: 8 },
  mainStat: { flex: 1, gap: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#1c1c1e', marginHorizontal: 16 },
  statusLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  progressSeparator: { height: 1, backgroundColor: '#1c1c1e', marginVertical: 8 },
});
