/**
 * useProgressCharts — Computes all chart data for the Progress screen.
 * Extracts ~150 lines of useMemo chart logic from ProgressScreen.
 *
 * Returns pre-computed chart data for: weight trend, volume progression,
 * muscle distribution, and PR strength tracking.
 */
import { useMemo } from "react";
import { colors } from "../theme/colors";
import { EXERCISE_LIBRARY, t as tEx } from "../constants/exercises";
import type { WorkoutLog } from "../services/workoutService";
import type { BodyMetric } from "../services/profileService";
import type { Meal } from "../services/nutritionService";
import type { UserProfile } from "../services/profileService";
import { getCutoffDate, toSafeDate, type ChartFilter } from "../utils/chartFilters";

type ChartDataPoint = {
  value: number;
  label: string;
  dataPointText?: string;
  dataPointColor?: string;
  dataPointRadius?: number;
  textColor?: string;
  textFontSize?: number;
  textShiftY?: number;
  frontColor?: string;
  labelTextStyle?: any;
};

type ChartDataSet = {
  data: ChartDataPoint[];
  yAxisOffset?: number;
};

export function useProgressCharts(
  workouts: WorkoutLog[],
  metrics: BodyMetric[],
  meals: Meal[],
  userProfile: UserProfile | null,
  chartFilter: ChartFilter,
  selectedPrId: string,
) {
  const weightChartData = useMemo((): ChartDataSet => {
    if (!metrics.length) return { data: [], yAxisOffset: 0 };
    const cutoff = getCutoffDate(chartFilter);

    const filtered = [...metrics]
      .filter((m) => toSafeDate(m.createdAt ?? m.date) >= cutoff)
      .reverse();
    if (filtered.length === 0) return { data: [], yAxisOffset: 0 };

    const weights = filtered.map((m) => m.weight);
    const minW = Math.min(...weights);

    return {
      yAxisOffset: Math.floor(minW - 2),
      data: filtered.map((m) => ({
        value: m.weight,
        label: new Date(m.date).toLocaleDateString([], { month: "numeric", day: "numeric" }),
        dataPointText: m.weight.toFixed(1),
        dataPointColor: colors.primary,
        dataPointRadius: 5,
        textColor: "#aaa",
        textFontSize: 10,
        textShiftY: -14,
      })),
    };
  }, [metrics, chartFilter]);

  const volumeChartData = useMemo((): ChartDataSet => {
    if (!workouts.length) return { data: [] };
    const cutoff = getCutoffDate(chartFilter);

    const filtered = [...workouts]
      .filter((w) => w.createdAt && toSafeDate(w.createdAt) >= cutoff)
      .sort((a, b) => toSafeDate(a.createdAt).getTime() - toSafeDate(b.createdAt).getTime());
    if (filtered.length === 0) return { data: [] };

    return {
      data: filtered.map((w) => ({
        value: w.totalVolume || 0,
        label: toSafeDate(w.createdAt).toLocaleDateString([], { month: "numeric", day: "numeric" }),
        dataPointText: (w.totalVolume || 0).toString(),
        dataPointColor: "#f87171",
        dataPointRadius: 5,
        textColor: "#aaa",
        textFontSize: 10,
        textShiftY: -14,
      })),
    };
  }, [workouts, chartFilter]);

  const muscleDistributionData = useMemo(() => {
    const counts: Record<string, number> = {
      Chest: 0, Back: 0, Legs: 0, Shoulders: 0, Arms: 0, Core: 0, Cardio: 0,
    };

    workouts.forEach((w) => {
      w.exercises.forEach((ex) => {
        const libEx = EXERCISE_LIBRARY.find(
          (l) => tEx(l.name).toLowerCase() === ex.name.toLowerCase(),
        );
        if (libEx) {
          counts[libEx.muscleGroup] = (counts[libEx.muscleGroup] || 0) + 1;
        }
      });
    });

    return Object.entries(counts)
      .filter(([_, val]) => val > 0 || true)
      .map(([name, value]) => ({
        value,
        label: name.substring(0, 3).toUpperCase(),
        frontColor:
          name === "Chest" ? "#f87171"
          : name === "Back" ? "#60a5fa"
          : name === "Legs" ? "#4ade80"
          : "#ffcc00",
        labelTextStyle: { color: "#555", fontSize: 10, fontWeight: "bold" } as const,
      }));
  }, [workouts]);

  const prChartData = useMemo((): ChartDataSet => {
    const targetName = EXERCISE_LIBRARY.find((ex) => ex.id === selectedPrId)?.name.en.toLowerCase();
    if (!targetName) return { data: [], yAxisOffset: 0 };

    const prPoints: { value: number; label: string; date: number }[] = [];

    workouts.forEach((w) => {
      w.exercises.forEach((ex) => {
        if (ex.name.toLowerCase() === targetName) {
          const max1RM = ex.sets.reduce((max, set) => {
            if (!set.isCompleted || !set.weight || !set.reps) return max;
            const est1RM = set.weight / (1.0278 - 0.0278 * set.reps);
            return Math.max(max, est1RM);
          }, 0);

          if (max1RM > 0) {
            const d = toSafeDate(w.createdAt);
            prPoints.push({
              value: Math.round(max1RM),
              label: d.toLocaleDateString([], { month: "numeric", day: "numeric" }),
              date: d.getTime(),
            });
          }
        }
      });
    });

    const sorted = prPoints.sort((a, b) => a.date - b.date);
    const weights = sorted.map((p) => p.value);
    const minW = Math.min(...weights);

    return {
      yAxisOffset: Math.max(0, Math.floor(minW - 10)),
      data: sorted.map((p) => ({
        value: p.value,
        label: p.label,
        dataPointText: `${p.value}kg`,
        dataPointColor: "#a855f7",
        dataPointRadius: 5,
        textColor: "#aaa",
        textFontSize: 10,
        textShiftY: -14,
      })),
    };
  }, [workouts, selectedPrId]);

  const calculateBMI = useMemo(() => {
    if (!metrics[0]?.weight || !userProfile?.height) return "--";
    const heightInM = userProfile.height / 100;
    return (metrics[0].weight / (heightInM * heightInM)).toFixed(1);
  }, [metrics, userProfile]);

  const weeklyConsistency = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return workouts.filter((w) => {
      if (!w.createdAt) return false;
      const d = toSafeDate(w.createdAt);
      return d >= startOfWeek;
    }).length;
  }, [workouts]);

  const totalVolumeLifted = useMemo(() => {
    return workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  }, [workouts]);

  const macroAdherence = useMemo(() => {
    const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const targetCals = userProfile?.macroTargets?.calories || 2000;
    if (totalCals === 0) return 0;
    return Math.min(Math.round((totalCals / targetCals) * 100), 100);
  }, [meals, userProfile]);

  return {
    weightChartData,
    volumeChartData,
    muscleDistributionData,
    prChartData,
    calculateBMI,
    weeklyConsistency,
    totalVolumeLifted,
    macroAdherence,
  };
}
