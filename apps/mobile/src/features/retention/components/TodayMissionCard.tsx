import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "../../../components/Typography";
import { colors } from "../../../theme/colors";
import { spacing, radius } from "../../../theme/tokens";
import { Surface } from "../../../components/Surface";
import type { TodayMission, TodayMissionItemId } from "../todayMission";

type TodayMissionCardProps = {
  mission: TodayMission;
  onAction: (id: TodayMissionItemId) => void;
};

export function TodayMissionCard({ mission, onAction }: TodayMissionCardProps) {
  return (
    <Surface tone="default" style={styles.card}>
      <View style={styles.header}>
        <View>
          <Typography variant="label" color={colors.primary}>TODAY MISSION</Typography>
          <Typography variant="h2" style={styles.headline}>{mission.headline}</Typography>
        </View>
        <View style={styles.scoreCircle}>
          <Typography style={styles.scoreText}>{mission.completionPercent}%</Typography>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.progress, { width: `${mission.completionPercent}%` }]} />
      </View>

      <View style={styles.list}>
        {mission.items.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.item, item.isComplete && styles.itemComplete]}
            onPress={() => onAction(item.id)}
          >
            <View style={[styles.iconBox, item.isComplete && styles.iconBoxComplete]}>
              <Ionicons 
                name={item.icon as any} 
                size={18} 
                color={item.isComplete ? colors.primaryText : colors.primary} 
              />
            </View>
            <View style={styles.itemContent}>
              <Typography variant="h2" style={styles.itemTitle}>{item.title}</Typography>
              <Typography variant="label" color={colors.textFaint} style={styles.itemSubtitle}>
                {item.subtitle}
              </Typography>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </Pressable>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    borderRadius: radius["2xl"],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headline: {
    fontSize: 22,
  },
  scoreCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  track: {
    height: 7,
    backgroundColor: colors.borderSubtle,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  itemComplete: {
    opacity: 0.74,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  iconBoxComplete: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
  },
  itemSubtitle: {
    fontSize: 9,
  },
});
