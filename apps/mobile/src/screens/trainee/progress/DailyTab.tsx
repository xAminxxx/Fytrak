import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Text, Image, Modal, Pressable } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing, radius } from "../../../theme/tokens";
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
        <View style={styles.eyebrowRow}>
          <View style={styles.dot} />
          <Typography variant="label" color={colors.primary} style={styles.eyebrow}>
            DAILY TRACKER
          </Typography>
        </View>
        <Typography variant="h2" style={styles.mainTitle}>
          Today, {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </Typography>
      </View>

      <View style={styles.section}>
        <DailyNutritionReport 
          meals={meals} 
          targets={targets} 
          totals={totals} 
          waterMl={waterMl} 
        />
      </View>

      <View style={styles.section}>
        <DailyTrainingReport workout={todayWorkout} />
      </View>

      <View style={styles.section}>
        <DailyBiomarkersReport 
          todayMetric={todayMetric} 
          todayWorkout={todayWorkout} 
        />
      </View>

      <View style={styles.section}>
        <DailyVisualReport todayPhoto={todayPhoto} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    gap: 4,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  eyebrow: {
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
  },
  section: {
    marginBottom: 20,
  },
  // The following styles are for sub-components (Report components) that might use them
  card: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: radius["2xl"],
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});
