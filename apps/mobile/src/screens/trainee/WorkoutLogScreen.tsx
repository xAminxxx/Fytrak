import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import {
  saveWorkoutLog,
  subscribeToWorkouts,
  subscribeToPrescribedWorkouts,
  completePrescribedWorkout,
  type WorkoutLog,
  type PrescribedWorkout
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
  const [timerActive, setTimerActive] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubHistory = subscribeToWorkouts(user.uid, setWorkouts);
    const unsubPrescribed = subscribeToPrescribedWorkouts(user.uid, (data) => {
      setPrescribed(data);
      // We only auto-init if we have nothing yet
    });

    return () => {
      unsubHistory();
      unsubPrescribed();
    };
  }, []);

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
      setTimerActive(true);
      setTimeout(() => setTimerActive(false), 3000);
    }
  };

  const updateSet = (exIdx: number, sIdx: number, field: string, value: string) => {
    const newEx = [...exercises];
    (newEx[exIdx].sets[sIdx] as any)[field] = value;
    setExercises(newEx);
  };

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "", rpe: "", isCompleted: false }] }]);
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
        {prescribed.length > 0 && workoutName !== prescribed[0].title && (
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

      {timerActive && (
        <View style={styles.floatingTimer}>
          <Ionicons name="timer" size={20} color="#000" />
          <Text style={styles.timerBold}>REST ACTIVE</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  timerBold: { color: "#000", fontWeight: "900", fontSize: 12 },
});
