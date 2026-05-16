import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Image, Modal, Pressable, TextInput } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { spacing, radius } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { useTraineeDetailData } from "../../hooks/useTraineeDetailData";
import { VisualCheckInCard } from "../../features/coaching/components/VisualCheckInCard";
import { NutritionIntelligenceCard } from "../../features/coaching/components/NutritionIntelligenceCard";
import { TrainingIntelligenceCard } from "../../features/coaching/components/TrainingIntelligenceCard";
import { BioMarkersCard } from "../../features/coaching/components/BioMarkersCard";
import { Typography } from "../../components/Typography";
import { ToastService } from "../../components/Toast";
import { toSafeDate } from "../../utils/chartFilters";
import {
    createCheckInTask,
    saveCoachNote,
    subscribeToCoachNotes,
    subscribeToOpenCheckInTasks,
    updateCheckInTaskStatus,
    type CheckInTask,
    type CoachNote,
} from "../../services/userSession";

export function TraineeDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { traineeId, traineeName } = route.params;

    const {
        meals,
        workouts,
        metrics,
        photos,
        traineeProfile,
        isLoading,
        stats
    } = useTraineeDetailData(traineeId);

    const [viewerPhoto, setViewerPhoto] = useState<string | null>(null);
    const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
    const [checkInTasks, setCheckInTasks] = useState<CheckInTask[]>([]);
    const [noteDraft, setNoteDraft] = useState("");
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isSavingTask, setIsSavingTask] = useState(false);

    useEffect(() => {
        if (!traineeId) return;
        const unsubNotes = subscribeToCoachNotes(traineeId, setCoachNotes);
        const unsubTasks = subscribeToOpenCheckInTasks(traineeId, setCheckInTasks);

        return () => {
            unsubNotes();
            unsubTasks();
        };
    }, [traineeId]);

    const todayStr = new Date().toDateString();
    const todayKey = new Date().toISOString().split('T')[0];

    const todayWorkout = useMemo(() => {
        return workouts.find(w => w.createdAt && toSafeDate(w.createdAt).toDateString() === todayStr);
    }, [workouts, todayStr]);

    const todayPhoto = useMemo(() => {
        return photos.find(p => p.date === todayKey);
    }, [photos, todayKey]);

    const todayMetric = useMemo(() => {
        return metrics.find(m => m.date === todayKey || (m.createdAt && toSafeDate(m.createdAt).toDateString() === todayStr));
    }, [metrics, todayStr, todayKey]);

    const totals = useMemo(() => {
        return meals.reduce(
            (acc, meal) => ({
                calories: acc.calories + (meal.calories || 0),
                protein: acc.protein + (meal.protein || 0),
                carbs: acc.carbs + (meal.carbs || 0),
                fats: acc.fats + (meal.fats || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
    }, [meals]);

    const targets = traineeProfile?.macroTargets || { calories: 2100, protein: 160, carbs: 220, fats: 65 };

    const formatTimestamp = (value?: unknown) => {
        if (!value) return "";
        const date = toSafeDate(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const formatDueDate = (value?: string | null) => {
        if (!value) return "";
        const date = toSafeDate(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const timelineItems = useMemo(() => {
        const items = [
            ...coachNotes.map((note) => ({
                id: `note-${note.id}`,
                type: "note" as const,
                title: note.text,
                subtitle: "Coach note",
                createdAt: note.createdAt ?? note.updatedAt,
            })),
            ...checkInTasks.map((task) => ({
                id: `task-${task.id}`,
                type: "task" as const,
                title: task.title,
                subtitle: task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : "Check-in task",
                createdAt: task.createdAt ?? task.updatedAt,
            })),
        ];

        return items
            .filter((item) => !!item.createdAt)
            .sort((a, b) => toSafeDate(b.createdAt).getTime() - toSafeDate(a.createdAt).getTime())
            .slice(0, 8);
    }, [coachNotes, checkInTasks]);

    const handleSaveNote = async () => {
        if (!noteDraft.trim()) {
            ToastService.info("Missing note", "Add a quick update before saving.");
            return;
        }
        try {
            setIsSavingNote(true);
            await saveCoachNote({ traineeId, text: noteDraft });
            setNoteDraft("");
            ToastService.success("Note saved", "Coach note added.");
        } catch (error) {
            console.error("Failed to save note:", error);
            ToastService.error("Save failed", "Could not save the coach note.");
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleCreateTask = async () => {
        if (!taskTitle.trim()) {
            ToastService.info("Missing title", "Name the task before creating it.");
            return;
        }
        try {
            setIsSavingTask(true);
            await createCheckInTask({
                traineeId,
                title: taskTitle,
                description: taskDescription,
                dueDate: taskDueDate.trim() || undefined,
            });
            setTaskTitle("");
            setTaskDescription("");
            setTaskDueDate("");
            ToastService.success("Task created", "Check-in task assigned.");
        } catch (error) {
            console.error("Failed to create task:", error);
            ToastService.error("Create failed", "Could not create the check-in task.");
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleTaskUpdate = async (taskId: string, status: "completed" | "dismissed") => {
        try {
            await updateCheckInTaskStatus(traineeId, taskId, status);
            ToastService.success(
                status === "completed" ? "Task completed" : "Task dismissed",
                status === "completed" ? "Marked as done." : "Task removed from open list."
            );
        } catch (error) {
            console.error("Failed to update task:", error);
            ToastService.error("Update failed", "Could not update the task status.");
        }
    };

    return (
        <ScreenShell
            title={traineeName?.toUpperCase() || "TRAINEE"}
            subtitle="INTELLIGENCE REPORT"
            contentStyle={styles.shellContent}
            rightActionIcon="chatbubbles-outline"
            onRightAction={() => navigation.navigate("CoachChat", { traineeId, traineeName, coachId: auth.currentUser?.uid || "unknown" })}
        >
            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    
                    {/* ARCHITECT ACTIONS */}
                    <View style={styles.actionRow}>
                        <Pressable 
                            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                            onPress={() => navigation.navigate("PrescribeWorkout", { traineeId, traineeName })}
                        >
                            <Ionicons name="barbell" size={20} color={colors.primaryText} />
                            <Typography style={styles.actionText}>ROUTINE</Typography>
                        </Pressable>
                        <Pressable 
                            style={[styles.primaryAction, { backgroundColor: colors.success }]}
                            onPress={() => navigation.navigate("PrescribeMeal", { traineeId, traineeName })}
                        >
                            <Ionicons name="nutrition" size={20} color={colors.primaryText} />
                            <Typography style={styles.actionText}>NUTRITION</Typography>
                        </Pressable>
                        <Pressable 
                            style={[styles.primaryAction, { backgroundColor: colors.danger }]}
                            onPress={() => navigation.navigate("CreateProgram" as any, { traineeId, traineeName })}
                        >
                            <Ionicons name="calendar" size={20} color={colors.primaryText} />
                            <Typography style={styles.actionText}>PROGRAM</Typography>
                        </Pressable>
                    </View>

                    <NutritionIntelligenceCard meals={meals} targets={targets} totals={totals} />
                    <TrainingIntelligenceCard workout={todayWorkout} />
                    <BioMarkersCard weight={todayMetric?.weight || stats.latestWeight} bodyFat={todayMetric?.bodyFat} />
                    <VisualCheckInCard todayPhoto={todayPhoto} onViewPhoto={setViewerPhoto} />

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="clipboard" size={16} color={colors.primary} />
                            <Typography variant="label" color={colors.primary} style={styles.sectionTitle}>ACCOUNTABILITY</Typography>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Typography variant="h2">Check-in tasks</Typography>
                                <View style={styles.countPill}>
                                    <Typography style={styles.countText}>{checkInTasks.length} OPEN</Typography>
                                </View>
                            </View>
                            {checkInTasks.length === 0 ? (
                                <Typography variant="label" color={colors.textDim}>No open tasks yet.</Typography>
                            ) : (
                                <View style={styles.taskList}>
                                    {checkInTasks.map((task) => {
                                        const dueLabel = formatDueDate(task.dueDate);
                                        return (
                                            <View key={task.id} style={styles.taskItem}>
                                                <View style={styles.taskInfo}>
                                                    <Typography variant="h2" style={styles.taskTitle}>{task.title}</Typography>
                                                    {!!task.description && (
                                                        <Typography variant="label" color={colors.textFaint} style={styles.taskDesc}>{task.description}</Typography>
                                                    )}
                                                    {!!dueLabel && (
                                                        <Typography variant="label" color={colors.warning} style={styles.taskDue}>Due {dueLabel}</Typography>
                                                    )}
                                                </View>
                                                <View style={styles.taskActions}>
                                                    <Pressable
                                                        style={[styles.taskActionBtn, styles.taskActionComplete]}
                                                        onPress={() => handleTaskUpdate(task.id, "completed")}
                                                    >
                                                        <Ionicons name="checkmark" size={16} color={colors.primaryText} />
                                                    </Pressable>
                                                    <Pressable
                                                        style={[styles.taskActionBtn, styles.taskActionDismiss]}
                                                        onPress={() => handleTaskUpdate(task.id, "dismissed")}
                                                    >
                                                        <Ionicons name="close" size={16} color={colors.textSecondary} />
                                                    </Pressable>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            <View style={styles.divider} />

                            <Typography variant="label" color={colors.textFaint}>Create new task</Typography>
                            <TextInput
                                placeholder="Task title"
                                placeholderTextColor={colors.textDim}
                                style={styles.input}
                                value={taskTitle}
                                onChangeText={setTaskTitle}
                            />
                            <TextInput
                                placeholder="Description (optional)"
                                placeholderTextColor={colors.textDim}
                                style={[styles.input, styles.inputMultiline]}
                                value={taskDescription}
                                onChangeText={setTaskDescription}
                                multiline
                            />
                            <TextInput
                                placeholder="Due date (YYYY-MM-DD)"
                                placeholderTextColor={colors.textDim}
                                style={styles.input}
                                value={taskDueDate}
                                onChangeText={setTaskDueDate}
                            />
                            <Pressable
                                style={[styles.primaryButton, !taskTitle.trim() && styles.primaryButtonDisabled]}
                                onPress={handleCreateTask}
                                disabled={isSavingTask || !taskTitle.trim()}
                            >
                                <Typography style={styles.primaryButtonText}>{isSavingTask ? "SAVING..." : "CREATE TASK"}</Typography>
                                <Ionicons name="add" size={16} color={colors.primaryText} />
                            </Pressable>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Typography variant="h2">Coach notes</Typography>
                                <Typography variant="label" color={colors.textFaint}>PRIVATE</Typography>
                            </View>
                            <TextInput
                                placeholder="Add a note about progress, obstacles, or wins"
                                placeholderTextColor={colors.textDim}
                                style={[styles.input, styles.inputMultiline]}
                                value={noteDraft}
                                onChangeText={setNoteDraft}
                                multiline
                            />
                            <Pressable
                                style={[styles.primaryButton, !noteDraft.trim() && styles.primaryButtonDisabled]}
                                onPress={handleSaveNote}
                                disabled={isSavingNote || !noteDraft.trim()}
                            >
                                <Typography style={styles.primaryButtonText}>{isSavingNote ? "SAVING..." : "SAVE NOTE"}</Typography>
                                <Ionicons name="document-text" size={16} color={colors.primaryText} />
                            </Pressable>

                            {coachNotes.length === 0 ? (
                                <Typography variant="label" color={colors.textDim}>No coach notes yet.</Typography>
                            ) : (
                                <View style={styles.noteList}>
                                    {coachNotes.slice(0, 4).map((note) => (
                                        <View key={note.id} style={styles.noteItem}>
                                            <View style={styles.noteDot} />
                                            <View style={styles.noteBody}>
                                                <Typography variant="body" style={styles.noteText}>{note.text}</Typography>
                                                <Typography variant="label" color={colors.textFaint} style={styles.noteMeta}>{formatTimestamp(note.createdAt)}</Typography>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Typography variant="h2">Accountability timeline</Typography>
                            </View>
                            {timelineItems.length === 0 ? (
                                <Typography variant="label" color={colors.textDim}>No timeline items yet.</Typography>
                            ) : (
                                <View style={styles.timelineList}>
                                    {timelineItems.map((item) => (
                                        <View key={item.id} style={styles.timelineItem}>
                                            <View style={[styles.timelineDot, item.type === "task" ? styles.timelineDotTask : styles.timelineDotNote]} />
                                            <View style={styles.timelineBody}>
                                                <Typography variant="h2" style={styles.timelineTitle}>{item.title}</Typography>
                                                <Typography variant="label" color={colors.textFaint} style={styles.timelineSubtitle}>{item.subtitle}</Typography>
                                            </View>
                                            <Typography variant="label" color={colors.textFaint} style={styles.timelineTime}>{formatTimestamp(item.createdAt)}</Typography>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                </ScrollView>
            )}

            <Modal visible={!!viewerPhoto} transparent={true} animationType="fade" onRequestClose={() => setViewerPhoto(null)}>
                <View style={styles.viewerOverlay}>
                    <Pressable style={styles.viewerClose} onPress={() => setViewerPhoto(null)}>
                        <Ionicons name="close" size={32} color="#fff" />
                    </Pressable>
                    {viewerPhoto && <Image source={{ uri: viewerPhoto }} style={styles.viewerImage} resizeMode="contain" />}
                </View>
            </Modal>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    shellContent: { paddingBottom: 0 },
    scroll: { paddingBottom: 100, gap: 24, marginTop: 10 },
    loader: { paddingTop: 40, alignItems: "center" },

    actionRow: { flexDirection: 'row', gap: 10 },
    primaryAction: { flex: 1, height: 50, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    actionText: { color: colors.primaryText, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

    section: { gap: spacing.lg },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 4 },
    sectionTitle: { letterSpacing: 1.4 },

    card: { backgroundColor: colors.surfaceMuted, borderRadius: radius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.borderStrong, gap: spacing.md },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    countPill: { marginLeft: "auto", backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    countText: { color: colors.primary, fontSize: 10, fontWeight: "900" },
    divider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: spacing.md },

    input: { backgroundColor: colors.bgDark, borderRadius: radius.md, padding: spacing.md, color: colors.text, borderWidth: 1, borderColor: colors.borderSubtle, fontSize: 13, fontWeight: "600" },
    inputMultiline: { minHeight: 90, textAlignVertical: "top" },
    primaryButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: colors.primaryText, fontWeight: "900", fontSize: 12, letterSpacing: 0.6 },

    taskList: { gap: spacing.md },
    taskItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.bgDark, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle },
    taskInfo: { flex: 1, gap: 4 },
    taskTitle: { fontSize: 14 },
    taskDesc: { fontSize: 9, letterSpacing: 0.6 },
    taskDue: { fontSize: 9, letterSpacing: 0.6 },
    taskActions: { flexDirection: "row", gap: 8 },
    taskActionBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    taskActionComplete: { backgroundColor: colors.primary, borderColor: colors.primary },
    taskActionDismiss: { backgroundColor: "transparent", borderColor: colors.borderStrong },

    noteList: { gap: spacing.md },
    noteItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    noteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
    noteBody: { flex: 1, gap: 4 },
    noteText: { fontSize: 13 },
    noteMeta: { fontSize: 9, letterSpacing: 0.6 },

    timelineList: { gap: spacing.md },
    timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
    timelineDotTask: { backgroundColor: colors.primary },
    timelineDotNote: { backgroundColor: colors.info },
    timelineBody: { flex: 1, gap: 4 },
    timelineTitle: { fontSize: 13 },
    timelineSubtitle: { fontSize: 9, letterSpacing: 0.6 },
    timelineTime: { fontSize: 9, letterSpacing: 0.6 },

    viewerOverlay: { flex: 1, backgroundColor: colors.overlayHeavy, justifyContent: 'center', alignItems: 'center' },
    viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    viewerImage: { width: '100%', height: '90%' },
});
