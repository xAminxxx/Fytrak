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
import { Typography } from "../../components/Typography";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { savePrescribedWorkout, CoachTemplate, subscribeToCoachTemplates, WorkoutSetType } from "../../services/userSession";
import { EXERCISE_LIBRARY, ExerciseLibraryItem, t as tEx } from "../../constants/exercises";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useWorkoutPrescriptionBuilder } from "../../hooks/useWorkoutPrescriptionBuilder";
import { ExerciseLibraryModal } from "../../components/coach/ExerciseLibraryModal";
import { TemplateLibraryModal } from "../../components/coach/TemplateLibraryModal";

export function PrescribeWorkoutScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { traineeId, traineeName } = route.params;

    const {
        title,
        setTitle,
        exercises,
        templates,
        libModalVisible,
        setLibModalVisible,
        saveAsTemplate,
        setSaveAsTemplate,
        isSubmitting,
        libSearchQuery,
        setLibSearchQuery,
        filteredTemplates,
        exerciseModalVisible,
        setExerciseModalVisible,
        exerciseSearchQuery,
        setExerciseSearchQuery,
        activeExerciseIndex,
        setActiveExerciseIndex,
        selectedExerciseInfo,
        setSelectedExerciseInfo,
        dbExercises,
        isSearching,
        filteredExercises,
        applyTemplate,
        findExerciseInfo,
        applyExerciseSelection,
        addCustomExercise,
        addExercise,
        updateExercise,
        removeExercise,
        handleSave
    } = useWorkoutPrescriptionBuilder(traineeId, navigation);

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
                            <View style={styles.exActions}>
                                <Pressable
                                    style={styles.infoIconBtn}
                                    onPress={() => {
                                        const info = findExerciseInfo(ex.name);
                                        if (info) setSelectedExerciseInfo(info);
                                    }}
                                    disabled={!ex.name}
                                >
                                    <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                                </Pressable>
                                <Pressable
                                    style={styles.exRemoveBtn}
                                    onPress={() => {
                                        removeExercise(idx);
                                    }}
                                >
                                    <Ionicons name="close-circle-outline" size={20} color="#ff4444" />
                                </Pressable>
                            </View>
                        </View>
                        <View style={styles.typeSelectorRow}>
                            {(["WEIGHT_REPS", "TIME", "BODYWEIGHT"] as WorkoutSetType[]).map(t => (
                                <Pressable key={t} style={[styles.typePill, ex.type === t && styles.typePillActive]} onPress={() => updateExercise(idx, "type", t)}>
                                    <Text style={[styles.typePillText, ex.type === t && styles.typePillTextActive]}>{t.replace("_", " ")}</Text>
                                </Pressable>
                            ))}
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

            <TemplateLibraryModal
                visible={libModalVisible}
                onClose={() => setLibModalVisible(false)}
                searchQuery={libSearchQuery}
                onSearchChange={setLibSearchQuery}
                filteredTemplates={filteredTemplates}
                onApplyTemplate={applyTemplate}
            />

            <ExerciseLibraryModal
                visible={exerciseModalVisible}
                onClose={() => setExerciseModalVisible(false)}
                searchQuery={exerciseSearchQuery}
                onSearchChange={setExerciseSearchQuery}
                isSearching={isSearching}
                filteredExercises={filteredExercises}
                onAddCustom={(name) => {
                    addCustomExercise(name);
                    setExerciseModalVisible(false);
                    setExerciseSearchQuery("");
                }}
                onSelectInfo={(ex) => setSelectedExerciseInfo(ex)}
                onApplySelection={(ex) => {
                    applyExerciseSelection(ex);
                    setExerciseModalVisible(false);
                    setExerciseSearchQuery("");
                }}
            />

            <ExerciseDetailSheet
                exercise={selectedExerciseInfo}
                isVisible={!!selectedExerciseInfo}
                onClose={() => setSelectedExerciseInfo(null)}
                primaryActionLabel="Add to workout"
                onPrimaryAction={(exercise) => {
                    applyExerciseSelection(exercise);
                    setSelectedExerciseInfo(null);
                    setExerciseModalVisible(false);
                    setExerciseSearchQuery("");
                }}
            />

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
        position: "relative",
    },
    exHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    exActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    exRemoveBtn: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
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
        height: "85%",
        padding: 24,
        borderWidth: 1,
        borderColor: "#1c1c1e",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    modalTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
    modalSearch: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 16, borderWidth: 1, borderColor: "#2c2c2e", gap: 10 },
    modalSearchInput: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "600" },
    modalList: { flex: 1 },
    emptyText: { color: "#666", fontSize: 14, textAlign: "center", marginTop: 40 },
    modalItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2c2c2e" },
    modalItemTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 4 },
    modalItemSub: { color: "#666", fontSize: 12, fontWeight: "600" },
    infoIconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#1c1c1e", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2c2c2e" },
    exerciseSelectItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e", borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#2c2c2e" },
    tag: { backgroundColor: "#1c1c1e", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#2c2c2e" },
    tagText: { color: "#aaa", fontSize: 10, fontWeight: "900" },
    addIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    addExBtn: { minHeight: 56, backgroundColor: "#161616", padding: 16, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", borderStyle: "dashed", borderWidth: 1, borderColor: "#2c2c2e", gap: 10, marginBottom: 8 },
    addExText: { color: "#fff", fontWeight: "800" },
});
