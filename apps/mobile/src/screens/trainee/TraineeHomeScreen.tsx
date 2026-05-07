import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View, ActivityIndicator, ScrollView, Text, Modal } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { logOut } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import type { TraineeHomeNavigation } from "../../navigation/types";
import { auth } from "../../config/firebase";
import { Typography } from "../../components/Typography";
import Svg, { Circle, G, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
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
} from "../../services/userSession";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import { EXERCISE_LIBRARY, ExerciseLibraryItem } from "../../constants/exercises";
import { buildTodayMission, type TodayMissionItemId } from "../../features/retention/todayMission";
import { trackEvent } from "../../services/analytics";
import { toLocalDateKey } from "../../utils/dateKeys";

type TraineeHomeScreenProps = {
  onQuickAskCoach: () => void;
};

// Premium macro ring component.
const MacroRing = ({ current, target, label }: { current: number, target: number, label: string }) => {
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeTarget = target > 0 ? target : 2000;
  const progress = Math.min(current / safeTarget, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
              <Stop offset="1" stopColor="#d97706" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Circle stroke="#1c1c1e" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" />
          <Circle
            stroke="url(#grad)"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Typography variant="h2" style={{ fontSize: 24, lineHeight: 28 }}>{current}</Typography>
          <Typography variant="label" style={{ color: '#888', fontSize: 10 }}>/ {target} kcal</Typography>
        </View>
      </View>
      <Typography variant="label" style={{ color: '#fff', fontSize: 14, marginTop: 8, fontWeight: '700' }}>{label}</Typography>
    </View>
  );
};

export function TraineeHomeScreen({ onQuickAskCoach }: TraineeHomeScreenProps) {
  const navigation = useNavigation<TraineeHomeNavigation>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [prescribedMeals, setPrescribedMeals] = useState<PrescribedMeal[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedEx, setSelectedEx] = useState<ExerciseLibraryItem | null>(null);

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

  const handleMissionAction = (missionId: TodayMissionItemId) => {
    trackEvent("today_mission_action_pressed", {
      missionId,
      completionPercent: todayMission.completionPercent,
    });

    if (missionId === "workout") {
      if (prescribed.length > 0) {
        navigation.navigate("Workouts", { autoLoadPrescriptionId: prescribed[0].id });
      } else {
        navigation.navigate("Workouts");
      }
      return;
    }

    if (missionId === "nutrition") {
      navigation.navigate("Nutrition");
      return;
    }

    if (missionId === "coach") {
      if (profile?.assignmentStatus === "assigned") onQuickAskCoach();
      else navigation.navigate("CoachAssignment");
      return;
    }

    navigation.navigate("Progress");
  };

  return (
    <ScreenShell
      title="FYTRAK"
      subtitle=""
      contentStyle={styles.shellContent}
      rightActionIcon={!profile?.profileImageUrl ? "person-circle-outline" : undefined}
      rightActionImageUri={profile?.profileImageUrl}
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

            {/* PERSONALIZED GREETING HEADER */}
            <View style={styles.greetingHeader}>
              <View>
                <Typography variant="label" style={{ color: colors.primary, fontWeight: '800', letterSpacing: 1 }}>{greeting.toUpperCase()}</Typography>
                <Typography variant="h1" style={{ fontSize: 32, marginTop: 4 }}>{profile?.name?.split(' ')[0] || "Athlete"}</Typography>
              </View>
              {isPremium && <PremiumBadge />}
            </View>

            <View style={styles.missionCard}>
              <View style={styles.missionHeader}>
                <View>
                  <Typography variant="label" color={colors.primary}>TODAY MISSION</Typography>
                  <Typography variant="h2" style={{ fontSize: 22 }}>{todayMission.headline}</Typography>
                </View>
                <View style={styles.missionScore}>
                  <Typography style={styles.missionScoreText}>{todayMission.completionPercent}%</Typography>
                </View>
              </View>
              <View style={styles.missionTrack}>
                <View style={[styles.missionProgress, { width: `${todayMission.completionPercent}%` }]} />
              </View>
              <View style={styles.missionList}>
                {todayMission.items.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.missionItem, item.isComplete && styles.missionItemComplete]}
                    onPress={() => handleMissionAction(item.id)}
                  >
                    <View style={[styles.missionIcon, item.isComplete && styles.missionIconComplete]}>
                      <Ionicons name={item.icon as any} size={18} color={item.isComplete ? "#000" : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Typography variant="h2" style={{ fontSize: 14 }}>{item.title}</Typography>
                      <Typography variant="label" color="#777" style={{ fontSize: 9 }}>{item.subtitle}</Typography>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#444" />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
                <Typography variant="h2">Today Status</Typography>
              </View>
              
              <View style={styles.statsGrid}>
                {/* Premium SVG macro ring. */}
                <View style={styles.ringContainer}>
                  <MacroRing 
                    current={nutritionStats.current} 
                    target={nutritionStats.target} 
                    label="Nutrition Intake" 
                  />
                  <View style={styles.ringSideStats}>
                    <View style={styles.sideStatBox}>
                       <Ionicons name="body-outline" size={16} color="#8c8c8c" />
                       <View>
                         <Typography variant="label" color="#8c8c8c" style={{ fontSize: 10 }}>BODY WEIGHT</Typography>
                         <Typography variant="h2" style={{ fontSize: 16 }}>{metrics[0]?.weight || profile?.weight || "--"} <Typography style={{ fontSize: 10, color: '#888' }}>kg</Typography></Typography>
                       </View>
                    </View>
                    <View style={styles.sideStatBox}>
                       <Ionicons name={workouts.length > 0 ? "checkmark-circle" : "time-outline"} size={16} color={workouts.length > 0 ? colors.primary : "#8c8c8c"} />
                       <View>
                         <Typography variant="label" color="#8c8c8c" style={{ fontSize: 10 }}>WORKOUT</Typography>
                         <Typography variant="h2" style={{ fontSize: 16, color: workouts.length > 0 ? colors.primary : '#fff' }}>{workoutStatus}</Typography>
                       </View>
                    </View>
                  </View>
                </View>

              </View>
            </View>

            {/* ACTIVE PROGRAM CARD */}
            {isPremium && programs.length > 0 && (() => {
              const activeProgram = programs[0];
              const currentWeek = activeProgram.weeks.find(w => w.sessions.some(s => !s.isCompleted)) || activeProgram.weeks[activeProgram.weeks.length - 1];
              const currentSession = currentWeek?.sessions.find(s => !s.isCompleted);
              const completedSessions = activeProgram.weeks.reduce((sum, w) => sum + w.sessions.filter(s => s.isCompleted).length, 0);
              const totalSessions = activeProgram.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
              const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

              return (
                <View style={[styles.card, { borderColor: '#f87171', backgroundColor: '#1a1010' }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="calendar" size={18} color="#f87171" />
                    <Typography variant="h2">Active Program</Typography>
                    <View style={[styles.coachBadge, { backgroundColor: '#f87171' }]}>
                      <Typography style={{ fontSize: 9, color: '#000', fontWeight: '900' }}>{activeProgram.level}</Typography>
                    </View>
                  </View>
                  <View style={styles.prescribedContent}>
                    <Typography variant="h2" style={{ fontSize: 20 }}>{activeProgram.title}</Typography>
                    <Typography variant="label" color="#8c8c8c">
                      {currentWeek ? `Week ${currentWeek.weekNumber}` : 'Complete'} | {currentSession ? currentSession.title : 'All done!'} | By {activeProgram.coachName}
                    </Typography>
                  </View>
                  {/* Progress Bar */}
                  <View style={{ height: 6, backgroundColor: '#2c2c2e', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#f87171', borderRadius: 3 }} />
                  </View>
                  <Typography variant="label" color="#666" style={{ textAlign: 'right', fontSize: 10 }}>{progressPct}% complete ({completedSessions}/{totalSessions} sessions)</Typography>
                </View>
              );
            })()}

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
                    {prescribed[0].exercises.length} exercises | By {prescribed[0].coachName}
                  </Typography>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                    {prescribed[0].exercises.map((pEx, idx) => {
                      const libEx = EXERCISE_LIBRARY.find(l => l.name.en.toLowerCase() === pEx.name.toLowerCase());
                      return (
                        <Pressable 
                          key={idx} 
                          style={styles.previewItem}
                          onPress={() => libEx && setSelectedEx(libEx)}
                        >
                          <View style={styles.previewIcon}>
                             <Ionicons name="barbell" size={16} color={colors.primary} />
                          </View>
                          <Text style={styles.previewText} numberOfLines={1}>{pEx.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <Pressable
                  style={styles.startPrescribedBtn}
                  onPress={() => Alert.alert("Start Workout", `Prepare for ${prescribed[0].title}?`, [
                    { text: "Later", style: "cancel" },
                    {
                      text: "Start Now",
                      onPress: () => navigation.navigate("Workouts", { autoLoadPrescriptionId: prescribed[0].id })
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
                    {prescribedMeals[0].macros.calories} kcal | {prescribedMeals[0].macros.protein}g Protein
                  </Typography>
                </View>
                <Pressable
                  style={[styles.startPrescribedBtn, { backgroundColor: "#4ade80" }]}
                  onPress={() => navigation.navigate("Nutrition")}
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
                  onPress={() => setShowLogoutModal(true)}
                >
                  <Ionicons name="log-out-outline" size={20} color="#ff4444" />
                  <Typography style={[styles.actionButtonText, { color: "#ff4444" }] as any}>Log Out</Typography>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* CUSTOM LOGOUT OVERLAY */}
      <Modal transparent={true} visible={showLogoutModal} animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <Ionicons name="log-out-outline" size={28} color="#ff4444" />
            </View>
            <Typography variant="h2" style={styles.modalTitle}>Log Out</Typography>
            <Typography style={styles.modalDesc as any}>Are you sure you want to sign out?</Typography>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
                <Typography style={styles.modalBtnText as any}>CANCEL</Typography>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={() => { setShowLogoutModal(false); void logOut(); }}>
                <Typography style={styles.modalBtnText as any}>LOGOUT</Typography>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ExerciseDetailSheet 
        exercise={selectedEx}
        isVisible={!!selectedEx}
        onClose={() => setSelectedEx(null)}
      />
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
  missionCard: {
    backgroundColor: "#101010",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 14,
  },
  missionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  missionScore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  missionScoreText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  missionTrack: {
    height: 7,
    backgroundColor: "#242424",
    borderRadius: 999,
    overflow: "hidden",
  },
  missionProgress: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  missionList: {
    gap: 8,
  },
  missionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242424",
  },
  missionItemComplete: {
    opacity: 0.74,
  },
  missionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  missionIconComplete: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  greetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  ringContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#1c1c1e' },
  ringSideStats: { flex: 1, marginLeft: 24, gap: 16 },
  sideStatBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#111', borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, marginBottom: 8 },
  modalDesc: { color: '#8c8c8c', fontSize: 16, textAlign: 'center', marginBottom: 32, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, padding: 18, borderRadius: 16, backgroundColor: '#222', alignItems: 'center' },
  modalConfirmBtn: { flex: 1, padding: 18, borderRadius: 16, backgroundColor: '#ff4444', alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  previewItem: { alignItems: 'center', width: 80, gap: 6, marginRight: 12 },
  previewIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,204,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,204,0,0.2)' },
  previewText: { color: '#ccc', fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
