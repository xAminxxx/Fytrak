import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { saveProgram, ProgramWeek, ProgramSession } from "../../services/userSession";
import { useRoute, useNavigation } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { Typography } from "../../components/Typography";

const { width } = Dimensions.get("window");

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
                    title: `Session ${s}`,
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
                    title: `Session ${nextNumber}`,
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
            Alert.alert("Success", "Program architecture assigned!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not assign program.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenShell
            title="ARCHITECT"
            subtitle={`MULTI-WEEK PLAN FOR ${traineeName?.toUpperCase()}`}
            contentStyle={styles.shellContent}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    
                    {/* CORE BLUEPRINT */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="map" size={18} color={colors.primary} />
                            <Typography variant="h2">Core Blueprint</Typography>
                        </View>
                        <View style={styles.inputGroup}>
                            <Typography variant="label" color="#8c8c8c" style={{ fontSize: 9 }}>PROGRAM NAME</Typography>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. 8-Week Hypertrophy Masterclass"
                                placeholderTextColor="#444"
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Typography variant="label" color="#8c8c8c" style={{ fontSize: 9 }}>STRATEGIC OBJECTIVES</Typography>
                            <TextInput
                                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                placeholder="Detail the periodization and goals..."
                                placeholderTextColor="#444"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    {/* PARAMETERS */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="options" size={18} color={colors.primary} />
                            <Typography variant="h2">Architecture Parameters</Typography>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.flex1}>
                                <Typography variant="label" color="#8c8c8c" style={{ fontSize: 8, textAlign: 'center' }}>WEEKS</Typography>
                                <TextInput style={styles.miniInput} keyboardType="numeric" value={durationWeeks} onChangeText={setDurationWeeks} />
                            </View>
                            <View style={styles.flex1}>
                                <Typography variant="label" color="#8c8c8c" style={{ fontSize: 8, textAlign: 'center' }}>SESSIONS/WK</Typography>
                                <TextInput style={styles.miniInput} keyboardType="numeric" value={sessionsPerWeek} onChangeText={setSessionsPerWeek} />
                            </View>
                        </View>
                        
                        <View style={styles.levelRow}>
                            {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map(l => (
                                <Pressable key={l} style={[styles.levelPill, level === l && styles.levelPillActive]} onPress={() => setLevel(l)}>
                                    <Text style={[styles.levelText, level === l && styles.levelTextActive]}>{l[0]}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable style={styles.generateBtn} onPress={generateOutline}>
                            <Ionicons name="flash" size={16} color="#000" />
                            <Typography style={{ color: "#000", fontWeight: '900', fontSize: 13 }}>GENERATE SCAFFOLD</Typography>
                        </Pressable>
                    </View>

                    {/* SCAFFOLDING */}
                    {outlineReady && (
                        <View style={styles.list}>
                            <Typography variant="label" color="#444" style={{ marginLeft: 4 }}>PROGRAM SCAFFOLDING</Typography>
                            {weeks.map((week) => (
                                <View key={week.id} style={styles.weekCard}>
                                    <View style={styles.weekHeader}>
                                        <TextInput style={styles.weekTitleInput} value={week.title} onChangeText={(v) => updateWeekTitle(week.id, v)} />
                                        <Pressable style={styles.weekAction} onPress={() => duplicateWeek(week.id)}>
                                            <Ionicons name="copy-outline" size={16} color={colors.primary} />
                                        </Pressable>
                                    </View>
                                    <View style={styles.sessionList}>
                                        {week.sessions.map((session) => (
                                            <View key={session.id} style={styles.sessionRow}>
                                                <TextInput style={styles.sessionInput} value={session.title} onChangeText={(v) => updateSessionTitle(week.id, session.id, v)} />
                                                <Pressable onPress={() => removeSessionFromWeek(week.id, session.id)} disabled={week.sessions.length <= 1}>
                                                    <Ionicons name="close-circle" size={20} color={week.sessions.length <= 1 ? "#1c1c1e" : "#f87171"} />
                                                </Pressable>
                                            </View>
                                        ))}
                                        <Pressable style={styles.addSessionBtn} onPress={() => addSessionToWeek(week.id)}>
                                            <Ionicons name="add" size={16} color={colors.primary} />
                                            <Typography variant="label" color={colors.primary}>ADD SESSION</Typography>
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* FOOTER */}
                    <View style={styles.footer}>
                        <Pressable
                            style={[styles.primaryAction, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleAssignProgram}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="#000" /> : (
                                <Typography style={{ color: "#000", fontWeight: '900', fontSize: 14 }}>FINALIZE & ASSIGN</Typography>
                            )}
                        </Pressable>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: { paddingBottom: 0 },
    scroll: { paddingBottom: 100, gap: 16, marginTop: 10 },
    
    card: { backgroundColor: "#161616", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#333", gap: 16 },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },

    inputGroup: { gap: 8 },
    textInput: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, color: '#fff', fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: '#1c1c1e' },

    row: { flexDirection: 'row', gap: 12 },
    flex1: { flex: 1, gap: 4 },
    miniInput: { backgroundColor: '#0a0a0a', borderRadius: 12, paddingVertical: 12, textAlign: 'center', color: colors.primary, fontSize: 18, fontWeight: '900', borderWidth: 1, borderColor: '#1c1c1e' },

    levelRow: { flexDirection: 'row', gap: 8 },
    levelPill: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center' },
    levelPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    levelText: { color: '#666', fontSize: 10, fontWeight: '900' },
    levelTextActive: { color: '#000' },

    generateBtn: { backgroundColor: colors.primary, height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },

    list: { gap: 12 },
    weekCard: { backgroundColor: "#161616", borderRadius: 24, padding: 18, borderWidth: 1, borderColor: "#333", gap: 14 },
    weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#1c1c1e', paddingBottom: 10 },
    weekTitleInput: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800' },
    weekAction: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1c1c1e' },

    sessionList: { gap: 8 },
    sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0a0a0a', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#1c1c1e' },
    sessionInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
    addSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderStyle: 'dashed', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12 },

    footer: { marginTop: 8 },
    primaryAction: { backgroundColor: colors.primary, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
