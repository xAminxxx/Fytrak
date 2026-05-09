import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { auth } from "../../config/firebase";
import {
    fetchLatestThreadMessage,
    getChatThreadId,
    subscribeToCoachTrainees,
    type ChatThreadSummary,
    type CoachTrainee,
} from "../../services/userSession";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";

export function CoachInboxScreen() {
    const [trainees, setTrainees] = useState<CoachTrainee[]>([]);
    const [summaries, setSummaries] = useState<Record<string, ChatThreadSummary | null>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = subscribeToCoachTrainees(user.uid, (data) => {
            setTrainees(data.filter((t) => t.assignmentStatus === "assigned"));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const user = auth.currentUser;
        if (!user) return;

        if (trainees.length === 0) {
            setSummaries({});
            return;
        }

        const missing = trainees.filter((trainee) => !trainee.clientSummary?.lastMessageAt);
        if (missing.length === 0) {
            setSummaries({});
            return;
        }

        setIsLoadingThreads(true);
        Promise.all(
            missing.map(async (trainee) => {
                const threadId = getChatThreadId(trainee.id, user.uid);
                const summary = await fetchLatestThreadMessage(threadId);
                return { traineeId: trainee.id, summary };
            })
        )
            .then((rows) => {
                if (!isMounted) return;
                const map: Record<string, ChatThreadSummary | null> = {};
                rows.forEach((row) => {
                    map[row.traineeId] = row.summary;
                });
                setSummaries(map);
            })
            .catch((error) => {
                console.error("Failed to load inbox summaries:", error);
                if (isMounted) setSummaries({});
            })
            .finally(() => {
                if (isMounted) setIsLoadingThreads(false);
            });

        return () => {
            isMounted = false;
        };
    }, [trainees]);

    const rows = useMemo(() => {
        const sorted = [...trainees].sort((a, b) => {
            const aSummary = a.clientSummary?.lastMessageAt ? {
                lastMessageAt: a.clientSummary.lastMessageAt,
            } : summaries[a.id];
            const bSummary = b.clientSummary?.lastMessageAt ? {
                lastMessageAt: b.clientSummary.lastMessageAt,
            } : summaries[b.id];
            const aTime = aSummary?.lastMessageAt ? new Date(aSummary.lastMessageAt).getTime() : 0;
            const bTime = bSummary?.lastMessageAt ? new Date(bSummary.lastMessageAt).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return (a.name || "").localeCompare(b.name || "");
        });
        return sorted;
    }, [summaries, trainees]);

    return (
        <ScreenShell
            title="Inbox"
            subtitle="Coach conversations"
            contentStyle={styles.shellContent}
        >
            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {isLoadingThreads && (
                        <View style={styles.signalLoader}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.signalText}>Refreshing threads...</Text>
                        </View>
                    )}

                    {rows.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="chatbubbles-outline" size={32} color="#444" />
                            <Text style={styles.emptyText}>No conversations yet.</Text>
                        </View>
                    ) : (
                        rows.map((trainee) => {
                            const summary = trainee.clientSummary?.lastMessageAt ? {
                                lastMessageAt: trainee.clientSummary.lastMessageAt,
                                lastMessageText: trainee.clientSummary.lastMessageText,
                            } : summaries[trainee.id];
                            const preview = summary?.lastMessageText || "No messages yet";
                            const timeLabel = summary?.lastMessageAt
                                ? new Date(summary.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "";
                            const unreadCount = trainee.clientSummary?.unreadCoachCount || 0;

                            return (
                                <Pressable
                                    key={trainee.id}
                                    style={styles.threadCard}
                                    onPress={() =>
                                        navigation.navigate("CoachChat", {
                                            traineeId: trainee.id,
                                            traineeName: trainee.name || "Anonymous",
                                            coachId: auth.currentUser?.uid || "unknown",
                                        })
                                    }
                                >
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{(trainee.name || "?")[0]}</Text>
                                    </View>
                                    <View style={styles.threadBody}>
                                        <View style={styles.threadHeader}>
                                            <Text style={styles.threadName}>{trainee.name || "Anonymous"}</Text>
                                            <Text style={styles.threadTime}>{timeLabel}</Text>
                                        </View>
                                        <Text style={styles.threadPreview} numberOfLines={1}>
                                            {preview}
                                        </Text>
                                    </View>
                                    {unreadCount > 0 && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadText}>{unreadCount}</Text>
                                        </View>
                                    )}
                                    <Ionicons name="chevron-forward" size={18} color="#444" />
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: { paddingBottom: 0 },
    loader: {
        marginTop: 40,
    },
    list: {
        paddingBottom: 100,
        gap: 12,
    },
    signalLoader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 4,
        marginBottom: 6,
    },
    signalText: {
        color: "#666",
        fontSize: 12,
        fontWeight: "600",
    },
    threadCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 12,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#1c1c1e",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
    },
    avatarText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
    },
    threadBody: {
        flex: 1,
        gap: 4,
    },
    threadHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    threadName: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    },
    threadTime: {
        color: "#666",
        fontSize: 11,
        fontWeight: "600",
    },
    threadPreview: {
        color: "#8c8c8c",
        fontSize: 13,
        fontWeight: "600",
    },
    unreadBadge: {
        minWidth: 24,
        paddingHorizontal: 6,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    unreadText: {
        color: "#000",
        fontSize: 11,
        fontWeight: "900",
    },
    emptyBox: {
        padding: 40,
        alignItems: "center",
        gap: 12,
    },
    emptyText: {
        color: "#444",
        fontSize: 14,
        fontWeight: "600",
    },
});
