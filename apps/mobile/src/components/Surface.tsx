import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

type SurfaceProps = PropsWithChildren<{
  tone?: "default" | "raised" | "muted" | "accent" | "success" | "warning" | "danger";
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Surface({ tone = "default", padded = true, style, children }: SurfaceProps) {
  return (
    <View style={[styles.base, padded && styles.padded, styles[tone], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  padded: {
    padding: spacing.xl,
  },
  default: {
    backgroundColor: colors.bgElevated,
  },
  raised: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
  },
  accent: {
    backgroundColor: colors.primaryMuted,
    borderColor: "rgba(255, 204, 0, 0.28)",
  },
  success: {
    backgroundColor: colors.successMuted,
    borderColor: "rgba(74, 222, 128, 0.28)",
  },
  warning: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(251, 191, 36, 0.32)",
  },
  danger: {
    backgroundColor: colors.dangerMuted,
    borderColor: "rgba(248, 113, 113, 0.32)",
  },
});
