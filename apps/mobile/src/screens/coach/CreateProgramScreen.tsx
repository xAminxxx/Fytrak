import React, { useState } from "react";
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

    const handleAssignProgram = async () => {
        if (!title.trim() || !durationWeeks || !sessionsPerWeek) {
            Alert.alert("Missing Fields", "Please provide a title, duration, and sessions per week.");
            return;
        }

        const weeksNum = parseInt(durationWeeks);
        const sessionsNum = parseInt(sessionsPerWeek);

        if (isNaN(weeksNum) || weeksNum < 1 || weeksNum > 16) {
            Alert.alert("Invalid Input", "Duration must be between 1 and 16 weeks.");
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setIsSubmitting(true);

        // Generate the hierarchical skeleton
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
                    isCompleted: false
                });
            }
            generatedWeeks.push({
                id: `week-${w}`,
                weekNumber: w,
                title: `Week ${w}`,
                sessions
            });
        }

        try {
            await saveProgram(user.uid, traineeId, {
                title: title.trim(),
                description: description.trim(),
                level,
                durationWeeks: weeksNum,
                weeks: generatedWeeks
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
                            Fytrak will automatically generate {parseInt(durationWeeks) || 0} weeks with {parseInt(sessionsPerWeek) || 0} empty sessions per week. You can fill them with exercises later.
                        </Text>
                    </View>
                </View>

                <Pressable
                    style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleAssignProgram}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Generate & Assign Program</Text>}
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
