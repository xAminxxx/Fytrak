import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
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
  type WorkoutLog,
  type PrescribedWorkout,
  type UserProfile,
  type ProfileLevel
} from "../../services/userSession";
import { useNavigation, useRoute } from "@react-navigation/native";

type ExerciseLog = {
  name: string;
  sets: {
    reps: string;
    weight: string;
    rpe: string;
    isCompleted: boolean;
  }[];
};

export function WorkoutLogScreen() {
  const [workoutName, setWorkoutName] = useState("Today's Session");
  const [exercises, setExercises] = useState<ExerciseLog[]>([
    {
      name: "",
      sets: [{ reps: "", weight: "", rpe: "", isCompleted: false }]
    }
  ]);
  const [prescribed, setPrescribed] = useState<PrescribedWorkout[]>([]);
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // REST TIMER STATE
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubHistory = subscribeToWorkouts(user.uid, setWorkouts);
    const unsubPrescribed = subscribeToPrescribedWorkouts(user.uid, (data) => {
      setPrescribed(data);
    });
    const unsubProfile = subscribeToUserProfile(user.uid, setProfile);

    return () => {
      unsubHistory();
      unsubPrescribed();
      unsubProfile();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- INTAKE STATE ---
  const [showIntake, setShowIntake] = useState(false);
  const [level, setLevel] = useState<ProfileLevel>("Beginner");
  const [lastTrainedDate, setLastTrainedDate] = useState(new Date());
  const [trainingExp, setTrainingExp] = useState("");
  const [healthIssues, setHealthIssues] = useState("");
  const [flexibility, setFlexibility] = useState(5);
  const [injuries, setInjuries] = useState("");
  const [workStress, setWorkStress] = useState(5);
  const [workToughness, setWorkToughness] = useState(5);
  const [workTiming, setWorkTiming] = useState("");
  const [workStart, setWorkStart] = useState(new Date(new Date().setHours(9, 0, 0)));
  const [workEnd, setWorkEnd] = useState(new Date(new Date().setHours(17, 0, 0)));
  const [isRotatingShift, setIsRotatingShift] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWorkStartPicker, setShowWorkStartPicker] = useState(false);
  const [showWorkEndPicker, setShowWorkEndPicker] = useState(false);
  const [isSavingIntake, setIsSavingIntake] = useState(false);

  useEffect(() => {
    if (profile && profile.workoutProfileCompleted !== true) {
      setShowIntake(true);
    }
  }, [profile]);

  const handleSaveIntake = async () => {
    if (!auth.currentUser) return;
    try {
      setIsSavingIntake(true);
      const { saveWorkoutIntake } = require("../../services/userSession");
      await saveWorkoutIntake(auth.currentUser.uid, {
        level,
        lastTrainedDate: lastTrainedDate.toISOString().split('T')[0],
        trainingExperience: trainingExp.trim() || "None",
        healthIssues: healthIssues.trim() || "None",
        flexibility,
        injuries: injuries.trim() || "None",
        work: {
          stress: Number(workStress),
          toughness: Number(workToughness),
          timing: `${workStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${workEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | ${isRotatingShift ? "Rotating" : "Fixed"}`
        }
      });
      setShowIntake(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Failed to save details.");
    } finally {
      setIsSavingIntake(false);
    }
  };

  // Timer Countdown Logic
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  useEffect(() => {
    const targetId = route.params?.autoLoadPrescriptionId;
    if (targetId && prescribed.length > 0) {
      const found = prescribed.find(p => p.id === targetId);
      if (found) {
        setWorkoutName(found.title);
        setActivePrescriptionId(found.id);
        setExercises(found.exercises.map(ex => ({
          name: ex.name,
          sets: Array(ex.targetSets).fill(0).map(() => ({
            reps: ex.targetReps,
            weight: "",
            rpe: "",
            isCompleted: false
          }))
        })));

        // Clear param so it doesn't re-init if we navigate away and back
        navigation.setParams({ autoLoadPrescriptionId: undefined });
      }
    }
  }, [route.params?.autoLoadPrescriptionId, prescribed]);

  const initFromPrescribed = (p: PrescribedWorkout) => {
    setWorkoutName(p.title);
    setActivePrescriptionId(p.id);
    setExercises(p.exercises.map(ex => ({
      name: ex.name,
      sets: Array(ex.targetSets).fill(0).map(() => ({
        reps: ex.targetReps,
        weight: "",
        rpe: "",
        isCompleted: false
      }))
    })));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [mood, setMood] = useState(3);

  const toggleSet = (exIdx: number, sIdx: number) => {
    const newEx = [...exercises];
    const wasCompleted = newEx[exIdx].sets[sIdx].isCompleted;
    newEx[exIdx].sets[sIdx].isCompleted = !wasCompleted;
    setExercises(newEx);

    if (!wasCompleted) {
      // Set to completed -> start timer
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestTimeLeft(60);
      setTimerActive(true);
    } else {
      // Uncheck
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimerActive(false);
      setRestTimeLeft(0);
    }
  };

  const updateSet = (exIdx: number, sIdx: number, field: string, value: string) => {
    const newEx = [...exercises];
    (newEx[exIdx].sets[sIdx] as any)[field] = value;
    setExercises(newEx);
  };

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "", rpe: "", isCompleted: false }] }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const addSet = (exIdx: number) => {
    const newEx = [...exercises];
    const lastSet = newEx[exIdx].sets[newEx[exIdx].sets.length - 1];
    newEx[exIdx].sets.push({
      reps: lastSet?.reps || "",
      weight: lastSet?.weight || "",
      rpe: "",
      isCompleted: false
    });
    setExercises(newEx);
  };

  const handleFinishWorkout = () => {
    const hasAnyCompleted = exercises.some(ex => ex.sets.some(s => s.isCompleted));
    if (!hasAnyCompleted) {
      Alert.alert("Empty Workout", "Please complete at least one set before finishing.");
      return;
    }
    setIsCheckingIn(true);
  };

  const handleCompleteWithCheckIn = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await saveWorkoutLog(user.uid, {
        name: workoutName.trim() || "Today's Session",
        exercises: exercises.map(ex => ({
          name: ex.name.trim() || "Untitled Exercise",
          sets: ex.sets.filter(s => s.isCompleted)
        })).filter(ex => ex.sets.length > 0),
        checkIn: { energy, soreness, mood }
      });

      if (activePrescriptionId) {
        await completePrescribedWorkout(user.uid, activePrescriptionId);
      }

      setIsCheckingIn(false);
      Alert.alert("Success", "Workout logged successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Home") }
      ]);
    } catch (error) {
      console.error("Failed to log workout:", error);
      Alert.alert("Error", "Could not save workout log.");
    }
  };

  // --- RENDERING ---

  if (showIntake) {
    return (
      <ScreenShell title="Workout" subtitle="A few training details for your coach" contentStyle={styles.shellContent}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <SectionTitle title="EXPERIENCE" icon="fitness" />
            <Text style={styles.label}>What is your level?</Text>
            <View style={styles.groupRow}>
              {(["Beginner", "Intermediate", "Advanced"] as const).map(l => (
                <Pressable key={l} style={[styles.pill, level === l && styles.pillActive]} onPress={() => setLevel(l)}>
                  <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>How many months of continuous training?</Text>
              <TextInput style={styles.input} placeholder="e.g. 12 months" placeholderTextColor="#666" value={trainingExp} onChangeText={setTrainingExp} />
            </View>

            <SectionTitle title="HEALTH" icon="medkit" />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Any injuries?</Text>
              <TextInput style={styles.input} placeholder="Knee pain, back..." placeholderTextColor="#666" value={injuries} onChangeText={setInjuries} />
            </View>

            <View style={styles.row}>
               <MetricStepper label="Flexibility (1-10)" value={flexibility} onAdjust={(d) => setFlexibility(Math.max(1, Math.min(10, flexibility + d)))} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last time you trained?</Text>
              <Pressable 
                style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: '#fff' }}>{lastTrainedDate.toDateString()}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={lastTrainedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setLastTrainedDate(date);
                  }}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medical / Postures</Text>
              <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="Describe any issues..." placeholderTextColor="#666" value={healthIssues} onChangeText={setHealthIssues} />
            </View>

            <SectionTitle title="WORK LIFE" icon="briefcase" />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Average Work Hours</Text>
              <View style={styles.row}>
                <Pressable style={[styles.input, { flex: 1, padding: 8 }]} onPress={() => setShowWorkStartPicker(true)}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>{workStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={{ color: '#444', fontSize: 8, fontWeight: '900' }}>START</Text>
                </Pressable>
                <Pressable style={[styles.input, { flex: 1, padding: 8 }]} onPress={() => setShowWorkEndPicker(true)}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>{workEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={{ color: '#444', fontSize: 8, fontWeight: '900' }}>END</Text>
                </Pressable>
              </View>

              <View style={[styles.row, { marginTop: 8 }]}>
                <Pressable 
                  style={[styles.pill, isRotatingShift && styles.pillActive]} 
                  onPress={() => setIsRotatingShift(!isRotatingShift)}
                >
                  <Text style={[styles.pillText, isRotatingShift && styles.pillTextActive]}>
                    {isRotatingShift ? "ROTATING SHIFTS: YES" : "FIXED SCHEDULE: YES"}
                  </Text>
                </Pressable>
              </View>

              {showWorkStartPicker && (
                <DateTimePicker 
                  value={workStart} 
                  mode="time" 
                  display="spinner" 
                  onChange={(event: DateTimePickerEvent, d?: Date) => { setShowWorkStartPicker(false); if(d) setWorkStart(d); }} 
                />
              )}
              {showWorkEndPicker && (
                <DateTimePicker 
                  value={workEnd} 
                  mode="time" 
                  display="spinner" 
                  onChange={(event: DateTimePickerEvent, d?: Date) => { setShowWorkEndPicker(false); if(d) setWorkEnd(d); }} 
                />
              )}
            </View>
            <View style={styles.row}>
              <MetricStepper label="Work Stress" value={workStress} onAdjust={(d) => setWorkStress(Math.max(1, Math.min(10, workStress + d)))} />
              <MetricStepper label="Physicality" value={workToughness} onAdjust={(d) => setWorkToughness(Math.max(1, Math.min(10, workToughness + d)))} />
            </View>

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
      <ScreenShell title="Check-in" subtitle="Session feedback" contentStyle={styles.shellContent}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Energy Level</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(v => (
                <Pressable key={v} style={[styles.ratingCircle, energy === v && styles.ratingCircleActive]} onPress={() => setEnergy(v)}>
                  <Text style={[styles.ratingText, energy === v && styles.ratingTextActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Muscle Soreness</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(v => (
                <Pressable key={v} style={[styles.ratingCircle, soreness === v && styles.ratingCircleActive]} onPress={() => setSoreness(v)}>
                  <Text style={[styles.ratingText, soreness === v && styles.ratingTextActive]}>{v}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Mood / Focus</Text>
            <View style={styles.ratingRow}>
              {["😞", "😐", "😊", "🔥", "🤩"].map((emoji, idx) => (
                <Pressable key={idx} style={[styles.emojiCircle, mood === (idx + 1) && styles.emojiCircleActive]} onPress={() => setMood(idx + 1)}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.finishBtn} onPress={handleCompleteWithCheckIn}>
            <Text style={styles.finishBtnText}>SUBMIT LOG</Text>
            <Ionicons name="cloud-upload" size={20} color={colors.primaryText} />
          </Pressable>

          <Pressable style={styles.cancelLink} onPress={() => setIsCheckingIn(false)}>
            <Text style={styles.cancelLinkText}>Back to workout</Text>
          </Pressable>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Workout"
      subtitle="Track your training progress"
      contentStyle={styles.shellContent}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* PRESCRIBED PROMPT */}
        {profile?.isPremium && prescribed.length > 0 && workoutName !== prescribed[0].title && (
          <Pressable style={styles.prescribedBanner} onPress={() => initFromPrescribed(prescribed[0])}>
            <Ionicons name="flash" size={18} color="#000" />
            <Text style={styles.bannerText}>LOAD COACH'S PLAN: {prescribed[0].title}</Text>
          </Pressable>
        )}

        <TextInput
          style={styles.workoutNameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Workout Name"
          placeholderTextColor="#666"
        />

        {exercises.map((ex, exIdx) => (
          <View key={exIdx} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <TextInput
                style={styles.exerciseNameInput}
                value={ex.name}
                onChangeText={(v) => {
                  const newEx = [...exercises];
                  newEx[exIdx].name = v;
                  setExercises(newEx);
                }}
                placeholder="Exercise Name"
                placeholderTextColor="#444"
              />
              <Pressable onPress={() => setExercises(exercises.filter((_, i) => i !== exIdx))}>
                <Ionicons name="close-circle-outline" size={22} color="#ff4444" />
              </Pressable>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.columnLabel, { flex: 0.5 }]}>SET</Text>
              <Text style={styles.columnLabel}>REPS</Text>
              <Text style={styles.columnLabel}>KG</Text>
              <Text style={styles.columnLabel}>RPE</Text>
              <Text style={[styles.columnLabel, { flex: 0.5 }]}></Text>
            </View>

            {ex.sets.map((set, sIdx) => (
              <View key={sIdx} style={[styles.setRow, set.isCompleted && styles.setRowCompleted]}>
                <Text style={[styles.setText, { flex: 0.5 }]}>{sIdx + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  value={set.reps}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor="#444"
                  onChangeText={(v) => updateSet(exIdx, sIdx, "reps", v)}
                />
                <TextInput
                  style={styles.setInput}
                  value={set.weight}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor="#444"
                  onChangeText={(v) => updateSet(exIdx, sIdx, "weight", v)}
                />
                <TextInput
                  style={styles.setInput}
                  value={set.rpe}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor="#444"
                  onChangeText={(v) => updateSet(exIdx, sIdx, "rpe", v)}
                />
                <Pressable
                  style={[styles.checkBtn, set.isCompleted && styles.checkBtnActive]}
                  onPress={() => toggleSet(exIdx, sIdx)}
                >
                  <Ionicons
                    name={set.isCompleted ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={set.isCompleted ? colors.primary : "#333"}
                  />
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.addSetText}>ADD SET</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addExBtn} onPress={addExercise}>
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <Text style={styles.addExText}>ADD EXERCISE</Text>
        </Pressable>

        <Pressable style={styles.finishBtn} onPress={handleFinishWorkout}>
          <Text style={styles.finishBtnText}>FINISH WORKOUT</Text>
          <Ionicons name="checkbox" size={20} color={colors.primaryText} />
        </Pressable>
      </ScrollView>

      {timerActive && restTimeLeft > 0 && (
        <View style={styles.floatingTimer}>
          <View style={styles.timerInfo}>
            <Ionicons name="timer" size={20} color="#000" />
            <Text style={styles.timerBold}>{Math.floor(restTimeLeft / 60)}:{String(restTimeLeft % 60).padStart(2, '0')}</Text>
          </View>

          <Pressable
            style={styles.timerActionBtn}
            onPress={() => {
              setRestTimeLeft(prev => prev + 30);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.timerActionText}>+30s</Text>
          </Pressable>

          <View style={styles.timerDivider} />

          <Pressable
            style={styles.timerActionBtn}
            onPress={() => {
              setTimerActive(false);
              setRestTimeLeft(0);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Ionicons name="play-skip-forward" size={18} color="#000" />
          </Pressable>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingBottom: 0 },
  scroll: { paddingBottom: 140, gap: 16 },
  prescribedBanner: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    gap: 10,
    marginTop: 10,
  },
  bannerText: { color: "#000", fontWeight: "900", fontSize: 13 },
  workoutNameInput: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 10,
  },
  exerciseCard: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  exerciseNameInput: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  tableHeader: { flexDirection: "row", marginBottom: 10 },
  columnLabel: { flex: 1, color: "#444", fontSize: 10, fontWeight: "900", textAlign: "center" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  setRowCompleted: { backgroundColor: "#1a1a10", borderWidth: 1, borderColor: "#3a3a10" },
  setText: { color: "#8c8c8c", fontSize: 13, fontWeight: "800", textAlign: "center" },
  setInput: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "center", paddingVertical: 10 },
  checkBtn: { flex: 0.5, alignItems: "center" },
  checkBtnActive: { opacity: 0.8 },
  addSetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  addSetText: { color: colors.primary, fontWeight: "900", fontSize: 12 },
  addExBtn: {
    backgroundColor: "#161616",
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#333",
    gap: 10,
    marginBottom: 10,
  },
  addExText: { color: "#fff", fontWeight: "800" },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  finishBtnText: { color: colors.primaryText, fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  checkInCard: { backgroundColor: "#161616", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#2c2c2e", gap: 16, marginBottom: 16 },
  checkInTitle: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center" },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  ratingCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#333" },
  ratingCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingText: { color: "#8c8c8c", fontSize: 16, fontWeight: "800" },
  ratingTextActive: { color: "#000" },
  emojiCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#333" },
  emojiCircleActive: { backgroundColor: "#222", borderColor: colors.primary },
  cancelLink: { alignItems: "center", paddingVertical: 16 },
  cancelLinkText: { color: "#444", fontWeight: "700" },
  floatingTimer: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  timerInfo: { flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 12 },
  timerBold: { color: "#000", fontWeight: "900", fontSize: 16 },
  timerActionBtn: { paddingHorizontal: 12, height: 30, justifyContent: "center", alignItems: "center" },
  timerActionText: { color: "#000", fontWeight: "900", fontSize: 13 },
  timerDivider: { width: 1, height: 20, backgroundColor: "rgba(0,0,0,0.2)" },
  card: { backgroundColor: "#161616", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#333", gap: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 4 },
  sectionTitleText: { color: "#ffffff", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  label: { color: "#8c8c8c", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  inputGroup: { gap: 4, marginBottom: 12 },
  input: { backgroundColor: "#1c1c1e", borderRadius: 14, padding: 14, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#2c2c2e" },
  groupRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", borderWidth: 1, borderColor: "#333" },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: "#8c8c8c", fontSize: 11, fontWeight: "900" },
  pillTextActive: { color: "#000" },
  row: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stepperContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#333" },
  stepperBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  stepperValueText: { flex: 1, textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "800" },
});

function SectionTitle({ title, icon }: { title: string, icon: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function MetricStepper({ label, value, onAdjust }: { label: string, value: number, onAdjust: (d: number) => void }) {
  return (
    <View style={[styles.inputGroup, { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperContainer}>
        <Pressable style={styles.stepperBtn} onPress={() => onAdjust(-1)}>
          <Ionicons name="remove" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValueText}>{value}</Text>
        <Pressable style={styles.stepperBtn} onPress={() => onAdjust(1)}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}
