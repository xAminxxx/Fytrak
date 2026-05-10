import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Alert } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import {
    fetchCoachClientSignals,
    respondToTraineeRequest,
    subscribeToCoachTrainees,
    type CoachTrainee,
} from "../../services/userSession";
import { useNavigation } from "@react-navigation/native";
import type { CoachHomeNavigation } from "../../navigation/types";
import {
    buildCoachDashboardIntelligence,
    type CoachClientIntelligence,
    type CoachClientSignal,
} from "../../features/coaching/coachIntelligence";
import { trackEvent } from "../../services/analytics";
import { useCoachDashboard } from "../../hooks/useCoachDashboard";
import { RiskCard, ActionQueueCard } from "../../components/coach/CoachDashboardCards";

export function CoachHomeScreen() {
    const navigation = useNavigation<CoachHomeNavigation>();
    const {
        pending,
        assigned,
        isLoading,
        isLoadingSignals,
        stats,
        insights,
        unreadMessages,
        checkInsDue,
        atRiskClients,
        recentActivity,
        clientIntelligenceById,
        handleAction,
    } = useCoachDashboard();

    return (
        <ScreenShell 
            title="Home"
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
                    {/* ACTION QUEUE */}
                    <View style={styles.actionQueue}>
                        <ActionQueueCard
                            label="Pending Requests"
                            value={pending.length}
                            tone="warning"
                            icon="mail-outline"
                        />
                        <ActionQueueCard
                            label="Unread Messages"
                            value={unreadMessages}
                            tone="neutral"
                            icon="chatbubbles-outline"
                        />
                        <ActionQueueCard
                            label="Check-ins Due"
                            value={checkInsDue}
                            tone="danger"
                            icon="alert-circle-outline"
                        />
                    </View>



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
                                        <Pressable style={styles.acceptBtn} onPress={() => handleAction(t.id, t.name || "Anonymous", true)}>
                                            <Ionicons name="person-add" size={18} color={colors.primaryText} />
                                        </Pressable>
                                        <Pressable style={styles.rejectBtn} onPress={() => handleAction(t.id, t.name || "Anonymous", false)}>
                                            <Ionicons name="close" size={20} color="#ff4444" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* URGENT CLIENTS */}
                    {assigned.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Urgent Clients</Text>
                                {isLoadingSignals ? <ActivityIndicator color={colors.primary} size="small" /> : null}
                            </View>
                            {atRiskClients.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} style={{ marginBottom: 10 }} />
                                    <Text style={styles.emptyText}>No at-risk clients detected this week.</Text>
                                </View>
                            ) : (
                                atRiskClients.map((client) => {
                                    const trainee = assigned.find((item) => item.id === client.traineeId);
                                    return (
                                        <RiskCard
                                            key={client.traineeId}
                                            client={client}
                                            name={trainee?.name || "Anonymous"}
                                            onOpen={() => {
                                                trackEvent("coach_risk_card_opened", {
                                                    risk: client.risk,
                                                    complianceScore: client.complianceScore,
                                                });
                                                navigation.navigate("TraineeDetail", { traineeId: client.traineeId, traineeName: trainee?.name || "Anonymous" });
                                            }}
                                        />
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* RECENT ACTIVITY */}
                    {recentActivity.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Activity</Text>
                                <Pressable onPress={() => navigation.navigate("CoachClients")}>
                                    <Text style={styles.seeAll}>View All</Text>
                                </Pressable>
                            </View>
                            {recentActivity.map((client) => {
                                const trainee = assigned.find((item) => item.id === client.traineeId);
                                const lastWorkoutLabel = client.lastWorkoutAt
                                    ? client.lastWorkoutAt.toLocaleDateString()
                                    : "No workout";

                                return (
                                    <View key={client.traineeId} style={styles.activityItem}>
                                        <View style={styles.activityAvatar}>
                                            <Text style={styles.avatarTextSmall}>{trainee?.name?.[0] || "?"}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.activityName}>{trainee?.name || "Anonymous"}</Text>
                                            <Text style={styles.activityMeta}>Last workout: {lastWorkoutLabel}</Text>
                                        </View>
                                        <View style={styles.activityBadge}>
                                            <Text style={styles.activityBadgeText}>{client.workoutsLast7Days}x</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* CLIENT ROSTER */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Client Roster</Text>
                            <Pressable onPress={() => navigation.navigate("CoachClients")}><Text style={styles.seeAll}>Manage All</Text></Pressable>
                        </View>
                        {assigned.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="people-outline" size={32} color="#333" style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyText}>Your roster is empty.</Text>
                            </View>
                        ) : (
                            assigned.slice(0, 5).map(t => {
                                const intelligence = clientIntelligenceById.get(t.id);
                                return (
                                <Pressable
                                    key={t.id}
                                    style={styles.traineeCard}
                                    onPress={() => navigation.navigate("TraineeDetail", { traineeId: t.id, traineeName: t.name || "Anonymous" })}
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
                                        <View style={[
                                            styles.metricItem,
                                            intelligence?.risk === "high" && styles.metricItemDanger,
                                            intelligence?.risk === "medium" && styles.metricItemWarning,
                                        ]}>
                                            <Ionicons
                                                name={intelligence?.risk === "high" ? "warning" : "pulse"}
                                                size={14}
                                                color={intelligence?.risk === "high" ? "#ff7777" : colors.primary}
                                            />
                                            <Text style={styles.metricText}>{intelligence?.complianceScore ?? "--"}%</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#444" />
                                    </View>
                                </Pressable>
                                );
                            })
                        )}
                    </View>

                    {/* PROFESSIONAL INSIGHTS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Weekly Insights</Text>
                        {insights.map((insight, idx) => (
                            <View key={idx} style={styles.insightCard}>
                                <View style={[
                                    styles.insightIcon,
                                    insight.tone === "warning" && styles.insightIconWarning,
                                ]}>
                                    <Ionicons name={insight.icon as any} size={20} color={insight.tone === "warning" ? "#fbbf24" : colors.primary} />
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
    actionQueue: {
        flexDirection: "row",
        gap: 12,
        marginTop: 6,
    },
    queueCard: {
        flex: 1,
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        gap: 6,
    },
    queueIcon: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111",
    },
    queueValue: {
        fontSize: 18,
        fontWeight: "900",
        color: "#fff",
    },
    queueLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: "#666",
        textTransform: "uppercase",
        letterSpacing: 0.5,
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
    activityItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 12,
    },
    activityAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    activityName: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    activityMeta: {
        color: "#666",
        fontSize: 12,
        fontWeight: "600",
        marginTop: 2,
    },
    activityBadge: {
        backgroundColor: "#1c1c1e",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#333",
    },
    activityBadgeText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: "800",
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
    metricItemDanger: {
        backgroundColor: "#251414",
        borderWidth: 1,
        borderColor: "#5a2222",
    },
    metricItemWarning: {
        backgroundColor: "#241f12",
        borderWidth: 1,
        borderColor: "#5a4818",
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
    insightIconWarning: {
        backgroundColor: "#241f12",
        borderWidth: 1,
        borderColor: "#5a4818",
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
    riskCard: {
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 14,
    },
    riskCardHigh: {
        borderColor: "#5a2222",
        backgroundColor: "#181212",
    },
    riskHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    riskIdentity: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    riskAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    riskAvatarHigh: {
        borderColor: "#703030",
        backgroundColor: "#251414",
    },
    scorePill: {
        minWidth: 52,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: "#1c1c1e",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    scorePillHigh: {
        backgroundColor: "#251414",
        borderColor: "#5a2222",
    },
    scoreText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: "900",
    },
    scoreTextHigh: {
        color: "#ff7777",
    },
    nudgeBox: {
        flexDirection: "row",
        gap: 10,
        backgroundColor: "#101010",
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: "#242424",
    },
    nudgeText: {
        flex: 1,
        color: "#c8c8c8",
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "600",
    },
});
