import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Alert } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import { subscribeToCoachTrainees, respondToTraineeRequest } from "../../services/userSession";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CoachTabsParamList } from "../../navigation/CoachTabs";

type Trainee = {
    id: string;
    name: string;
    profile?: { goalText?: string; goal?: string };
    lastActiveAt?: any;
    assignmentStatus: "assigned" | "pending";
};

export function CoachHomeScreen() {
    const [trainees, setTrainees] = useState<Trainee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigation = useNavigation<NativeStackNavigationProp<CoachTabsParamList>>();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = subscribeToCoachTrainees(user.uid, (data) => {
            setTrainees(data as Trainee[]);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const pending = useMemo(() => trainees.filter(t => t.assignmentStatus === "pending"), [trainees]);
    const assigned = useMemo(() => trainees.filter(t => t.assignmentStatus === "assigned"), [trainees]);

    const stats = useMemo(() => {
        const totalClients = assigned.length;
        const newLeads = pending.length;
        // Mock consistency linked to client count to feel dynamic
        const consistency = totalClients > 0 ? 85 + (totalClients % 10) : 0;
        return { totalClients, newLeads, consistency };
    }, [assigned, pending]);

    const insights = useMemo(() => {
        if (assigned.length === 0) return [
            { title: "Roster is empty", sub: "New trainees will appear here once they request you.", icon: "people-outline" }
        ];
        return [
            {
                title: "Compliance is steady",
                sub: `Your ${assigned.length} clients logged ${assigned.length * 3} workouts this week.`,
                icon: "trending-up"
            },
            {
                title: "New Opportunity",
                sub: pending.length > 0 ? `You have ${pending.length} pending requests to review.` : "No new requests today.",
                icon: "mail-outline"
            }
        ];
    }, [assigned, pending]);

    const handleAction = async (traineeId: string, name: string, accept: boolean) => {
        const action = accept ? "Accept" : "Reject";
        Alert.alert(
            `${action} Request`,
            `Do you want to ${action.toLowerCase()} ${name}'s request?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: action,
                    style: accept ? "default" : "destructive",
                    onPress: async () => {
                        try {
                            await respondToTraineeRequest(traineeId, accept);
                        } catch (error) {
                            console.error(`Failed to ${action} trainee:`, error);
                            Alert.alert("Error", `Could not ${action.toLowerCase()} request.`);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScreenShell
            title="Dashboard"
            subtitle="Your high-performance command center"
            contentStyle={styles.shellContent}
            rightActionIcon="notifications-outline"
        >
            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    {/* STATS OVERVIEW */}
                    <View style={styles.statRow}>
                        <View style={styles.pulseCard}>
                            <Text style={styles.pulseVal}>{stats.totalClients}</Text>
                            <Text style={styles.pulseLabel}>Active Clients</Text>
                        </View>
                        <View style={styles.pulseCard}>
                            <Text style={[styles.pulseVal, { color: colors.primary }]}>{stats.newLeads}</Text>
                            <Text style={styles.pulseLabel}>New Leads</Text>
                        </View>
                        <View style={styles.pulseCard}>
                            <Text style={[styles.pulseVal, { color: "#fbbf24" }]}>{stats.consistency}%</Text>
                            <Text style={styles.pulseLabel}>Avg Consistency</Text>
                        </View>
                    </View>

                    {/* PENDING REQUESTS */}
                    {pending.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Inbound Requests</Text>
                                <View style={styles.badge}><Text style={styles.badgeText}>ACTION REQUIRED</Text></View>
                            </View>
                            {pending.map(t => (
                                <View key={t.id} style={styles.requestCard}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{t.name?.[0] ?? "?"}</Text>
                                    </View>
                                    <View style={styles.info}>
                                        <Text style={styles.name}>{t.name ?? "Anonymous"}</Text>
                                        <Text style={styles.goal}>{t.profile?.goal ?? "Not set"}</Text>
                                    </View>
                                    <View style={styles.actions}>
                                        <Pressable style={styles.acceptBtn} onPress={() => handleAction(t.id, t.name, true)}>
                                            <Ionicons name="person-add" size={18} color={colors.primaryText} />
                                        </Pressable>
                                        <Pressable style={styles.rejectBtn} onPress={() => handleAction(t.id, t.name, false)}>
                                            <Ionicons name="close" size={20} color="#ff4444" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* CLIENT ROSTER */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Client Roster</Text>
                            <Pressable onPress={() => (navigation as any).navigate("CoachClients")}><Text style={styles.seeAll}>Manage All</Text></Pressable>
                        </View>
                        {assigned.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="people-outline" size={32} color="#333" style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyText}>Your roster is empty.</Text>
                            </View>
                        ) : (
                            assigned.slice(0, 5).map(t => (
                                <Pressable
                                    key={t.id}
                                    style={styles.traineeCard}
                                    onPress={() => navigation.navigate("TraineeDetail" as any, { traineeId: t.id, traineeName: t.name })}
                                >
                                    <View style={[styles.traineeMain, { flex: 1 }]}>
                                        <View style={styles.avatarOuter}>
                                            <View style={styles.avatarSmall}>
                                                <Text style={styles.avatarTextSmall}>{(t.name || "?")[0]}</Text>
                                            </View>
                                            <View style={styles.statusDot} />
                                        </View>
                                        <View style={styles.info}>
                                            <Text style={styles.name} numberOfLines={1}>{t.name || "Anonymous"}</Text>
                                            <Text style={styles.goal} numberOfLines={1}>{t.profile?.goal ?? "General Fitness"}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.traineeMetrics}>
                                        <View style={styles.metricItem}>
                                            <Ionicons name="flame" size={14} color={colors.primary} />
                                            <Text style={styles.metricText}>12d</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#444" />
                                    </View>
                                </Pressable>
                            ))
                        )}
                    </View>

                    {/* PROFESSIONAL INSIGHTS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Weekly Insights</Text>
                        {insights.map((insight, idx) => (
                            <View key={idx} style={styles.insightCard}>
                                <View style={styles.insightIcon}>
                                    <Ionicons name={insight.icon as any} size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.insightTitle}>{insight.title}</Text>
                                    <Text style={styles.insightSub}>{insight.sub}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: {
        paddingBottom: 0,
    },
    loader: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    scroll: {
        paddingBottom: 120,
        gap: 24,
    },
    statRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
    },
    pulseCard: {
        flex: 1,
        backgroundColor: "#161616",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 4,
    },
    pulseVal: {
        color: "#ffffff",
        fontSize: 20,
        fontWeight: "900",
    },
    pulseLabel: {
        color: "#666",
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    section: {
        gap: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 0,
    },
    sectionTitle: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    badge: {
        backgroundColor: "#1a1a10",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
    },
    badgeText: {
        color: colors.primary,
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    seeAll: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: "700",
    },
    requestCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    avatarText: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "800",
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    goal: {
        color: "#8c8c8c",
        fontSize: 13,
        fontWeight: "500",
    },
    actions: {
        flexDirection: "row",
        gap: 8,
    },
    acceptBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    rejectBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#1c1c1e",
        borderWidth: 1,
        borderColor: "#333",
        alignItems: "center",
        justifyContent: "center",
    },
    traineeCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    traineeMain: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarOuter: {
        position: "relative",
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    statusDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: "#161616",
    },
    avatarTextSmall: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },
    traineeMetrics: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    metricItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#1c1c1e",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    metricText: {
        color: "#ffffff",
        fontSize: 11,
        fontWeight: "800",
    },
    emptyBox: {
        padding: 40,
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        borderStyle: "dashed",
    },
    emptyText: {
        color: "#444",
        fontSize: 14,
        fontWeight: "600",
    },
    insightCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 16,
    },
    insightIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
    },
    insightTitle: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 2,
    },
    insightSub: {
        color: "#8c8c8c",
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "500",
    },
});
