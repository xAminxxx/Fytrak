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
import { savePrescribedMeal, CoachTemplate, subscribeToCoachTemplates } from "../../services/userSession";
import { auth } from "../../config/firebase";
import { useNavigation, useRoute } from "@react-navigation/native";

export function PrescribeMealScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { traineeId, traineeName } = route.params;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });

    const [templates, setTemplates] = useState<CoachTemplate[]>([]);
    const [libModalVisible, setLibModalVisible] = useState(false);
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsubscribe = subscribeToCoachTemplates(user.uid, "meal", (data) => {
            setTemplates(data);
        });
        return () => unsubscribe();
    }, []);

    const applyTemplate = (t: CoachTemplate) => {
        setTitle(t.title);
        if (t.data) {
            setDescription(t.data.description || "");
            if (t.data.macros) {
                setMacros(t.data.macros);
            }
        }
        setLibModalVisible(false);
    };

    const updateMacro = (field: string, value: string) => {
        setMacros({ ...macros, [field]: parseInt(value) || 0 });
    };

    const handleSave = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert("Missing Info", "Please provide a title and description for this meal plan.");
            return;
        }

        try {
            setIsSubmitting(true);
            const user = auth.currentUser;
            if (!user) throw new Error("No coach session");

            await savePrescribedMeal(traineeId, {
                coachId: user.uid,
                coachName: (user as any).displayName || "Your Coach",
                title: title.trim(),
                description: description.trim(),
                macros: macros,
                isApplied: false
            });

            if (saveAsTemplate) {
                const { saveCoachTemplate } = require("../../services/userSession");
                await saveCoachTemplate(user.uid, {
                    title: title.trim(),
                    type: "meal",
                    data: { description, macros }
                });
            }

            Alert.alert("Success", "Nutrition plan prescribed successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to assign nutrition plan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenShell
            title="Prescribe Nutrition"
            subtitle={`Assign a new meal plan for ${traineeName}`}
            contentStyle={styles.shellContent}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <View style={styles.topActions}>
                    <Pressable
                        style={styles.loadBtn}
                        onPress={() => {
                            if (templates.length === 0) {
                                Alert.alert("Library Empty", "Save a meal plan as a template first to use this feature.");
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

                <View style={styles.card}>
                    <Text style={styles.label}>Plan Title</Text>
                    <TextInput
                        style={styles.titleInput}
                        placeholder="e.g. Cutting Phase - Prep"
                        placeholderTextColor="#444"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Meal Description</Text>
                    <TextInput
                        style={[styles.textArea, { marginTop: 12 }]}
                        placeholder="Detail the meals, portions, and timing..."
                        placeholderTextColor="#444"
                        multiline
                        numberOfLines={6}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Daily Macro Targets</Text>
                    <View style={styles.macroGrid}>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>CALORIES</Text>
                            <TextInput
                                style={styles.macroInput}
                                keyboardType="numeric"
                                value={macros.calories.toString()}
                                onChangeText={(v) => updateMacro("calories", v)}
                            />
                        </View>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>PROTEIN (G)</Text>
                            <TextInput
                                style={styles.macroInput}
                                keyboardType="numeric"
                                value={macros.protein.toString()}
                                onChangeText={(v) => updateMacro("protein", v)}
                            />
                        </View>
                    </View>
                    <View style={[styles.macroGrid, { marginTop: 12 }]}>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>CARBS (G)</Text>
                            <TextInput
                                style={styles.macroInput}
                                keyboardType="numeric"
                                value={macros.carbs.toString()}
                                onChangeText={(v) => updateMacro("carbs", v)}
                            />
                        </View>
                        <View style={styles.macroItem}>
                            <Text style={styles.macroLabel}>FATS (G)</Text>
                            <TextInput
                                style={styles.macroInput}
                                keyboardType="numeric"
                                value={macros.fats.toString()}
                                onChangeText={(v) => updateMacro("fats", v)}
                            />
                        </View>
                    </View>
                </View>

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
                                <Text style={styles.saveBtnText}>ASSIGN PLAN</Text>
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
                        <ScrollView style={styles.modalList}>
                            {templates.map(t => (
                                <Pressable key={t.id} style={styles.modalItem} onPress={() => applyTemplate(t)}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalItemTitle}>{t.title}</Text>
                                        <Text style={styles.modalItemSub}>{t.data.macros?.calories || 0} kcal</Text>
                                    </View>
                                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                                </Pressable>
                            ))}
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
    textArea: {
        backgroundColor: "#1c1c1e",
        borderRadius: 16,
        padding: 16,
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
        borderWidth: 1,
        borderColor: "#2c2c2e",
        textAlignVertical: "top",
        minHeight: 120,
    },
    macroGrid: { flexDirection: "row", gap: 12 },
    macroItem: { flex: 1, gap: 8 },
    macroLabel: { color: "#666", fontSize: 10, fontWeight: "900", textAlign: "center" },
    macroInput: {
        backgroundColor: "#161616",
        borderRadius: 12,
        paddingVertical: 14,
        textAlign: "center",
        color: colors.primary,
        fontSize: 18,
        fontWeight: "900",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
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
});
