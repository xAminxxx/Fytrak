import { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    Pressable,
    Alert,
    ActivityIndicator,
    Modal
} from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { savePrescribedWorkout, CoachTemplate, subscribeToCoachTemplates, WorkoutSetType } from "../../services/userSession";
import { EXERCISE_LIBRARY, ExerciseLibraryItem, t as tEx } from "../../constants/exercises";
import { auth } from "../../config/firebase";
import { useNavigation, useRoute } from "@react-navigation/native";

export function PrescribeWorkoutScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { traineeId, traineeName } = route.params;

    const [title, setTitle] = useState("");
    const [exercises, setExercises] = useState<{name: string; type: WorkoutSetType; targetSets: number; targetReps: string; restTime: string;}[]>([
        { name: "", type: "WEIGHT_REPS", targetSets: 4, targetReps: "10-12", restTime: "60s" }
    ]);
    const [templates, setTemplates] = useState<CoachTemplate[]>([]);
    const [libModalVisible, setLibModalVisible] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [libSearchQuery, setLibSearchQuery] = useState("");

    // EXERCISE LIBRARY STATES
    const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
    const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
    const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(libSearchQuery.toLowerCase())
    );

    const filteredExercises = EXERCISE_LIBRARY.filter(ex =>
        tEx(ex.name).toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        ex.equipment.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
    );

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsubscribe = subscribeToCoachTemplates(user.uid, "workout", (data) => {
            setTemplates(data);
        });
        return () => unsubscribe();
    }, []);

    const applyTemplate = (t: CoachTemplate) => {
        setTitle(t.title);
        if (t.data.exercises) {
            setExercises(t.data.exercises);
        }
        setLibModalVisible(false);
    };

    const addExercise = () => {
        setExercises([...exercises, { name: "", type: "WEIGHT_REPS", targetSets: 4, targetReps: "10-12", restTime: "60s" }]);
    };

    const updateExercise = (index: number, field: string, value: any) => {
        const newEx = [...exercises];
        newEx[index] = { ...newEx[index], [field]: value };
        setExercises(newEx);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Missing Title", "Please give this workout a name (e.g., Upper Body A)");
            return;
        }
        if (exercises.some(e => !e.name.trim())) {
            Alert.alert("Missing Exercise", "Please fill in all exercise names.");
            return;
        }

        try {
            setIsSubmitting(true);
            const user = auth.currentUser;
            if (!user) throw new Error("No coach session");

            await savePrescribedWorkout(traineeId, {
                coachId: user.uid,
                coachName: user.displayName || "Your Coach",
                title: title.trim(),
                exercises: exercises,
                isCompleted: false
            });

            if (saveAsTemplate) {
                const { saveCoachTemplate } = require("../../services/userSession");
                await saveCoachTemplate(user.uid, {
                    title: title.trim(),
                    type: "workout",
                    data: { exercises }
                });
            }

            Alert.alert("Success", "Workout prescribed successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to assign workout.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenShell
            title="Prescribe Routine"
            subtitle={`Assign a new workout for ${traineeName}`}
            contentStyle={styles.shellContent}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <View style={styles.topActions}>
                    <Pressable
                        style={styles.loadBtn}
                        onPress={() => {
                            if (templates.length === 0) {
                                Alert.alert("Library Empty", "Save a workout as a template first to use this feature.");
                            } else {
                                setLibModalVisible(true);
                            }
                        }}
                    >
                        <Ionicons name="library" size={18} color={colors.primary} />
                        <Text style={styles.loadBtnText}>LOAD FROM LIBRARY</Text>
                        <View style={styles.countBadge}><Text style={styles.countText}>{templates.length}</Text></View>
                    </Pressable>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Workout Title</Text>
                    <TextInput
                        placeholder="e.g. Monday - Push Day"
                        placeholderTextColor="#666"
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {exercises.map((ex, idx) => (
                    <View key={idx} style={styles.exerciseCard}>
                        <View style={styles.exHeader}>
                            <View style={styles.indexCircle}><Text style={styles.indexText}>{idx + 1}</Text></View>
                            <View style={{ flex: 1, gap: 12 }}>
                                <Pressable
                                    style={styles.exInput}
                                    onPress={() => {
                                        setActiveExerciseIndex(idx);
                                        setExerciseSearchQuery("");
                                        setExerciseModalVisible(true);
                                    }}
                                >
                                    <Text style={{ color: ex.name ? "#fff" : "#444", fontSize: 16, fontWeight: "700" }}>
                                        {ex.name || "Tap to select exercise..."}
                                    </Text>
                                </Pressable>
                                <View style={styles.typeSelectorRow}>
                                    {(["WEIGHT_REPS", "TIME", "BODYWEIGHT"] as WorkoutSetType[]).map(t => (
                                        <Pressable key={t} style={[styles.typePill, ex.type === t && styles.typePillActive]} onPress={() => updateExercise(idx, "type", t)}>
                                            <Text style={[styles.typePillText, ex.type === t && styles.typePillTextActive]}>{t.replace("_", " ")}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                            <Pressable
                                onPress={() => {
                                    const newEx = exercises.filter((_, i) => i !== idx);
                                    setExercises(newEx.length ? newEx : [{ name: "", type: "WEIGHT_REPS", targetSets: 4, targetReps: "10-12", restTime: "60s" }]);
                                }}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#ff4444" />
                            </Pressable>
                        </View>

                        <View style={styles.paramGrid}>
                            <View style={styles.paramItem}>
                                <Text style={styles.paramLabel}>SETS</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    style={styles.paramInput}
                                    value={ex.targetSets.toString()}
                                    onChangeText={(v) => updateExercise(idx, "targetSets", parseInt(v) || 0)}
                                />
                            </View>
                            <View style={styles.paramItem}>
                                <Text style={styles.paramLabel}>{ex.type === "TIME" ? "SECONDS" : "REPS"}</Text>
                                <TextInput
                                    style={styles.paramInput}
                                    value={ex.targetReps}
                                    placeholder={ex.type === "TIME" ? "60s" : "10-12"}
                                    placeholderTextColor="#444"
                                    onChangeText={(v) => updateExercise(idx, "targetReps", v)}
                                />
                            </View>
                            <View style={styles.paramItem}>
                                <Text style={styles.paramLabel}>REST</Text>
                                <TextInput
                                    style={styles.paramInput}
                                    value={ex.restTime}
                                    onChangeText={(v) => updateExercise(idx, "restTime", v)}
                                />
                            </View>
                        </View>
                    </View>
                ))}

                <Pressable style={styles.addBtn} onPress={addExercise}>
                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                    <Text style={styles.addBtnText}>ADD EXERCISE</Text>
                </Pressable>

                <View style={styles.divider} />

                <Pressable
                    style={styles.templateToggle}
                    onPress={() => setSaveAsTemplate(!saveAsTemplate)}
                >
                    <View style={styles.iconBox}>
                        <Ionicons name="save-outline" size={20} color={saveAsTemplate ? colors.primary : "#666"} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.toggleTitle}>Save to Template Library</Text>
                        <Text style={styles.toggleSub}>Reusable for other trainees</Text>
                    </View>
                    <View style={[styles.switch, saveAsTemplate && styles.switchActive]}>
                        <View style={[styles.switchCircle, saveAsTemplate && styles.switchCircleActive]} />
                    </View>
                </Pressable>

                <View style={styles.footer}>
                    <Pressable
                        style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <ActivityIndicator color={colors.primaryText} /> : (
                            <>
                                <Text style={styles.saveBtnText}>ASSIGN TO TRAINEE</Text>
                                <Ionicons name="paper-plane" size={20} color={colors.primaryText} />
                            </>
                        )}
                    </Pressable>
                </View>
            </ScrollView>

            <Modal
                visible={libModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLibModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Template</Text>
                            <Pressable onPress={() => setLibModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </Pressable>
                        </View>

                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={18} color="#666" />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search templates..."
                                placeholderTextColor="#666"
                                value={libSearchQuery}
                                onChangeText={setLibSearchQuery}
                            />
                        </View>

                        <ScrollView style={styles.modalList}>
                            {filteredTemplates.length === 0 ? (
                                <Text style={styles.emptyText}>No templates found.</Text>
                            ) : (
                                filteredTemplates.map(t => (
                                    <Pressable key={t.id} style={styles.modalItem} onPress={() => applyTemplate(t)}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalItemTitle}>{t.title}</Text>
                                            <Text style={styles.modalItemSub}>{t.data.exercises?.length || 0} exercises</Text>
                                        </View>
                                        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* EXERCISE LIBRARY MODAL */}
            <Modal
                visible={exerciseModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setExerciseModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Exercise Library</Text>
                            <Pressable onPress={() => setExerciseModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </Pressable>
                        </View>

                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={18} color="#666" />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search by name, muscle, or equipment..."
                                placeholderTextColor="#666"
                                value={exerciseSearchQuery}
                                onChangeText={setExerciseSearchQuery}
                            />
                        </View>

                        <ScrollView style={styles.modalList}>
                            {filteredExercises.length === 0 ? (
                                <Text style={styles.emptyText}>No exercises found.</Text>
                            ) : (
                                filteredExercises.map(ex => (
                                    <Pressable 
                                        key={ex.id} 
                                        style={styles.modalItem} 
                                        onPress={() => {
                                            if (activeExerciseIndex !== null) {
                                                const newEx = [...exercises];
                                                newEx[activeExerciseIndex] = {
                                                    ...newEx[activeExerciseIndex],
                                                    name: tEx(ex.name),
                                                    type: ex.defaultType,
                                                    targetReps: ex.defaultType === "TIME" ? "60" : "10-12"
                                                };
                                                setExercises(newEx);
                                            }
                                            setExerciseModalVisible(false);
                                        }}
                                    >
                                        <View style={{ flex: 1, gap: 4 }}>
                                            <Text style={styles.modalItemTitle}>{tEx(ex.name)}</Text>
                                            <View style={{ flexDirection: "row", gap: 8 }}>
                                                <View style={styles.tag}><Text style={styles.tagText}>{ex.muscleGroup.toUpperCase()}</Text></View>
                                                <View style={styles.tag}><Text style={styles.tagText}>{ex.equipment.toUpperCase()}</Text></View>
                                                {ex.videoUrl && (
                                                    <View style={[styles.tag, { backgroundColor: "rgba(255, 204, 0, 0.1)" }]}>
                                                        <Ionicons name="videocam" size={10} color={colors.primary} />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                                    </Pressable>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: { paddingBottom: 0 },
    scroll: { paddingBottom: 60, gap: 20, marginTop: 10 },
    topActions: { marginBottom: 4 },
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
    countBadge: { backgroundColor: "#1c1c1e", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: "#333" },
    countText: { color: "#666", fontSize: 10, fontWeight: "800" },
    card: {
        backgroundColor: "#161616",
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 8,
    },
    label: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
    titleInput: { color: "#ffffff", fontSize: 20, fontWeight: "800", paddingVertical: 8 },
    exerciseCard: {
        backgroundColor: "#1c1c1e",
        borderRadius: 22,
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    exHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    exNumber: { color: "#444", fontSize: 12, fontWeight: "900" },
    exInput: {
        backgroundColor: "#161616",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    typeSelectorRow: { flexDirection: "row", gap: 6 },
    typePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#1c1c1e", borderWidth: 1, borderColor: "#2c2c2e" },
    typePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typePillText: { color: "#8c8c8c", fontSize: 10, fontWeight: "900" },
    typePillTextActive: { color: "#000" },
    inputGroup: {
        gap: 12,
        marginBottom: 10,
    },
    input: {
        backgroundColor: "#161616",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    indexCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    indexText: {
        color: "#666",
        fontSize: 14,
        fontWeight: "900",
    },
    paramGrid: { flexDirection: "row", gap: 12 },
    paramItem: { flex: 1, gap: 6 },
    paramLabel: { color: "#666", fontSize: 10, fontWeight: "900", textAlign: "center" },
    paramInput: {
        backgroundColor: "#161616",
        borderRadius: 10,
        paddingVertical: 10,
        textAlign: "center",
        color: colors.primary,
        fontSize: 15,
        fontWeight: "800",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        gap: 10,
        backgroundColor: "#161616",
        borderRadius: 20,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "#333",
    },
    addBtnText: { color: colors.primary, fontWeight: "900", fontSize: 13 },
    divider: { height: 1, backgroundColor: "#2c2c2e", marginVertical: 4 },
    templateToggle: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        padding: 18,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
    },
    toggleTitle: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
    toggleSub: { color: "#666", fontSize: 12, fontWeight: "500", marginTop: 2 },
    switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: "#333", padding: 2, justifyContent: "center" },
    switchActive: { backgroundColor: colors.primary },
    switchCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#ffffff" },
    switchCircleActive: { alignSelf: "flex-end" },
    footer: { marginTop: 10 },
    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: 22,
        height: 64,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    saveBtnText: { color: colors.primaryText, fontWeight: "900", fontSize: 16, letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "#000",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: "70%",
        padding: 24,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
    modalList: { flex: 1 },
    modalItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#121212",
        padding: 20,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#222",
    },
    modalItemTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 4 },
    modalItemSub: { color: "#666", fontSize: 12, fontWeight: "600" },
    modalSearch: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#111",
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        gap: 12,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        marginBottom: 20,
    },
    modalSearchInput: {
        flex: 1,
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    emptyText: {
        color: "#666",
        textAlign: "center",
        marginTop: 40,
        fontSize: 15,
    },
    tag: {
        backgroundColor: "#2c2c2e",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        color: "#aaa",
        fontSize: 10,
        fontWeight: "800",
    }
});
