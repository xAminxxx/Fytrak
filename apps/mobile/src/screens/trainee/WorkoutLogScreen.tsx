import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../config/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import {
  saveWorkoutLog,
  subscribeToWorkouts,
  subscribeToPrescribedWorkouts,
  completePrescribedWorkout,
  subscribeToUserProfile,
  saveWorkoutIntake,
  type WorkoutLog,
  type PrescribedWorkout,
  type UserProfile,
  type ProfileLevel,
  type WorkoutSet,
  type WorkoutSetType
} from "../../services/userSession";
import { EXERCISE_LIBRARY, ExerciseLibraryItem, t as tEx } from "../../constants/exercises";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";

// Shared Components
import { SectionTitle } from "../../components/SectionTitle";
import { MetricStepper } from "../../components/MetricStepper";
import { ToastService } from "../../components/Toast";
import { Typography } from "../../components/Typography";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import {
  clearActiveWorkoutDraft,
  createEmptyWorkoutExercise,
  hasMeaningfulWorkoutDraft,
  loadActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  type ActiveWorkoutExerciseDraft,
} from "../../features/workouts/activeWorkoutDraft";
import {
  calculateWorkoutVolume,
  detectWorkoutPersonalRecords,
  duplicateSetForNextEntry,
  estimateOneRepMax,
  getBestEstimatedOneRepMaxForExercise,
  getLatestExercisePerformance,
  getCompletedWorkoutExercises,
} from "../../features/workouts/workoutPerformance";
import { trackEvent } from "../../services/analytics";
import { toLocalDateKey } from "../../utils/dateKeys";
import { radius, spacing, touchTarget, typography } from "../../theme/tokens";
import { searchAscendExercises } from "../../services/exerciseMediaService";

import { useActiveWorkout } from "../../hooks/useActiveWorkout";
import { WorkoutExerciseCard } from "../../components/WorkoutExerciseCard";

type ExerciseLog = ActiveWorkoutExerciseDraft;

export function WorkoutLogScreen() {
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const {
    workoutName, setWorkoutName,
    exercises, setExercises,
    activePrescriptionId, setActivePrescriptionId,
    workoutStartedAt, setWorkoutStartedAt,
    isCompletingWorkoutRef,
    restTimeLeft, setRestTimeLeft,
    timerActive, setTimerActive,
    initFromPrescribed,
    addExerciseCard,
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
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);

  const [dbExercises, setDbExercises] = useState<ExerciseLibraryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  useEffect(() => {
    if (exerciseSearchQuery.length < 2) {
      setDbExercises([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = query(
          collection(db, "exercises"),
          where("nameLower", ">=", exerciseSearchQuery.toLowerCase()),
          where("nameLower", "<=", exerciseSearchQuery.toLowerCase() + "\uf8ff"),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const results: ExerciseLibraryItem[] = [];
        querySnapshot.forEach((exerciseDoc) => {
          results.push(exerciseDoc.data() as ExerciseLibraryItem);
        });
        const apiResults = await searchAscendExercises(exerciseSearchQuery, 20).catch((error) => {
          console.warn("AscendAPI search failed:", error);
          return [] as ExerciseLibraryItem[];
        });
        const seenIds = new Set(results.map((exercise) => exercise.id));
        const merged = [
          ...results,
          ...apiResults.filter((exercise) => !seenIds.has(exercise.id)),
        ];
        setDbExercises(merged);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [exerciseSearchQuery]);

  const filteredExercises = [
    ...EXERCISE_LIBRARY.filter(ex =>
      tEx(ex.name).toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
    ),
    ...dbExercises.filter(dbEx => !EXERCISE_LIBRARY.some(localEx => localEx.id === dbEx.id))
  ].slice(0, 30);

  const findExerciseInfo = useCallback((exercise: ExerciseLog) => {
    const normalizedName = exercise.name.trim().toLowerCase();

    return [...EXERCISE_LIBRARY, ...dbExercises].find((candidate) => {
      return (
        candidate.id === exercise.exerciseId ||
        tEx(candidate.name).trim().toLowerCase() === normalizedName
      );
    }) ?? null;
  }, [dbExercises]);

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWorkStartPicker, setShowWorkStartPicker] = useState(false);
  const [showWorkEndPicker, setShowWorkEndPicker] = useState(false);
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

  // SUBSCRIPTIONS
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsubHistory = subscribeToWorkouts(user.uid, setWorkouts);
    const unsubPrescribed = subscribeToPrescribedWorkouts(user.uid, setPrescribed);
    const unsubProfile = subscribeToUserProfile(user.uid, setProfile);
    return () => {
      unsubHistory(); unsubPrescribed(); unsubProfile();
    };
  }, []);



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
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.onboardCard}>
            <SectionTitle title="EXPERIENCE" icon="fitness" />
            <View style={styles.groupRow}>
              {(["Beginner", "Intermediate", "Advanced"] as const).map(l => (
                <Pressable key={l} style={[styles.pill, level === l && styles.pillActive]} onPress={() => setLevel(l)}>
                  <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.inputGroup}><Text style={styles.label}>Training Months?</Text><TextInput style={styles.input} placeholderTextColor="#666" value={trainingExp} onChangeText={setTrainingExp} /></View>
            <SectionTitle title="HEALTH" icon="medkit" />
            <View style={styles.inputGroup}><Text style={styles.label}>Injuries?</Text><TextInput style={styles.input} placeholderTextColor="#666" value={injuries} onChangeText={setInjuries} /></View>
            <View style={styles.row}><MetricStepper label="Flexibility (1-10)" value={flexibility} onAdjust={(d: number) => setFlexibility(Math.max(1, Math.min(10, flexibility + d)))} /></View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Session?</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: '#fff' }}>{lastTrainedDate.toDateString()}</Text><Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </Pressable>
              {showDatePicker && <DateTimePicker value={lastTrainedDate} mode="date" display="spinner" onChange={(_: any, d?: Date) => { setShowDatePicker(false); if (d) setLastTrainedDate(d); }} />}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical / Postures</Text>
              <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Describe any issues..." placeholderTextColor="#666" value={healthIssues} onChangeText={setHealthIssues} />
            </View>
            <SectionTitle title="WORK LIFE" icon="briefcase" />
            <View style={styles.inputGroup}>
              <View style={styles.row}>
                <TimeInput label="START" date={workStart} onPress={() => setShowWorkStartPicker(true)} />
                <TimeInput label="END" date={workEnd} onPress={() => setShowWorkEndPicker(true)} />
              </View>
              {showWorkStartPicker && <DateTimePicker value={workStart} mode="time" display="spinner" onChange={(_: any, d?: Date) => { setShowWorkStartPicker(false); if (d) setWorkStart(d); }} />}
              {showWorkEndPicker && <DateTimePicker value={workEnd} mode="time" display="spinner" onChange={(_: any, d?: Date) => { setShowWorkEndPicker(false); if (d) setWorkEnd(d); }} />}
            </View>
            <View style={styles.row}><MetricStepper label="Work Stress" value={workStress} onAdjust={(d: number) => setWorkStress(Math.max(1, Math.min(10, workStress + d)))} /><MetricStepper label="Physicality" value={workToughness} onAdjust={(d: number) => setWorkToughness(Math.max(1, Math.min(10, workToughness + d)))} /></View>
            <Pressable style={styles.finishBtn} onPress={handleSaveIntake} disabled={isSavingIntake}>
              {isSavingIntake ? <ActivityIndicator color="#000" /> : <Text style={styles.finishBtnText}>START TRAINING</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (isCheckingIn) {
    return (
      <ScreenShell title="Check-in" subtitle="Feedback" contentStyle={styles.shellContent}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.completionSummaryCard}>
            <View style={styles.completionHeader}>
              <View>
                <Typography variant="label" color={colors.primary}>SESSION COMPLETE</Typography>
                <Typography variant="h2" style={styles.completionTitle}>{workoutName}</Typography>
              </View>
              {reviewPersonalRecords.length > 0 ? (
                <View style={styles.prPill}>
                  <Ionicons name="trophy" size={14} color={colors.primaryText} />
                  <Text style={styles.prPillText}>{reviewPersonalRecords.length} PR</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.completionStatsRow}>
              <View style={styles.completionStat}>
                <Text style={styles.completionValue}>{totalSetsCompleted}</Text>
                <Text style={styles.completionLabel}>sets</Text>
              </View>
              <View style={styles.completionStat}>
                <Text style={styles.completionValue}>{totalVolume}</Text>
                <Text style={styles.completionLabel}>kg volume</Text>
              </View>
              <View style={styles.completionStat}>
                <Text style={styles.completionValue}>{reviewDuration}</Text>
                <Text style={styles.completionLabel}>minutes</Text>
              </View>
            </View>
            {reviewPersonalRecords[0] ? (
              <View style={styles.prCallout}>
                <Ionicons name="flash" size={16} color={colors.primary} />
                <Text style={styles.prCalloutText}>
                  {reviewPersonalRecords[0].exerciseName}: {reviewPersonalRecords[0].estimatedOneRepMax}kg estimated 1RM
                </Text>
              </View>
            ) : null}
          </View>
          <CheckInRating label="Energy Level" value={energy} onSelect={setEnergy} />
          <CheckInRating label="Muscle Soreness" value={soreness} onSelect={setSoreness} />
          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Mood / Focus</Text>
            <View style={styles.ratingRow}>
              {["Low", "OK", "Good", "Fire", "Peak"].map((moodLabel, idx) => (
                <Pressable
                  key={moodLabel}
                  accessibilityRole="button"
                  accessibilityLabel={`Mood ${moodLabel}`}
                  accessibilityState={{ selected: mood === (idx + 1) }}
                  style={[styles.emojiCircle, mood === (idx + 1) && styles.emojiCircleActive]}
                  onPress={() => setMood(idx + 1)}
                >
                  <Text style={[styles.moodText, mood === (idx + 1) && styles.moodTextActive]}>{moodLabel}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable style={styles.finishBtn} onPress={handleCompleteWithCheckIn}><Text style={styles.finishBtnText}>SUBMIT LOG</Text><Ionicons name="cloud-upload" size={20} color={colors.primaryText} /></Pressable>
          <Pressable style={styles.cancelLink} onPress={() => setIsCheckingIn(false)}><Text style={styles.cancelLinkText}>Back to workout</Text></Pressable>
        </ScrollView>
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
                  hasVideoUrl={!!findExerciseInfo(ex)?.videoUrl}
                  onSearchExercise={() => {
                    setActiveExerciseIndex(exIdx);
                    setExerciseSearchQuery("");
                    setIsExerciseModalVisible(true);
                  }}
                  onOpenDetails={() => {
                    const info = findExerciseInfo(ex);
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

      {/* EXERCISE SELECTION MODAL */}
      <Modal
        visible={isExerciseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExerciseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Typography variant="h2" style={{ color: "#fff" }}>Add Exercise</Typography>
              <Pressable onPress={() => setIsExerciseModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <TextInput
              style={[styles.input, { marginTop: 20, marginBottom: 10 }]}
              placeholder="Search 800+ exercises..."
              placeholderTextColor="#666"
              value={exerciseSearchQuery}
              onChangeText={setExerciseSearchQuery}
            />

            {isSearching && (
              <View style={{ paddingVertical: 10, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            <ScrollView style={{ flex: 1 }}>
              {filteredExercises.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <Typography variant="label" color="#444">No matches found</Typography>
                  <Pressable
                    style={[styles.loadBtn, { marginTop: 12, backgroundColor: "#111" }]}
                    onPress={() => {
                      addCustomExercise(exerciseSearchQuery || "Custom Exercise");
                      setIsExerciseModalVisible(false);
                      setExerciseSearchQuery("");
                    }}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.loadBtnText}>ADD "{exerciseSearchQuery.toUpperCase() || "CUSTOM"}"</Text>
                  </Pressable>
                </View>
              ) : (
                filteredExercises.map((ex) => (
                  <View key={ex.id} style={styles.exerciseSelectItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{tEx(ex.name)}</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                        <View style={styles.tag}><Text style={styles.tagText}>{ex.muscleGroup.toUpperCase()}</Text></View>
                        <View style={styles.tag}><Text style={styles.tagText}>{ex.equipment.toUpperCase()}</Text></View>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <Pressable style={styles.infoIconBtn} onPress={() => openExerciseDetails(ex)}>
                        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.addIconCircle}
                        onPress={() => {
                          addLibraryExerciseToWorkout(ex);
                          setIsExerciseModalVisible(false);
                          setExerciseSearchQuery("");
                        }}
                      >
                        <Ionicons name="add" size={20} color="#000" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {!exerciseSearchQuery && (
              <Pressable
                style={[styles.addExBtn, { marginTop: 10, borderStyle: "solid" }]}
                onPress={() => {
                  addCustomExercise("Custom Exercise");
                  setIsExerciseModalVisible(false);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.addExText}>ADD CUSTOM EXERCISE</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

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

function TimeInput({ label, date, onPress }: any) {
  return (
    <Pressable style={styles.timeLink} onPress={onPress}>
      <Text style={styles.timeValue}>{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      <Text style={styles.timerLabel}>{label}</Text>
    </Pressable>
  );
}

function CheckInRating({ label, value, onSelect }: any) {
  return (
    <View style={styles.checkInCard}>
      <Text style={styles.checkInTitle}>{label}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(v => (
          <Pressable
            key={v}
            style={[styles.ratingCircle, value === v && styles.ratingCircleActive]}
            onPress={() => onSelect(v)}
          >
            <Text style={[styles.ratingText, value === v && styles.ratingTextActive]}>{v}</Text>
          </Pressable>
        ))}
      </View>
    </View>
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
  onboardCard: { backgroundColor: colors.bgElevated, borderRadius: radius.xl, padding: spacing["2xl"], borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.lg },
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
  infoIconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2c2c2e" },
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
  finishBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
  finishBtnText: { color: colors.primaryText, ...typography.button, fontSize: 16 },
  workoutActionDock: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 96, backgroundColor: "rgba(10,10,10,0.94)", borderRadius: radius.xl, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle },
  dockFinishBtn: { minHeight: 56, borderRadius: radius.lg, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  completionSummaryCard: { backgroundColor: colors.bgElevated, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.lg },
  completionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  completionTitle: { color: colors.text, fontSize: 22, lineHeight: 28 },
  prPill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, minHeight: 32 },
  prPillText: { color: colors.primaryText, fontSize: 11, fontWeight: "900" },
  completionStatsRow: { flexDirection: "row", gap: spacing.sm },
  completionStat: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle },
  completionValue: { color: colors.text, fontSize: 20, fontWeight: "900" },
  completionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginTop: spacing.xs },
  prCallout: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primaryMuted, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: "rgba(255,204,0,0.22)" },
  prCalloutText: { flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  checkInCard: { backgroundColor: colors.bgElevated, borderRadius: radius.xl, padding: spacing["2xl"], borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.lg, marginBottom: spacing.lg },
  checkInTitle: { color: colors.text, ...typography.heading, textAlign: "center" },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  ratingCircle: { width: touchTarget.min, height: touchTarget.min, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderSubtle },
  ratingCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingText: { color: colors.textMuted, fontSize: 16, fontWeight: "800" },
  ratingTextActive: { color: colors.primaryText },
  emojiCircle: { minWidth: 54, height: touchTarget.comfortable, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: spacing.sm },
  emojiCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  moodText: { color: colors.textMuted, ...typography.label, fontSize: 10 },
  moodTextActive: { color: colors.primaryText },
  cancelLink: { alignItems: "center", paddingVertical: spacing.lg },
  cancelLinkText: { color: colors.textFaint, fontWeight: "700" },
  floatingTimer: { position: "absolute", bottom: 178, alignSelf: "center", backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, elevation: 10 },
  timerInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingRight: spacing.md },
  timerBold: { color: colors.primaryText, fontWeight: "900", fontSize: 16 },
  timerActionBtn: { paddingHorizontal: spacing.md, minHeight: 34, justifyContent: "center", alignItems: "center" },
  timerActionText: { color: colors.primaryText, fontWeight: "900", fontSize: 13 },
  timerDivider: { width: 1, height: 20, backgroundColor: "rgba(0,0,0,0.2)" },
  label: { color: "#8c8c8c", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  inputGroup: { gap: 4, marginBottom: 12 },
  input: { backgroundColor: "#1c1c1e", borderRadius: 14, padding: 14, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#2c2c2e" },
  groupRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", borderWidth: 1, borderColor: "#2c2c2e" },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: "#8c8c8c", fontSize: 11, fontWeight: "900" },
  pillTextActive: { color: "#000" },
  row: { flexDirection: "row", gap: 12, marginBottom: 16 },
  dateInput: { backgroundColor: "#1c1c1e", borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#2c2c2e" },
  timeLink: { flex: 1, padding: 12, backgroundColor: "#1c1c1e", borderRadius: 14, borderWidth: 1, borderColor: "#2c2c2e" },
  timeValue: { color: "#fff", fontSize: 13 },
  timerLabel: { color: "#444", fontSize: 8, fontWeight: "900" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  exerciseSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e", borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#2c2c2e" },
  modalContent: { backgroundColor: "#000", borderTopLeftRadius: 32, borderTopRightRadius: 32, height: "85%", padding: 24, borderWidth: 1, borderColor: "#1c1c1e" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  tag: { backgroundColor: "#1c1c1e", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#2c2c2e" },
  tagText: { color: "#aaa", fontSize: 10, fontWeight: "900" },
  modalItemTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  addIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  loadBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#161616", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "#2c2c2e", gap: 12 },
  loadBtnText: { color: colors.primary, fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  videoIconBg: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  videoTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  videoSub: { color: "#666", fontSize: 12, fontWeight: "600", marginTop: 2 },
});
