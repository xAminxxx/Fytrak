import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../../components/Typography";
import { colors } from "../../../theme/colors";
import { spacing, radius } from "../../../theme/tokens";
import type { WorkoutLog } from "../../../types/domain";

type TrainingIntelligenceCardProps = {
  workout?: WorkoutLog;
};

export function TrainingIntelligenceCard({ workout }: TrainingIntelligenceCardProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}>
          <Ionicons name="barbell" size={14} color={colors.danger} />
        </View>
        <Typography variant="label" color={colors.danger} style={styles.title}>TRAINING ACTIVITY</Typography>
      </View>
      {workout ? (
        <View style={styles.card}>
          <View style={styles.workoutHeader}>
            <View style={{ flex: 1 }}>
              <Typography variant="h2" style={styles.workoutName}>{workout.name}</Typography>
              <Typography variant="label" color={colors.textFaint}>{workout.duration || 0} min • {workout.totalVolume || 0}kg volume</Typography>
            </View>
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={16} color={colors.primaryText} />
            </View>
          </View>
          <View style={styles.exerciseList}>
            {workout.exercises.slice(0, 4).map((ex, idx) => (
              <View key={idx} style={styles.exItem}>
                <Typography variant="h2" style={styles.exName} numberOfLines={1}>{ex.name}</Typography>
                <Typography variant="label" color={colors.textDim}>{ex.sets.length} sets</Typography>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Typography variant="label" color={colors.textDim}>No workout logged yet today</Typography>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  iconBox: { width: 26, height: 26, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  card: { backgroundColor: colors.surfaceMuted, borderRadius: radius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.borderStrong },
  workoutHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  workoutName: { fontSize: 18 },
  checkBadge: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  exerciseList: { gap: spacing.sm },
  exItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgDark, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle },
  exName: { fontSize: 13, flex: 1 },
  emptyCard: { backgroundColor: colors.bgDark, borderRadius: radius.xl, padding: spacing["3xl"], alignItems: 'center', borderWidth: 1, borderColor: colors.borderSubtle, borderStyle: 'dashed' },
});
