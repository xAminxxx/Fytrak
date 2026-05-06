import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
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

type ExerciseLog = {
  name: string;
  type: WorkoutSetType;
  sets: WorkoutSet[];
};

export function WorkoutLogScreen() {
  const [workoutName, setWorkoutName] = useState("Today's Session");
  const [exercises, setExercises] = useState<ExerciseLog[]>([{ name: "", type: "WEIGHT_REPS", sets: [{ type: "WEIGHT_REPS", isCompleted: false }] }]);
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // EXERCISE INFO MODAL
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState<ExerciseLibraryItem | null>(null);
  const [isExerciseModalVisible, setIsExerciseModalVisible] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");

  const filteredExercises = EXERCISE_LIBRARY.filter(ex => 
    tEx(ex.name).toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
  );

  // REST TIMER
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
            { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(e.data.action) }
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
      if (timerRef.current) clearInterval(timerRef.current);
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

  // TIMER LOGIC
  useEffect(() => {
    if (timerActive && restTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const initFromPrescribed = (p: PrescribedWorkout) => {
    setWorkoutName(p.title);
    setActivePrescriptionId(p.id);
    setExercises(p.exercises.map(ex => {
      const exType = ex.type || "WEIGHT_REPS";
      return {
        name: ex.name,
        type: exType,
        sets: Array(ex.targetSets).fill(0).map(() => ({ 
          type: exType, 
          reps: exType === "TIME" ? undefined : Number(ex.targetReps) || 0, 
          durationSec: exType === "TIME" ? parseInt(ex.targetReps) || 60 : undefined,
          isCompleted: false 
        }))
      };
    }));
  };

  const handleSaveIntake = async () => {
    if (!auth.currentUser) return;
    try {
      setIsSavingIntake(true);
      await saveWorkoutIntake(auth.currentUser.uid, {
        level,
        lastTrainedDate: lastTrainedDate.toISOString().split('T')[0],
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

  const toggleSet = (exIdx: number, sIdx: number) => {
    const newEx = [...exercises];
    const wasCompleted = newEx[exIdx].sets[sIdx].isCompleted;
    newEx[exIdx].sets[sIdx].isCompleted = !wasCompleted;
    setExercises(newEx);

    if (!wasCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestTimeLeft(60); setTimerActive(true);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimerActive(false); setRestTimeLeft(0);
    }
  };

  const handleCompleteWithCheckIn = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const completedExercises = exercises.map(ex => ({ name: ex.name.trim() || "Untitled", sets: ex.sets.filter(s => s.isCompleted) })).filter(ex => ex.sets.length > 0);
      const totalVolume = completedExercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0), 0);
      await saveWorkoutLog(user.uid, {
        name: workoutName.trim() || "Today's Session",
        exercises: completedExercises,
        totalVolume,
        checkIn: { energy, soreness, mood }
      });
      if (activePrescriptionId) await completePrescribedWorkout(user.uid, activePrescriptionId);
      setIsCheckingIn(false);
      setExercises([]); // Clear local state so beforeRemove discard alert is bypassed
      ToastService.success("Workout Complete!", "Excellent work today.");
      navigation.navigate("Home");
    } catch (error) { ToastService.error("Error", "Could not save log."); }
  };

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
          <CheckInRating label="Energy Level" value={energy} onSelect={setEnergy} />
          <CheckInRating label="Muscle Soreness" value={soreness} onSelect={setSoreness} />
          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Mood / Focus</Text>
            <View style={styles.ratingRow}>
              {["😞", "😐", "😊", "🔥", "🤩"].map((emoji, idx) => (
                <Pressable key={idx} style={[styles.emojiCircle, mood === (idx + 1) && styles.emojiCircleActive]} onPress={() => setMood(idx + 1)}><Text style={{ fontSize: 24 }}>{emoji}</Text></Pressable>
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
              <Ionicons name="flash" size={18} color="#000" /><Text style={styles.bannerText}>LOAD COACH'S PLAN: {prescribed[0].title}</Text>
            </Pressable>
          )}

          <View style={styles.liveStatsRow}>
            <View style={styles.liveStatBox}>
              <Typography variant="label" color="#8c8c8c">SETS COMPLETED</Typography>
              <Typography variant="metric">{totalSetsCompleted}</Typography>
            </View>
            <View style={styles.liveStatBox}>
              <Typography variant="label" color="#8c8c8c">TOTAL VOLUME</Typography>
              <Typography variant="metric">{totalVolume} <Typography variant="label" color="#444">kg</Typography></Typography>
            </View>
          </View>

          <TextInput style={styles.workoutNameInput} value={workoutName} onChangeText={setWorkoutName} placeholder="Workout Name" placeholderTextColor="#444" />

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#333" />
              <Typography variant="h2" style={{ color: "#555" }}>Time to crush it</Typography>
              <Text style={{ color: "#444" }}>Add your first exercise to start tracking.</Text>
            </View>
          ) : (
            exercises.map((ex, exIdx) => (
              <View key={exIdx} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1, gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TextInput style={styles.exerciseNameInput} value={ex.name} onChangeText={(v) => { const n = [...exercises]; n[exIdx].name = v; setExercises(n); }} placeholder="Exercise Name" placeholderTextColor="#444" />
                      <Pressable onPress={() => {
                        const info = EXERCISE_LIBRARY.find(e => tEx(e.name).toLowerCase() === ex.name.toLowerCase());
                        if (info) setSelectedExerciseInfo(info);
                        else ToastService.info("Not Found", "No detailed instructions available for this exercise.");
                      }}>
                        <Ionicons 
                          name={EXERCISE_LIBRARY.some(e => tEx(e.name).toLowerCase() === ex.name.toLowerCase() && e.videoUrl) ? "videocam" : "information-circle-outline"} 
                          size={24} 
                          color={colors.primary} 
                        />
                      </Pressable>
                    </View>
                    <View style={styles.typeSelectorRow}>
                      {(["WEIGHT_REPS", "TIME", "BODYWEIGHT"] as WorkoutSetType[]).map(t => (
                        <Pressable key={t} style={[styles.typePill, ex.type === t && styles.typePillActive]} onPress={() => {
                          const n = [...exercises];
                          n[exIdx].type = t;
                          n[exIdx].sets.forEach(s => s.type = t); // cascade to all sets
                          setExercises(n);
                        }}>
                          <Text style={[styles.typePillText, ex.type === t && styles.typePillTextActive]}>{t.replace("_", " ")}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <Pressable style={{ padding: 8 }} onPress={() => setExercises(exercises.filter((_, i) => i !== exIdx))}><Ionicons name="close-circle-outline" size={26} color="#ff4444" /></Pressable>
                </View>
                
                <View style={styles.tableHeader}>
                  <Text style={[styles.columnLabel, { flex: 0.5 }]}>SET</Text>
                  {ex.type === "TIME" ? (
                    <Text style={styles.columnLabel}>SECONDS</Text>
                  ) : ex.type === "BODYWEIGHT" || ex.type === "REPS_ONLY" ? (
                    <Text style={styles.columnLabel}>REPS</Text>
                  ) : (
                    <>
                      <Text style={styles.columnLabel}>KG</Text>
                      <Text style={styles.columnLabel}>REPS</Text>
                    </>
                  )}
                  <Text style={{ flex: 0.5 }} />
                </View>
                {ex.sets.map((set, sIdx) => (
                  <View key={sIdx} style={[styles.setRow, set.isCompleted && styles.setRowCompleted]}>
                    <Text style={[styles.setText, { flex: 0.5 }]}>{sIdx + 1}</Text>
                    
                    {ex.type === "TIME" ? (
                      <TextInput style={styles.setInput} value={set.durationSec?.toString()} keyboardType="number-pad" placeholder="-" placeholderTextColor="#444" onChangeText={(v) => { const n = [...exercises]; n[exIdx].sets[sIdx].durationSec = Number(v); setExercises(n); }} editable={!set.isCompleted} />
                    ) : ex.type === "BODYWEIGHT" || ex.type === "REPS_ONLY" ? (
                      <TextInput style={styles.setInput} value={set.reps?.toString()} keyboardType="number-pad" placeholder="-" placeholderTextColor="#444" onChangeText={(v) => { const n = [...exercises]; n[exIdx].sets[sIdx].reps = Number(v); setExercises(n); }} editable={!set.isCompleted} />
                    ) : (
                      <>
                        <TextInput style={styles.setInput} value={set.weight?.toString()} keyboardType="decimal-pad" placeholder="-" placeholderTextColor="#444" onChangeText={(v) => { const n = [...exercises]; n[exIdx].sets[sIdx].weight = Number(v); setExercises(n); }} editable={!set.isCompleted} />
                        <TextInput style={styles.setInput} value={set.reps?.toString()} keyboardType="number-pad" placeholder="-" placeholderTextColor="#444" onChangeText={(v) => { const n = [...exercises]; n[exIdx].sets[sIdx].reps = Number(v); setExercises(n); }} editable={!set.isCompleted} />
                      </>
                    )}

                    <Pressable style={styles.checkBtn} onPress={() => {
                      if (!set.isCompleted && ex.type === "WEIGHT_REPS" && (!set.reps || !set.weight)) {
                        ToastService.info("Missing Data", "Please enter weight and reps.");
                        return;
                      }
                      toggleSet(exIdx, sIdx);
                    }}><Ionicons name={set.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={24} color={set.isCompleted ? colors.primary : "#333"} /></Pressable>
                  </View>
                ))}
                <Pressable style={styles.addSetBtn} onPress={() => { const n = [...exercises]; n[exIdx].sets.push({ type: ex.type, isCompleted: false }); setExercises(n); }}><Ionicons name="add" size={18} color={colors.primary} /><Text style={styles.addSetText}>ADD SET</Text></Pressable>
              </View>
            ))
          )}

          <Pressable style={styles.addExBtn} onPress={() => setIsExerciseModalVisible(true)}><Ionicons name="search-circle" size={26} color={colors.primary} /><Text style={styles.addExText}>ADD EXERCISE</Text></Pressable>
          <Pressable style={styles.finishBtn} onPress={() => {
            if (totalSetsCompleted === 0) {
              ToastService.error("Empty Workout", "Please complete at least one set before checking in.");
              return;
            }
            setIsCheckingIn(true);
          }}><Text style={styles.finishBtnText}>FINISH WORKOUT</Text><Ionicons name="checkbox" size={20} color={colors.primaryText} /></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      {timerActive && restTimeLeft > 0 && <RestTimer value={restTimeLeft} onAdjust={(d: number) => setRestTimeLeft(prev => prev + d)} onSkip={() => { setTimerActive(false); setRestTimeLeft(0); }} />}
      
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
              placeholder="Search exercise database..." 
              placeholderTextColor="#666"
              value={exerciseSearchQuery}
              onChangeText={setExerciseSearchQuery}
            />

            <ScrollView style={{ flex: 1 }}>
              {filteredExercises.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                   <Typography variant="label" color="#444">No matches found</Typography>
                   <Pressable 
                    style={[styles.loadBtn, { marginTop: 12, backgroundColor: "#111" }]}
                    onPress={() => {
                      setExercises([...exercises, { name: exerciseSearchQuery || "Custom Exercise", type: "WEIGHT_REPS", sets: [{ type: "WEIGHT_REPS", isCompleted: false }] }]);
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
                  <Pressable 
                    key={ex.id} 
                    style={styles.exerciseSelectItem}
                    onPress={() => {
                      setExercises([...exercises, { name: tEx(ex.name), type: ex.defaultType, sets: [{ type: ex.defaultType, isCompleted: false }] }]);
                      setIsExerciseModalVisible(false);
                      setExerciseSearchQuery("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{tEx(ex.name)}</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                        <View style={styles.tag}><Text style={styles.tagText}>{ex.muscleGroup.toUpperCase()}</Text></View>
                        <View style={styles.tag}><Text style={styles.tagText}>{ex.equipment.toUpperCase()}</Text></View>
                      </View>
                    </View>
                    <View style={styles.addIconCircle}>
                      <Ionicons name="add" size={20} color="#000" />
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
            
            {!exerciseSearchQuery && (
               <Pressable 
                style={[styles.addExBtn, { marginTop: 10, borderStyle: "solid" }]}
                onPress={() => {
                  setExercises([...exercises, { name: "", type: "WEIGHT_REPS", sets: [{ type: "WEIGHT_REPS", isCompleted: false }] }]);
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

      {/* EXERCISE INFO MODAL */}
      <Modal
        visible={!!selectedExerciseInfo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedExerciseInfo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedExerciseInfo ? tEx(selectedExerciseInfo.name) : ''}</Text>
              <Pressable onPress={() => setSelectedExerciseInfo(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
            <ScrollView style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                <View style={styles.tag}><Text style={styles.tagText}>{selectedExerciseInfo?.muscleGroup.toUpperCase()}</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>{selectedExerciseInfo?.equipment.toUpperCase()}</Text></View>
              </View>

              {selectedExerciseInfo?.videoUrl && (
                <Pressable 
                  style={styles.videoCard} 
                  onPress={() => {
                    const { openBrowserAsync } = require("expo-web-browser");
                    openBrowserAsync(selectedExerciseInfo.videoUrl!);
                  }}
                >
                  <View style={styles.videoIconBg}>
                    <Ionicons name="play" size={32} color="#000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoTitle}>Watch Video Demonstration</Text>
                    <Text style={styles.videoSub}>Professional form and execution</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </Pressable>
              )}

              <SectionTitle title="INSTRUCTIONS" icon="book-outline" />
              {selectedExerciseInfo?.instructions ? (
                selectedExerciseInfo.instructions.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepCircle}><Text style={styles.stepNumber}>{i + 1}</Text></View>
                    <Text style={styles.stepText}>{tEx(step)}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#888", fontSize: 14 }}>No instructions provided yet.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function TimeInput({ label, date, onPress }: any) {
  return (<Pressable style={styles.timeLink} onPress={onPress}><Text style={styles.timeValue}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.timerLabel}>{label}</Text></Pressable>);
}

function CheckInRating({ label, value, onSelect }: any) {
  return (
    <View style={styles.checkInCard}>
      <Text style={styles.checkInTitle}>{label}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(v => (
          <Pressable key={v} style={[styles.ratingCircle, value === v && styles.ratingCircleActive]} onPress={() => onSelect(v)}><Text style={[styles.ratingText, value === v && styles.ratingTextActive]}>{v}</Text></Pressable>
        ))}
      </View>
    </View>
  );
}

function RestTimer({ value, onAdjust, onSkip }: any) {
  return (
    <View style={styles.floatingTimer}>
      <View style={styles.timerInfo}><Ionicons name="timer" size={20} color="#000" /><Text style={styles.timerBold}>{Math.floor(value / 60)}:{String(value % 60).padStart(2, '0')}</Text></View>
      <Pressable style={styles.timerActionBtn} onPress={() => onAdjust(30)}><Text style={styles.timerActionText}>+30s</Text></Pressable>
      <View style={styles.timerDivider} /><Pressable style={styles.timerActionBtn} onPress={onSkip}><Ionicons name="play-skip-forward" size={18} color="#000" /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  scroll: { paddingBottom: 140, gap: 16 },
  onboardCard: { backgroundColor: "#111", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "#1c1c1e", gap: 16 },
  prescribedBanner: { backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 16, gap: 10, marginTop: 10 },
  bannerText: { color: "#000", fontWeight: "900", fontSize: 13 },
  liveStatsRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  liveStatBox: { flex: 1, backgroundColor: "#1c1c1e", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#2c2c2e" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8, backgroundColor: "#111", borderRadius: 24, borderWidth: 1, borderColor: "#222", borderStyle: "dashed", marginBottom: 16 },
  workoutNameInput: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 10, marginBottom: 10 },
  exerciseCard: { backgroundColor: "#111", borderRadius: 32, padding: 20, borderWidth: 1, borderColor: "#1c1c1e" },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  exerciseNameInput: { color: colors.primary, fontSize: 18, fontWeight: "800", flex: 1 },
  typeSelectorRow: { flexDirection: "row", gap: 6 },
  typePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#1c1c1e", borderWidth: 1, borderColor: "#2c2c2e" },
  typePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typePillText: { color: "#8c8c8c", fontSize: 10, fontWeight: "900" },
  typePillTextActive: { color: "#000" },
  tableHeader: { flexDirection: "row", marginBottom: 10 },
  columnLabel: { flex: 1, color: "#444", fontSize: 10, fontWeight: "900", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e", borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 6 },
  setRowCompleted: { backgroundColor: "#1a1a10", borderWidth: 1, borderColor: "#3a3a10" },
  setText: { color: "#8c8c8c", fontSize: 13, fontWeight: "800", textAlign: "center" },
  setInput: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "center", paddingVertical: 10 },
  checkBtn: { flex: 0.5, alignItems: "center" },
  addSetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  addSetText: { color: colors.primary, fontWeight: "900", fontSize: 12 },
  addExBtn: { backgroundColor: "#111", padding: 18, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", borderStyle: "dashed", borderWidth: 1, borderColor: "#222", gap: 10, marginBottom: 10 },
  addExText: { color: "#fff", fontWeight: "800" },
  finishBtn: { backgroundColor: colors.primary, borderRadius: 24, height: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  finishBtnText: { color: colors.primaryText, fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  checkInCard: { backgroundColor: "#111", borderRadius: 32, padding: 24, borderWidth: 1, borderColor: "#1c1c1e", gap: 16, marginBottom: 16 },
  checkInTitle: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  ratingCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#222" },
  ratingCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingText: { color: "#8c8c8c", fontSize: 16, fontWeight: "800" },
  ratingTextActive: { color: "#000" },
  emojiCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#222" },
  emojiCircleActive: { backgroundColor: "#222", borderColor: colors.primary },
  cancelLink: { alignItems: "center", paddingVertical: 16 },
  cancelLinkText: { color: "#444", fontWeight: "700" },
  floatingTimer: { position: "absolute", bottom: 120, alignSelf: "center", backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, elevation: 10 },
  timerInfo: { flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 12 },
  timerBold: { color: "#000", fontWeight: "900", fontSize: 16 },
  timerActionBtn: { paddingHorizontal: 12, height: 30, justifyContent: "center", alignItems: "center" },
  timerActionText: { color: "#000", fontWeight: "900", fontSize: 13 },
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
  dateInput: { backgroundColor: "#1c1c1e", borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
  timeLink: { flex: 1, padding: 12, backgroundColor: '#1c1c1e', borderRadius: 14, borderWidth: 1, borderColor: '#2c2c2e' },
  timeValue: { color: '#fff', fontSize: 13 },
  timerLabel: { color: '#444', fontSize: 8, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#000", borderTopLeftRadius: 32, borderTopRightRadius: 32, height: "60%", padding: 24, borderWidth: 1, borderColor: "#2c2c2e" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  tag: { backgroundColor: "#2c2c2e", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { color: "#aaa", fontSize: 10, fontWeight: "900" },
  stepRow: { flexDirection: "row", gap: 12, marginBottom: 16, alignItems: "flex-start" },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 2 },
  stepNumber: { color: "#000", fontSize: 12, fontWeight: "900" },
  stepText: { flex: 1, color: "#ccc", fontSize: 15, lineHeight: 22, fontWeight: "500" },
  videoCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#161616", 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: "#2c2c2e",
    gap: 16
  },
  videoIconBg: { 
    width: 64, 
    height: 64, 
    borderRadius: 16, 
    backgroundColor: colors.primary, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  videoTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  videoSub: { color: "#666", fontSize: 12, fontWeight: "600", marginTop: 2 },
  exerciseSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1c1c1e",
    gap: 12,
  },
  modalItemTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    gap: 12,
  },
  loadBtnText: { color: colors.primary, fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
});
