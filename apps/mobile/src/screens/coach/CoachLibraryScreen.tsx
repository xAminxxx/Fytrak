import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import { subscribeToCoachTemplates, CoachTemplate } from "../../services/userSession";

export function CoachLibraryScreen() {
    const [templates, setTemplates] = useState<CoachTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"workout" | "meal">("workout");

    const navigation = useNavigation<any>();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = subscribeToCoachTemplates(user.uid, activeTab, (data) => {
            setTemplates(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [activeTab]);

    return (
        <ScreenShell
            title="Library"
            subtitle="Manage your training & meal templates"
            contentStyle={styles.shellContent}
        >
            <View style={styles.tabs}>
                <Pressable
                    style={[styles.tab, activeTab === "workout" && styles.tabActive]}
                    onPress={() => { setIsLoading(true); setActiveTab("workout"); }}
                >
                    <Text style={[styles.tabText, activeTab === "workout" && styles.tabTextActive]}>Workouts</Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === "meal" && styles.tabActive]}
                    onPress={() => { setIsLoading(true); setActiveTab("meal"); }}
                >
                    <Text style={[styles.tabText, activeTab === "meal" && styles.tabTextActive]}>Meals</Text>
                </Pressable>
            </View>

            {isLoading ? (
                <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    {templates.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <View style={styles.iconCircle}>
                                <Ionicons name={activeTab === "workout" ? "barbell-outline" : "nutrition-outline"} size={40} color="#333" />
                            </View>
                            <Text style={styles.emptyTitle}>No {activeTab}s yet</Text>
                            <Text style={styles.emptyText}>Save a workout while prescribing it, or create a standalone template here.</Text>

                            <Pressable style={styles.createBtn} onPress={() => navigation.navigate("CreateTemplate", { type: activeTab })}>
                                <Ionicons name="add" size={20} color={colors.primaryText} />
                                <Text style={styles.createBtnText}>NEW {activeTab.toUpperCase()}</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {templates.map(t => (
                                <Pressable
                                    key={t.id}
                                    style={styles.templateCard}
                                    onPress={() => navigation.navigate("TemplateDetail", { templateId: t.id, type: t.type })}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.templateTitle} numberOfLines={1}>{t.title}</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#444" />
                                    </View>
                                    <Text style={styles.templateMeta}>
                                        {t.type === "workout"
                                            ? `${t.data.exercises?.length || 0} exercises`
                                            : "Custom meal plan"}
                                    </Text>
                                </Pressable>
                            ))}
                            <Pressable style={styles.addMiniBtn} onPress={() => navigation.navigate("CreateTemplate", { type: activeTab })}>
                                <Ionicons name="add" size={24} color={colors.primary} />
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}
        </ScreenShell>
    );
}



const styles = StyleSheet.create({
    shellContent: {
        paddingBottom: 0,
    },
    tabs: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
        marginTop: 10,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "#161616",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tabText: {
        color: "#666",
        fontSize: 14,
        fontWeight: "700",
    },
    tabTextActive: {
        color: colors.primaryText,
    },
    loader: {
        paddingTop: 40,
    },
    scroll: {
        paddingBottom: 100,
        gap: 24,
    },
    emptyBox: {
        backgroundColor: "#161616",
        borderRadius: 28,
        padding: 30,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        color: "#ffffff",
        fontSize: 20,
        fontWeight: "900",
        marginBottom: 8,
    },
    emptyText: {
        color: "#8c8c8c",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
    },
    createBtn: {
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    createBtnText: {
        color: colors.primaryText,
        fontWeight: "900",
        fontSize: 13,
        letterSpacing: 1,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    templateCard: {
        width: "48%",
        backgroundColor: "#161616",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 8,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    templateTitle: {
        flex: 1,
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "800",
    },
    templateMeta: {
        color: "#666",
        fontSize: 12,
        fontWeight: "600",
    },
    addMiniBtn: {
        width: "48%",
        height: 100,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
    },
});
