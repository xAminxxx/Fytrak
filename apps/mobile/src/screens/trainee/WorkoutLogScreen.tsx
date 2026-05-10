import * as Haptics from "expo-haptics";
import { useEffect, useState, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import {
  saveWorkoutLog,
  completePrescribedWorkout,
  saveWorkoutIntake,
  type ProfileLevel
} from "../../services/userSession";
import { ExerciseLibraryItem, t as tEx } from "../../constants/exercises";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";

// Shared Components
import { ToastService } from "../../components/Toast";
import { Typography } from "../../components/Typography";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import {
  clearActiveWorkoutDraft,
  type ActiveWorkoutExerciseDraft,
} from "../../features/workouts/activeWorkoutDraft";
import {
  calculateWorkoutVolume,
  detectWorkoutPersonalRecords,
  getLatestExercisePerformance,
  getCompletedWorkoutExercises,
} from "../../features/workouts/workoutPerformance";
import { trackEvent } from "../../services/analytics";
import { toLocalDateKey } from "../../utils/dateKeys";
import { radius, spacing, touchTarget, typography } from "../../theme/tokens";

import { useActiveWorkout } from "../../hooks/useActiveWorkout";
import { useExerciseSearch } from "../../hooks/useExerciseSearch";
import { usePrescribedWorkouts } from "../../hooks/usePrescribedWorkouts";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useWorkouts } from "../../hooks/useWorkouts";
import { WorkoutExerciseCard } from "../../components/WorkoutExerciseCard";
import { ExerciseSearchModal } from "../../features/workouts/components/ExerciseSearchModal";
import { WorkoutCheckInView } from "../../features/workouts/components/WorkoutCheckInView";
import { WorkoutIntakeView } from "../../features/workouts/components/WorkoutIntakeView";

type ExerciseLog = ActiveWorkoutExerciseDraft;

export function WorkoutLogScreen() {
  const workouts = useWorkouts();
  const prescribed = usePrescribedWorkouts();
  const { profile } = useUserProfile();

  const {
    workoutName, setWorkoutName,
    exercises, setExercises,
    activePrescriptionId, setActivePrescriptionId,
    workoutStartedAt, setWorkoutStartedAt,
    isCompletingWorkoutRef,
    restTimeLeft, setRestTimeLeft,
    timerActive, setTimerActive,
    initFromPrescribed,
    toggleSet,
    updateSet,
    duplicateSet,
    applyPreviousValues,
    removeExercise,
    updateExerciseType,
    undoLastCompletedSet,
  } = useActiveWorkout(workouts);

  // EXERCISE INFO MODAL
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<ExerciseLibraryItem | null>(null);
  const [isExerciseModalVisible, setIsExerciseModalVisible] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const {
    query: exerciseSearchQuery,
    setQuery: setExerciseSearchQuery,
    isSearching,
    filteredExercises,
    findExerciseInfo,
  } = useExerciseSearch({ includeMuscleGroup: true });

  const applyExerciseSelection = useCallback((exercise: ExerciseLog) => {
    setExercises((current) => {
      if (activeExerciseIndex === null) {
        return [...current, exercise];
      }

      return current.map((item, index) => (index === activeExerciseIndex ? exercise : item));
    });
  }, [activeExerciseIndex]);

  const addCustomExercise = useCallback((name: string) => {
    const customName = name.trim() || "Custom Exercise";
    applyExerciseSelection({
      name: customName,
      type: "WEIGHT_REPS",
      sets: [{ type: "WEIGHT_REPS", isCompleted: false }],
    });
  }, [applyExerciseSelection]);

  const lookupExerciseInfo = useCallback((exercise: ExerciseLog) => {
    return findExerciseInfo({ id: exercise.exerciseId, name: exercise.name });
  }, [findExerciseInfo]);

  const openExerciseDetails = useCallback((exercise: ExerciseLibraryItem) => {
    setIsExerciseModalVisible(false);
    setSelectedExerciseInfo(exercise);
  }, []);

  const addLibraryExerciseToWorkout = useCallback((exercise: ExerciseLibraryItem) => {
    applyExerciseSelection({
      exerciseId: exercise.id,
      name: tEx(exercise.name),
      type: exercise.defaultType,
      sets: [{ type: exercise.defaultType, isCompleted: false }],
    });
    setSelectedExerciseInfo(null);
    setExerciseSearchQuery("");
    ToastService.success("Added", `${tEx(exercise.name)} is ready to log.`);
  }, [applyExerciseSelection]);



  // NAVIGATION
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // COMPUTED LIVE STATS
  const totalSetsCompleted = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.isCompleted).length, 0);
  const totalVolume = exercises.reduce((sum, ex) => {
    return sum + ex.sets.filter(s => s.isCompleted && s.type === "WEIGHT_REPS").reduce((setSum, s) => setSum + ((Number(s.weight) || 0) * (Number(s.reps) || 0)), 0);
  }, 0);

  // INTAKE STATES
  const [showIntake, setShowIntake] = useState(false);
  const [level, setLevel] = useState<ProfileLevel>("Beginner");
  const [lastTrainedDate, setLastTrainedDate] = useState(new Date());
  const [trainingExp, setTrainingExp] = useState("");
  const [flexibility, setFlexibility] = useState(5);
  const [injuries, setInjuries] = useState("");
  const [healthIssues, setHealthIssues] = useState("");
  const [workStress, setWorkStress] = useState(5);
  const [workToughness, setWorkToughness] = useState(5);
  const [workStart, setWorkStart] = useState(new Date(new Date().setHours(9, 0, 0)));
  const [workEnd, setWorkEnd] = useState(new Date(new Date().setHours(17, 0, 0)));
  const [isRotatingShift, setIsRotatingShift] = useState(false);
  const [isSavingIntake, setIsSavingIntake] = useState(false);

  // CHECK-IN STATES
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [mood, setMood] = useState(3);

  // PREVENT ACCIDENTAL DISCARD
  useFocusEffect(
    useCallback(() => {
      const onBeforeRemove = (e: any) => {
        if (totalSetsCompleted === 0 || isCheckingIn || showIntake) return;
        e.preventDefault();
        Alert.alert(
          "Discard Workout?",
          "Are you sure you want to leave? Your active log will be lost.",
          [
            { text: "Keep Logging", style: "cancel", onPress: () => { } },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                const userId = auth.currentUser?.uid;
                if (userId) void clearActiveWorkoutDraft(userId);
                navigation.dispatch(e.data.action);
              }
            }
          ]
        );
      };
      navigation.addListener('beforeRemove', onBeforeRemove);
      return () => navigation.removeListener('beforeRemove', onBeforeRemove);
    }, [navigation, totalSetsCompleted, isCheckingIn, showIntake])
  );

  // INTAKE AUTO-SHOW
  useEffect(() => {
    if (profile && profile.workoutProfileCompleted !== true) setShowIntake(true);
  }, [profile]);

  // AUTO-LOAD PRESCRIPTION
  useEffect(() => {
    const targetId = route.params?.autoLoadPrescriptionId;
    if (targetId && prescribed.length > 0) {
      const found = prescribed.find(p => p.id === targetId);
      if (found) {
        initFromPrescribed(found);
        navigation.setParams({ autoLoadPrescriptionId: undefined });
      }
    }
  }, [route.params?.autoLoadPrescriptionId, prescribed]);



  const handleSaveIntake = async () => {
    if (!auth.currentUser) return;
    try {
      setIsSavingIntake(true);
      await saveWorkoutIntake(auth.currentUser.uid, {
        level,
        lastTrainedDate: toLocalDateKey(lastTrainedDate),
        trainingExperience: trainingExp.trim() || "None",
        flexibility,
        injuries: injuries.trim() || "None",
        healthIssues: healthIssues.trim() || "None",
        work: {
          stress: Number(workStress),
          toughness: Number(workToughness),
          timing: `${workStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${workEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | ${isRotatingShift ? "Rotating" : "Fixed"}`
        }
      });
      setShowIntake(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { ToastService.error("Error", "Failed to save details."); }
    finally { setIsSavingIntake(false); }
  };



  const handleCompleteWithCheckIn = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      isCompletingWorkoutRef.current = true;
      const completedExercises = getCompletedWorkoutExercises(exercises);
      const personalRecords = detectWorkoutPersonalRecords(completedExercises, workouts);
      const totalVolume = calculateWorkoutVolume(completedExercises);
      const duration = Math.max(1, Math.round((Date.now() - new Date(workoutStartedAt).getTime()) / 60000));
      await saveWorkoutLog(user.uid, {
        name: workoutName.trim() || "Today's Session",
        exercises: completedExercises,
        duration,
        totalVolume,
        checkIn: { energy, soreness, mood }
      });
      if (activePrescriptionId) await completePrescribedWorkout(user.uid, activePrescriptionId);
      await clearActiveWorkoutDraft(user.uid);
      trackEvent("workout_completed", {
        setsCompleted: completedExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
        totalVolume,
        durationMinutes: duration,
        personalRecords: personalRecords.length,
        source: activePrescriptionId ? "coach_prescribed" : "manual",
      });
      setIsCheckingIn(false);
      setExercises([]); // Clear local state so beforeRemove discard alert is bypassed
      ToastService.success(
        personalRecords.length > 0 ? "New PR!" : "Workout Complete!",
        personalRecords.length > 0
          ? `${personalRecords[0].exerciseName}: ${personalRecords[0].estimatedOneRepMax}kg estimated 1RM`
          : "Excellent work today."
      );
      navigation.navigate("Home");
    } catch (error) {
      console.error("Workout submission error:", error);
      isCompletingWorkoutRef.current = false;
      ToastService.error("Error", "Could not save log. Your workout draft is still saved.");
    }
  };

  const reviewCompletedExercises = getCompletedWorkoutExercises(exercises);
  const reviewPersonalRecords = detectWorkoutPersonalRecords(reviewCompletedExercises, workouts);
  const reviewDuration = Math.max(1, Math.round((Date.now() - new Date(workoutStartedAt).getTime()) / 60000));

  if (showIntake) {
    return (
      <ScreenShell title="Workout" subtitle="Onboarding details" contentStyle={styles.shellContent}>
        <WorkoutIntakeView
          level={level}
          onLevelChange={setLevel}
          trainingExp={trainingExp}
          onTrainingExpChange={setTrainingExp}
          injuries={injuries}
          onInjuriesChange={setInjuries}
          flexibility={flexibility}
          onFlexibilityChange={setFlexibility}
          lastTrainedDate={lastTrainedDate}
          onLastTrainedDateChange={setLastTrainedDate}
          healthIssues={healthIssues}
          onHealthIssuesChange={setHealthIssues}
          workStress={workStress}
          onWorkStressChange={setWorkStress}
          workToughness={workToughness}
          onWorkToughnessChange={setWorkToughness}
          workStart={workStart}
          onWorkStartChange={setWorkStart}
          workEnd={workEnd}
          onWorkEndChange={setWorkEnd}
          isSaving={isSavingIntake}
          onSubmit={handleSaveIntake}
        />
      </ScreenShell>
    );
  }

  if (isCheckingIn) {
    return (
      <ScreenShell title="Check-in" subtitle="Feedback" contentStyle={styles.shellContent}>
        <WorkoutCheckInView
          workoutName={workoutName}
          totalSetsCompleted={totalSetsCompleted}
          totalVolume={totalVolume}
          durationMinutes={reviewDuration}
          personalRecords={reviewPersonalRecords}
          energy={energy}
          onEnergyChange={setEnergy}
          soreness={soreness}
          onSorenessChange={setSoreness}
          mood={mood}
          onMoodChange={setMood}
          onSubmit={handleCompleteWithCheckIn}
          onBack={() => setIsCheckingIn(false)}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Workout" subtitle="Track progress" contentStyle={styles.shellContent}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {profile?.isPremium && prescribed.length > 0 && workoutName !== prescribed[0].title && (
            <Pressable style={styles.prescribedBanner} onPress={() => initFromPrescribed(prescribed[0])}>
              <Ionicons name="flash" size={18} color="#000" />
              <Text style={styles.bannerText}>LOAD COACH'S PLAN: {prescribed[0].title}</Text>
            </Pressable>
          )}

          <View style={styles.sessionFocusCard}>
            <View style={styles.sessionFocusHeader}>
              <View style={{ flex: 1 }}>
                <Typography variant="label" color={colors.primary}>ACTIVE SESSION</Typography>
                <TextInput
                  style={styles.workoutNameInput}
                  value={workoutName}
                  onChangeText={setWorkoutName}
                  placeholder="Workout Name"
                  placeholderTextColor="#444"
                />
              </View>
              <View style={styles.autosavePill}>
                <Ionicons name="cloud-done-outline" size={14} color={colors.success} />
                <Text style={styles.autosaveText}>Saved</Text>
              </View>
            </View>
            <View style={styles.liveStatsRow}>
              <View style={styles.liveStatBox}>
                <Typography variant="label" color="#8c8c8c">SETS</Typography>
                <Typography variant="metric">{totalSetsCompleted}</Typography>
              </View>
              <View style={styles.liveStatBox}>
                <Typography variant="label" color="#8c8c8c">VOLUME</Typography>
                <Typography variant="metric">{totalVolume} <Typography variant="label" color="#444">kg</Typography></Typography>
              </View>
              <View style={styles.liveStatBox}>
                <Typography variant="label" color="#8c8c8c">REST</Typography>
                <Typography variant="metric" style={styles.restMetric}>
                  {timerActive && restTimeLeft > 0 ? `${Math.floor(restTimeLeft / 60)}:${String(restTimeLeft % 60).padStart(2, "0")}` : "--"}
                </Typography>
              </View>
            </View>
            {totalSetsCompleted > 0 ? (
              <Pressable style={styles.undoLastSetBtn} onPress={undoLastCompletedSet}>
                <Ionicons name="arrow-undo" size={16} color={colors.textMuted} />
                <Text style={styles.undoLastSetText}>Undo last completed set</Text>
              </Pressable>
            ) : null}
          </View>

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#333" />
              <Typography variant="h2" color={colors.textMuted}>Time to train</Typography>
              <Typography variant="bodySmall" color={colors.textFaint}>Add your first exercise to start tracking.</Typography>
            </View>
          ) : (
            exercises.map((ex, exIdx) => {
              const previousPerformance = getLatestExercisePerformance(ex.name, workouts);
              const previousSummary = previousPerformance?.sets
                .slice(0, 3)
                .map((set) => {
                  if (set.type === "TIME") return `${set.durationSec || 0}s`;
                  if (set.type === "BODYWEIGHT" || set.type === "REPS_ONLY") return `${set.reps || 0} reps`;
                  return `${set.weight || 0}kg x ${set.reps || 0}`;
                })
                .join("  |  ");

              return (
                <WorkoutExerciseCard
                  key={exIdx}
                  ex={ex}
                  exIdx={exIdx}
                  previousSummary={previousSummary}
                  previousSets={previousPerformance?.sets}
                  hasVideoUrl={!!lookupExerciseInfo(ex)?.videoUrl}
                  onSearchExercise={() => {
                    setActiveExerciseIndex(exIdx);
                    setExerciseSearchQuery("");
                    setIsExerciseModalVisible(true);
                  }}
                  onOpenDetails={() => {
                    const info = lookupExerciseInfo(ex);
                    if (info) openExerciseDetails(info);
                  }}
                  onRemove={() => removeExercise(exIdx)}
                  onUpdateType={(type) => updateExerciseType(exIdx, type)}
                  onUpdateSet={(sIdx, field, value) => updateSet(exIdx, sIdx, field, value)}
                  onToggleSet={(sIdx) => toggleSet(exIdx, sIdx)}
                  onDuplicateSet={() => duplicateSet(exIdx)}
                  onApplyPrevious={(sets) => applyPreviousValues(exIdx, sets)}
                />
              );
            })
          )}

          <Pressable
            style={styles.addExBtn}
            onPress={() => {
              setActiveExerciseIndex(null);
              setExerciseSearchQuery("");
              setIsExerciseModalVisible(true);
            }}
          >
            <Ionicons name="add-circle" size={22} color={colors.primary} />
            <Text style={styles.addExText}>ADD EXERCISE</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.workoutActionDock}>
          <Pressable
            style={styles.dockFinishBtn}
            onPress={() => {
              if (totalSetsCompleted === 0) {
                ToastService.error("Empty Workout", "Please complete at least one set before checking in.");
                return;
              }
              setIsCheckingIn(true);
            }}
          >
            <Text style={styles.finishBtnText}>FINISH</Text>
            <Ionicons name="checkbox" size={20} color={colors.primaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {timerActive && restTimeLeft > 0 && (
        <RestTimer
          value={restTimeLeft}
          onAdjust={(d: number) => setRestTimeLeft(prev => prev + d)}
          onSkip={() => {
            setTimerActive(false);
            setRestTimeLeft(0);
          }}
        />
      )}

      <ExerciseSearchModal
        visible={isExerciseModalVisible}
        query={exerciseSearchQuery}
        onQueryChange={setExerciseSearchQuery}
        isSearching={isSearching}
        results={filteredExercises}
        onClose={() => setIsExerciseModalVisible(false)}
        onOpenDetails={openExerciseDetails}
        onSelectExercise={(exercise) => {
          addLibraryExerciseToWorkout(exercise);
          setIsExerciseModalVisible(false);
        }}
        onAddCustom={(name) => {
          addCustomExercise(name);
          setIsExerciseModalVisible(false);
          setExerciseSearchQuery("");
        }}
      />

      <ExerciseDetailSheet
        exercise={selectedExerciseInfo}
        isVisible={!!selectedExerciseInfo}
        onClose={() => setSelectedExerciseInfo(null)}
        primaryActionLabel="Add to workout"
        onPrimaryAction={addLibraryExerciseToWorkout}
      />
    </ScreenShell>
  );
}

function RestTimer({ value, onAdjust, onSkip }: any) {
  return (
    <View style={styles.floatingTimer}>
      <View style={styles.timerInfo}>
        <Ionicons name="timer" size={20} color="#000" />
        <Text style={styles.timerBold}>{Math.floor(value / 60)}:{String(value % 60).padStart(2, "0")}</Text>
      </View>
      <Pressable style={styles.timerActionBtn} onPress={() => onAdjust(30)}>
        <Text style={styles.timerActionText}>+30s</Text>
      </Pressable>
      <View style={styles.timerDivider} />
      <Pressable style={styles.timerActionBtn} onPress={onSkip}>
        <Ionicons name="play-skip-forward" size={18} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  scroll: { paddingBottom: 220, gap: spacing.lg },
  prescribedBanner: { minHeight: touchTarget.comfortable, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: spacing.md, borderRadius: radius.md, gap: spacing.sm, marginTop: spacing.sm },
  bannerText: { color: colors.primaryText, ...typography.label },
  sessionFocusCard: { backgroundColor: colors.bgElevated, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.lg },
  sessionFocusHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  workoutNameInput: { color: colors.text, ...typography.title, marginTop: spacing.sm },
  autosavePill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderSubtle },
  autosaveText: { color: colors.textMuted, ...typography.label },
  liveStatsRow: { flexDirection: "row", gap: spacing.md },
  liveStatBox: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderSubtle },
  restMetric: { color: colors.text },
  undoLastSetBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  undoLastSetText: { color: colors.textMuted, ...typography.label },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: spacing["4xl"], gap: spacing.sm, backgroundColor: colors.bgElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, borderStyle: "dashed", marginBottom: spacing.lg },
  exerciseCard: { backgroundColor: colors.bgElevated, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderSubtle },
  exerciseHeader: { gap: spacing.md, marginBottom: spacing.md },
  exerciseNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  exerciseNameInput: { flex: 1 },
  exerciseActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  removeExerciseBtn: { width: touchTarget.min, height: touchTarget.min, alignItems: "center", justifyContent: "center" },
  typeSelectorRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  typePill: { minHeight: 32, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.borderSubtle },
  typePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typePillText: { color: colors.textMuted, ...typography.label, fontSize: 10 },
  typePillTextActive: { color: colors.primaryText },
  previousValuesCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle, marginBottom: spacing.md },
  previousValuesIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  previousValuesLabel: { color: colors.textFaint, ...typography.label, fontSize: 10 },
  previousValuesText: { color: colors.text, ...typography.bodySmall, fontWeight: "700" },
  previousValuesAction: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  previousValuesActionText: { color: colors.primaryText, ...typography.label, fontSize: 10 },
  tableHeader: { flexDirection: "row", marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  columnLabel: { flex: 1, color: colors.textFaint, ...typography.label, fontSize: 10, textAlign: "center" },
  columnLabelStart: { textAlign: "left" },
  setRow: { minHeight: 48, flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  setRowCompleted: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: "rgba(255,204,0,0.28)" },
  setText: { color: colors.textMuted, ...typography.bodySmall, fontWeight: "800", textAlign: "center" },
  setInput: { flex: 1, color: colors.text, ...typography.body, fontWeight: "800", textAlign: "center", paddingVertical: spacing.sm },
  checkBtn: { flex: 0.5, minHeight: touchTarget.min, alignItems: "center", justifyContent: "center" },
  addSetBtn: { minHeight: touchTarget.min, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm, gap: spacing.xs },
  addSetText: { color: colors.primary, ...typography.label },
  addExBtn: { minHeight: 56, backgroundColor: "#161616", paddingVertical: 18, paddingHorizontal: 20, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", borderStyle: "dashed", borderWidth: 1, borderColor: "#333", gap: 10, marginBottom: spacing.xl },
  addExText: { color: colors.primary, fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  finishBtnText: { color: colors.primaryText, ...typography.button, fontSize: 16 },
  workoutActionDock: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 96, backgroundColor: "rgba(10,10,10,0.94)", borderRadius: radius.xl, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle },
  dockFinishBtn: { minHeight: 56, borderRadius: radius.lg, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  floatingTimer: { position: "absolute", bottom: 178, alignSelf: "center", backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, elevation: 10 },
  timerInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.md },
  timerBold: { color: colors.primaryText, fontWeight: "900", fontSize: 16 },
  timerActionBtn: { paddingHorizontal: spacing.md, minHeight: 34, justifyContent: "center", alignItems: "center" },
  timerActionText: { color: colors.primaryText, fontWeight: "900", fontSize: 13 },
  timerDivider: { width: 1, height: 20, backgroundColor: "rgba(0,0,0,0.2)" },
  videoIconBg: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  videoTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  videoSub: { color: "#666", fontSize: 12, fontWeight: "600", marginTop: 2 },
});
