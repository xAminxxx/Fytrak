import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View, ActivityIndicator, ScrollView, Text } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { TraineeHomeNavigation } from "../../navigation/types";
import { Typography } from "../../components/Typography";
import { MacroRing } from "../../components/MacroRing";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import { EXERCISE_LIBRARY, ExerciseLibraryItem } from "../../constants/exercises";
import { trackEvent } from "../../services/analytics";
import { useTraineeDashboard } from "../../hooks/useTraineeDashboard";
import { DashboardActionCard } from "../../components/DashboardActionCard";
import { TodayMissionCard } from "../../features/retention/components/TodayMissionCard";
import type { TodayMissionItemId } from "../../features/retention/todayMission";
import { updateCheckInTaskStatus } from "../../services/userSession";
import { ToastService } from "../../components/Toast";
import { toSafeDate } from "../../utils/chartFilters";
import { auth } from "../../config/firebase";

type TraineeHomeScreenProps = {
  onQuickAskCoach: () => void;
};

export function TraineeHomeScreen({ onQuickAskCoach }: TraineeHomeScreenProps) {
  const navigation = useNavigation<TraineeHomeNavigation>();
  const [selectedEx, setSelectedEx] = useState<ExerciseLibraryItem | null>(null);

  const {
    profile,
    workouts,
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
  } = useTraineeDashboard();
  const hasAssignedCoach = profile?.assignmentStatus === "assigned" && !!profile?.selectedCoachId;

  const formatDueDate = (value?: string | null) => {
    if (!value) return "";
    const date = toSafeDate(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleTaskAction = async (taskId: string, status: "completed" | "dismissed") => {
    const traineeId = auth.currentUser?.uid || profile?.uid;
    if (!traineeId) {
      ToastService.error("Session expired", "Please sign in again.");
      return;
    }

    try {
      await updateCheckInTaskStatus(traineeId, taskId, status);
      ToastService.success(
        status === "completed" ? "Task completed" : "Task dismissed",
        status === "completed" ? "Nice work staying accountable." : "No worries. Keep moving forward."
      );
    } catch (error) {
      console.error("Failed to update task:", error);
      ToastService.error("Update failed", "Could not update the check-in task.");
    }
  };

  const handlePrimaryAction = () => {
    const { actionType, payload } = primaryAction;
    switch (actionType) {
      case "workout_prescription":
        navigation.navigate("Workouts", { autoLoadPrescriptionId: payload.prescriptionId });
        break;
      case "workout":
        navigation.navigate("Workouts");
        break;
      case "nutrition":
        navigation.navigate("Nutrition");
        break;
      case "chat":
        onQuickAskCoach();
        break;
      case "progress":
        navigation.navigate("Progress");
        break;
    }
  };

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
    } else if (missionId === "nutrition") {
      navigation.navigate("Nutrition");
    } else if (missionId === "coach") {
      if (profile?.assignmentStatus === "assigned") onQuickAskCoach();
      else navigation.navigate("CoachAssignment");
    } else {
      navigation.navigate("Progress");
    }
  };

  return (
    <ScreenShell
      title="FYTRAK"
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

            {/* COACH ASSIGNMENT BANNER */}
            {!hasAssignedCoach && (
              <Pressable 
                style={styles.premiumBanner}
                onPress={() => {
                  if (profile?.assignmentStatus === 'pending') {
                    navigation.navigate("PendingCoach");
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
                    <Typography variant="label" color={colors.textMuted}>
                      {profile?.assignmentStatus === 'pending' ? `Waiting for ${profile?.selectedCoachName}` : "Unlock custom plans from elite coaches"}
                    </Typography>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            )}

            {/* GREETING HEADER */}
            <View style={styles.greetingHeader}>
              <View>
                <Typography variant="label" color={colors.primary} style={{ fontWeight: '800', letterSpacing: 1 }}>{greeting.toUpperCase()}</Typography>
                <Typography variant="h1" style={{ fontSize: 32, marginTop: 4 }}>{profile?.name?.split(' ')[0] || "Athlete"}</Typography>
              </View>
              {isPremium && <PremiumBadge />}
            </View>

            {/* PRIMARY CONTEXTUAL ACTION */}
            <DashboardActionCard action={primaryAction} onPress={handlePrimaryAction} />

            {/* TODAY MISSION TRACKER */}
            <TodayMissionCard mission={todayMission} onAction={handleMissionAction} />

            {hasAssignedCoach && checkInTasks.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="clipboard" size={18} color={colors.primary} />
                  <Typography variant="h2">Coach check-ins</Typography>
                  <View style={styles.taskCountPill}>
                    <Typography style={styles.taskCountText}>{checkInTasks.length} OPEN</Typography>
                  </View>
                </View>
                <View style={styles.taskList}>
                  {checkInTasks.slice(0, 3).map((task) => {
                    const dueLabel = formatDueDate(task.dueDate);
                    return (
                      <View key={task.id} style={styles.taskItem}>
                        <View style={styles.taskInfo}>
                          <Typography variant="h2" style={styles.taskTitle}>{task.title}</Typography>
                          {!!task.description && (
                            <Typography variant="label" color={colors.textFaint} style={styles.taskDesc}>{task.description}</Typography>
                          )}
                          {!!dueLabel && (
                            <Typography variant="label" color={colors.warning} style={styles.taskDue}>Due {dueLabel}</Typography>
                          )}
                        </View>
                        <View style={styles.taskActions}>
                          <Pressable
                            style={[styles.taskActionBtn, styles.taskActionComplete]}
                            onPress={() => handleTaskAction(task.id, "completed")}
                          >
                            <Ionicons name="checkmark" size={16} color={colors.primaryText} />
                          </Pressable>
                          <Pressable
                            style={[styles.taskActionBtn, styles.taskActionDismiss]}
                            onPress={() => handleTaskAction(task.id, "dismissed")}
                          >
                            <Ionicons name="close" size={16} color={colors.textSecondary} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {checkInTasks.length > 3 && (
                  <Typography variant="label" color={colors.textFaint} style={styles.moreTasksText}>
                    {checkInTasks.length - 3} more tasks waiting
                  </Typography>
                )}
              </View>
            )}

            {/* TODAY STATS SUMMARY */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
                <Typography variant="h2">Today Status</Typography>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.ringContainer}>
                  <MacroRing 
                    current={nutritionStats.current} 
                    target={nutritionStats.target} 
                    label="Nutrition Intake" 
                  />
                  <View style={styles.ringSideStats}>
                    <View style={styles.sideStatBox}>
                       <Ionicons name="body-outline" size={16} color={colors.textFaint} />
                       <View>
                         <Typography variant="label" color={colors.textFaint} style={{ fontSize: 10 }}>BODY WEIGHT</Typography>
                         <Typography variant="h2" style={{ fontSize: 16 }}>{metrics[0]?.weight || profile?.weight || "--"} <Typography style={{ fontSize: 10, color: colors.textDim }}>kg</Typography></Typography>
                       </View>
                    </View>
                    <View style={styles.sideStatBox}>
                       <Ionicons name={workouts.length > 0 ? "checkmark-circle" : "time-outline"} size={16} color={workouts.length > 0 ? colors.success : colors.textFaint} />
                       <View>
                         <Typography variant="label" color={colors.textFaint} style={{ fontSize: 10 }}>WORKOUT</Typography>
                         <Typography variant="h2" style={{ fontSize: 16, color: workouts.length > 0 ? colors.success : colors.text }}>{workoutStatus}</Typography>
                       </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ACTIVE PROGRAM & COACH PLANS */}
            <CoachPlansSection 
                isPremium={isPremium}
                programs={programs}
                prescribed={prescribed}
                prescribedMeals={prescribedMeals}
                navigation={navigation}
                onSelectExercise={setSelectedEx}
            />

            {/* UTILITY ACTIONS */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="compass" size={18} color={colors.primary} />
                <Typography variant="h2">Support tools</Typography>
              </View>
              <View style={styles.actionsGrid}>
                <Pressable
                  style={[styles.actionButton, styles.outlinedAction]}
                  onPress={() => navigation.navigate("Nutrition")}
                >
                  <Ionicons name="nutrition" size={20} color={colors.primary} />
                  <Typography style={[styles.actionButtonText, { color: colors.primary }] as any}>Nutrition</Typography>
                </Pressable>
                {hasAssignedCoach ? (
                  <Pressable 
                    style={styles.actionButton}
                    onPress={onQuickAskCoach}
                  >
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.primaryText} />
                    <Typography style={styles.actionButtonText}>Ask Coach</Typography>
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
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <ExerciseDetailSheet 
        exercise={selectedEx}
        isVisible={!!selectedEx}
        onClose={() => setSelectedEx(null)}
      />
    </ScreenShell>
  );
}

function CoachPlansSection({ isPremium, programs, prescribed, prescribedMeals, navigation, onSelectExercise }: any) {
    if (!isPremium) {
        return (
            <View style={[styles.card, { borderStyle: 'dashed', opacity: 0.8 }]}>
                <View style={[styles.cardHeader, { opacity: 0.5 }]}>
                    <Ionicons name="lock-closed" size={18} color={colors.textFaint} />
                    <Typography variant="h2" style={{ color: colors.textFaint }}>Custom Coach Plans</Typography>
                </View>
                <Typography variant="label" color={colors.textDim}>Upgrade to premium to receive personalized training and nutrition plans from your coach.</Typography>
            </View>
        );
    }

    return (
        <>
            {programs.length > 0 && (() => {
                const activeProgram = programs[0];
                const currentWeek = activeProgram.weeks.find((w: any) => w.sessions.some((s: any) => !s.isCompleted)) || activeProgram.weeks[activeProgram.weeks.length - 1];
                const currentSession = currentWeek?.sessions.find((s: any) => !s.isCompleted);
                const completedSessions = activeProgram.weeks.reduce((sum: number, w: any) => sum + w.sessions.filter((s: any) => s.isCompleted).length, 0);
                const totalSessions = activeProgram.weeks.reduce((sum: number, w: any) => sum + w.sessions.length, 0);
                const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

                return (
                    <View style={[styles.card, { borderColor: colors.danger, backgroundColor: '#1a1010' }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="calendar" size={18} color={colors.danger} />
                            <Typography variant="h2">Active Program</Typography>
                            <View style={[styles.coachBadge, { backgroundColor: colors.danger }]}>
                                <Typography style={{ fontSize: 9, color: '#000', fontWeight: '900' }}>{activeProgram.level}</Typography>
                            </View>
                        </View>
                        <View style={styles.prescribedContent}>
                            <Typography variant="h2" style={{ fontSize: 20 }}>{activeProgram.title}</Typography>
                            <Typography variant="label" color={colors.textMuted}>
                                {currentWeek ? `Week ${currentWeek.weekNumber}` : 'Complete'} | {currentSession ? currentSession.title : 'All done!'} | By {activeProgram.coachName}
                            </Typography>
                        </View>
                        <View style={styles.progressBarTrack}>
                            <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: colors.danger }]} />
                        </View>
                        <Typography variant="label" color={colors.textFaint} style={{ textAlign: 'right', fontSize: 10 }}>{progressPct}% complete ({completedSessions}/{totalSessions} sessions)</Typography>
                    </View>
                );
            })()}

            {prescribed.length > 0 && (
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
                        <Typography variant="label" color={colors.textMuted}>
                            {prescribed[0].exercises.length} exercises | By {prescribed[0].coachName}
                        </Typography>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                            {prescribed[0].exercises.map((pEx: any, idx: number) => {
                                const libEx = EXERCISE_LIBRARY.find(l => l.name.en.toLowerCase() === pEx.name.toLowerCase());
                                return (
                                    <Pressable 
                                        key={idx} 
                                        style={styles.previewItem}
                                        onPress={() => libEx && onSelectExercise(libEx)}
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

            {prescribedMeals.length > 0 && (
                <View style={[styles.card, { borderColor: colors.success, backgroundColor: "#101a14" }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="restaurant-outline" size={18} color={colors.success} />
                        <Typography variant="h2">New Nutrition Plan</Typography>
                        <View style={[styles.coachBadge, { backgroundColor: colors.success }]}>
                            <Typography style={{ fontSize: 9, color: '#000', fontWeight: '900' }}>COACH ASSIGNED</Typography>
                        </View>
                    </View>
                    <View style={styles.prescribedContent}>
                        <Typography variant="h2" style={{ fontSize: 20 }}>{prescribedMeals[0].title}</Typography>
                        <Typography variant="label" color={colors.textMuted}>
                            {prescribedMeals[0].macros.calories} kcal | {prescribedMeals[0].macros.protein}g Protein
                        </Typography>
                    </View>
                    <Pressable
                        style={[styles.startPrescribedBtn, { backgroundColor: colors.success }]}
                        onPress={() => navigation.navigate("Nutrition")}
                    >
                        <Typography style={{ color: "#000", fontWeight: "900", fontSize: 14 }}>REVIEW PLAN</Typography>
                        <Ionicons name="nutrition" size={16} color="#000" />
                    </Pressable>
                </View>
            )}
        </>
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
    gap: spacing.lg,
    marginTop: 10,
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgElevated,
    padding: spacing.xl,
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  bannerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  greetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: radius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.borderStrong, gap: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  statsGrid: { gap: 4 },
  ringContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgDark, padding: spacing.xl, borderRadius: radius["2xl"], borderWidth: 1, borderColor: colors.borderSubtle },
  ringSideStats: { flex: 1, marginLeft: 24, gap: 16 },
  sideStatBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  previewRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  previewItem: { alignItems: 'center', width: 80, gap: 6, marginRight: 12 },
  previewIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,204,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,204,0,0.2)' },
  previewText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  
  actionsGrid: { flexDirection: "row", gap: spacing.md },
  actionButton: { flex: 1, flexDirection: "row", backgroundColor: colors.primary, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingVertical: spacing.lg, gap: 8 },
  outlinedAction: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  disabledAction: { backgroundColor: "#222", borderColor: "#333", borderWidth: 1 },
  actionButtonText: { color: colors.primaryText, fontWeight: "900", fontSize: 14, textTransform: "uppercase" },

  taskCountPill: { marginLeft: "auto", backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  taskCountText: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  taskList: { gap: spacing.md },
  taskItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.bgDark, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle },
  taskInfo: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 14 },
  taskDesc: { fontSize: 9, letterSpacing: 0.6 },
  taskDue: { fontSize: 9, letterSpacing: 0.6 },
  taskActions: { flexDirection: "row", gap: 8 },
  taskActionBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  taskActionComplete: { backgroundColor: colors.primary, borderColor: colors.primary },
  taskActionDismiss: { backgroundColor: "transparent", borderColor: colors.borderStrong },
  moreTasksText: { textAlign: "right", fontSize: 10 },

  premiumBadge: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, gap: 4, marginLeft: 8 },
  coachBadge: { marginLeft: "auto", backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.xs },
  prescribedContent: { gap: 4, marginTop: 4 },
  startPrescribedBtn: { backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: radius.md, gap: 10, marginTop: 10 },
  
  progressBarTrack: { height: 6, backgroundColor: colors.borderStrong, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
});
