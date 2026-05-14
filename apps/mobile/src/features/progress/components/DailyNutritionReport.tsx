import React from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { radius, spacing } from "../../../theme/tokens";
import { Typography } from "../../../components/Typography";
import { NutritionRing } from "../../../components/NutritionRing";
import { MacroItem } from "../../../components/MacroItem";
import type { Meal, MacroTargets } from "../../../types/domain";

type DailyNutritionReportProps = {
  meals: Meal[];
  targets: MacroTargets;
  totals: { calories: number; protein: number; carbs: number; fats: number };
  waterMl: number;
};

export function DailyNutritionReport({ meals, targets, totals, waterMl }: DailyNutritionReportProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="nutrition" size={18} color="#fbbf24" />
        <Text style={[styles.sectionTitle, { color: "#fbbf24" }]}>NUTRITION & HYDRATION</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <NutritionRing current={totals.calories} target={targets.calories} />
          <View style={styles.mainStats}>
            <Typography variant="metric" style={{ fontSize: 28 }}>
              {totals.calories} <Typography color="#444" style={{ fontSize: 16 }}>/ {targets.calories} kcal</Typography>
            </Typography>
            <View style={styles.waterMiniRow}>
              <Ionicons name="water" size={14} color="#60a5fa" />
              <Typography variant="label" color="#60a5fa" style={{ fontWeight: "800" }}>
                {waterMl} / 2500 ml
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.macrosRow}>
          <MacroItem label="Protein" current={totals.protein} target={targets.protein} color="#4ade80" icon="flash" />
          <MacroItem label="Carbs" current={totals.carbs} target={targets.carbs} color={colors.primary} icon="restaurant" />
          <MacroItem label="Fats" current={totals.fats} target={targets.fats} color="#f87171" icon="water" />
        </View>

        {/* MEAL LIST */}
        <View style={styles.mealList}>
          <Typography variant="label" color="#444" style={styles.listLabel}>TODAY'S MEALS</Typography>
          {meals.length > 0 ? meals.map((meal) => (
            <View key={meal.id} style={styles.mealItem}>
              {meal.imageUrl ? (
                <Image source={{ uri: meal.imageUrl }} style={styles.mealThumb} />
              ) : (
                <View style={styles.mealIcon}><Ionicons name="fast-food" size={16} color="#444" /></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </View>
              <Text style={styles.mealCals}>{meal.calories} kcal</Text>
            </View>
          )) : (
            <Text style={styles.emptyText}>No meals logged yet</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  card: { backgroundColor: "#111", borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: "#222" },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  mainStats: { flex: 1, gap: 4 },
  waterMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(96, 165, 250, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  macrosRow: { flexDirection: 'row', gap: spacing.sm },
  mealList: { marginTop: spacing.xl, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: "#222" },
  listLabel: { marginBottom: spacing.md },
  mealItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#161616", padding: 12, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: "#222" },
  mealThumb: { width: 40, height: 40, borderRadius: 10, marginRight: 12 },
  mealIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#222", alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  mealName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  mealTime: { color: "#666", fontSize: 11, fontWeight: "600", marginTop: 2 },
  mealCals: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  emptyText: { color: "#444", fontSize: 13, fontStyle: "italic", textAlign: "center", paddingVertical: spacing.md },
});
