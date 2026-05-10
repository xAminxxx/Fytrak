import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Pressable, Dimensions } from "react-native";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/tokens";
import { Typography } from "../../../components/Typography";
import { ConsistencyCalendar } from "../../../components/ConsistencyCalendar";
import { MetricCard } from "../../../components/MetricCard";
import { TrendChart } from "../../../components/TrendChart";
import { ChartFilterBar } from "../../../components/ChartFilterBar";
import { BarChart } from "react-native-gifted-charts";
import { EXERCISE_LIBRARY } from "../../../constants/exercises";
import { useWorkouts } from "../../../hooks/useWorkouts";
import { useBodyMetrics } from "../../../hooks/useBodyMetrics";
import { useUserProfile } from "../../../hooks/useUserProfile";
import { useDailyNutrition } from "../../../hooks/useDailyNutrition";
import { useProgressCharts } from "../../../hooks/useProgressCharts";
import type { ChartFilter } from "../../../utils/chartFilters";

export function InsightsTab() {
  const workouts = useWorkouts();
  const { metrics } = useBodyMetrics();
  const { profile: userProfile } = useUserProfile();
  const meals = useDailyNutrition();

  const [chartFilter, setChartFilter] = useState<ChartFilter>("1M");
  const [selectedPrId, setSelectedPrId] = useState<string>("e1");

  const {
    weightChartData,
    volumeChartData,
    muscleDistributionData,
    prChartData,
    calculateBMI,
    weeklyConsistency,
    totalVolumeLifted,
    macroAdherence,
  } = useProgressCharts(workouts, metrics, meals, userProfile, chartFilter, selectedPrId);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Typography variant="h2">Insights</Typography>
        <Typography variant="bodySmall" color="#666">Your journey in data</Typography>
      </View>

      <View style={{ marginBottom: 20 }}>
        <ConsistencyCalendar workouts={workouts} />
      </View>

      <View style={styles.grid}>
        <MetricCard icon="calendar" label="Weekly Flow" value={weeklyConsistency} unit="Days" color="#60a5fa" />
        <MetricCard icon="flash" label="Daily Fuel" value={macroAdherence} unit="%" color={colors.primary} />
        <MetricCard icon="barbell" label="Total Volume" value={totalVolumeLifted > 1000 ? `${(totalVolumeLifted / 1000).toFixed(1)}k` : totalVolumeLifted} unit="kg" color="#f87171" />
        <MetricCard icon="body" label="BMI Index" value={calculateBMI} unit="" color="#4ade80" />
      </View>

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendTitleRow}>
            <View style={styles.accentBar} />
            <Typography variant="h2" style={{ fontSize: 18 }}>Weight Trend</Typography>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Typography variant="metric" style={{ fontSize: 22 }}>{metrics[0]?.weight || '--'} <Typography variant="label" color="#444">kg</Typography></Typography>
            <Typography variant="label" color="#4ade80" style={{ fontSize: 9 }}>Tracking active</Typography>
          </View>
        </View>
        <TrendChart
          data={weightChartData.data}
          color={colors.primary}
          yAxisOffset={weightChartData.yAxisOffset}
          emptyLabel="Insufficient tracking data"
        />
        <ChartFilterBar value={chartFilter} onChange={setChartFilter} />
      </View>

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendTitleRow}>
            <View style={[styles.accentBar, { backgroundColor: "#f87171" }]} />
            <Typography variant="h2" style={{ fontSize: 18 }}>Volume Progression</Typography>
          </View>
        </View>
        <TrendChart
          data={volumeChartData.data}
          color="#f87171"
          emptyLabel="No volume data in this period"
        />
      </View>

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendTitleRow}>
            <View style={[styles.accentBar, { backgroundColor: "#a855f7" }]} />
            <Typography variant="h2" style={{ fontSize: 18 }}>Strength PRs</Typography>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prFilterRow}>
          {EXERCISE_LIBRARY.filter(ex => ex.muscleGroup === "Chest" || ex.muscleGroup === "Back" || ex.muscleGroup === "Legs").map(ex => (
            <Pressable
              key={ex.id}
              style={[styles.prFilterBtn, selectedPrId === ex.id && styles.prFilterBtnActive]}
              onPress={() => setSelectedPrId(ex.id)}
            >
              <Typography variant="label" color={selectedPrId === ex.id ? "#000" : "#8c8c8c"}>
                {ex.name.en.toUpperCase()}
              </Typography>
            </Pressable>
          ))}
        </ScrollView>
        <TrendChart
          data={prChartData.data}
          color="#a855f7"
          yAxisOffset={prChartData.yAxisOffset}
          emptyLabel="No PR data for this exercise"
        />
      </View>

      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <View style={styles.trendTitleRow}>
            <View style={[styles.accentBar, { backgroundColor: "#fbbf24" }]} />
            <Typography variant="h2" style={{ fontSize: 18 }}>Muscle Distribution</Typography>
          </View>
        </View>
        <View style={styles.distChartBox}>
          <BarChart
            data={muscleDistributionData}
            barWidth={28}
            spacing={24}
            noOfSections={4}
            barBorderRadius={6}
            frontColor={colors.primary}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            width={Dimensions.get("window").width - 110}
            yAxisTextStyle={{ color: "#777", fontSize: 10 }}
            xAxisLabelTextStyle={{ color: "#777", fontSize: 10, fontWeight: "800" }}
            isAnimated
            animationDuration={800}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.sm,
    paddingTop: 0,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  trendCard: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c2c2e",
    marginBottom: 20,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  trendTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accentBar: {
    width: 4,
    height: 18,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  prFilterRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  prFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1c1c1e",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2c2c2e",
  },
  prFilterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  distChartBox: {
    marginTop: 10,
    alignItems: "center",
  },
});
