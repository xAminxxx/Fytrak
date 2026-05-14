import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Alert, Dimensions } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/firebase";
import { useNavigation } from "@react-navigation/native";
import type { CoachHomeNavigation } from "../../navigation/types";
import { useCoachDashboard } from "../../hooks/useCoachDashboard";
import { Typography } from "../../components/Typography";

const { width } = Dimensions.get("window");

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
            title="DASHBOARD"
            subtitle=""
            contentStyle={styles.shellContent}
            rightActionIcon="notifications-outline"
        >
            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    
                    {/* GREETING */}
                    <View style={styles.greetingHeader}>
                        <View>
                            <Typography variant="label" style={{ color: colors.primary, fontWeight: '800', letterSpacing: 1 }}>WELCOME BACK,</Typography>
                            <Typography variant="h1" style={{ fontSize: 32, marginTop: 4 }}>Coach</Typography>
                        </View>
                    </View>

                    {/* PULSE STATS */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <View style={styles.statIconBox}>
                                <Ionicons name="people" size={18} color={colors.primary} />
                            </View>
                            <View>
                                <Typography variant="label" color="#8c8c8c" style={{ fontSize: 10 }}>ACTIVE CLIENTS</Typography>
                                <Typography variant="h2" style={{ fontSize: 20 }}>{stats.totalClients}</Typography>
                            </View>
                        </View>
                        <View style={styles.statBox}>
                            <View style={[styles.statIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
                                <Ionicons name="analytics" size={18} color="#4ade80" />
                            </View>
                            <View>
                                <Typography variant="label" color="#8c8c8c" style={{ fontSize: 10 }}>COMPLIANCE</Typography>
                                <Typography variant="h2" style={{ fontSize: 20, color: '#4ade80' }}>{stats.consistency}%</Typography>
                            </View>
                        </View>
                    </View>

                    {/* ACTION CENTER */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="flash" size={18} color={colors.primary} />
                            <Typography variant="h2">Action Center</Typography>
                        </View>
                        <View style={styles.actionGrid}>
                            <ActionPill 
                                count={pending.length} 
                                label="Requests" 
                                color="#fbbf24" 
                                icon="person-add" 
                                onPress={() => {}} 
                            />
                            <ActionPill 
                                count={unreadMessages} 
                                label="Messages" 
                                color="#60a5fa" 
                                icon="chatbubbles" 
                                onPress={() => navigation.navigate("CoachInbox" as any)} 
                            />
                            <ActionPill 
                                count={checkInsDue} 
                                label="Check-ins" 
                                color="#f87171" 
                                icon="alert-circle" 
                                onPress={() => {}} 
                            />
                        </View>
                    </View>

                    {/* PENDING REQUESTS */}
                    {pending.length > 0 && (
                        <View style={styles.missionCard}>
                            <View style={styles.missionHeader}>
                                <View>
                                    <Typography variant="label" color={colors.primary}>INBOUND QUEUE</Typography>
                                    <Typography variant="h2" style={{ fontSize: 20 }}>New Requests</Typography>
                                </View>
                                <View style={styles.countBadge}>
                                    <Typography style={styles.countBadgeText}>{pending.length}</Typography>
                                </View>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                {pending.map(t => (
                                    <View key={t.id} style={styles.requestItem}>
                                        <View style={styles.requestInfo}>
                                            <Typography variant="h2" style={{ fontSize: 15 }} numberOfLines={1}>{t.name || "Anonymous"}</Typography>
                                            <Typography variant="label" color="#8c8c8c" style={{ fontSize: 10 }} numberOfLines={1}>{t.profile?.goal || "General Fitness"}</Typography>
                                        </View>
                                        <View style={styles.requestActions}>
                                            <Pressable style={styles.miniBtnPrimary} onPress={() => handleAction(t.id, t.name || "Anon", true)}>
                                                <Ionicons name="checkmark" size={16} color="#000" />
                                            </Pressable>
                                            <Pressable style={styles.miniBtnSecondary} onPress={() => handleAction(t.id, t.name || "Anon", false)}>
                                                <Ionicons name="close" size={16} color="#fff" />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* URGENT CLIENTS */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="warning" size={18} color="#f87171" />
                            <Typography variant="h2">Urgent Attention</Typography>
                            {atRiskClients.length > 0 && (
                                <View style={[styles.statusBadge, { backgroundColor: '#f87171' }]}>
                                    <Typography style={styles.statusBadgeText}>{atRiskClients.length} AT RISK</Typography>
                                </View>
                            )}
                        </View>
                        {atRiskClients.length === 0 ? (
                            <View style={styles.emptyContent}>
                                <Ionicons name="shield-checkmark-outline" size={32} color="#2c2c2e" />
                                <Typography variant="label" color="#444">All clients are performing well.</Typography>
                            </View>
                        ) : (
                            <View style={styles.list}>
                                {atRiskClients.map((client) => {
                                    const trainee = assigned.find((item) => item.id === client.traineeId);
                                    return (
                                        <Pressable 
                                            key={client.traineeId} 
                                            style={styles.listItem}
                                            onPress={() => navigation.navigate("TraineeDetail", { traineeId: client.traineeId, traineeName: trainee?.name || "Anonymous" })}
                                        >
                                            <View style={styles.listAvatar}>
                                                <Text style={styles.avatarText}>{(trainee?.name || "?")[0]}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Typography variant="h2" style={{ fontSize: 15 }}>{trainee?.name || "Anonymous"}</Typography>
                                                <Typography variant="label" color="#f87171" style={{ fontSize: 10 }}>{client.risk.toUpperCase()} RISK • {client.complianceScore}% COMPLIANCE</Typography>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color="#444" />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* ROSTER */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="people" size={18} color={colors.primary} />
                            <Typography variant="h2">Client Roster</Typography>
                            <Pressable onPress={() => navigation.navigate("CoachClients")}>
                                <Typography variant="label" color={colors.primary} style={{ marginLeft: 'auto' }}>SEE ALL</Typography>
                            </Pressable>
                        </View>
                        <View style={styles.list}>
                            {assigned.slice(0, 5).map(t => {
                                const intelligence = clientIntelligenceById.get(t.id);
                                return (
                                    <Pressable
                                        key={t.id}
                                        style={styles.listItem}
                                        onPress={() => navigation.navigate("TraineeDetail", { traineeId: t.id, traineeName: t.name || "Anonymous" })}
                                    >
                                        <View style={styles.listAvatar}>
                                            <Text style={styles.avatarText}>{(t.name || "?")[0]}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Typography variant="h2" style={{ fontSize: 15 }}>{t.name}</Typography>
                                            <Typography variant="label" color="#8c8c8c" style={{ fontSize: 10 }}>{t.profile?.goal || "General Fitness"}</Typography>
                                        </View>
                                        <View style={styles.compliancePill}>
                                            <Ionicons name="pulse" size={10} color={colors.primary} />
                                            <Text style={styles.complianceVal}>{intelligence?.complianceScore || "--"}%</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color="#444" />
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* WEEKLY INSIGHTS */}
                    <View style={styles.missionCard}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="bulb" size={18} color="#fbbf24" />
                            <Typography variant="h2">Intelligence Insights</Typography>
                        </View>
                        <View style={styles.insightList}>
                            {insights.map((insight, idx) => (
                                <View key={idx} style={styles.insightItem}>
                                    <View style={[styles.insightIconBox, { backgroundColor: insight.tone === 'warning' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 204, 0, 0.1)' }]}>
                                        <Ionicons name={insight.icon as any} size={16} color={insight.tone === 'warning' ? '#fbbf24' : colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Typography variant="h2" style={{ fontSize: 14 }}>{insight.title}</Typography>
                                        <Typography variant="label" color="#777" style={{ fontSize: 10 }}>{insight.sub}</Typography>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                </ScrollView>
            )}
        </ScreenShell>
    );
}

function ActionPill({ count, label, color, icon, onPress }: any) {
    return (
        <Pressable style={styles.actionPill} onPress={onPress}>
            <View style={[styles.actionIconCircle, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <View>
                <Typography variant="h2" style={{ fontSize: 16 }}>{count}</Typography>
                <Typography variant="label" color="#666" style={{ fontSize: 8 }}>{label.toUpperCase()}</Typography>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    shellContent: { paddingBottom: 0 },
    scroll: { paddingBottom: 140, gap: 16, marginTop: 10 },
    loader: { paddingTop: 40, alignItems: "center" },

    greetingHeader: { marginBottom: 4 },
    statsGrid: { flexDirection: 'row', gap: 12 },
    statBox: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#161616', 
        padding: 16, 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: '#333',
        gap: 12
    },
    statIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,204,0,0.1)', alignItems: 'center', justifyContent: 'center' },

    card: {
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#333333",
        gap: 16,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    
    actionGrid: { flexDirection: 'row', gap: 10 },
    actionPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
        borderRadius: 16,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#1c1c1e',
    },
    actionIconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    missionCard: {
        backgroundColor: "#101010",
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 16,
    },
    missionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    countBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1c1c1e", borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
    countBadgeText: { color: colors.primary, fontSize: 16, fontWeight: "900" },
    
    horizontalScroll: { gap: 12, paddingRight: 20 },
    requestItem: {
        width: width * 0.7,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161616',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#242424',
        gap: 12,
    },
    requestInfo: { flex: 1 },
    requestActions: { flexDirection: 'row', gap: 8 },
    miniBtnPrimary: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    miniBtnSecondary: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },

    list: { gap: 12 },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0a0a0a',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1c1c1e',
    },
    listAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
    avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    compliancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#1c1c1e' },
    complianceVal: { color: colors.primary, fontSize: 11, fontWeight: '800' },

    statusBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 9, color: '#000', fontWeight: '900' },

    emptyContent: { padding: 30, alignItems: 'center', gap: 10 },

    insightList: { gap: 8 },
    insightItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#161616",
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: "#242424",
    },
    insightIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: '#2c2c2e' },
});
