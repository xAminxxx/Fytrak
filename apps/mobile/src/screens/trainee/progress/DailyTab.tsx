import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Image, Modal, Pressable } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/tokens";
import { Typography } from "../../../components/Typography";
import { DailyNutritionReport } from "../../../features/progress/components/DailyNutritionReport";
import { DailyTrainingReport } from "../../../features/progress/components/DailyTrainingReport";
import { DailyBiomarkersReport } from "../../../features/progress/components/DailyBiomarkersReport";
import { DailyVisualReport } from "../../../features/progress/components/DailyVisualReport";
import { useWorkouts } from "../../../hooks/useWorkouts";
import { useBodyMetrics } from "../../../hooks/useBodyMetrics";
import { useDailyNutrition } from "../../../hooks/useDailyNutrition";
import { useUserProfile } from "../../../hooks/useUserProfile";
import { useDailyWater } from "../../../hooks/useDailyWater";
import { useProgressPhotos } from "../../../hooks/useProgressPhotos";
import { toSafeDate } from "../../../utils/chartFilters";

export function DailyTab() {
  const workouts = useWorkouts();
  const { metrics } = useBodyMetrics();
  const meals = useDailyNutrition();
  const { profile: userProfile } = useUserProfile();
  const waterMl = useDailyWater();
  const { photos } = useProgressPhotos();

  const todayStr = new Date().toDateString();
  const todayKey = new Date().toISOString().split('T')[0];

  const todayWorkout = useMemo(() => {
    return workouts.find(w => w.createdAt && toSafeDate(w.createdAt).toDateString() === todayStr);
  }, [workouts, todayStr]);

  const todayPhoto = useMemo(() => {
    return photos.find(p => p.date === todayKey);
  }, [photos, todayKey]);

  const todayMetric = useMemo(() => {
    return metrics.find(m => m.date === new Date().toISOString().split('T')[0] || (m.createdAt && toSafeDate(m.createdAt).toDateString() === todayStr));
  }, [metrics, todayStr]);

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

  const targets = userProfile?.macroTargets || { calories: 2100, protein: 160, carbs: 220, fats: 65 };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Typography variant="h2">Daily Report</Typography>
        <Typography variant="bodySmall" color="#666">Today, {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Typography>
      </View>

      <DailyNutritionReport 
        meals={meals} 
        targets={targets} 
        totals={totals} 
        waterMl={waterMl} 
      />

      <DailyTrainingReport workout={todayWorkout} />

      <DailyBiomarkersReport 
        todayMetric={todayMetric} 
        todayWorkout={todayWorkout} 
      />

      <DailyVisualReport todayPhoto={todayPhoto} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.sm,
    paddingTop: 0,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 24,
  },
  mainStats: {
    flex: 1,
    gap: 4,
  },
  waterMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macrosRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  mealList: {
    borderTopWidth: 1,
    borderTopColor: "#1c1c1e",
    paddingTop: 16,
    gap: 12,
  },
  listLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mealThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
  },
  mealName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  mealTime: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
  },
  mealCals: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: "#333",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 10,
  },
  emptyCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1c1c1e",
    borderStyle: "dashed",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseList: {
    gap: 10,
  },
  exItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1e",
  },
  exName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  exSets: {
    color: "#666",
    fontSize: 12,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  todayPhoto: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    backgroundColor: "#0a0a0a",
  },
  photoMeta: {
    marginTop: 12,
    alignItems: "center",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    borderRadius: 22,
    zIndex: 100,
  },
  viewerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "85%",
  },
});
