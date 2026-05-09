import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { saveProgram, ProgramWeek, ProgramSession } from "../../services/userSession";
import { useRoute, useNavigation } from "@react-navigation/native";
import { auth } from "../../config/firebase";

export function CreateProgramScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { traineeId, traineeName } = route.params;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [level, setLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT">("INTERMEDIATE");
    const [durationWeeks, setDurationWeeks] = useState("4");
    const [sessionsPerWeek, setSessionsPerWeek] = useState("3");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
    const [outlineReady, setOutlineReady] = useState(false);

    const weeksNum = useMemo(() => parseInt(durationWeeks) || 0, [durationWeeks]);
    const sessionsNum = useMemo(() => parseInt(sessionsPerWeek) || 0, [sessionsPerWeek]);

    const generateOutline = () => {
        if (weeksNum < 1 || weeksNum > 16) {
            Alert.alert("Invalid Input", "Duration must be between 1 and 16 weeks.");
            return;
        }
        if (sessionsNum < 1 || sessionsNum > 7) {
            Alert.alert("Invalid Input", "Sessions per week must be between 1 and 7.");
            return;
        }

        const generatedWeeks: ProgramWeek[] = [];
        for (let w = 1; w <= weeksNum; w++) {
            const sessions: ProgramSession[] = [];
            for (let s = 1; s <= sessionsNum; s++) {
                sessions.push({
                    id: `w${w}-s${s}`,
                    sessionNumber: s,
                    title: `Day ${s}`,
                    estimatedMinutes: 60,
                    exercises: [],
                    isCompleted: false,
                });
            }
            generatedWeeks.push({
                id: `week-${w}`,
                weekNumber: w,
                title: `Week ${w}`,
                sessions,
            });
        }
        setWeeks(generatedWeeks);
        setOutlineReady(true);
    };

    const updateWeekTitle = (weekId: string, value: string) => {
        setWeeks((prev) => prev.map((week) => (week.id === weekId ? { ...week, title: value } : week)));
    };

    const updateSessionTitle = (weekId: string, sessionId: string, value: string) => {
        setWeeks((prev) =>
            prev.map((week) => {
                if (week.id !== weekId) return week;
                return {
                    ...week,
                    sessions: week.sessions.map((session) =>
                        session.id === sessionId ? { ...session, title: value } : session
                    ),
                };
            })
        );
    };

    const duplicateWeek = (weekId: string) => {
        setWeeks((prev) => {
            const index = prev.findIndex((week) => week.id === weekId);
            if (index === -1) return prev;
            const source = prev[index];
            const nextWeekNumber = prev.length + 1;
            const clonedSessions = source.sessions.map((session, idx) => ({
                ...session,
                id: `w${nextWeekNumber}-s${idx + 1}`,
                sessionNumber: idx + 1,
            }));
            const newWeek: ProgramWeek = {
                ...source,
                id: `week-${nextWeekNumber}`,
                weekNumber: nextWeekNumber,
                title: `Week ${nextWeekNumber}`,
                sessions: clonedSessions,
            };
            return [...prev, newWeek];
        });
    };

    const addSessionToWeek = (weekId: string) => {
        setWeeks((prev) =>
            prev.map((week) => {
                if (week.id !== weekId) return week;
                const nextNumber = week.sessions.length + 1;
                const session: ProgramSession = {
                    id: `${week.id}-s${nextNumber}`,
                    sessionNumber: nextNumber,
                    title: `Day ${nextNumber}`,
                    estimatedMinutes: 60,
                    exercises: [],
                    isCompleted: false,
                };
                return { ...week, sessions: [...week.sessions, session] };
            })
        );
    };

    const removeSessionFromWeek = (weekId: string, sessionId: string) => {
        setWeeks((prev) =>
            prev.map((week) => {
                if (week.id !== weekId) return week;
                const nextSessions = week.sessions.filter((session) => session.id !== sessionId);
                return { ...week, sessions: nextSessions };
            })
        );
    };

    const handleAssignProgram = async () => {
        if (!title.trim() || !durationWeeks || !sessionsPerWeek) {
            Alert.alert("Missing Fields", "Please provide a title, duration, and sessions per week.");
            return;
        }

        if (!outlineReady || weeks.length === 0) {
            generateOutline();
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setIsSubmitting(true);

        try {
            await saveProgram(user.uid, traineeId, {
                title: title.trim(),
                description: description.trim(),
                level,
                durationWeeks: weeks.length,
                weeks: weeks
            });
            Alert.alert("Program Assigned!", `${title} has been assigned to ${traineeName}.`, [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error("Failed to assign program:", error);
            Alert.alert("Error", "Could not assign program.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenShell
            title="Build Program"
            subtitle={`Designing architecture for ${traineeName}`}
            leftActionIcon="arrow-back"
            onLeftAction={() => navigation.goBack()}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Program Details</Text>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PROGRAM TITLE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 8-Week Summer Shred"
                            placeholderTextColor="#666"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>DESCRIPTION</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                            placeholder="Brief overview of the program focus..."
                            placeholderTextColor="#666"
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EXPERIENCE LEVEL</Text>
                        <View style={styles.row}>
                            {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map(l => (
                                <Pressable 
                                    key={l} 
                                    style={[styles.pill, level === l && styles.pillActive]} 
                                    onPress={() => setLevel(l)}
                                >
                                    <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Architecture</Text>
                    
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>DURATION (WEEKS)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="4"
                                placeholderTextColor="#666"
                                keyboardType="number-pad"
                                value={durationWeeks}
                                onChangeText={setDurationWeeks}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>SESSIONS PER WEEK</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="3"
                                placeholderTextColor="#666"
                                keyboardType="number-pad"
                                value={sessionsPerWeek}
                                onChangeText={setSessionsPerWeek}
                            />
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color={colors.primary} />
                        <Text style={styles.infoText}>
                            Generate a scaffolded outline, then rename sessions or duplicate weeks before assigning.
                        </Text>
                    </View>

                    <Pressable style={styles.outlineBtn} onPress={generateOutline}>
                        <Ionicons name="layers-outline" size={18} color={colors.primaryText} />
                        <Text style={styles.outlineBtnText}>GENERATE OUTLINE</Text>
                    </Pressable>
                </View>

                {outlineReady && weeks.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Program Outline</Text>
                        <Text style={styles.sectionSub}>Rename sessions and duplicate weeks fast.</Text>

                        {weeks.map((week) => (
                            <View key={week.id} style={styles.weekCard}>
                                <View style={styles.weekHeader}>
                                    <TextInput
                                        style={styles.weekTitleInput}
                                        value={week.title}
                                        onChangeText={(v) => updateWeekTitle(week.id, v)}
                                    />
                                    <Pressable style={styles.weekAction} onPress={() => duplicateWeek(week.id)}>
                                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                                        <Text style={styles.weekActionText}>Duplicate</Text>
                                    </Pressable>
                                </View>

                                {week.sessions.map((session) => (
                                    <View key={session.id} style={styles.sessionRow}>
                                        <TextInput
                                            style={styles.sessionInput}
                                            value={session.title}
                                            onChangeText={(v) => updateSessionTitle(week.id, session.id, v)}
                                        />
                                        <Pressable
                                            style={styles.sessionRemove}
                                            onPress={() => removeSessionFromWeek(week.id, session.id)}
                                            disabled={week.sessions.length <= 1}
                                        >
                                            <Ionicons name="close" size={16} color={week.sessions.length <= 1 ? "#444" : "#ff4444"} />
                                        </Pressable>
                                    </View>
                                ))}

                                <Pressable style={styles.addSessionBtn} onPress={() => addSessionToWeek(week.id)}>
                                    <Ionicons name="add" size={16} color={colors.primary} />
                                    <Text style={styles.addSessionText}>Add Session</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                <Pressable
                    style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleAssignProgram}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.submitText}>{outlineReady ? "Assign Program" : "Generate Outline"}</Text>
                    )}
                </Pressable>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    scroll: {
        paddingBottom: 40,
        gap: 20,
    },
    card: {
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 20,
    },
    sectionTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        color: "#8c8c8c",
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    input: {
        backgroundColor: "#1c1c1e",
        borderWidth: 1,
        borderColor: "#2c2c2e",
        borderRadius: 12,
        padding: 16,
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
    pill: {
        flex: 1,
        backgroundColor: "#1c1c1e",
        borderWidth: 1,
        borderColor: "#2c2c2e",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    pillActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pillText: {
        color: "#8c8c8c",
        fontSize: 11,
        fontWeight: "800",
    },
    pillTextActive: {
        color: "#000",
    },
    infoBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 204, 0, 0.1)",
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    infoText: {
        flex: 1,
        color: "#fbbf24",
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "500",
    },
    outlineBtn: {
        marginTop: 12,
        backgroundColor: colors.primary,
        borderRadius: 14,
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    outlineBtnText: {
        color: "#000",
        fontWeight: "900",
        fontSize: 12,
        letterSpacing: 1,
    },
    sectionSub: {
        color: "#8c8c8c",
        fontSize: 12,
        fontWeight: "600",
        marginTop: -8,
        marginBottom: 8,
    },
    weekCard: {
        backgroundColor: "#1c1c1e",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 12,
    },
    weekHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    weekTitleInput: {
        flex: 1,
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
        backgroundColor: "#161616",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    weekAction: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: "#161616",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    weekActionText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: "800",
    },
    sessionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sessionInput: {
        flex: 1,
        backgroundColor: "#161616",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    sessionRemove: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#161616",
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    addSessionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        borderStyle: "dashed",
    },
    addSessionText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: "800",
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
    },
    submitText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "800",
    },
});
