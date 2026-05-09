import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Pressable, Image } from "react-native";
import { ScreenShell } from "../../components/ScreenShell";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { auth } from "../../config/firebase";
import { useTraineeDetailData } from "../../hooks/useTraineeDetailData";
import { toLocalDateKey } from "../../utils/dateKeys";
import { WeightTrendChart, NutritionChart, StatCard, CheckInBadge } from "../../components/coach/TraineeDetailWidgets";

export function TraineeDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { traineeId, traineeName } = route.params;

    const {
        meals,
        workouts,
        metrics,
        historicalMeals,
        photos,
        traineeProfile,
        isLoading,
        stats
    } = useTraineeDetailData(traineeId);

    return (
        <ScreenShell
            title={traineeName || "Trainee"}
            subtitle="Detailed progress and logs review"
            contentStyle={styles.shellContent}
            rightActionIcon="chatbubbles-outline"
            onRightAction={() => navigation.navigate("CoachChat", { traineeId, traineeName, coachId: auth.currentUser?.uid || "unknown" })}
        >
            {isLoading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    {/* QUICK ACTIONS */}
                    <View style={styles.actionRow}>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <Pressable
                                style={[styles.actionCard, { flex: 1 }]}
                                onPress={() => navigation.navigate("PrescribeWorkout", { traineeId, traineeName })}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: "#22251a" }]}>
                                    <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.actionTitle}>Prescribe Routine</Text>
                                    <Text style={styles.actionSub}>Workouts</Text>
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.actionCard, { flex: 1 }]}
                                onPress={() => navigation.navigate("PrescribeMeal", { traineeId, traineeName })}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: "#1a2225" }]}>
                                    <Ionicons name="nutrition-outline" size={24} color="#4ade80" />
                                </View>
                                <View>
                                    <Text style={styles.actionTitle}>Prescribe Plan</Text>
                                    <Text style={styles.actionSub}>Nutrition</Text>
                                </View>
                            </Pressable>
                        </View>

                        <Pressable
                            style={[styles.actionCard, { marginTop: 12 }]}
                            onPress={() => navigation.navigate("CreateProgram" as any, { traineeId, traineeName })}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: "#251a1a" }]}>
                                <Ionicons name="calendar-outline" size={24} color="#f87171" />
                            </View>
                            <View>
                                <Text style={styles.actionTitle}>Build Training Program</Text>
                                <Text style={styles.actionSub}>Assign a scalable multi-week plan</Text>
                            </View>
                        </Pressable>
                    </View>

                    {/* STATS OVERVIEW */}
                    <View style={styles.statsRow}>
                        <StatCard label="Workouts" value={stats.totalWorkouts.toString()} icon="barbell" />
                        <StatCard label="Avg Cals" value={`${stats.avgCals} kcal`} icon="nutrition" />
                        <StatCard label="Current" value={`${stats.latestWeight} kg`} icon="speedometer" />
                    </View>

                    {/* ANALYTICS SECTION */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Advanced Analytics</Text>

                        {/* Weight Trend */}
                        <View style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Ionicons name="trending-down" size={18} color={colors.primary} />
                                <Text style={styles.chartTitle}>Weight Trend (30 Days)</Text>
                            </View>
                            <WeightTrendChart data={metrics} />
                        </View>

                        {/* Nutrition Consistency */}
                        <View style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Ionicons name="pie-chart" size={18} color={colors.primary} />
                                <Text style={styles.chartTitle}>Calorie Adherence (7 Days)</Text>
                            </View>
                            <NutritionChart
                                data={historicalMeals}
                                target={traineeProfile?.macroTargets?.calories || 2100}
                            />
                        </View>
                    </View>

                    {/* TRANSFORMATION PHOTOS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Transformation Photos</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                            {photos.length === 0 ? (
                                <View style={styles.photoPlaceholder}>
                                    <Ionicons name="images-outline" size={32} color="#333" />
                                    <Text style={styles.emptyText}>No photos yet</Text>
                                </View>
                            ) : (
                                photos.map(p => (
                                    <View key={p.id} style={styles.photoContainer}>
                                        <Image source={{ uri: p.url }} style={styles.photoImage} />
                                        <Text style={styles.photoDate}>{new Date(p.date).toLocaleDateString([], { month: "short", day: "numeric" })}</Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>

                    {/* RECENT WORKOUTS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Sessions</Text>
                        {workouts.length === 0 ? (
                            <View style={styles.emptyBox}><Text style={styles.emptyText}>No sessions logged yet.</Text></View>
                        ) : (
                            workouts.slice(0, 3).map((w) => (
                                <View key={w.id} style={styles.logItem}>
                                    <View style={styles.logHeader}>
                                        <Text style={styles.logName}>{w.exercises[0]?.name || "Workout"}</Text>
                                        <Text style={styles.logDate}>{new Date(w.createdAt?.toDate ? w.createdAt.toDate() : Date.now()).toLocaleDateString()}</Text>
                                    </View>
                                    {w.checkIn && (
                                        <View style={styles.checkInBadges}>
                                            <CheckInBadge icon="flash" value={w.checkIn.energy} max={5} color="#fbbf24" />
                                            <CheckInBadge icon="fitness" value={w.checkIn.soreness} max={10} color="#f87171" />
                                            <CheckInBadge icon="happy" value={w.checkIn.mood} max={5} color="#4ade80" />
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </View>

                    {/* RECENT MEALS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Today's Nutrition</Text>
                        {meals.length === 0 ? (
                            <View style={styles.emptyBox}><Text style={styles.emptyText}>No meals logged today.</Text></View>
                        ) : (
                            meals.map((m) => (
                                <View key={m.id} style={styles.mealItem}>
                                    <Text style={styles.mealName}>{m.name}</Text>
                                    <Text style={styles.mealValue}>{m.calories} kcal</Text>
                                </View>
                            ))
                        )}
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
        paddingBottom: 40,
        gap: 20,
    },
    actionRow: {
        marginTop: 10,
    },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161616",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 16,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    actionTitle: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },
    actionSub: {
        color: "#8c8c8c",
        fontSize: 12,
        fontWeight: "600",
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    logItem: {
        backgroundColor: "#161616",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 12,
    },
    logHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    logName: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
    logDate: {
        color: "#666",
        fontSize: 12,
        fontWeight: "600",
    },
    checkInBadges: {
        flexDirection: "row",
        gap: 8,
    },
    photosRow: {
        gap: 12,
        paddingBottom: 4,
    },
    photoPlaceholder: {
        width: 140,
        height: 140,
        backgroundColor: "#1c1c1e",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    photoContainer: {
        gap: 8,
        width: 140,
    },
    photoImage: {
        width: 140,
        height: 140,
        borderRadius: 20,
        backgroundColor: "#1c1c1e",
    },
    photoDate: {
        color: "#666",
        fontSize: 11,
        fontWeight: "700",
        textAlign: "center",
    },
    chartCard: {
        backgroundColor: "#161616",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        gap: 16,
    },
    chartHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    chartTitle: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
    mealItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#161616",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
    },
    mealName: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "600",
    },
    mealValue: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: "800",
    },
    emptyBox: {
        padding: 20,
        backgroundColor: "#161616",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#2c2c2e",
        alignItems: "center",
    },
    emptyText: {
        color: "#444",
        fontSize: 14,
        fontWeight: "600",
    },
});
