import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/tokens";

interface SectionTitleProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function SectionTitle({ title, icon }: SectionTitleProps) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text accessibilityRole="header" style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitleText: { 
    color: colors.text,
    ...typography.bodySmall,
    fontWeight: "800",
  },
});
