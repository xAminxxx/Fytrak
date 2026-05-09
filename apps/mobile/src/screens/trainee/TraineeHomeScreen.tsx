import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View, ActivityIndicator, ScrollView, Text } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { TraineeHomeNavigation } from "../../navigation/types";
import { Typography } from "../../components/Typography";
import { MacroRing } from "../../components/MacroRing";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import { EXERCISE_LIBRARY, ExerciseLibraryItem } from "../../constants/exercises";
import type { TodayMissionItemId } from "../../features/retention/todayMission";
import { trackEvent } from "../../services/analytics";
import { useTraineeDashboard } from "../../hooks/useTraineeDashboard";
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
    isLoading,
    isPremium,
    nutritionStats,
    workoutStatus,
    greeting,
    todayMission,
  } = useTraineeDashboard();
  const primaryAction = useMemo(() => {
    if (prescribed.length > 0) {
      return {
        eyebrow: "Coach assigned",
        title: prescribed[0].title,
        subtitle: `${prescribed[0].exercises.length} exercises ready`,
        icon: "play" as const,
        actionLabel: "Start session",
        onPress: () => navigation.navigate("Workouts", { autoLoadPrescriptionId: prescribed[0].id }),
      };
    }

    if (workouts.length === 0) {
      return {
        eyebrow: "Training focus",
        title: "Log today's workout",
        subtitle: "Keep the streak alive with a fast session log.",
        icon: "barbell" as const,
        actionLabel: "Start workout",
        onPress: () => navigation.navigate("Workouts"),
      };
    }

    if (nutritionStats.current < nutritionStats.target * 0.6) {
      return {
        eyebrow: "Recovery support",
        title: "Log nutrition",
        subtitle: `${nutritionStats.current}/${nutritionStats.target} kcal tracked today`,
        icon: "nutrition" as const,
        actionLabel: "Open nutrition",
        onPress: () => navigation.navigate("Nutrition"),
      };
    }

    if (profile?.assignmentStatus === "assigned") {
      return {
        eyebrow: "Accountability",
        title: "Send a coach update",
        subtitle: "Share how the session felt while it is fresh.",
        icon: "chatbubble-ellipses" as const,
        actionLabel: "Ask coach",
        onPress: onQuickAskCoach,
      };
    }

    return {
      eyebrow: "Transformation",
      title: "Review progress",
      subtitle: "See what your consistency is building.",
      icon: "stats-chart" as const,
      actionLabel: "View progress",
      onPress: () => navigation.navigate("Progress"),
    };
  }, [navigation, nutritionStats.current, nutritionStats.target, onQuickAskCoach, prescribed, profile?.assignmentStatus, workouts.length]);

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

            <Pressable style={styles.primaryActionCard} onPress={primaryAction.onPress}>
              <View style={styles.primaryActionIcon}>
                <Ionicons name={primaryAction.icon} size={24} color={colors.primaryText} />
              </View>
              <View style={styles.primaryActionCopy}>
                <Typography variant="label" color="rgba(0,0,0,0.62)">{primaryAction.eyebrow}</Typography>
                <Typography variant="h2" style={styles.primaryActionTitle}>{primaryAction.title}</Typography>
                <Typography variant="label" color="#8c8c8c" style={styles.primaryActionSubtitle}>
                  {primaryAction.subtitle}
                </Typography>
              </View>
              <View style={styles.primaryActionCta}>
                <Typography style={styles.primaryActionCtaText}>{primaryAction.actionLabel}</Typography>
                <Ionicons name="arrow-forward" size={16} color={colors.primaryText} />
              </View>
            </Pressable>

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
                <Ionicons name="compass" size={18} color={colors.primary} />
                <Typography variant="h2">Support tools</Typography>
              </View>
              <View style={styles.actionsGrid}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333" }]}
                  onPress={() => navigation.navigate("Nutrition")}
                >
                  <Ionicons name="nutrition" size={20} color={colors.primary} />
                  <Typography style={[styles.actionButtonText, { color: colors.primary }] as any}>Nutrition</Typography>
                </Pressable>
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
  primaryActionCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionCopy: {
    flex: 1,
    gap: 3,
  },
  primaryActionTitle: {
    color: colors.primaryText,
    fontSize: 18,
    lineHeight: 23,
  },
  primaryActionSubtitle: {
    color: "rgba(0,0,0,0.62)",
    fontSize: 10,
  },
  primaryActionCta: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryActionCtaText: {
    color: colors.primaryText,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
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
  previewRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  previewItem: { alignItems: 'center', width: 80, gap: 6, marginRight: 12 },
  previewIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,204,0,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,204,0,0.2)' },
  previewText: { color: '#ccc', fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
