import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Image, Modal, Pressable } from "react-native";
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
import { toSafeDate } from "../../utils/chartFilters";

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

    viewerOverlay: { flex: 1, backgroundColor: colors.overlayHeavy, justifyContent: 'center', alignItems: 'center' },
    viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    viewerImage: { width: '100%', height: '90%' },
});
